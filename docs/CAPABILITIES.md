# 🛡️ Nexus Cyber Capabilities

Nexus Cyber SOC v13.2 dirancang untuk memitigasi spektrum ancaman dan melakukan validasi keamanan siber secara otonom melalui sinergi **Blue Team (NEX-AI)** dan **Red Team (NEX-RED)**:

## 1. Threat Prevention & Validation Grid

| Kategori | Komponen / Serangan | Mekanisme Pertahanan & Validasi |
| :--- | :--- | :--- |
| **Web Application** | SQL Injection, XSS, SSRF, Command Injection | **NEX-AI Reflex Core** (Pattern Matching Engine, sub-1.2ms) |
| **Zero-Day & Obfuscated** | Double URL Encoding, Nested Base64, Unicode Normalization | **NEX-AI Cognitive Core** (`nex-ai-protect`, QLoRA Fine-tuned SLM) |
| **Offensive Validation** | White-box Python AST + Go/JS/PHP patterns | **NEX-RED Whitebox Agent** (static evidence, optional LLM verify) |
| **Live Posture** | Header/recon + benign JSON probes | **NEX-RED Blackbox Agent** (reachability & defensive 403s) |
| **Infrastructure** | DDoS, Traffic Flooding, API Abuse | **Token Bucket Rate Limiting & eBPF Kernel Drops** |
| **Reconnaissance** | Port Scanning, IP Mapping, OS Fingerprinting | **MTD Shuffling** (Moving Target Defense) |
| **Reconnaissance & Access** | SSH Brute Force, SSH Port Probing | **SSH Tarpit & Auto-Banning** (Socket Starvation) |
| **Access Control** | Brute Force, Credential Stuffing | **Intelligent IP Throttling & Honeypots** |
| **Data Integrity** | Man-in-the-Middle (MitM), Packet Sniffing | **End-to-End PQC Encryption (ML-KEM)** |
| **Web Defacement** | Unauthorized modification of templates, Webshell | **Autonomous Self-Repair & Rollback** |
| **Threat Intelligence** | Global Attacker Anonymity | **AbuseIPDB & STIX/TAXII BSSN Feed Sync** |

## 2. Deep Dive NEX-RED Offensive Validation (Red Team)

### White-Box Python AST & Static Patterns
- **Mekanisme**: NEX-RED v4 mem-parse Python dengan AST CPython (SQL dinamis, eval, command, pickle/YAML, secret). Go/JS/PHP memakai pattern konservatif. LLM opsional hanya mengonfirmasi temuan dan saran perbaikan.
- **Hasil**: Temuan ber-evidence (file:line). Bukan taint tracking penuh multi-bahasa, dan bukan jaminan 0% false positive.

### Live Posture (bukan swarm pentest)
- **Mekanisme**: Recon header/link plus probe JSON jinak ke target hidup untuk melihat apakah edge menjawab 403.
- **Hasil**: Postur terukur. Belum setara Shannon/Strix (tidak ada proof-by-exploitation).

## 3. Deep Dive Mitigation Logic (Blue Team)

### Web Defacement (Pengubahan Visual Web)
- **Mekanisme**: **System Integrity Monitor** secara berkala melakukan perbandingan hash SHA-256 berkas templat visual terhadap baseline steril di RAM. Jika terdeteksi modifikasi atau penghapusan berkas, sistem langsung memulihkannya (*Instant Rollback* <100ms) ke kondisi steril semula.

### Webshell Upload (Unggahan Berkas Ilegal)
- **Mekanisme**: Melakukan pemindaian direktori templat visual yang dilindungi. Setiap berkas baru yang tidak terdaftar dalam baseline steril (untracked files) akan langsung dihapus oleh monitor siber.

### SSH Port Probing (Trapping SSH Scanner)
- **Mekanisme**: **SSH Tarpit** mendengarkan koneksi pada port SSH standar `:22` (melalui Docker map `:2222`). Modul mengirimkan data acak secara sangat lambat (tarpit starvation) ke klien peretas.

### AbuseIPDB Integration (Pelaporan Ancaman Global)
- **Mekanisme**: Saat IP penyerang diblokir secara otomatis oleh Reflex/Reasoning AI atau terjebak dalam Honeypot/Tarpit, fungsi asinkron (Goroutine) mengirimkan laporan forensik ancaman langsung ke portal API AbuseIPDB.

### NEX-AI Reflex Core (Otak Kiri - Kecepatan Instan)
- **Mekanisme**: Menggunakan pre-compiled Regex heuristik OWASP Top 10 yang dieksekusi dalam waktu < 1.2ms. Pola serangan yang terdeteksi didaftarkan sebagai "Antibodi" di memori Redis.

### NEX-AI Cognitive Core / nex-ai-protect (Otak Kanan - Forensik Mendalam)
- **Mekanisme**: Model SLM kustom berbasis fine-tuning `Qwen2.5-3B-Instruct` dengan metode QLoRA 4-bit NF4. Dijalankan secara asinkron (goroutine) dengan timeout 30 detik untuk mendeteksi serangan terobfuskasi tingkat tinggi.
