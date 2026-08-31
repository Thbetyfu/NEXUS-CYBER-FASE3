"""Channel Starter configuration."""

import os
from pathlib import Path

_PACKAGE = Path(__file__).resolve().parent.parent
TEMPLATES_DIR = Path(os.getenv("CHANNEL_STARTER_TEMPLATES", str(_PACKAGE / "templates")))
SITES_DIR = Path(os.getenv("CHANNEL_STARTER_SITES_DIR", str(_PACKAGE / "sites")))
# Committed demos (not gitignored). Preview looks here after sites/.
EXAMPLES_DIR = Path(os.getenv("CHANNEL_STARTER_EXAMPLES_DIR", str(_PACKAGE / "examples")))
SUBDOMAIN_BASE = os.getenv("CHANNEL_STARTER_SUBDOMAIN_BASE", "nexus-lab.test")
SERVE_PORT = int(os.getenv("CHANNEL_STARTER_PORT", "3010"))

# Path inside Caddy container (deploy-local docker-compose mount)
CADDY_CONTAINER_ROOT = os.getenv("CHANNEL_STARTER_CADDY_ROOT", "/srv/channel-starter")
CADDY_AGGREGATE_NAME = "ChannelStarter.caddy"
CADDY_SNIPPETS_DIR = "_snippets"
CADDY_BUNDLE_DIR = "_caddy"

# Lab `.test` = HTTP only via hosts file; public domain = auto-TLS in Caddy
HTTP_ONLY = os.getenv(
    "CHANNEL_STARTER_HTTP_ONLY",
    "true" if SUBDOMAIN_BASE.endswith(".test") else "false",
).lower() in {"1", "true", "yes", "on"}

# Docker container name for `deploy reload` (deploy-local default)
CADDY_CONTAINER = os.getenv("CHANNEL_STARTER_CADDY_CONTAINER", "nexus-local-caddy")

_NEXUS_CORE = _PACKAGE.parent
DEPLOY_LOCAL_DIR = Path(os.getenv("NEXUS_DEPLOY_LOCAL_DIR", str(_NEXUS_CORE / "deploy-local")))
UPSELL_ENV_FILE = DEPLOY_LOCAL_DIR / "channel-starter-upsell.env"
GAAS_REGISTRY_NAME = "gaas-upsell.json"

NEXRED_BRIDGE_URL = os.getenv("NEXRED_BRIDGE_URL", "http://127.0.0.1:3004")
CHANNEL_ORIGIN_BASE = os.getenv("CHANNEL_ORIGIN_BASE", "http://channel-origin:8099")
