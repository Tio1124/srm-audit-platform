"""
routers/audit.py — Module 6-9: Audit Checklist, Evidence, Compliance, Findings
"""

import os
import uuid
import aiofiles
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from database import (
    get_db, AuditAssignment, NISTControl, AuditChecklistItem,
    AuditEvidence, AuditFinding, Organization, User, VulnerabilityMapping, Asset
)
from schemas import (
    AuditAssignmentCreate, AuditAssignmentResponse,
    NISTControlResponse, ChecklistItemUpdate, ChecklistItemResponse,
    ComplianceScore, AuditFindingCreate, AuditFindingResponse
)
from routers.auth import get_current_user, require_role

router = APIRouter(tags=["Audit & Compliance"])

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".docx", ".xlsx", ".txt", ".zip"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


# ── MODULE 6: AUDIT ASSIGNMENT & CHECKLIST ───────────────

@router.post("/audits", response_model=AuditAssignmentResponse, status_code=201)
def create_audit(
    audit_data: AuditAssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "auditor"))
):
    """
    Buat assignment audit baru.
    Otomatis generate checklist item untuk semua NIST CSF controls.
    """
    org = db.query(Organization).filter(Organization.id == audit_data.organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organisasi tidak ditemukan")

    assignment = AuditAssignment(
        organization_id=audit_data.organization_id,
        auditor_id=audit_data.auditor_id,
        audit_name=audit_data.audit_name,
        framework="NIST CSF"
    )
    db.add(assignment)
    db.flush()  # Dapatkan ID sebelum commit

    # Auto-generate checklist items untuk semua NIST controls
    all_controls = db.query(NISTControl).all()
    for control in all_controls:
        item = AuditChecklistItem(
            assignment_id=assignment.id,
            control_id=control.id,
            status="Non-Compliant"
        )
        db.add(item)

    db.commit()
    db.refresh(assignment)
    return assignment


@router.get("/audits", response_model=List[AuditAssignmentResponse])
def list_audits(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Daftar semua audit assignments"""
    if current_user.role == "admin":
        return db.query(AuditAssignment).all()
    return db.query(AuditAssignment).filter(
        AuditAssignment.auditor_id == current_user.id
    ).all()


@router.get("/audits/{audit_id}/checklist")
def get_audit_checklist(
    audit_id: int,
    nist_function: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Ambil checklist audit, bisa difilter per fungsi NIST CSF.
    nist_function: Identify, Protect, Detect, Respond, Recover
    """
    assignment = db.query(AuditAssignment).filter(AuditAssignment.id == audit_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Audit tidak ditemukan")

    query = db.query(AuditChecklistItem).filter(
        AuditChecklistItem.assignment_id == audit_id
    )

    if nist_function:
        query = query.join(NISTControl).filter(NISTControl.function == nist_function)

    items = query.all()

    # Format response dengan detail control
    result = []
    for item in items:
        result.append({
            "id": item.id,
            "assignment_id": item.assignment_id,
            "control": {
                "id": item.control.id,
                "function": item.control.function,
                "category": item.control.category,
                "control_id": item.control.control_id,
                "control_name": item.control.control_name,
                "audit_question": item.control.audit_question,
                "evidence_required": item.control.evidence_required
            },
            "status": item.status,
            "auditor_notes": item.auditor_notes,
            "evidence_count": len(item.evidence_files),
            "updated_at": item.updated_at.isoformat() if item.updated_at else None
        })

    # Group by function
    grouped = {}
    for item in result:
        func = item["control"]["function"]
        if func not in grouped:
            grouped[func] = []
        grouped[func].append(item)

    return {
        "audit_id": audit_id,
        "audit_name": assignment.audit_name,
        "framework": assignment.framework,
        "checklist": grouped if not nist_function else result,
        "total_items": len(result)
    }


@router.put("/audits/checklist/{item_id}")
def update_checklist_item(
    item_id: int,
    update_data: ChecklistItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "auditor"))
):
    """Update status dan catatan satu item checklist"""
    item = db.query(AuditChecklistItem).filter(AuditChecklistItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item checklist tidak ditemukan")

    item.status = update_data.status.value
    item.auditor_notes = update_data.auditor_notes
    item.updated_at = datetime.utcnow()
    db.commit()

    return {"message": "Status diperbarui", "item_id": item_id, "status": item.status}


# ── MODULE 7: EVIDENCE UPLOAD ────────────────────────────

@router.post("/audits/checklist/{item_id}/evidence", status_code=201)
async def upload_evidence(
    item_id: int,
    file: UploadFile = File(...),
    description: str = Form(""),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload file bukti audit.
    File disimpan di server dengan nama unik untuk menghindari konflik.
    """
    item = db.query(AuditChecklistItem).filter(AuditChecklistItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item checklist tidak ditemukan")

    # Validasi ekstensi file
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Tipe file tidak diizinkan. Gunakan: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Generate nama file unik
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    # Baca dan simpan file
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File terlalu besar (max 10MB)")

    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(content)

    # Simpan record ke database
    evidence = AuditEvidence(
        checklist_item_id=item_id,
        filename=unique_filename,
        original_filename=file.filename,
        file_type=file.content_type,
        file_size=len(content),
        description=description,
        uploaded_by=current_user.id
    )
    db.add(evidence)
    db.commit()
    db.refresh(evidence)

    return {
        "message": "File berhasil diupload",
        "evidence_id": evidence.id,
        "filename": evidence.original_filename,
        "size": evidence.file_size
    }


@router.get("/audits/checklist/{item_id}/evidence")
def list_evidence(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Daftar semua bukti untuk satu item checklist"""
    evidence = db.query(AuditEvidence).filter(
        AuditEvidence.checklist_item_id == item_id
    ).all()

    return [{
        "id": e.id,
        "original_filename": e.original_filename,
        "file_type": e.file_type,
        "file_size": e.file_size,
        "description": e.description,
        "uploaded_at": e.uploaded_at.isoformat()
    } for e in evidence]


# ── MODULE 8: COMPLIANCE SCORING ─────────────────────────

@router.get("/audits/{audit_id}/compliance")
def get_compliance_score(
    audit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Hitung compliance score:
    Compliance % = (Compliant ÷ Total Valid Controls) × 100
    "Not Applicable" dikecualikan dari perhitungan
    """
    items = db.query(AuditChecklistItem).filter(
        AuditChecklistItem.assignment_id == audit_id
    ).all()

    if not items:
        raise HTTPException(status_code=404, detail="Audit tidak ditemukan atau belum ada checklist")

    # Hitung per status
    counts = {"Compliant": 0, "Partially Compliant": 0, "Non-Compliant": 0, "Not Applicable": 0}
    for item in items:
        counts[item.status] = counts.get(item.status, 0) + 1

    total_valid = len(items) - counts["Not Applicable"]
    if total_valid == 0:
        compliance_pct = 0
    else:
        # Partially Compliant dihitung 0.5
        score = counts["Compliant"] + (counts["Partially Compliant"] * 0.5)
        compliance_pct = round((score / total_valid) * 100, 1)

    # Label compliance
    if compliance_pct >= 85:
        label = "Compliant"
        color = "green"
    elif compliance_pct >= 60:
        label = "Needs Improvement"
        color = "yellow"
    else:
        label = "Non-Compliant"
        color = "red"

    # Breakdown per fungsi NIST
    by_function = {}
    nist_functions = ["Identify", "Protect", "Detect", "Respond", "Recover"]
    for func in nist_functions:
        func_items = [i for i in items if i.control.function == func]
        func_valid = [i for i in func_items if i.status != "Not Applicable"]
        if func_valid:
            func_score = sum(1 if i.status == "Compliant" else 0.5 if i.status == "Partially Compliant" else 0
                           for i in func_valid)
            func_pct = round((func_score / len(func_valid)) * 100, 1)
        else:
            func_pct = 0
        by_function[func] = {
            "percentage": func_pct,
            "total": len(func_items),
            "compliant": sum(1 for i in func_items if i.status == "Compliant"),
            "partial": sum(1 for i in func_items if i.status == "Partially Compliant"),
            "non_compliant": sum(1 for i in func_items if i.status == "Non-Compliant"),
        }

    return {
        "audit_id": audit_id,
        "total_controls": len(items),
        "compliant": counts["Compliant"],
        "partially_compliant": counts["Partially Compliant"],
        "non_compliant": counts["Non-Compliant"],
        "not_applicable": counts["Not Applicable"],
        "compliance_percentage": compliance_pct,
        "compliance_label": label,
        "compliance_color": color,
        "by_function": by_function
    }


# ── MODULE 9: AUDIT FINDINGS ─────────────────────────────

@router.post("/audits/{audit_id}/findings/auto-generate", status_code=201)
def auto_generate_findings(
    audit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "auditor"))
):
    """
    Auto-generate findings dari Non-Compliant controls.
    Setiap control yang Non-Compliant menjadi satu finding.
    """
    assignment = db.query(AuditAssignment).filter(AuditAssignment.id == audit_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Audit tidak ditemukan")

    # Ambil semua item yang non-compliant
    non_compliant_items = db.query(AuditChecklistItem).filter(
        AuditChecklistItem.assignment_id == audit_id,
        AuditChecklistItem.status.in_(["Non-Compliant", "Partially Compliant"])
    ).all()

    # Hapus findings lama yang auto-generated untuk audit ini
    db.query(AuditFinding).filter(AuditFinding.assignment_id == audit_id).delete()

    findings_created = []

    # Template findings berdasarkan fungsi NIST
    severity_map = {
        "Compliant": "Low",
        "Partially Compliant": "Medium",
        "Non-Compliant": "High"
    }

    # Ambil risk tertinggi dari organisasi ini
    org_assets = db.query(Asset).filter(
        Asset.organization_id == assignment.organization_id
    ).all()
    asset_ids = [a.id for a in org_assets]
    high_risks = db.query(VulnerabilityMapping).filter(
        VulnerabilityMapping.asset_id.in_(asset_ids),
        VulnerabilityMapping.risk_level.in_(["Critical", "High"])
    ).all() if asset_ids else []

    # Generate finding untuk setiap non-compliant control
    for item in non_compliant_items:
        ctrl = item.control
        severity = "Critical" if item.status == "Non-Compliant" and ctrl.function in ["Protect", "Detect"] else severity_map[item.status]

        # Cari aset yang terdampak berdasarkan related control
        affected_assets = []
        for risk in high_risks:
            if ctrl.control_id in (risk.vulnerability.related_nist_control or ""):
                affected_assets.append(risk.asset.name)

        finding = AuditFinding(
            assignment_id=audit_id,
            title=f"[{ctrl.control_id}] {ctrl.control_name}",
            issue=f"Control {ctrl.control_id} ({ctrl.control_name}) ditemukan dalam status {item.status}. "
                  f"{ctrl.audit_question}",
            risk_description=f"Kegagalan implementasi control {ctrl.function} dapat menyebabkan "
                           f"kelemahan pada aspek {ctrl.category} organisasi.",
            affected_asset=", ".join(set(affected_assets)) if affected_assets else "Semua sistem organisasi",
            recommendation=f"Segera implementasikan {ctrl.control_name}. "
                         f"Bukti yang diperlukan: {ctrl.evidence_required}",
            severity=severity,
            status="Open"
        )
        db.add(finding)
        findings_created.append({"control_id": ctrl.control_id, "severity": severity})

    db.commit()
    return {
        "message": f"Berhasil generate {len(findings_created)} findings",
        "findings": findings_created
    }


@router.get("/audits/{audit_id}/findings", response_model=List[AuditFindingResponse])
def get_findings(
    audit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Daftar semua findings untuk satu audit"""
    return db.query(AuditFinding).filter(
        AuditFinding.assignment_id == audit_id
    ).order_by(AuditFinding.severity.desc()).all()


@router.post("/audits/{audit_id}/findings", response_model=AuditFindingResponse, status_code=201)
def create_finding(
    audit_id: int,
    finding_data: AuditFindingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "auditor"))
):
    """Tambah finding manual"""
    finding_data.assignment_id = audit_id
    finding = AuditFinding(**finding_data.dict())
    db.add(finding)
    db.commit()
    db.refresh(finding)
    return finding