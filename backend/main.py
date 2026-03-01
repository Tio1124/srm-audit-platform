"""
main.py — Entry point aplikasi FastAPI
Menggabungkan semua router dan melakukan inisialisasi database
"""

import os
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

from database import create_tables, SessionLocal, OWASPVulnerability, NISTControl
from seed_data import OWASP_VULNERABILITIES, NIST_CSF_CONTROLS
from routers import auth, organizations, risk, audit, ai_assistant, reports

# Load .env dari direktori backend (absolute path agar tidak gagal walau dijalankan dari mana saja)
_env_path = Path(__file__).parent / ".env"
if not _env_path.exists():
    print(f"⚠️  File .env tidak ditemukan di {_env_path}")
    print("   Salin .env.example menjadi .env lalu isi nilainya!")
load_dotenv(dotenv_path=_env_path, override=True)  # override=True agar .env selalu menang

# ── Buat aplikasi FastAPI ─────────────────────────────────
app = FastAPI(
    title="SRM Audit Platform API",
    description="AI-Assisted Cybersecurity Risk Assessment & Security Audit Platform (NIST CSF)",
    version="1.0.0",
    docs_url="/docs",       # Swagger UI — buka di browser untuk testing API
    redoc_url="/redoc"
)

# ── Validation Error Handler ─────────────────────────────
# Tampilkan detail error 422 dengan jelas di log server
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    print(f"\n❌ 422 VALIDATION ERROR on {request.method} {request.url.path}")
    print(f"   Errors: {errors}")
    try:
        body = await request.body()
        print(f"   Request body: {body.decode()[:500]}")
    except Exception:
        pass
    return JSONResponse(
        status_code=422,
        content={"detail": errors, "body_hint": "Cek field yang dikirim sudah sesuai schema"}
    )


# ── CORS Middleware ──────────────────────────────────────
# CORS diperlukan agar React frontend bisa berkomunikasi dengan FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static files untuk uploads ───────────────────────────
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ── Register semua router ────────────────────────────────
app.include_router(auth.router)
app.include_router(organizations.router)
app.include_router(risk.router)
app.include_router(audit.router)
app.include_router(ai_assistant.router)
app.include_router(reports.router)


# ── Startup Event ─────────────────────────────────────────
@app.on_event("startup")
def startup_event():
    """
    Dijalankan otomatis saat server dimulai.
    1. Buat tabel database
    2. Isi data awal (OWASP vulns & NIST controls) jika belum ada
    """
    print("🚀 Memulai SRM Audit Platform...")

    # Buat tabel
    create_tables()
    print("✅ Database tables created")

    # Seed OWASP Vulnerabilities
    db = SessionLocal()
    try:
        if db.query(OWASPVulnerability).count() == 0:
            for vuln_data in OWASP_VULNERABILITIES:
                vuln = OWASPVulnerability(**vuln_data)
                db.add(vuln)
            db.commit()
            print(f"✅ Seeded {len(OWASP_VULNERABILITIES)} OWASP vulnerabilities")
        else:
            print("ℹ️  OWASP vulnerabilities already seeded")

        # Seed NIST CSF Controls
        if db.query(NISTControl).count() == 0:
            for ctrl_data in NIST_CSF_CONTROLS:
                ctrl = NISTControl(**ctrl_data)
                db.add(ctrl)
            db.commit()
            print(f"✅ Seeded {len(NIST_CSF_CONTROLS)} NIST CSF controls")
        else:
            print("ℹ️  NIST CSF controls already seeded")

    finally:
        db.close()

    print("🛡️  SRM Audit Platform siap digunakan!")
    print("📚 API Documentation: http://localhost:8000/docs")

    # ── Cek konfigurasi penting ──────────────────────────
    import os
    groq_key = os.getenv("GROQ_API_KEY", "")
    if not groq_key or not groq_key.startswith("gsk_"):
        print("⚠️  PERINGATAN: GROQ_API_KEY belum dikonfigurasi!")
        print("   Fitur AI tidak akan bekerja.")
        print("   Dapatkan API key gratis di: https://console.groq.com")
        print("   Lalu tambahkan ke file backend/.env: GROQ_API_KEY=gsk_xxxx")
    else:
        print(f"✅ GROQ_API_KEY terkonfigurasi ({groq_key[:8]}...)")


@app.get("/")
def root():
    return {
        "message": "SRM Audit Platform API",
        "version": "1.0.0",
        "framework": "NIST Cybersecurity Framework",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "SRM Audit Platform"}
