"""
routers/reports.py — Module 11: PDF Report Generator
Menggunakan ReportLab untuk generate PDF profesional
"""

import os
import io
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, black, white, grey
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.lib import colors

from database import (
    get_db, AuditAssignment, AuditChecklistItem, AuditFinding,
    Organization, Asset, VulnerabilityMapping, NISTControl
)
from routers.auth import get_current_user
from database import User

router = APIRouter(tags=["Reports"])

# ── COLOR PALETTE ─────────────────────────────────────────
PRIMARY = HexColor('#1E3A8A')      # Biru utama
PRIMARY_LIGHT = HexColor('#3B82F6')
SECONDARY = HexColor('#1E40AF')
ACCENT = HexColor('#DBEAFE')       # Biru muda untuk background
CRITICAL_RED = HexColor('#DC2626')
HIGH_ORANGE = HexColor('#EA580C')
MEDIUM_YELLOW = HexColor('#CA8A04')
LOW_GREEN = HexColor('#16A34A')
COMPLIANT_GREEN = HexColor('#15803D')
PARTIAL_YELLOW = HexColor('#B45309')
NON_COMPLIANT_RED = HexColor('#B91C1C')
LIGHT_GREY = HexColor('#F8FAFC')
BORDER_GREY = HexColor('#E2E8F0')
TEXT_DARK = HexColor('#1E293B')
TEXT_MUTED = HexColor('#64748B')


def get_risk_color(level: str) -> HexColor:
    colors_map = {
        "Critical": CRITICAL_RED,
        "High": HIGH_ORANGE,
        "Medium": MEDIUM_YELLOW,
        "Low": LOW_GREEN
    }
    return colors_map.get(level, grey)


def get_compliance_color(status: str) -> HexColor:
    color_map = {
        "Compliant": COMPLIANT_GREEN,
        "Partially Compliant": PARTIAL_YELLOW,
        "Non-Compliant": NON_COMPLIANT_RED,
        "Not Applicable": TEXT_MUTED
    }
    return color_map.get(status, grey)


def build_styles():
    """Build custom paragraph styles"""
    styles = getSampleStyleSheet()

    custom = {
        "cover_title": ParagraphStyle(
            "cover_title",
            fontName="Helvetica-Bold",
            fontSize=28,
            textColor=white,
            alignment=TA_CENTER,
            spaceAfter=12,
            leading=34
        ),
        "cover_subtitle": ParagraphStyle(
            "cover_subtitle",
            fontName="Helvetica",
            fontSize=14,
            textColor=HexColor('#BFDBFE'),
            alignment=TA_CENTER,
            spaceAfter=8
        ),
        "section_title": ParagraphStyle(
            "section_title",
            fontName="Helvetica-Bold",
            fontSize=14,
            textColor=PRIMARY,
            spaceBefore=16,
            spaceAfter=8,
            borderPad=0
        ),
        "subsection_title": ParagraphStyle(
            "subsection_title",
            fontName="Helvetica-Bold",
            fontSize=11,
            textColor=SECONDARY,
            spaceBefore=10,
            spaceAfter=6
        ),
        "body": ParagraphStyle(
            "body",
            fontName="Helvetica",
            fontSize=10,
            textColor=TEXT_DARK,
            spaceAfter=6,
            leading=15,
            alignment=TA_JUSTIFY
        ),
        "body_bold": ParagraphStyle(
            "body_bold",
            fontName="Helvetica-Bold",
            fontSize=10,
            textColor=TEXT_DARK,
            spaceAfter=4
        ),
        "small": ParagraphStyle(
            "small",
            fontName="Helvetica",
            fontSize=8,
            textColor=TEXT_MUTED,
            spaceAfter=4
        ),
        "finding_title": ParagraphStyle(
            "finding_title",
            fontName="Helvetica-Bold",
            fontSize=10,
            textColor=PRIMARY,
            spaceAfter=4
        ),
        "table_header": ParagraphStyle(
            "table_header",
            fontName="Helvetica-Bold",
            fontSize=9,
            textColor=white,
            alignment=TA_CENTER
        ),
        "table_cell": ParagraphStyle(
            "table_cell",
            fontName="Helvetica",
            fontSize=9,
            textColor=TEXT_DARK,
            leading=12
        ),
    }

    # getSampleStyleSheet() mengembalikan StyleSheet1, bukan dict
    # Merge dengan cara yang benar: ambil built-in styles lalu tambah custom
    merged = {}
    for name in styles.byName:
        merged[name] = styles[name]
    merged.update(custom)
    return merged


def add_page_elements(canvas, doc):
    """Header dan footer untuk setiap halaman"""
    canvas.saveState()
    width, height = A4

    # Header bar
    canvas.setFillColor(PRIMARY)
    canvas.rect(0, height - 25*mm, width, 25*mm, fill=1, stroke=0)

    # Header text
    canvas.setFillColor(white)
    canvas.setFont("Helvetica-Bold", 10)
    canvas.drawString(1.5*cm, height - 15*mm, "SRM AUDIT PLATFORM")
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(width - 1.5*cm, height - 15*mm,
                           f"Confidential | {datetime.now().strftime('%d %B %Y')}")

    # Footer
    canvas.setFillColor(LIGHT_GREY)
    canvas.rect(0, 0, width, 15*mm, fill=1, stroke=0)
    canvas.setFillColor(BORDER_GREY)
    canvas.rect(0, 15*mm, width, 0.5*mm, fill=1, stroke=0)

    canvas.setFillColor(TEXT_MUTED)
    canvas.setFont("Helvetica", 7)
    canvas.drawString(1.5*cm, 6*mm, "NIST Cybersecurity Framework | Security Audit Report")
    canvas.drawRightString(width - 1.5*cm, 6*mm, f"Halaman {doc.page}")

    canvas.restoreState()


@router.get("/reports/audit/{audit_id}/pdf")
def generate_audit_report_pdf(
    audit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate laporan audit lengkap dalam format PDF.
    Berisi: Cover, Executive Summary, Asset List, Risk Assessment,
    Compliance Results, Findings, Recommendations.
    """
    # ── Ambil semua data yang diperlukan ──────────────────
    assignment = db.query(AuditAssignment).filter(AuditAssignment.id == audit_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Audit tidak ditemukan")

    org = db.query(Organization).filter(Organization.id == assignment.organization_id).first()
    assets = db.query(Asset).filter(Asset.organization_id == assignment.organization_id).all()
    asset_ids = [a.id for a in assets]

    checklist_items = db.query(AuditChecklistItem).filter(
        AuditChecklistItem.assignment_id == audit_id
    ).all()

    findings = db.query(AuditFinding).filter(
        AuditFinding.assignment_id == audit_id
    ).order_by(AuditFinding.severity).all()

    risk_mappings = db.query(VulnerabilityMapping).filter(
        VulnerabilityMapping.asset_id.in_(asset_ids)
    ).all() if asset_ids else []

    # ── Hitung compliance ─────────────────────────────────
    counts = {"Compliant": 0, "Partially Compliant": 0, "Non-Compliant": 0, "Not Applicable": 0}
    for item in checklist_items:
        counts[item.status] = counts.get(item.status, 0) + 1

    total_valid = len(checklist_items) - counts["Not Applicable"]
    score = counts["Compliant"] + (counts["Partially Compliant"] * 0.5)
    compliance_pct = round((score / total_valid) * 100, 1) if total_valid > 0 else 0

    if compliance_pct >= 85:
        final_opinion = "SECURE"
        opinion_color = COMPLIANT_GREEN
    elif compliance_pct >= 60:
        final_opinion = "ACCEPTABLE RISK"
        opinion_color = PARTIAL_YELLOW
    else:
        final_opinion = "NEEDS IMMEDIATE ACTION"
        opinion_color = CRITICAL_RED

    # ── Build PDF ─────────────────────────────────────────
    buffer = io.BytesIO()
    styles = build_styles()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=1.8*cm,
        leftMargin=1.8*cm,
        topMargin=3.2*cm,
        bottomMargin=2.2*cm,
    )

    story = []

    # ══════════════════════════════════════════
    # COVER PAGE
    # ══════════════════════════════════════════
    # Cover background — blue block
    cover_data = [[Paragraph(
        f"<br/><br/><br/><br/>"
        f'<font color="white" size="26"><b>LAPORAN AUDIT KEAMANAN</b></font><br/><br/>'
        f'<font color="#BFDBFE" size="14">Security Audit Report</font><br/><br/><br/>',
        styles["cover_title"]
    )]]
    cover_table = Table(cover_data, colWidths=[doc.width])
    cover_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PRIMARY),
        ("TOPPADDING", (0, 0), (-1, -1), 40),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 40),
        ("LEFTPADDING", (0, 0), (-1, -1), 20),
        ("RIGHTPADDING", (0, 0), (-1, -1), 20),
        ("ROUNDEDCORNERS", [8]),
    ]))
    story.append(cover_table)
    story.append(Spacer(1, 20))

    # Info boxes
    info_data = [
        [
            Paragraph("<b>ORGANISASI</b>", styles["table_header"]),
            Paragraph("<b>FRAMEWORK</b>", styles["table_header"]),
            Paragraph("<b>TANGGAL AUDIT</b>", styles["table_header"]),
        ],
        [
            Paragraph(org.name if org else "N/A", styles["body"]),
            Paragraph("NIST Cybersecurity Framework", styles["body"]),
            Paragraph(assignment.started_at.strftime('%d %B %Y'), styles["body"]),
        ]
    ]
    info_table = Table(info_data, colWidths=[doc.width/3]*3)
    info_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
        ("BACKGROUND", (0, 1), (-1, 1), ACCENT),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER_GREY),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("ROUNDEDCORNERS", [4]),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 15))

    # Compliance Score Box
    score_data = [[
        Paragraph(f'<font color="white" size="11"><b>OVERALL COMPLIANCE SCORE</b></font>', styles["cover_subtitle"]),
        Paragraph(f'<font color="white" size="28"><b>{compliance_pct}%</b></font>', styles["cover_title"]),
        Paragraph(f'<font color="white" size="13"><b>{final_opinion}</b></font>', styles["cover_subtitle"]),
    ]]
    score_table = Table(score_data, colWidths=[doc.width/3]*3)
    score_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), opinion_color),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 15),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 15),
        ("ROUNDEDCORNERS", [6]),
    ]))
    story.append(score_table)
    story.append(PageBreak())

    # ══════════════════════════════════════════
    # SECTION 1: SCOPE & METHODOLOGY
    # ══════════════════════════════════════════
    story.append(Paragraph("1. RUANG LINGKUP DAN METODOLOGI", styles["section_title"]))
    story.append(HRFlowable(width="100%", thickness=2, color=PRIMARY, spaceAfter=8))

    story.append(Paragraph(
        f"Audit keamanan informasi ini dilakukan terhadap <b>{org.name if org else 'Organisasi'}</b> "
        f"yang bergerak di sektor <b>{org.business_sector if org else 'N/A'}</b> dengan "
        f"jumlah karyawan sebanyak <b>{org.employee_count if org else 'N/A'}</b> orang. "
        f"Jenis sistem yang dievaluasi adalah <b>{org.system_type if org else 'N/A'}</b> "
        f"dengan tingkat eksposur yang dikategorikan sebagai <b>{org.exposure_level if org else 'N/A'}</b>.",
        styles["body"]
    ))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "Audit ini menggunakan <b>NIST Cybersecurity Framework (CSF) 2.0</b> sebagai referensi, "
        "yang mencakup lima fungsi utama: <b>Identify, Protect, Detect, Respond, dan Recover</b>. "
        "Penilaian risiko menggunakan metodologi kuantitatif dengan formula "
        "<b>Risk Score = Likelihood × Impact</b> berdasarkan katalog kerentanan OWASP Top 10.",
        styles["body"]
    ))
    story.append(Spacer(1, 15))

    # ══════════════════════════════════════════
    # SECTION 2: ASSET INVENTORY
    # ══════════════════════════════════════════
    story.append(Paragraph("2. INVENTARIS ASET", styles["section_title"]))
    story.append(HRFlowable(width="100%", thickness=2, color=PRIMARY, spaceAfter=8))

    if assets:
        asset_headers = ["Nama Aset", "Pemilik", "Lokasi", "Tipe", "C", "I", "A", "Skor Kritis"]
        asset_data = [
            [Paragraph(h, styles["table_header"]) for h in asset_headers]
        ]
        for a in assets:
            cia_map = {"High": "T", "Medium": "S", "Low": "R"}
            asset_data.append([
                Paragraph(a.name, styles["table_cell"]),
                Paragraph(a.owner, styles["table_cell"]),
                Paragraph(a.location, styles["table_cell"]),
                Paragraph(a.asset_type, styles["table_cell"]),
                Paragraph(cia_map.get(a.confidentiality, "-"), styles["table_cell"]),
                Paragraph(cia_map.get(a.integrity, "-"), styles["table_cell"]),
                Paragraph(cia_map.get(a.availability, "-"), styles["table_cell"]),
                Paragraph(f"{a.criticality_score or 0:.1f}/10", styles["table_cell"]),
            ])

        asset_table = Table(
            asset_data,
            colWidths=[4*cm, 2.5*cm, 2.5*cm, 2*cm, 0.8*cm, 0.8*cm, 0.8*cm, 2*cm]
        )
        asset_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, LIGHT_GREY]),
            ("GRID", (0, 0), (-1, -1), 0.5, BORDER_GREY),
            ("ALIGN", (4, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(asset_table)
        story.append(Paragraph("Keterangan CIA: T=Tinggi, S=Sedang, R=Rendah", styles["small"]))
    else:
        story.append(Paragraph("Tidak ada aset yang terdaftar.", styles["body"]))

    story.append(Spacer(1, 15))

    # ══════════════════════════════════════════
    # SECTION 3: RISK ASSESSMENT
    # ══════════════════════════════════════════
    story.append(Paragraph("3. PENILAIAN RISIKO", styles["section_title"]))
    story.append(HRFlowable(width="100%", thickness=2, color=PRIMARY, spaceAfter=8))

    if risk_mappings:
        risk_dist = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
        for r in risk_mappings:
            risk_dist[r.risk_level] = risk_dist.get(r.risk_level, 0) + 1

        # Summary boxes
        risk_summary_data = [[
            Paragraph(f'<font color="white"><b>CRITICAL</b><br/>{risk_dist["Critical"]}</font>', styles["body"]),
            Paragraph(f'<font color="white"><b>HIGH</b><br/>{risk_dist["High"]}</font>', styles["body"]),
            Paragraph(f'<font color="white"><b>MEDIUM</b><br/>{risk_dist["Medium"]}</font>', styles["body"]),
            Paragraph(f'<font color="white"><b>LOW</b><br/>{risk_dist["Low"]}</font>', styles["body"]),
        ]]
        risk_summary_table = Table(risk_summary_data, colWidths=[doc.width/4]*4)
        risk_summary_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, 0), CRITICAL_RED),
            ("BACKGROUND", (1, 0), (1, 0), HIGH_ORANGE),
            ("BACKGROUND", (2, 0), (2, 0), MEDIUM_YELLOW),
            ("BACKGROUND", (3, 0), (3, 0), LOW_GREEN),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("TOPPADDING", (0, 0), (-1, -1), 12),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
            ("ROUNDEDCORNERS", [4]),
        ]))
        story.append(risk_summary_table)
        story.append(Spacer(1, 10))

        # Risk detail table
        risk_headers = ["Aset", "Kerentanan", "Kategori", "Likelihood", "Impact", "Score", "Level"]
        risk_data = [[Paragraph(h, styles["table_header"]) for h in risk_headers]]

        for r in risk_mappings[:20]:  # Max 20 baris
            risk_data.append([
                Paragraph(r.asset.name[:20], styles["table_cell"]),
                Paragraph(r.vulnerability.name[:25], styles["table_cell"]),
                Paragraph(r.vulnerability.category[:20], styles["table_cell"]),
                Paragraph(str(r.custom_likelihood), styles["table_cell"]),
                Paragraph(str(r.custom_impact), styles["table_cell"]),
                Paragraph(str(r.risk_score), styles["table_cell"]),
                Paragraph(r.risk_level, ParagraphStyle(
                    "risk_level", fontName="Helvetica-Bold", fontSize=9,
                    textColor=get_risk_color(r.risk_level), alignment=TA_CENTER
                )),
            ])

        risk_table = Table(
            risk_data,
            colWidths=[3*cm, 4*cm, 3*cm, 1.5*cm, 1.5*cm, 1.5*cm, 2*cm]
        )
        risk_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, LIGHT_GREY]),
            ("GRID", (0, 0), (-1, -1), 0.5, BORDER_GREY),
            ("ALIGN", (3, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(risk_table)
    else:
        story.append(Paragraph("Belum ada risk assessment yang dilakukan.", styles["body"]))

    story.append(PageBreak())

    # ══════════════════════════════════════════
    # SECTION 4: COMPLIANCE RESULTS
    # ══════════════════════════════════════════
    story.append(Paragraph("4. HASIL AUDIT COMPLIANCE NIST CSF", styles["section_title"]))
    story.append(HRFlowable(width="100%", thickness=2, color=PRIMARY, spaceAfter=8))

    # Overall score display
    score_summary_data = [[
        Paragraph(f'<font color="white" size="11"><b>Total Controls</b><br/>{len(checklist_items)}</font>', styles["body"]),
        Paragraph(f'<font color="white" size="11"><b>Compliant</b><br/>{counts["Compliant"]}</font>', styles["body"]),
        Paragraph(f'<font color="white" size="11"><b>Partial</b><br/>{counts["Partially Compliant"]}</font>', styles["body"]),
        Paragraph(f'<font color="white" size="11"><b>Non-Compliant</b><br/>{counts["Non-Compliant"]}</font>', styles["body"]),
        Paragraph(f'<font color="white" size="16"><b>Score: {compliance_pct}%</b></font>', styles["body"]),
    ]]
    score_table = Table(score_summary_data, colWidths=[doc.width/5]*5)
    score_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), SECONDARY),
        ("BACKGROUND", (4, 0), (4, 0), opinion_color),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ("GRID", (0, 0), (-1, -1), 0.5, white),
        ("ROUNDEDCORNERS", [4]),
    ]))
    story.append(score_table)
    story.append(Spacer(1, 12))

    # Breakdown per function
    nist_functions = ["Identify", "Protect", "Detect", "Respond", "Recover"]
    func_emojis = {"Identify": "ID", "Protect": "PR", "Detect": "DE", "Respond": "RS", "Recover": "RC"}

    func_data = [[
        Paragraph("<b>Fungsi NIST CSF</b>", styles["table_header"]),
        Paragraph("<b>Compliant</b>", styles["table_header"]),
        Paragraph("<b>Partial</b>", styles["table_header"]),
        Paragraph("<b>Non-Compliant</b>", styles["table_header"]),
        Paragraph("<b>N/A</b>", styles["table_header"]),
        Paragraph("<b>Score</b>", styles["table_header"]),
    ]]

    for func in nist_functions:
        func_items = [i for i in checklist_items if i.control.function == func]
        func_counts = {"Compliant": 0, "Partially Compliant": 0, "Non-Compliant": 0, "Not Applicable": 0}
        for fi in func_items:
            func_counts[fi.status] = func_counts.get(fi.status, 0) + 1
        fv = len(func_items) - func_counts["Not Applicable"]
        fs = func_counts["Compliant"] + func_counts["Partially Compliant"] * 0.5
        fpct = round((fs / fv * 100), 1) if fv > 0 else 0

        func_data.append([
            Paragraph(f"[{func_emojis[func]}] {func}", styles["table_cell"]),
            Paragraph(str(func_counts["Compliant"]), styles["table_cell"]),
            Paragraph(str(func_counts["Partially Compliant"]), styles["table_cell"]),
            Paragraph(str(func_counts["Non-Compliant"]), styles["table_cell"]),
            Paragraph(str(func_counts["Not Applicable"]), styles["table_cell"]),
            Paragraph(f"{fpct}%", ParagraphStyle(
                "fpct", fontName="Helvetica-Bold", fontSize=9,
                textColor=COMPLIANT_GREEN if fpct >= 85 else PARTIAL_YELLOW if fpct >= 60 else NON_COMPLIANT_RED,
                alignment=TA_CENTER
            )),
        ])

    func_table = Table(func_data, colWidths=[3.5*cm, 2*cm, 2*cm, 2.5*cm, 1.5*cm, 2.5*cm])
    func_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, LIGHT_GREY]),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER_GREY),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(func_table)
    story.append(Spacer(1, 15))

    # ══════════════════════════════════════════
    # SECTION 5: AUDIT FINDINGS
    # ══════════════════════════════════════════
    story.append(Paragraph("5. TEMUAN AUDIT", styles["section_title"]))
    story.append(HRFlowable(width="100%", thickness=2, color=PRIMARY, spaceAfter=8))

    if findings:
        for i, finding in enumerate(findings, 1):
            severity_color = get_risk_color(finding.severity)

            finding_block = [
                # Finding header
                [
                    Paragraph(
                        f'<font color="white"><b>#{i} [{finding.severity.upper()}] {finding.title}</b></font>',
                        ParagraphStyle("fh", fontName="Helvetica-Bold", fontSize=9,
                                       textColor=white, leading=14)
                    )
                ],
                # Finding content
                [
                    Table([
                        [
                            Paragraph("<b>Temuan:</b>", styles["body_bold"]),
                            Paragraph(finding.issue, styles["body"])
                        ],
                        [
                            Paragraph("<b>Risiko:</b>", styles["body_bold"]),
                            Paragraph(finding.risk_description, styles["body"])
                        ],
                        [
                            Paragraph("<b>Aset Terdampak:</b>", styles["body_bold"]),
                            Paragraph(finding.affected_asset or "N/A", styles["body"])
                        ],
                        [
                            Paragraph("<b>Rekomendasi:</b>", styles["body_bold"]),
                            Paragraph(finding.recommendation, styles["body"])
                        ],
                    ], colWidths=[3*cm, doc.width - 3*cm - 1.2*cm],
                    style=TableStyle([
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ("TOPPADDING", (0, 0), (-1, -1), 4),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ]))
                ]
            ]

            finding_table = Table(finding_block, colWidths=[doc.width])
            finding_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), severity_color),
                ("BACKGROUND", (0, 1), (-1, 1), LIGHT_GREY),
                ("BOX", (0, 0), (-1, -1), 1, BORDER_GREY),
                ("TOPPADDING", (0, 0), (-1, 0), 8),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 1), (-1, 1), 8),
                ("BOTTOMPADDING", (0, 1), (-1, 1), 8),
            ]))

            story.append(KeepTogether([finding_table, Spacer(1, 8)]))
    else:
        story.append(Paragraph("Tidak ada findings yang tercatat.", styles["body"]))

    story.append(PageBreak())

    # ══════════════════════════════════════════
    # SECTION 6: FINAL OPINION
    # ══════════════════════════════════════════
    story.append(Paragraph("6. OPINI AUDIT AKHIR", styles["section_title"]))
    story.append(HRFlowable(width="100%", thickness=2, color=PRIMARY, spaceAfter=8))

    opinion_data = [[
        Paragraph(
            f'<font color="white" size="18"><b>⚖️  {final_opinion}</b></font><br/><br/>'
            f'<font color="white" size="10">Compliance Score: {compliance_pct}% | '
            f'Total Findings: {len(findings)} | '
            f'Critical Issues: {sum(1 for f in findings if f.severity == "Critical")}</font>',
            ParagraphStyle("opinion", fontName="Helvetica-Bold", fontSize=18,
                           textColor=white, alignment=TA_CENTER, leading=28)
        )
    ]]
    opinion_table = Table(opinion_data, colWidths=[doc.width])
    opinion_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), opinion_color),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 25),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 25),
        ("ROUNDEDCORNERS", [8]),
    ]))
    story.append(opinion_table)
    story.append(Spacer(1, 15))

    story.append(Paragraph(
        f"Laporan ini dibuat secara otomatis oleh SRM Audit Platform pada "
        f"{datetime.now().strftime('%d %B %Y pukul %H:%M WIB')}. "
        f"Dokumen ini bersifat RAHASIA dan hanya ditujukan untuk manajemen dan pihak yang berwenang.",
        ParagraphStyle("disclaimer", fontName="Helvetica-Oblique", fontSize=8,
                       textColor=TEXT_MUTED, alignment=TA_CENTER)
    ))

    # Build PDF
    doc.build(story, onFirstPage=add_page_elements, onLaterPages=add_page_elements)
    buffer.seek(0)

    org_name = (org.name or "audit").replace(" ", "_")
    filename = f"Audit_Report_{org_name}_{datetime.now().strftime('%Y%m%d')}.pdf"

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
