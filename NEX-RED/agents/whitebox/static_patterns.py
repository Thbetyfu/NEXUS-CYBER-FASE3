"""
Static pattern scanner for Go, JavaScript/TypeScript, and PHP.

These languages are not parsed with a full AST in this release. Findings are
pattern candidates with lower confidence than the Python AST engine.
"""

from __future__ import annotations

import hashlib
import re
from pathlib import Path
from typing import List, Pattern, Tuple

from core.types import Evidence, FindingSeverity, FindingSource, VulnerabilityFinding


Rule = Tuple[Pattern[str], str, FindingSeverity, str, str, str]

_GO_RULES: List[Rule] = [
    (
        re.compile(r'(?:db|tx)\.(?:Query|Exec|QueryRow)\s*\(\s*fmt\.Sprintf', re.IGNORECASE),
        "SQL query formatted with fmt.Sprintf",
        FindingSeverity.HIGH,
        "CWE-89",
        "A03:2021-Injection",
        "Pass query parameters as separate arguments to Query/Exec, not via fmt.Sprintf.",
    ),
    (
        re.compile(r'template\.HTML\s*\(', re.IGNORECASE),
        "Unescaped HTML template injection surface",
        FindingSeverity.MEDIUM,
        "CWE-79",
        "A03:2021-Injection",
        "Avoid template.HTML unless the content is already sanitized. Prefer html/template escaping.",
    ),
    (
        re.compile(r'(?:api_key|password|jwt_secret|private_key)\s*[:=]\s*"[A-Za-z0-9_\-]{16,}"', re.IGNORECASE),
        "Hardcoded credential in Go source",
        FindingSeverity.CRITICAL,
        "CWE-798",
        "A07:2021-Identification and Authentication Failures",
        "Move secrets to environment variables or a secret manager.",
    ),
    (
        re.compile(r'jwt\.(?:ParseUnverified|UnsafeAllowNoneSignatureType)', re.IGNORECASE),
        "JWT parsed without signature verification",
        FindingSeverity.HIGH,
        "CWE-347",
        "A07:2021-Identification and Authentication Failures",
        "Use jwt.Parse with a key function and reject the none algorithm.",
    ),
]

_JS_RULES: List[Rule] = [
    (
        re.compile(r'\.innerHTML\s*=', re.IGNORECASE),
        "DOM XSS sink via innerHTML",
        FindingSeverity.MEDIUM,
        "CWE-79",
        "A03:2021-Injection",
        "Use textContent or a safe sanitizer. Never assign untrusted HTML to innerHTML.",
    ),
    (
        re.compile(r'\beval\s*\(', re.IGNORECASE),
        "Dynamic JavaScript eval sink",
        FindingSeverity.HIGH,
        "CWE-95",
        "A03:2021-Injection",
        "Replace eval with JSON.parse or explicit function maps.",
    ),
    (
        re.compile(r'(?:exec|execSync|spawn)\s*\([^)]*\$\{', re.IGNORECASE),
        "Command execution with interpolated input",
        FindingSeverity.HIGH,
        "CWE-78",
        "A03:2021-Injection",
        "Pass arguments as an array. Do not interpolate untrusted strings into a shell command.",
    ),
    (
        re.compile(r'\$queryRaw(?:Unsafe)?\s*`[^`]*\$\{', re.IGNORECASE),
        "Prisma raw query with interpolation",
        FindingSeverity.HIGH,
        "CWE-89",
        "A03:2021-Injection",
        "Use parameterized Prisma queries instead of interpolating into $queryRaw.",
    ),
    (
        re.compile(r'\bjwt\.decode\s*\(', re.IGNORECASE),
        "JWT decoded without verification (jsonwebtoken.decode)",
        FindingSeverity.HIGH,
        "CWE-347",
        "A07:2021-Identification and Authentication Failures",
        "Use jwt.verify with an explicit algorithm allow-list. jwt.decode does not validate the signature.",
    ),
    (
        re.compile(r'findById\s*\(\s*req\.(?:params|query|body)\.', re.IGNORECASE),
        "Object lookup from request id without an ownership check",
        FindingSeverity.HIGH,
        "CWE-639",
        "A01:2021-Broken Access Control",
        "Authorize the record against req.user before returning it. Do not trust req.params.id alone.",
    ),
]

_PHP_RULES: List[Rule] = [
    (
        re.compile(r'\b(?:mysqli_query|mysql_query|query)\s*\(.*\$', re.IGNORECASE),
        "PHP SQL query concatenated with a variable",
        FindingSeverity.HIGH,
        "CWE-89",
        "A03:2021-Injection",
        "Use prepared statements (PDO or mysqli) with bound parameters.",
    ),
    (
        re.compile(r'\b(?:eval|system|passthru|shell_exec|exec)\s*\(.*\$', re.IGNORECASE),
        "PHP command/code execution with a variable",
        FindingSeverity.CRITICAL,
        "CWE-78",
        "A03:2021-Injection",
        "Do not pass request data to eval or shell functions.",
    ),
]


class StaticPatternScanner:
    def analyze_file(self, filepath: str, repo_root: str) -> List[VulnerabilityFinding]:
        suffix = Path(filepath).suffix.lower()
        if suffix == ".go":
            rules = _GO_RULES
        elif suffix in {".js", ".jsx", ".ts", ".tsx"}:
            rules = _JS_RULES
        elif suffix == ".php":
            rules = _PHP_RULES
        else:
            return []
        try:
            text = Path(filepath).read_text(encoding="utf-8", errors="ignore")
        except OSError:
            return []
        rel = _rel(filepath, repo_root)
        findings: List[VulnerabilityFinding] = []
        for idx, line in enumerate(text.splitlines(), 1):
            stripped = line.strip()
            if stripped.startswith("//") or stripped.startswith("#") or stripped.startswith("*"):
                continue
            for pattern, title, severity, cwe, owasp, remediation in rules:
                if pattern.search(line):
                    findings.append(_make_finding(rel, idx, stripped, title, severity, cwe, owasp, remediation))
                    break
        return findings


def _make_finding(
    rel: str,
    line: int,
    snippet: str,
    title: str,
    severity: FindingSeverity,
    cwe: str,
    owasp: str,
    remediation: str,
) -> VulnerabilityFinding:
    loc = f"{rel}:L{line}"
    digest = hashlib.sha1(f"{cwe}:{loc}:{title}".encode("utf-8")).hexdigest()[:8].upper()
    return VulnerabilityFinding(
        id=f"NEXRED-{digest}",
        title=title,
        severity=severity,
        cwe_id=cwe,
        owasp_category=owasp,
        target_endpoint=loc,
        param_or_source=snippet[:80],
        proof_of_concept=f"Static pattern evidence at {loc}: {snippet[:200]}",
        remediation=remediation,
        source=FindingSource.STATIC_PATTERN,
        confidence=0.55,
        evidence=[
            Evidence(
                kind="source_location",
                summary=f"{title} at {loc}",
                file_path=rel,
                line=line,
                snippet=snippet[:240],
            )
        ],
    )


def _rel(filepath: str, repo_root: str) -> str:
    try:
        return str(Path(filepath).resolve().relative_to(Path(repo_root).resolve())).replace("\\", "/")
    except ValueError:
        return filepath.replace("\\", "/")
