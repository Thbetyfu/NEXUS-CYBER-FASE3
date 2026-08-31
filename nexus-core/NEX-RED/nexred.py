#!/usr/bin/env python3
"""
NEX-RED CLI Entry Point
"""

import argparse
import os
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.types import AutonomyLevel, CoworkJobStatus, ScanMode, ScanTarget
from core.orchestrator import NexRedOrchestrator
from agents.reporting.report_generator import ReportGenerator
from jobs.orchestrator import JobCoworkOrchestrator
from jobs.scheduler import JobScheduler


def main():
    parser = argparse.ArgumentParser(
        description="NEX-RED: Nexus Cyber security validation engine (white-box AST + live posture)"
    )
    subparsers = parser.add_subparsers(dest="command", help="Available subcommands")

    scan_parser = subparsers.add_parser("scan", help="Run a validation scan")
    scan_parser.add_argument("-u", "--url", default="http://127.0.0.1:8080", help="Target URL")
    scan_parser.add_argument("-r", "--repo", default=".", help="Repository path for white-box analysis")
    scan_parser.add_argument(
        "-m",
        "--mode",
        choices=["whitebox", "blackbox", "hybrid", "scenario"],
        default="hybrid",
        help="Scan mode",
    )
    scan_parser.add_argument("-s", "--scenario", help="Optional posture label")
    scan_parser.add_argument("--no-llm", action="store_true", help="Disable LLM verification")

    bench_parser = subparsers.add_parser(
        "benchmark",
        help="Compare NEX-RED accuracy/coverage against Shannon and Strix",
    )
    bench_parser.add_argument(
        "-o",
        "--output",
        default=None,
        help="Directory for JSON/Markdown reports (default: NEX-RED/reports)",
    )
    bench_parser.add_argument(
        "--live",
        action="store_true",
        help="Also score Juice Shop class recall (http://127.0.0.1:3003)",
    )

    juice_parser = subparsers.add_parser(
        "lab-juice",
        help="Score AUTH/AUTHZ/INJ/XSS/SSRF on self-hosted Juice Shop (benign HTTP only)",
    )
    juice_parser.add_argument(
        "-u",
        "--url",
        default=None,
        help="Juice Shop URL (default NEX_RED_JUICE_SHOP_URL or http://127.0.0.1:3003)",
    )

    subparsers.add_parser(
        "llm-eval",
        help="Smoke-test the live LLM (verifier + planner JSON). Exit 3 if unreachable, 2 if inaccurate",
    )

    bridge_parser = subparsers.add_parser("bridge", help="Start the NEX-RED Gateway Bridge")
    bridge_parser.add_argument("-p", "--port", type=int, default=3004, help="Port (default: 3004)")

    job_parser = subparsers.add_parser("job", help="GaaS Job Cowork (wasit → approval → close)")
    job_sub = job_parser.add_subparsers(dest="job_command")

    job_run = job_sub.add_parser("run", help="Create and measure a Job")
    job_run.add_argument("--title", required=True, help="Job title")
    job_run.add_argument("-u", "--url", default="http://127.0.0.1:8080", help="Target URL")
    job_run.add_argument("-r", "--repo", default=None, help="Repo path for white-box")
    job_run.add_argument(
        "--autonomy",
        choices=["L0", "L1"],
        default="L0",
        help="L0=artifact only, L1=edge apply + replay",
    )
    job_run.add_argument("--no-llm", action="store_true", help="Disable LLM planner")
    job_run.add_argument("--auto-approve", action="store_true", help="Lab only: skip approval gate")

    job_sub.add_parser("list", help="List recent jobs")
    job_show = job_sub.add_parser("show", help="Show job detail")
    job_show.add_argument("job_id", help="Job ID")
    job_approve = job_sub.add_parser("approve", help="Approve pending job (L0/L1 gate)")
    job_approve.add_argument("job_id", help="Job ID")
    job_approve.add_argument("--operator", default="cli-operator", help="Operator name")
    job_approve.add_argument("--note", default=None, help="Approval note")
    job_export = job_sub.add_parser("export", help="Print artifact paths / markdown")
    job_export.add_argument("job_id", help="Job ID")
    job_export.add_argument("--format", choices=["md", "json"], default="md")

    sched_add = job_sub.add_parser("schedule-add", help="Add Loop GaaS schedule")
    sched_add.add_argument("--title", required=True)
    sched_add.add_argument("-u", "--url", default="http://127.0.0.1:8080")
    sched_add.add_argument("--autonomy", choices=["L0", "L1"], default="L0")
    sched_add.add_argument("--interval-hours", type=int, default=168)
    job_sub.add_parser("schedule-list", help="List Loop GaaS schedules")
    sched_tick = job_sub.add_parser("schedule-tick", help="Run due schedules now")
    sched_tick.add_argument("--auto-approve", action="store_true")

    args = parser.parse_args()

    if args.command == "scan":
        mode_map = {
            "whitebox": ScanMode.WHITEBOX,
            "blackbox": ScanMode.BLACKBOX,
            "hybrid": ScanMode.HYBRID,
            "scenario": ScanMode.SCENARIO,
        }
        target = ScanTarget(
            target_url=args.url,
            repo_path=args.repo,
            mode=mode_map[args.mode],
            scenario=args.scenario,
            enable_llm=not args.no_llm,
        )
        print(f"[*] NEX-RED {args.mode.upper()} scan against {args.url}")
        result = NexRedOrchestrator(target).execute()
        print()
        print("=" * 70)
        print(f"[*] Scan: {result.scan_id}")
        print(f"[*] Files analyzed: {result.files_analyzed}")
        print(f"[*] Live probes: {result.total_attacks_attempted}")
        print(f"[*] Live HTTP checks: {result.live_checks_run}")
        print(f"[*] Findings: {result.vulnerabilities_found}")
        print(f"[*] Defensive blocks: {result.vulnerabilities_mitigated_by_nexus}")
        print(f"[*] LLM used: {result.llm_used}")
        print(f"[*] Status: {result.status}")
        if result.agent_runs:
            agents = ", ".join(f"{item.name}={'ok' if item.ok else 'fail'}" for item in result.agent_runs)
            print(f"[*] Agents: {agents}")
        print("=" * 70)
        print()
        print(ReportGenerator.generate_markdown_report(result))
    elif args.command == "benchmark":
        from benchmarks.runner import run_benchmark

        payload = run_benchmark(args.output, include_juice=args.live)
        print(Path(payload["markdown_path"]).read_text(encoding="utf-8"))
        print()
        print(f"[*] JSON: {payload['json_path']}")
        print(f"[*] Markdown: {payload['markdown_path']}")
        raise SystemExit(0 if payload["parity"]["equal_to_shannon_strix"] else 2)
    elif args.command == "lab-juice":
        from benchmarks.juice_lab import run_juice_lab
        from core.config import config

        payload = run_juice_lab(args.url, wait=True, output_dir=Path(config.reports_dir))
        print()
        print("=" * 70)
        print("[*] NEX-RED Juice Shop class lab")
        print(f"[*] Target: {payload['target_url']}")
        print(f"[*] Reachable: {payload['reachable']}")
        print(f"[*] Class recall: {payload['live_recall']:.0%}")
        print(f"[*] Checks run: {payload.get('checks_run') or 0}")
        print(f"[*] Hits: {', '.join(payload['confirmed_classes']) or 'none'}")
        print("=" * 70)
        print()
        for item in payload.get("checks") or []:
            print(f"  {item.get('verdict','?'):12} {item.get('gold_class','?'):16} {item.get('check')} ({item.get('http_status')})")
        print()
        for name, hit in payload["live_recall_by_class"].items():
            mark = "HIT" if hit else "—"
            print(f"  {name:16} {mark}")
        print()
        print(payload["note"])
        if payload.get("json_path"):
            print(f"[*] JSON: {payload['json_path']}")
        if not payload["reachable"]:
            raise SystemExit(3)
        raise SystemExit(0)
    elif args.command == "sandbox":
        from sandbox.runner import docker_available, run_sandbox

        if not docker_available():
            print("[!] Docker not found. Use: python NEX-RED/nexred.py scan -m whitebox -r . --no-llm")
            raise SystemExit(3)
        print("[*] NEX-RED sandbox (non-root image, no Docker socket)")
        raise SystemExit(run_sandbox())
    elif args.command == "llm-eval":
        from benchmarks.llm_eval import run_llm_eval
        from core.config import config

        payload = run_llm_eval(output_dir=Path(config.reports_dir))
        print()
        print("=" * 70)
        print("[*] NEX-RED LLM smoke eval")
        print(f"[*] Reachable: {payload['reachable']}")
        print(f"[*] Provider: {payload.get('provider')}")
        model = payload.get("model") or {}
        print(f"[*] Configured model: {model.get('configured')}")
        print(f"[*] Eval model: {model.get('chosen')}")
        print(f"[*] Verdict: {payload.get('verdict')}")
        print(f"[*] Verifier: {payload.get('verifier_score') or 'n/a'}")
        planner = payload.get("planner") or {}
        print(f"[*] Planner parsed: {planner.get('parsed')} jwt_family={planner.get('has_jwt_family')} mutating_family={planner.get('has_mutating_family')}")
        print("=" * 70)
        print(payload.get("note") or "")
        if payload.get("json_path"):
            print(f"[*] JSON: {payload['json_path']}")
        verdict = payload.get("verdict")
        if verdict in {"unreachable", "missing_model"}:
            raise SystemExit(3)
        if verdict != "pass":
            raise SystemExit(2)
        raise SystemExit(0)
    elif args.command == "bridge":
        import uvicorn
        from bridge.gateway_bridge import app

        print(f"[*] NEX-RED bridge on 127.0.0.1:{args.port}")
        uvicorn.run(app, host="127.0.0.1", port=args.port)
    elif args.command == "job":
        engine = JobCoworkOrchestrator()
        if args.job_command == "run":
            print(f"[*] Job Cowork: {args.title} → {args.url} ({args.autonomy})")
            job = engine.create_job(
                title=args.title,
                target_url=args.url,
                autonomy_level=AutonomyLevel(args.autonomy),
                repo_path=args.repo,
            )
            job = engine.run_measurement(job.job_id, enable_llm=not args.no_llm)
            print(f"[*] Status: {job.status.value} — awaiting approval")
            if args.auto_approve:
                job = engine.approve(job.job_id, operator="cli-auto", note="lab auto-approve")
            _print_job(job)
        elif args.job_command == "list":
            for item in engine.list_jobs():
                print(f"{item.job_id}  {item.status.value:18}  {item.title}  {item.target_url}")
        elif args.job_command == "show":
            job = engine.get(args.job_id)
            if not job:
                print(f"[!] Job not found: {args.job_id}")
                raise SystemExit(1)
            _print_job(job)
        elif args.job_command == "approve":
            job = engine.approve(args.job_id, operator=args.operator, note=args.note)
            _print_job(job)
        elif args.job_command == "export":
            job = engine.get(args.job_id)
            if not job:
                print(f"[!] Job not found: {args.job_id}")
                raise SystemExit(1)
            scan = engine.store.load_scan_result(args.job_id)
            if args.format == "json":
                from jobs.artifact import build_artifact_payload
                import json

                print(json.dumps(build_artifact_payload(job, scan), indent=2))
            else:
                from jobs.artifact import render_markdown

                print(render_markdown(job, scan))
        elif args.job_command == "schedule-add":
            sched = JobScheduler().add_schedule(
                title=args.title,
                target_url=args.url,
                autonomy_level=AutonomyLevel(args.autonomy),
                interval_hours=args.interval_hours,
            )
            print(f"[*] Schedule {sched.schedule_id} every {sched.interval_hours}h → {sched.target_url}")
        elif args.job_command == "schedule-list":
            for item in JobScheduler().list_schedules():
                print(
                    f"{item.schedule_id}  enabled={item.enabled}  every {item.interval_hours}h  "
                    f"{item.title}  last={item.last_job_id or 'never'}"
                )
        elif args.job_command == "schedule-tick":
            created = JobScheduler().tick(auto_approve=args.auto_approve)
            print(f"[*] Created jobs: {', '.join(created) or 'none due'}")
        else:
            job_parser.print_help()
    else:
        parser.print_help()


def _print_job(job) -> None:
    print()
    print("=" * 70)
    print(f"[*] Job: {job.job_id}")
    print(f"[*] Title: {job.title}")
    print(f"[*] Target: {job.target_url}")
    print(f"[*] Autonomy: {job.autonomy_level.value}")
    print(f"[*] Status: {job.status.value}")
    print(f"[*] Scan: {job.scan_id or 'n/a'}")
    print(f"[*] Defense deltas: {job.defense_deltas or '{}'}")
    print(f"[*] Residuals: {job.residuals or 'none'}")
    print(f"[*] Antibody loop OK: {job.antibody_loop_ok}")
    if job.artifact_paths:
        print(f"[*] Artifacts: {job.artifact_paths}")
    if job.status == CoworkJobStatus.PENDING_APPROVAL:
        print("[*] Next: nexred.py job approve", job.job_id, "--operator <name>")
    print("=" * 70)


if __name__ == "__main__":
    main()
