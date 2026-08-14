# Estimasi Profil Performa Resource: Nexus Cyber WAF & AI

Angka di bawah adalah **estimasi**, bukan hasil load-test produksi. eBPF/XDP **tidak** mengurangi CPU di lab saat ini (modul stub). Reasoning LLM hanya memakai RAM besar jika Ollama/`nex-ai-protect` benar-benar dijalankan.

Dokumen ini memperkirakan CPU & RAM gateway vs Ollama untuk perencanaan VPS.

---

## 1. Profil Konsumsi Resource (Per Komponen)

| Komponen | Bahasa / Stack | RAM (Idle) | RAM (Load Tinggi) | Karakteristik CPU |
| :--- | :--- | :--- | :--- | :--- |
| **Go WAF Gateway** | Golang (Native) | ~15 - 25 MB | ~80 - 150 MB | Sangat efisien, rata-rata <1-3% CPU core. |
| **Admin SOC Dashboard** | Next.js (Node.js) | ~50 - 60 MB | ~120 - 200 MB | Sedang, hanya aktif saat memuat grafik/data SSE. |
| **Redis Cache** | C (Redis Alpine) | ~5 - 10 MB | ~20 - 50 MB | Sangat rendah, sub-milidetik. |
| **PostgreSQL Database**| SQL (Postgres Alpine)| ~30 - 50 MB | ~150 - 300 MB | Ringan, terindeks secara optimal untuk forensik. |
| **Caddy Edge Router** | Go (Caddy Alpine) | ~15 - 20 MB | ~50 - 100 MB | Sangat rendah, menangani SSL otomatis secara efisien. |
| **Target Portfolio Web**| Go (Backend) | ~10 - 15 MB | ~40 - 80 MB | Sangat rendah. |
| **Local LLM (Ollama)** | C++ (NEX-AI.cpp) | ~20 - 40 MB | **~2.2 - 2.5 GB** | **Sangat tinggi (100% dari 2-4 Cores)** saat melakukan inferensi di CPU fallback. |

---

## 2. Skenario Deployment: Full Local AI (VPS Mandiri)

Karena Nexus Cyber menggunakan arsitektur **Full Local AI** (Ollama + model `nex-ai` lokal tanpa API LLM eksternal), seluruh komponen termasuk inferensi AI dijalankan di satu server VPS mandiri.

### Spesifikasi VPS Rekomendasi

| Parameter | Minimum | Rekomendasi |
| :--- | :--- | :--- |
| **CPU** | 2 Cores | **4 Cores** |
| **RAM** | 4 GB (mepet, rawan OOM) | **8 GB** |
| **Storage** | 25 GB SSD | **60 - 80 GB SSD** |
| **OS** | Ubuntu 22.04+ / Debian 12+ | Ubuntu 24.04 LTS |
| **Bandwidth** | Unmetered / 20 TB | Unmetered |

### Estimasi Biaya Bulanan per Provider

| Provider | Paket | Spesifikasi | Estimasi Biaya |
| :--- | :--- | :--- | :--- |
| **Biznet GIO (Rekomendasi)** | NEO Lite / NEO Virtual Compute | 4 Cores, 8 GB RAM, 60 GB SSD | **Rp350.000 - Rp420.000 / bulan** |
| **IDCloudHost** | Cloud VPS | 4 Cores, 8 GB RAM, 80 GB SSD | **Rp280.000 - Rp320.000 / bulan** |
| **Hetzner (Internasional)** | CPX31 (AMD) | 4 Cores, 8 GB RAM, 160 GB SSD | **Rp235.000 / bulan** |

### Keunggulan VPS Mandiri vs PaaS

| Parameter | VPS Mandiri (Biznet GIO) | PaaS (Railway) |
| :--- | :--- | :--- |
| **Biaya untuk 8 GB RAM** | Rp350.000 - Rp420.000 / bulan | ~Rp850.000 - Rp1.000.000 / bulan |
| **eBPF/XDP Kernel Blocking** | OS mengizinkan eBPF; **kode Nexus masih stub** | Sama: tidak ada XDP di aplikasi |
| **Full Local AI (Ollama)** | **Didukung penuh** | Sangat mahal (RAM dihitung per GB) |
| **Kontrol Infrastruktur** | Penuh (`docker compose up -d`) | Terbatas (UI dashboard) |

---

## 3. Rekomendasi Deployment Produksi (Nexus Cyber)

Untuk deployment produksi, **VPS Mandiri Biznet GIO (4 Cores / 8 GB RAM)** sangat disarankan karena:
1.  Root di VPS *memungkinkan* eBPF nanti; **hari ini** Nexus tidak drop paket XDP.
2.  Inferensi AI lokal berjalan stabil tanpa risiko Out-Of-Memory (OOM) dengan alokasi RAM yang lega.
3.  Latency akses dari pengunjung Indonesia sangat rendah (~10-30ms) karena data center berada di Jakarta.
4.  Deployment cukup dengan satu perintah `docker compose up -d --build` tanpa konfigurasi dashboard PaaS.
5.  Biaya bulanan jauh lebih hemat dibandingkan PaaS untuk skenario Full Local AI.
