"""Loop GaaS — scheduled Job Cowork triggers (G-8)."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from core.types import AutonomyLevel, JobSchedule
from jobs.orchestrator import JobCoworkOrchestrator
from jobs.store import JobStore


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class JobScheduler:
    def __init__(self, store: JobStore | None = None) -> None:
        self.store = store or JobStore()
        self.orchestrator = JobCoworkOrchestrator(self.store)

    def add_schedule(
        self,
        *,
        title: str,
        target_url: str,
        autonomy_level: AutonomyLevel = AutonomyLevel.L0,
        repo_path: str | None = None,
        interval_hours: int = 168,
    ) -> JobSchedule:
        schedule = JobSchedule(
            schedule_id=f"SCH-{uuid.uuid4().hex[:8].upper()}",
            title=title,
            target_url=target_url,
            autonomy_level=autonomy_level,
            repo_path=repo_path,
            interval_hours=max(1, interval_hours),
        )
        schedules = self.store.load_schedules()
        schedules.append(schedule)
        self.store.save_schedules(schedules)
        return schedule

    def list_schedules(self) -> list[JobSchedule]:
        return self.store.load_schedules()

    def tick(self, *, auto_approve: bool = False) -> list[str]:
        """Run due schedules; returns job IDs created."""
        now = _utcnow()
        created: list[str] = []
        schedules = self.store.load_schedules()
        changed = False
        for item in schedules:
            if not item.enabled:
                continue
            due_at = item.last_run_at + timedelta(hours=item.interval_hours) if item.last_run_at else None
            if due_at is not None and now < due_at:
                continue
            job = self.orchestrator.run_full(
                title=f"[Loop] {item.title}",
                target_url=item.target_url,
                autonomy_level=item.autonomy_level,
                repo_path=item.repo_path,
                operator="scheduler",
                auto_approve=auto_approve,
            )
            item.last_run_at = now
            item.last_job_id = job.job_id
            created.append(job.job_id)
            changed = True
        if changed:
            self.store.save_schedules(schedules)
        return created
