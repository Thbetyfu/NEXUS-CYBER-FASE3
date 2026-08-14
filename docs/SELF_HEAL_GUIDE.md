# Panduan Self-Heal

Integrity monitor di `nexus-core-gateway/internal/repair` memakai **BLAKE3**, baseline di RAM, restore folder yang dikonfigurasi. Bukan proteksi RCE di memori proses, bukan PITR database.

---

Nexus Cyber dilengkapi dengan modul keamanan otonom bernama **System Integrity Monitor (Self-Heal)**. Fitur ini dirancang untuk mendeteksi manipulasi berkas situs web secara instan (<10ms) dan mengembalikannya ke kondisi asli tanpa memerlukan campur tangan teknisi manusia.

---

## 1. Mekanisme Kerja Arsitektur Self-Heal

Modul pemulihan ini berjalan secara asinkron sebagai thread latar belakang (*background worker*) pada WAF Gateway:

```text
[ Berkas Frontend ] ◄── (Kondisi Asli) ──┐
       │                                 │
  (Pemindaian berkala)             (Restorasi Instan <10ms)
       │                                 │
       ▼                                 │
[ Bandingkan Hash BLAKE3 ] ── (Berbeda) ─┘
```

1.  **Perekaman Baseline (Startup)**:
    Saat WAF Gateway pertama kali dinyalakan, modul akan membaca seluruh isi file di direktori target secara rekursif, menghitung tanda tangan digitalnya menggunakan algoritma **BLAKE3 hashing**, dan menyimpan salinan isi file tersebut langsung di dalam RAM (Secure Memory Buffer).
2.  **Pemindaian Berkala (Rescan)**:
    Setiap interval waktu tertentu (default: 2 detik), sistem memindai kembali direktori target.
3.  **Tindakan Restorasi Otomatis**:
    -   **File Dimodifikasi**: Jika isi file diubah (misalnya peretas mengganti kode HTML/JS), hash BLAKE3 akan berbeda. Sistem langsung menimpa file tersebut menggunakan salinan asli dari RAM buffer.
    -   **File Dihapus**: Jika file dihapus oleh peretas, sistem mendeteksi ketiadaan file dan langsung membuat ulang file tersebut dari RAM buffer.
    -   **File Tidak Dikenal (Webshell)**: Jika peretas berhasil mengunggah berkas baru (misalnya file backdoor `webshell.php`), sistem mendeteksi berkas yang tidak terdaftar di memori awal dan langsung menghapusnya secara permanen.

---

## 2. Cara Menguji Fitur Self-Heal (Live Test)

Anda dapat melakukan simulasi serangan peretasan untuk melihat bagaimana sistem memulihkan dirinya sendiri secara otomatis:

### Prasyarat
Pastikan WAF Gateway sedang berjalan. Jika belum, jalankan perintah start dev server.

### Skenario 1: Simulasi Web Defacement (Modifikasi File)
1.  Buka folder target yang dipantau (misalnya: `d:\0. Kerjaan\Nexus-Cyber\Nexus-Cyber-Fase2\Portfolio-website\dist`).
2.  Buka file `index.html` menggunakan editor teks (Notepad / VS Code).
3.  Ubah teks di dalamnya secara acak (misal mengganti judul halaman), lalu simpan berkas tersebut.
4.  **Hasil**: Dalam waktu kurang dari 2 detik, file `index.html` akan kembali ke isi semula. Jika Anda melihat log di terminal WAF Gateway, akan muncul baris pemberitahuan:
    `[SELF-HEAL] [INTEGRITY_VIOLATION] Restored MODIFIED file: index.html | Recovery: 1.5ms`

### Skenario 2: Simulasi Sabotase (Penghapusan File)
1.  Masuk ke direktori `dist` dari portfolio website Anda.
2.  Hapus file `index.html` atau file gambar aset di dalamnya secara permanen.
3.  **Hasil**: File yang baru saja Anda hapus akan langsung muncul kembali di folder tersebut secara otomatis. Log terminal WAF Gateway akan memunculkan pesan:
    `[SELF-HEAL] [INTEGRITY_VIOLATION] Restored DELETED file: index.html | Recovery: 2.1ms`

### Skenario 3: Simulasi Unggah Backdoor (Anti-Webshell)
1.  Buat file baru di dalam direktori `dist` dengan nama `backdoor.php` atau `hack.txt` berisi kode acak.
2.  **Hasil**: File baru tersebut akan dihapus secara instan dalam hitungan detik. Log terminal WAF Gateway akan memunculkan pesan:
    `[SELF-HEAL] Removed unauthorized file: backdoor.php | Latency: 0.8ms`

---

## 3. Konfigurasi Direktori yang Dipantau

Direktori yang dipantau dikonfigurasi melalui berkas **[.env](file:///d:/0.%20Kerjaan/Nexus-Cyber/Nexus-Cyber-Fase2/nexus-core-gateway/.env)** pada variabel:

```env
INTEGRITY_MONITORED_DIR=../Portfolio-website/dist
```

Variabel ini menunjuk secara relatif ke folder web asli yang sedang disajikan kepada publik. Jika Anda ingin melindungi direktori lain (seperti folder static, template backend, atau landing page), Anda hanya perlu mengganti nilai variabel ini ke direktori tujuan dan melakukan restart pada WAF Gateway.
