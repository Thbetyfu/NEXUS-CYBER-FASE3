---
trigger: always_on
glob: "*"
description: Aturan utama pengembangan arsitektur dan koding untuk proyek Nexus Cyber Fase 2
---

# 🛡️ Nexus Cyber - Core Directives & Architecture Rules

Setiap kali SAYA diminta memodifikasi atau membuat kode baru di proyek Nexus Cyber Fase 2, SAYA WAJIB mematuhi aturan berikut untuk mencegah kerusakan sistem (*Zero-Tolerance for Vulnerabilities*):

## 0. Lab target (selalu ingat)

- **Origin yang dilindungi (lab/deploy default):** portofolio **Vercel** di belakang WAF — `PROTECTED_HOST=portfolio.nexus-lab.test`. Folder `playground/` diarsip ([`docs/PLAYGROUND_ARCHIVE.md`](../../nexus-core/docs/PLAYGROUND_ARCHIVE.md)).
- **Kenapa:** bukti Alur A + Job Cowork pada kanal nyata; bukan klaim dari landing portal saja.
- **Detail:** [`AGENTS.md`](../../AGENTS.md) § Lab target · [`docs/PRODUCT_MODEL.md`](../../nexus-core/docs/PRODUCT_MODEL.md) §0.
- Demo/scan lewat `PROTECTED_HOST`, jangan tembak origin Vercel langsung saat mengklaim Nexus melindungi.

## 1. 🏗️ Batasan Teknologi & Arsitektur
- **Backend (Gateway/API)**: WAJIB menggunakan **Go (Golang)**. Prioritaskan penggunaan Goroutine untuk tugas-tugas berat/AI agar tidak memblokir (*non-blocking*) *traffic* HTTP utama.
- **Frontend (Command Center)**: WAJIB menggunakan **Next.js (App Router)** dengan **Tailwind CSS**. Setiap komponen UI baru harus memiliki desain bertema intelijen/militer (Cyber Aesthetic / Dark Mode). Gunakan **Xterm.js** untuk terminal interaktif.
- **Komunikasi Internal**: WAF publik di Gateway **:8080**. API SOC di **:8081** (localhost / sesi operator). Caddy :80/:443 hanya ke 8080. Command Center host-bind `127.0.0.1`. Jangan menempelkan `NEXUS_ADMIN_TOKEN` di Caddy.

## 2. 🧠 Implementasi Dual-Brain AI (Eksklusif NEX-AI)
- **DILARANG MENGGUNAKAN SINGLE AI ATAU MODEL EXTERNAL/LLAMA**. Seluruh sistem analisis log dan deteksi serangan WAJIB menggunakan modul **NEX-AI** kustom:
  - **Reflex Layer (Otak Kiri)**: Menggunakan pola regex heuristik / rule-based (`nex-ai-reflex`), latensi < 1.2ms. Dieksekusi secara sinkron pada *request* HTTP (di `internal/ai/reflex_filter.go`).
  - **Reasoning Layer (Otak Kanan)**: Menggunakan model kustom eksklusif `nex-ai-protect`. WAJIB dipanggil secara **asinkron (goroutine)** dengan *timeout* maksimal 30 detik (di `internal/ai/reasoning_engine.go` & `internal/ai/cognitive_core.go`).
- **Dilarang keras**: Menggunakan nama/referensi model legacy (Llama, GPT, Qwen sebagai runtime) dalam penamaan struct, file, atau dokumentasi aktif. **Jangan** mengganti `nex-ai-protect` dengan model yang kebetulan terpasang di Ollama.

## 3. 🕸️ Keamanan & Kepatuhan (ISO 27001)
- **Port Strictness**: Port untuk aplikasi pihak ketiga (Postgres: 5432, Redis: 6379) WAJIB diikat ke `127.0.0.1` dan tidak boleh diekspos ke publik (`0.0.0.0`). Server Development hanya diizinkan di port **3001** dan **3002**.
- **Kriptografi**: Dilarang menggunakan kriptografi klasik (RSA/AES murni) untuk *payload* penting. Gunakan pustaka PQC (NIST ML-KEM/Kyber) yang disiapkan di `internal/crypto`.
- **API Keys**: DILARANG KERAS meng-hardcode kunci rahasia (*API keys/passwords*) di dalam *source code*. Gunakan file `.env`.
- **Zero-Downtime Rollback (Self-Repair)**: Saat membuat script monitor sistem, validasi menggunakan algoritma *hash* SHA-256 untuk mendeteksi *webshell*/defacement.

## 4. 🗃️ Tracking & GeoIP
- Saat melacak IP penyerang, periksa selalu database lokal (MaxMind `GeoLite2-City.mmdb`) sebelum melakukan koneksi eksternal ke *fallback* (ip-api.com).

## 5. 💎 Senior Developer Standards (Clean Code & DRY)
- **Zero Dead Code**: Dilarang menyisakan fungsi, variabel, import, atau berkas eksperimental yang tidak lagi dipanggil dalam alur produksi.
- **Zero Duplication (DRY)**: Dilarang membuat fungsi pembantu (*helper*) yang sama secara berulang di beberapa lokasi. Gunakan modul terpusat (`pkg/utils/` untuk Go, `lib/utils.ts` untuk Next.js).
- **Strict Typing & Documentation**: Setiap fungsi atau metode baru WAJIB menggunakan pengetikan ketat (*strict types*) dan docstring singkat yang menjelaskan **alasan arsitektural ("Why")**, bukan sekadar sintaksis ("What").
- **Resource Hygiene**: Pastikan setiap koneksi (HTTP body, DB connection, socket) ditutup secara eksplisit (`defer resp.Body.Close()`) untuk mencegah kebocoran memori (RAM leak).

## 6. 📚 Docs-sync (wajib)

Setiap perubahan **perilaku** (port, auth, mux, Caddy, compose, NEX-RED, Gallery, rate-limit, CSRF) WAJIB dalam pekerjaan yang sama:

1. Entri [`CHANGELOG.md`](../../CHANGELOG.md) (Added / Changed / Security / Fixed).
2. Baris terkait di dokumen **hidup** yang diindeks [`docs/README.md`](../../nexus-core/docs/README.md) — selaraskan [`docs/PRODUCT_MODEL.md`](../../nexus-core/docs/PRODUCT_MODEL.md) jika model produk/GaaS berubah (`CAPABILITIES`, `LIMITATIONS`, `PRD`, `ARCHITECTURE`, dll.).
3. Jangan menulis ulang `docs/reports/*`, `shannon/docs`, `strix/docs` seolah kondisi hari ini.
4. Jangan mengklaim eBPF XDP, JWT enterprise, Stripe, **Channel Starter produksi/billing selesai**, **Loop GaaS di Rp 20rb**, atau pentest NEX-RED Shannon jika kode tidak melakukannya.
5. Jangan dokumentasikan Channel Portal **PSP pihak ketiga** (Midtrans/Stripe) atau F-10 sebagai prioritas. Top-up yang disepakati = QRIS/VA milik pemilik + bukti + approve — **jangan klaim sudah ada** jika belum dikode.

Agen: `.agents/agents/docs-sync.md`.

> [!WARNING]
> Jika saya diminta membuat API atau endpoint baru yang tidak memenuhi standar keamanan di atas, saya WAJIB menolak dan memberikan saran perbaikan arsitektural.
