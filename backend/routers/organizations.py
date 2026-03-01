"""
routers/organizations.py — Modul profil organisasi dan inventaris aset
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db, Organization, Asset
from schemas import (
    OrganizationCreate, OrganizationResponse,
    AssetCreate, AssetResponse
)
from routers.auth import get_current_user, require_role
from database import User

router = APIRouter(tags=["Organizations & Assets"])


# ── HELPER: Hitung Exposure Level ────────────────────
def calculate_exposure_level(employee_count: int, system_type: str) -> str:
    """
    Hitung exposure level organisasi berdasarkan:
    - Jumlah karyawan (semakin besar = semakin exposed)
    - Tipe sistem (cloud/web = lebih exposed dari internal)
    """
    score = 0
    # Employee count scoring
    if employee_count > 1000:
        score += 3
    elif employee_count > 100:
        score += 2
    else:
        score += 1

    # System type scoring
    type_scores = {"cloud": 3, "web": 3, "mobile": 2, "hybrid": 2, "internal": 1}
    score += type_scores.get(system_type.lower(), 2)

    if score >= 5:
        return "High"
    elif score >= 3:
        return "Medium"
    else:
        return "Low"


# ── HELPER: Hitung CIA Criticality Score ─────────────
def calculate_cia_score(confidentiality: str, integrity: str, availability: str) -> float:
    """
    Hitung criticality score dari nilai CIA.
    High=3, Medium=2, Low=1
    Max score = 9 (semua High)
    """
    cia_map = {"High": 3, "Medium": 2, "Low": 1}
    total = cia_map[confidentiality] + cia_map[integrity] + cia_map[availability]
    # Normalisasi ke skala 1-10
    return round((total / 9) * 10, 2)


# ── ORGANIZATION ENDPOINTS ───────────────────────────

@router.post("/organizations", response_model=OrganizationResponse, status_code=201)
def create_organization(
    org_data: OrganizationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Buat profil organisasi baru"""
    exposure_level = calculate_exposure_level(org_data.employee_count, org_data.system_type)

    org = Organization(
        name=org_data.name,
        business_sector=org_data.business_sector,
        employee_count=org_data.employee_count,
        system_type=org_data.system_type,
        exposure_level=exposure_level,
        owner_id=current_user.id
    )
    db.add(org)
    db.commit()
    db.refresh(org)
    return org


@router.get("/organizations", response_model=List[OrganizationResponse])
def list_organizations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Daftar semua organisasi"""
    if current_user.role == "admin":
        return db.query(Organization).all()
    # Auditor & auditee hanya lihat org mereka
    return db.query(Organization).filter(Organization.owner_id == current_user.id).all()


@router.get("/organizations/{org_id}", response_model=OrganizationResponse)
def get_organization(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Detail satu organisasi"""
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organisasi tidak ditemukan")
    return org


# ── ASSET ENDPOINTS ──────────────────────────────────

@router.post("/assets", response_model=AssetResponse, status_code=201)
def create_asset(
    asset_data: AssetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Tambah aset baru ke inventaris"""
    # Validasi: organisasi harus ada
    org = db.query(Organization).filter(Organization.id == asset_data.organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organisasi tidak ditemukan")

    criticality = calculate_cia_score(
        asset_data.confidentiality.value,
        asset_data.integrity.value,
        asset_data.availability.value
    )

    asset = Asset(
        name=asset_data.name,
        owner=asset_data.owner,
        location=asset_data.location,
        asset_type=asset_data.asset_type,
        confidentiality=asset_data.confidentiality.value,
        integrity=asset_data.integrity.value,
        availability=asset_data.availability.value,
        criticality_score=criticality,
        organization_id=asset_data.organization_id
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


@router.get("/assets", response_model=List[AssetResponse])
def list_assets(
    organization_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Daftar aset, bisa difilter per organisasi"""
    query = db.query(Asset)
    if organization_id:
        query = query.filter(Asset.organization_id == organization_id)
    return query.all()


@router.get("/assets/{asset_id}", response_model=AssetResponse)
def get_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Detail satu aset"""
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Aset tidak ditemukan")
    return asset


@router.delete("/assets/{asset_id}", status_code=204)
def delete_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "auditor"))
):
    """Hapus aset"""
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Aset tidak ditemukan")
    db.delete(asset)
    db.commit()
