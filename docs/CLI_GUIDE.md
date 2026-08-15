# Command Center CLI Guide

Pembaruan 2026-08-15. Perintah SOC lewat dasbor ke **`127.0.0.1:8081`** (`POST`, sesi operator). Bukan port WAF `:8080`.

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
python NEX-RED/nexred.py scan -m hybrid -u http://127.0.0.1 -r . --no-llm
python NEX-RED/nexred.py bridge -p 3004
```

Dari `NEX-RED/`: `python -m unittest tests.test_nexred tests.test_live_http tests.test_browser tests.test_benchmark`

## 4. Tes lain

```bash
python scripts/tests/nexus_system_audit.py
python scripts/tests/test_mtd_shuffle.py
python scripts/tests/test_self_repair.py
```
