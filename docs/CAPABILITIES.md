# Nexus Cyber Capabilities

Status mengikuti kode di `nexus-core-gateway`, `nexus-admin-dashboard`, dan `NEX-RED`. **Model produk:** [PRODUCT_MODEL.md](./PRODUCT_MODEL.md) (GaaS Edge Antibody Cowork). Pembaruan: 2026-08-22.

---

## Produk (dua lapisan)

| Kemampuan | Status | Catatan |
| --- | --- | --- |
| **Channel Starter** (form→template UMKM) | **Lab v0.1 + S-3/S-6** | Generator + deploy multi-tenant + upsell Cowork |
| Edge Antibody Cowork (Job/Loop) | **Sudah ada** | NEX-RED + gateway |

## Produk GaaS (mesin)

| Kemampuan produk | Status | Mekanisme |
| --- | --- | --- |
| Tepi always-on (Alur A) | **Sudah ada** | Gateway `:8080` Reflex + antibodi |
| Wasit defense delta | **Sudah ada** | NEX-RED twin WAF vs origin |
| Antibody verify loop | **Sudah ada** | vaccine-probe + replay lab |
| Job Cowork orkestrasi | **Sudah ada** | `NEX-RED/jobs/` + bridge `:3004` |
| Ekspor artefak risiko | **Sudah ada** | MD/JSON per Job (file-backed) |
| Memori imun host | **Sudah ada** | PG `host_immune_memories` + file backup |
| Channel Portal / multi-tenant legacy | **Portal v0.1** / **Ditunda** | `nexus-channel-portal/` |

---

## Grid pertahanan & validasi

| Kategori | Ancaman / tugas | Mekanisme di kode | Tingkat |
| :--- | :--- | :--- | :--- |
| **GaaS wasit** | Celah origin vs tepi | Defense delta + replay labels | Nyata (lab) |
| **GaaS antibodi** | Virtual patch tepi | Cache + vaccine-probe | Nyata (lab) |
| Aplikasi web | SQLi / XSS / path traversal | Reflex `NormalizeForInspect` + regex | Nyata |
| Unggah | Shell berkedok gambar | AVSE + magic bytes | Nyata |
| Vault lab | Brute-force password | autoban 5x | Nyata |
| Abuse / flood | Request berlebih | Token bucket | Nyata (bukan DDoS kernel) |
| Integritas template | Deface folder terpantau | BLAKE3 + restore RAM | Nyata, scope terbatas |
| SOC / Operator GaaS Console | Kanal, **onboard origin→protected host**, **workspace-bound** Job L0/L1 + logs/metrics/IP/artefak, ban, CLI, telemetri | `:8081` + cookie · `:3001` | Nyata; internal; GaaS-only UI |
| Pager | Setelah autoban | Telegram env | Nyata jika dikonfigurasi |
| NEX-RED agen | Hygiene HTTP jinak | recon / access / injection-hygiene / reporter | Nyata |
| Reasoning AI | Opsional | `nex-ai-protect` async | Bergantung Ollama |
| DDoS L3/L4 | Volume tinggi | eBPF **stub** | Tidak XDP |
| Multi-tenant bayar | Stripe/Midtrans | **Ditunda** | Bukan GaaS v1 |

---

## NEX-RED

Lihat [`NEX-RED/README.md`](../NEX-RED/README.md). **Defense delta:** `waf_blocked` / `origin_open` / `both_held` / `replay_held` / `replay_missed`. **Antibody loop:** `antibody_learned` via lab signal + vaccine-probe. Bukan Shannon. Runtime LLM: `nex-ai-protect` / `nex-ai-reflex` only — [NEX_AI_RUNTIME.md](./NEX_AI_RUNTIME.md).

---

## Blue team (detail jujur)

- **Reflex:** regex pada bentuk kanonik
- **Antibodi:** virtual patch di memori/Redis; daftar pola di SOC `:8081`
- **Control plane:** SOC path 404 di `:8080`
- **Satu hostname:** `PROTECTED_HOST` — bukan CNAME massal legacy
- **Command Center / Operator GaaS Console:** kokpit operator (kanal, **Onboard kanal** via `/api/routes`, Job L0/L1, artefak); Active Workspace mengikat semua jendela wasit ke protected host via WAF; bukan deliverable ke klien; tanpa War Room/MTD/license UI
- **Onboard kanal (operator):** daftar satu host → origin di gateway; Domain Switcher ikut + auto-bind Job/logs; **bukan** portal pelanggan / CNAME massal / billing
- **Job target:** UI mengikat `http://{activeDomain}` (via WAF). Host-header override terpisah atas `127.0.0.1:8080` **belum** di-plumb end-to-end di agen HTTP — lab mengandalkan hosts/DNS ke gateway (sama seperti `NEX_RED_LIVE_TARGET=http://PROTECTED_HOST`)

---

*Capabilities selaras pivot GaaS 2026-08-22.*
