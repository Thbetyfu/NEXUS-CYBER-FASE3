#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
echo "Mematikan Nexus Cyber deploy-local..."
docker compose --project-name nexus-local down
echo "[OK] Stack dimatikan. Data Postgres masih di volume Docker."
