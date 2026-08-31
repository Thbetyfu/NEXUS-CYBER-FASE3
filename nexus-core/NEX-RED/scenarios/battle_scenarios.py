"""
Defense posture check.

Measures whether a live target is reachable and whether Nexus headers are present.
Replaces the previous hardcoded 64,000-attack simulation.
"""

from __future__ import annotations

from typing import Any, Dict

import requests

from core.config import config


class BattleScenarioRunner:
    @staticmethod
    def inspect_posture(target_url: str) -> Dict[str, Any]:
        if not target_url:
            return {
                "scenario": "defense_posture",
                "reachable": False,
                "waf_detected": False,
                "http_status": None,
                "latency_ms": None,
                "probes": 0,
            }
        try:
            resp = requests.get(
                target_url,
                timeout=5,
                headers={"User-Agent": config.user_agent},
            )
            headers = {k.lower(): v for k, v in resp.headers.items()}
            waf = "nexus" in headers.get("server", "").lower() or bool(headers.get("x-nexus-shield"))
            return {
                "scenario": "defense_posture",
                "reachable": True,
                "waf_detected": waf,
                "http_status": resp.status_code,
                "latency_ms": round(resp.elapsed.total_seconds() * 1000, 2),
                "probes": 1,
            }
        except requests.RequestException as exc:
            return {
                "scenario": "defense_posture",
                "reachable": False,
                "waf_detected": False,
                "http_status": None,
                "latency_ms": None,
                "probes": 1,
                "error": str(exc)[:200],
            }
