"""
routers/risk.py — Risk Engine (Module 4 & 5)
Risk = Likelihood × Impact
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List, Dict

from database import get_db, OWASPVulnerability, VulnerabilityMapping, Asset, NISTControl, AuditChecklistItem, AuditAssignment
from schemas import (
    OWASPVulnResponse, VulnerabilityMappingCreate,
    VulnerabilityMappingResponse, RiskMatrixData
)
from routers.auth import get_current_user
from database import User

router = APIRouter(tags=["Risk Assessment"])


# ── HELPER: Risk Calculator ───────────────────────────────

def calculate_risk(likelihood: int, impact: int) -> tuple[float, str]:
    """
    Hitung risk score dan risk level.
    
    Risk Score = Likelihood (1-5) × Impact (1-5) → range 1-25
    
    Mapping Risk Level:
    1-4   → Low
    5-9   → Medium  
    10-19 → High
    20-25 → Critical
    """
    score = likelihood * impact

    if score >= 20:
        level = "Critical"
    elif score >= 10:
        level = "High"
    elif score >= 5:
        level = "Medium"
    else:
        level = "Low"

    return float(score), level


# ── VULNERABILITY LIBRARY ─────────────────────────────────

@router.get("/vulnerabilities", response_model=List[OWASPVulnResponse])
def list_vulnerabilities(
    category: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Daftar semua 19 kerentanan OWASP, bisa difilter per kategori"""
    query = db.query(OWASPVulnerability)
    if category:
        query = query.filter(OWASPVulnerability.category == category)
    return query.all()


@router.get("/vulnerabilities/categories")
def list_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Daftar kategori kerentanan yang tersedia"""
    categories = db.query(OWASPVulnerability.category).distinct().all()
    return [c[0] for c in categories]


# ── VULNERABILITY MAPPING (Assessment) ───────────────────

@router.post("/risk/assess", status_code=201)
def assess_asset_vulnerabilities(
    mapping_data: VulnerabilityMappingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lakukan risk assessment pada aset.
    Auditor memilih kerentanan yang ditemukan pada aset,
    sistem otomatis menghitung risk score.
    
    Juga otomatis membuat checklist item di NIST CSF
    berdasarkan kerentanan yang dipilih.
    """
    # Validasi aset ada
    asset = db.query(Asset).filter(Asset.id == mapping_data.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Aset tidak ditemukan")

    created_mappings = []
    nist_controls_triggered = set()

    for vuln_id in mapping_data.vulnerability_ids:
        # Cek apakah kerentanan ada
        vuln = db.query(OWASPVulnerability).filter(OWASPVulnerability.id == vuln_id).first()
        if not vuln:
            continue

        # Gunakan custom atau default likelihood/impact
        likelihood = mapping_data.custom_likelihood or vuln.default_likelihood
        impact = mapping_data.custom_impact or vuln.default_impact

        # Hitung risk
        risk_score, risk_level = calculate_risk(likelihood, impact)

        # Simpan mapping
        existing = db.query(VulnerabilityMapping).filter(
            VulnerabilityMapping.asset_id == mapping_data.asset_id,
            VulnerabilityMapping.vulnerability_id == vuln_id
        ).first()

        if existing:
            existing.custom_likelihood = likelihood
            existing.custom_impact = impact
            existing.risk_score = risk_score
            existing.risk_level = risk_level
            existing.notes = mapping_data.notes
            mapping = existing
        else:
            mapping = VulnerabilityMapping(
                asset_id=mapping_data.asset_id,
                vulnerability_id=vuln_id,
                custom_likelihood=likelihood,
                custom_impact=impact,
                risk_score=risk_score,
                risk_level=risk_level,
                notes=mapping_data.notes,
                assessed_by=current_user.id
            )
            db.add(mapping)

        created_mappings.append({
            "vulnerability": vuln.name,
            "likelihood": likelihood,
            "impact": impact,
            "risk_score": risk_score,
            "risk_level": risk_level
        })

        # Kumpulkan NIST controls yang terkait
        if vuln.related_nist_control:
            for ctrl_id in vuln.related_nist_control.split(","):
                nist_controls_triggered.add(ctrl_id.strip())

    db.commit()

    return {
        "asset_id": mapping_data.asset_id,
        "asset_name": asset.name,
        "assessments": created_mappings,
        "triggered_nist_controls": list(nist_controls_triggered),
        "message": f"Risk assessment selesai untuk {len(created_mappings)} kerentanan"
    }


@router.get("/risk/asset/{asset_id}")
def get_asset_risk(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lihat semua risk yang sudah diassess untuk satu aset"""
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Aset tidak ditemukan")

    mappings = db.query(VulnerabilityMapping).filter(
        VulnerabilityMapping.asset_id == asset_id
    ).all()

    results = []
    for m in mappings:
        results.append({
            "id": m.id,
            "vulnerability": m.vulnerability.name,
            "category": m.vulnerability.category,
            "likelihood": m.custom_likelihood,
            "impact": m.custom_impact,
            "risk_score": m.risk_score,
            "risk_level": m.risk_level,
            "impact_description": m.vulnerability.default_impact_description,
            "notes": m.notes
        })

    return {
        "asset": {
            "id": asset.id,
            "name": asset.name,
            "type": asset.asset_type,
            "criticality_score": asset.criticality_score
        },
        "risk_assessments": results,
        "summary": {
            "total_vulnerabilities": len(results),
            "critical": sum(1 for r in results if r["risk_level"] == "Critical"),
            "high": sum(1 for r in results if r["risk_level"] == "High"),
            "medium": sum(1 for r in results if r["risk_level"] == "Medium"),
            "low": sum(1 for r in results if r["risk_level"] == "Low"),
        }
    }


@router.get("/risk/matrix/{organization_id}")
def get_risk_matrix(
    organization_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Data untuk risk matrix/heatmap.
    Menggabungkan semua risk assessment untuk semua aset dalam organisasi.
    """
    # Ambil semua aset organisasi
    assets = db.query(Asset).filter(Asset.organization_id == organization_id).all()
    asset_ids = [a.id for a in assets]

    # Ambil semua mappings
    mappings = db.query(VulnerabilityMapping).filter(
        VulnerabilityMapping.asset_id.in_(asset_ids)
    ).all()

    matrix_data = []
    for m in mappings:
        matrix_data.append({
            "asset_name": m.asset.name,
            "vulnerability_name": m.vulnerability.name,
            "category": m.vulnerability.category,
            "likelihood": m.custom_likelihood,
            "impact": m.custom_impact,
            "risk_score": m.risk_score,
            "risk_level": m.risk_level
        })

    # Hitung distribusi risk level
    distribution = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    for item in matrix_data:
        distribution[item["risk_level"]] += 1

    return {
        "matrix_data": matrix_data,
        "distribution": distribution,
        "total_risks": len(matrix_data)
    }


@router.delete("/risk/mapping/{mapping_id}", status_code=204)
def delete_risk_mapping(
    mapping_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Hapus vulnerability mapping"""
    mapping = db.query(VulnerabilityMapping).filter(VulnerabilityMapping.id == mapping_id).first()
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping tidak ditemukan")
    db.delete(mapping)
    db.commit()
