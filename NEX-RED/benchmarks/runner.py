"""
NEX-RED vs Shannon vs Strix benchmark runner.

Compares:
1. SAST precision/recall on a labeled corpus (executable now).
2. Vulnerability-class coverage vs Shannon core + Strix skills.
3. Shannon published sample-report counts (reference, not a live pentest).
4. Live pentest parity — recorded as not comparable until NEX-RED has an
   authorized proof-by-exploitation engine.
"""

from __future__ import annotations

import json
import shutil
import tempfile
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

from benchmarks.catalog import (
    PARITY_PRECISION,
    PARITY_RECALL,
    SHANNON_CORE_CLASSES,
    build_coverage_rows,
    parse_shannon_sample_reports,
    repo_root,
)
from benchmarks.sast_eval import SastMetrics, evaluate_sast
from core.config import config


@dataclass
class ParityVerdict:
    equal_to_shannon_strix: bool
    sast_meets_bar: bool
    shannon_core_proven: bool
    live_pentest_comparable: bool
    reasons: List[str]


def _verdict(
    metrics: SastMetrics,
    proven: set[str],
    juice: Dict[str, Any] | None = None,
) -> ParityVerdict:
    sast_ok = metrics.recall >= PARITY_RECALL and metrics.precision >= PARITY_PRECISION
    core_ok = all(name in proven for name in SHANNON_CORE_CLASSES)
    live_ok = False
    reasons: List[str] = []
    if not sast_ok:
        reasons.append(
            f"SAST bar not met (precision {metrics.precision:.2f} / recall {metrics.recall:.2f}; "
            f"need ≥{PARITY_PRECISION:.2f} / ≥{PARITY_RECALL:.2f})"
        )
    missing_core = [name for name in SHANNON_CORE_CLASSES if name not in proven]
    if missing_core:
        reasons.append("Shannon core classes not proven on corpus: " + ", ".join(missing_core))
    reasons.append(
        "Live pentest accuracy is not comparable: NEX-RED has no proof-by-exploitation loop. "
        "Shannon sample reports and Strix XBEN (96%/104) remain unpublished for NEX-RED."
    )
    if juice and juice.get("reachable"):
        rec = float(juice.get("live_recall") or 0)
        hits = ", ".join(juice.get("confirmed_classes") or []) or "none"
        reasons.append(
            f"Juice Shop class recall {rec:.0%} (hits: {hits}); "
            "live_pentest_comparable stays false until AUTH/AUTHZ/INJ/XSS/SSRF meet the Jalan B bar."
        )
    elif juice is not None:
        reasons.append("Juice Shop lab not reachable; live class recall was not measured this run.")
    equal = sast_ok and core_ok and live_ok
    if equal:
        reasons = ["All parity gates passed."]
    return ParityVerdict(
        equal_to_shannon_strix=equal,
        sast_meets_bar=sast_ok,
        shannon_core_proven=core_ok,
        live_pentest_comparable=live_ok,
        reasons=reasons,
    )


def run_benchmark(output_dir: Path | None = None, *, include_juice: bool = False) -> Dict[str, Any]:
    out = Path(output_dir or config.reports_dir)
    out.mkdir(parents=True, exist_ok=True)
    tmp = Path(tempfile.mkdtemp(prefix="nexred-bench-"))
    try:
        metrics = evaluate_sast(tmp)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    proven = set(metrics.proven_classes)
    if "command_injection" in proven or any(c.outcome == "TP" and c.expected_cwe == "CWE-78" for c in metrics.cases):
        proven.add("command_injection")
    coverage = build_coverage_rows(proven)
    published = parse_shannon_sample_reports()
    juice: Dict[str, Any] | None = None
    if include_juice:
        from benchmarks.juice_lab import run_juice_lab

        juice = run_juice_lab(wait=True)
    verdict = _verdict(metrics, proven, juice)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    payload: Dict[str, Any] = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "engines": {
            "nexred": "4.0.0 (static AST + live posture)",
            "shannon": "Open Source sample reports + COVERAGE.md (not executed live)",
            "strix": "Published XBEN 96% (100/104) — not executed live",
        },
        "sast": {
            "true_positive": metrics.true_positive,
            "true_negative": metrics.true_negative,
            "false_positive": metrics.false_positive,
            "false_negative": metrics.false_negative,
            "precision": round(metrics.precision, 4),
            "recall": round(metrics.recall, 4),
            "f1": round(metrics.f1, 4),
            "cases": [asdict(item) for item in metrics.cases],
            "proven_classes": sorted(proven),
        },
        "coverage": [asdict(row) for row in coverage],
        "shannon_published_reports": [
            {
                "report": item.report_name,
                "findings": len(item.finding_ids),
                "by_family": item.by_family,
            }
            for item in published
        ],
        "strix_published": {
            "benchmark": "XBEN",
            "challenges": 104,
            "success_rate": 0.96,
            "source": "strix/benchmarks/README.md",
            "nexred_score": None,
            "note": "NEX-RED cannot run XBEN; it is a CTF exploit benchmark.",
        },
        "parity": asdict(verdict),
        "thresholds": {"precision": PARITY_PRECISION, "recall": PARITY_RECALL},
        "juice_shop_lab": juice,
    }

    json_path = out / f"nexred_benchmark_{stamp}.json"
    md_path = out / f"nexred_benchmark_{stamp}.md"
    json_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    md_path.write_text(_render_markdown(payload), encoding="utf-8")
    payload["json_path"] = str(json_path)
    payload["markdown_path"] = str(md_path)
    return payload


def _render_markdown(payload: Dict[str, Any]) -> str:
    sast = payload["sast"]
    parity = payload["parity"]
    verdict = "SETARA" if parity["equal_to_shannon_strix"] else "BELUM SETARA"
    lines = [
        "# NEX-RED Benchmark vs Shannon & Strix",
        f"**Generated:** `{payload['generated_at']}`",
        f"**Verdict:** **{verdict}**",
        "",
        "## 1. SAST accuracy (executable today)",
        "",
        f"| Metric | NEX-RED | Parity bar |",
        f"| --- | --- | --- |",
        f"| Precision | {sast['precision']:.2%} | ≥ {payload['thresholds']['precision']:.0%} |",
        f"| Recall | {sast['recall']:.2%} | ≥ {payload['thresholds']['recall']:.0%} |",
        f"| F1 | {sast['f1']:.2%} | — |",
        f"| TP / TN / FP / FN | {sast['true_positive']} / {sast['true_negative']} / {sast['false_positive']} / {sast['false_negative']} | — |",
        "",
        "### Case outcomes",
        "",
        "| Case | Expected CWE | Detected | Outcome |",
        "| --- | --- | --- | --- |",
    ]
    for case in sast["cases"]:
        expected = case["expected_cwe"] or "none (safe)"
        detected = ", ".join(case["detected_cwes"]) or "—"
        lines.append(f"| `{case['case_id']}` | {expected} | {detected} | {case['outcome']} |")

    lines.extend(
        [
            "",
            "## 2. Class coverage",
            "",
            "| Class | Shannon | Strix | NEX-RED |",
            "| --- | --- | --- | --- |",
        ]
    )
    for row in payload["coverage"]:
        lines.append(
            f"| `{row['vuln_class']}` | {row['shannon']} | {row['strix']} | {row['nexred']} |"
        )

    lines.extend(["", "## 3. Shannon published pentest reports (reference)", ""])
    if not payload["shannon_published_reports"]:
        lines.append("_Shannon sample reports not found in this checkout._")
    else:
        lines.append("| Report | Proven findings | Families |")
        lines.append("| --- | ---: | --- |")
        for item in payload["shannon_published_reports"]:
            families = ", ".join(f"{k}={v}" for k, v in item["by_family"].items())
            lines.append(f"| `{item['report']}` | {item['findings']} | {families} |")

    strix = payload["strix_published"]
    lines.extend(
        [
            "",
            "## 4. Strix published pentest score (reference)",
            "",
            f"- **{strix['benchmark']}:** {strix['success_rate']:.0%} ({strix['challenges']} challenges).",
            f"- **NEX-RED on XBEN:** not run — {strix['note']}",
            "",
            "## 5. Live pentest parity",
            "",
            "Shannon and Strix measure **proof-by-exploitation** on a running app. "
            "NEX-RED v4 measures **static evidence + live posture**. Those are different tasks. "
            "This benchmark therefore **cannot** declare pentest accuracy equal.",
            "",
            "## 6. Juice Shop lab (class recall, optional `--live`)",
            "",
        ]
    )
    juice = payload.get("juice_shop_lab")
    if not juice:
        lines.append("_Not run. Pass `nexred.py benchmark --live` after `NEX-RED/lab/juice-shop/START.bat`._")
    elif not juice.get("reachable"):
        lines.append(juice.get("note") or "Juice Shop was not reachable.")
    else:
        rec = float(juice.get("live_recall") or 0)
        lines.append(f"- **Target:** `{juice.get('target_url')}`")
        lines.append(f"- **Class recall:** {rec:.0%} of AUTH / AUTHZ / INJ / XSS / SSRF")
        lines.append(f"- **Confirmed classes:** {', '.join(juice.get('confirmed_classes') or []) or 'none'}")
        lines.append("")
        lines.append("| Class | Hit |")
        lines.append("| --- | --- |")
        for name, hit in (juice.get("live_recall_by_class") or {}).items():
            lines.append(f"| `{name}` | {'yes' if hit else 'no'} |")
        lines.append("")
        lines.append(juice.get("note") or "")
    lines.extend(
        [
            "",
            "## 7. Verdict reasons",
            "",
        ]
    )
    for reason in parity["reasons"]:
        lines.append(f"- {reason}")
    lines.append("")
    return "\n".join(lines)
