---
description: Alur kerja pengembangan Nexus Cyber GaaS
---

# Nexus Cyber Development Workflow

**Model produk:** [`docs/PRODUCT_MODEL.md`](../../nexus-core/docs/PRODUCT_MODEL.md). Prioritas kode: Job Cowork → wasit → tepi. Billing otomatis massal **ditunda**.

### Langkah 1: Konteks
1. Baca `nexus-core/docs/PRODUCT_MODEL.md`, `nexus-core/docs/ARCHITECTURE.md`, `nexus-core/docs/LIMITATIONS.md`.
2. Jangan membangun F-10 / provisioner kecuali pemilik minta.

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

---

### 🌐 Langkah 6: Deployment & Launch Workflow

Jika sistem atau fitur baru siap disebarkan ke lingkungan produksi atau pengujian publik:

#### A. Deployment PC Lokal (Opsi Gratis / Demo):
1. **Windows**: Jalankan `.\nexus-core\scripts\deploy\local\deploy-local-pc.ps1`.
2. **Linux / WSL / Mac**: Jalankan `bash nexus-core/scripts/deploy/local/deploy-local-pc.sh`.
3. **Publikasi Gratis via Cloudflare Tunnel** (terminal terpisah):
   ```bash
   # Linux / WSL
   bash nexus-core/scripts/tunnel/nexus-tunnel.sh
   # Windows
   .\nexus-core\scripts\tunnel\nexus-tunnel.ps1
   ```

#### B. Deployment Cloud VPS (Opsi Biznet Gio / Hetzner / DigitalOcean):
1. SSH ke VPS Ubuntu 22.04 LTS Anda (`ssh root@<IP_VPS>`).
2. Jalankan skrip otomatisasi 1-klik terpadu:
   ```bash
   sudo bash scripts/deploy/vps/deploy-biznet-gio.sh
   ```
3. Skrip akan otomatis mengonfigurasi Docker Engine, SWAP memory 2GB, UFW firewall, dan menyalakan seluruh sistem di port 3001 (Dashboard), 8080 (WAF Gateway), 9090 (Honeypot), dan 2222 (SSH Tarpit).

#### C. Referensi Cepat Struktur Skrip:
```
scripts/
├── deploy/
│   ├── local/    ← deploy-local-pc.ps1 / .sh
│   └── vps/      ← deploy-biznet-gio.sh, provisioner.sh / .ps1
├── tunnel/       ← nexus-tunnel.ps1 / .sh (Cloudflare Tunnel)
├── ops/          ← nexus-ignite.sh, nexus-kill.sh
├── init/         ← setup.sh / .ps1 (scaffolding awal)
└── tests/        ← test_*.py, nexus_system_audit.py
```
