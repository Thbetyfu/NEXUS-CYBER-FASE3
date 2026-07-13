from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib import error, request


ROOT = Path(__file__).resolve().parent
BENCHMARK_PATH = ROOT / "benchmark_cases.json"
DEFAULT_ENDPOINT = "http://127.0.0.1:11434/api/chat"
DEFAULT_MODEL = "nex-ai-protect"


SYSTEM_PROMPT = (
    "Anda adalah NEX-AI. Keluarkan hanya JSON valid dengan field "
    "status, threat_score, attack_type, reason."
)


@dataclass
class CaseResult:
    case_id: str
    status_ok: bool
    attack_ok: bool
    score_ok: bool
    json_ok: bool
    expected_status: str
    actual_status: str | None
    expected_attack_type: str
    actual_attack_type: str | None
    expected_score_min: float
    expected_score_max: float
    actual_score: float | None
    raw_response: str


def load_cases(path: Path) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8") as handle:
        cases = json.load(handle)
    if not isinstance(cases, list):
        raise ValueError("Benchmark file harus berupa array JSON.")
    required = {
        "id",
        "category",
        "input",
        "expected_status",
        "expected_attack_type",
        "expected_score_min",
        "expected_score_max",
        "notes",
    }
    for idx, case in enumerate(cases):
        missing = required.difference(case)
        if missing:
            raise ValueError(f"Case index {idx} kehilangan field: {sorted(missing)}")
    return cases


def extract_json_object(text: str) -> dict[str, Any]:
    text = text.strip()
    if not text:
        raise ValueError("Respons model kosong.")

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("Tidak menemukan objek JSON pada respons model.")
    return json.loads(text[start : end + 1])


def normalize_attack_type(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip().upper()
    aliases = {
        "XSS": "CROSS_SITE_SCRIPTING",
    }
    return aliases.get(value, value)


def query_model(endpoint: str, model: str, payload: str, timeout: int) -> str:
    body = {
        "model": model,
        "stream": False,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": payload},
        ],
    }
    data = json.dumps(body).encode("utf-8")
    req = request.Request(
        endpoint,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
    except error.URLError as exc:
        raise RuntimeError(
            f"Gagal menghubungi model di {endpoint}. "
            f"Pastikan Ollama aktif dan model `{model}` sudah tersedia."
        ) from exc

    parsed = json.loads(raw)
    message = parsed.get("message", {})
    content = message.get("content")
    if not content:
        raise RuntimeError("Respons Ollama tidak memiliki `message.content`.")
    return content


def evaluate_case(case: dict[str, Any], endpoint: str, model: str, timeout: int) -> CaseResult:
    raw_response = query_model(endpoint, model, case["input"], timeout)
    try:
        parsed = extract_json_object(raw_response)
        json_ok = True
    except Exception:
        return CaseResult(
            case_id=case["id"],
            status_ok=False,
            attack_ok=False,
            score_ok=False,
            json_ok=False,
            expected_status=case["expected_status"],
            actual_status=None,
            expected_attack_type=case["expected_attack_type"],
            actual_attack_type=None,
            expected_score_min=float(case["expected_score_min"]),
            expected_score_max=float(case["expected_score_max"]),
            actual_score=None,
            raw_response=raw_response,
        )

    actual_status = parsed.get("status")
    actual_attack_type = normalize_attack_type(parsed.get("attack_type"))
    actual_score = parsed.get("threat_score")
    if isinstance(actual_score, int):
        actual_score = float(actual_score)

    score_ok = (
        isinstance(actual_score, float)
        and float(case["expected_score_min"]) <= actual_score <= float(case["expected_score_max"])
    )

    return CaseResult(
        case_id=case["id"],
        status_ok=actual_status == case["expected_status"],
        attack_ok=actual_attack_type == case["expected_attack_type"],
        score_ok=score_ok,
        json_ok=json_ok,
        expected_status=case["expected_status"],
        actual_status=actual_status,
        expected_attack_type=case["expected_attack_type"],
        actual_attack_type=actual_attack_type,
        expected_score_min=float(case["expected_score_min"]),
        expected_score_max=float(case["expected_score_max"]),
        actual_score=actual_score if isinstance(actual_score, float) else None,
        raw_response=raw_response,
    )


def summarize(results: list[CaseResult]) -> dict[str, Any]:
    total = len(results)
    json_valid = sum(1 for item in results if item.json_ok)
    status_ok = sum(1 for item in results if item.status_ok)
    attack_ok = sum(1 for item in results if item.attack_ok)
    score_ok = sum(1 for item in results if item.score_ok)
    full_pass = sum(
        1 for item in results if item.json_ok and item.status_ok and item.attack_ok and item.score_ok
    )

    return {
        "total_cases": total,
        "json_validity_rate": round(json_valid / total, 4) if total else 0.0,
        "status_accuracy": round(status_ok / total, 4) if total else 0.0,
        "attack_type_accuracy": round(attack_ok / total, 4) if total else 0.0,
        "threat_score_range_pass_rate": round(score_ok / total, 4) if total else 0.0,
        "full_pass_rate": round(full_pass / total, 4) if total else 0.0,
        "failed_cases": [
            {
                "id": item.case_id,
                "json_ok": item.json_ok,
                "expected_status": item.expected_status,
                "actual_status": item.actual_status,
                "expected_attack_type": item.expected_attack_type,
                "actual_attack_type": item.actual_attack_type,
                "expected_score_min": item.expected_score_min,
                "expected_score_max": item.expected_score_max,
                "actual_score": item.actual_score,
            }
            for item in results
            if not (item.json_ok and item.status_ok and item.attack_ok and item.score_ok)
        ],
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Jalankan benchmark evaluasi NEX-AI via Ollama lokal.")
    parser.add_argument("--benchmark", default=str(BENCHMARK_PATH), help="Path file benchmark JSON.")
    parser.add_argument("--endpoint", default=DEFAULT_ENDPOINT, help="Endpoint chat Ollama.")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="Nama model Ollama.")
    parser.add_argument("--timeout", type=int, default=60, help="Timeout request per case (detik).")
    parser.add_argument(
        "--output",
        default="",
        help="Path opsional untuk menyimpan ringkasan hasil benchmark sebagai JSON.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    benchmark_file = Path(args.benchmark).resolve()
    if not benchmark_file.exists():
        print(f"Benchmark file tidak ditemukan: {benchmark_file}", file=sys.stderr)
        return 1

    try:
        cases = load_cases(benchmark_file)
    except Exception as exc:
        print(f"Gagal membaca benchmark file: {exc}", file=sys.stderr)
        return 1

    results: list[CaseResult] = []
    for case in cases:
        print(f"[RUN] {case['id']} :: {case['category']}")
        try:
            result = evaluate_case(case, args.endpoint, args.model, args.timeout)
        except Exception as exc:
            print(f"Gagal menjalankan benchmark `{case['id']}`: {exc}", file=sys.stderr)
            return 1
        results.append(result)

    summary = summarize(results)
    output_text = json.dumps(summary, indent=2, ensure_ascii=False)
    print("\n=== BENCHMARK SUMMARY ===")
    print(output_text)

    if args.output:
        output_file = Path(args.output).resolve()
        output_file.parent.mkdir(parents=True, exist_ok=True)
        output_file.write_text(output_text + "\n", encoding="utf-8")
        print(f"\nHasil benchmark disimpan ke: {output_file}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
