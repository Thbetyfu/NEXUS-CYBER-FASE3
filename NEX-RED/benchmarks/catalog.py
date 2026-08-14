"""
Capability catalog: Shannon (published coverage + sample reports), Strix (skill classes),
and NEX-RED detectors. Used to score coverage, not to run exploits.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional


SHANNON_CORE_CLASSES = [
    "sql_injection",
    "command_injection",
    "xss",
    "ssrf",
    "broken_auth_authz",
]

STRIX_SKILL_CLASSES = [
    "sql_injection",
    "xss",
    "ssrf",
    "idor",
    "authentication_jwt",
    "broken_function_level_authorization",
    "csrf",
    "ssti",
    "insecure_deserialization",
    "xxe",
    "insecure_file_uploads",
    "path_traversal",
    "command_injection",
    "nosql_injection",
    "mass_assignment",
    "business_logic",
    "race_conditions",
    "open_redirect",
    "prototype_pollution",
    "http_request_smuggling",
    "header_injection",
    "subdomain_takeover",
    "weak_password",
    "information_disclosure",
    "llm_prompt_injection",
]

CWE_TO_CLASS = {
    "CWE-89": "sql_injection",
    "CWE-78": "command_injection",
    "CWE-79": "xss",
    "CWE-918": "ssrf",
    "CWE-95": "code_injection",
    "CWE-94": "ssti",
    "CWE-502": "insecure_deserialization",
    "CWE-798": "hardcoded_secret",
    "CWE-639": "idor",
    "CWE-306": "broken_auth_authz",
    "CWE-347": "authentication_jwt",
}

SHANNON_REPORT_PREFIX = {
    "INJ": "injection",
    "XSS": "xss",
    "SSRF": "ssrf",
    "AUTH": "authentication",
    "AUTHZ": "authorization",
}

PARITY_RECALL = 0.90
PARITY_PRECISION = 0.85


@dataclass
class CoverageRow:
    vuln_class: str
    shannon: str
    strix: str
    nexred: str


@dataclass
class PublishedShannon:
    report_name: str
    finding_ids: List[str] = field(default_factory=list)
    by_family: Dict[str, int] = field(default_factory=dict)


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def parse_shannon_sample_reports(reports_dir: Optional[Path] = None) -> List[PublishedShannon]:
    base = reports_dir or (repo_root() / "shannon" / "sample-reports")
    results: List[PublishedShannon] = []
    if not base.is_dir():
        return results
    pattern = re.compile(r"^###\s+([A-Z]+)-VULN-(\d+):", re.MULTILINE)
    for path in sorted(base.glob("shannon-report-*.md")):
        text = path.read_text(encoding="utf-8", errors="ignore")
        item = PublishedShannon(report_name=path.name)
        for family, number in pattern.findall(text):
            item.finding_ids.append(f"{family}-VULN-{number}")
            label = SHANNON_REPORT_PREFIX.get(family, family.lower())
            item.by_family[label] = item.by_family.get(label, 0) + 1
        results.append(item)
    return results


def nexred_status_for_class(vuln_class: str, proven_classes: set[str]) -> str:
    if vuln_class in proven_classes:
        return "PROVEN"
    partial = {
        "xss": "PARTIAL (JS innerHTML pattern only)",
        "ssrf": "PARTIAL (Python requests URL only)",
        "sql_injection": "PARTIAL (Python AST + Go/PHP pattern)",
        "command_injection": "PARTIAL (Python AST + JS/PHP pattern)",
        "ssti": "PARTIAL (Flask render_template_string)",
        "insecure_deserialization": "PARTIAL (pickle/yaml.load)",
        "hardcoded_secret": "PARTIAL",
        "code_injection": "PARTIAL (eval/exec)",
        "information_disclosure": "PARTIAL (missing security headers)",
        "idor": "PARTIAL (Python ORM + JS findById)",
        "authentication_jwt": "PARTIAL (PyJWT/Go ParseUnverified + jwt.decode)",
        "broken_auth_authz": "PARTIAL (mutating Flask routes without auth decorator)",
    }
    return partial.get(vuln_class, "ABSENT")


def build_coverage_rows(proven_classes: set[str]) -> List[CoverageRow]:
    classes: List[str] = []
    seen = set()
    for name in SHANNON_CORE_CLASSES + STRIX_SKILL_CLASSES + ["hardcoded_secret", "code_injection"]:
        if name in seen:
            continue
        seen.add(name)
        classes.append(name)

    rows: List[CoverageRow] = []
    for name in classes:
        if name in SHANNON_CORE_CLASSES:
            shannon = "CORE (proof-by-exploitation)"
        elif name in {"ssti", "idor", "authentication_jwt", "csrf", "xxe", "mass_assignment"}:
            shannon = "WSTG / sample-report"
        else:
            shannon = "not in Shannon core list"
        if name == "command_injection":
            strix = "SKILL (rce.md)"
        elif name in STRIX_SKILL_CLASSES:
            strix = "SKILL"
        else:
            strix = "not listed"
        rows.append(
            CoverageRow(
                vuln_class=name,
                shannon=shannon,
                strix=strix,
                nexred=nexred_status_for_class(name, proven_classes),
            )
        )
    return rows
