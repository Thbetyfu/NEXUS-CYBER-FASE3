"""
NEX-RED White-Box Code Analyzer

Python files are parsed with the CPython AST. Go/JS/PHP use conservative
static patterns. LLM verification (optional) reduces false positives.
"""

from __future__ import annotations

import os
from typing import List

from agents.whitebox.python_ast import PythonAstAnalyzer
from agents.whitebox.static_patterns import StaticPatternScanner
from core.config import config
from core.types import VulnerabilityFinding


_SKIP_DIRS = {
    ".git", "node_modules", "dist", "vendor", ".venv", "venv", "__pycache__",
    "reports", "shannon", "strix",
}


class WhiteboxCodeAnalyzer:
    def __init__(self, repo_path: str):
        self.repo_path = repo_path
        self.files_analyzed = 0
        self._python = PythonAstAnalyzer()
        self._patterns = StaticPatternScanner()

    def analyze(self) -> List[VulnerabilityFinding]:
        if not self.repo_path or not os.path.exists(self.repo_path):
            return []

        findings: List[VulnerabilityFinding] = []
        for filepath in self._iter_source_files():
            self.files_analyzed += 1
            if filepath.endswith(".py"):
                findings.extend(self._python.analyze_file(filepath, self.repo_path))
            else:
                findings.extend(self._patterns.analyze_file(filepath, self.repo_path))
        return findings

    def _iter_source_files(self):
        count = 0
        for root, dirs, files in os.walk(self.repo_path):
            dirs[:] = [d for d in dirs if d not in _SKIP_DIRS and not d.startswith(".")]
            for file in files:
                if not file.endswith((".py", ".go", ".ts", ".tsx", ".js", ".jsx", ".php")):
                    continue
                filepath = os.path.join(root, file)
                try:
                    if os.path.getsize(filepath) > config.max_file_bytes:
                        continue
                except OSError:
                    continue
                count += 1
                if count > config.max_files:
                    return
                yield filepath
