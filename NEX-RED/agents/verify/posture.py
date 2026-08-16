"""JSON shape checks for live posture. No exploit payloads."""

from __future__ import annotations

import json
from typing import Any, Optional

_SENSITIVE_KEYS = {
    "email",
    "username",
    "password",
    "token",
    "access_token",
    "cardnumber",
    "cardnum",
    "cvv",
    "iban",
    "securityanswer",
    "security_answer",
}


def parse_json(body: str) -> Optional[Any]:
    if not body:
        return None
    try:
        return json.loads(body)
    except json.JSONDecodeError:
        return None


def _as_record(payload: Any) -> Optional[dict]:
    if isinstance(payload, dict) and isinstance(payload.get("data"), dict):
        payload = payload["data"]
    if isinstance(payload, dict) and isinstance(payload.get("data"), list) and payload["data"]:
        payload = payload["data"][0]
    if isinstance(payload, list) and payload:
        payload = payload[0]
    return payload if isinstance(payload, dict) else None


def _has_sensitive_key(record: dict) -> bool:
    for key in record:
        if str(key).lower().replace("-", "") in _SENSITIVE_KEYS:
            value = record[key]
            if value not in (None, "", [], {}):
                return True
    return False


def looks_like_user_directory(status: Optional[int], body: str) -> bool:
    if status != 200:
        return False
    payload = parse_json(body)
    rows = payload.get("data") if isinstance(payload, dict) else payload
    if not isinstance(rows, list) or not rows:
        return False
    first = rows[0]
    if not isinstance(first, dict):
        return False
    return _has_sensitive_key(first)


def looks_like_sensitive_record(status: Optional[int], body: str) -> bool:
    if status != 200:
        return False
    record = _as_record(parse_json(body))
    if not record:
        return False
    return _has_sensitive_key(record)


def looks_like_session(status: Optional[int], body: str) -> bool:
    if status not in {200, 201}:
        return False
    payload = parse_json(body)
    if not isinstance(payload, dict):
        return False
    auth = payload.get("authentication")
    if isinstance(auth, dict) and auth.get("token"):
        return True
    return bool(payload.get("token") or payload.get("access_token"))


def looks_like_identity(status: Optional[int], body: str) -> bool:
    if status != 200:
        return False
    payload = parse_json(body)
    if not isinstance(payload, dict):
        return False
    user = payload.get("user")
    if not isinstance(user, dict) or not user:
        return False
    return any(user.get(key) not in (None, "", [], {}) for key in ("id", "email", "name", "username"))
