"""
LLM finding verifier.

Confirms or drops static findings. Requests remediations only — never exploit steps.
"""

from __future__ import annotations

from typing import List

from core.config import config
from core.llm_client import LlmClient
from core.types import FindingSeverity, FindingSource, VulnerabilityFinding


class LlmVerifier:
    def __init__(self) -> None:
        self.client = LlmClient()
        self.used = False

    def verify(self, findings: List[VulnerabilityFinding], enabled: bool = True) -> List[VulnerabilityFinding]:
        if not enabled or not findings:
            return findings
        if not self.client.available():
            return findings

        ranked = sorted(findings, key=lambda f: _rank(f.severity), reverse=True)
        reviewed = 0
        kept: List[VulnerabilityFinding] = []
        seen_ids = set()

        for finding in ranked:
            if reviewed >= config.max_llm_reviews:
                if finding.id not in seen_ids:
                    kept.append(finding)
                    seen_ids.add(finding.id)
                continue
            if finding.severity in {FindingSeverity.LOW, FindingSeverity.INFO}:
                kept.append(finding)
                seen_ids.add(finding.id)
                continue

            snippet = finding.evidence[0].snippet if finding.evidence else finding.param_or_source or ""
            language = _guess_language(finding.target_endpoint)
            review = self.client.review_finding(
                language=language,
                snippet=snippet or finding.proof_of_concept,
                title=finding.title,
                cwe_id=finding.cwe_id or "",
            )
            reviewed += 1
            self.used = True
            if not review:
                kept.append(finding)
                seen_ids.add(finding.id)
                continue
            if review.get("confirmed") is False:
                continue

            finding.verified_by_llm = True
            finding.source = FindingSource.LLM_VERIFIED
            finding.confidence = max(finding.confidence, float(review.get("confidence") or 0.8))
            if review.get("remediation"):
                finding.remediation = str(review["remediation"])
            severity = str(review.get("severity") or "").upper()
            if severity in FindingSeverity.__members__:
                finding.severity = FindingSeverity(severity)
            kept.append(finding)
            seen_ids.add(finding.id)

        for finding in findings:
            if finding.id not in seen_ids:
                kept.append(finding)
        return kept


def _rank(severity: FindingSeverity) -> int:
    order = {
        FindingSeverity.CRITICAL: 5,
        FindingSeverity.HIGH: 4,
        FindingSeverity.MEDIUM: 3,
        FindingSeverity.LOW: 2,
        FindingSeverity.INFO: 1,
    }
    return order.get(severity, 0)


def _guess_language(path: str) -> str:
    lower = path.lower()
    if lower.endswith(".py") or ".py:" in lower:
        return "python"
    if ".go" in lower:
        return "go"
    if any(ext in lower for ext in (".ts", ".tsx", ".js", ".jsx")):
        return "javascript"
    if ".php" in lower:
        return "php"
    return "unknown"
