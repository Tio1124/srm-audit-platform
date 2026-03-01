"""
routers/ai_assistant.py — Module 10: AI Auditor Assistant (FIXED)
Perbaikan:
- 503 fix: better Groq error handling & API key validation dengan pesan jelas
- 422 fix: query validation direlaksasi (min_length=1)
- Tambahan: /ai/status endpoint untuk diagnosa masalah
"""

import os
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from dotenv import load_dotenv

# Absolute path agar .env terbaca walau dijalankan dari direktori mana pun
load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env", override=True)  # override=True agar .env selalu menang

router = APIRouter(tags=["AI Assistant"])

_groq_client = None


def get_groq_client():
    """Inisialisasi Groq client dengan validasi API key yang lengkap."""
    global _groq_client
    if _groq_client is not None:
        return _groq_client

    # Coba baca langsung dari .env jika os.getenv kosong (fallback manual)
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        # Manual fallback: baca file .env langsung
        env_file = Path(__file__).parent.parent / ".env"
        if env_file.exists():
            for line in env_file.read_text().splitlines():
                line = line.strip()
                if line.startswith("GROQ_API_KEY=") and not line.startswith("#"):
                    api_key = line.split("=", 1)[1].strip().strip('"').strip("'")
                    if api_key:
                        os.environ["GROQ_API_KEY"] = api_key  # set ke env agar /ai/status juga bisa baca
                        break

    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="GROQ_API_KEY belum diset di file .env. "
                   "Dapatkan API key gratis di https://console.groq.com lalu tambahkan: GROQ_API_KEY=gsk_xxxx"
        )
    if api_key in ("your-groq-api-key-here", "gsk_xxxx", "gsk_xxxxxxxxxxxxxxxxxxxxxxxx"):
        raise HTTPException(
            status_code=503,
            detail="GROQ_API_KEY masih berisi nilai contoh/placeholder. "
                   "Ganti dengan API key asli dari https://console.groq.com"
        )
    if not api_key.startswith("gsk_"):
        raise HTTPException(
            status_code=503,
            detail=f"Format GROQ_API_KEY tidak valid. "
                   f"API key Groq harus diawali 'gsk_'. Nilai saat ini dimulai dengan: '{api_key[:6]}'"
        )

    try:
        from groq import Groq
        import httpx

        # Patch untuk groq 0.9.0 + httpx >= 0.28 incompatibility
        # httpx 0.28 menghapus parameter 'proxies' yang masih dipakai groq 0.9.0
        # Solusi: inject httpx client yang sudah dikonfigurasi tanpa proxies
        try:
            _groq_client = Groq(api_key=api_key)
        except TypeError as te:
            if "proxies" not in str(te):
                raise
            # Workaround: buat httpx client sendiri lalu inject ke Groq
            http_client = httpx.Client(
                base_url="https://api.groq.com",
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=30.0
            )
            _groq_client = Groq(api_key=api_key, http_client=http_client)

        return _groq_client
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="Package 'groq' belum terinstall. Jalankan: pip install groq"
        )
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Gagal inisialisasi Groq: {str(e)}"
        )


def call_groq(system_prompt: str, user_message: str, max_tokens: int = 1200) -> str:
    """Panggil Groq API dengan error handling lengkap."""
    client = get_groq_client()
    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            max_tokens=max_tokens,
            temperature=0.7,
        )
        return completion.choices[0].message.content

    except HTTPException:
        raise  # re-raise HTTPException dari get_groq_client
    except Exception as e:
        err = str(e).lower()
        if "authentication" in err or "invalid api key" in err or "401" in err:
            raise HTTPException(
                status_code=503,
                detail="API key Groq tidak valid atau expired. Cek di https://console.groq.com"
            )
        elif "rate_limit" in err or "429" in err:
            raise HTTPException(
                status_code=503,
                detail="Rate limit Groq tercapai. Tunggu 10-30 detik lalu coba lagi."
            )
        elif "timeout" in err or "connection" in err:
            raise HTTPException(
                status_code=503,
                detail="Koneksi ke Groq timeout. Periksa koneksi internet kamu."
            )
        else:
            raise HTTPException(
                status_code=503,
                detail=f"Error dari Groq API: {str(e)}"
            )


# ── DEBUG: Cek status AI ──────────────────────────────────

@router.get("/ai/status")
def check_ai_status():
    """
    Cek status konfigurasi AI — buka di browser untuk diagnosa.
    URL: http://localhost:8000/ai/status
    """
    api_key = os.getenv("GROQ_API_KEY", "").strip()

    # Manual fallback: baca .env langsung jika os.getenv kosong
    env_file = Path(__file__).parent.parent / ".env"
    if not api_key and env_file.exists():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if line.startswith("GROQ_API_KEY=") and not line.startswith("#"):
                api_key = line.split("=", 1)[1].strip().strip('"').strip("'")
                break

    result = {
        "step_1_api_key_set": bool(api_key),
        "step_2_format_valid": api_key.startswith("gsk_") if api_key else False,
        "step_3_key_preview": f"{api_key[:8]}...{api_key[-4:]}" if len(api_key) > 12 else f"'{api_key}' (terlalu pendek)",
        "step_4_package_installed": False,
        "step_5_connection": "not tested",
        "diagnosis": "",
        "fix": ""
    }

    # Cek package
    try:
        import groq
        result["step_4_package_installed"] = True
        result["groq_version"] = groq.__version__
    except ImportError:
        result["diagnosis"] = "Package groq tidak terinstall"
        result["fix"] = "Jalankan: pip install groq"
        return result

    # Diagnosis API key
    if not api_key:
        result["diagnosis"] = "GROQ_API_KEY tidak ada di .env"
        result["fix"] = "Tambahkan GROQ_API_KEY=gsk_xxxx ke file backend/.env"
        return result

    if not api_key.startswith("gsk_"):
        result["diagnosis"] = "Format API key salah"
        result["fix"] = f"API key harus dimulai dengan 'gsk_'. Dapatkan di https://console.groq.com"
        return result

    # Test koneksi
    try:
        from groq import Groq
        client = Groq(api_key=api_key)
        test = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": "test"}],
            max_tokens=3
        )
        result["step_5_connection"] = "SUCCESS ✅ — AI siap digunakan!"
        result["diagnosis"] = "Semua konfigurasi OK"
        result["fix"] = "Tidak ada masalah"
    except Exception as e:
        result["step_5_connection"] = f"FAILED ❌"
        result["diagnosis"] = str(e)
        if "authentication" in str(e).lower():
            result["fix"] = "API key tidak valid. Buat API key baru di https://console.groq.com"
        elif "rate" in str(e).lower():
            result["fix"] = "Rate limit. Tunggu beberapa saat."
        else:
            result["fix"] = f"Error: {str(e)}"

    return result


# ── Imports untuk endpoints ───────────────────────────────
from database import get_db, OWASPVulnerability, AuditAssignment, AuditFinding, AuditChecklistItem
from schemas import AIQueryRequest
from routers.auth import get_current_user
from database import User


# ── ENDPOINT 1: VULNERABILITY EXPLAINER ──────────────────

@router.post("/ai/explain-vulnerability")
def explain_vulnerability(
    request: AIQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Module 10D: Jelaskan kerentanan dalam bahasa manajemen non-teknis."""
    system_prompt = """Kamu adalah konsultan keamanan siber senior yang menjelaskan risiko teknis 
kepada eksekutif bisnis dan manajemen non-teknis di Indonesia.

Selalu gunakan format berikut dalam Bahasa Indonesia:

**Apa itu [nama kerentanan]?**
(1-2 kalimat sederhana tanpa jargon teknis)

**Analogi Sederhana:**
(Perumpamaan sehari-hari yang mudah dipahami)

**Dampak Bisnis Nyata:**
- (dampak 1 yang konkret)
- (dampak 2 yang konkret)
- (dampak 3 yang konkret)

**Rekomendasi Segera:**
1. (langkah 1 yang spesifik)
2. (langkah 2 yang spesifik)
3. (langkah 3 yang spesifik)

**Tingkat Prioritas:** [Rendah / Sedang / Tinggi / Kritis]
(Penjelasan singkat kenapa prioritas ini)"""

    # Ambil detail dari database
    vuln_context = ""
    if request.vulnerability_name:
        vuln = db.query(OWASPVulnerability).filter(
            OWASPVulnerability.name == request.vulnerability_name
        ).first()
        if vuln:
            vuln_context = (
                f"\nDeskripsi teknis: {vuln.description}"
                f"\nDampak yang diketahui: {vuln.default_impact_description}"
                f"\nReferensi OWASP: {vuln.owasp_reference}"
            )

    org_ctx = f"\nKonteks organisasi: {request.organization_name}" if request.organization_name else ""
    vuln_name = request.vulnerability_name or "kerentanan yang ditanyakan"

    user_message = (
        f"Jelaskan kerentanan keamanan berikut kepada manajemen:{org_ctx}\n\n"
        f"Kerentanan: {vuln_name}{vuln_context}\n\n"
        f"Pertanyaan spesifik: {request.query}\n\n"
        f"Gunakan bahasa yang mudah dipahami orang non-teknis."
    )

    response_text = call_groq(system_prompt, user_message, max_tokens=1200)
    return {"query": request.query, "vulnerability": vuln_name, "response": response_text, "context": "vulnerability_explainer"}


# ── ENDPOINT 2: AUDIT ADVISOR ─────────────────────────────

@router.post("/ai/audit-advice")
def get_audit_advice(
    request: AIQueryRequest,
    current_user: User = Depends(get_current_user)
):
    """Module 10A: Saran teknis audit NIST CSF."""
    system_prompt = """Kamu adalah auditor keamanan informasi bersertifikat (CISA, CISSP) 
yang ahli dalam NIST Cybersecurity Framework (CSF) 2.0.

Berikan jawaban dalam Bahasa Indonesia yang:
1. Akurat secara teknis namun mudah dipahami
2. Mengacu pada kontrol NIST CSF yang relevan (sebutkan ID kontrol seperti PR.AC-1)
3. Disertai contoh praktis cara verifikasi di lapangan
4. Menyebutkan dokumen/bukti apa yang biasanya diminta auditor
5. Memberikan tips praktis dari pengalaman audit nyata"""

    response_text = call_groq(system_prompt, request.query, max_tokens=1000)
    return {"query": request.query, "response": response_text, "context": "audit_advisor"}


# ── ENDPOINT 3: CONTROL RECOMMENDATION ───────────────────

@router.post("/ai/recommend-controls")
def recommend_controls(
    request: AIQueryRequest,
    current_user: User = Depends(get_current_user)
):
    """Module 10C: Rekomendasi langkah mitigasi."""
    system_prompt = """Kamu adalah konsultan implementasi keamanan siber yang memberikan 
rekomendasi kontrol keamanan yang praktis dan cost-effective untuk organisasi di Indonesia.

Format jawaban dalam Bahasa Indonesia:

**Kontrol Prioritas Tinggi (0-30 hari):**
1. [Nama kontrol] — [cara implementasi konkret]
2. [Nama kontrol] — [cara implementasi konkret]

**Kontrol Jangka Menengah (1-3 bulan):**
1. [Nama kontrol] — [cara implementasi]

**Tools yang Direkomendasikan:**
- [Nama tool] — [gratis/berbayar] — [fungsi]

**Estimasi Effort Implementasi:** [Rendah / Sedang / Tinggi]
**Perkiraan Biaya:** [Gratis / Rendah / Sedang / Tinggi]"""

    org_ctx = f"\nOrganisasi: {request.organization_name}" if request.organization_name else ""
    vuln_ctx = f"\nKerentanan terkait: {request.vulnerability_name}" if request.vulnerability_name else ""
    user_message = f"Berikan rekomendasi kontrol untuk:{org_ctx}{vuln_ctx}\n\nMasalah: {request.query}"

    response_text = call_groq(system_prompt, user_message, max_tokens=1200)
    return {"query": request.query, "response": response_text, "context": "control_recommendation"}


# ── ENDPOINT 4: EXECUTIVE SUMMARY ────────────────────────

@router.post("/ai/generate-executive-summary/{audit_id}")
def generate_executive_summary(
    audit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Module 10B: Generate executive summary dari data audit."""
    assignment = db.query(AuditAssignment).filter(AuditAssignment.id == audit_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Audit tidak ditemukan")

    items = db.query(AuditChecklistItem).filter(
        AuditChecklistItem.assignment_id == audit_id
    ).all()

    if not items:
        raise HTTPException(status_code=400, detail="Audit belum memiliki checklist. Buat checklist terlebih dahulu.")

    counts = {"Compliant": 0, "Partially Compliant": 0, "Non-Compliant": 0, "Not Applicable": 0}
    for item in items:
        counts[item.status] = counts.get(item.status, 0) + 1

    total_valid = len(items) - counts["Not Applicable"]
    score = counts["Compliant"] + (counts["Partially Compliant"] * 0.5)
    compliance_pct = round((score / total_valid) * 100, 1) if total_valid > 0 else 0

    findings = db.query(AuditFinding).filter(AuditFinding.assignment_id == audit_id).all()
    findings_txt = "\n".join([f"- [{f.severity}] {f.title}" for f in findings[:8]]) or "Belum ada findings"

    system_prompt = """Kamu adalah penulis laporan audit keamanan profesional.
Tulis Executive Summary dalam Bahasa Indonesia (300-450 kata) untuk C-level executives.
Struktur: (1) Pendahuluan singkat, (2) Metodologi, (3) Hasil utama, 
(4) Temuan kritis, (5) Rekomendasi prioritas, (6) Opini audit akhir.
Opini akhir harus salah satu dari: SECURE / ACCEPTABLE RISK / NEEDS IMMEDIATE ACTION"""

    user_message = (
        f"Nama Audit: {assignment.audit_name}\n"
        f"Framework: {assignment.framework}\n"
        f"Tanggal: {assignment.started_at.strftime('%d %B %Y')}\n\n"
        f"COMPLIANCE: {compliance_pct}% ({counts['Compliant']} compliant, "
        f"{counts['Partially Compliant']} partial, {counts['Non-Compliant']} non-compliant "
        f"dari {len(items)} total kontrol)\n\n"
        f"FINDINGS ({len(findings)} total):\n{findings_txt}\n\n"
        f"Tulis executive summary profesional."
    )

    response_text = call_groq(system_prompt, user_message, max_tokens=1500)
    return {
        "audit_id": audit_id,
        "executive_summary": response_text,
        "compliance_score": compliance_pct,
        "total_findings": len(findings)
    }


# ── ENDPOINT 5: GENERAL CHAT ──────────────────────────────

@router.post("/ai/chat")
def ai_chat(
    request: AIQueryRequest,
    current_user: User = Depends(get_current_user)
):
    """Chat umum dengan ARIA — AI Security Assistant."""
    system_prompt = """Kamu adalah ARIA (Audit Risk Intelligence Assistant), asisten AI keamanan siber 
yang terintegrasi dalam platform GRC berbasis NIST Cybersecurity Framework.

Kamu ahli dalam: NIST CSF 2.0, ISO 27001, OWASP Top 10, Risk Assessment, Security Audit.

Selalu gunakan Bahasa Indonesia yang profesional. Berikan jawaban konkret dan actionable.
Sertakan referensi framework jika relevan. Jika tidak tahu, katakan dengan jujur."""

    response_text = call_groq(system_prompt, request.query, max_tokens=800)
    return {"query": request.query, "response": response_text, "context": "general_chat"}
