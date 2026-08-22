"""Sync Job Cowork state to gateway PostgreSQL via control plane API."""

from __future__ import annotations

import json
import os
from typing import Optional

import requests

from core.types import CoworkJob, ScanResult


def _control_plane_url() -> str:
    return os.getenv("NEXUS_CONTROL_PLANE_URL", "http://127.0.0.1:8081").rstrip("/")


def sync_job(
    job: CoworkJob,
    scan: Optional[ScanResult] = None,
    *,
    artifact_json: str = "",
    artifact_md: str = "",
) -> bool:
    payload = {
        "job_id": job.job_id,
        "title": job.title,
        "target_url": job.target_url,
        "host_key": job.host_key,
        "scope": job.scope,
        "autonomy_level": job.autonomy_level.value,
        "status": job.status.value,
        "scan_id": job.scan_id,
        "repo_path": job.repo_path,
        "defense_deltas": job.defense_deltas,
        "residuals": job.residuals,
        "antibody_loop_ok": job.antibody_loop_ok,
        "findings_count": job.findings_count,
        "mitigated_count": job.mitigated_count,
        "live_checks_run": job.live_checks_run,
        "step_logs": [
            {"phase": item.phase, "message": item.message, "at": item.at.isoformat()}
            for item in job.step_logs
        ],
        "approvals": [
            {
                "operator": item.operator,
                "autonomy_level": item.autonomy_level.value,
                "note": item.note,
                "approved": item.approved,
                "at": item.at.isoformat(),
            }
            for item in job.approvals
        ],
        "scan_result_json": scan.model_dump_json() if scan else "",
        "artifact_json": artifact_json,
        "artifact_md": artifact_md,
    }
    if not artifact_json and job.artifact_paths.get("json"):
        try:
            payload["artifact_json"] = open(job.artifact_paths["json"], encoding="utf-8").read()
        except OSError:
            pass
    if not artifact_md and job.artifact_paths.get("markdown"):
        try:
            payload["artifact_md"] = open(job.artifact_paths["markdown"], encoding="utf-8").read()
        except OSError:
            pass

    try:
        resp = requests.post(
            f"{_control_plane_url()}/api/jobs",
            json=payload,
            timeout=8,
        )
        return resp.ok
    except requests.RequestException:
        return False


def sync_host_immune(host_key: str, host_payload: dict) -> bool:
    if not host_key:
        return False
    try:
        resp = requests.post(
            f"{_control_plane_url()}/api/host-immune?host={host_key}",
            json=host_payload,
            timeout=8,
        )
        return resp.ok
    except requests.RequestException:
        return False
