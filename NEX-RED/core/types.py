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
    LIVE_HTTP = "LIVE_HTTP"


class LiveVerdict(str, Enum):
    SAST_ONLY = "sast_only"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"
    MITIGATED_BY_NEXUS = "mitigated_by_nexus"


class DefenseDelta(str, Enum):
    """Twin WAF-vs-origin outcome. Not a Shannon exploit proof."""

    WAF_BLOCKED = "waf_blocked"
    ORIGIN_OPEN = "origin_open"
    BOTH_HELD = "both_held"
    REPLAY_HELD = "replay_held"
    REPLAY_MISSED = "replay_missed"
    ANTIBODY_LEARNED = "antibody_learned"


class ScanJobStatus(str, Enum):
    """Async scan queue on the bridge — not GaaS Job Cowork lifecycle."""

    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    PARTIAL = "PARTIAL"


# Backward-compatible alias for scan bridge code.
JobStatus = ScanJobStatus


class CoworkJobStatus(str, Enum):
    """GaaS Job Cowork lifecycle — see docs/PRODUCT_MODEL.md §4."""

    OPEN = "OPEN"
    MEASURED = "MEASURED"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    VERIFYING = "VERIFYING"
    CLOSED_OK = "CLOSED_OK"
    CLOSED_GAP = "CLOSED_GAP"
    PARTIAL = "PARTIAL"


class AutonomyLevel(str, Enum):
    L0 = "L0"
    L1 = "L1"


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
    live_verdict: Optional[LiveVerdict] = None
    defense_delta: Optional[DefenseDelta] = None
    agent: Optional[str] = None


class AgentRunSummary(BaseModel):
    name: str
    ok: bool
    error: Optional[str] = None
    findings: int = 0
    probes: int = 0


class ScanTarget(BaseModel):
    target_url: str
    repo_path: Optional[str] = None
    mode: ScanMode = ScanMode.HYBRID
    scenario: Optional[str] = None
    timeout_seconds: int = 300
    headers: Dict[str, str] = Field(default_factory=dict)
    enable_llm: bool = True


class JobStepLog(BaseModel):
    at: datetime = Field(default_factory=_utcnow)
    phase: str
    message: str


class ApprovalRecord(BaseModel):
    at: datetime = Field(default_factory=_utcnow)
    operator: str
    autonomy_level: AutonomyLevel
    note: Optional[str] = None
    approved: bool = True


class CoworkJob(BaseModel):
    job_id: str
    title: str
    target_url: str
    scope: str = "hybrid-http-jinak"
    autonomy_level: AutonomyLevel = AutonomyLevel.L0
    status: CoworkJobStatus = CoworkJobStatus.OPEN
    repo_path: Optional[str] = None
    scan_id: Optional[str] = None
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)
    step_logs: List[JobStepLog] = Field(default_factory=list)
    approvals: List[ApprovalRecord] = Field(default_factory=list)
    defense_deltas: Dict[str, int] = Field(default_factory=dict)
    residuals: List[str] = Field(default_factory=list)
    antibody_loop_ok: Optional[bool] = None
    findings_count: int = 0
    mitigated_count: int = 0
    live_checks_run: int = 0
    host_key: str = ""
    artifact_paths: Dict[str, str] = Field(default_factory=dict)


class JobSchedule(BaseModel):
    schedule_id: str
    title: str
    target_url: str
    autonomy_level: AutonomyLevel = AutonomyLevel.L0
    repo_path: Optional[str] = None
    interval_hours: int = 168
    enabled: bool = True
    last_run_at: Optional[datetime] = None
    last_job_id: Optional[str] = None
    created_at: datetime = Field(default_factory=_utcnow)


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
    live_checks_run: int = 0
    antibody_loop_ok: Optional[bool] = None
    agent_runs: List[AgentRunSummary] = Field(default_factory=list)
