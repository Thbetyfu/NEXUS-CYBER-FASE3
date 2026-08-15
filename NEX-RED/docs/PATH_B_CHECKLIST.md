# Jalan B — Checklist eksekusi

Sumber lengkap: [PATH_B_NATIVE_ENGINE.md](./PATH_B_NATIVE_ENGINE.md).

Centang hanya jika ada bukti di kode/tes/report, bukan niat.

## Fase 0 — Kontrak

- [x] RoE + `NEX_RED_LIVE_TARGET` di `.env.example`
- [x] Staging portfolio + gateway, bukan produksi klien
- [x] Model NEX-AI diputuskan (lokal / fallback API)

## Fase 1 — Job & sandbox

- [x] State `QUEUED | RUNNING | COMPLETED | FAILED | PARTIAL`
- [x] Gateway poll `GET /api/v1/scan/{id}` (bukan timeout 30s untuk live)
- [ ] Docker sandbox: non-root image ada; allow-list di Python — **bukan** iptables penuh

## Fase 2 — Planner

- [x] Langkah dari hipotesis AST (deterministik; tanpa payload exploit)
- [x] `max_steps` (`NEX_RED_MAX_LIVE_STEPS`)
- [x] Prompt LLM verifier tetap tanpa permintaan payload exploit
- [ ] Planner LLM JSON bebas (masih deterministik)

## Fase 3 — HTTP evidence (MVP v5)

- [x] Route mutating tanpa sesi → 401/403 atau 200 tercatat
- [x] IDOR: user B tidak membaca objek user A (dua sesi lab atau token env)
- [x] Request tanpa `Authorization` ke `/api/telemetry` publik tercatat
- [x] Report: `live_verdict` (sast_only / confirmed / rejected / mitigated_by_nexus)
- [x] `live_checks_run` di hasil scan (bukan syarat benchmark Shannon)

## Fase 4 — Browser

- [x] Unggah gambar sah + 5 password vault salah di Chromium jika `NEX_RED_BROWSER=1` dan Playwright terpasang
- [x] Ban 5× tercatat sebagai `mitigated_by_nexus` bila teks blacklist muncul; PoW hotspot → `sast_only` (bukan temuan palsu)

## Fase 5 — Multi-agen

- [ ] Agen `recon` / `access` / `injection-hygiene` / `reporter`
- [ ] Satu agen gagal → `PARTIAL`, bukan crash

## Fase 6 — Parity

- [ ] Lab Juice Shop (self-hosted) atau setara
- [ ] Recall kelas AUTH/AUTHZ terukur
- [ ] `equal_to_shannon_strix` hanya true jika pintu live lulus

## Dilarang (selalu)

- [ ] Tidak ada wordlist exploit di git
- [ ] Tidak copy source Shannon/Strix ke `agents/`
- [ ] Tidak hardcode angka “mitigated 64000”
