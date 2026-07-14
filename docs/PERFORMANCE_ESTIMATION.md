# Estimasi Profil Performa Resource: Nexus Cyber WAF & AI

Dokumen ini mendefinisikan estimasi profil performa CPU & RAM untuk modul gerbang pertahanan otonom (WAF Gateway) dan server kecerdasan buatan (LLM/Ollama) demi menjamin stabilitas deployment di lingkungan produksi (VPS / Cloud).

---

## 📊 1. Profil Konsumsi Resource (Per Komponen)

| Komponen | Bahasa / Stack | RAM (Idle) | RAM (Load Tinggi) | Karakteristik CPU |
| :--- | :--- | :--- | :--- | :--- |
| **Go WAF Gateway** | Golang (Native) | ~15 - 25 MB | ~80 - 150 MB | Sangat efisien, rata-rata <1-3% CPU core. |
| **Admin SOC Dashboard** | Next.js (Node.js) | ~50 - 60 MB | ~120 - 200 MB | Sedang, hanya aktif saat memuat grafik/data SSE. |
| **Redis Cache** | C (Redis Alpine) | ~5 - 10 MB | ~20 - 50 MB | Sangat rendah, sub-milidetik. |
| **PostgreSQL Database**| SQL (Postgres Alpine)| ~30 - 50 MB | ~150 - 300 MB | Ringan, terindeks secara optimal untuk forensik. |
| **Caddy Edge Router** | Go (Caddy Alpine) | ~15 - 20 MB | ~50 - 100 MB | Sangat rendah, menangani SSL otomatis secara efisien. |
| **Target Portfolio Web**| Go (Backend) | ~10 - 15 MB | ~40 - 80 MB | Sangat rendah. |
| **Local LLM (Ollama)** | C++ (Llama.cpp) | ~20 - 40 MB | **~2.2 - 2.5 GB** | **Sangat tinggi (100% dari 2-4 Cores)** saat melakukan inferensi di CPU fallback. |

---

## ⚙️ 2. Pilihan Skenario Server & Kebutuhan Biaya

### Skenario A: Full Local AI (VPS Mandiri - DigitalOcean / Hetzner)
Menjalankan seluruh container (termasuk Ollama + model nex-ai Q4_K_M) secara lokal di satu server VPS.
*   **Minimum Spek**: 2 Cores CPU, **4 GB RAM** (Sangat mepet, rawan OOM jika traffic ramai).
*   **Rekomendasi Spek**: **4 Cores CPU, 8 GB RAM**, SSD storage minimum 25 GB.
*   **Estimasi Biaya**: ~$15 - $24 / bulan.
*   **Kelebihan**: Privasi data 100% lokal, tidak ada biaya API per token.

### Skenario B: Server Ringkas + Cloud LLM API (Railway / Cloud Run)
Menyewa server PaaS (seperti Railway) untuk menjalankan WAF Gateway, Dashboard, Postgres, & Redis. Inferensi AI diarahkan secara eksternal menggunakan model API cloud (seperti OpenRouter / DeepSeek / Groq).
*   **Minimum Spek**: **512 MB - 1 GB RAM** untuk Gateway & Dashboard (Sangat murah!).
*   **Rekomendasi Spek**: 2 GB RAM (untuk semua layanan database & dashboard).
*   **Estimasi Biaya**: ~$5 - $10 / bulan + biaya token LLM API yang sangat murah (misalnya DeepSeek v3 hanya $0.14 per 1 juta token).
*   **Kelebihan**: Sangat hemat biaya server bulanan, performa respon super cepat karena dilayani infrastruktur API raksasa.

---

## 🚀 3. Rekomendasi Deployment Produksi (Nexus Cyber)
Untuk rilis awal, **Skenario B (Railway + External API)** sangat disarankan karena:
1.  Menghindari crash Out-Of-Memory (OOM) pada VPS murah.
2.  Proses inisialisasi dan scaling container di Railway jauh lebih fleksibel.
3.  WAF Gateway tetap memberikan perlindungan maksimal dengan memblokir ancaman secara instan di level aplikasi menggunakan cache RAM lokal (O(1) local blacklist lookup) meskipun fitur kernel driver (eBPF) tidak aktif di PaaS.
