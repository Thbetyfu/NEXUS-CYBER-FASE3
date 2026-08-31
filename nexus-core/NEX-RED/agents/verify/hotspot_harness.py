"""Hotspot posture: control plane and datastores must stay closed to the lab client.

Not a pentest. Same intent as deploy-local/red-team/CHECKLIST.md items 5–7.
Skipped on loopback unless NEX_RED_HOTSPOT_HARNESS=1 (operator laptop often runs SOC locally).
"""

from __future__ import annotations

import ipaddress
import os
import socket
from typing import List, Sequence, Tuple
from urllib.parse import urlparse

from agents.runtime.http import SafeHttpClient
from core.config import config
from core.types import DefenseDelta, Evidence, FindingSeverity, FindingSource, LiveVerdict, VulnerabilityFinding


def should_run_hotspot_harness(target_url: str, *, force: bool = False) -> bool:
    flag = (os.getenv("NEX_RED_HOTSPOT_HARNESS") or config.hotspot_harness or "auto").strip().lower()
    if force or flag in {"1", "true", "yes", "on"}:
        return True
    if flag in {"0", "false", "no", "off"}:
        return False
    host = (urlparse(target_url).hostname or "").lower()
    if not host:
        return False
    try:
        ip = ipaddress.ip_address(host)
    except ValueError:
        return False
    return ip.is_private and not ip.is_loopback


def _tcp_probe(host: str, port: int, timeout: float = 1.5) -> str:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return "open"
    except socket.timeout:
        return "timeout"
    except OSError:
        return "closed"


def _finding(
    title: str,
    verdict: LiveVerdict,
    severity: FindingSeverity,
    endpoint: str,
    check: str,
    snippet: str,
    *,
    confirmed_leak: bool = False,
) -> VulnerabilityFinding:
    return VulnerabilityFinding(
        id=f"NEXRED-HOTSPOT-{check}-{abs(hash(endpoint + title)) % 10**8}",
        title=title,
        severity=severity,
        cwe_id="CWE-668" if confirmed_leak else None,
        owasp_category="A05:2021-Security Misconfiguration" if confirmed_leak else None,
        target_endpoint=endpoint,
        param_or_source=check,
        proof_of_concept=snippet[:300],
        remediation=(
            "Bind SOC and datastores to 127.0.0.1 on the blue-team laptop; do not publish :8081/:3001/:5432/:6379 to the hotspot."
            if confirmed_leak
            else "Keep control plane and datastores off the hotspot; honeypot :9090 is an HTTP tarpit, not a Cowrie/T-Pot stack."
        ),
        mitigated_by_nexus=False,
        source=FindingSource.LIVE_HTTP,
        confidence=0.8 if confirmed_leak else 0.6,
        live_verdict=verdict,
        defense_delta=DefenseDelta.BOTH_HELD if verdict == LiveVerdict.REJECTED else None,
        evidence=[Evidence(kind="hotspot_posture", summary=title, snippet=snippet[:300])],
        agent="access",
    )


def execute_hotspot_harness(
    target_url: str,
    *,
    force: bool = False,
    control_ports: Sequence[int] = (8081, 3001),
    data_ports: Sequence[int] = (5432, 6379),
    honeypot_port: int = 9090,
) -> Tuple[List[VulnerabilityFinding], int]:
    if not should_run_hotspot_harness(target_url, force=force):
        return [], 0
    host = urlparse(target_url).hostname
    if not host:
        return [], 0
    findings: List[VulnerabilityFinding] = []
    ran = 0
    for port in control_ports:
        ran += 1
        url = f"http://{host}:{port}/"
        client = SafeHttpClient(url, timeout=2)
        ev = client.request("GET", "/")
        if ev.status is not None and ev.status < 500:
            findings.append(
                _finding(
                    f"Control plane port {port} answered from this client",
                    LiveVerdict.CONFIRMED,
                    FindingSeverity.HIGH,
                    url,
                    "control_plane_exposed",
                    f"GET {url} → {ev.status}",
                    confirmed_leak=True,
                )
            )
        else:
            findings.append(
                _finding(
                    f"Control plane port {port} not reachable from this client",
                    LiveVerdict.REJECTED,
                    FindingSeverity.INFO,
                    url,
                    "control_plane_closed",
                    f"GET {url} → {ev.status or ev.error}",
                )
            )
    for port in data_ports:
        ran += 1
        state = _tcp_probe(host, port)
        endpoint = f"{host}:{port}"
        if state == "open":
            findings.append(
                _finding(
                    f"Datastore port {port} accepted a TCP connect from this client",
                    LiveVerdict.CONFIRMED,
                    FindingSeverity.HIGH,
                    endpoint,
                    "datastore_exposed",
                    f"tcp {endpoint} → open",
                    confirmed_leak=True,
                )
            )
        else:
            findings.append(
                _finding(
                    f"Datastore port {port} closed to this client",
                    LiveVerdict.REJECTED,
                    FindingSeverity.INFO,
                    endpoint,
                    "datastore_closed",
                    f"tcp {endpoint} → {state}",
                )
            )
    ran += 1
    honey = f"http://{host}:{honeypot_port}/"
    honey_ev = SafeHttpClient(honey, timeout=2).request("GET", "/")
    listening = honey_ev.status is not None or (honey_ev.error or "") in {
        "ReadTimeout",
        "ConnectTimeout",
        "Timeout",
    }
    if listening:
        findings.append(
            _finding(
                "Honeypot port answered or timed out (HTTP tarpit, not a Cowrie compromise)",
                LiveVerdict.SAST_ONLY,
                FindingSeverity.INFO,
                honey,
                "honeypot_present",
                f"GET {honey} → {honey_ev.status or honey_ev.error}",
            )
        )
    else:
        findings.append(
            _finding(
                "Honeypot port not reachable from this client",
                LiveVerdict.SAST_ONLY,
                FindingSeverity.INFO,
                honey,
                "honeypot_absent",
                f"GET {honey} → {honey_ev.status or honey_ev.error}",
            )
        )
    return findings, ran
