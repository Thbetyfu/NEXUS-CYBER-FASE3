"""Channel Starter configuration."""

import os
from pathlib import Path

_PACKAGE = Path(__file__).resolve().parent.parent
_ENV_FILE = _PACKAGE / ".env"


def load_wizard_env(*, path: Path | None = None, override: bool = False) -> Path:
    """Load gitignored channel-starter/.env (VERCEL_TOKEN). Does not override process env unless asked."""
    env_path = path or _ENV_FILE
    if not env_path.is_file():
        return env_path
    try:
        text = env_path.read_text(encoding="utf-8")
    except OSError:
        return env_path
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        if not key:
            continue
        value = value.strip().strip("'").strip('"')
        if override or key not in os.environ:
            os.environ[key] = value
    return env_path


def upsert_wizard_env(key: str, value: str, *, path: Path | None = None) -> Path:
    """Write one key into gitignored .env without printing the value."""
    env_path = path or _ENV_FILE
    lines: list[str] = []
    if env_path.is_file():
        try:
            lines = env_path.read_text(encoding="utf-8").splitlines()
        except OSError:
            lines = []
    found = False
    prefix = f"{key}="
    new_line = f"{key}={value}"
    out: list[str] = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith(prefix) or stripped.startswith(f"# {prefix}"):
            if not found:
                out.append(new_line)
                found = True
            continue
        out.append(line)
    if not found:
        if out and out[-1] != "":
            out.append("")
        out.append(new_line)
    env_path.write_text("\n".join(out) + "\n", encoding="utf-8")
    os.environ[key] = value
    return env_path


load_wizard_env()
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
