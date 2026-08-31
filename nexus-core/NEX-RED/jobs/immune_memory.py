"""Per-host immune memory (G-7) — file-backed until PG migration."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

from core.config import config
from core.types import CoworkJob, DefenseDelta, ScanResult


def _path() -> Path:
    path = Path(config.immune_memory_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def _load_raw() -> dict[str, Any]:
    path = _path()
    if not path.is_file():
        return {"hosts": {}}
    return json.loads(path.read_text(encoding="utf-8"))


def _save_raw(data: dict[str, Any]) -> None:
    _path().write_text(json.dumps(data, indent=2), encoding="utf-8")


def record_job_outcome(job: CoworkJob, scan: ScanResult | None) -> None:
    if not job.host_key:
        return
    data = _load_raw()
    hosts: dict[str, Any] = data.setdefault("hosts", {})
    host = hosts.setdefault(
        job.host_key,
        {
            "antibody_learned_count": 0,
            "replay_missed_count": 0,
            "origin_open_count": 0,
            "history": [],
        },
    )
    findings = scan.findings if scan else []
    for item in findings:
        if item.defense_delta == DefenseDelta.ANTIBODY_LEARNED:
            host["antibody_learned_count"] = int(host.get("antibody_learned_count", 0)) + 1
        if item.defense_delta == DefenseDelta.REPLAY_MISSED:
            host["replay_missed_count"] = int(host.get("replay_missed_count", 0)) + 1
        if item.defense_delta == DefenseDelta.ORIGIN_OPEN:
            host["origin_open_count"] = int(host.get("origin_open_count", 0)) + 1

    history: List[dict[str, Any]] = list(host.get("history") or [])
    history.insert(
        0,
        {
            "job_id": job.job_id,
            "status": job.status.value,
            "at": datetime.now(timezone.utc).isoformat(),
            "residuals": job.residuals,
            "antibody_loop_ok": job.antibody_loop_ok,
        },
    )
    host["history"] = history[:30]
    host["last_job_id"] = job.job_id
    host["last_status"] = job.status.value
    _save_raw(data)

    from jobs.sync import sync_host_immune

    sync_host_immune(
        job.host_key,
        {
            "host_key": job.host_key,
            "antibody_learned_count": host.get("antibody_learned_count", 0),
            "replay_missed_count": host.get("replay_missed_count", 0),
            "origin_open_count": host.get("origin_open_count", 0),
            "last_job_id": job.job_id,
            "last_status": job.status.value,
            "history_json": json.dumps(host.get("history") or []),
        },
    )


def get_host_memory(host_key: str) -> dict[str, Any] | None:
    data = _load_raw()
    return data.get("hosts", {}).get(host_key)
