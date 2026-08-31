#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

OFFLINE=0
if [[ "${1:-}" == "--offline" ]]; then
  OFFLINE=1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "[GAGAL] Docker belum terpasang."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "[GAGAL] Docker daemon belum running."
  exit 1
fi

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "[OK] .env dibuat dari .env.example"
fi

echo "[1/4] Memeriksa NEX-AI lokal (nex-ai-protect + nex-ai-reflex)..."
CHECK_PY="$(cd "$(dirname "$0")/.." && pwd)/scripts/check_nex_ai.py"
if [[ -z "${NEX_AI_REQUIRED:-}" ]]; then
  NEX_AI_REQUIRED="$(grep -E '^NEX_AI_REQUIRED=' .env 2>/dev/null | cut -d= -f2- | tr -d '\r"' | head -n1 || true)"
  export NEX_AI_REQUIRED
fi
if [[ "${NEX_AI_REQUIRED:-}" =~ ^(0|false|no|off)$ ]]; then
  echo "[NEX-AI] Gerbang dilewati (NEX_AI_REQUIRED=${NEX_AI_REQUIRED}). Bukan unduhan Hub."
else
  if command -v python3 >/dev/null 2>&1; then
    python3 "$CHECK_PY"
  elif command -v python >/dev/null 2>&1; then
    python "$CHECK_PY"
  else
    echo "Model AI tidak ada. Silakan pasang terlebih dahulu."
    echo "Python 3 diperlukan untuk memeriksa NEX-AI di Ollama lokal."
    echo "Bobot TIDAK diunduh dari Ollama Hub. Jangan ollama pull qwen / llama / gpt."
    echo "Salin nex_ai_q4_k_m.gguf ke folder nex-ai-models/ lalu jalankan nex-ai-models/IMPORT-OLLAMA.bat"
    exit 1
  fi
fi

COMPOSE=(docker compose --project-name nexus-local -f docker-compose.yml)
if [[ "$OFFLINE" -eq 1 ]]; then
  COMPOSE+=(-f docker-compose.offline.yml)
  echo "[MODE] Origin lokal: playground/Portofolio-Thoriq"
else
  echo "[MODE] Origin Vercel: https://portfolio-website-three-ruddy-65.vercel.app"
fi

echo "[2/4] Build & start..."
"${COMPOSE[@]}" up -d --build

echo "[3/4] Menunggu gateway :8080..."
ready=0
for _ in $(seq 1 45); do
  code="$(curl -sS -o /dev/null --max-time 3 -w "%{http_code}" http://127.0.0.1:8080/ || true)"
  if [[ "$code" =~ ^[1-5][0-9][0-9]$ ]]; then
    ready=1
    break
  fi
  sleep 2
done

if [[ "$ready" -eq 1 ]]; then
  echo "[OK] Gateway merespons."
else
  echo "[PERINGATAN] :8080 belum merespons. Cek: docker logs nexus-local-gateway"
fi

echo "[4/4] Alamat akses"
echo "  Laptop ini      :  http://127.0.0.1"
echo "  Gateway langsung :  http://127.0.0.1:8080"
PROTECTED_HOST="$(grep -E '^PROTECTED_HOST=' .env 2>/dev/null | cut -d= -f2- | tr -d '\r' | head -n1)"
PROTECTED_HOST="${PROTECTED_HOST:-portfolio.nexus-lab.test}"
echo "  Nama lab         :  http://${PROTECTED_HOST}"
echo "    hosts: 127.0.0.1 ${PROTECTED_HOST}"
if command -v hostname >/dev/null 2>&1; then
  hostname -I 2>/dev/null | tr ' ' '\n' | grep -E '^[0-9.]+$' | grep -v '^127\.' | while read -r ip; do
    echo "  Laptop lain     :  http://$ip"
  done
fi
echo
echo "Buka URL di atas (lewat WAF). Jangan pakai URL Vercel langsung untuk uji Nexus."
echo "Matikan: ./stop.sh"
