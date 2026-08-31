#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
echo "Status Nexus Cyber deploy-local"
docker compose --project-name nexus-local ps
