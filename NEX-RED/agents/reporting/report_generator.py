"""
NEX-RED Report Generator
Formats verified findings into Markdown. Does not claim 100% integrity when no scan ran.
"""

import os
from core.types import ScanResult
from core.config import config


class ReportGenerator:
    @staticmethod
    def generate_markdown_report(result: ScanResult) -> str:
        duration = (result.end_time - result.start_time).total_seconds()
        lines = [
            "# NEX-RED Security Validation Report",
            f"**Scan ID:** `{result.scan_id}`  ",
            f"**Target URL:** `{result.target_url}`  ",
            f"**Mode:** `{result.mode.value}`  ",
            f"**Timestamp:** `{result.start_time.isoformat()}`  ",
            f"**Status:** `{result.status}`  ",
            f"**Duration:** `{duration:.2f}s`",
            "",
            "---",
            "## Summary",
            f"- **Files analyzed:** {result.files_analyzed}",
            f"- **Live probes:** {result.total_attacks_attempted}",
            f"- **Findings:** {result.vulnerabilities_found}",
            f"- **Defensive blocks observed:** {result.vulnerabilities_mitigated_by_nexus}",
            f"- **LLM verification used:** {result.llm_used}",
            f"- **Live HTTP checks:** {result.live_checks_run}",
            "",
            "## Findings",
        ]
        if not result.findings:
            if result.files_analyzed == 0 and result.total_attacks_attempted == 0:
                lines.append("> No source files or live target were analyzed. This is not a clean bill of health.")
            else:
                lines.append("> No evidence-backed findings in this pass. Unscanned classes may still exist.")
        else:
            for finding in result.findings:
                lines.extend(
                    [
                        f"### [{finding.severity.value}] {finding.title}",
                        f"- **ID:** `{finding.id}`",
                        f"- **CWE:** {finding.cwe_id} | **OWASP:** {finding.owasp_category}",
                        f"- **Location:** `{finding.target_endpoint}`",
                        f"- **Source:** `{finding.source.value}` | **Confidence:** {finding.confidence:.2f} | **LLM:** {finding.verified_by_llm}",
                        f"- **Live verdict:** `{finding.live_verdict.value if finding.live_verdict else 'sast_only'}`",
                        f"- **Evidence:** `{finding.proof_of_concept}`",
                        f"- **Remediation:** {finding.remediation}",
                        "",
                    ]
                )
        return "\n".join(lines)

    @staticmethod
    def save_report(result: ScanResult) -> str:
        os.makedirs(config.reports_dir, exist_ok=True)
        filename = f"nexred_report_{result.scan_id}.md"
        filepath = os.path.join(config.reports_dir, filename)
        with open(filepath, "w", encoding="utf-8") as handle:
            handle.write(ReportGenerator.generate_markdown_report(result))
        return filepath
