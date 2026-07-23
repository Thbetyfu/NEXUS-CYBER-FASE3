# 🏛️ NEX-AI SOVEREIGNTY & PROPRIETARY MODEL NOTICE

**Status Lisensi**: 🔒 **EKSKLUSIF PRIVAT PROPRIETARY (NON-OPEN-SOURCE)**  
**Hak Cipta**: © 2026 Thoriq & Nexus Cyber Architecture  
**Penggunaan**: Khusus Subsistem Internal **Nexus Cyber Command Center & WAF Gateway**  

---

## 🔐 1. Pernyataan Kedaulatan AI (AI Sovereignty Statement)

Modul kecerdasan buatan **NEX-AI** (`nex-ai-protect` & `nex-ai-reflex`) dirancang dan dikembangkan sebagai **Otak Kanan (Reasoning)** dan **Otak Kiri (Reflex)** eksklusif milik platform pertahanan siber **Nexus Cyber**.

* **Bukan Open-Source**: Model ini **TIDAK** dipublikasikan secara publik ke platform open-source (seperti HuggingFace, GitHub Public, atau Ollama Public Hub).
* **Kedaulatan Data**: Seluruh inferensi dan pembobotan model (*model weights*) dieksekusi secara lokal 100% pada node private cloud/server lokal tanpa mentransfer data lalu lintas siber ke vendor AI pihak ketiga.
* **Perlindungan Aset**: Berkas biner terkuantisasi `nex_ai_q4_k_m.gguf`, checkpoint QLoRA, dan dataset 5.000 sampel `cyber_security_dataset.json` merupakan rahasia dagang & aset intelektual terlindungi.

---

## 📂 2. Struktur Folder Resmi NEX-AI (Refactored Clean Architecture)

```
NEX-AI/
├── LICENSE.proprietary              🔒 Lisensi Privat Non-Open-Source
├── NEX_AI_SOVEREIGNTY_NOTICE.md     🏛️ Pernyataan Kedaulatan & Kepemilikan AI
├── ARCHITECTURE_DESIGN.md           📐 Desain Arsitektur Dual-Brain AI
├── Modelfile.production             ⚙️ Konfigurasi Ollama Production Engine
├── Output.md                        📋 Spesifikasi Schema JSON & Attack Classes
├── ROADMAP.md                       🛣️ Peta Jalan Fine-Tuning & Evaluasi
├── nex_ai_q4_k_m.gguf               🧠 Biner Model GGUF Utama (Q4_K_M 1.93 GB)
├── dataset/                         📊 Dataset Latih 5.000 Sampel (V2.0)
│   └── cyber_security_dataset.json
├── scripts/                         🛠️ Script Generator & Training QLoRA
│   ├── generate_dataset.py
│   ├── train_qlora.py
│   └── convert_and_quantize.sh
├── evaluation/                      🧪 Script Benchmark & Evaluasi Latensi
│   ├── run_benchmark.py
│   └── benchmark_cases.json
└── nex_ai_colab/                    ☁️ Pipeline Training Google Colab Pro
```

---

## 🚫 3. Batasan Lisensi & Hukum

1. **Dilarang Menjual / Mendistribusikan Ulang**: Dilarang mengunggah, menjual, atau mendistribusikan kembali biner `nex_ai_q4_k_m.gguf` atau dataset `cyber_security_dataset.json` ke publik.
2. **Dilarang Re-Licensing**: Dilarang mengubah status lisensi berkas ini menjadi MIT, Apache, GPL, atau lisensi terbuka lainnya tanpa persetujuan tertulis.
3. **Penggunaan Resmi**: Hanya digunakan secara resmi untuk melindungi server dan situs yang dikelola oleh **Nexus Cyber**.
