# 04. Standar Teknis Prototype & Solusi Berbasis AI

Dokumen ini memuat parameter penilaian teknis yang ketat untuk memastikan prototipe benar-benar berfungsi, arsitektur terverifikasi, dan solusi berbasis kecerdasan buatan (*AI*) tidak sekadar berupa klaim pemasaran (*gimmick*).

---

## 🛠️ 1. Klasifikasi Tingkat Kematangan Prototype

Juri akan mengklasifikasikan prototipe Anda ke dalam salah satu dari 3 level berikut:

```
[Level 1: Mock-up] ➔ [Level 2: Functional Prototype] ➔ [Level 3: Live Prototype]
```

| Tingkat Kematangan | Definisi Operasional | Bukti yang Diharapkan Juri |
| :--- | :--- | :--- |
| **Mock-up** | Representasi visual/antarmuka statis dari solusi; **belum** menjalankan proses logika utama secara fungsional. | Figma, desain UI statis, wireframe interaktif tanpa backend. *(Nilai teknis paling rendah)*. |
| **Functional Prototype** | Fungsi inti (*core use case*) **sudah dapat dijalankan** dan membuktikan mekanisme kerja sistem secara nyata. | Aplikasi berjalan lokal/cloud, API terhubung, database membaca/menyimpan data, algoritma mengeksekusi logika. |
| **Live Prototype** | Prototype **telah digunakan atau diuji langsung** oleh target user/stakeholder dalam konteks penggunaan operasional yang relevan. | Log transaksi riil, feedback pengguna langsung, deployment production/staging aktif, data pengujian lapangan. |

> [!IMPORTANT]
> **Screenshot UI bukanlah bukti bahwa sistem bekerja.** Anda wajib menunjukkan pembuktian fungsionalitas end-to-end melalui demo dan log pengujian.

---

## 🤖 2. Ketentuan Wajib untuk Solusi Berbasis AI / Machine Learning

Jika solusi Anda menggunakan **AI, Machine Learning, Scoring, Recommendation, Prediction, Optimization, atau Algorithmic Decision-Making**, Anda **DILARANG** hanya menuliskan kalimat umum seperti *"Powered by AI"* atau *"Menggunakan Deep Learning"*.

Anda **wajib** memaparkan minimal 8 poin teknis berikut:
1. **Input Data**: Apa variabel/fitur data yang dimasukkan ke dalam model?
2. **Sumber Data**: Dari mana dataset diperoleh (data publik, data internal, hasil scraping, atau data sintetis)?
3. **Pemrosesan Data**: Bagaimana data dibersihkan, dinormalisasi, atau ditransformasikan sebelum inferensi?
4. **Output Model**: Apa bentuk keluaran model (klasifikasi biner, skor probabilitas, vektor embeddings, teks terstruktur)?
5. **Pemanfaatan Output**: Bagaimana output tersebut memicu keputusan bisnis/aksi operasional pada sistem?
6. **Metrik Performa**: Berapa nilai akurasi, Precision/Recall, F1-Score, MAE/MAPE, atau Latency model?
7. **Pengujian & Keterbatasan**: Bagaimana model diuji, kasus kegagalan (*error/failure cases*), potensi halusinasi, dan apa batasannya?
8. **Human Oversight**: Bagaimana mekanisme intervensi manusia (*Human-in-the-Loop*) jika model membuat kesalahan?

> [!CAUTION]
> **Pembedaan Komponen Sendiri vs Pihak Ketiga**:
> Jika Anda menggunakan model pihak ketiga (misal: OpenAI API, Claude, HuggingFace model publik), Anda **wajib membedakan secara tegas** mana bagian logika/arsitektur yang Anda rancang sendiri vs mana komponen API yang sekadar diintegrasikan.

---

## 🏗️ 3. Pembuktian Teknis 3 Layer (*3-Layer Architecture*)

Bagian teknis presentasi idealnya mampu menjawab 3 lapisan arsitektur:

```
┌─────────────────────────────────────────────────────────────┐
│ LAYER 1: USER EXPERIENCE                                    │
│ User ──► Action ──► Interface ──► Output / Feedback        │
├─────────────────────────────────────────────────────────────┤
│ LAYER 2: SYSTEM LOGIC                                       │
│ Input ──► Data Processing ──► Rules/Model ──► Decision      │
├─────────────────────────────────────────────────────────────┤
│ LAYER 3: TECHNICAL ARCHITECTURE                             │
│ Frontend ──► Backend ──► DB ──► Model/API ──► Infra/Security │
└─────────────────────────────────────────────────────────────┘
```

* **Layer 1 (User Experience)**: Bagaimana pengguna berinteraksi dengan antarmuka untuk menyelesaikan masalahnya.
* **Layer 2 (System Logic)**: Alur pemrosesan data, eksekusi aturan (*business rules*), inferensi model, hingga keluaran keputusan.
* **Layer 3 (Technical Architecture)**: Komponen software engineering (Frontend, Backend runtime, Database, Caching, API Gateway, Integrasi Pihak Ketiga, Keamanan, dan Infrastruktur Deployment).

*Catatan Juri*: Tidak semua tim harus memiliki arsitektur yang sangat rumit. Yang dinilai adalah **apakah arsitektur yang dipilih cukup, efisien, aman, dan tepat untuk menjalankan use case yang dijanjikan.**

---

## 🧪 4. Matriks Bukti Pengujian Teknis (*Technical Testing Matrix*)

Sertakan bukti pengujian sesuai jenis solusi yang Anda bangun:

| Kategori Solusi | Contoh Indikator & Bukti Pengujian yang Relevan |
| :--- | :--- |
| **Platform / Web / Mobile App** | Task completion rate, response time, error rate (HTTP 4xx/5xx), usability testing SUS. |
| **AI / Machine Learning** | Accuracy, Precision/Recall, F1, latency inferensi (ms), benchmark dataset, error/hallucination analysis. |
| **Recommendation / Matching** | Relevance score, match success rate, user acceptance rate vs baseline manual. |
| **Automation System** | Waktu pemrosesan (processing time reduction), tingkat reduksi kesalahan manual (*manual error eliminated*). |
| **Analytics & Dashboard** | Akurasi data agregasi, kecepatan pembaruan (*data refresh latency*), integritas query. |
| **Financial / Transaction** | Akurasi kalkulasi moneter, keberhasilan transaksi (*transaction success rate*), audit trail, standar enkripsi/keamanan data. |
| **Public Service** | Waktu penyelesaian layanan (*service completion time*), indeks kepuasan pengguna (*CSAT*), accessibility. |
