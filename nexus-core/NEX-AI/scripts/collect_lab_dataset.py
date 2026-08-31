"""
Collect NEX-AI training rows from lab WAF telemetry (JSONL).

Ground truth is the gateway decision (regex / ban / honeypot), not the LLM.
Does not generate exploit payloads. Blocked samples appear only if they
already exist in nexus_traffic.log.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, Iterable, Iterator, List, Optional, Tuple

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
DEFAULT_OUT = ROOT / "dataset" / "lab" / "lab_collected.jsonl"
EVAL_CASES = ROOT / "evaluation" / "benchmark_cases.json"
INSTRUCTION = (
    "Lakukan klasifikasi payload HTTP ini. Tentukan status "
    "(BENIGN, SUSPICIOUS, MALICIOUS), tipe serangan "
    "(SQL_INJECTION, CROSS_SITE_SCRIPTING, PATH_TRAVERSAL, "
    "COMMAND_INJECTION, ZERO_DAY_BYPASS, NONE), dan threat score."
)
MAX_PAYLOAD = 1024

_DEFAULT_LOGS = (
    REPO / "nexus_traffic.log",
    REPO / "nexus-core-gateway" / "nexus_traffic.log",
    REPO / "deploy-local" / "nexus_traffic.log",
)


def _http_blob(method: str, endpoint: str, host: str, payload: str) -> str:
    head = f"{method} {endpoint} HTTP/1.1\nHost: {host or '127.0.0.1'}"
    body = (payload or "").strip()
    if len(body) > MAX_PAYLOAD:
        body = body[:MAX_PAYLOAD]
    if body:
        return f"{head}\n\n{body}"
    return head


def _attack_from_threat(detail: str) -> str:
    text = (detail or "").upper()
    if "SQL" in text:
        return "SQL_INJECTION"
    if "XSS" in text or "SCRIPT" in text:
        return "CROSS_SITE_SCRIPTING"
    if "TRAVERSAL" in text or "LFI" in text or "PATH" in text:
        return "PATH_TRAVERSAL"
    if "COMMAND" in text or "RCE" in text or "INJECTION" in text:
        return "COMMAND_INJECTION"
    return "ZERO_DAY_BYPASS"


def label_from_traffic(status: str, threat_detail: str) -> Tuple[str, str, float, str]:
    """Map TelemetryLog.status to NEX-AI output fields."""
    flag = (status or "").upper()
    if flag == "ALLOWED":
        return "BENIGN", "NONE", 0.02, "Gateway mengizinkan request (keputusan Reflex)."
    if flag in {"RATE_LIMITED"}:
        return "SUSPICIOUS", "NONE", 0.45, "Gateway membatasi laju request."
    if "HONEYPOT" in flag or flag in {"BANNED_IP_DIVERTED", "INSTANT_DROP_PATCH", "DIVERTED_TO_HONEYPOT"}:
        return "SUSPICIOUS", "ZERO_DAY_BYPASS", 0.7, f"Gateway mengalihkan/menolak: {flag}."
    if flag in {"BLOCKED"}:
        kind = _attack_from_threat(threat_detail)
        return "MALICIOUS", kind, 0.95, f"Gateway memblokir. Detail Reflex: {threat_detail or 'BLOCKED'}."
    return "SUSPICIOUS", "NONE", 0.4, f"Status lab tidak dipetakan penuh: {flag}."


def row(input_http: str, status: str, attack_type: str, score: float, reason: str, source: str) -> Dict[str, Any]:
    output = {
        "status": status,
        "threat_score": score,
        "attack_type": attack_type,
        "reason": reason,
    }
    digest = hashlib.sha256(input_http.encode("utf-8", errors="replace")).hexdigest()[:16]
    return {
        "id": f"lab-{digest}",
        "source": source,
        "instruction": INSTRUCTION,
        "input": input_http,
        "output": json.dumps(output, ensure_ascii=False),
    }


def iter_log_lines(path: Path) -> Iterator[Dict[str, Any]]:
    with path.open("r", encoding="utf-8", errors="replace") as handle:
        for line in handle:
            text = line.strip()
            if not text or not text.startswith("{"):
                continue
            try:
                item = json.loads(text)
            except json.JSONDecodeError:
                continue
            if isinstance(item, dict):
                yield item


def rows_from_log(path: Path) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for item in iter_log_lines(path):
        method = str(item.get("method") or "GET")
        endpoint = str(item.get("endpoint") or "/")
        host = str(item.get("target_domain") or "127.0.0.1")
        payload = str(item.get("payload_sample") or "")
        status = str(item.get("status") or "")
        detail = str(item.get("threat_detail") or "")
        if not status:
            continue
        label, attack, score, reason = label_from_traffic(status, detail)
        blob = _http_blob(method, endpoint, host, payload)
        out.append(row(blob, label, attack, score, reason, source=f"log:{path.name}"))
    return out


def rows_from_eval_benign(path: Path) -> List[Dict[str, Any]]:
    if not path.is_file():
        return []
    cases = json.loads(path.read_text(encoding="utf-8"))
    out: List[Dict[str, Any]] = []
    for case in cases:
        if not isinstance(case, dict):
            continue
        if str(case.get("expected_status") or "") != "BENIGN":
            continue
        text = str(case.get("input") or "").strip()
        if not text:
            continue
        out.append(
            row(
                text,
                "BENIGN",
                "NONE",
                0.04,
                "Kasus evaluasi jinak (bukan serangan).",
                source="eval_benign",
            )
        )
    return out


def rows_from_lab_seeds() -> List[Dict[str, Any]]:
    ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Nexus-LabCollector/1.0"
    seeds = [
        ("GET", "/", ""),
        ("GET", "/favicon.ico", ""),
        ("GET", "/api/telemetry", ""),
        ("POST", "/api/unlock-reward", '{"password":"not-the-lab-secret"}'),
        ("POST", "/api/checkout", '{"transaction":{"id":"tx_lab","amount":1000,"currency":"IDR"}}'),
    ]
    out: List[Dict[str, Any]] = []
    for method, path, body in seeds:
        blob = f"{method} {path} HTTP/1.1\nHost: 127.0.0.1\nUser-Agent: {ua}"
        if body:
            blob += f"\nContent-Type: application/json\n\n{body}"
        out.append(
            row(
                blob,
                "BENIGN",
                "NONE",
                0.03,
                "Lalu lintas lab portofolio/gateway yang diharapkan jinak.",
                source="seed_benign",
            )
        )
    return out


def merge(batches: Iterable[List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
    seen = set()
    merged: List[Dict[str, Any]] = []
    for batch in batches:
        for item in batch:
            key = item["id"]
            if key in seen:
                continue
            seen.add(key)
            merged.append(item)
    return merged


def summarize(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    counts: Dict[str, int] = {}
    sources: Dict[str, int] = {}
    for item in rows:
        payload = json.loads(item["output"])
        status = payload.get("status", "?")
        counts[status] = counts.get(status, 0) + 1
        src = item.get("source", "?")
        sources[src] = sources.get(src, 0) + 1
    return {"total": len(rows), "by_status": counts, "by_source": sources}


def copy_log_from_gateway_container(dest: Path) -> Optional[Path]:
    """Lab writes nexus_traffic.log inside Docker WORKDIR /app, not on the host disk."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    for container in ("nexus-local-gateway",):
        inner = f"{container}:/app/nexus_traffic.log"
        try:
            result = subprocess.run(
                ["docker", "cp", inner, str(dest)],
                capture_output=True,
                text=True,
                timeout=30,
            )
        except (FileNotFoundError, subprocess.TimeoutExpired, OSError):
            return None
        if result.returncode == 0 and dest.is_file() and dest.stat().st_size > 0:
            return dest
    return None


def discover_logs(explicit: List[Path]) -> List[Path]:
    found: List[Path] = []
    for path in explicit + list(_DEFAULT_LOGS):
        resolved = path.resolve()
        if resolved.is_file() and resolved not in found:
            found.append(resolved)
    if not found:
        pulled = copy_log_from_gateway_container(ROOT / "dataset" / "lab" / "nexus_traffic.log")
        if pulled is not None:
            found.append(pulled.resolve())
    return found


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Kumpulkan dataset NEX-AI dari log lab.")
    parser.add_argument("--log", action="append", default=[], help="Path nexus_traffic.log (boleh diulang).")
    parser.add_argument("--out", default=str(DEFAULT_OUT), help="Output JSONL.")
    parser.add_argument("--no-eval-benign", action="store_true", help="Jangan ambil kasus BENIGN dari evaluation.")
    parser.add_argument("--no-seeds", action="store_true", help="Jangan tambah seed path lab.")
    return parser.parse_args(argv)


def collect(log_paths: List[Path], *, eval_benign: bool, seeds: bool) -> List[Dict[str, Any]]:
    batches: List[List[Dict[str, Any]]] = []
    for path in log_paths:
        batches.append(rows_from_log(path))
    if eval_benign:
        batches.append(rows_from_eval_benign(EVAL_CASES))
    if seeds:
        batches.append(rows_from_lab_seeds())
    return merge(batches)


def main(argv: Optional[List[str]] = None) -> int:
    args = parse_args(argv)
    logs = discover_logs([Path(item) for item in args.log])
    rows = collect(logs, eval_benign=not args.no_eval_benign, seeds=not args.no_seeds)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", encoding="utf-8") as handle:
        for item in rows:
            handle.write(json.dumps(item, ensure_ascii=False) + "\n")
    summary = summarize(rows)
    summary["logs_read"] = [str(path) for path in logs]
    summary["output"] = str(out)
    summary_path = out.with_suffix(".summary.json")
    summary_path.write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2, ensure_ascii=True))
    if not logs:
        print("No nexus_traffic.log found. Seed/eval benign only. Run the lab, then re-run with --log.", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
