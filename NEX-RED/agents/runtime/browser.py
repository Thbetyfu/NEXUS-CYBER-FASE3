"""Optional Playwright session. Missing install or NEX_RED_BROWSER=0 is a skip, not a crash."""

from __future__ import annotations

from pathlib import Path
from typing import Optional

from sandbox.policy import is_url_allowed


def playwright_importable() -> bool:
    try:
        from playwright.sync_api import sync_playwright  # noqa: F401
    except ImportError:
        return False
    return True


def assert_browser_target(url: str, live_target: str) -> Optional[str]:
    if not is_url_allowed(url, live_target):
        return "host_not_allowed"
    return None


def screenshot_path(workspace: Path, name: str) -> Path:
    workspace.mkdir(parents=True, exist_ok=True)
    return workspace / name
