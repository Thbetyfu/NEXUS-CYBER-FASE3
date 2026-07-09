#!/bin/bash
# NEX-AI: Model Conversion & Quantization Pipeline Script

# Pastikan script berhenti jika terjadi error
set -e

# Path konfigurasi
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHECKPOINT_DIR="$BASE_DIR/checkpoints/nex_ai_merged"
OUTPUT_DIR="$BASE_DIR/build"
LLAMA_CPP_DIR="$BASE_DIR/llama.cpp"

echo "[NEX-AI] Memulai proses ekspor, konversi, dan kuantisasi model..."

# Buat direktori output jika belum ada
mkdir -p "$OUTPUT_DIR"

# 1. Unduh llama.cpp jika belum terpasang
if [ ! -d "$LLAMA_CPP_DIR" ]; then
    echo "[NEX-AI] Mengunduh llama.cpp dari github..."
    git clone https://github.com/ggerganov/llama.cpp.git "$LLAMA_CPP_DIR"
    echo "[NEX-AI] Membangun llama.cpp..."
    cd "$LLAMA_CPP_DIR"
    make -j$(nproc)
    cd "$BASE_DIR"
fi

# 2. Konversi model SafeTensors hasil latih (atau model gabungan) ke format GGUF (FP16)
echo "[NEX-AI] Melakukan konversi checkpoint model ke format GGUF FP16..."
python3 "$LLAMA_CPP_DIR/convert_hf_to_gguf.py" "$CHECKPOINT_DIR" \
    --outfile "$OUTPUT_DIR/nex_ai_fp16.gguf" \
    --outtype f16

# 3. Kuantisasi model ke tipe Q4_K_M (4-bit quantization) untuk optimalisasi memori
echo "[NEX-AI] Menjalankan kuantisasi model ke tipe Q4_K_M..."
"$LLAMA_CPP_DIR/llama-quantize" "$OUTPUT_DIR/nex_ai_fp16.gguf" \
    "$OUTPUT_DIR/nex_ai_q4_k_m.gguf" Q4_K_M

# 4. Pindahkan model final ke direktori utama NEX-AI agar dapat dimuat oleh Modelfile
echo "[NEX-AI] Memindahkan model final ke direktori utama..."
cp "$OUTPUT_DIR/nex_ai_q4_k_m.gguf" "$BASE_DIR/nex_ai_q4_k_m.gguf"

echo "[NEX-AI] Proses selesai!"
echo "[NEX-AI] Jalankan perintah berikut untuk mendaftarkan model ke Ollama lokal:"
echo "ollama create nex-ai-protect -f $BASE_DIR/Modelfile.production"
