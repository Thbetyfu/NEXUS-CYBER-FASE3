"""
Self-hosted Juice Shop class scoring.

Sends only benign GET plus one dummy-credential login POST. Confirmed classes
come from response shape (session, identity, or sensitive JSON), not from
copied Shannon exploit steps.
"""

from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse

from agents.runtime.http import HttpEvidence, SafeHttpClient
from agents.verify.posture import (
    looks_like_identity,
    looks_like_sensitive_record,
    looks_like_session,
    looks_like_user_directory,
)
from benchmarks.gold_set import JUICE_SHOP_GOLD_CLASSES, recall_by_class, recall_ratio
from core.config import config

DEFAULT_JUICE_URL = "http://127.0.0.1:3003"
_DUMMY_EMAIL = "nexred.lab@example.invalid"
_DUMMY_PASSWORD = "nexred-lab-not-a-secret"

# (check_name, method, path, json_body, kind)
# kind: collection | record | identity | session | no_500
_PROBES: Tuple[Tuple[str, str, str, Optional[dict], str], ...] = (
    ("juice_user_directory", "GET", "/api/Users", None, "collection"),
    ("juice_user_object", "GET", "/api/Users/1", None, "record"),
    ("juice_cards", "GET", "/api/Cards", None, "collection"),
    ("juice_addresses", "GET", "/api/Addresss", None, "collection"),
    ("juice_basket_items", "GET", "/api/BasketItems", None, "collection"),
    ("juice_basket", "GET", "/rest/basket/1", None, "record"),
    ("juice_security_answers", "GET", "/api/SecurityAnswers", None, "collection"),
    ("juice_complaints", "GET", "/api/Complaints", None, "collection"),
    ("juice_privacy", "GET", "/api/PrivacyRequests", None, "collection"),
    ("juice_whoami", "GET", "/rest/user/whoami", None, "identity"),
    (
        "juice_dummy_login",
        "POST",
        "/rest/user/login",
        {"email": _DUMMY_EMAIL, "password": _DUMMY_PASSWORD},
        "session",
    ),
    ("juice_product_search", "GET", "/rest/products/search?q=apple", None, "no_500"),
)

_KIND_TO_CLASS = {
    "collection": "authorization",
    "record": "authorization",
    "identity": "authentication",
    "session": "authentication",
    "no_500": "injection",
}


def juice_shop_url() -> str:
    return (config.juice_shop_url or DEFAULT_JUICE_URL).rstrip("/")


def _is_loopback(url: str) -> bool:
    host = (urlparse(url).hostname or "").lower()
    return host in {"127.0.0.1", "localhost", "::1"}


def wait_reachable(client: SafeHttpClient, attempts: int = 20, delay_s: float = 3.0) -> HttpEvidence:
    last = client.request("GET", "/")
    for _ in range(max(1, attempts) - 1):
        if last.error is None and last.status is not None and last.status < 500:
            return last
        time.sleep(delay_s)
        last = client.request("GET", "/")
    return last


def interpret_probe(name: str, ev: HttpEvidence, kind: str) -> Dict[str, Any]:
    gold = _KIND_TO_CLASS[kind]
    row: Dict[str, Any] = {
        "check": name,
        "gold_class": gold,
        "kind": kind,
        "http_status": ev.status,
        "error": ev.error,
        "confirmed": False,
        "verdict": "inconclusive",
        "summary": "",
    }
    if ev.error:
        row["summary"] = ev.error
        return row
    if ev.status in {401, 403}:
        row["verdict"] = "rejected"
        row["summary"] = "Unauthenticated request was denied"
        return row
    leaked = False
    if kind == "collection":
        leaked = looks_like_user_directory(ev.status, ev.body) or looks_like_sensitive_record(ev.status, ev.body)
    elif kind == "record":
        leaked = looks_like_sensitive_record(ev.status, ev.body)
    elif kind == "identity":
        leaked = looks_like_identity(ev.status, ev.body)
    elif kind == "session":
        leaked = looks_like_session(ev.status, ev.body)
    elif kind == "no_500":
        if ev.status is not None and ev.status >= 500:
            row["confirmed"] = True
            row["verdict"] = "confirmed"
            row["summary"] = "Benign search produced a server error"
            return row
        row["verdict"] = "rejected"
        row["summary"] = "Benign search did not crash the app"
        return row
    if leaked:
        row["confirmed"] = True
        row["verdict"] = "confirmed"
        row["summary"] = "Sensitive JSON or a session was returned without a valid lab session"
        return row
    row["verdict"] = "rejected"
    row["summary"] = "No sensitive record or session in the response"
    return row


def run_juice_probes(client: SafeHttpClient) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    for name, method, path, body, kind in _PROBES:
        ev = client.request(method, path, json_body=body)
        rows.append(interpret_probe(name, ev, kind))
    return rows


def run_juice_lab(
    target_url: Optional[str] = None,
    *,
    wait: bool = True,
    output_dir: Optional[Path] = None,
) -> Dict[str, Any]:
    url = (target_url or juice_shop_url()).rstrip("/")
    stamp = datetime.now(timezone.utc).isoformat()
    result: Dict[str, Any] = {
        "generated_at": stamp,
        "target_url": url,
        "reachable": False,
        "loopback_only": _is_loopback(url),
        "gold_classes": list(JUICE_SHOP_GOLD_CLASSES),
        "confirmed_classes": [],
        "live_recall_by_class": {name: False for name in JUICE_SHOP_GOLD_CLASSES},
        "live_recall": 0.0,
        "confirmed_findings": 0,
        "checks_run": 0,
        "live_precision": None,
        "hits": [],
        "checks": [],
        "note": "",
    }
    if not _is_loopback(url):
        result["note"] = "Juice Shop lab must stay on loopback (127.0.0.1 / localhost)."
        return result

    client = SafeHttpClient(url, timeout=8)
    health = wait_reachable(client, attempts=20 if wait else 1)
    if health.error or health.status is None or health.status >= 500:
        result["note"] = (
            "Juice Shop not reachable. Start NEX-RED/lab/juice-shop/START.bat "
            "then retry python NEX-RED/nexred.py lab-juice"
        )
        return _maybe_write(result, output_dir)

    result["reachable"] = True
    checks = run_juice_probes(client)
    hits = [item for item in checks if item.get("confirmed")]
    confirmed = [item["gold_class"] for item in hits]
    result["checks"] = checks
    result["hits"] = hits
    result["checks_run"] = len(checks)
    result["confirmed_classes"] = sorted(set(confirmed))
    result["confirmed_findings"] = len(hits)
    result["live_recall_by_class"] = recall_by_class(confirmed)
    result["live_recall"] = round(recall_ratio(confirmed), 4)
    result["live_precision"] = 1.0 if hits else None
    result["note"] = (
        "Class recall from benign HTTP only. 401/403 is a rejected check, not a Shannon miss-copy. "
        "equal_to_shannon_strix stays false."
    )
    return _maybe_write(result, output_dir)


def _maybe_write(result: Dict[str, Any], output_dir: Optional[Path]) -> Dict[str, Any]:
    if output_dir is None:
        return result
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    json_path = out / f"nexred_juice_lab_{stamp}.json"
    json_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
    result["json_path"] = str(json_path)
    return result
