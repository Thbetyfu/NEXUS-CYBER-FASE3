"""
NEX-RED Gateway Bridge API
REST endpoints for Go Gateway & Next.js SOC Dashboard.
"""

import uuid
from typing import Any, Dict, Optional

from fastapi import BackgroundTasks, FastAPI, HTTPException
from pydantic import BaseModel

from core.config import config
from core.orchestrator import NexRedOrchestrator
from core.types import ScanMode, ScanResult, ScanTarget

app = FastAPI(title="NEX-RED Tactical Bridge", version="4.0.0")

SCAN_HISTORY: Dict[str, Dict[str, Any]] = {}


class TriggerScanRequest(BaseModel):
    target_url: str = "http://127.0.0.1:8080"
    repo_path: Optional[str] = None
    mode: str = "HYBRID"
    scenario: Optional[str] = None
    enable_llm: bool = True
    async_run: bool = False


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
    return {"status": "ONLINE", "engine": "NEX-RED", "version": "4.0.0"}


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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=config.bridge_host, port=config.bridge_port)
