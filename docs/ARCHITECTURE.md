# 🏗️ NEXUS CYBER ARCHITECTURE

Dokumen ini memvisualisasikan struktur folder dan spesifikasi teknologi yang digunakan untuk membangun infrastruktur pertahanan data nasional.

## 💻 Tech Stack Proposal

### 1. Backend Defense (nexus-core-gateway)
- **Language**: **Go (Golang)**. Dipilih karena performa tinggi, konkurensi aman, dan ekosistem library keamanan yang matang.
- **Framework**: Standard library `net/http` & `httputil` untuk proxy, Gin/Fiber untuk API internal.
- **AI Integration**: gRPC/REST untuk Qwen (Reflex) dan NEX-AI (Reasoning).
- **PQC Library**: `circl` (Cloudflare) atau bindings ML-KEM NIST.
- **Database**: **Redis** (Real-time MTD Tracking) & **PostgreSQL** (Metadata/Audit Log).
- **Self-Repair Engine**: Modul pemulihan mandiri `repair` dengan pemindaian integritas berbasis hash SHA-256 dan RAM cache untuk restorasi file instan (<100ms).
- **GeoIP Engine**: Pustaka `geoip2-golang` untuk pembacaan basis data kota MaxMind `.mmdb` lokal dengan fallback dinamis ke API online `ip-api.com`.
- **AbuseIPDB client**: Klien pelaporan asinkron (goroutine) untuk publikasi reputasi IP global.
- **Deception Module**: Honeypot HTTP (Port 9090) dan SSH Tarpit (Port 22/2222) murni ditulis dalam Go.

### 2. Frontend Command Center (nexus-admin-dashboard)
- **Framework**: **Next.js 14+ (App Router)**.
- **Styling**: **Tailwind CSS**.
- **Visualisasi**: **Tremor** / **Recharts** untuk monitor grafik real-time.
- **Icons**: **Lucide-React**.
- **State Management**: **Zustand** atau React Context.
- **Console Terminal**: **Xterm.js** dengan `@xterm/addon-fit` untuk emulasi CLI taktis, rendering warna ANSI, riwayat perintah, dan autocomplete.

### 3. AI Layers (Dual-Brain)
- **Reflex Layer**: Qwen (Optimization for speed).
- **Reasoning Layer**: NEX-AI (Optimization for context/intent).

---

## 📁 Directory Structure

```text
nexus-cyber/
├── .agents/                    # AI Agent Configs & Skills
├── nexus-core-gateway/          # BACKEND (GO)
│   ├── cmd/
│   │   └── gateway/             # Entry point aplikasi (main.go, telemetry_api.go, dll)
│   ├── internal/                # Privat logic
│   │   ├── ai/                  # Dual-Brain Logic
│   │   ├── mtd/                 # Moving Target Defense & SSH Tarpit (ssh_tarpit.go)
│   │   ├── crypto/              # PQC (NIST ML-KEM)
│   │   ├── proxy/               # Reverse Proxy Core
│   │   ├── database/            # PostgreSQL, Redis, & AbuseIPDB client (abuseipdb.go)
│   │   └── repair/              # Self-Repair Scripts
│   ├── pkg/                     # Public shared packages
│   ├── configs/                 # YAML/Env Configurations
│   ├── geoip/                   # Direktori basis data GeoLite2-City.mmdb
│   ├── go.mod
│   └── README.md
├── nexus-admin-dashboard/       # FRONTEND (NEXT.JS)
│   ├── app/                     # Next.js App Router
│   ├── components/              # UI Components & Xterm.js Widget (AiTerminalWidget.tsx)
│   ├── lib/                     # Utils & Hooks
│   ├── public/                  # Assets
│   ├── tailwind.config.ts
│   └── package.json
├── scripts/                     # Deployment & Maintenance Scripts
│   └── setup.sh                 # Scaffolding Automation
├── docs/                        # Technical Documentation
└── NEXUS_CORE_DIRECTIVES.md     # Governance Rules
```

---
*Antara `nexus-core-gateway` dan `nexus-admin-dashboard` terhubung via API internal yang dilindungi oleh PQC.*
