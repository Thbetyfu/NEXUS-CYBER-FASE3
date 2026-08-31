"""Optional Playwright session. Missing install or NEX_RED_BROWSER=0 is a skip, not a crash."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Optional

from agents.runtime.waf_bind import BrowserWafBind
from core.config import config
from sandbox.policy import is_url_allowed

_NEXRED_ROOT = Path(__file__).resolve().parents[2]
_REPO_BROWSERS = _NEXRED_ROOT / "workspaces" / ".playwright-browsers"
_REPO_TMP = _NEXRED_ROOT / "workspaces" / ".tmp"


def playwright_importable() -> bool:
    try:
        from playwright.sync_api import sync_playwright  # noqa: F401
    except ImportError:
        return False
    return True


def chromium_present(root: Path) -> bool:
    if not root.is_dir():
        return False
    try:
        return any(item.name.startswith("chromium") for item in root.iterdir())
    except OSError:
        return False


def pin_playwright_runtime_dirs() -> str:
    """Chromium + temp stay on the NEX-RED drive (this lab: D:), never Windows Temp on C:."""
    explicit = (os.environ.get("PLAYWRIGHT_BROWSERS_PATH") or "").strip()
    chosen = Path(explicit) if explicit else _REPO_BROWSERS
    chosen.mkdir(parents=True, exist_ok=True)
    os.environ["PLAYWRIGHT_BROWSERS_PATH"] = str(chosen)
    _REPO_TMP.mkdir(parents=True, exist_ok=True)
    os.environ["TEMP"] = str(_REPO_TMP)
    os.environ["TMP"] = str(_REPO_TMP)
    return str(chosen)


def assert_browser_target(url: str, live_target: str) -> Optional[str]:
    if not is_url_allowed(url, live_target):
        return "host_not_allowed"
    return None


def screenshot_path(workspace: Path, name: str) -> Path:
    workspace.mkdir(parents=True, exist_ok=True)
    return workspace / name


def open_bound_page(playwright: Any, bind: BrowserWafBind, session_cookie: str = ""):
    """Chromium with WAF MAP. Do not send Host via extra_http_headers — Chromium rejects it."""
    from agents.runtime.lab_session import attach_lab_session_cookie

    browser = playwright.chromium.launch(
        headless=True,
        args=[*bind.chromium_args, "--disable-gpu", "--disable-dev-shm-usage"],
    )
    extra = {
        key: value
        for key, value in (bind.extra_headers or {}).items()
        if key.lower() != "host"
    }
    context_kwargs: dict[str, Any] = {"user_agent": config.user_agent}
    if extra:
        context_kwargs["extra_http_headers"] = extra
    context = browser.new_context(**context_kwargs)
    if session_cookie:
        attach_lab_session_cookie(context, bind, session_cookie)
    return browser, context.new_page()
