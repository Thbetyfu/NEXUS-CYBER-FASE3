# NEXUS CORE DIRECTIVES
**Project: Nexus Cyber - Autonomous Database Security Gateway**
**Status: Milestone 13 - NEX-AI Custom Model & Self-Healing AI Pipeline**
**Terakhir Diperbarui: 2026-07-09**

Dokumen ini merangkum aturan main utama, arsitektur inti, dan keputusan teknis yang telah ditetapkan untuk sistem Infrastructure/Database Security Gateway yang dibangun sebagai pertahanan vital nasional.

---

## @skill-dual-brain: Ensemble AI Architecture (Revision 3 - Hybrid Inference)

Setiap perancangan logika analitik trafik WAJIB menggunakan arsitektur **Dual-Brain Ensemble AI** yang beroperasi dalam mode hibrid (lokal + cloud).

### Otak Kiri: NEX-AI Reflex Core
- **Implementasi**: `internal/ai/reflex_filter.go`
- **Tugas**: Filtrasi massal real-time menggunakan pre-compiled Regex heuristik OWASP Top 10.
- **Latensi Target**: < 1.2ms (sub-millisecond)
- **Cakupan Deteksi**: SQLi, XSS, Path Traversal/LFI, Malicious Scanner Tools (sqlmap, nikto, nmap, burp, ZAP).
- **Mekanisme Kekebalan**: Setiap pola ancaman terdeteksi secara otomatis disimpan sebagai "Antibodi" di Redis/Memory untuk pemblokiran instan O(1) pada request berikutnya (Virtual Patching).

### Otak Kanan: NEX-AI Cognitive Core (Model Kustom Eksklusif)
- **Nama Model di Ollama Registry**: `nex-ai-protect`
- **Model Dasar (Base Model)**: `Qwen2.5-3B-Instruct` (open-source, Alibaba Cloud)
- **Implementasi**: `internal/ai/reasoning_engine.go`, `internal/ai/llama.go`
- **Tugas**: Analisis forensik mendalam dan terstruktur terhadap trafik yang lolos dari Otak Kiri, termasuk deteksi zero-day bypass dan serangan terobfuskasi.
- **Mode Eksekusi**: **Asinkron** (goroutine latar belakang, timeout 30 detik) agar tidak menambah latensi pada koneksi klien yang sah.
- **Output**: JSON deterministik dengan skema `{status, threat_score, attack_type, reason}`.

### Alasan Pemilihan Qwen2.5-3B sebagai Base Model
Model ini dipilih karena tiga keunggulan fundamental untuk sistem WAF lokal:
1. **Efisiensi Sumber Daya**: Parameter 3B memungkinkan eksekusi lokal di CPU/RAM server tanpa GPU khusus (~2GB footprint).
2. **Pemahaman Sintaksis Kode**: Dilatih pada korpus kode masif, unggul dalam memahami SQL, HTML/JS, PHP, Shell dibanding model 1B-3B kompetitor.
3. **Latensi Rendah**: Waktu inferensi memenuhi ambang batas toleransi WAF Gateway.

### Alasan Fine-Tuning (Mengapa Model Generik Tidak Cukup)
Model dasar Qwen2.5-3B *out-of-the-box* tidak cocok untuk produksi karena:
- Menghasilkan teks percakapan atau membungkus JSON dalam markdown, merusak parser gateway.
- Tidak mengenali teknik obfuskasi canggih (Double URL encoding, nested Base64, Unicode Normalization, Parameter Pollution, SQL Hex).
- Rentan terhadap False Positive terhadap lalu lintas bersih yang strukturnya kompleks (GraphQL, JWT, XML binary).

**Solusi**: Fine-tuning menggunakan metode **QLoRA 4-bit NF4** dengan dataset kustom 2.000 sampel seimbang (Adversarial Enrichment + Benign Enrichment). Detail di `NEX-AI/ARCHITECTURE_DESIGN.md`.

### Pipeline Produksi NEX-AI (Production Pipeline)

```
[ Dataset Kustom 2K Sampel ]
          |
          v
[ train_qlora.py  --  QLoRA 4-bit NF4 ]
          |
          v
[ checkpoints/nex_ai_final ]  (LoRA Adapter saja)
          |
          v  <-- merge_and_unload() otomatis di akhir training
[ checkpoints/nex_ai_merged ]  (Model Utuh FP16 siap ekspor)
          |
          v
[ convert_and_quantize.sh ]  -->  nex_ai_q4_k_m.gguf  (Q4_K_M 4-bit)
          |
          v
[ ollama create nex-ai-protect -f Modelfile.production ]
```

*Catatan*: Sistem telah bermigrasi dari model Ollama generik ke model kustom eksklusif `nex-ai-protect` untuk mempertahankan keunikan produk dan mencegah duplikasi oleh kompetitor.

*Peraturan: Dilarang menggunakan model AI tunggal. Dilarang meng-hardcode API Key.*

---

## @skill-self-repair: Autonomous Recursive Repair

Mitigasi dan perbaikan bug/celah keamanan harus bersifat otonom tanpa intervensi manual admin.
1. **Recursive Self-Repair**: Menulis skrip perbaikan mandiri.
2. **Virtual Patching Otonom**: Patching otonom terhadap ancaman baru. Antibodi yang dipelajari dari serangan zero-day yang berhasil terdeteksi oleh Otak Kanan (`nex-ai-protect`) secara otomatis divaksinasikan ke Otak Kiri (Reflex Layer) via `np.AddAntibody(payload)`.
3. **Instant Rollback**: Jika baseline sistem berubah, rollback dilakukan dalam hitungan milidetik (*Zero-Downtime*).

---

## @skill-mtd: Moving Target Defense

Implementasi pada jaringan, port, dan IP internal untuk mengecoh penyerang.
1. **Dynamic Configuration Randomization**: Mengacak target secara stokastik.
2. **Digital Hallucination**: Menciptakan Sandbox palsu (Deception Technology) untuk menjebak peretas.

---

## @skill-pqc: Post-Quantum Cryptography

DILARANG menggunakan enkripsi legasi (RSA, AES standar, ECC murni) untuk data sensitif.
1. **Lattice-based Cryptography**: Menggunakan standar NIST (ML-KEM/Kyber). Header respons `X-Quantum-Safe: ML-KEM-768-Active` ditambahkan ke setiap respons gateway.
2. **Harvest Now, Decrypt Later Mitigation**: Fokus pada keamanan jangka panjang terhadap ancaman komputer kuantum.

---

## @skill-ui-ux-design: Command Center UI/UX

Desain antarmuka admin yang elegan, berwibawa, dan efisien untuk pusat komando nasional.
1. **Next.js + Tailwind CSS**: Stack utama untuk performa dan desain responsif.
2. **Cyber Aesthetic / Dark Mode**: Tema profesional yang meminimalkan distraksi visual.
3. **Real-time Data Visualization**: Fokus pada grafik anomali trafik, status MTD, dan log enkripsi PQC.
4. **Mission Critical Clarity**: Admin harus memahami status keamanan dalam "satu lirikan mata".
5. **NEX-AI Neural Core Monitor**: Widget diagnostik khusus (`NexAiMonitorWidget.tsx`) memvisualisasikan aktivitas synaptik node AI (grid 8x8 yang berpulsasi) dan metrik teknis model kustom secara real-time di atas dasbor administrasi. Dapat diakses dari ikon desktop "NEX-AI Core".

---

## @skill-qa-iso-auditor: Zero-Tolerance Quality Audit

Gatekeeper kualitas kode dan arsitektur berdasarkan standar ISO/IEC 25010 & 27001.
1. **Security Audit**: Audit kebocoran data, kredensial, dan celah injeksi di setiap modul.
2. **Performance KPI**: Mengawasi latensi tinggi terutama pada layer AI dan PQC.
3. **Reliability & Failover**: Memastikan sistem tetap berjalan meskipun Layer AI atau jaringan gagal/terganggu.
4. **UU PDP Compliance**: Memastikan setiap data pribadi warga negara yang diproses mematuhi regulasi Pelindungan Data Pribadi Indonesia.
5. **Unit Testing Wajib**: Setiap modul AI wajib memiliki unit test terdedikasi (`nex_ai_test.go`) yang memverifikasi akurasi klasifikasi dan mengukur latensi eksekusi. File test mencakup: `TestReflexFilter_OtakKiri` (12 kasus serangan nyata) dan `TestCognitiveCore_OtakKanan_Adapter` (verifikasi parsing JSON model lokal). Status terkini: **PASS 100%**.

---

## Catatan Keamanan Infrastruktur (Security Hardening Notes)

- **Port Database**: Postgres (5432) dan Redis (6379) WAJIB terikat ke `127.0.0.1` saja, tidak boleh di-expose ke `0.0.0.0`. Kepatuhan ISO 27001.
- **Port Dev Server**: Hanya port `3001` dan `3002` yang diizinkan untuk dev server biasa. Port kontainer MTD bersifat dinamis di atas `3003`.
- **API Keys**: Semua kunci API WAJIB disimpan sebagai environment variable. Dilarang keras di-hardcode.
- **Routing Internal**: Rute `/api/*` WAJIB ditangani Caddy Proxy secara internal (reverse proxy ke `gateway:8080`) untuk mencegah CORS dan menyederhanakan resolusi domain klien.
- **GeoIP Lookup**: Pencarian lokasi geografis IP penyerang diprioritaskan ke database lokal MaxMind GeoLite2 sebelum fallback ke API online `ip-api.com`.

---

*"Zero-Tolerance for Vulnerabilities. Maximum Performance for Sovereignty."*

---

*"Demi kedaulatan data nasional, Nexus Cyber beroperasi dengan presisi dan otonomi penuh."*
