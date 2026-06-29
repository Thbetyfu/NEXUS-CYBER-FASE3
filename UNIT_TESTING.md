# Panduan Unit Testing & Verifikasi Proyek Nexus Cyber (Fase 2)

Dokumen ini menjelaskan seluruh skenario pengujian unit (*Unit Testing*) otomatis yang telah dibuat untuk mengamankan fungsionalitas WAF Gateway, serta tata cara melakukan verifikasi penuh pada komponen backend dan frontend.

---

## 1. Daftar Pengujian Unit Otomatis (Go Backend)

Backend Go WAF Gateway dilengkapi dengan rangkaian pengujian otomatis di bawah package `internal` dan `cmd/gateway` untuk mengamankan gerbang lalu lintas jaringan.

### 1.1 Modul Proxy, PACS & CSRF Protection (`internal/proxy`)
Pengujian di dalam file [pacs_test.go](file:///d:/0. Kerjaan/Nexus-Cyber/Nexus-Cyber-Fase2/nexus-core-gateway/internal/proxy/pacs_test.go), [middleware_test.go](file:///d:/0. Kerjaan/Nexus-Cyber/Nexus-Cyber-Fase2/nexus-core-gateway/internal/proxy/middleware_test.go), dan [provisioner_test.go](file:///d:/0. Kerjaan/Nexus-Cyber/Nexus-Cyber-Fase2/nexus-core-gateway/internal/proxy/provisioner_test.go):

- **`TestCsrfShield` (Double-Submit Cookie Verification):**
  - Memastikan request `GET` menyisipkan cookie `nexus_csrf` secara otomatis.
  - Memastikan request `POST` diblokir (`HTTP 403 Forbidden`) jika tidak mengirim token CSRF atau menggunakan token yang tidak cocok.
  - Memastikan request `POST` lolos (`HTTP 200 OK`) ketika cookie dan header token `X-CSRF-Token` cocok.
  - Memastikan bypass validasi pada rute pengecualian seperti `/api/verify-session`.
- **`TestGenerateRandomKey`:**
  - Memverifikasi panjang dan tingkat keacakan kunci enkripsi XOR dinamis yang dibuat per request.
- **`TestRandomVarName`:**
  - Memastikan generator nama variabel JavaScript acak menghasilkan nama variabel yang valid menurut sintaksis peramban (diawali huruf/underscore).
- **`TestObfuscateHTML`:**
  - Memastikan visual HTML asli terobfuskasi penuh (tidak mengandung teks mentah sensitif) dan terbungkus script engine decrypter.
- **`TestXOREncryption`:**
  - Menguji keakuratan enkripsi dan dekripsi XOR byte-by-byte menggunakan kunci acak.
- **`TestFindFreePort`:**
  - Memastikan fungsi pendeteksi port TCP bebas (`FindFreePort`) bekerja dengan benar untuk alokasi port kontainer tenant baru.
- **`TestRunProvisionerInvalidAction`:**
  - Memverifikasi penanganan galat argumen pada orkestrator kontainer jika dikirimkan aksi kosong.

### 1.2 Modul RASP (Runtime Application Self-Protection) (`internal/rasp`)
Pengujian di dalam file [monitor_test.go](file:///d:/0. Kerjaan/Nexus-Cyber/Nexus-Cyber-Fase2/nexus-core-gateway/internal/rasp/monitor_test.go):

- **`TestRASPPrevention`:**
  - Menjalankan monitor RASP background loop.
  - Melahirkan *child process* ilegal terkontrol (`cmd.exe` di Windows / `sh` di Linux).
  - Memverifikasi RASP mendeteksi proses anak tersebut dan langsung membunuhnya secara paksa dalam waktu **sub-milidetik (<1ms)**.
  - Memverifikasi rekaman insiden dikirimkan ke log telemetri AI SOC.

### 1.3 Modul Self-Repair & Integritas File (`internal/repair`)
Pengujian di dalam file [monitor_test.go](file:///d:/0. Kerjaan/Nexus-Cyber/Nexus-Cyber-Fase2/nexus-core-gateway/internal/repair/monitor_test.go):

- **`TestIntegrityMonitorRestoreAndPurge`:**
  - Memantau folder pengujian secara periodik dengan hashing **BLAKE3** yang super cepat.
  - **Skenario Modifikasi:** Mengubah isi file baseline visual (web defacement), memverifikasi pemulihan instan ke kondisi steril.
  - **Skenario Penghapusan:** Menghapus file baseline visual, memverifikasi pembuatan ulang file steril otomatis.
  - **Skenario File Ilegal:** Menambahkan file tidak dikenal (simulasi web-shell), memverifikasi file tersebut langsung dihapus paksa secara instan.

### 1.4 Modul Handlers & Autoban IP (`cmd/gateway`)
Pengujian di dalam file [resistance_handlers_test.go](file:///d:/0. Kerjaan/Nexus-Cyber/Nexus-Cyber-Fase2/nexus-core-gateway/cmd/gateway/resistance_handlers_test.go):

- **`TestRewardUnlockAutoban`:**
  - Menguji counter brute force sandi reward galeri portofolio.
  - Memastikan percobaan salah ke-1 hingga ke-4 ditolak dengan status `HTTP 401 Unauthorized`.
  - Memastikan percobaan salah ke-5 langsung memicu **Autoban IP** (`HTTP 403 Forbidden`) dan mendaftarkannya ke RAM lokal serta eBPF stub.
  - Memverifikasi request berikutnya dari IP terban langsung ditolak di layer awal.
  - Memverifikasi akses dibuka kembali dan tautan reward diberikan setelah dilakukan `Unban` dan memasukkan password yang benar.

---

## 2. Cara Menjalankan Pengujian (Testing Execution)

### 2.1 Menjalankan Seluruh Unit Test (Backend Go)
Buka terminal pada direktori `nexus-core-gateway` dan eksekusi perintah berikut:

```bash
go test -v ./internal/proxy ./internal/rasp ./internal/repair ./cmd/gateway
```

### 2.2 Menjalankan Tes pada Paket Tertentu
Jika ingin memverifikasi satu paket spesifik saja:

- **Hanya Modul RASP:**
  ```bash
  go test -v ./internal/rasp
  ```
- **Hanya Modul Self-Repair (BLAKE3):**
  ```bash
  go test -v ./internal/repair
  ```
- **Hanya Modul CSRF & PACS:**
  ```bash
  go test -v ./internal/proxy
  ```
- **Hanya Modul Autoban Handler:**
  ```bash
  go test -v ./cmd/gateway
  ```

---

## 3. Verifikasi Kompilasi Produksi (Frontend)

Untuk memastikan integrasi type-safety TypeScript, Zod Schema, dan transmisi token CSRF tidak merusak kode build produksi client:

### 3.1 Verifikasi Admin Dashboard (Next.js)
Jalankan kompilasi produksi Next.js untuk memverifikasi TypeScript check dan static generation:
```bash
cd nexus-admin-dashboard
npm run build
```

### 3.2 Verifikasi Portofolio Website (Vite + React)
Jalankan kompilasi aset statis Vite:
```bash
cd Portfolio-website
npm run build
```
