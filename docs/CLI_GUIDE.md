# Command Center CLI Guide

**Pembaruan:** 2026-08-29  
**Model produk:** [PRODUCT_MODEL.md](./PRODUCT_MODEL.md) — Command Center = **kokpit operator** GaaS, bukan produk ke pemilik risiko kanal.

Perintah SOC lewat dasbor ke **`127.0.0.1:8081`** (`POST`, sesi operator). Bukan port WAF `:8080`.

## 1. Konsol SOC (Xterm.js)

Perintah dikirim ke `/api/cli/execute` di control plane. Daftar di bawah mengikuti handler CLI gateway; jika perintah tidak dikenali, terminal menampilkan bantuan.

| Perintah | Peran |
| :--- | :--- |
| `/help` | Bantuan |
| `/status` | Kesehatan gateway / MTD |
| `/stats` | Trafik allowed / blocked / honeypot |
| `/shuffle` | Rotasi MTD manual (origin HTTP) |
| `/audit` | Audit kepatuhan MTD |
| `/ban [IP]` | Blacklist |
| `/unban [IP]` | Cabut blacklist |
| `/sub [domain]` | Langganan lisensi domain (**lab/legacy** — bukan jual GaaS v1) |
| `/unsub [domain]` | Cabut langganan (**lab/legacy**) |
| `/honeystats` | Statistik honeypot |
| `/patches` | Virtual patch di memori |
| `/wargame [scenario]` | Memicu NEX-RED lewat adapter (bukan swarm pentest) |
| `@nexus [query]` | Query reasoning (jika model dikonfigurasi) |
| `clear` | Bersihkan layar |

## 2. Binary gateway

Subperintah `license` / `audit` / `sim` mengikuti `nexus-core-gateway/cmd`. Jalankan dari direktori modul Go. Jangan menganggap semua subperintah ada di image Docker lab.

## 3. NEX-RED

Black-box = probe JSON jinak + recon header, **bukan** payload exploit.

```bash
python NEX-RED/nexred.py scan -m whitebox -r .
python NEX-RED/nexred.py scan -m hybrid -u http://portfolio.nexus-lab.test -r . --no-llm
python NEX-RED/nexred.py lab-juice
python NEX-RED/nexred.py benchmark --live
python NEX-RED/nexred.py llm-eval
python NEX-RED/nexred.py sandbox
python NEX-RED/nexred.py bridge -p 3004
python NEX-RED/nexred.py job run --title "Lab wasit" -u http://portfolio.nexus-lab.test --autonomy L0
python NEX-RED/nexred.py job approve JOB-XXXXXXXX --operator "nama"
python NEX-RED/nexred.py job show JOB-XXXXXXXX
python NEX-RED/nexred.py job export JOB-XXXXXXXX --format md
python NEX-RED/nexred.py job schedule-add --title "Weekly" -u http://127.0.0.1:8080 --interval-hours 168
```

Job Cowork disinkronkan ke PostgreSQL jika gateway `:8081` + `POSTGRES_DSN` aktif (`NEXUS_CONTROL_PLANE_URL`, default `http://127.0.0.1:8081`). File backup: `NEX-RED/jobs/data/` (**gitignore** — jangan `git add` `JOB-*.json`). Job named-host bind TCP ke `NEXUS_GATEWAY_URL` (`http://127.0.0.1:8080`) + `Host`. Browser lab: `set NEX_RED_BROWSER=1` lalu `NEX-RED/INSTALL-PLAYWRIGHT.bat` (Chromium di drive repo, sama dengan `D:\NEXUS-CYBER-FASE3` di lab ini). Gallery/vault named-host butuh `NEX_RED_LAB_SESSION_TOKEN` = `NEXUS_LAB_SESSION_TOKEN` di gateway (bukan skip PoW pengunjung). Binary hilang = skip jujur, bukan PARTIAL.

Digest insiden (operator, satu workspace — bukan `domain=all`):

```bash
curl -s "http://127.0.0.1:8081/api/incidents/digest?domain=portfolio.nexus-lab.test&hours=24&format=md"
```

`llm-eval` hanya `nex-ai-protect` (model milik Nexus). Tidak memakai Qwen/Llama meski ada di Ollama.
Benchmark klasifikasi HTTP: `python NEX-AI/evaluation/run_benchmark.py --model nex-ai-reflex`.
Dataset lab: `python NEX-AI/scripts/collect_lab_dataset.py` (lalu ulang setelah ada `nexus_traffic.log`).

Juice Shop lab (loopback `:3003`): `NEX-RED/lab/juice-shop/START.bat` lalu `lab-juice`. Skor kelas, bukan pentest Shannon.
Sandbox opsional: `NEX-RED/sandbox/START.bat` (uid 10001, tanpa Docker socket; bukan kunci internet kernel).

Dari `NEX-RED/`: `python -m unittest tests.test_nexred tests.test_job_cowork tests.test_live_http tests.test_waf_bind tests.test_browser tests.test_benchmark tests.test_juice_lab tests.test_crew tests.test_sandbox tests.test_planner tests.test_llm_eval tests.test_modelfiles`

## 4. Tes lain

```bash
python scripts/tests/nexus_system_audit.py
python scripts/tests/test_mtd_shuffle.py
python scripts/tests/test_self_repair.py
```

Live self-heal: hanya jika `INTEGRITY_MONITORED_DIR` menunjuk folder lokal. Default deploy = kosong (origin Vercel tidak di-restore). Tanpa gateway, skrip me-skip. Tes unit Go: `go test ./internal/repair/` di `nexus-core-gateway`.
