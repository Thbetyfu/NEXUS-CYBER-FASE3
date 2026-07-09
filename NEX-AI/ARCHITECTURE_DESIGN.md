# DESAIN ARSITEKTUR TEKNIS: NEX-AI
## SISTEM KLASIFIKASI ANCAMAN LOKAL BERBASIS SMALL LANGUAGE MODEL (SLM)

Dokumen ini menjelaskan rancangan arsitektur, pipa data (data pipeline), alur inferensi, dan spesifikasi pemodelan untuk NEX-AI. Sistem ini dirancang untuk menggantikan dependensi API eksternal dengan menjalankan model bahasa kecil yang dioptimalkan secara lokal pada mesin WAF Gateway.

---

## 1. Topologi Arsitektur Sistem

NEX-AI beroperasi sebagai mesin klasifikasi terdistribusi yang terbagi menjadi dua sub-sistem utama: **Pipa Inferensi Real-time** (WAF Runtime) dan **Pipa Pelatihan Model** (Training Pipeline).

```mermaid
graph TD
    subgraph Data_Plane ["WAF Runtime Layer (Data Plane)"]
        Request["HTTP Request Payload"] --> Reflex["Reflex Layer (Regex & Heuristik)"]
        Reflex -->|Mencurigakan / Suspicious| Reasoning["NEX-AI Reasoning Layer (Ollama / Local SLM)"]
        Reflex -->|Aman / Benign| Target["Aplikasi Target"]
        Reasoning -->|Blokir / Drop| Reject["Tindakan Blokir (eBPF / Blacklist)"]
        Reasoning -->|Lolos / Allow| Target
    end

    subgraph Control_Plane ["Training Pipeline (Control Plane)"]
        Logs["Log Forensik & CVE Database"] --> Preprocess["Pipa Preprocessing Data"]
        Preprocess --> Dataset["Training Dataset (JSON)"]
        Dataset --> Unsloth["Unsloth Engine (QLoRA 4-bit)"]
        Unsloth --> GGUF["Konversi Model (GGUF Format)"]
        GGUF --> Deploy["Ollama Local Model Registry"]
        Deploy --> Reasoning
    end
```

---

## 2. Pipa Pengolahan Data (Data Pipeline)

Sebelum teks payload HTTP dikirim ke model NEX-AI, data harus melalui pipa pembersihan (*sanitization*) dan penataan untuk menghindari *prompt injection* terhadap model itu sendiri.

### 2.1 Alur Preprocessing Payload
1.  **Dekode Karakter**: Mengubah seluruh encoding karakter (URL encoding, Base64, Hexadecimal) menjadi representasi teks ASCII mentah.
2.  **Trimming & Pemotongan**: Memotong payload yang masuk maksimal **1.024 token** untuk menghindari degradasi performa VRAM pada GPU lokal.
3.  **Strukturisasi JSON**: Mengubah payload mentah menjadi format JSON terstruktur yang berisi informasi:
    - `method`: Metode HTTP (GET/POST/PUT/DELETE).
    - `path`: Jalur URL request.
    - `headers`: Header HTTP sensitif (User-Agent, Content-Type, dll.).
    - `body`: Body request mentah.

---

## 3. Spesifikasi Pemodelan & Fine-Tuning (NEX-AI Core)

Sistem pertahanan cerdas NEX-AI dibangun dengan melakukan proses kustomisasi (*fine-tuning*) pada model dasar terbuka (**open-source base model**) pilihan untuk menghasilkan model siber mandiri yang eksklusif dan aman.

### 3.1 Pemilihan Model Dasar (Base Model)
Model dasar yang dipilih untuk sistem ini adalah **`Qwen2.5-3B-Instruct`**.

**Alasan Pemilihan Model Dasar**:
*   **Efisiensi Sumber Daya (Parameter Size 3B)**: Memiliki ukuran parameter sebesar 3 Miliar yang sangat optimal untuk dieksekusi secara lokal pada server WAF tanpa memerlukan perangkat keras GPU kelas atas yang mahal. Model ini dapat berjalan cepat pada memori RAM/CPU standar (~2GB footprint).
*   **Kemampuan Pemahaman Kode yang Unggul**: Seri model Qwen2.5 dilatih pada korpus kode pemrograman yang sangat masif, memberikan pemahaman sintaksis yang mendalam terhadap kode SQL, HTML/JS, PHP, dan Shell Script dibandingkan model kecil lainnya (seperti Llama-3.2-1B atau Phi-3).
*   **Latensi Rendah**: Memberikan waktu inferensi (*time-to-first-token*) yang jauh lebih cepat dibandingkan model 7B atau 8B, memenuhi ambang toleransi latensi WAF Gateway.

### 3.2 Alasan Proses Fine-Tuning & Pembaruan Model Kustom
Menggunakan model open-source bawaan (*out-of-the-box*) tidaklah memadai untuk sistem produksi siber karena alasan berikut:
*   **Masalah Halusinasi & Format Output**: Model instruksi standar cenderung menghasilkan teks percakapan pembuka/penutup atau membungkus output JSON dalam tag markdown (```json ... ```). Untuk operasional gateway, output harus berupa JSON mentah yang sangat bersih dan deterministik demi mencegah kegagalan parsing program.
*   **Kerentanan Terhadap Teknik Obfuskasi (Zero-Day Bypass)**: Model dasar umum tidak dilatih untuk mengenali payload berbahaya yang telah dimutasikan secara kompleks (seperti enkoding URL ganda, nested Base64, atau unicode homograf). Mereka rentan melewatkan serangan terselubung ini.
*   **Sensitivitas Berlebih (False Positives)**: Model standar sering salah mengklasifikasikan request API normal (seperti kueri GraphQL, struktur XML biner, atau JWT token) sebagai serangan karena kemiripan struktur format datanya.

**Solusi Peningkatan NEX-AI**:
Kami melatih ulang model dasar ini menggunakan metode **QLoRA 4-bit NF4** dengan dataset kustom sebanyak **2.000 sampel seimbang** (Adversarial & Benign Enrichment). Hal ini melatih model untuk:
1.  Mengenali 5 taktik obfuskasi utama (Double URL, Base64 wraps, Unicode Normalization, Parameter Pollution, SQL Hex).
2.  Menekan angka False Positive terhadap lalu lintas bersih yang kompleks (GraphQL/nested JSON).
3.  Menjamin keluaran JSON deterministik secara mutlak sesuai skema klasifikasi keamanan siber yang ditetapkan.

### 3.3 Parameter Fine-Tuning QLoRA
Konfigurasi hyperparameter pelatihan ulang NEX-AI didefinisikan sebagai berikut:

| Hyperparameter | Nilai Konfigurasi | Keterangan |
| :--- | :--- | :--- |
| **Model Dasar** | Qwen2.5-3B-Instruct | Model dasar open-source sebagai pondasi |
| **Quantization** | 4-bit NormalFloat (NF4) | Mereduksi kebutuhan memori saat pelatihan |
| **LoRA Rank (r)** | 16 | Kapasitas adaptasi parameter |
| **LoRA Alpha** | 32 | Faktor skala bobot LoRA |
| **Target Modules** | q_proj, k_proj, v_proj, o_proj | Modul attention layers yang dilatih ulang |
| **Learning Rate** | 2e-4 | Kecepatan penyesuaian bobot adaptif |
| **Optimizer** | AdamW 8-bit | Pengoptimal hemat memori GPU/RAM |

### 3.4 Struktur Prompt Sistem (System Prompt)
Model dimuat di Ollama menggunakan parameter sistem yang ketat untuk mengunci keluaran agar selalu berformat JSON valid:

```text
System: Anda adalah mesin klasifikasi ancaman keamanan siber real-time. Tugas Anda adalah menganalisis payload request HTTP dan memberikan keputusan klasifikasi dalam format JSON tanpa ada penjelasan teks tambahan.

Respons harus mengikuti skema berikut:
{
  "status": "BENIGN" | "SUSPICIOUS" | "MALICIOUS",
  "threat_score": 0.00 hingga 1.00,
  "attack_type": "SQL_INJECTION" | "CROSS_SITE_SCRIPTING" | "PATH_TRAVERSAL" | "COMMAND_INJECTION" | "NONE",
  "reason": "Alasan singkat analisis kerentanan"
}
```

---

## 4. Alur Inferensi Lokal & Mekanisme Kegagalan (Fail-Safe)

Untuk menjaga agar WAF Gateway tidak mengalami *deadlock* jika server inferensi lokal (Ollama) mengalami overload CPU/GPU, dirancang mekanisme perlindungan sebagai berikut:

```
[ HTTP Request ]
       │
       ▼
[ AI Reflex Filter (Regex) ] ── (Mencurigakan) ──► [ AI Reasoning (Ollama) ]
       │                                                    │
       │ (Aman)                                         (Overload / Timeout > 200ms)
       │                                                    │
       ▼                                                    ▼
[ Meneruskan ke Backend ] ◄──────────────────────── [ Fallback Mode (Regex Active) ]
```

1.  **Timeout Inferensi**: Batas waktu maksimal pemanggilan API Ollama lokal dibatasi sebesar **200ms**. Jika inferensi tidak selesai dalam batas waktu tersebut, sistem secara otomatis masuk ke **Fallback Mode**.
2.  **Fallback Mode (Fail-Open/Fail-Secure)**: Gateway akan mengabaikan keputusan AI dan langsung beralih kembali ke penyaringan berbasis filter Regex lokal untuk memastikan tidak ada penurunan performa pada sisi pengguna akhir.
3.  **Cache Hasil Analisis**: Setiap payload yang telah dianalisis oleh NEX-AI akan disimpan di cache Redis selama 1 jam. Request yang memiliki payload identik tidak akan dikirim kembali ke AI, melainkan langsung menggunakan hasil klasifikasi dari cache.
