"""
database.py — SQLite database setup dan semua model tabel
Menggunakan SQLAlchemy ORM (Object-Relational Mapping)
ORM artinya kita tulis Python class, otomatis jadi tabel database
"""

from sqlalchemy import (
    create_engine, Column, Integer, String, Float,
    ForeignKey, DateTime, Text, Boolean, Enum
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./srm_audit.db")

# Engine = koneksi ke database
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}  # SQLite-specific setting
)

# SessionLocal = factory untuk membuat database session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base = parent class semua model kita
Base = declarative_base()


# ─────────────────────────────────────────────
# MODULE 1: USER MANAGEMENT
# ─────────────────────────────────────────────

class User(Base):
    """Tabel users — menyimpan semua pengguna sistem"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(
        Enum("admin", "auditor", "auditee", name="user_roles"),
        default="auditee",
        nullable=False
    )
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    assigned_audits = relationship("AuditAssignment", back_populates="auditor",
                                   foreign_keys="AuditAssignment.auditor_id")
    organization = relationship("Organization", back_populates="owner", uselist=False)


# ─────────────────────────────────────────────
# MODULE 2: ORGANIZATION PROFILE
# ─────────────────────────────────────────────

class Organization(Base):
    """Profil organisasi yang diaudit"""
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    business_sector = Column(String(100), nullable=False)
    employee_count = Column(Integer, nullable=False)
    system_type = Column(String(100), nullable=False)  # web, mobile, internal, cloud
    exposure_level = Column(String(20))  # Low, Medium, High — dihitung otomatis
    owner_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="organization")
    assets = relationship("Asset", back_populates="organization")
    audit_assignments = relationship("AuditAssignment", back_populates="organization")


# ─────────────────────────────────────────────
# MODULE 3: ASSET INVENTORY
# ─────────────────────────────────────────────

class Asset(Base):
    """Inventaris aset organisasi"""
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    owner = Column(String(100), nullable=False)
    location = Column(String(100), nullable=False)
    asset_type = Column(String(50), nullable=False)  # Application, Server, Data, Network
    # CIA = Confidentiality, Integrity, Availability
    confidentiality = Column(Enum("High", "Medium", "Low", name="cia_values"), nullable=False)
    integrity = Column(Enum("High", "Medium", "Low", name="cia_values2"), nullable=False)
    availability = Column(Enum("High", "Medium", "Low", name="cia_values3"), nullable=False)
    criticality_score = Column(Float)  # dihitung otomatis dari CIA
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    organization = relationship("Organization", back_populates="assets")
    vulnerability_mappings = relationship("VulnerabilityMapping", back_populates="asset")


# ─────────────────────────────────────────────
# MODULE 4: OWASP VULNERABILITY LIBRARY
# ─────────────────────────────────────────────

class OWASPVulnerability(Base):
    """Library 19 kerentanan OWASP — diisi saat startup"""
    __tablename__ = "owasp_vulnerabilities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    category = Column(String(100), nullable=False)  # e.g. "Injection"
    description = Column(Text, nullable=False)
    default_likelihood = Column(Integer, nullable=False)  # 1-5
    default_impact = Column(Integer, nullable=False)       # 1-5
    default_impact_description = Column(String(200))       # e.g. "Database theft"
    owasp_reference = Column(String(50))                   # e.g. "A01:2021"
    # Mapping ke NIST CSF control yang relevan
    related_nist_control = Column(String(200))

    mappings = relationship("VulnerabilityMapping", back_populates="vulnerability")


class VulnerabilityMapping(Base):
    """Mapping: Aset mana punya kerentanan apa"""
    __tablename__ = "vulnerability_mappings"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"))
    vulnerability_id = Column(Integer, ForeignKey("owasp_vulnerabilities.id"))
    # Override likelihood/impact jika auditor ingin custom
    custom_likelihood = Column(Integer)
    custom_impact = Column(Integer)
    risk_score = Column(Float)  # = likelihood × impact
    risk_level = Column(String(20))  # Low, Medium, High, Critical
    notes = Column(Text)
    assessed_by = Column(Integer, ForeignKey("users.id"))
    assessed_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    asset = relationship("Asset", back_populates="vulnerability_mappings")
    vulnerability = relationship("OWASPVulnerability", back_populates="mappings")


# ─────────────────────────────────────────────
# MODULE 6: NIST CSF AUDIT CHECKLIST
# ─────────────────────────────────────────────

class AuditAssignment(Base):
    """Assignment: Auditor mana mengaudit organisasi mana"""
    __tablename__ = "audit_assignments"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    auditor_id = Column(Integer, ForeignKey("users.id"))
    audit_name = Column(String(200), nullable=False)
    framework = Column(String(50), default="NIST CSF")
    status = Column(String(50), default="In Progress")  # In Progress, Completed
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)

    # Relationships
    organization = relationship("Organization", back_populates="audit_assignments")
    auditor = relationship("User", back_populates="assigned_audits",
                           foreign_keys=[auditor_id])
    checklist_items = relationship("AuditChecklistItem", back_populates="assignment")


class NISTControl(Base):
    """
    NIST CSF Controls library — 5 fungsi: Identify, Protect, Detect, Respond, Recover
    Diisi saat startup
    """
    __tablename__ = "nist_controls"

    id = Column(Integer, primary_key=True, index=True)
    function = Column(String(20), nullable=False)   # Identify, Protect, Detect, Respond, Recover
    category = Column(String(100), nullable=False)
    control_id = Column(String(20), nullable=False)  # e.g. "ID.AM-1"
    control_name = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    audit_question = Column(Text, nullable=False)    # Pertanyaan yang ditanyakan auditor
    evidence_required = Column(Text)                 # Bukti apa yang dibutuhkan

    checklist_items = relationship("AuditChecklistItem", back_populates="control")


class AuditChecklistItem(Base):
    """Status setiap control per assignment audit"""
    __tablename__ = "audit_checklist_items"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("audit_assignments.id"))
    control_id = Column(Integer, ForeignKey("nist_controls.id"))
    status = Column(
        Enum("Compliant", "Partially Compliant", "Non-Compliant", "Not Applicable",
             name="compliance_status"),
        default="Non-Compliant"
    )
    auditor_notes = Column(Text)
    evidence_files = relationship("AuditEvidence", back_populates="checklist_item")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    assignment = relationship("AuditAssignment", back_populates="checklist_items")
    control = relationship("NISTControl", back_populates="checklist_items")


# ─────────────────────────────────────────────
# MODULE 7: AUDIT EVIDENCE
# ─────────────────────────────────────────────

class AuditEvidence(Base):
    """File bukti audit yang diupload"""
    __tablename__ = "audit_evidence"

    id = Column(Integer, primary_key=True, index=True)
    checklist_item_id = Column(Integer, ForeignKey("audit_checklist_items.id"))
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_type = Column(String(50))
    file_size = Column(Integer)
    description = Column(Text)
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    checklist_item = relationship("AuditChecklistItem", back_populates="evidence_files")


# ─────────────────────────────────────────────
# MODULE 9: AUDIT FINDINGS
# ─────────────────────────────────────────────

class AuditFinding(Base):
    """Temuan audit yang digenerate otomatis atau manual"""
    __tablename__ = "audit_findings"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("audit_assignments.id"))
    title = Column(String(300), nullable=False)
    issue = Column(Text, nullable=False)
    risk_description = Column(Text, nullable=False)
    affected_asset = Column(String(200))
    recommendation = Column(Text, nullable=False)
    severity = Column(String(20), nullable=False)  # Low, Medium, High, Critical
    status = Column(String(50), default="Open")    # Open, In Remediation, Closed
    created_at = Column(DateTime, default=datetime.utcnow)


# ─────────────────────────────────────────────
# HELPER FUNCTION
# ─────────────────────────────────────────────

def get_db():
    """
    Dependency injection untuk FastAPI.
    Setiap request mendapat session database sendiri,
    dan session ditutup setelah request selesai.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Buat semua tabel di database"""
    Base.metadata.create_all(bind=engine)
