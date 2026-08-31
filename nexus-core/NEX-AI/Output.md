> **Arsip / submodul NEX-AI** — bukan kontrak produk GaaS utama. Lihat [docs/PRODUCT_MODEL.md](../docs/PRODUCT_MODEL.md).

---

# SPESIFIKASI OUTPUT MODEL AI: NEX-AI
## STRUKTUR KELUARAN, KATEGORI DETEKSI, DAN SCENARIO PENALARAN FORENSIK

Dokumen ini mendefinisikan keluaran (output) yang diharapkan dari model NEX-AI. Dokumen ini menjelaskan kapabilitas analisis ancaman, skema JSON terstruktur yang dihasilkan, serta contoh analisis riil untuk berbagai skenario serangan siber.

---

## 1. Skema Keluaran Standar (Standard Output Schema)

NEX-AI wajib menghasilkan respons teks dalam bentuk string JSON valid yang dapat langsung di-parse oleh WAF Gateway (Golang) dan disajikan pada Dasbor Command Center SOC (Next.js).

### Format Struktur JSON
```json
{
  "status": "BENIGN | SUSPICIOUS | MALICIOUS",
  "threat_score": 0.00,
  "attack_type": "SQL_INJECTION | XSS | PATH_TRAVERSAL | COMMAND_INJECTION | ZERO_DAY_BYPASS | NONE",
  "reason": "Penjelasan logis forensik tentang deteksi ancaman"
}
```

---

## 2. Kapabilitas Deteksi Skenario Serangan

Model NEX-AI dilatih khusus untuk mendeteksi dan menjelaskan 5 skenario serangan siber utama berikut:

### 2.1 SQL Injection (SQLi)
*   **Deteksi**: Payload yang mencoba memanipulasi kueri database (tautologi, union query, blind SQLi, stacked queries).
*   **Contoh Input**: `POST /login HTTP/1.1\n\nusername=admin' OR '1'='1`
*   **Hasil Output**:
    ```json
    {
      "status": "MALICIOUS",
      "threat_score": 0.98,
      "attack_type": "SQL_INJECTION",
      "reason": "Mendeteksi kueri tautologi OR 1=1 yang digunakan untuk melakukan bypass otentikasi login database."
    }
    ```

### 2.2 Cross-Site Scripting (XSS)
*   **Deteksi**: Script berbahaya yang disisipkan ke dalam input untuk dieksekusi di browser korban (HTML tags injection, event handlers injection, javascript URI).
*   **Contoh Input**: `GET /search?q=<script>alert(document.cookie)</script>`
*   **Hasil Output**:
    ```json
    {
      "status": "MALICIOUS",
      "threat_score": 0.95,
      "attack_type": "XSS",
      "reason": "Mendeteksi tag script berbahaya yang mencoba mencuri cookie browser pengguna melalui teknik reflected XSS."
    }
    ```

### 2.3 Path Traversal / Local File Inclusion (LFI)
*   **Deteksi**: Upaya mengakses direktori sensitif di luar root direktori web server menggunakan manipulasi path relatif (`../`).
*   **Contoh Input**: `GET /view?file=../../../../etc/passwd`
*   **Hasil Output**:
    ```json
    {
      "status": "MALICIOUS",
      "threat_score": 0.97,
      "attack_type": "PATH_TRAVERSAL",
      "reason": "Mendeteksi urutan directory traversal ../ yang mencoba mengakses file sistem sensitif /etc/passwd secara ilegal."
    }
    ```

### 2.4 Command Injection (RCE)
*   **Deteksi**: Payload yang mencoba menyisipkan perintah shell sistem operasi pada aplikasi target.
*   **Contoh Input**: `POST /ping HTTP/1.1\n\nip=127.0.0.1; cat /etc/passwd`
*   **Hasil Output**:
    ```json
    {
      "status": "MALICIOUS",
      "threat_score": 0.99,
      "attack_type": "COMMAND_INJECTION",
      "reason": "Mendeteksi penyisipan karakter pemisah perintah shell ; untuk menjalankan perintah eksekusi sistem secara sewenang-wenang."
    }
    ```

### 2.5 Zero-Day Bypass (Evasive Obfuscation)
*   **Deteksi**: Upaya peretasan yang menggunakan teknik enkripsi ganda, manipulasi karakter whitespace, atau penyandian non-standar untuk melewati filter regex WAF tradisional.
*   **Contoh Input**: `GET /products?id=%2527%2520OR%25201%253D1`
*   **Hasil Output**:
    ```json
    {
      "status": "MALICIOUS",
      "threat_score": 0.92,
      "attack_type": "ZERO_DAY_BYPASS",
      "reason": "Mendeteksi penggunaan double URL encoding untuk menyamarkan karakter kueri SQL, mengindikasikan taktik bypass deteksi regex."
    }
    ```

### 2.6 Lalu Lintas Normal (Benign Traffic)
*   **Deteksi**: Request normal dari pengguna sah dengan struktur HTTP valid.
*   **Contoh Input**: `GET /assets/logo.png HTTP/1.1\nHost: target.com\nUser-Agent: Mozilla/5.0`
*   **Hasil Output**:
    ```json
    {
      "status": "BENIGN",
      "threat_score": 0.05,
      "attack_type": "NONE",
      "reason": "Lalu lintas normal dari pengguna sah dengan struktur HTTP valid."
    }
    ```

---

## 3. Pemanfaatan Output pada Komponen Nexus Cyber

Hasil JSON terstruktur dari NEX-AI dikonsumsi oleh subsistem keamanan lainnya:

1.  **Keputusan Blokir Gateway**: Jika `status` bernilai `MALICIOUS` dan `threat_score` > 0.85, Go Gateway langsung memasukkan IP pengirim ke Redis Blacklist dan memblokirnya di tingkat eBPF kernel selama 24 jam.
2.  **Streaming Alert Dashboard**: Data `attack_type` dan `reason` dikirimkan secara langsung (real-time streaming) ke Dasbor Command Center SOC untuk divisualisasikan dalam bentuk terminal log forensik siber.
3.  **Audit Trail Keamanan**: JSON ini disimpan permanen di database PostgreSQL sebagai data laporan audit kepatuhan regulasi keamanan informasi ISO 27001.
