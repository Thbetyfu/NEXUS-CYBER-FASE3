# ROADMAP & SPRINT PLAN: NEXUS CYBER FASE 2

Dokumen ini mendefinisikan peta jalan strategis untuk merealisasikan lingkungan uji ketahanan (testbed) situs portofolio, verifikasi deployment, peningkatan terminal interaktif, estimasi kebutuhan sumber daya, dan fitur pelacakan penyerang (IP GeoIP Tracking).

---

## 🗺️ Rencana Sprint & Milestone

### 🚀 Sprint 1: Integrasi Web Portofolio & Uji Ketahanan (Password Vault)
* [x] **Task 1.1: Pengaturan Password & Tautan Hadiah**
  * Konfigurasi parameter `REWARD_PASSWORD` dan `REWARD_LINK` (tautan Shopee Kaget/Dana) secara dinamis di berkas `.env` dan `resistance_handlers.go`.
* [x] **Task 1.2: Aktivasi & Integrasi Proteksi Brute-Force**
  * Memvalidasi bahwa handler `rewardUnlockHandler` secara aktif menyimpan log percobaan salah ke database dan memicu `database.BanIP` setelah 5 kali gagal.
* [x] **Task 1.3: Alur User Flow Uji Ketahanan**
  * Alur: Pengunjung &rarr; Mengakses Portofolio &rarr; Berusaha membongkar/brute-force Vault &rarr; Percobaan dicatat oleh Reflex AI &rarr; Jika gagal >= 5 kali, IP diblokir di level Gateway &rarr; Tampilan dasbor Command Center mendeteksi aktivitas serangan.

### 📦 Sprint 2: Kesiapan Deployment & Analisis Performa
* [x] **Task 2.1: Audit Kesiapan Deploy (Docker-Compose)**
  * Melakukan audit integrasi port, variabel lingkungan, dan jaringan internal pada berkas `docker-compose.yml` agar sistem siap dideploy ke server VPS.
* [x] **Task 2.2: Estimasi Profil Performa CPU & RAM**
  * Menganalisis konsumsi memori minimum Go Gateway (ringan, ~15-30MB RAM) vs FastAPI AI Server (jauh lebih berat jika menjalankan model local). Rekomendasi alokasi RAM server untuk deployment stabil.

### 💻 Sprint 3: Interaktivitas Terminal CLI & Pelacakan Penetas (IP Tracking)
* [x] **Task 3.1: Peningkatan Konsol Terminal Command Center**
  * Menambahkan lebih banyak perintah interaktif atau auto-complete bantuan pada dasbor terminal agar terasa lebih taktis dan responsif.
* [x] **Task 3.2: Pelacakan Geografis IP Penetas (Threat GeoIP Lookup)**
  * Mengintegrasikan API pencarian lokasi IP (seperti `ip-api.com` atau `ipinfo.io`) ketika IP didaftarkan ke blacklist.
  * Menyimpan lokasi (Negara, Kota, Koordinat, ISP) ke database `intel_blacklists` dan menampilkannya secara langsung di peta visual dasbor.
