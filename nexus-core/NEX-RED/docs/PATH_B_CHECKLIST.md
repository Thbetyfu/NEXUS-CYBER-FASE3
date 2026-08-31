> **Dokumen NEX-RED** ? selaraskan [NEX-RED/README.md](../README.md); bukan Shannon/Strix.

---

# Jalan B ? Checklist eksekusi

Sumber lengkap: [PATH_B_NATIVE_ENGINE.md](./PATH_B_NATIVE_ENGINE.md).

Centang hanya jika ada bukti di kode/tes/report, bukan niat.

## Fase 0 ? Kontrak

- [x] RoE + `NEX_RED_LIVE_TARGET` di `.env.example`
- [x] Staging portfolio + gateway, bukan produksi klien
- [x] Model NEX-AI: `nex-ai-protect` / `nex-ai-reflex` saja (bukan Qwen/Llama Hub)

## Fase 1 ? Job & sandbox

- [x] State `QUEUED | RUNNING | COMPLETED | FAILED | PARTIAL`
- [x] Gateway poll `GET /api/v1/scan/{id}` (bukan timeout 30s untuk live)
- [x] Docker sandbox: non-root image ada; allow-list di Python ? **bukan** iptables penuh

## Fase 2 ? Planner

- [x] Langkah dari hipotesis AST (deterministik; tanpa payload exploit)
- [x] `max_steps` (`NEX_RED_MAX_LIVE_STEPS`)
- [x] Prompt LLM verifier tetap tanpa permintaan payload exploit
- [x] Planner LLM JSON bebas (allow-list nama cek + path; fallback deterministik jika model mati)

## Fase 3 ? HTTP evidence (MVP v5)

- [x] Route mutating tanpa sesi ? 401/403 atau 200 tercatat
- [x] IDOR: user B tidak membaca objek user A (dua sesi lab atau token env)
- [x] Request tanpa `Authorization` ke `/api/telemetry` publik tercatat
- [x] Report: `live_verdict` (sast_only / confirmed / rejected / mitigated_by_nexus)
- [x] `live_checks_run` di hasil scan (bukan syarat benchmark Shannon)
- [x] Sprint 1: `defense_delta` (waf_blocked / origin_open / both_held / replay_held); origin hanya lab HTTP (`NEX_RED_ORIGIN_DIRECT`); bukan proof-by-exploitation
- [x] Sprint 2: GET sinyal jumlah antibodi di WAF (`/nexred/lab/antibody-signal`, tanpa pola) + POST vaksin lab + replay; `antibody_learned` / `replay_missed`; `antibody_loop_ok`
- [x] Sprint 3: harness hotspot (SOC/datastore tertutup dari klien privat; honeypot tercatat jujur). Loopback dilewati kecuali `NEX_RED_HOTSPOT_HARNESS=1`

## Fase 4 ? Browser

- [x] Unggah gambar sah + 5 password vault salah di Chromium jika `NEX_RED_BROWSER=1` dan Playwright terpasang
- [x] Chromium MAP hostname kanal ke IP WAF (tanpa file hosts); sama dengan bind HTTP Job
- [x] Ban 5x tercatat sebagai `mitigated_by_nexus` bila teks blacklist muncul; PoW hotspot ? `sast_only` (bukan temuan palsu)

## Fase 5 ? Multi-agen

- [x] Agen `recon` / `access` / `injection-hygiene` / `reporter`
- [x] Satu agen gagal ? `PARTIAL`, bukan crash

## Fase 6 ? Parity

- [x] Lab Juice Shop (self-hosted) atau setara ? `NEX-RED/lab/juice-shop/`, CLI `lab-juice` / `benchmark --live`
- [x] Recall kelas AUTH/AUTHZ terukur (`live_recall_by_class` + log `checks_run`; Juice Shop v17 sering **0/5 confirmed** karena 401 ? itu hasil jujur)
- [ ] `equal_to_shannon_strix` hanya true jika pintu live lulus

## Dilarang (selalu)

- [ ] Tidak ada wordlist exploit di git
- [ ] Tidak copy source Shannon/Strix ke `agents/`
- [ ] Tidak hardcode angka ?mitigated 64000?
