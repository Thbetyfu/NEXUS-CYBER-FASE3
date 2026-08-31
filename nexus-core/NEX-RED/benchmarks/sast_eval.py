"""Score NEX-RED white-box analyzer against the labeled SAST corpus."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List

from agents.whitebox.code_analyzer import WhiteboxCodeAnalyzer
from benchmarks.catalog import CWE_TO_CLASS
from benchmarks.corpus import materialize


@dataclass
class CaseScore:
    case_id: str
    filename: str
    expected_cwe: str | None
    detected_cwes: List[str]
    outcome: str  # TP, TN, FP, FN


@dataclass
class SastMetrics:
    true_positive: int = 0
    true_negative: int = 0
    false_positive: int = 0
    false_negative: int = 0
    cases: List[CaseScore] = field(default_factory=list)
    proven_classes: set[str] = field(default_factory=set)

    @property
    def precision(self) -> float:
        denom = self.true_positive + self.false_positive
        return self.true_positive / denom if denom else 0.0

    @property
    def recall(self) -> float:
        denom = self.true_positive + self.false_negative
        return self.true_positive / denom if denom else 0.0

    @property
    def f1(self) -> float:
        p, r = self.precision, self.recall
        return (2 * p * r / (p + r)) if (p + r) else 0.0


def _cwes_for_file(findings, filename: str) -> List[str]:
    matched = []
    for finding in findings:
        loc = finding.target_endpoint.replace("\\", "/")
        if filename in loc and finding.cwe_id:
            matched.append(finding.cwe_id)
    return matched


def evaluate_sast(corpus_root: Path) -> SastMetrics:
    catalog = materialize(corpus_root)
    analyzer = WhiteboxCodeAnalyzer(str(corpus_root))
    findings = analyzer.analyze()
    metrics = SastMetrics()
    by_file: Dict[str, List[str]] = {}
    for case in catalog:
        by_file[case.filename] = _cwes_for_file(findings, case.filename)

    for case in catalog:
        detected = by_file.get(case.filename, [])
        if case.expected_cwe:
            hit = case.expected_cwe in detected
            outcome = "TP" if hit else "FN"
            if hit:
                metrics.true_positive += 1
                klass = CWE_TO_CLASS.get(case.expected_cwe)
                if klass:
                    metrics.proven_classes.add(klass)
            else:
                metrics.false_negative += 1
        else:
            noisy = [cwe for cwe in detected if cwe != "CWE-693"]
            hit_fp = bool(noisy)
            outcome = "FP" if hit_fp else "TN"
            if hit_fp:
                metrics.false_positive += 1
            else:
                metrics.true_negative += 1
        metrics.cases.append(
            CaseScore(
                case_id=case.case_id,
                filename=case.filename,
                expected_cwe=case.expected_cwe,
                detected_cwes=detected,
                outcome=outcome,
            )
        )
    if metrics.proven_classes & {"idor", "authentication_jwt", "broken_auth_authz"}:
        metrics.proven_classes.add("broken_auth_authz")
    return metrics
