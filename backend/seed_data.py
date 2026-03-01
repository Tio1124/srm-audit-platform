"""
seed_data.py — Data awal yang diisi ke database saat startup
Berisi: 19 OWASP vulnerabilities + NIST CSF controls + default admin user
"""

OWASP_VULNERABILITIES = [
    # ── INJECTION ──────────────────────────────────────────
    {
        "name": "SQL Injection",
        "category": "Injection",
        "description": "Penyerang menyisipkan perintah SQL berbahaya ke dalam input aplikasi untuk memanipulasi database.",
        "default_likelihood": 4,
        "default_impact": 5,
        "default_impact_description": "Pencurian seluruh database, modifikasi data, atau penghapusan data",
        "owasp_reference": "A03:2021",
        "related_nist_control": "PR.AC-3, PR.DS-1, DE.CM-7"
    },
    {
        "name": "Command Injection",
        "category": "Injection",
        "description": "Penyerang mengeksekusi perintah sistem operasi melalui input aplikasi yang tidak divalidasi.",
        "default_likelihood": 3,
        "default_impact": 5,
        "default_impact_description": "Kendali penuh atas server host",
        "owasp_reference": "A03:2021",
        "related_nist_control": "PR.AC-3, PR.PT-3"
    },
    {
        "name": "LDAP Injection",
        "category": "Injection",
        "description": "Manipulasi query LDAP untuk bypass autentikasi atau mendapatkan akses tidak sah ke direktori.",
        "default_likelihood": 2,
        "default_impact": 4,
        "default_impact_description": "Bypass autentikasi, akses data direktori pengguna",
        "owasp_reference": "A03:2021",
        "related_nist_control": "PR.AC-1, PR.AC-3"
    },
    # ── BROKEN AUTHENTICATION ────────────────────────────
    {
        "name": "Weak Password Policy",
        "category": "Broken Authentication",
        "description": "Sistem tidak memaksa penggunaan password yang kuat, memudahkan serangan brute force.",
        "default_likelihood": 5,
        "default_impact": 4,
        "default_impact_description": "Pengambilalihan akun pengguna",
        "owasp_reference": "A07:2021",
        "related_nist_control": "PR.AC-1, PR.AC-7"
    },
    {
        "name": "No Account Lockout",
        "category": "Broken Authentication",
        "description": "Sistem tidak mengunci akun setelah sejumlah percobaan login gagal, memungkinkan brute force.",
        "default_likelihood": 4,
        "default_impact": 4,
        "default_impact_description": "Serangan brute force berhasil masuk ke akun",
        "owasp_reference": "A07:2021",
        "related_nist_control": "PR.AC-1, PR.AC-7"
    },
    {
        "name": "Session Hijacking",
        "category": "Broken Authentication",
        "description": "Token sesi yang lemah atau tidak aman memungkinkan penyerang mengambil alih sesi aktif pengguna.",
        "default_likelihood": 3,
        "default_impact": 4,
        "default_impact_description": "Pengambilalihan sesi pengguna yang sedang aktif",
        "owasp_reference": "A07:2021",
        "related_nist_control": "PR.AC-3, PR.DS-2"
    },
    # ── SENSITIVE DATA EXPOSURE ──────────────────────────
    {
        "name": "No HTTPS / TLS",
        "category": "Sensitive Data Exposure",
        "description": "Data dikirim tanpa enkripsi, memungkinkan penyerang menyadap komunikasi (Man-in-the-Middle).",
        "default_likelihood": 4,
        "default_impact": 4,
        "default_impact_description": "Penyadapan data sensitif pengguna dalam transit",
        "owasp_reference": "A02:2021",
        "related_nist_control": "PR.DS-2, PR.DS-5"
    },
    {
        "name": "Weak Encryption",
        "category": "Sensitive Data Exposure",
        "description": "Data sensitif dienkripsi menggunakan algoritma yang lemah atau kunci yang mudah ditebak.",
        "default_likelihood": 3,
        "default_impact": 4,
        "default_impact_description": "Dekripsi data rahasia oleh pihak tidak berwenang",
        "owasp_reference": "A02:2021",
        "related_nist_control": "PR.DS-1, PR.DS-2"
    },
    {
        "name": "Exposed Database Backup",
        "category": "Sensitive Data Exposure",
        "description": "File backup database dapat diakses publik melalui URL yang dapat ditebak.",
        "default_likelihood": 3,
        "default_impact": 5,
        "default_impact_description": "Eksposur seluruh data historis organisasi",
        "owasp_reference": "A02:2021",
        "related_nist_control": "PR.DS-1, PR.DS-5"
    },
    # ── ACCESS CONTROL FAILURES ──────────────────────────
    {
        "name": "IDOR (Insecure Direct Object Reference)",
        "category": "Access Control Failures",
        "description": "Pengguna dapat mengakses data milik pengguna lain hanya dengan mengubah ID di URL.",
        "default_likelihood": 4,
        "default_impact": 4,
        "default_impact_description": "Akses tidak sah ke data pengguna lain",
        "owasp_reference": "A01:2021",
        "related_nist_control": "PR.AC-3, PR.AC-4"
    },
    {
        "name": "Privilege Escalation",
        "category": "Access Control Failures",
        "description": "Pengguna biasa dapat meningkatkan hak aksesnya ke level admin tanpa otorisasi.",
        "default_likelihood": 3,
        "default_impact": 5,
        "default_impact_description": "Kendali penuh atas sistem oleh pengguna tidak berhak",
        "owasp_reference": "A01:2021",
        "related_nist_control": "PR.AC-4, PR.AC-6"
    },
    # ── SECURITY MISCONFIGURATION ────────────────────────
    {
        "name": "Default Credentials",
        "category": "Security Misconfiguration",
        "description": "Sistem masih menggunakan username/password default pabrik yang diketahui publik.",
        "default_likelihood": 4,
        "default_impact": 5,
        "default_impact_description": "Akses penuh ke sistem administrasi",
        "owasp_reference": "A05:2021",
        "related_nist_control": "PR.AC-1, PR.IP-1"
    },
    {
        "name": "Directory Listing Enabled",
        "category": "Security Misconfiguration",
        "description": "Server web menampilkan daftar file dalam direktori, mengekspos struktur dan file sensitif.",
        "default_likelihood": 3,
        "default_impact": 3,
        "default_impact_description": "Eksposur struktur file dan dokumen internal",
        "owasp_reference": "A05:2021",
        "related_nist_control": "PR.AC-3, PR.DS-5"
    },
    {
        "name": "Exposed Admin Panel",
        "category": "Security Misconfiguration",
        "description": "Panel administrasi dapat diakses langsung dari internet tanpa pembatasan IP.",
        "default_likelihood": 4,
        "default_impact": 5,
        "default_impact_description": "Serangan langsung ke antarmuka administrasi sistem",
        "owasp_reference": "A05:2021",
        "related_nist_control": "PR.AC-3, PR.PT-3"
    },
    {
        "name": "Open Unnecessary Ports",
        "category": "Security Misconfiguration",
        "description": "Port jaringan yang tidak diperlukan dibiarkan terbuka, memperluas permukaan serangan.",
        "default_likelihood": 3,
        "default_impact": 3,
        "default_impact_description": "Titik masuk tambahan bagi penyerang",
        "owasp_reference": "A05:2021",
        "related_nist_control": "PR.AC-3, PR.PT-3, DE.CM-1"
    },
    # ── CROSS-SITE ATTACKS ───────────────────────────────
    {
        "name": "Cross-Site Scripting (XSS)",
        "category": "Cross-Site Attacks",
        "description": "Penyerang menyisipkan skrip berbahaya yang dieksekusi di browser korban.",
        "default_likelihood": 4,
        "default_impact": 3,
        "default_impact_description": "Pencurian cookie, session hijacking, defacement",
        "owasp_reference": "A03:2021",
        "related_nist_control": "PR.AC-3, DE.CM-7"
    },
    {
        "name": "Cross-Site Request Forgery (CSRF)",
        "category": "Cross-Site Attacks",
        "description": "Penyerang memaksa browser korban melakukan aksi tidak diinginkan di situs yang sedang login.",
        "default_likelihood": 3,
        "default_impact": 3,
        "default_impact_description": "Transaksi tidak sah atas nama pengguna korban",
        "owasp_reference": "A01:2021",
        "related_nist_control": "PR.AC-3, PR.DS-2"
    },
    # ── LOGGING & MONITORING ─────────────────────────────
    {
        "name": "No Audit Logs",
        "category": "Logging & Monitoring Failure",
        "description": "Sistem tidak mencatat aktivitas pengguna, sehingga insiden tidak dapat dideteksi atau diinvestigasi.",
        "default_likelihood": 5,
        "default_impact": 3,
        "default_impact_description": "Insiden keamanan tidak terdeteksi, investigasi tidak mungkin",
        "owasp_reference": "A09:2021",
        "related_nist_control": "DE.AE-3, DE.CM-1, RS.AN-1"
    },
    # ── DEPENDENCY ISSUES ────────────────────────────────
    {
        "name": "Outdated Server Software",
        "category": "Dependency & Software Issues",
        "description": "Server menjalankan software dengan versi lama yang memiliki kerentanan yang sudah diketahui publik.",
        "default_likelihood": 4,
        "default_impact": 4,
        "default_impact_description": "Eksploitasi remote melalui CVE yang sudah terdokumentasi",
        "owasp_reference": "A06:2021",
        "related_nist_control": "PR.IP-12, DE.CM-8"
    },
]

# NIST CSF Controls — 5 fungsi dengan control-control utama
NIST_CSF_CONTROLS = [
    # ════════════════════════════════════════════
    # FUNCTION 1: IDENTIFY (ID)
    # ════════════════════════════════════════════
    {
        "function": "Identify",
        "category": "Asset Management",
        "control_id": "ID.AM-1",
        "control_name": "Physical devices and systems are inventoried",
        "description": "Inventaris perangkat fisik dan sistem dalam organisasi dikelola.",
        "audit_question": "Apakah organisasi memiliki inventaris lengkap semua perangkat fisik dan sistem yang dikelola?",
        "evidence_required": "Dokumen inventaris aset, spreadsheet manajemen aset, atau output dari CMDB"
    },
    {
        "function": "Identify",
        "category": "Asset Management",
        "control_id": "ID.AM-2",
        "control_name": "Software platforms and applications are inventoried",
        "description": "Inventaris platform software dan aplikasi dalam organisasi dikelola.",
        "audit_question": "Apakah terdapat inventaris software yang berjalan di seluruh sistem organisasi?",
        "evidence_required": "Daftar software yang terinstal, lisensi software, output vulnerability scanner"
    },
    {
        "function": "Identify",
        "category": "Business Environment",
        "control_id": "ID.BE-1",
        "control_name": "Organization's role in the supply chain is identified",
        "description": "Peran organisasi dalam rantai pasokan diidentifikasi dan dikomunikasikan.",
        "audit_question": "Apakah organisasi telah mengidentifikasi ketergantungan pada pihak ketiga/vendor kritis?",
        "evidence_required": "Daftar vendor, kontrak pihak ketiga, penilaian risiko vendor"
    },
    {
        "function": "Identify",
        "category": "Risk Assessment",
        "control_id": "ID.RA-1",
        "control_name": "Asset vulnerabilities are identified and documented",
        "description": "Kerentanan aset diidentifikasi dan didokumentasikan.",
        "audit_question": "Apakah organisasi melakukan vulnerability assessment secara berkala?",
        "evidence_required": "Laporan vulnerability scan, jadwal scanning, dokumentasi remediasi"
    },
    {
        "function": "Identify",
        "category": "Risk Assessment",
        "control_id": "ID.RA-5",
        "control_name": "Threats, vulnerabilities, likelihoods, and impacts are used to determine risk",
        "description": "Ancaman, kerentanan, kemungkinan, dan dampak digunakan untuk menentukan risiko.",
        "audit_question": "Apakah organisasi memiliki proses formal penilaian risiko keamanan informasi?",
        "evidence_required": "Dokumen risk assessment, risk register, matriks risiko"
    },
    {
        "function": "Identify",
        "category": "Governance",
        "control_id": "ID.GV-1",
        "control_name": "Organizational cybersecurity policy is established",
        "description": "Kebijakan keamanan siber organisasi ditetapkan dan dikomunikasikan.",
        "audit_question": "Apakah organisasi memiliki kebijakan keamanan informasi yang tertulis dan terkini?",
        "evidence_required": "Dokumen kebijakan keamanan, bukti sosialisasi, tanda tangan persetujuan"
    },

    # ════════════════════════════════════════════
    # FUNCTION 2: PROTECT (PR)
    # ════════════════════════════════════════════
    {
        "function": "Protect",
        "category": "Access Control",
        "control_id": "PR.AC-1",
        "control_name": "Identities and credentials are managed for authorized devices and users",
        "description": "Identitas dan kredensial dikelola untuk perangkat dan pengguna yang berwenang.",
        "audit_question": "Apakah organisasi memiliki kebijakan password yang memaksa kompleksitas minimum (8+ karakter, kombinasi huruf/angka/simbol)?",
        "evidence_required": "Screenshot konfigurasi password policy, Group Policy Output, atau konfigurasi IAM"
    },
    {
        "function": "Protect",
        "category": "Access Control",
        "control_id": "PR.AC-3",
        "control_name": "Remote access is managed",
        "description": "Akses jarak jauh dikelola dengan kontrol yang memadai.",
        "audit_question": "Apakah akses remote ke sistem menggunakan VPN dan MFA (Multi-Factor Authentication)?",
        "evidence_required": "Konfigurasi VPN, setup MFA, log akses remote"
    },
    {
        "function": "Protect",
        "category": "Access Control",
        "control_id": "PR.AC-4",
        "control_name": "Access permissions and authorizations are managed",
        "description": "Izin dan otorisasi akses dikelola sesuai prinsip least privilege.",
        "audit_question": "Apakah akses diberikan berdasarkan prinsip least privilege (hak minimum yang diperlukan)?",
        "evidence_required": "Matriks akses, review akun user, konfigurasi role-based access control"
    },
    {
        "function": "Protect",
        "category": "Awareness and Training",
        "control_id": "PR.AT-1",
        "control_name": "All users are informed and trained",
        "description": "Semua pengguna mendapat informasi dan pelatihan keamanan siber.",
        "audit_question": "Apakah organisasi melakukan pelatihan awareness keamanan siber secara berkala untuk semua staf?",
        "evidence_required": "Jadwal pelatihan, daftar hadir, materi training, sertifikat penyelesaian"
    },
    {
        "function": "Protect",
        "category": "Data Security",
        "control_id": "PR.DS-1",
        "control_name": "Data-at-rest is protected",
        "description": "Data yang disimpan dilindungi dengan enkripsi yang memadai.",
        "audit_question": "Apakah data sensitif yang disimpan (database, file server) dienkripsi?",
        "evidence_required": "Konfigurasi enkripsi database, kebijakan enkripsi data, audit tool output"
    },
    {
        "function": "Protect",
        "category": "Data Security",
        "control_id": "PR.DS-2",
        "control_name": "Data-in-transit is protected",
        "description": "Data yang dikirim melalui jaringan dilindungi dengan enkripsi.",
        "audit_question": "Apakah semua komunikasi web menggunakan HTTPS dengan sertifikat TLS yang valid?",
        "evidence_required": "Screenshot sertifikat SSL/TLS, output SSL scanner, konfigurasi web server"
    },
    {
        "function": "Protect",
        "category": "Information Protection",
        "control_id": "PR.IP-1",
        "control_name": "A baseline configuration is established and maintained",
        "description": "Konfigurasi dasar sistem dibuat dan dikelola untuk IT/OT/ICS.",
        "audit_question": "Apakah organisasi memiliki baseline konfigurasi keamanan untuk semua sistem dan menggunakan hardening standard (misal CIS Benchmark)?",
        "evidence_required": "Dokumen hardening guide, konfigurasi server, hasil compliance scan"
    },
    {
        "function": "Protect",
        "category": "Information Protection",
        "control_id": "PR.IP-4",
        "control_name": "Backups are conducted, maintained, and tested",
        "description": "Backup dilakukan, dipelihara, dan diuji secara berkala.",
        "audit_question": "Apakah backup data dilakukan secara otomatis dan diuji pemulihan (restore test) secara berkala?",
        "evidence_required": "Log backup, jadwal backup, hasil uji restore, kebijakan backup"
    },
    {
        "function": "Protect",
        "category": "Information Protection",
        "control_id": "PR.IP-12",
        "control_name": "A vulnerability management plan is developed and implemented",
        "description": "Rencana manajemen kerentanan dikembangkan dan diimplementasikan.",
        "audit_question": "Apakah organisasi memiliki proses patch management yang terdefinisi dengan SLA untuk patching kritis?",
        "evidence_required": "Kebijakan patch management, log patching, laporan vulnerability management"
    },
    {
        "function": "Protect",
        "category": "Protective Technology",
        "control_id": "PR.PT-3",
        "control_name": "Principle of least functionality is applied",
        "description": "Prinsip least functionality diterapkan — hanya layanan yang diperlukan yang aktif.",
        "audit_question": "Apakah port, protokol, dan layanan yang tidak diperlukan telah dinonaktifkan di semua sistem?",
        "evidence_required": "Output network scan (nmap), konfigurasi firewall, prosedur hardening"
    },

    # ════════════════════════════════════════════
    # FUNCTION 3: DETECT (DE)
    # ════════════════════════════════════════════
    {
        "function": "Detect",
        "category": "Anomalies and Events",
        "control_id": "DE.AE-1",
        "control_name": "A baseline of network operations is established",
        "description": "Baseline operasi dan aliran data jaringan ditetapkan dan dikelola.",
        "audit_question": "Apakah organisasi memiliki baseline traffic jaringan normal sehingga anomali dapat diidentifikasi?",
        "evidence_required": "Dokumentasi baseline jaringan, konfigurasi network monitoring, laporan traffic baseline"
    },
    {
        "function": "Detect",
        "category": "Anomalies and Events",
        "control_id": "DE.AE-3",
        "control_name": "Event data are collected and correlated",
        "description": "Data event dikumpulkan dan dikorelasikan dari berbagai sumber.",
        "audit_question": "Apakah sistem SIEM atau log management digunakan untuk mengumpulkan dan menganalisis log dari semua sistem kritis?",
        "evidence_required": "Konfigurasi SIEM, contoh dashboard log, kebijakan log retention"
    },
    {
        "function": "Detect",
        "category": "Security Continuous Monitoring",
        "control_id": "DE.CM-1",
        "control_name": "The network is monitored to detect potential cybersecurity events",
        "description": "Jaringan dipantau untuk mendeteksi potensi insiden keamanan siber.",
        "audit_question": "Apakah terdapat IDS/IPS atau sistem monitoring jaringan yang aktif memantau traffic?",
        "evidence_required": "Konfigurasi IDS/IPS, dashboard monitoring, alert rules, log aktivitas"
    },
    {
        "function": "Detect",
        "category": "Security Continuous Monitoring",
        "control_id": "DE.CM-7",
        "control_name": "Monitoring for unauthorized personnel, connections, devices, and software",
        "description": "Pemantauan dilakukan terhadap personel, koneksi, perangkat, dan software tidak sah.",
        "audit_question": "Apakah organisasi memiliki sistem untuk mendeteksi perangkat atau software yang tidak diotorisasi di jaringan?",
        "evidence_required": "Laporan network discovery, konfigurasi NAC, alert unauthorized device"
    },
    {
        "function": "Detect",
        "category": "Security Continuous Monitoring",
        "control_id": "DE.CM-8",
        "control_name": "Vulnerability scans are performed",
        "description": "Pemindaian kerentanan dilakukan secara berkala.",
        "audit_question": "Apakah vulnerability scanning dilakukan secara terjadwal (minimal bulanan) dan hasilnya ditindaklanjuti?",
        "evidence_required": "Laporan vulnerability scan, jadwal scanning, tiket remediasi"
    },

    # ════════════════════════════════════════════
    # FUNCTION 4: RESPOND (RS)
    # ════════════════════════════════════════════
    {
        "function": "Respond",
        "category": "Response Planning",
        "control_id": "RS.RP-1",
        "control_name": "Response plan is executed during or after an incident",
        "description": "Rencana respons dieksekusi selama atau setelah insiden.",
        "audit_question": "Apakah organisasi memiliki Incident Response Plan (IRP) yang terdokumentasi dan telah diuji?",
        "evidence_required": "Dokumen IRP, laporan drill/simulasi insiden, bukti uji tabletop exercise"
    },
    {
        "function": "Respond",
        "category": "Communications",
        "control_id": "RS.CO-2",
        "control_name": "Incidents are reported consistent with established criteria",
        "description": "Insiden dilaporkan sesuai dengan kriteria yang telah ditetapkan.",
        "audit_question": "Apakah terdapat prosedur dan jalur eskalasi yang jelas untuk pelaporan insiden keamanan?",
        "evidence_required": "Prosedur pelaporan insiden, contact list, contoh laporan insiden sebelumnya"
    },
    {
        "function": "Respond",
        "category": "Analysis",
        "control_id": "RS.AN-1",
        "control_name": "Notifications from detection systems are investigated",
        "description": "Notifikasi dari sistem deteksi diselidiki.",
        "audit_question": "Apakah terdapat tim atau personel yang bertanggung jawab menginvestigasi alert keamanan dan insiden?",
        "evidence_required": "RACI chart tim respons, ticket insiden yang diselesaikan, log investigasi"
    },
    {
        "function": "Respond",
        "category": "Mitigation",
        "control_id": "RS.MI-1",
        "control_name": "Incidents are contained",
        "description": "Insiden dikontain untuk mencegah penyebaran lebih lanjut.",
        "audit_question": "Apakah prosedur containment (isolasi sistem yang terinfeksi) terdefinisi dalam IRP?",
        "evidence_required": "Prosedur containment, panduan isolasi sistem, runbook respons insiden"
    },

    # ════════════════════════════════════════════
    # FUNCTION 5: RECOVER (RC)
    # ════════════════════════════════════════════
    {
        "function": "Recover",
        "category": "Recovery Planning",
        "control_id": "RC.RP-1",
        "control_name": "Recovery plan is executed during or after an incident",
        "description": "Rencana pemulihan dieksekusi selama atau setelah insiden.",
        "audit_question": "Apakah organisasi memiliki Business Continuity Plan (BCP) dan Disaster Recovery Plan (DRP) yang terdokumentasi?",
        "evidence_required": "Dokumen BCP/DRP, hasil DR test/drill, RTO dan RPO yang terdefinisi"
    },
    {
        "function": "Recover",
        "category": "Recovery Planning",
        "control_id": "RC.RP-2",
        "control_name": "Recovery plan is updated",
        "description": "Rencana pemulihan diperbarui berdasarkan pembelajaran dari insiden.",
        "audit_question": "Apakah BCP/DRP direvisi secara berkala (minimal tahunan) atau setelah setiap insiden besar?",
        "evidence_required": "Version history dokumen BCP/DRP, bukti review tahunan, changelog"
    },
    {
        "function": "Recover",
        "category": "Communications",
        "control_id": "RC.CO-3",
        "control_name": "Recovery activities are communicated to internal and external stakeholders",
        "description": "Aktivitas pemulihan dikomunikasikan kepada stakeholder internal dan eksternal.",
        "audit_question": "Apakah terdapat prosedur komunikasi kepada pelanggan dan stakeholder jika terjadi downtime akibat insiden?",
        "evidence_required": "Template komunikasi krisis, prosedur notifikasi pelanggan, contoh komunikasi insiden"
    },
]
