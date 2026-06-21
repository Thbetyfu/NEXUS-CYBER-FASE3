# 🕹️ Command Center CLI Guide

Berikut adalah daftar perintah yang bisa digunakan oleh Admin SOC melalui antarmuka Command Center:

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
| `/simulate-attack [high/low]` | Mensimulasikan serangan siber ke sistem. |
| `@nexus [query]` | Melakukan query/tanya jawab konsultasi siber ke AI Reasoning. |
| `clear` | Membersihkan layar terminal SOC Command CLI. |

## Audit & Pengujian

Untuk memverifikasi dan menguji komponen keamanan, gunakan skrip pengujian berikut:

1. **Stress-test MTD & Gateway**:
   ```bash
   python scripts/test_mtd_defense.py
   ```

2. **Pengujian Pemulihan Mandiri (Self-Repair)**:
   ```bash
   python scripts/test_self_repair.py
   ```

3. **Simulator Skenario Krisis & Penyelamatan**:
   ```bash
   python scripts/rescue_scenario_simulator.py
   ```
