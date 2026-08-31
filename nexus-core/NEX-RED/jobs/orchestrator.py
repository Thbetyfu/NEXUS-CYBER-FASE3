"""GaaS Job Cowork orchestrator — measure → approval gate → verify → close."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

from agents.runtime.waf_bind import bind_waf_edge
from core.orchestrator import NexRedOrchestrator
from core.types import (
    ApprovalRecord,
    AutonomyLevel,
    CoworkJob,
    CoworkJobStatus,
    JobStepLog,
    ScanMode,
    ScanTarget,
)
from jobs.artifact import export_artifacts
from jobs.closure import resolve_closure, summarize_defense_deltas
from jobs.immune_memory import record_job_outcome
from jobs.store import JobStore
from jobs.sync import sync_job


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _host_key(target_url: str) -> str:
    parsed = urlparse(target_url)
    return (parsed.hostname or target_url).lower()


class JobCoworkOrchestrator:
    def __init__(self, store: JobStore | None = None) -> None:
        self.store = store or JobStore()

    def _log(self, job: CoworkJob, phase: str, message: str) -> None:
        job.step_logs.append(JobStepLog(phase=phase, message=message))
        job.updated_at = _utcnow()

    def create_job(
        self,
        *,
        title: str,
        target_url: str,
        autonomy_level: AutonomyLevel = AutonomyLevel.L0,
        repo_path: str | None = None,
        scope: str = "hybrid-http-jinak",
        protected_host: str | None = None,
    ) -> CoworkJob:
        job_id = f"JOB-{uuid.uuid4().hex[:8].upper()}"
        host_key = (protected_host or "").strip().lower() or _host_key(target_url)
        job = CoworkJob(
            job_id=job_id,
            title=title,
            target_url=target_url,
            autonomy_level=autonomy_level,
            repo_path=repo_path,
            scope=scope,
            host_key=host_key,
            status=CoworkJobStatus.OPEN,
        )
        self._log(
            job,
            "OPEN",
            f"Job opened for {target_url} host_key={host_key} ({autonomy_level.value})",
        )
        self.store.save_job(job)
        sync_job(job)
        return job

    def run_measurement(self, job_id: str, *, enable_llm: bool = False) -> CoworkJob:
        job = self._require(job_id)
        if job.status not in {CoworkJobStatus.OPEN, CoworkJobStatus.PARTIAL}:
            raise ValueError(f"Job {job_id} cannot measure from status {job.status.value}")

        self._log(job, "MEASURE", "Starting wasit pipeline (recon → hygiene → access)")
        bound, host_hdrs = bind_waf_edge(job.target_url, job.host_key)
        host_name = host_hdrs.get("Host") or "none"
        self._log(job, "MEASURE", f"WAF bind TCP={bound} Host={host_name}")
        target = ScanTarget(
            target_url=job.target_url,
            repo_path=job.repo_path,
            mode=ScanMode.HYBRID,
            enable_llm=enable_llm,
            protected_host=job.host_key or None,
        )
        result = NexRedOrchestrator(target).execute()
        job.scan_id = result.scan_id
        job.findings_count = result.vulnerabilities_found
        job.mitigated_count = result.vulnerabilities_mitigated_by_nexus
        job.live_checks_run = result.live_checks_run
        job.antibody_loop_ok = result.antibody_loop_ok
        job.defense_deltas = summarize_defense_deltas(result.findings)
        job.status = CoworkJobStatus.MEASURED
        self._log(
            job,
            "MEASURED",
            f"Defense delta recorded; findings={job.findings_count} live={job.live_checks_run}",
        )
        self.store.save_scan_result(job_id, result)

        job.status = CoworkJobStatus.PENDING_APPROVAL
        gate = "L1 edge apply + replay" if job.autonomy_level == AutonomyLevel.L1 else "L0 artifact only"
        self._log(job, "PENDING_APPROVAL", f"Awaiting operator approval ({gate})")
        self.store.save_job(job)
        sync_job(job, result)
        return job

    def approve(
        self,
        job_id: str,
        *,
        operator: str,
        note: str | None = None,
        approved: bool = True,
    ) -> CoworkJob:
        job = self._require(job_id)
        if job.status != CoworkJobStatus.PENDING_APPROVAL:
            raise ValueError(f"Job {job_id} is not pending approval (status={job.status.value})")
        if not approved:
            job.approvals.append(
                ApprovalRecord(
                    operator=operator,
                    autonomy_level=job.autonomy_level,
                    note=note,
                    approved=False,
                )
            )
            job.status = CoworkJobStatus.PARTIAL
            self._log(job, "REJECTED", f"Approval rejected by {operator}")
            self.store.save_job(job)
            return job

        job.approvals.append(
            ApprovalRecord(
                operator=operator,
                autonomy_level=job.autonomy_level,
                note=note,
                approved=True,
            )
        )
        job.status = CoworkJobStatus.VERIFYING
        self._log(job, "VERIFYING", f"Approved by {operator}; running closure rules")
        scan = self.store.load_scan_result(job_id)
        status, residuals = resolve_closure(
            scan,
            autonomy_l1=job.autonomy_level == AutonomyLevel.L1,
        ) if scan else (CoworkJobStatus.PARTIAL, ["missing_scan_result"])
        job.residuals = residuals
        job.status = status
        self._log(job, status.value, f"Closed with residuals={residuals or 'none'}")
        paths = export_artifacts(job, scan, self.store.artifacts_dir)
        job.artifact_paths = paths
        record_job_outcome(job, scan)
        self.store.save_job(job)
        artifact_json = ""
        artifact_md = ""
        if paths.get("json"):
            artifact_json = Path(paths["json"]).read_text(encoding="utf-8")
        if paths.get("markdown"):
            artifact_md = Path(paths["markdown"]).read_text(encoding="utf-8")
        sync_job(job, scan, artifact_json=artifact_json, artifact_md=artifact_md)
        return job

    def run_full(
        self,
        *,
        title: str,
        target_url: str,
        autonomy_level: AutonomyLevel = AutonomyLevel.L0,
        repo_path: str | None = None,
        operator: str = "cli-auto",
        enable_llm: bool = False,
        auto_approve: bool = False,
    ) -> CoworkJob:
        job = self.create_job(
            title=title,
            target_url=target_url,
            autonomy_level=autonomy_level,
            repo_path=repo_path,
        )
        job = self.run_measurement(job.job_id, enable_llm=enable_llm)
        if auto_approve:
            job = self.approve(job.job_id, operator=operator, note="auto-approve (lab)")
        return job

    def get(self, job_id: str) -> CoworkJob | None:
        return self.store.load_job(job_id)

    def list_jobs(self, limit: int = 50) -> list[CoworkJob]:
        return self.store.list_jobs(limit=limit)

    def _require(self, job_id: str) -> CoworkJob:
        job = self.store.load_job(job_id)
        if job is None:
            raise KeyError(f"Job not found: {job_id}")
        return job
