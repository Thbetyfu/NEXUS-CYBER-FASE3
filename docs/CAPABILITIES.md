# 🛡️ Nexus Cyber Capabilities

Nexus Cyber SOC v13.2 dirancang untuk memitigasi spektrum ancaman berikut secara otonom:

## 1. Threat Prevention Grid

| Kategori Ancaman | Jenis Serangan | Mekanisme Pertahanan |
| :--- | :--- | :--- |
| **Web Application** | SQL Injection, XSS, SSRF, Command Injection | **NEX-AI Reflex Core** (Pattern Matching Engine, sub-1.2ms) |
| **Zero-Day & Obfuscated** | Double URL Encoding, Nested Base64, Unicode Normalization, SQL Hex, Parameter Pollution | **NEX-AI Cognitive Core** (`nex-ai-protect`, QLoRA Fine-tuned SLM) |
| **Infrastructure** | DDoS, Traffic Flooding, API Abuse | **Token Bucket Rate Limiting** |
| **Reconnaissance** | Port Scanning, IP Mapping, OS Fingerprinting | **MTD Shuffling** (Moving Target Defense) |
| **Reconnaissance & Access** | SSH Brute Force, SSH Port Probing | **SSH Tarpit & Auto-Banning** (Socket Starvation) |
| **Access Control** | Brute Force, Credential Stuffing, Broken Access Control | **Intelligent IP Throttling & Honeypots** |
| **Data Integrity** | Man-in-the-Middle (MitM), Packet Sniffing | **End-to-End PQC Encryption (ML-KEM)** |
| **Web Defacement** | Unauthorized modification/deletion of templates, Webshell uploads | **Autonomous Self-Repair & Rollback** |
| **Future Threats** | Quantum Decryption Attempts | **Post-Quantum Cryptography Layers** |
| **Threat Intelligence** | Global Attacker Anonymity | **AbuseIPDB Automated Reporting Integration** |

## 2. Deep Dive Mitigation Logic

### Web Defacement (Pengubahan Visual Web)
- **Mekanisme**: **System Integrity Monitor** secara berkala (2s) melakukan perbandingan hash SHA-256 berkas templat visual terhadap baseline steril di RAM. Jika terdeteksi modifikasi atau penghapusan berkas, sistem langsung memulihkannya (*Instant Rollback* <100ms) ke kondisi steril semula.
- **Hasil**: Halaman web peretas (seperti deface judi online) langsung diganti kembali ke kondisi semula secara instan tanpa memicu *downtime*.

### Webshell Upload (Unggahan Berkas Ilegal)
- **Mekanisme**: Melakukan pemindaian direktori templat visual yang dilindungi. Setiap berkas baru yang tidak terdaftar dalam baseline steril (untracked files) akan langsung dihapus oleh monitor siber.
- **Hasil**: Penyerang gagal menanamkan backdoor/webshell pada direktori server.

### SSH Port Probing (Trapping SSH Scanner)
- **Mekanisme**: **SSH Tarpit** mendengarkan koneksi pada port SSH standar `:22` (melalui Docker map `:2222`). Setelah mengirimkan banner OpenSSH palsu untuk mengelabui OS fingerprinting, modul akan mengirimkan data acak secara sangat lambat (tarpit starvation) ke klien peretas.
- **Hasil**: Klien penyerang membeku (freeze) selama berhari-hari karena menunggu negosiasi kunci selesai, menguras habis memori/sumber daya peretas, dan IP penyerang otomatis diblokir selama 24 jam.

### AbuseIPDB Integration (Pelaporan Ancaman Global)
- **Mekanisme**: Saat IP penyerang diblokir secara otomatis oleh Reflex/Reasoning AI atau terjebak dalam Honeypot/Tarpit, fungsi asinkron (Goroutine) akan mengirimkan laporan forensik ancaman langsung ke portal API AbuseIPDB.
- **Hasil**: Penyerang kehilangan anonimitasnya secara global karena reputasi IP mereka langsung jatuh di repositori intelijen ancaman siber internasional.

### Credential Stuffing (Penipuan Login Massal)
- **Mekanisme**: Menggunakan algoritma *Token Bucket*. Jika terdeteksi anomali frekuensi login dari satu IP/Fingerprint, sistem secara otomatis memutus sesi atau mengalihkan trafik ke **Honeypot**.
- **Hasil**: Penyerang terjebak dalam *Tarpit Delay* yang sangat lambat.

### SSRF (Server-Side Request Forgery)
- **Mekanisme**: **AI Shield (Reflex Layer)** memindai payload untuk mendeteksi upaya injeksi URL internal (seperti `localhost` atau IP metadata cloud).
- **Hasil**: Request berbahaya diblokir di layer gateway sebelum sempat diproses oleh server internal.

### AVSE (Autonomous Visual Sterilization Engine)
- **Mekanisme**: Membongkar dan merender ulang gambar (JPEG/PNG) untuk membuang metadata EXIF/GPS dan data biner tersembunyi (Steganografi).
- **Hasil**: Gambar tetap tajam namun 100% suci dari ancaman penyisipan data.

### NEX-AI Reflex Core (Otak Kiri - Kecepatan Instan)
- **Mekanisme**: Menggunakan pre-compiled Regex heuristik OWASP Top 10 yang diinisialisasi satu kali saat startup. Setiap request yang lewat diperiksa dalam waktu < 1.2ms. Pola serangan yang terdeteksi secara otomatis didaftarkan sebagai "Antibodi" di memori Redis untuk pemblokiran O(1) pada request berikutnya.
- **Cakupan**: SQLi klasik (UNION, SLEEP, Hex), XSS (script tag, javascript: protocol, event handler hijack), Path Traversal (LFI/RFI, Win.ini, /etc/passwd), dan deteksi alat penyerang otomatis (sqlmap, nikto, nmap, burp, OWASP ZAP, Acunetix).
- **Hasil**: 99% trafik berbahaya berhasignatur standar diblokir sebelum mencapai server backend, menghemat sumber daya komputasi secara masif.

### NEX-AI Cognitive Core / nex-ai-protect (Otak Kanan - Forensik Mendalam)
- **Mekanisme**: Model SLM (Small Language Model) kustom berbasis fine-tuning `Qwen2.5-3B-Instruct` dengan metode QLoRA 4-bit NF4. Dilatih khusus pada 2.000 sampel dataset siber yang mencakup teknik obfuskasi zero-day yang tidak dapat dideteksi oleh pola Regex biasa. Dijalankan secara asinkron (goroutine) dengan timeout 30 detik agar tidak mempengaruhi latensi gateway.
- **Cakupan Khusus**: Double URL Encoding, Nested Base64 wrapping, Unicode Normalization attacks, HTTP Parameter Pollution, SQL Hex encoding, serta payload berbahaya yang disembunyikan dalam struktur JSON/XML/JWT yang tampak sah.
- **Output**: JSON deterministik `{status, threat_score, attack_type, reason}` tanpa teks pembuka/penutup (anti-halusinasi).
- **Hasil**: Deteksi serangan APT dan Zero-Day bypass yang sama sekali lolos dari lapisan Reflex, dengan aksi otomatis: Ban IP 24 jam + OS-level block (iptables) + vaksinasi Antibodi baru ke Reflex Layer.
