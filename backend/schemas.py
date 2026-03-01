"""
schemas.py — Pydantic models untuk validasi data request dan response
Pydantic = library Python untuk validasi data otomatis
Setiap field yang didefinisikan di sini akan divalidasi oleh FastAPI
"""

from pydantic import BaseModel, EmailStr, validator, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ─────────────────────────────────────────────
# ENUMS
# ─────────────────────────────────────────────

class UserRole(str, Enum):
    admin = "admin"
    auditor = "auditor"
    auditee = "auditee"

class CIAValue(str, Enum):
    High = "High"
    Medium = "Medium"
    Low = "Low"

class ComplianceStatus(str, Enum):
    Compliant = "Compliant"
    PartiallyCompliant = "Partially Compliant"
    NonCompliant = "Non-Compliant"
    NotApplicable = "Not Applicable"

class RiskLevel(str, Enum):
    Low = "Low"
    Medium = "Medium"
    High = "High"
    Critical = "Critical"


# ─────────────────────────────────────────────
# AUTH SCHEMAS
# ─────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=6)
    role: UserRole = UserRole.auditee

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True  # Enable ORM mode

class LoginRequest(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


# ─────────────────────────────────────────────
# ORGANIZATION SCHEMAS
# ─────────────────────────────────────────────

class OrganizationCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    business_sector: str
    employee_count: int = Field(..., gt=0)
    system_type: str  # web, mobile, internal, cloud, hybrid

class OrganizationResponse(BaseModel):
    id: int
    name: str
    business_sector: str
    employee_count: int
    system_type: str
    exposure_level: Optional[str] = None
    owner_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# ASSET SCHEMAS
# ─────────────────────────────────────────────

class AssetCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    owner: str
    location: str
    asset_type: str  # Application, Server, Data, Network, Endpoint
    confidentiality: CIAValue
    integrity: CIAValue
    availability: CIAValue
    organization_id: int

class AssetResponse(BaseModel):
    id: int
    name: str
    owner: str
    location: str
    asset_type: str
    confidentiality: str
    integrity: str
    availability: str
    criticality_score: Optional[float] = None
    organization_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# VULNERABILITY SCHEMAS
# ─────────────────────────────────────────────

class OWASPVulnResponse(BaseModel):
    id: int
    name: str
    category: str
    description: str
    default_likelihood: int
    default_impact: int
    default_impact_description: str
    owasp_reference: str
    related_nist_control: Optional[str] = None

    class Config:
        from_attributes = True

class VulnerabilityMappingCreate(BaseModel):
    asset_id: int = Field(..., gt=0)               # harus > 0
    vulnerability_ids: List[int] = Field(..., min_length=1)  # harus ada minimal 1
    custom_likelihood: Optional[int] = Field(None, ge=1, le=5)
    custom_impact: Optional[int] = Field(None, ge=1, le=5)
    notes: Optional[str] = None

class VulnerabilityMappingResponse(BaseModel):
    id: int
    asset_id: int
    vulnerability_id: int
    custom_likelihood: Optional[int] = None
    custom_impact: Optional[int] = None
    risk_score: float
    risk_level: str
    notes: Optional[str] = None
    assessed_at: datetime
    vulnerability: OWASPVulnResponse

    class Config:
        from_attributes = True

class RiskMatrixData(BaseModel):
    """Data untuk menampilkan risk matrix / heatmap"""
    asset_name: str
    vulnerability_name: str
    likelihood: int
    impact: int
    risk_score: float
    risk_level: str


# ─────────────────────────────────────────────
# AUDIT SCHEMAS
# ─────────────────────────────────────────────

class AuditAssignmentCreate(BaseModel):
    organization_id: int
    auditor_id: int
    audit_name: str = Field(..., min_length=1, max_length=200)

class AuditAssignmentResponse(BaseModel):
    id: int
    organization_id: int
    auditor_id: int
    audit_name: str
    framework: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class NISTControlResponse(BaseModel):
    id: int
    function: str
    category: str
    control_id: str
    control_name: str
    description: str
    audit_question: str
    evidence_required: Optional[str] = None

    class Config:
        from_attributes = True

class ChecklistItemUpdate(BaseModel):
    status: ComplianceStatus
    auditor_notes: Optional[str] = None

class ChecklistItemResponse(BaseModel):
    id: int
    assignment_id: int
    control_id: int
    status: str
    auditor_notes: Optional[str] = None
    updated_at: datetime
    control: NISTControlResponse

    class Config:
        from_attributes = True

class ComplianceScore(BaseModel):
    """Hasil perhitungan compliance score"""
    total_controls: int
    compliant: int
    partially_compliant: int
    non_compliant: int
    not_applicable: int
    compliance_percentage: float
    compliance_label: str  # "Compliant", "Needs Improvement", "Non-Compliant"
    by_function: dict  # Score per fungsi NIST CSF


# ─────────────────────────────────────────────
# FINDINGS SCHEMAS
# ─────────────────────────────────────────────

class AuditFindingCreate(BaseModel):
    assignment_id: int
    title: str
    issue: str
    risk_description: str
    affected_asset: Optional[str] = None
    recommendation: str
    severity: RiskLevel

class AuditFindingResponse(BaseModel):
    id: int
    assignment_id: int
    title: str
    issue: str
    risk_description: str
    affected_asset: Optional[str] = None
    recommendation: str
    severity: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# AI SCHEMAS
# ─────────────────────────────────────────────

class AIQueryRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)  # min=1 agar tidak 422 untuk query pendek
    context: Optional[str] = "general"
    vulnerability_name: Optional[str] = None
    organization_name: Optional[str] = None

class AIQueryResponse(BaseModel):
    query: str
    response: str
    context: str
