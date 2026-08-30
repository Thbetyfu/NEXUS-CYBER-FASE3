"""Authorized lab browser flows: benign image upload and five wrong vault passwords.

Requires Playwright when NEX_RED_BROWSER=1. No exploit payloads. Screenshots stay in the scan workspace.
"""

from __future__ import annotations

import base64
from pathlib import Path
from typing import List, Tuple

from agents.runtime.browser import (
    assert_browser_target,
    open_bound_page,
    pin_playwright_runtime_dirs,
    playwright_importable,
    screenshot_path,
)
from agents.runtime.lab_session import obtain_lab_nexus_session
from agents.runtime.waf_bind import BrowserWafBind, bind_waf_browser
from core.config import config
from core.types import Evidence, FindingSeverity, FindingSource, LiveVerdict, VulnerabilityFinding

# 1x1 PNG. Not malware. Used only for the authorized gallery form.
_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)

_WRONG = ("salah1", "salah2", "salah3", "salah4", "salah5")


def _finding(title: str, verdict: LiveVerdict, severity: FindingSeverity, endpoint: str, snippet: str) -> VulnerabilityFinding:
    return VulnerabilityFinding(
        id=f"NEXRED-BROWSER-{verdict.value}-{abs(hash(title + snippet)) % 10**8}",
        title=title,
        severity=severity,
        cwe_id="CWE-307" if "vault" in title.lower() or "password" in title.lower() else None,
        owasp_category="A07:2021-Identification and Authentication Failures",
        target_endpoint=endpoint,
        param_or_source="browser_lab_flow",
        proof_of_concept=snippet[:300],
        remediation="Record lab gallery/vault outcomes; ban after five failed vault passwords is expected on Nexus.",
        mitigated_by_nexus=verdict == LiveVerdict.MITIGATED_BY_NEXUS,
        source=FindingSource.LIVE_HTTP,
        confidence=0.65 if verdict == LiveVerdict.CONFIRMED else 0.5,
        live_verdict=verdict,
        evidence=[Evidence(kind="browser_flow", summary=title, snippet=snippet[:300])],
    )


def execute_browser_checks(
    target_url: str,
    workspace: Path | None = None,
    *,
    protected_host: str | None = None,
) -> Tuple[List[VulnerabilityFinding], int]:
    endpoint = target_url.rstrip("/") + "/"
    bind = bind_waf_browser(endpoint, protected_host)
    if not config.enable_browser:
        return (
            [
                _finding(
                    "Browser lab flows disabled (set NEX_RED_BROWSER=1 to enable)",
                    LiveVerdict.SAST_ONLY,
                    FindingSeverity.INFO,
                    endpoint,
                    "NEX_RED_BROWSER=0",
                )
            ],
            0,
        )
    allow_against = target_url
    blocked = assert_browser_target(endpoint, allow_against)
    if not blocked and bind.navigate_url:
        blocked = assert_browser_target(bind.navigate_url, allow_against)
    if blocked:
        return (
            [
                _finding(
                    "Browser target host is not allow-listed",
                    LiveVerdict.SAST_ONLY,
                    FindingSeverity.INFO,
                    endpoint,
                    blocked,
                )
            ],
            0,
        )
    if not playwright_importable():
        return (
            [
                _finding(
                    "Playwright not installed; browser lab flows skipped",
                    LiveVerdict.SAST_ONLY,
                    FindingSeverity.INFO,
                    endpoint,
                    "pip install playwright && python -m playwright install chromium",
                )
            ],
            0,
        )
    pin_playwright_runtime_dirs()
    try:
        return _run_playwright(bind, workspace or Path(config.workspaces_dir) / "browser")
    except Exception as exc:
        return (
            [
                _finding(
                    "Chromium/Playwright runtime unavailable; browser lab flows skipped",
                    LiveVerdict.SAST_ONLY,
                    FindingSeverity.INFO,
                    endpoint,
                    type(exc).__name__ + ": " + str(exc).splitlines()[0][:180],
                )
            ],
            0,
        )


def _is_pow_splash(title: str) -> bool:
    lower = (title or "").lower()
    return "verifying" in lower or "matrix verification" in lower


def _run_playwright(bind: BrowserWafBind, workspace: Path) -> Tuple[List[VulnerabilityFinding], int]:
    from playwright.sync_api import sync_playwright

    endpoint = bind.navigate_url
    findings: List[VulnerabilityFinding] = []
    ran = 0
    png = workspace / "lab-upload.png"
    workspace.mkdir(parents=True, exist_ok=True)
    png.write_bytes(_PNG)
    session = obtain_lab_nexus_session(endpoint, bind.logical_host or None)

    with sync_playwright() as playwright:
        browser = None
        try:
            browser, page = open_bound_page(playwright, bind, session_cookie=session)
            page.goto(endpoint, wait_until="domcontentloaded", timeout=25000)
            ran += 1
            title = page.title()
            if _is_pow_splash(title):
                if session:
                    reason = "lab session cookie did not pass Matrix Verification"
                else:
                    reason = "no lab session (NEX_RED_LAB_SESSION_TOKEN unset or rejected)"
                findings.append(
                    _finding(
                        "Browser stopped on the session challenge (PoW); lab flows not completed",
                        LiveVerdict.SAST_ONLY,
                        FindingSeverity.INFO,
                        endpoint,
                        f"title={title}; {reason}",
                    )
                )
                return findings, ran
            file_input = page.locator("input[type='file']").first
            if file_input.count() > 0:
                file_input.set_input_files(str(png))
                ran += 1
                page.wait_for_timeout(1500)
                body = page.inner_text("body")[:800]
                shot = screenshot_path(workspace, "gallery.png")
                page.screenshot(path=str(shot))
                if "successfully uploaded" in body.lower() or (
                    "avse" in body.lower() and "success" in body.lower()
                ):
                    findings.append(
                        _finding(
                            "Gallery accepted a benign image upload in the browser",
                            LiveVerdict.REJECTED,
                            FindingSeverity.INFO,
                            endpoint,
                            "upload_ok",
                        )
                    )
                elif "connection error" in body.lower() or "mux" in body.lower():
                    findings.append(
                        _finding(
                            "Gallery upload failed in the browser (connection or WAF)",
                            LiveVerdict.CONFIRMED,
                            FindingSeverity.MEDIUM,
                            endpoint,
                            body[:200],
                        )
                    )
                else:
                    findings.append(
                        _finding(
                            "Gallery file input was used; outcome text was inconclusive",
                            LiveVerdict.SAST_ONLY,
                            FindingSeverity.INFO,
                            endpoint,
                            body[:200],
                        )
                    )
            else:
                findings.append(
                    _finding(
                        "No file input on the page; gallery browser flow skipped",
                        LiveVerdict.SAST_ONLY,
                        FindingSeverity.INFO,
                        endpoint,
                        title,
                    )
                )

            vault = page.get_by_placeholder("ENTER SECURE ACCESS CODE")
            if vault.count() == 0:
                vault = page.locator("input[type='password']").first
            button = page.get_by_role("button", name="Decrypt")
            if vault.count() > 0 and button.count() > 0:
                last = ""
                for i, word in enumerate(_WRONG, start=1):
                    vault.fill(word)
                    button.click()
                    ran += 1
                    page.wait_for_timeout(800)
                    last = page.inner_text("body")
                    if "blacklisted" in last.lower() or "access denied" in last.lower() or "banned" in last.lower():
                        shot = screenshot_path(workspace, "vault-ban.png")
                        page.screenshot(path=str(shot))
                        findings.append(
                            _finding(
                                "Vault locked the session after repeated wrong passwords",
                                LiveVerdict.MITIGATED_BY_NEXUS,
                                FindingSeverity.INFO,
                                endpoint,
                                f"fail_count={i}",
                            )
                        )
                        break
                else:
                    findings.append(
                        _finding(
                            "Five wrong vault passwords did not show a ban message",
                            LiveVerdict.SAST_ONLY,
                            FindingSeverity.LOW,
                            endpoint,
                            last[:200],
                        )
                    )
            else:
                findings.append(
                    _finding(
                        "Vault form not found; five-password browser flow skipped",
                        LiveVerdict.SAST_ONLY,
                        FindingSeverity.INFO,
                        endpoint,
                        title,
                    )
                )
        except Exception as exc:
            findings.append(
                _finding(
                    "Browser lab flow raised an error",
                    LiveVerdict.SAST_ONLY,
                    FindingSeverity.INFO,
                    endpoint,
                    type(exc).__name__ + ": " + str(exc).splitlines()[0][:180],
                )
            )
        finally:
            if browser is not None:
                try:
                    browser.close()
                except Exception:
                    pass
    return findings, ran
