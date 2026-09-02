# Nexus Cyber Capabilities

Status mengikuti kode di `nexus-core-gateway`, `nexus-admin-dashboard`, dan `NEX-RED`. **Model produk:** [PRODUCT_MODEL.md](./PRODUCT_MODEL.md) (GaaS Edge Antibody Cowork). Pembaruan: 2026-09-02.

---

## Produk (dua lapisan)

| Kemampuan | Status | Catatan |
| --- | --- | --- |
| **Channel Starter** (form→template UMKM) | **Lab v0.1 + S-3/S-6** | Template Nexcent, 4 palet, Caddy header tepi; wizard `:3010`; seed demo `sites/contoh-nexcent`; publish Vercel **per folder situs** jika token/login (bukan git monorepo; `*.vercel.app` bukan WAF) |
| **Pagar tipis** (tepi shared) | **Lab MVP** | Upsell `--tier tepi` → Caddy ke WAF `:8080` + Reflex judi/deface; **satu** slug/`PROTECTED_HOST` per lab; **tanpa** Job. Bukan Starter 20 Kr; bukan pulih Vercel |
| Edge Antibody Cowork (Job/Loop) | **Sudah ada** | NEX-RED + gateway |

## Produk GaaS (mesin)

| Kemampuan produk | Status | Mekanisme |
| --- | --- | --- |
| Tepi always-on (Alur A) | **Sudah ada** | Gateway `:8080` Reflex + antibodi + golden GET (HTTPS origin) |
| Wasit defense delta | **Sudah ada** | NEX-RED twin WAF vs origin |
| Antibody verify loop | **Sudah ada** | vaccine-probe + replay lab |
| Job Cowork orkestrasi | **Sudah ada** | `NEX-RED/jobs/` + bridge `:3004` |
| Ekspor artefak risiko | **Sudah ada** | MD/JSON per Job (file-backed) + digest insiden ThreatLog per host (operator) |
| Memori imun host | **Sudah ada** | PG `host_immune_memories` + file backup |
| Channel Portal / multi-tenant legacy | **Portal v0.1** | `nexus-gaas-web/` — login/daftar/tamu; **Kredit** Starter 20 Kr per identitas. Isi = pending + WA + form bukti; approve operator `/operator/topup` (localhost). QRIS/VA **belum live**. Keran lab opt-in. Bukan PSP; bukan F-10 |

---

## Grid pertahanan & validasi

| Kategori | Ancaman / tugas | Mekanisme di kode | Tingkat |
| :--- | :--- | :--- | :--- |
| **GaaS wasit** | Celah origin vs tepi | Defense delta + replay labels | Nyata (lab) |
| **GaaS antibodi** | Virtual patch tepi | RAM-first (403) + vaccine-probe; Redis opsional | Nyata (lab) |
| Aplikasi web | SQLi / XSS / path traversal / injeksi judi-deface (pagar tipis) | Reflex `NormalizeForInspect` + regex; judi/deface hanya jika request sudah di `:8080` | Nyata (lab) |
| Unggah | Shell berkedok gambar | AVSE + magic bytes | Nyata |
| Vault lab | Brute-force password | autoban 5x; ban persist `intel_blacklist` + hydrate RAM saat start | Nyata |
| Abuse / flood | Request berlebih | Token bucket | Nyata (bukan DDoS kernel) |
| Integritas template / origin lokal | Deface folder terpantau | Pin + fsnotify jika `INTEGRITY_MONITORED_DIR` diisi; **bukan** default | Opsional; bukan file di Vercel |
| SOC / Operator GaaS Console | Kanal, **onboard Origin+host** (tanpa Docker auto UI), **workspace-bound** Job L0/L1 + logs/metrics/IP/artefak/digest insiden, **Panduan Penggunaan** (ID), ban, CLI, telemetri | `:8081` + cookie · `:3001` | Nyata; internal; GaaS-only UI |
| Pager | Setelah autoban **atau** self-heal restore/purge | Telegram env | Nyata jika dikonfigurasi |
| NEX-RED agen | Hygiene HTTP jinak | recon / access / injection-hygiene / reporter | Nyata |
| Reasoning AI | Lab start **wajib** nama lokal | `nex-ai-protect` async setelah start | Ollama lokal; bukan Hub |
| DDoS L3/L4 | Volume tinggi | eBPF **stub** | Tidak XDP |
| Kasir Kredit | Top-up IDR | **Lab:** Isi = pending; WA pemilik + form bukti; Kredit setelah approve (loopback / secret / `/operator/topup`). Keran lab opsional. **QRIS/VA belum live** | Bukan billing produksi. **Bukan** Midtrans/Stripe. Bukan auto-kredit WA |

---

## NEX-RED

Lihat [`NEX-RED/README.md`](../NEX-RED/README.md). **Defense delta:** `waf_blocked` / `origin_open` / `both_held` / `replay_held` / `replay_missed`. **Antibody loop:** `antibody_learned` via lab signal + vaccine-probe. Bukan Shannon. Runtime LLM: `nex-ai-protect` / `nex-ai-reflex` only — [NEX_AI_RUNTIME.md](./NEX_AI_RUNTIME.md).

---

## Blue team (detail jujur)

- **Reflex:** regex pada bentuk kanonik (termasuk subset pagar tipis judi/deface). Hanya trafik WAF `:8080` / `PROTECTED_HOST` — bukan hit `*.vercel.app` langsung.
- **Antibodi:** virtual patch **RAM-first** (Redis opsional untuk share antar-node); match Layer 1 → **403** di tepi tanpa origin; Redis mati tidak menurunkan node yang sudah punya patch di RAM; daftar pola di SOC `:8081`
- **Control plane:** SOC path 404 di `:8080`
- **Ban IP:** `intel_blacklist` + RAM; hydrate saat start gateway; tanpa PG ban hilang setelah restart
- **Golden GET cache:** RAM di WAF untuk GET publik setelah Reflex; default HTTPS origin (Vercel); stale-if-5xx; bukan CDN / bukan autentikasi
- **Satu hostname:** `PROTECTED_HOST` — bukan CNAME massal legacy
- **Origin instance (compose):** `TARGET_BACKEND` adalah sumber kebenaran untuk Host lab (`PROTECTED_HOST`, `localhost`, `127.0.0.1`, `*`). `START.bat` = Vercel. `START-OFFLINE` dihapus (playground diarsip). Named-host dan loopback WAF tidak boleh beda origin. Bukan provisioner multi-tenant.
- **Command Center / Operator GaaS Console:** kokpit operator (kanal, **Onboard kanal** via `/api/routes`, Job L0/L1, artefak Job + digest insiden per workspace); Active Workspace mengikat semua jendela wasit ke protected host via WAF; **Panduan Penggunaan** in-app (Bahasa Indonesia) untuk alur pilot; bukan deliverable ke klien; tanpa War Room/MTD/license UI
- **Onboard kanal (operator):** form **Origin URL** + **protected host / custom domain** (opsional, default lab) → `POST /api/routes`; Domain Switcher + Context-Aware auto-bind; DNS/CNAME/tunnel **di luar SOC** (pilot PC+tunnel); **tanpa** auto-provision Docker di UI operator; **bukan** CNAME massal / portal pelanggan / PSP pihak ketiga. Channel Starter tetap entry terpisah untuk klien tanpa site.
- **Job target:** UI mengikat `http://{activeDomain}` (via WAF). Agen NEX-RED (HTTP **dan** Chromium `NEX_RED_BROWSER=1`) menghubungkan TCP ke gateway (`NEXUS_GATEWAY_URL` / `NEX_RED_LIVE_TARGET` loopback:port) dengan `Host: {protected_host}` — Chromium memakai `--host-resolver-rules=MAP`; tidak bergantung file hosts. Chromium hilang/disk penuh → skip browser jujur, HTTP Job tetap. Twin origin tetap `NEX_RED_ORIGIN_DIRECT`. Gallery/vault browser butuh lab session (`NEX_RED_LAB_SESSION_TOKEN` = gateway `NEXUS_LAB_SESSION_TOKEN` → `POST /api/verify-session`); pengunjung named-host tetap PoW.
- **NEX-AI start-gate (lab PC):** `deploy-local` tidak `compose up` jika `nex-ai-protect` atau `nex-ai-reflex` absen di Ollama host. Bukan unduhan Hub (`ollama pull qwen/llama/gpt` dilarang). Pasang: salin `nex_ai_q4_k_m.gguf` → `nex-ai-models\` → `IMPORT-OLLAMA.bat`. Request path tetap Reflex regex sinkron; reasoning tetap asinkron. CI: `NEX_AI_REQUIRED=0`.

---

*Capabilities selaras pivot GaaS 2026-08-22; pagar tipis `--tier tepi` 2026-08-31; gerbang NEX-AI fail-closed lab 2026-08-31; self-heal pin + digest insiden + Job Host-header + browser Chromium MAP + degradasi Redis→RAM + ban PG hydrate + golden GET + ROUTER-SYNC origin bind 2026-08-30.*
