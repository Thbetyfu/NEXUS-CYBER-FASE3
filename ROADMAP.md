# Nexus Cyber Strategic Roadmap & Sprint Plan

Status Proyek: **Sprint 1, 2, & 3 Completed** - Active Development
Versi: **v3.2.0**
Arsitek: Antigravity

---

## 🛠️ Rekam Jejak Milestone Proyek (Global Roadmap)

### Milestone 1: Initiation of Skills & Knowledge Base (COMPLETED) ✅
- [x] Inisiasi Core Directives (`NEXUS_CORE_DIRECTIVES.md`).
- [x] Konfigurasi `.agents/skills/` (5 Skill Inti).

### Milestone 2: Roadmap & Architecture Scaffolding (COMPLETED) ✅
- [x] Ekspansi Roadmap detail (M3 - M10).
- [x] Tech Stack Specification (Go, Next.js, Docker, Ollama).
- [x] Directory Scaffolding (`ARCHITECTURE.md`).
- [x] Otomatisasi Boilerplate (`setup.sh`).

### Milestone 3: Core Gateway & Proxy Implementation (COMPLETED) ✅
- [x] Inisiasi Repository **nexus-core-gateway** (Go).
- [x] Implementasi Reverse Proxy Layer (HTTP/TCP).
- [x] Integrasi Logging & Observability (Structured JSON Logs).

### Milestone 4: Dual-Brain AI Filter (Qwen & NEX-AI) (COMPLETED) ✅
- [x] Integrasi Reflex Layer (Qwen) via Local Inference (Ollama).
- [x] Integrasi Reasoning Layer (NEX-AI) untuk Analisis Niat (Nechat).
- [x] Implementasi AI Orchestrator (Ensemble Logic) v2.5.

### Milestone 5: Moving Target Defense (MTD) Layer (COMPLETED) ✅
- [x] Implementasi Dynamic Port-Knocking / IP Shuffling (`mtd_shuffler.go`).
- [x] Konfigurasi Target Randomization Scheduler.
- [x] Integrasi MTD Control via Admin Dashboard.

### Milestone 6: Post-Quantum Cryptography (PQC) Integration (COMPLETED) ✅
- [x] Integrasi Pustaka NIST ML-KEM (Kyber-768).
- [x] Implementasi PQC-Wrapper pada jalur data sensitif.
- [x] Pengujian "Harvest Now, Decrypt Later" Resilience.

### Milestone 7: Admin Command Center (Next.js Dashboard) (COMPLETED) ✅
- [x] Inisiasi **nexus-admin-dashboard** (Next.js + Tailwind).
- [x] Dashboard Visualisasi Real-time (Anomalies, MTD Status).
- [x] Integrasi API Gateway Control Plane.
- [x] **MVP Upgrade**: Premium Boot Sequence & Windowing System.

### Milestone 8: Autonomous Self-Repair & Rollback (COMPLETED) ✅
- [x] Implementasi System Integrity Monitor (Baseline check).
- [x] Scripting Virtual Patching Otonom (Recursive Self-Repair Skill).
- [x] Mekanisme Rollback Instan (< 100ms) & Anti-Webshell.

### Milestone 9: Digital Hallucination (Honeypot Sandbox) (COMPLETED) ✅
- [x] Implementasi High-Interaction Honeypot (Port 9090).
- [x] Mekanisme pengalihan trafik mencurigakan ke Sandbox.
- [x] Analisis perilaku penyerang di dalam Hallucination Layer.

### Milestone 10: Integration, Stress Test & Production (COMPLETED) ✅
- [x] Inisiasi **Nexus Core CLI** (`nexus` binary) untuk orkestrasi profesional.
- [x] Push ke GitHub Repository (Version Control Sync).
- [x] End-to-End Stress Test (Simulasi Serangan DDoS & Injeksi) -> 17/17 Checks Lulus.
- [x] Cloud Deployment Sandbox (Local Tunnel & Network Hardening).
- [x] Final Handover Dokumentasi Operasional.

### Milestone 11: Commercialization & Dual-Engine Business Model (COMPLETED) ✅
*Strategi komersialisasi pertahanan siber otonom untuk monetisasi pasar.*
- [x] Integrasi rute dynamic proxy multi-tenant untuk penyaringan bersama (*Shared Cloud WAF*).
- [x] Enkripsi otomatis *Polymorphic HTML Encryption (PACS)* on-the-fly untuk response HTML.
- [x] Otomatisasi webhook billing (Midtrans) terhubung ke gateway auto-activation.
- [x] Penyediaan 5 paket langganan (Free, Basic, Pro, Pro+, Ultrasafe) di dashboard dan landing page.
- [x] Mekanisme *Lapis 2 Domain Validation* (`.sch.id`, `.ac.id`, `.go.id`) untuk mencegah penyalahgunaan oleh pihak swasta.
- [x] Modul bypass pembayaran online (B2G manual activation via Admin Command Center setelah PO/LKPP terbit).
- [x] Skema Lisensi Software-Only Tahunan per CPU Core untuk penempatan on-premise/hybrid data center vital.

### Milestone 12: IP Monitoring & Autonomous Ban Grid (COMPLETED) ✅
*Pemantauan lalu lintas IP secara real-time dan orkestrasi pemblokiran aktif di tingkat aplikasi dan kernel.*
- [x] **Modul Pemantauan IP (Live Traffic & Activity Tracker)**: Visualisasi tabel aktivitas real-time dengan Heuristic Threat Score.
- [x] **Fitur Banned Manual (Manual Banning Console)**: Panel kendali manual untuk operator SOC dengan pilihan durasi (1 jam, 24 jam, 7 hari, permanen), input alasan, dan **double confirmation** sebelum eksekusi.
- [x] **Fitur Auto-Banned AI (AI Autonomous Ban)**: Pemblokiran otomatis 24 jam jika Reflex Layer mendeteksi ancaman > 85 dan Reasoning Layer memvalidasi dengan tingkat keyakinan > 90%.
- [x] **Multi-Layer Lockout**: Integrasi pemblokiran di tingkat Aplikasi (Redis Blacklist / HTTP 403) dan Driver/Kernel (eBPF map `XDP_DROP` / 0% CPU overhead).

### Milestone 13: NEX-AI Custom Model & Branding Eksklusif (COMPLETED) ✅
*Membangun model kecerdasan buatan siber milik sendiri yang eksklusif dan tidak dapat ditiru kompetitor.*
- [x] **Adversarial Dataset Enrichment (2.000 Sampel)**: Pengayaan dataset latih dengan 5 teknik obfuskasi serangan zero-day dan 4 jenis trafik benign kompleks.
- [x] **Pipeline Pelatihan QLoRA 4-bit NF4**: Fine-tuning model dasar `Qwen2.5-3B-Instruct` menggunakan metode QLoRA.
- [x] **Otomasi Penggabungan LoRA (Auto-Merge Pipeline)**: Menambahkan fase `peft_model.merge_and_unload()` otomatis.
- [x] **Ekspor GGUF & Kuantisasi Q4_K_M**: Kuantisasi model ke GGUF `Q4_K_M` (1.84 GB).
- [x] **Registrasi Model Eksklusif di Ollama**: Mendaftarkan `nex-ai-protect` & `nex-ai-reflex` menggunakan Modelfile khusus.
- [x] **Branding Imersif NEX-AI di Dashboard**: Widget tensor model dan aktivitas synaptik node AI real-time.
- [x] **GeoIP Lookup Terpadu**: Integrasi pencarian lokasi IP (MaxMind DB + ip-api.com) ketika IP diblacklist atau divisualisasikan.

### Milestone 14: Collective Threat Intelligence & Sovereign Compliance Exporter (COMPLETED) ✅
*Jaringan intelijen ancaman siber privat nasional BSSN/ID-CERT dan generator laporan audit kepatuhan otomatis.*
- [x] **STIX 2.1 / TAXII 2.1 Standardized Format**: Format payload standar nasional untuk pelaporan sinyal ancaman siber.
- [x] **Encrypted Syslog TLS Reporter (RFC 5424)**: Pengiriman telemetri terenkripsi ke SIEM internal bank/instansi.
- [x] **BSSN Collective Threat Feed Sync**: Sinkronisasi & injeksi blacklist kolektif BSSN ke memori RAM/Redis gateway.
- [x] **Automated Multi-Framework Evaluator**: Penilaian otomatis terhadap `ISO/IEC 27001:2022`, `PCI-DSS v4.0`, `UU PDP No. 27/2022`, dan `ISO 25010`.
- [x] **1-Click Audit Report Exporter**: Penjana laporan audit format Markdown & JSON via UI Dashboard SOC (`ComplianceWidget.tsx`) dan CLI Subcommand (`gateway audit export`).

### Milestone 15: Full War Room Live War Game Simulator & Recovery Panel (COMPLETED) ✅
*Panel simulasi perang siber live terpadu dan mitigasi otonom real-time.*
- [x] **Live Attack Scenario Engine**: Skenario serangan simulasi siber `DDoS SYN Flood (64k rps)`, `SQL Injection Vault Tamper`, `Ransomware Web-Shell Defacement`, dan `Credential Stuffing`.
- [x] **Real-time Latency & Auto-Mitigation Evaluator**: Evaluasi kecepatan mitigasi instan (Reflex Filter < 0.045ms, eBPF XDP_DROP 0% CPU, Self-Repair Rollback < 2.1ms).
- [x] **Cyber War Room Dashboard Widget**: Widget UI interaktif (`WarGameWidget.tsx`) dengan animasi status eksekusi perang siber.
- [x] **CLI War Game Subsystem**: Subcommand `gateway sim --type=all` pada binary Go Gateway.

---

## 🚀 Rencana Sprint & Milestone (Fase 2 Dev Testbed)

### Sprint 1: Integrasi Web Portofolio & Uji Ketahanan (Password Vault) (COMPLETED) ✅
* [x] **Task 1.1: Pengaturan Password & Tautan Hadiah**
  * Konfigurasi parameter `REWARD_PASSWORD` dan `REWARD_LINK` secara dinamis di berkas `.env` dan `resistance_handlers.go`.
* [x] **Task 1.2: Aktivasi & Integrasi Proteksi Brute-Force**
  * Memvalidasi bahwa handler `rewardUnlockHandler` secara aktif menyimpan log percobaan salah ke database dan memicu `database.BanIP` setelah 5 kali gagal.
* [x] **Task 1.3: Alur User Flow Uji Ketahanan**
  * Alur: Pengunjung &rarr; Mengakses Portofolio &rarr; Berusaha membongkar/brute-force Vault &rarr; Percobaan dicatat oleh Reflex AI &rarr; Jika gagal >= 5 kali, IP diblokir di level Gateway &rarr; Tampilan dasbor Command Center mendeteksi aktivitas serangan.

### Sprint 2: Kesiapan Deployment & Analisis Performa (COMPLETED) ✅
* [x] **Task 2.1: Audit Kesiapan Deploy (Docker-Compose)**
  * Melakukan audit integrasi port, variabel lingkungan, dan jaringan internal pada berkas `docker-compose.yml` agar sistem siap dideploy ke server VPS.
* [x] **Task 2.2: Estimasi Profil Performa CPU & RAM**
  * Menganalisis konsumsi memori minimum Go Gateway (ringan, ~15-30MB RAM) vs FastAPI AI Server (jauh lebih berat jika menjalankan model local). Rekomendasi alokasi RAM server untuk deployment stabil.

### Sprint 3: CLI & Pelacakan Penetas (IP Tracking) (COMPLETED) ✅
* [x] **Task 3.1: Peningkatan Konsol Terminal Command Center**
  * Menambahkan lebih banyak perintah interaktif (termasuk `/recovery` untuk memicu pemulihan basis data portofolio dari log audit) dan auto-complete bantuan pada dasbor terminal.
* [x] **Task 3.2: Pelacakan Geografis IP Penetas (Threat GeoIP Lookup)**
  * Mengintegrasikan API pencarian lokasi IP ketika IP didaftarkan ke blacklist dan menampilkannya di peta visual dasbor secara langsung.
