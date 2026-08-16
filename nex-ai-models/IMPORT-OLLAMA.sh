#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v ollama >/dev/null 2>&1; then
  echo "[GAGAL] Ollama belum terpasang. Install dari https://ollama.com/download"
  exit 1
fi

if [[ ! -f ./nex_ai_q4_k_m.gguf ]]; then
  echo "[GAGAL] File nex_ai_q4_k_m.gguf tidak ada di folder ini."
  exit 1
fi

if [[ ! -f ./Modelfile.protect ]]; then
  echo "[GAGAL] File Modelfile.protect tidak ada di folder ini."
  exit 1
fi

if [[ ! -f ./Modelfile.production ]]; then
  echo "[GAGAL] File Modelfile.production tidak ada di folder ini."
  exit 1
fi

echo "Membuat nex-ai-protect (NEX-RED / reasoning prompt)..."
ollama create nex-ai-protect -f ./Modelfile.protect

echo "Membuat nex-ai-reflex (HTTP classifier prompt, bobot GGUF sama)..."
ollama create nex-ai-reflex -f ./Modelfile.production

echo
echo "[OK] Model siap."
ollama list | grep -i nex-ai || ollama list
