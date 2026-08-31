"""GaaS upsell wiring — satu PROTECTED_HOST aktif per lab instance."""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from channel_starter.config import (
    CHANNEL_ORIGIN_BASE,
    DEPLOY_LOCAL_DIR,
    GAAS_REGISTRY_NAME,
    HTTP_ONLY,
    NEXRED_BRIDGE_URL,
    SITES_DIR,
    UPSELL_ENV_FILE,
)
from channel_starter.deploy import apply_routing, reload_caddy
from channel_starter.generator import get_manifest, list_sites, regenerate_site_html, save_manifest
from channel_starter.types import GaasUpsellStatus, PricingTier, SiteManifest, GAAS_UPSELL_TIERS


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _target_url(subdomain: str) -> str:
    return f"http://{subdomain}" if HTTP_ONLY else f"https://{subdomain}"


def _origin_backend(slug: str) -> str:
    return f"{CHANNEL_ORIGIN_BASE.rstrip('/')}/{slug}/"


def get_active_upsell(*, sites_root: Path | str | None = None) -> SiteManifest | None:
    for manifest in list_sites(sites_root):
        if manifest.gaas_active:
            return manifest
    return None


def _write_gaas_registry(manifest: SiteManifest, *, sites_root: Path | str | None = None) -> Path:
    root = Path(sites_root) if sites_root else SITES_DIR
    registry_path = root / "_caddy" / GAAS_REGISTRY_NAME
    registry_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "active_slug": manifest.slug,
        "protected_host": manifest.protected_host or manifest.subdomain,
        "target_backend": _origin_backend(manifest.slug),
        "gaas_tier": manifest.gaas_tier.value if manifest.gaas_tier else None,
        "cowork_job_id": manifest.cowork_job_id,
        "loop_schedule_id": manifest.loop_schedule_id,
        "updated_at": _utcnow().isoformat(),
    }
    registry_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return registry_path


def _clear_gaas_registry(*, sites_root: Path | str | None = None) -> None:
    root = Path(sites_root) if sites_root else SITES_DIR
    registry_path = root / "_caddy" / GAAS_REGISTRY_NAME
    if registry_path.is_file():
        registry_path.unlink()


def write_deploy_local_env(manifest: SiteManifest) -> Path:
    """Patch deploy-local env fragment consumed by gateway compose."""
    DEPLOY_LOCAL_DIR.mkdir(parents=True, exist_ok=True)
    host = manifest.protected_host or manifest.subdomain
    target = _origin_backend(manifest.slug)
    live = _target_url(host)
    lines = [
        "# Channel Starter GaaS upsell — auto-generated",
        f"PROTECTED_HOST={host}",
        f"TARGET_BACKEND={target}",
        "TARGET_BACKEND_HOST=",
        f"NEX_RED_LIVE_TARGET={live}",
    ]
    UPSELL_ENV_FILE.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return UPSELL_ENV_FILE


def clear_deploy_local_env() -> None:
    if UPSELL_ENV_FILE.is_file():
        UPSELL_ENV_FILE.unlink()


def _http_post_json(url: str, payload: dict) -> dict:
    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def create_cowork_job(
    manifest: SiteManifest,
    *,
    bridge_url: str | None = None,
    autonomy_level: str = "L0",
    auto_approve: bool = False,
) -> str:
    base = (bridge_url or NEXRED_BRIDGE_URL).rstrip("/")
    title = f"Cowork upsell — {manifest.business_name}"
    payload = {
        "title": title,
        "target_url": _target_url(manifest.protected_host or manifest.subdomain),
        "autonomy_level": autonomy_level,
        "enable_llm": False,
        "auto_approve": auto_approve,
        "operator": "channel-starter-upsell",
    }
    try:
        result = _http_post_json(f"{base}/api/v1/jobs", payload)
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"NEX-RED bridge unreachable at {base}: {exc}") from exc
    job = result.get("job") or {}
    job_id = job.get("job_id", "")
    if not job_id:
        raise RuntimeError(f"Bridge did not return job_id: {result}")
    return job_id


def create_loop_schedule(
    manifest: SiteManifest,
    *,
    bridge_url: str | None = None,
    interval_hours: int = 168,
) -> str:
    base = (bridge_url or NEXRED_BRIDGE_URL).rstrip("/")
    payload = {
        "title": f"Loop GaaS — {manifest.business_name}",
        "target_url": _target_url(manifest.protected_host or manifest.subdomain),
        "autonomy_level": "L0",
        "interval_hours": interval_hours,
    }
    try:
        result = _http_post_json(f"{base}/api/v1/schedules", payload)
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"NEX-RED bridge unreachable at {base}: {exc}") from exc
    schedule = result.get("schedule") or {}
    return str(schedule.get("schedule_id", ""))


def _deactivate_other_sites(active_slug: str, *, sites_root: Path | str | None = None) -> list[str]:
    cleared: list[str] = []
    for manifest in list_sites(sites_root):
        if manifest.slug == active_slug or not manifest.gaas_active:
            continue
        manifest.gaas_status = GaasUpsellStatus.NONE
        manifest.gaas_tier = None
        manifest.protected_host = ""
        manifest.cowork_job_id = ""
        manifest.loop_schedule_id = ""
        manifest.upsell_at = None
        save_manifest(manifest, sites_root=sites_root)
        regenerate_site_html(manifest, sites_root=sites_root)
        cleared.append(manifest.slug)
    return cleared


def enable_upsell(
    slug: str,
    *,
    tier: PricingTier,
    sites_root: Path | str | None = None,
    create_job: bool | None = None,
    create_loop: bool = False,
    loop_interval_hours: int = 168,
    bridge_url: str | None = None,
    reload_caddy_after: bool = False,
) -> dict:
    if tier not in GAAS_UPSELL_TIERS:
        raise ValueError(f"Upsell tier must be tepi or cowork, got {tier.value}")

    # Pagar tipis (`tepi`): Caddy → gateway + Reflex, tanpa Job. Cowork tetap Job default.
    start_job = create_job if create_job is not None else (tier == PricingTier.COWORK)

    manifest = get_manifest(slug, sites_root=sites_root)
    if not manifest:
        raise KeyError(f"Site not found: {slug}")

    cleared = _deactivate_other_sites(slug, sites_root=sites_root)
    manifest.gaas_status = GaasUpsellStatus.ACTIVE
    manifest.gaas_tier = tier
    manifest.protected_host = manifest.subdomain
    manifest.tier = tier
    manifest.upsell_at = _utcnow()
    manifest.cowork_job_id = ""
    manifest.loop_schedule_id = ""

    job_error = None
    if start_job:
        try:
            manifest.cowork_job_id = create_cowork_job(manifest, bridge_url=bridge_url)
        except RuntimeError as exc:
            job_error = str(exc)

    if create_loop and tier == PricingTier.COWORK:
        try:
            manifest.loop_schedule_id = create_loop_schedule(
                manifest,
                bridge_url=bridge_url,
                interval_hours=loop_interval_hours,
            )
        except RuntimeError:
            pass

    save_manifest(manifest, sites_root=sites_root)
    regenerate_site_html(manifest, sites_root=sites_root)

    registry = _write_gaas_registry(manifest, sites_root=sites_root)
    env_path = write_deploy_local_env(manifest)
    routing = apply_routing(sites_root=sites_root)

    reload_result = None
    if reload_caddy_after:
        reload_result = reload_caddy()

    return {
        "slug": manifest.slug,
        "protected_host": manifest.protected_host,
        "gaas_tier": tier.value,
        "target_url": _target_url(manifest.protected_host),
        "target_backend": _origin_backend(manifest.slug),
        "cowork_job_id": manifest.cowork_job_id,
        "loop_schedule_id": manifest.loop_schedule_id,
        "cleared_slugs": cleared,
        "registry": str(registry),
        "deploy_env": str(env_path),
        "routing": routing,
        "job_error": job_error,
        "reload": reload_result,
        "pagar_tipis": tier == PricingTier.TEPI and not start_job,
        "next_steps": [
            "Restart gateway: cd deploy-local && docker compose up -d gateway",
            (
                f"Pagar tipis: hit WAF :8080 Host {manifest.protected_host} — "
                "bukan *.vercel.app langsung; bukan Job; bukan pulih Vercel"
                if tier == PricingTier.TEPI and not start_job
                else f"Scan via WAF: NEX_RED_LIVE_TARGET={_target_url(manifest.protected_host)}"
            ),
        ],
    }


def disable_upsell(
    slug: str,
    *,
    sites_root: Path | str | None = None,
    reload_caddy_after: bool = False,
) -> dict:
    manifest = get_manifest(slug, sites_root=sites_root)
    if not manifest:
        raise KeyError(f"Site not found: {slug}")

    manifest.gaas_status = GaasUpsellStatus.NONE
    manifest.gaas_tier = None
    manifest.protected_host = ""
    manifest.cowork_job_id = ""
    manifest.loop_schedule_id = ""
    manifest.upsell_at = None
    save_manifest(manifest, sites_root=sites_root)
    regenerate_site_html(manifest, sites_root=sites_root)

    if get_active_upsell(sites_root=sites_root) is None:
        _clear_gaas_registry(sites_root=sites_root)
        clear_deploy_local_env()

    routing = apply_routing(sites_root=sites_root)
    reload_result = reload_caddy() if reload_caddy_after else None
    return {
        "slug": slug,
        "gaas_status": GaasUpsellStatus.NONE.value,
        "routing": routing,
        "reload": reload_result,
    }


def upsell_status(*, sites_root: Path | str | None = None) -> dict:
    active = get_active_upsell(sites_root=sites_root)
    registry_path = (Path(sites_root) if sites_root else SITES_DIR) / "_caddy" / GAAS_REGISTRY_NAME
    registry = None
    if registry_path.is_file():
        registry = json.loads(registry_path.read_text(encoding="utf-8"))
    return {
        "active": active.model_dump(mode="json") if active else None,
        "deploy_env_exists": UPSELL_ENV_FILE.is_file(),
        "deploy_env": str(UPSELL_ENV_FILE),
        "registry": registry,
        "site_count": len(list_sites(sites_root)),
    }
