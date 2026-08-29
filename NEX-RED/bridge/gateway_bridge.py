"""
NEX-RED Gateway Bridge API
REST endpoints for Go Gateway & Next.js SOC Dashboard.
"""

import asyncio
import uuid
from typing import Any, Dict, List, Optional

from fastapi import BackgroundTasks, FastAPI, HTTPException
from pydantic import BaseModel, Field

from core.config import config
from core.orchestrator import NexRedOrchestrator
from core.types import AutonomyLevel, CoworkJob, ScanMode, ScanResult, ScanTarget
from jobs.artifact import build_artifact_payload, render_markdown
from jobs.orchestrator import JobCoworkOrchestrator
from jobs.scheduler import JobScheduler

app = FastAPI(title="NEX-RED Tactical Bridge", version="5.1.0")

SCAN_HISTORY: Dict[str, Dict[str, Any]] = {}
job_engine = JobCoworkOrchestrator()
job_scheduler = JobScheduler()


class TriggerScanRequest(BaseModel):
    target_url: str = "http://127.0.0.1:8080"
    repo_path: Optional[str] = None
    mode: str = "HYBRID"
    scenario: Optional[str] = None
    enable_llm: bool = True
    async_run: bool = True


class CreateJobRequest(BaseModel):
    title: str
    target_url: str = Field(default_factory=lambda: config.live_target)
    # Workspace / protected host — sets host_key. Origin twin stays NEX_RED_ORIGIN_DIRECT.
    protected_host: Optional[str] = None
    autonomy_level: str = "L0"
    repo_path: Optional[str] = None
    enable_llm: bool = False
    auto_approve: bool = False
    operator: str = "bridge"


class ApproveJobRequest(BaseModel):
    operator: str
    note: Optional[str] = None
    approved: bool = True


class CreateScheduleRequest(BaseModel):
    title: str
    target_url: str = Field(default_factory=lambda: config.live_target)
    autonomy_level: str = "L0"
    repo_path: Optional[str] = None
    interval_hours: int = 168


def _autonomy(value: str) -> AutonomyLevel:
    try:
        return AutonomyLevel(value.upper())
    except ValueError:
        return AutonomyLevel.L0


def _job_payload(job: CoworkJob) -> dict:
    return job.model_dump(mode="json")


@app.on_event("startup")
async def _start_scheduler_loop() -> None:
    async def _loop() -> None:
        while True:
            try:
                job_scheduler.tick(auto_approve=False)
            except Exception:
                pass
            await asyncio.sleep(60)

    asyncio.create_task(_loop())


def _mode_from(value: str) -> ScanMode:
    try:
        return ScanMode(value.upper())
    except ValueError:
        return ScanMode.HYBRID


def _run_scan(req: TriggerScanRequest) -> ScanResult:
    target = ScanTarget(
        target_url=req.target_url,
        repo_path=req.repo_path,
        mode=_mode_from(req.mode),
        scenario=req.scenario,
        enable_llm=req.enable_llm,
    )
    return NexRedOrchestrator(target).execute()


def _store_completed(result: ScanResult) -> None:
    SCAN_HISTORY[result.scan_id] = {
        "status": result.status,
        "result": result,
    }


def _background_scan(scan_id: str, req: TriggerScanRequest) -> None:
    SCAN_HISTORY[scan_id]["status"] = "RUNNING"
    try:
        result = _run_scan(req)
        result.scan_id = scan_id
        _store_completed(result)
    except Exception as exc:  # noqa: BLE001 — job must not kill the bridge
        SCAN_HISTORY[scan_id] = {"status": "FAILED", "error": str(exc)}


@app.get("/api/v1/health")
def health_check():
    return {"status": "ONLINE", "engine": "NEX-RED", "version": "5.0.0"}


@app.post("/api/v1/scan")
def trigger_scan(req: TriggerScanRequest, background: BackgroundTasks):
    if req.async_run:
        scan_id = f"NEXRED-{uuid.uuid4().hex[:8].upper()}"
        SCAN_HISTORY[scan_id] = {"status": "QUEUED", "result": None}
        background.add_task(_background_scan, scan_id, req)
        return {"success": True, "scan_id": scan_id, "status": "QUEUED"}

    result = _run_scan(req)
    _store_completed(result)
    return {
        "success": True,
        "scan_id": result.scan_id,
        "status": result.status,
        "summary": {
            "attacks_attempted": result.total_attacks_attempted,
            "vulnerabilities_found": result.vulnerabilities_found,
            "mitigated_by_nexus": result.vulnerabilities_mitigated_by_nexus,
            "files_analyzed": result.files_analyzed,
            "llm_used": result.llm_used,
            "live_checks_run": result.live_checks_run,
            "findings_count": len(result.findings),
        },
        "findings": result.findings,
        "logs": result.raw_logs,
    }


@app.get("/api/v1/scan/{scan_id}")
def get_scan_result(scan_id: str):
    item = SCAN_HISTORY.get(scan_id)
    if not item:
        raise HTTPException(status_code=404, detail="Scan ID not found")
    return item


@app.post("/api/v1/jobs")
def create_job(req: CreateJobRequest, background: BackgroundTasks):
    job = job_engine.create_job(
        title=req.title,
        target_url=req.target_url,
        autonomy_level=_autonomy(req.autonomy_level),
        repo_path=req.repo_path,
        protected_host=req.protected_host,
    )

    def _run() -> None:
        measured = job_engine.run_measurement(job.job_id, enable_llm=req.enable_llm)
        if req.auto_approve:
            job_engine.approve(
                measured.job_id,
                operator=req.operator,
                note="auto-approve via bridge",
            )

    background.add_task(_run)
    return {"success": True, "job": _job_payload(job)}


@app.get("/api/v1/jobs")
def list_jobs(limit: int = 50):
    jobs = job_engine.list_jobs(limit=limit)
    return {"success": True, "jobs": [_job_payload(item) for item in jobs]}


@app.get("/api/v1/jobs/{job_id}")
def get_job(job_id: str):
    job = job_engine.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    scan = job_engine.store.load_scan_result(job_id)
    return {
        "success": True,
        "job": _job_payload(job),
        "scan_status": scan.status if scan else None,
    }


@app.post("/api/v1/jobs/{job_id}/run")
def run_job_measurement(job_id: str, background: BackgroundTasks, enable_llm: bool = False):
    job = job_engine.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    def _run() -> None:
        job_engine.run_measurement(job_id, enable_llm=enable_llm)

    background.add_task(_run)
    return {"success": True, "job_id": job_id, "status": "MEASURING"}


@app.post("/api/v1/jobs/{job_id}/approve")
def approve_job(job_id: str, req: ApproveJobRequest):
    try:
        job = job_engine.approve(
            job_id,
            operator=req.operator,
            note=req.note,
            approved=req.approved,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"success": True, "job": _job_payload(job)}


@app.get("/api/v1/jobs/{job_id}/artifact")
def job_artifact(job_id: str, format: str = "json"):
    job = job_engine.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    scan = job_engine.store.load_scan_result(job_id)
    if format == "md":
        return {"success": True, "markdown": render_markdown(job, scan)}
    return {"success": True, "artifact": build_artifact_payload(job, scan)}


@app.post("/api/v1/schedules")
def create_schedule(req: CreateScheduleRequest):
    schedule = job_scheduler.add_schedule(
        title=req.title,
        target_url=req.target_url,
        autonomy_level=_autonomy(req.autonomy_level),
        repo_path=req.repo_path,
        interval_hours=req.interval_hours,
    )
    return {"success": True, "schedule": schedule.model_dump(mode="json")}


@app.get("/api/v1/schedules")
def list_schedules():
    items = job_scheduler.list_schedules()
    return {"success": True, "schedules": [item.model_dump(mode="json") for item in items]}


@app.post("/api/v1/schedules/tick")
def schedules_tick(auto_approve: bool = False):
    created = job_scheduler.tick(auto_approve=auto_approve)
    return {"success": True, "job_ids": created}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=config.bridge_host, port=config.bridge_port)
