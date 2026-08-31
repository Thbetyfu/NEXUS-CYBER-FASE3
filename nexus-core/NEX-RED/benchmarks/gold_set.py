"""Shannon Juice Shop *classes* only — no exploit steps, no payload lists."""

from __future__ import annotations

from typing import Iterable, Optional, Set

JUICE_SHOP_GOLD_CLASSES = (
    "authentication",
    "authorization",
    "injection",
    "xss",
    "ssrf",
)

CWE_TO_JUICE_CLASS = {
    "CWE-89": "injection",
    "CWE-78": "injection",
    "CWE-90": "injection",
    "CWE-943": "injection",
    "CWE-79": "xss",
    "CWE-918": "ssrf",
    "CWE-306": "authentication",
    "CWE-287": "authentication",
    "CWE-347": "authentication",
    "CWE-639": "authorization",
    "CWE-284": "authorization",
    "CWE-285": "authorization",
}

CHECK_TO_JUICE_CLASS = {
    "unauthenticated_mutating_route": "authentication",
    "unauthenticated_object_read": "authorization",
    "cross_account_object_read": "authorization",
    "juice_user_directory": "authorization",
    "juice_user_object": "authorization",
    "juice_cards": "authorization",
    "juice_addresses": "authorization",
    "juice_basket_items": "authorization",
    "juice_basket": "authorization",
    "juice_security_answers": "authorization",
    "juice_complaints": "authorization",
    "juice_privacy": "authorization",
    "juice_dummy_login": "authentication",
    "juice_whoami": "authentication",
    "juice_product_search": "injection",
}


def class_for_cwe(cwe_id: Optional[str]) -> Optional[str]:
    if not cwe_id:
        return None
    return CWE_TO_JUICE_CLASS.get(cwe_id.strip().upper())


def classes_from_labels(*, cwe_id: Optional[str] = None, check: Optional[str] = None) -> Set[str]:
    hits: Set[str] = set()
    mapped = class_for_cwe(cwe_id)
    if mapped:
        hits.add(mapped)
    if check and check in CHECK_TO_JUICE_CLASS:
        hits.add(CHECK_TO_JUICE_CLASS[check])
    return hits


def recall_by_class(hits: Iterable[str]) -> dict[str, bool]:
    found = set(hits)
    return {name: name in found for name in JUICE_SHOP_GOLD_CLASSES}


def recall_ratio(hits: Iterable[str]) -> float:
    found = set(hits) & set(JUICE_SHOP_GOLD_CLASSES)
    return len(found) / len(JUICE_SHOP_GOLD_CLASSES)
