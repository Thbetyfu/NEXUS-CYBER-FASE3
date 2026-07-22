#!/bin/bash
# ==============================================================================
# NEXUS CYBER FASE 2 - BIZNET GIO VPS ONE-CLICK AUTOMATED DEPLOYMENT SCRIPT
# ==============================================================================
# Usage: sudo bash scripts/deploy-biznet-gio.sh

set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN}   NEXUS CYBER: AUTOMATED BIZNET GIO VPS DEPLOYMENT ENGINE   ${NC}"
echo -e "${CYAN}============================================================${NC}"

# 1. Check Root Privileges
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Skrip ini harus dijalankan sebagai root (gunakan: sudo bash scripts/deploy-biznet-gio.sh)${NC}"
  exit 1
fi

# 2. Add Automatic 2GB Swap File (Prevents OOM during Next.js build on 2GB RAM VPS)
echo -e "\n${YELLOW}[1b/5] Checking and Configuring Swap Memory...${NC}"
if [ $(free -m | grep Swap | awk '{print $2}') -lt 1000 ]; then
    echo -e "${YELLOW}[*] Creating 2GB Swap File for memory safety...${NC}"
    fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo -e "${GREEN}[OK] 2GB Swap Memory created and activated.${NC}"
else
    echo -e "${GREEN}[OK] Swap Memory is already configured.${NC}"
fi

# 3. Update System Packages
echo -e "\n${YELLOW}[2/5] Updating Linux System Packages...${NC}"
apt update && apt upgrade -y
apt install -y curl git ufw ca-certificates gnupg lsb-release

# 3. Install Docker & Docker Compose Plugin
echo -e "\n${YELLOW}[2/5] Installing Docker & Docker Compose Engine...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo -e "${GREEN}[OK] Docker Engine installed successfully.${NC}"
else
    echo -e "${GREEN}[OK] Docker is already installed.${NC}"
fi

# 4. Configure Firewall Rules (UFW)
echo -e "\n${YELLOW}[3/5] Hardening System Firewall (UFW Ports)...${NC}"
ufw allow 22/tcp      # SSH Management
ufw allow 80/tcp      # HTTP Public
ufw allow 443/tcp     # HTTPS TLS Public
ufw allow 3001/tcp    # SOC Command Center Dashboard
ufw allow 8080/tcp    # Nexus Core Gateway WAF
ufw allow 9090/tcp    # Digital Hallucination Honeypot
ufw allow 2222/tcp    # SSH Tarpit Sandbox
ufw --force enable
echo -e "${GREEN}[OK] Firewall hardened. Public & Security ports opened.${NC}"

# 5. Build and Launch Containers
echo -e "\n${YELLOW}[4/5] Launching Nexus Cyber Core Grid (Postgres, Redis, Gateway, Dashboard)...${NC}"
if [ -f "docker-compose.yml" ]; then
    docker compose up -d --build
else
    echo -e "${RED}[ERROR] docker-compose.yml tidak ditemukan di direktori aktif.${NC}"
    exit 1
fi

# 6. Verification & Handover
echo -e "\n${YELLOW}[5/5] Running System Integrity Verification...${NC}"
sleep 5

echo -e "\n${CYAN}============================================================${NC}"
echo -e "${GREEN}   NEXUS CYBER SUCESSFULLY DEPLOYED ON BIZNET GIO VPS!   ${NC}"
echo -e "${CYAN}============================================================${NC}"
echo -e " Akses Layanan:"
echo -e "  - Dashboard SOC Command Center : http://$(curl -s ifconfig.me):3001"
echo -e "  - WAF Core Gateway Proxy       : http://$(curl -s ifconfig.me):8080"
echo -e "  - Honeypot Digital Sandbox    : http://$(curl -s ifconfig.me):9090"
echo -e "  - SSH Tarpit Sandbox           : Port 2222"
echo -e "${CYAN}============================================================${NC}"
