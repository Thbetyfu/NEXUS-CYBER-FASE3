"""
NEX-RED Core Types & Data Contracts
Standardized data contracts for autonomous security validation in Nexus Cyber.
"""

from enum import Enum
from typing import Dict, List, Optional
from pydantic import BaseModel, Field
from datetime import datetime, timezone


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ScanMode(str, Enum):
    WHITEBOX = "WHITEBOX"
    BLACKBOX = "BLACKBOX"
    HYBRID = "HYBRID"
    SCENARIO = "SCENARIO"


class FindingSeverity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"


class FindingSource(str, Enum):
    PYTHON_AST = "PYTHON_AST"
    STATIC_PATTERN = "STATIC_PATTERN"
    LLM_VERIFIED = "LLM_VERIFIED"
    RECON = "RECON"
    WAF_PROBE = "WAF_PROBE"


class AttackPhase(str, Enum):
    PRE_RECON = "PRE_RECON"
    RECON = "RECON"
    VULNERABILITY_ANALYSIS = "VULNERABILITY_ANALYSIS"
    VERIFICATION = "VERIFICATION"
    REPORTING = "REPORTING"


class Evidence(BaseModel):
    """Deterministic evidence attached to a finding. No exploit payload required."""
    kind: str
    summary: str
    file_path: Optional[str] = None
    line: Optional[int] = None
    snippet: Optional[str] = None
    http_status: Optional[int] = None
    header_name: Optional[str] = None


class VulnerabilityFinding(BaseModel):
    id: str
    title: str
    severity: FindingSeverity
    cwe_id: Optional[str] = None
    owasp_category: Optional[str] = None
    target_endpoint: str
    param_or_source: Optional[str] = None
    proof_of_concept: str
    remediation: str
    timestamp: datetime = Field(default_factory=_utcnow)
    mitigated_by_nexus: bool = False
    defense_layer: Optional[str] = None
    source: FindingSource = FindingSource.STATIC_PATTERN
    confidence: float = 0.5
    verified_by_llm: bool = False
    evidence: List[Evidence] = Field(default_factory=list)


class ScanTarget(BaseModel):
    target_url: str
    repo_path: Optional[str] = None
    mode: ScanMode = ScanMode.HYBRID
    scenario: Optional[str] = None
    timeout_seconds: int = 300
    headers: Dict[str, str] = Field(default_factory=dict)
    enable_llm: bool = True


class ScanResult(BaseModel):
    scan_id: str
    target_url: str
    mode: ScanMode
    start_time: datetime
    end_time: datetime
    total_attacks_attempted: int = 0
    vulnerabilities_found: int = 0
    vulnerabilities_mitigated_by_nexus: int = 0
    findings: List[VulnerabilityFinding] = Field(default_factory=list)
    raw_logs: List[str] = Field(default_factory=list)
    status: str = "COMPLETED"
    files_analyzed: int = 0
    llm_used: bool = False
