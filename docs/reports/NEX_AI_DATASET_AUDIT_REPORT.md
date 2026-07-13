# NEX-AI Dataset Audit Report

## Ringkasan Eksekutif
- Dataset `NEX-AI` saat ini **cukup kuat sebagai baseline training lokal** karena schema output konsisten, seluruh output valid JSON, dan coverage ancaman inti sudah ada.
- Namun dataset juga **sangat sintetis dan sangat seimbang**, sehingga berisiko membuat model terlalu percaya diri pada pola yang berulang dan kurang siap menghadapi traffic abu-abu di dunia nyata.
- Temuan terbesar:
  - total sampel `2000`,
  - komposisi `1000 BENIGN` dan `1000 MALICIOUS`,
  - tidak ada label `SUSPICIOUS`,
  - hanya `1041` input unik, sehingga rasio duplikasi input mencapai `47.95%`,
  - ada mismatch schema antara `NEX-AI/Output.md` dan dataset untuk kategori XSS.

## Sumber Audit
- Dataset utama: [cyber_security_dataset.json](file:///d:/0.%20Kerjaan/Nexus-Cyber/Nexus-Cyber-Fase2/NEX-AI/dataset/cyber_security_dataset.json)
- Schema target model: [Output.md](file:///d:/0.%20Kerjaan/Nexus-Cyber/Nexus-Cyber-Fase2/NEX-AI/Output.md)

## Statistik Utama

### Volume dan validitas
- Total sampel: `2000`
- Output JSON tidak valid: `0`
- Sampel dengan field output lengkap (`status`, `threat_score`, `attack_type`, `reason`): `2000/2000`
- Input unik: `1041`
- Rasio duplikasi input: `47.95%`

### Distribusi status
| Status | Jumlah | Persentase |
| :--- | ---: | ---: |
| `BENIGN` | 1000 | 50.0% |
| `MALICIOUS` | 1000 | 50.0% |
| `SUSPICIOUS` | 0 | 0.0% |

### Distribusi attack type
| Attack Type | Jumlah | Persentase |
| :--- | ---: | ---: |
| `NONE` | 1000 | 50.0% |
| `COMMAND_INJECTION` | 200 | 10.0% |
| `SQL_INJECTION` | 200 | 10.0% |
| `CROSS_SITE_SCRIPTING` | 200 | 10.0% |
| `PATH_TRAVERSAL` | 200 | 10.0% |
| `ZERO_DAY_BYPASS` | 200 | 10.0% |

### Distribusi threat score
| Kelompok | Rata-rata | Minimum | Maksimum |
| :--- | ---: | ---: | ---: |
| Seluruh dataset | 0.4981 | 0.00 | 1.00 |
| `NONE` | 0.0304 | 0.00 | 0.08 |
| `CROSS_SITE_SCRIPTING` | 0.9442 | 0.90 | 0.99 |
| `SQL_INJECTION` | 0.9611 | 0.92 | 1.00 |
| `PATH_TRAVERSAL` | 0.9637 | 0.93 | 1.00 |
| `COMMAND_INJECTION` | 0.9747 | 0.95 | 1.00 |
| `ZERO_DAY_BYPASS` | 0.9850 | 0.97 | 1.00 |

## Temuan Utama

### 1. Kekuatan dataset
- Output label sangat rapi dan konsisten. Untuk fine-tuning awal, ini sangat membantu karena model tidak perlu belajar dari target yang kacau.
- Seluruh attack family inti untuk MVP sudah tersedia:
  - SQL injection
  - XSS
  - path traversal
  - command injection
  - zero-day bypass
  - benign traffic
- Rentang `threat_score` juga cukup masuk akal:
  - benign rendah,
  - malicious tinggi,
  - zero-day bypass paling tinggi.
- Field `reason` tersedia di semua sampel dan cukup deskriptif untuk melatih output forensik.

### 2. Dataset terlalu bersih dan terlalu seimbang
- Proporsi `50% benign / 50% malicious` bagus untuk eksperimen awal, tetapi tidak mewakili traffic nyata.
- Dalam produksi, traffic benign hampir selalu jauh lebih dominan daripada traffic malicious.
- Risiko praktis:
  - model bisa menjadi terlalu sensitif,
  - model bisa terlalu cepat menganggap sesuatu sebagai ancaman,
  - calibration `threat_score` dapat terlihat bagus di train set tetapi kurang realistis di production stream.

### 3. Tidak ada kelas `SUSPICIOUS`
- [Output.md](file:///d:/0.%20Kerjaan/Nexus-Cyber/Nexus-Cyber-Fase2/NEX-AI/Output.md#L15-L18) mendefinisikan tiga status:
  - `BENIGN`
  - `SUSPICIOUS`
  - `MALICIOUS`
- Dataset saat ini hanya melatih dua status:
  - `BENIGN`
  - `MALICIOUS`
- Dampak:
  - model kemungkinan tidak terkalibrasi untuk kasus abu-abu,
  - SOC akan kehilangan tier “perlu investigasi lanjut”,
  - runner benchmark wajib memperlakukan ini sebagai gap capability, bukan sekadar bug.

### 4. Duplikasi input sangat tinggi
- Hanya ada `1041` input unik dari `2000` sampel.
- Rasio duplikasi input mencapai `47.95%`.
- Beberapa pola request muncul belasan hingga dua puluh kali dengan variasi sangat kecil.
- Dampak:
  - model berpotensi menghafal request tertentu,
  - evaluasi internal bisa terlalu optimistis,
  - zero-shot generalization ke payload baru bisa lebih lemah dari yang terlihat.

### 5. Reasoning cukup konsisten, tetapi masih template-heavy
- Rata-rata panjang `reason`: `102.31` karakter.
- Tidak ada field yang hilang, tetapi ada setidaknya `35` prefix reason yang dipakai ulang lebih dari lima kali.
- Ini bagus untuk determinisme awal, tetapi juga menandakan variasi reasoning belum kaya.

### 6. Mismatch schema XSS antara spesifikasi dan dataset
- [Output.md](file:///d:/0.%20Kerjaan/Nexus-Cyber/Nexus-Cyber-Fase2/NEX-AI/Output.md#L17-L18) masih menulis `XSS`.
- Dataset training justru memakai `CROSS_SITE_SCRIPTING`.
- Dampak:
  - kebingungan saat integrasi dashboard atau evaluator,
  - benchmark bisa salah membaca label jika mengikuti dokumen, bukan data aktual,
  - semua runner evaluasi harus memakai label dataset aktual saat ini.

## Implikasi Ke Model

### Yang kemungkinan sudah dipelajari model dengan baik
- Pemisahan tajam antara benign dan malicious
- Signature kuat pada lima family serangan utama
- Format output JSON yang stabil
- Reasoning singkat bergaya forensik

### Yang kemungkinan masih lemah
- Kasus borderline / gray traffic
- Perbedaan antara request “aneh” dan request benar-benar malicious
- Payload dunia nyata yang tidak persis seperti pola dataset
- Distribusi traffic yang lebih berat ke benign
- Variasi reasoning yang lebih natural dan tidak terlalu template-driven

## Rekomendasi Prioritas

### Prioritas tinggi
- Tambahkan kelas `SUSPICIOUS` ke dataset generasi berikutnya.
- Samakan label schema antara `Output.md` dan dataset:
  - pilih satu bentuk final,
  - paling aman saat ini: `CROSS_SITE_SCRIPTING`, karena itu yang benar-benar dipakai train set.
- Buat benchmark terpisah dari train set agar evaluasi pasca-training tidak bias.

### Prioritas menengah
- Tambahkan benign traffic yang lebih realistis:
  - asset loading,
  - GraphQL normal,
  - checkout flow,
  - API JSON standar,
  - request authenticated user.
- Kurangi repetisi literal pada payload yang sama.
- Tambahkan variasi host, method, header, cookie, user-agent, dan body encoding.

### Prioritas rendah
- Variasikan style `reason` agar tidak terlalu template-like.
- Tambahkan noise produksi seperti:
  - header yang tidak lengkap,
  - parameter kosong,
  - request error tetapi bukan serangan,
  - payload rusak/partial.

## Keputusan Audit
- **Dataset layak dipakai untuk baseline training lokal saat ini.**
- **Dataset belum cukup kuat untuk dijadikan satu-satunya dasar klaim production-grade tanpa benchmark terpisah dan perluasan coverage.**
- Benchmark operasional harus disiapkan segera dan hasil training pertama wajib diuji terhadap golden set yang tidak identik dengan train set.
