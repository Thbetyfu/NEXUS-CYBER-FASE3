---
description: Alur Kerja (Workflow) untuk mengembangkan fitur atau memodifikasi modul di Nexus Cyber Fase 2
---

# 🚀 Nexus Cyber Development Workflow

Gunakan alur kerja ini ketika mengembangkan fitur baru (seperti modul AI, sistem pertahanan MTD, atau dasbor Command Center) di Nexus Cyber Fase 2.

### Langkah 1: Pahami Konteks & Desain Arsitektur (Strategic Alignment)
1. Periksa folder `docs/` (terutama `ARCHITECTURE.md` dan `NEXUS_CORE_DIRECTIVES.md`).
2. Diskusikan dengan USER tentang *User Flow* dan *Logic Flow*. Jangan langsung menulis kode sebelum USER menyetujui pendekatan arsitekturnya.
3. Tentukan apakah fitur ini berada di ranah **Backend (Go)** atau **Frontend (Next.js)**.

### Langkah 2: Evaluasi Risiko Keamanan & Latensi
1. Jika menambahkan fitur analisis/AI, pastikan eksekusi berat dimasukkan ke dalam antrean (goroutine/Redis) sehingga tidak menyebabkan latensi *reverse proxy* naik > 50ms.
2. Jika berurusan dengan IP atau identitas, pastikan logika *blacklist/rate-limit* sudah didesain terhubung dengan Redis `database` atau eBPF map.

### Langkah 3: Implementasi Backend (Go)
1. Tulis kode modul baru di dalam folder `internal/` sesuai domainnya (misal: `internal/mtd/` atau `internal/ai/`).
2. Pastikan file kode tersebut memiliki *unit test* (`_test.go`) dengan batas cakupan tes untuk memastikan performa (benchmark latency) dan akurasi (tidak ada *false positive*).
3. Gunakan injeksi *dependencies* (misal: koneksi Redis dikirim sebagai argumen *struct*) untuk mempermudah tes.

### Langkah 4: Implementasi Frontend (Next.js)
1. Buat atau *update* komponen React di folder `nexus-admin-dashboard/components/`.
2. Gunakan komponen UI yang memiliki tema gelap (*dark mode*) yang mengintimidasi namun profesional (Cyber Aesthetic). 
3. Hindari rendering statis di bagian analitik; gunakan `useEffect` atau *WebSocket* untuk visualisasi metrik *real-time* yang selaras dengan kecepatan deteksi backend.

### Langkah 5: Audit Clean Code & Senior Developer Review
1. **Clean Code & Dead Code Audit**: Hapus sisa variabel/fungsi/import sementara, pastikan tidak ada logika ganda (*duplicate code/DRY*).
2. **Port & Resource Check**: Cek konektivitas port dan pastikan tidak ada port *development* yang menyimpang dari aturan (3001/3002). Pastikan semua resource handles ditutup (`defer Close()`).
3. **Pembersihan & Dokumentasi**: Lakukan *cleanup* file sementara (*temporary files*) dan perbarui `docs/CAPABILITIES.md` atau `ROADMAP.md` jika fitur tersebut menandai selesainya sebuah tahap pengembangan besar.
