# Jalan B — Checklist eksekusi

Sumber lengkap: [PATH_B_NATIVE_ENGINE.md](./PATH_B_NATIVE_ENGINE.md).

Centang hanya jika ada bukti di kode/tes/report, bukan niat.

## Fase 0 — Kontrak

- [ ] RoE + `NEX_RED_LIVE_TARGET` di `.env.example`
- [ ] Staging portfolio + gateway, bukan produksi klien
- [ ] Model NEX-AI diputuskan (lokal / fallback API)

## Fase 1 — Job & sandbox

- [ ] State `QUEUED | RUNNING | COMPLETED | FAILED | PARTIAL`
- [ ] Gateway poll `GET /api/v1/scan/{id}` (bukan timeout 30s untuk live)
- [ ] Docker sandbox: non-root, allow-list jaringan

## Fase 2 — Planner

- [ ] JSON langkah dari hipotesis AST
- [ ] `max_steps` / `max_minutes`
- [ ] Prompt tanpa permintaan payload exploit

## Fase 3 — HTTP evidence (MVP v5)

- [ ] Route mutating tanpa sesi → 401/403 tercatat
- [ ] IDOR: user B tidak membaca objek user A
- [ ] Request tanpa `Authorization` gagal di rute terlindungi
- [ ] Report: SAST vs `dynamically confirmed`
- [ ] `live_checks_run ≥ 3` di benchmark

## Fase 4 — Browser

- [ ] Login vault + upload gambar (alur sah) di sandbox
- [ ] Ban 5× password salah tercatat

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
