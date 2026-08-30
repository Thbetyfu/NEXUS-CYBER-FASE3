"""Lab-only nexus_session for Playwright gallery/vault.

Visitors on PROTECTED_HOST still solve Matrix Verification (PoW).
A Job obtains a cookie only when NEX_RED_LAB_SESSION_TOKEN matches
gateway NEXUS_LAB_SESSION_TOKEN via POST /api/verify-session (fail-closed).
Tokens are never written into findings.
"""

from __future__ import annotations

import os
from typing import Any
from urllib.parse import urlparse

import requests

from agents.runtime.waf_bind import BrowserWafBind, bind_waf_edge


def configured_lab_session_token() -> str:
    return (
        os.getenv("NEX_RED_LAB_SESSION_TOKEN") or os.getenv("NEXUS_LAB_SESSION_TOKEN") or ""
    ).strip()


def obtain_lab_nexus_session(target_url: str, protected_host: str | None = None) -> str:
    """POST lab_token to /api/verify-session through the WAF bind. Empty = no session."""
    token = configured_lab_session_token()
    if not token:
        return ""
    bound, extra = bind_waf_edge(target_url, protected_host, edge=True)
    if not bound:
        return ""
    url = bound.rstrip("/") + "/api/verify-session"
    headers = {**extra, "X-Nexus-Lab-Token": token}
    try:
        resp = requests.post(
            url,
            data={"lab_token": token},
            headers=headers,
            timeout=8,
            allow_redirects=False,
        )
    except requests.RequestException:
        return ""
    value = resp.cookies.get("nexus_session") or ""
    if value:
        return value
    raw = resp.headers.get("Set-Cookie") or ""
    if "nexus_session=" in raw.lower():
        for part in raw.split(";"):
            if part.strip().lower().startswith("nexus_session="):
                return part.split("=", 1)[1].strip()
    return ""


def attach_lab_session_cookie(context: Any, bind: BrowserWafBind, cookie_value: str) -> None:
    if not cookie_value or context is None:
        return
    host = bind.logical_host or (urlparse(bind.navigate_url).hostname or "127.0.0.1")
    nav = bind.navigate_url or f"http://{host}/"
    context.add_cookies(
        [
            {
                "name": "nexus_session",
                "value": cookie_value,
                "url": nav if nav.startswith("http") else f"http://{host}/",
                "path": "/",
                "httpOnly": True,
            }
        ]
    )
