#!/usr/bin/env bash
# Fast gate used by pre-push hooks, GitHub Actions, and GitLab CI.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "==> NEX-RED unit tests"
python -m unittest discover -s NEX-RED/tests -v

echo "==> Go gateway vet + tests"
(
  cd nexus-core-gateway
  go vet ./...
  go test ./...
)

echo "==> deploy-local compose syntax"
docker compose --project-directory "$ROOT/deploy-local" -f "$ROOT/deploy-local/docker-compose.yml" config --quiet

echo "[OK] prepush checks passed"
