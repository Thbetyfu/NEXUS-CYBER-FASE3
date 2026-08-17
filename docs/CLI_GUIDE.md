# Command Center CLI Guide

Pembaruan 2026-08-16. Perintah SOC lewat dasbor ke **`127.0.0.1:8081`** (`POST`, sesi operator). Bukan port WAF `:8080`.

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
| `/sub [domain]` | Langganan lisensi domain |
| `/unsub [domain]` | Cabut langganan |
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
```

`llm-eval` hanya `nex-ai-protect` (model milik Nexus). Tidak memakai Qwen/Llama meski ada di Ollama.
Benchmark klasifikasi HTTP: `python NEX-AI/evaluation/run_benchmark.py --model nex-ai-reflex`.
Dataset lab: `python NEX-AI/scripts/collect_lab_dataset.py` (lalu ulang setelah ada `nexus_traffic.log`).

Juice Shop lab (loopback `:3003`): `NEX-RED/lab/juice-shop/START.bat` lalu `lab-juice`. Skor kelas, bukan pentest Shannon.
Sandbox opsional: `NEX-RED/sandbox/START.bat` (uid 10001, tanpa Docker socket; bukan kunci internet kernel).

Dari `NEX-RED/`: `python -m unittest tests.test_nexred tests.test_live_http tests.test_browser tests.test_benchmark tests.test_juice_lab tests.test_crew tests.test_sandbox tests.test_planner tests.test_llm_eval tests.test_modelfiles`

## 4. Tes lain

```bash
python scripts/tests/nexus_system_audit.py
python scripts/tests/test_mtd_shuffle.py
python scripts/tests/test_self_repair.py
```
