"""JSON persistence for GaaS Job Cowork entities."""

from __future__ import annotations

import json
from pathlib import Path
from typing import List, Optional

from core.config import config
from core.types import CoworkJob, JobSchedule, ScanResult


class JobStore:
    def __init__(self, root: Optional[str] = None) -> None:
        self.root = Path(root or config.jobs_dir)
        self.root.mkdir(parents=True, exist_ok=True)
        self.artifacts_dir = self.root / "artifacts"
        self.artifacts_dir.mkdir(parents=True, exist_ok=True)

    def _job_path(self, job_id: str) -> Path:
        return self.root / f"{job_id}.json"

    def _scan_path(self, job_id: str) -> Path:
        return self.root / f"{job_id}_scan.json"

    def save_job(self, job: CoworkJob) -> CoworkJob:
        path = self._job_path(job.job_id)
        path.write_text(job.model_dump_json(indent=2), encoding="utf-8")
        return job

    def load_job(self, job_id: str) -> Optional[CoworkJob]:
        path = self._job_path(job_id)
        if not path.is_file():
            return None
        return CoworkJob.model_validate_json(path.read_text(encoding="utf-8"))

    def list_jobs(self, limit: int = 50) -> List[CoworkJob]:
        items: List[CoworkJob] = []
        for path in sorted(self.root.glob("JOB-*.json"), key=lambda p: p.stat().st_mtime, reverse=True):
            if path.name.endswith("_scan.json"):
                continue
            try:
                items.append(CoworkJob.model_validate_json(path.read_text(encoding="utf-8")))
            except Exception:
                continue
            if len(items) >= limit:
                break
        return items

    def save_scan_result(self, job_id: str, result: ScanResult) -> None:
        self._scan_path(job_id).write_text(result.model_dump_json(indent=2), encoding="utf-8")

    def load_scan_result(self, job_id: str) -> Optional[ScanResult]:
        path = self._scan_path(job_id)
        if not path.is_file():
            return None
        return ScanResult.model_validate_json(path.read_text(encoding="utf-8"))

    def save_schedules(self, schedules: List[JobSchedule]) -> None:
        path = Path(config.schedules_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        payload = [item.model_dump(mode="json") for item in schedules]
        path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    def load_schedules(self) -> List[JobSchedule]:
        path = Path(config.schedules_path)
        if not path.is_file():
            return []
        raw = json.loads(path.read_text(encoding="utf-8"))
        return [JobSchedule.model_validate(item) for item in raw]
