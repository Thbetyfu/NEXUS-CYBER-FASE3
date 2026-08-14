# 🕹️ Command Center CLI Guide

Berikut adalah daftar perintah yang bisa digunakan oleh Admin SOC melalui antarmuka Command Center dan Terminal Backend:

## 1. Perintah Konsol SOC Dashboard (Xterm.js Terminal)

| Perintah | Deskripsi Teknis |
| :--- | :--- |
| `/help` | Menampilkan daftar perintah bantuan yang tersedia. |
| `/status` | Memeriksa status rotasi port MTD & kesehatan backend. |
| `/stats` | Menampilkan total trafik allowed, blocked, dan honeypot. |
| `/shuffle` | Memicu rotasi port backend MTD secara manual seketika. |
| `/audit` | Menjalankan stress-test kepatuhan MTD (17 checks). |
| `/ban [IP]` | Memasukkan IP penyerang ke daftar hitam permanen. |
| `/unban [IP]` | Memulihkan kembali IP dari daftar hitam. |
| `/sub [domain]` | Mendaftarkan lisensi premium SaaS PACS untuk klien. |
| `/unsub [domain]` | Mencabut lisensi premium dan mengunci situs klien. |
| `/honeystats` | Menampilkan log IP penyerang yang terjebak di honeypot. |
| `/patches` | Menampilkan daftar virtual patch antibodi yang aktif di RAM. |
| `/wargame [scenario]` | Memicu simulasi perang siber live melalui engine **NEX-RED**. |
| `@nexus [query]` | Melakukan query/tanya jawab konsultasi siber ke AI Reasoning. |
| `clear` | Membersihkan layar terminal SOC Command CLI. |

---

## 2. Perintah Binary Gateway Go (`gateway`)

| Perintah | Deskripsi Teknis |
| :--- | :--- |
| `gateway license generate` | Membuat Kunci Lisensi Terenkripsi HMAC (5-Tier, CPU Cores, B2G PO). |
| `gateway license verify` | Memverifikasi integritas & batas lisensi secara offline. |
| `gateway audit export` | Menjana Laporan Audit Kepatuhan (ISO 27001, PCI-DSS, UU PDP) format Markdown/JSON. |
| `gateway audit sync-bssn` | Sinkronisasi & injeksi memori feed ancaman siber kolektif BSSN/ID-CERT. |
| `gateway sim` | Memicu simulasi mitigasi perang siber live (DDoS, SQLi, Defacement). |

---

## 3. Perintah Autonomous Red Team (`NEX-RED CLI`)

| Perintah | Deskripsi Teknis |
| :--- | :--- |
| `python NEX-RED/nexred.py scan -m hybrid` | Menjalankan audit White-Box (kode) & Black-Box (dinamis) sekaligus. |
| `python NEX-RED/nexred.py scan -m whitebox -r .` | Menjalankan audit kode sumber lokal (AST & Route mapping). |
| `python NEX-RED/nexred.py scan -m blackbox -u http://127.0.0.1:8080` | Menjalankan penetrasi dinamis terhadap URL endpoint aktif. |
| `python NEX-RED/nexred.py scan -s sqli` | Menjalankan skenario serangan bertarget khusus (SQLi / DDoS / Defacement). |
| `python NEX-RED/nexred.py bridge -p 3002` | Menjalankan REST API Daemon untuk interkoneksi Dasbor & Gateway. |

---

## 4. Pengujian & Verifikasi Otomatis

Untuk memverifikasi modul secara terisolasi:

```bash
# 1. Menjalankan Unit Test NEX-RED
python -m unittest discover -s NEX-RED/tests

# 2. Menjalankan Audit Sistem Nexus
python scripts/tests/nexus_system_audit.py

# 3. Menjalankan Uji Moving Target Defense
python scripts/tests/test_mtd_shuffle.py

# 4. Menjalankan Uji Self-Repair Rollback
python scripts/tests/test_self_repair.py
```
