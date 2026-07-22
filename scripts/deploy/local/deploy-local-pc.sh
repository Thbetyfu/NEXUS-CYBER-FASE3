#!/bin/bash
# ==============================================================================
# NEXUS CYBER FASE 2 - LOCAL PC ONE-CLICK DEPLOYMENT ENGINE (LINUX / WSL / MAC)
# ==============================================================================
# Usage:
#   bash scripts/deploy-local-pc.sh          # Mode A: Docker Compose (recommended)
#   bash scripts/deploy-local-pc.sh --binary # Mode B: Manual binary only (no Docker)

set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
WHITE='\033[0;37m'
NC='\033[0m'

BINARY_MODE=false
if [[ "$1" == "--binary" ]]; then
    BINARY_MODE=true
fi

echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN}   NEXUS CYBER: LOCAL PC DEPLOYMENT ENGINE (UNIX/WSL/MAC)  ${NC}"
echo -e "${CYAN}============================================================${NC}"

# Resolve workspace root relative to this script's location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# 1. Dependency Check
echo -e "\n${YELLOW}[1/4] Checking System Dependencies...${NC}"
if command -v go &> /dev/null; then
    echo -e "${GREEN}[OK] Go Compiler: $(go version)${NC}"
else
    echo -e "${RED}[!] Warning: Go compiler is not installed. Install from https://go.dev/dl/${NC}"
fi

if command -v python3 &> /dev/null; then
    echo -e "${GREEN}[OK] Python: $(python3 --version)${NC}"
fi

if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}[i] Docker not found. Switching to --binary mode automatically.${NC}"
    BINARY_MODE=true
else
    echo -e "${GREEN}[OK] Docker Engine: $(docker --version)${NC}"
fi

# 2. Build Gateway Binary
echo -e "\n${YELLOW}[2/4] Building Nexus Core Gateway (Go Binary)...${NC}"
cd "$WORKSPACE_ROOT/nexus-core-gateway"
go build -o gateway ./cmd/gateway
echo -e "${GREEN}[OK] Gateway binary compiled successfully.${NC}"
cd "$WORKSPACE_ROOT"

# 3. Launch Mode
echo -e "\n${YELLOW}[3/4] Launching Nexus Cyber System...${NC}"

if [ "$BINARY_MODE" = true ]; then
    # Mode B: Binary only - gateway runs in foreground
    echo -e "${CYAN}[Mode B] Starting gateway binary directly (no Docker required)...${NC}"
    echo -e "${YELLOW}[i] Note: Postgres/Redis/Dashboard are NOT started in Binary mode.${NC}"
    echo -e "${YELLOW}    Start them manually or re-run without --binary flag.${NC}"
    echo -e ""
    "$WORKSPACE_ROOT/nexus-core-gateway/gateway" &
    GATEWAY_PID=$!
    echo -e "${GREEN}[OK] Gateway started (PID: $GATEWAY_PID)${NC}"
else
    # Mode A: Full Docker Compose (recommended)
    echo -e "${CYAN}[Mode A] Launching full stack via Docker Compose...${NC}"
    docker compose up -d --build
    echo -e "${GREEN}[OK] All Nexus Cyber services are up and running.${NC}"
fi

# 4. Cloudflare Tunnel
echo -e "\n${YELLOW}[4/4] Cloudflare Tunnel - Free Internet Exposure...${NC}"
if command -v cloudflared &> /dev/null; then
    echo -e "${GREEN}[OK] cloudflared is installed! To expose WAF to public internet for FREE:${NC}"
    echo -e "${CYAN}     cloudflared tunnel --url http://localhost:8080${NC}"
else
    echo -e "${CYAN}[i] Tip: Install cloudflared to expose your local WAF to the internet for FREE:${NC}"
    echo -e "${WHITE}    1. Download: https://github.com/cloudflare/cloudflared/releases${NC}"
    echo -e "${WHITE}    2. Run: cloudflared tunnel --url http://localhost:8080${NC}"
    echo -e "${WHITE}    3. Cloudflare gives you a FREE HTTPS public URL instantly!${NC}"
fi

# 5. Summary
echo -e "\n${CYAN}============================================================${NC}"
echo -e "${GREEN}   NEXUS CYBER LOCAL PC DEPLOYMENT READY!                   ${NC}"
echo -e "${CYAN}============================================================${NC}"
echo -e " Local Endpoint Access:"
echo -e "  - SOC Command Center Dashboard  : http://localhost:3001"
echo -e "  - WAF Core Gateway (Caddy Proxy): http://localhost:80"
echo -e "  - WAF Core Gateway (Direct)     : http://localhost:8080 (binary mode)"
echo -e "  - Honeypot Digital Sandbox      : http://localhost:9090"
echo -e "  - SSH Tarpit Sandbox            : Port 2222"
echo -e "\n Useful Commands:"
echo -e "  - Check container status : docker compose ps"
echo -e "  - View gateway logs      : docker compose logs -f gateway"
echo -e "  - Stop all services      : bash scripts/nexus-kill.sh"
echo -e "${CYAN}============================================================${NC}"
