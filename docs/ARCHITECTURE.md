# 🏗️ NEXUS CYBER ARCHITECTURE

Dokumen ini memvisualisasikan struktur folder dan spesifikasi teknologi yang digunakan untuk membangun infrastruktur pertahanan data nasional terpadu (Dual-Force: Blue Shield & Red Sword).

## 💻 Tech Stack Proposal

### 1. Backend Defense (`nexus-core-gateway`)
- **Language**: **Go (Golang)**. Dipilih karena performa tinggi, konkurensi aman, dan ekosistem library keamanan yang matang.
- **Framework**: Standard library `net/http` & `httputil` untuk proxy, Gin/Fiber untuk API internal.
- **AI Integration**: gRPC/REST untuk Qwen (Reflex) dan NEX-AI (Reasoning).
- **PQC Library**: `circl` (Cloudflare) atau bindings ML-KEM NIST.
- **Database**: **Redis** (Real-time MTD Tracking) & **PostgreSQL** (Metadata/Audit Log & `pentest_findings`).
- **Self-Repair Engine**: Modul pemulihan mandiri `repair` dengan pemindaian integritas berbasis hash SHA-256 dan RAM cache untuk restorasi file instan (<100ms).
- **GeoIP Engine**: Pustaka `geoip2-golang` untuk pembacaan basis data kota MaxMind `.mmdb` lokal dengan fallback dinamis ke API online `ip-api.com`.
- **AbuseIPDB client**: Klien pelaporan asinkron (goroutine) untuk publikasi reputasi IP global.
- **Deception Module**: Honeypot HTTP (Port 9090) dan SSH Tarpit (Port 22/2222) murni ditulis dalam Go.
- **Red Team Adapter**: Paket `internal/pentest/nexred_adapter.go` untuk mengendalikan daemon **NEX-RED**.

### 2. Autonomous Red Team Engine (`NEX-RED`)
- **Language**: **Python 3.10+**.
- **Architecture**: White-box AST (Python) + static patterns (Go/JS/PHP) + optional LLM verifier + live posture probes.
- **Capabilities**:
  - *Python AST sinks*: SQL dinamis, eval/exec, command, pickle/YAML, hardcoded secrets.
  - *Live posture*: recon header/link dan probe JSON jinak (bukan swarm pentest).
  - *Evidence gate*: hanya temuan dengan file:line atau HTTP status.
- **Bridge Server**: FastAPI / Uvicorn REST Daemon pada `127.0.0.1:3004`.

### 3. Frontend Command Center (`nexus-admin-dashboard`)
- **Framework**: **Next.js 14+ (App Router)**.
- **Styling**: **Tailwind CSS**.
- **Visualisasi**: **Tremor** / **Recharts** untuk monitor grafik real-time.
- **Icons**: **Lucide-React**.
- **State Management**: **Zustand** atau React Context.
- **Console Terminal**: **Xterm.js** dengan `@xterm/addon-fit` untuk emulasi CLI taktis, rendering warna ANSI, riwayat perintah, dan autocomplete.
- **War Room Panel**: Widget simulasi perang siber (`WarGameWidget.tsx`) yang terhubung langsung ke daemon `NEX-RED`.

### 4. AI Layers (Dual-Brain + Red Agent)
- **NEX-AI Reflex Layer**: `nex-ai-reflex` (Optimasi sub-1.2ms latency).
- **NEX-AI Reasoning Layer**: `nex-ai-protect` (Optimasi forensik mendalam & intent analysis).
- **NEX-RED Offensive Core**: Tactical agent untuk pengujian penetrasi dan audit kode.

---

## 📁 Directory Structure

```text
nexus-cyber/
├── .agents/                    # AI Agent Configs & Skills
├── NEX-AI/                     # AI Engine Pertahanan (Reflex & Reasoning Modelfiles)
├── NEX-RED/                    # ⚔️ Mesin Otonom Red Team (White-box + Black-box)
│   ├── nexred.py               # CLI Entry Point
│   ├── core/                   # Orchestrator, Types, & Config
│   ├── agents/                 # Whitebox, Blackbox, Exploit Validator, & Reporter
│   ├── scenarios/              # Pre-configured Tactical Battle Scenarios
│   ├── bridge/                 # REST API Daemon (Port 3002)
│   └── tests/                  # Automated Test Suite
├── nexus-core-gateway/          # 🛡️ BACKEND GATEWAY (GO)
│   ├── cmd/
│   │   └── gateway/             # Entry point aplikasi (main.go, telemetry_api.go, dll)
│   ├── internal/                # Privat logic
│   │   ├── ai/                  # Dual-Brain Logic
│   │   ├── mtd/                 # Moving Target Defense & SSH Tarpit
│   │   ├── crypto/              # PQC (NIST ML-KEM)
│   │   ├── proxy/               # Reverse Proxy Core
│   │   ├── database/            # PostgreSQL, Redis, & AbuseIPDB client
│   │   ├── repair/              # Self-Repair Scripts
│   │   └── pentest/             # NEX-RED Adapter (nexred_adapter.go)
│   ├── pkg/                     # Public shared packages
│   ├── geoip/                   # Direktori basis data GeoLite2-City.mmdb
│   ├── go.mod
│   └── README.md
├── nexus-admin-dashboard/       # 🖥️ FRONTEND (NEXT.JS)
│   ├── app/                     # Next.js App Router
│   ├── components/              # UI Components, WarGameWidget, & Xterm.js Terminal
│   ├── lib/                     # Utils & Hooks
│   ├── public/                  # Assets
│   ├── tailwind.config.ts
│   └── package.json
├── scripts/                     # Deployment & Maintenance Scripts
├── docs/                        # Technical Documentation
└── NEXUS_CORE_DIRECTIVES.md     # Governance Rules
```

---
*Antara `nexus-core-gateway`, `nexus-admin-dashboard`, dan `NEX-RED` terhubung via API internal aman.*
