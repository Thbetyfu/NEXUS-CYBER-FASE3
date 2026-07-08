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

---

## 💻 Terminal Interaktif Command Center (Xterm.js Engine)

Mulai versi 13.2, antarmuka terminal Command Center menggunakan emulator **Xterm.js** berkinerja tinggi, yang menggantikan baris masukan teks biasa. Terminal ini memiliki kemampuan:

1. **Dukungan Key Hooks & Shortcuts**:
   * Menangkap ketukan kunci secara langsung (fokus instan pada area terminal).
   * **Backspace**: Menghapus karakter input secara fungsional.
   * **Arrow Up/Down**: Menavigasi riwayat perintah (*command history*) dari memori `localStorage` admin.
2. **Tab Autocomplete**:
   * Menekan tombol **Tab** akan secara otomatis mencocokkan input dengan perintah terdaftar dan melakukan autocompletion langsung pada prompt.
3. **ANSI Color Rendering**:
   * Setiap output logs dan telemetri yang mengalir dari Server-Sent Events (SSE) dikonversi secara dinamis menjadi kode warna ANSI untuk mempermudah identifikasi (misal: warna hijau untuk `[PASS]` dan merah tebal untuk `[FAIL]`).
4. **Command Execution Output**:
   * Command `clear` akan memicu pembersihan total layar terminal virtual secara instan.
   * Perintah umum akan menampilkan output aslinya langsung di baris konsol.
