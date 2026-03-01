# 🛡️ SRM Audit Platform — Setup Guide Lengkap

> AI-Assisted Cybersecurity Risk Assessment & Security Audit Platform  
> Framework: NIST Cybersecurity Framework (CSF)  
> Tech Stack: FastAPI + SQLite (Backend) | React.js + Tailwind CSS (Frontend)

---

## 📋 PRASYARAT (Install Dulu!)

Pastikan semua tools berikut sudah terinstall:

| Tool | Versi Minimum | Cara Cek |
|------|--------------|----------|
| Python | 3.11+ | `python --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |

Jika belum install:
- Python: https://python.org/downloads
- Node.js: https://nodejs.org (pilih LTS)

---

## 🔑 LANGKAH 0: Dapatkan API Key (WAJIB untuk fitur AI)

### Groq API Key (GRATIS!)
1. Buka: https://console.groq.com
2. Daftar/login dengan akun Google/GitHub
3. Klik **"API Keys"** di sidebar
4. Klik **"Create API Key"**
5. Salin API key (format: `gsk_xxxxxxxxxxxx`)

> **Kenapa Groq?** Groq menyediakan LLaMA 3.3 70B secara gratis dengan kecepatan sangat tinggi. Tidak perlu kartu kredit.

---

## 🚀 LANGKAH 1: Setup Backend (FastAPI)

### 1.1 Masuk ke folder backend
```bash
cd srm-audit-platform/backend
```

### 1.2 Buat Virtual Environment
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Mac/Linux
python -m venv venv
source venv/bin/activate
```
> Setelah berhasil, di terminal kamu akan ada tulisan `(venv)` di depan prompt

### 1.3 Install semua dependencies
```bash
pip install -r requirements.txt
```
> Proses ini butuh 2-5 menit tergantung koneksi internet

### 1.4 Buat file konfigurasi
```bash
# Copy template
cp .env.example .env
```

Lalu buka file `.env` dengan text editor dan isi:
```env
SECRET_KEY=ini-adalah-kunci-rahasia-jwt-ganti-dengan-random-string-panjang
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxx   ← GANTI dengan API key Groq kamu
DATABASE_URL=sqlite:///./srm_audit.db
UPLOAD_DIR=uploads
```

### 1.5 Jalankan server
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Jika berhasil, kamu akan melihat:
```
🚀 Memulai SRM Audit Platform...
✅ Database tables created
✅ Seeded 19 OWASP vulnerabilities
✅ Seeded 28 NIST CSF controls
🛡️  SRM Audit Platform siap digunakan!
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### ✅ Verifikasi Backend
Buka browser: http://localhost:8000/docs

Kamu akan melihat **Swagger UI** — halaman dokumentasi API interaktif.  
Ini berarti backend sudah berjalan dengan benar!

---

## 🎨 LANGKAH 2: Setup Frontend (React)

### 2.1 Buka terminal BARU (jangan tutup terminal backend!)

### 2.2 Masuk ke folder frontend
```bash
cd srm-audit-platform/frontend
```

### 2.3 Install dependencies Node.js
```bash
npm install
```
> Proses ini akan mengunduh ~200MB package. Butuh 3-5 menit.

### 2.4 Jalankan development server
```bash
npm run dev
```

Jika berhasil:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: http://192.168.x.x:3000/
```

### ✅ Verifikasi Frontend
Buka browser: http://localhost:3000

Kamu akan melihat halaman login SRM Audit Platform!

---

## 👤 LANGKAH 3: Daftar & Login Pertama Kali

1. Buka http://localhost:3000/register
2. Isi form dengan data kamu:
   - Nama Lengkap: (nama kamu)
   - Username: admin
   - Email: admin@company.com
   - Password: (min 6 karakter)
   - Role: pilih **Auditor** (akan jadi Admin karena pengguna pertama)
3. Klik **"Buat Akun"**
4. Redirect ke login — masuk dengan username & password tadi
5. Kamu sekarang sudah masuk sebagai **Admin**!

---

## 📖 CARA MENGGUNAKAN PLATFORM (Step by Step)

### Step 1: Tambah Organisasi
- Klik **"Organisasi"** di sidebar
- Klik **"Tambah Organisasi"**
- Isi: Nama, Sektor, Jumlah Karyawan, Tipe Sistem
- Klik **"Simpan"**

### Step 2: Tambah Aset
- Klik **"Inventaris Aset"** di sidebar
- Klik **"Tambah Aset"**
- Isi semua field termasuk CIA Value
- Klik **"Simpan Aset"**

### Step 3: Risk Assessment
- Klik **"Risk Assessment"** di sidebar
- Pilih Organisasi → Pilih Aset
- Centang kerentanan OWASP yang ditemukan/diduga
- Klik **"Jalankan Risk Assessment"**
- Lihat Risk Score dan Risk Matrix

### Step 4: Audit Checklist
- Klik **"Audit Checklist"** di sidebar
- Klik **"Buat Audit Baru"** → isi nama audit dan pilih organisasi
- Pilih audit dari dropdown
- Klik tab fungsi NIST (Identify, Protect, dll.)
- Update status setiap kontrol (Compliant/Non-Compliant/dll.)
- Upload bukti dengan tombol **"Bukti"**
- Klik **"Auto-Generate Findings"** untuk buat temuan otomatis

### Step 5: Compliance Score
- Klik **"Compliance"** di sidebar
- Pilih audit
- Lihat score keseluruhan dan per fungsi NIST

### Step 6: AI Assistant
- Klik **"AI Assistant"** di sidebar
- Pilih mode: Chat / Vulnerability Explainer / dll.
- Untuk explainer: pilih kerentanan dari dropdown
- Ketik pertanyaan → Enter → lihat jawaban AI

### Step 7: Export Laporan
- Klik **"Laporan"** di sidebar
- Pilih audit
- Klik **"Generate dengan AI"** untuk executive summary
- Klik **"Download PDF"** untuk download laporan lengkap

---

## 🔧 TROUBLESHOOTING

### ❌ "ModuleNotFoundError: No module named 'fastapi'"
**Solusi:** Virtual environment tidak aktif
```bash
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate
# Lalu coba lagi:
pip install -r requirements.txt
```

### ❌ "CORS Error" di browser
**Solusi:** Pastikan backend dan frontend berjalan bersamaan di port yang benar:
- Backend: http://localhost:8000
- Frontend: http://localhost:3000

### ❌ "GROQ_API_KEY belum dikonfigurasi"
**Solusi:** 
1. Cek file `.env` di folder backend
2. Pastikan `GROQ_API_KEY=gsk_xxxx` sudah diisi dengan benar
3. Restart server backend: `Ctrl+C` lalu `uvicorn main:app --reload`

### ❌ "Cannot connect to AI"
**Solusi:**
1. Cek koneksi internet
2. Cek API key Groq masih valid di https://console.groq.com
3. Groq gratis memiliki rate limit — tunggu beberapa detik dan coba lagi

### ❌ Frontend error "Network Error"
**Solusi:** Backend belum jalan. Pastikan `uvicorn main:app --reload` sudah dijalankan di terminal terpisah.

### ❌ "Login gagal" meski data benar
**Solusi:** Username case-sensitive. Pastikan username sama persis seperti saat register.

---

## 📁 STRUKTUR FILE PENTING

```
srm-audit-platform/
├── backend/
│   ├── .env                    ← KONFIGURASI (JANGAN share ke publik!)
│   ├── main.py                 ← Entry point server
│   ├── database.py             ← Semua model database
│   ├── seed_data.py            ← Data OWASP + NIST yang diisi otomatis
│   ├── schemas.py              ← Validasi data API
│   ├── srm_audit.db            ← Database SQLite (dibuat otomatis)
│   ├── uploads/                ← File bukti audit (dibuat otomatis)
│   └── routers/
│       ├── auth.py             ← Login & JWT
│       ├── organizations.py    ← Org & Asset
│       ├── risk.py             ← Risk engine
│       ├── audit.py            ← Checklist & evidence
│       ├── ai_assistant.py     ← Groq AI integration
│       └── reports.py          ← PDF generator
│
└── frontend/
    └── src/
        ├── App.jsx             ← Routing utama
        ├── contexts/
        │   └── AuthContext.jsx ← State management login
        ├── services/
        │   └── api.js          ← Semua pemanggilan API
        ├── components/
        │   ├── Sidebar.jsx     ← Navigasi
        │   └── RiskMatrix.jsx  ← Heatmap visualisasi
        └── pages/
            ├── Login.jsx / Register.jsx
            ├── Dashboard.jsx
            ├── Organizations.jsx
            ├── Assets.jsx
            ├── RiskAssessment.jsx
            ├── AuditChecklist.jsx
            ├── Compliance.jsx
            ├── AIAssistant.jsx
            └── Reports.jsx
```

---

## 🎓 MODULE MAPPING (Dokumen → Implementasi)

| Module | Fitur | File Backend | File Frontend |
|--------|-------|-------------|---------------|
| 1 | User & RBAC | `routers/auth.py` | `Login.jsx`, `Register.jsx` |
| 2 | Org Profile | `routers/organizations.py` | `Organizations.jsx` |
| 3 | Asset Inventory | `routers/organizations.py` | `Assets.jsx` |
| 4 | OWASP Vulnerability | `routers/risk.py` + `seed_data.py` | `RiskAssessment.jsx` |
| 5 | Risk Engine (L×I) | `routers/risk.py` | `RiskAssessment.jsx` + `RiskMatrix.jsx` |
| 6 | NIST CSF Checklist | `routers/audit.py` | `AuditChecklist.jsx` |
| 7 | Evidence Upload | `routers/audit.py` | `AuditChecklist.jsx` |
| 8 | Compliance Scoring | `routers/audit.py` | `Compliance.jsx` |
| 9 | Findings Generator | `routers/audit.py` | `AuditChecklist.jsx` |
| 10A | AI Audit Advisor | `routers/ai_assistant.py` | `AIAssistant.jsx` |
| 10B | AI Report Writer | `routers/ai_assistant.py` | `Reports.jsx` |
| 10C | AI Control Rec. | `routers/ai_assistant.py` | `AIAssistant.jsx` |
| 10D | AI Vuln Explainer | `routers/ai_assistant.py` | `AIAssistant.jsx` |
| 11 | PDF Report | `routers/reports.py` | `Reports.jsx` |

---

## 📊 DEMO FLOW UNTUK PRESENTASI

1. **Login** sebagai Admin
2. **Buat Organisasi**: "Universitas XYZ" · Pendidikan · 1500 karyawan · Web
3. **Tambah Aset**: "Student Information System" · IT Dept · Cloud · Application · C:High I:High A:High
4. **Risk Assessment**: Pilih aset → centang SQL Injection + Weak Password + No HTTPS → Jalankan
5. **Lihat Risk Matrix**: Visualisasi heatmap risiko
6. **Buat Audit**: "Audit Semester 1 2024" · organisasi yang sama
7. **Isi Checklist**: Update beberapa status di tab Protect
8. **Auto-Generate Findings**: Klik tombol → findings terbuat otomatis
9. **AI Chat**: Tanya "Jelaskan SQL Injection ke rektor universitas"
10. **Download PDF**: Export laporan lengkap

---

## 💡 TIPS TAMBAHAN

- **Database reset?** Hapus file `backend/srm_audit.db` dan restart server
- **Lihat API docs?** Buka http://localhost:8000/docs (Swagger UI)
- **Test API manual?** Gunakan Swagger UI atau install **Postman**
- **Upload file apa saja?** PDF, PNG, JPG, DOCX, XLSX, ZIP (max 10MB)

---

*SRM Audit Platform Group 4 © 2026 · NIST Cybersecurity Framework*

