> **Arsip historis** � laporan QA/evaluasi pada tanggal di header. Model produk GaaS: [PRODUCT_MODEL.md](../PRODUCT_MODEL.md).

---

# Uji adil NEX-RED × Shannon × Strix — 16 Agustus 2026

**Klasifikasi.** Arsip eksperimen. Bukan klaim produk “setara pentest.” Kontrak kode: `docs/CAPABILITIES.md`, `docs/LIMITATIONS.md`, `NEX-RED/README.md`.

**Putusan mesin.** `python NEX-RED/nexred.py benchmark` → exit **2**, **BELUM SETARA**.

**Putusan profesor.** Uji ini **adil** justru karena **menolak** menyamakan tiga alat yang mengukur tugas berbeda. Menjalankan Shannon/Strix sebagai swarm exploit pada hotspot Nexus **bukan** uji adil; itu mencampur pentest ofensif dengan verifikasi kontrol, dan NEX-RED memang dilarang meniru loop proof-by-exploitation.

---

## 1. Apa arti “adil”

| Syarat adil | Yang dilakukan | Yang **tidak** dilakukan |
| --- | --- | --- |
| Tugas yang sama diukur dengan metrik yang sama | Corpus SAST berlabel (24 berkas, CWE diketahui) dijalankan **hari ini** pada analyzer NEX-RED | Tidak memaksa NEX-RED “menyelesaikan XBEN” |
| Klaim pihak ketiga dikutip dari publikasi mereka, bukan diulang diam-diam | Shannon: 3 sample report di `shannon/sample-reports/` (64 temuan ter-parse). Strix: XBEN **96% (100/104)** dari `strix/benchmarks/README.md` | Tidak mengeksekusi 104 tantangan CTF / agent exploit |
| Pintu paritas tidak bisa dibeli dengan SAST sempurna | Tes unit: SAST 100% **tetap** `equal_to_shannon_strix=false` tanpa live pentest | Tidak menaikkan bendera “SETARA” |
| Pertahanan Nexus tidak dinilai dengan skor CTF | Lab 15 Agu 2026 = verifikasi kontrol (laporan terpisah) | Tidak memakai ban vault sebagai “menang vs Strix” |

**Mengapa tidak menjalankan Shannon/Strix live terhadap `192.168.137.1`.** Shannon dan Strix dirancang untuk **membuktikan celah dengan eksploitasi** pada aplikasi yang berjalan. NEX-RED v5 hanya SAST + pemeriksaan HTTP jinak. Menyuruh Strix “serang hotspot” akan (a) keluar dari RoE NEX-RED, (b) tidak membandingkan akurasi detektor yang sama, (c) menghasilkan skor yang tidak bisa diinterpretasi sebagai “Nexus salah/benar.”

---

## 2. Metode yang dijalankan (16 Agu 2026, laptop red team)

1. `python -m unittest tests.test_benchmark tests.test_nexred tests.test_live_http` di `NEX-RED/` → **14 tes, OK**.
2. `python nexred.py benchmark` → JSON/Markdown di `NEX-RED/reports/` (folder gitignore).
3. Parser Shannon membaca `shannon/sample-reports/shannon-report-*.md` (ada di checkout lokal, **bukan** submodule yang di-commit ke `main`).
4. Skor Strix **tidak dihitung ulang**; dipakai angka terbitan XBEN v0.4.0.

Artefak mesin: `NEX-RED/reports/nexred_benchmark_20260815T171140Z.md` (UTC 17:11).

---

## 3. Hasil kuantitatif

### 3.1 NEX-RED — SAST pada corpus berlabel (bisa dieksekusi)

| Metrik | Nilai | Ambang paritas di kode |
| --- | ---: | ---: |
| Precision | **100%** | ≥ 85% |
| Recall | **100%** | ≥ 90% |
| F1 | **100%** | — |
| TP / TN / FP / FN | 15 / 9 / 0 / 0 | — |

Kelas yang **PROVEN** pada corpus: SQLi, command injection, XSS, SSRF, broken authz, IDOR, JWT, SSTI, deserialization, hardcoded secret, code injection.

**Batas ilmiah.** Corpus kecil dan **dibuat untuk analyzer ini**. 100% di sini **bukan** akurasi pada Juice Shop, crAPI, atau zero-day. Itu akurasi pada 24 cuplikan yang dilabeli.

### 3.2 Shannon — laporan pentest terbit (referensi, tidak di-replay)

| Laporan | Temuan ter-parse | Keluarga |
| --- | ---: | --- |
| `shannon-report-capital-api.md` | 15 | injeksi, auth, SSRF, autorisasi |
| `shannon-report-crapi.md` | 22 | sama |
| `shannon-report-juice-shop.md` | 27 | + XSS |

Shannon **core** = proof-by-exploitation pada aplikasi hidup. Itu tugas yang NEX-RED **tidak** kerjakan.

### 3.3 Strix — skor terbit XBEN (referensi, tidak di-replay)

- **96%** (100/104) tantangan CTF black-box; rata-rata ~19 menit; biaya terbitan ~$337 untuk 100 soal (`strix/benchmarks/README.md`).
- NEX-RED **tidak punya skor XBEN.** XBEN mensyaratkan mengambil flag lewat eksploitasi.

### 3.4 Cakupan kelas (katalog, bukan pertandingan hidup)

Banyak kelas skill Strix **ABSENT** di NEX-RED: CSRF, XXE, path traversal, NoSQL, mass assignment, business logic, race, smuggling, prompt injection, dsb. Beberapa **PARTIAL** (pola statis, bukan eksploit).

Pintu `live_pentest_comparable` di kode: **selalu false** sampai ada mesin proof-by-exploitation yang diotorisasi. Hari ini tetap false.

---

## 4. Pertahanan Nexus vs “pentest akurat”

Dua pertanyaan yang sering dicampur:

1. **Apakah WAF lab melakukan apa yang diklaim?** Ya — sesi 15 Agu 2026 (kontrol zona, unggah sah, autoban). Itu **bukan** skor vs Shannon.
2. **Apakah NEX-RED mengukur celah seakurat Shannon/Strix?** **Tidak**, dan benchmark **sengaja** menolak klaim itu. NEX-RED akurat sebagai **SAST + postur HTTP** pada corpus dan tes hidup jinak; Shannon/Strix akurat (menurut publikasi mereka) sebagai **agen pentest**.

Mencampur (1) dan (2) menghasilkan “hasil tidak konkret.” Setelah dipisah, hasilnya konkret: **kontrol lab lulus; paritas pentest gagal (exit 2); SAST corpus lulus ambang.**

---

## 5. Apa yang akan membuat uji *lebih* adil di masa depan (tanpa meniru kit exploit)

1. Corpus SAST **independen** (bukan hanya berkas yang ditulis untuk NEX-RED).
2. Replay **hanya** temuan Shannon yang punya file:line / request jinak — bandingkan apakah NEX-RED whitebox melihat sink yang sama, **bukan** meniru PoC.
3. Live checks NEX-RED v5 vs aplikasi lab (sudah ada tes: rute mutasi tanpa sesi, telemetri tertutup, 403 = mitigated).
4. Jangan memasukkan XBEN ke CI Nexus.

---

## 6. Kalimat sidang

*Pada 16 Agustus 2026 NEX-RED memenuhi ambang precision/recall SAST pada corpus berlabel 24 berkas, dan 14 tes unit termasuk kejujuran “SAST sempurna ≠ setara Shannon.” Parser membaca 64 temuan dari tiga laporan sampel Shannon. Skor Strix XBEN 96% dikutip sebagai publikasi, tidak diulang. Verdict mesin: BELUM SETARA, karena tidak ada loop proof-by-exploitation. Itu hasil uji adil, bukan kegagalan menyembunyikan skor.*
