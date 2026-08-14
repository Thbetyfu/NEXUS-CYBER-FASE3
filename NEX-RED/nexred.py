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

from core.types import ScanMode, ScanTarget
from core.orchestrator import NexRedOrchestrator
from agents.reporting.report_generator import ReportGenerator


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

    bridge_parser = subparsers.add_parser("bridge", help="Start the NEX-RED Gateway Bridge")
    bridge_parser.add_argument("-p", "--port", type=int, default=3004, help="Port (default: 3004)")

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
        print("=" * 70)
        print()
        print(ReportGenerator.generate_markdown_report(result))
    elif args.command == "benchmark":
        from benchmarks.runner import run_benchmark

        payload = run_benchmark(args.output)
        print(Path(payload["markdown_path"]).read_text(encoding="utf-8"))
        print()
        print(f"[*] JSON: {payload['json_path']}")
        print(f"[*] Markdown: {payload['markdown_path']}")
        raise SystemExit(0 if payload["parity"]["equal_to_shannon_strix"] else 2)
    elif args.command == "bridge":
        import uvicorn
        from bridge.gateway_bridge import app

        print(f"[*] NEX-RED bridge on 127.0.0.1:{args.port}")
        uvicorn.run(app, host="127.0.0.1", port=args.port)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
