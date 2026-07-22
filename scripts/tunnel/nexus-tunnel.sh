#!/bin/bash
# ==============================================================================
# NEXUS CYBER FASE 2 - CLOUDFLARE TUNNEL LAUNCHER
# ==============================================================================
# Menghubungkan sistem Nexus Cyber yang berjalan di PC lokal ke internet publik
# secara GRATIS via Cloudflare Tunnel (tanpa sewa VPS, tanpa port forwarding).
#
# Prasyarat:
#   1. Nexus Cyber sudah berjalan (via docker compose atau binary)
#   2. cloudflared sudah terinstall (skrip ini akan otomatis install jika belum ada)
#
# Usage:
#   bash scripts/nexus-tunnel.sh           # Default: tunnel ke port 8080 (WAF Gateway)
#   bash scripts/nexus-tunnel.sh --dashboard  # Tunnel ke port 3001 (SOC Dashboard)
#   bash scripts/nexus-tunnel.sh --port 80    # Tunnel ke port custom
# ==============================================================================

set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
WHITE='\033[0;37m'
BOLD='\033[1m'
NC='\033[0m'

# ── Parse Arguments ──────────────────────────────────────────────────────────
TARGET_PORT=8080
TARGET_LABEL="WAF Core Gateway"

while [[ $# -gt 0 ]]; do
    case $1 in
        --dashboard)
            TARGET_PORT=3001
            TARGET_LABEL="SOC Command Center Dashboard"
            shift
            ;;
        --port)
            TARGET_PORT="$2"
            TARGET_LABEL="Custom Service (Port $2)"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

echo -e "${CYAN}${BOLD}============================================================${NC}"
echo -e "${CYAN}${BOLD}   NEXUS CYBER: CLOUDFLARE TUNNEL LAUNCHER                 ${NC}"
echo -e "${CYAN}${BOLD}   Target: ${TARGET_LABEL} (Port ${TARGET_PORT})            ${NC}"
echo -e "${CYAN}${BOLD}============================================================${NC}"

# ── Step 1: Deteksi OS & Install cloudflared jika belum ada ──────────────────
echo -e "\n${YELLOW}[1/3] Checking cloudflared installation...${NC}"

install_cloudflared_linux() {
    echo -e "${YELLOW}[*] Installing cloudflared for Linux (x86_64)...${NC}"
    LATEST_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64"
    curl -fsSL "$LATEST_URL" -o /usr/local/bin/cloudflared
    chmod +x /usr/local/bin/cloudflared
    echo -e "${GREEN}[OK] cloudflared installed at /usr/local/bin/cloudflared${NC}"
}

install_cloudflared_mac() {
    echo -e "${YELLOW}[*] Installing cloudflared via Homebrew (macOS)...${NC}"
    if command -v brew &> /dev/null; then
        brew install cloudflare/cloudflare/cloudflared
    else
        echo -e "${RED}[!] Homebrew not found. Install manually:${NC}"
        echo -e "    https://github.com/cloudflare/cloudflared/releases"
        exit 1
    fi
}

if command -v cloudflared &> /dev/null; then
    echo -e "${GREEN}[OK] cloudflared detected: $(cloudflared --version)${NC}"
else
    echo -e "${YELLOW}[!] cloudflared not found. Installing automatically...${NC}"
    OS_TYPE="$(uname -s)"
    case "$OS_TYPE" in
        Linux*)
            install_cloudflared_linux
            ;;
        Darwin*)
            install_cloudflared_mac
            ;;
        *)
            echo -e "${RED}[!] Unsupported OS: $OS_TYPE${NC}"
            echo -e "    Download manually from: https://github.com/cloudflare/cloudflared/releases"
            exit 1
            ;;
    esac
fi

# ── Step 2: Verifikasi layanan target sudah berjalan ─────────────────────────
echo -e "\n${YELLOW}[2/3] Verifying Nexus Cyber service on port ${TARGET_PORT}...${NC}"

# Cek apakah port target sedang listening (TCP check tanpa dependensi eksternal)
if command -v nc &> /dev/null; then
    if nc -z localhost "$TARGET_PORT" 2>/dev/null; then
        echo -e "${GREEN}[OK] Service is running and listening on port ${TARGET_PORT}.${NC}"
    else
        echo -e "${RED}[!] No service detected on port ${TARGET_PORT}.${NC}"
        echo -e "${YELLOW}    Pastikan Nexus Cyber sudah dijalankan terlebih dahulu:${NC}"
        echo -e "    Mode Docker : bash scripts/deploy-local-pc.sh"
        echo -e "    Mode Binary : bash scripts/deploy-local-pc.sh --binary"
        echo -e ""
        echo -e "${YELLOW}    Melanjutkan tunnel launch anyway...${NC}"
    fi
elif command -v curl &> /dev/null; then
    if curl -s --max-time 2 "http://localhost:${TARGET_PORT}" > /dev/null 2>&1; then
        echo -e "${GREEN}[OK] Service is reachable on port ${TARGET_PORT}.${NC}"
    else
        echo -e "${YELLOW}[i] Could not verify port ${TARGET_PORT}. Proceeding with tunnel...${NC}"
    fi
fi

# ── Step 3: Launch Cloudflare Tunnel ─────────────────────────────────────────
echo -e "\n${YELLOW}[3/3] Launching Cloudflare Tunnel...${NC}"
echo -e "${CYAN}    Menghubungkan http://localhost:${TARGET_PORT} ke internet publik...${NC}"
echo -e "${WHITE}    Tekan Ctrl+C untuk menghentikan tunnel.${NC}"
echo -e ""
echo -e "${CYAN}${BOLD}============================================================${NC}"
echo -e "${YELLOW}${BOLD}    Tunggu URL publik HTTPS muncul di bawah ini...${NC}"
echo -e "${CYAN}${BOLD}============================================================${NC}"
echo -e ""

# Jalankan tunnel (blocking - ini yang menampilkan URL publik di stdout)
cloudflared tunnel --url "http://localhost:${TARGET_PORT}"
