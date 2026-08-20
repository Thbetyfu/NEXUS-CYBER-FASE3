lokasi 

Catatan (2026-08-15): **pembayaran / webhook / Stripe / Midtrans jangan dikerjakan dulu** (permintaan pemilik). Setiap ubahan kode berikutnya wajib ikut `AGENTS.md` + `CHANGELOG.md` + dokumen hidup di `docs/README.md`.

1. dibuat menjadi sesuai uji coba dimana saya ingin di buat menjadi sesutu website uji ketahanan, jadi dimana website ini akan di deploy lalu Nexus cyber harus bisa mempertahankan website portofolio ini dari serangan cyber, sehingga kekuatan dari nexus cyber ini benar terbukti tetapi belum tau apa saja rencana yang harus di lakukan, dan saya ingin di website portofolionya di tambahkan untuk input gambar, di bagian paling bawah, "tambahkan foto foto kalian" coba pikirkan rencananya, bukti sudah berhasilnya adalah nanti akanada pasword disitu, lalu ketika masuk menggunakan pasword itu maka bisa mendapatkan link dimana link beruba hadiah beruba uang , linknya akan berupa shope kaget (tapi itu nanti akan di pikirkan), jadi yang butuh dikejrakna adlaha:
   - `[x]` set pasword (REWARD_PASSWORD=NexusAccessSecure2026!)
   - `[x]` set arsitektur dan user flownya (WAF Proxy -> Target Portfolio -> AVSE Sanitization + Vault Bruteforce protection + SOC Dashboard)
2. apakah nexus cyber ini sudah benar benar bisa di deploy?
   - `[x]` Ya, sudah diaudit dan diselaraskan pada docker-compose.yml (TARGET_BACKEND=http://portfolio:3002) dan siap dideploy di VPS / Railway (menggunakan external LLM API).
3. performa CPU dan RAM butuh berapa? apakah sudah optimal?
   - `[x]` Ya, profil performa didokumentasikan di docs/PERFORMANCE_ESTIMATION.md. Gateway sangat ringan (15-30MB RAM), LLM lokal membutuhkan minimal 4GB-8GB RAM (jika lokal), disarankan cloud LLM API untuk PaaS/Railway.

---

## 🚀 SPRINT ROADMAP: MULTI-TENANT DEDICATED SAAS & GLOBAL LICENSE LOCKOUT (NEXUS CYBER SAAS)

Rencana kerja strategis untuk mengubah seluruh infrastruktur Nexus Cyber menjadi sistem SOC (Security Operations Center) SaaS berbasis langganan yang dapat disewa secara mandiri oleh klien:

### 🏢 1. Modul Verifikasi Lisensi Global (Backend Layer)

* [X] **Task 1: Penyiapan Modul `internal/licensing`**
  * Buat pustaka otentikasi lisensi terpusat di sisi Go Gateway.
  * Tambahkan penanganan parameter variabel lingkungan `NEXUS_LICENSE_KEY`.
* [X] **Task 2: Penyiapan Handshake Rutin**
  * Jalankan goroutine asinkron yang melakukan verifikasi masa sewa secara berkala (misal: setiap 1 jam sekali) ke server lisensi pusat (`https://license.nexus-cyber.com/verify`).
* [X] **Task 3: Implementasi Fail-Secure Lockout**
  * Jika status lisensi `EXPIRED` atau `REVOKED`, gateway akan menangguhkan seluruh rute proxying atau mengembalikan kode pemblokiran total ke browser pengunjung.

### 🎭 2. Layar Pengunci Dasbor (Frontend Layer)

* [X] **Task 4: Dynamic License Guard (React Router Context)**
  * Deteksi status validitas lisensi dari respon backend REST/SSE API di dasbor Command Center.
* [X] **Task 5: Premium Dark Lockout Overlay**
  * Buat komponen modal overlay berukuran penuh (*full-screen unbypassable overlay*) berwarna gelap premium dengan teks peringatan: `"SISTEM DITANGGUHKAN: Masa sewa langganan Nexus Cyber Anda telah berakhir."`
  * Lindungi layar pengunci agar tidak dapat dilewati menggunakan manipulasi DOM atau inspeksi elemen.

### 📦 3. Orkestrasi Pendaftaran Otomatis (Infrastructure Layer)

* [ ] **Task 6: Dynamic Provisioner Script (`scripts/provisioner.sh`)**

  * Buat skrip asinkron yang meluncurkan kontainer Docker-Compose baru secara terisolasi (Gateway + Dashboard + PostgreSQL) untuk setiap penyewa (*tenant*) baru.
* [ ] **Task 7: Integrasi Midtrans/Stripe Webhook**

  * Sambungkan gerbang pembayaran otomatis ke skrip penyediaan kontainer untuk aktivasi instan setelah klien berhasil melakukan pembayaran bulanan.

* [ ] **Task 8: Back-office super-admin (saat dijual — F-10)**

  * Di portal SaaS (`playground/NEXUS-CYBER-WEBISTE-SAAS`), bukan di `nexus-admin-dashboard`.
  * Owner/developer saja: jumlah user, daftar situs, sisa masa aktif. Loopback/VPN; token terpisah dari `NEXUS_ADMIN_TOKEN`.
  * Jangan kerjakan di sprint lab; lihat `docs/PRD.md` F-10 dan `CHANGELOG.md` Planned.

  buat versi Auto deploynya jika di jalankan di server on promise, sehingga mudah dan tak butuh banyak lagi maintenece dan mudah di pahami oleh orang awam

ingat ini ketika di sserang harusnya bisa mengetahuai lokasi penyerang dimana dan tidak tertipu oleh VPN, jadi tolong di selesaian juga apakah ini bisa memberitahu lokasi penyerang dan memberitahukannya di telegram ? dan ini saya mau akan menjadi AI gaent bukan hanya AI biasa
