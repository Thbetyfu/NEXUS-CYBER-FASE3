"""
Live LLM smoke eval (verifier + planner JSON).

Not a Shannon benchmark. Skips cleanly if Ollama/API is down.
Does not send exploit payloads.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from agents.planner.plan import live_check_from_json
from core.llm_client import LlmClient
from core.nex_ai import REASONING_MODEL, is_nex_ai_model


_VERIFIER_CASES = [
    {
        "id": "sql_dynamic_tp",
        "expect_confirmed": True,
        "language": "python",
        "cwe_id": "CWE-89",
        "title": "Dynamic SQL string formatting",
        "snippet": "q = \"SELECT * FROM users WHERE name = '%s'\" % user\ncursor.execute(q)\n",
    },
    {
        "id": "sql_parameterized_tn",
        "expect_confirmed": False,
        "language": "python",
        "cwe_id": "CWE-89",
        "title": "Dynamic SQL string formatting",
        "snippet": "cursor.execute(\"SELECT * FROM users WHERE name = %s\", (user,))\n",
    },
    {
        "id": "jwt_unverified_tp",
        "expect_confirmed": True,
        "language": "python",
        "cwe_id": "CWE-347",
        "title": "JWT decode without signature verify",
        "snippet": "import jwt\nreturn jwt.decode(token, verify=False)\n",
    },
]


def _list_ollama_models(client: LlmClient) -> List[str]:
    try:
        import requests

        resp = requests.get(f"{client.base_url}/api/tags", timeout=3)
        if resp.status_code >= 500:
            return []
        data = resp.json()
        return [str(item.get("name") or "") for item in data.get("models") or [] if item.get("name")]
    except Exception:
        return []


def resolve_eval_model(client: LlmClient) -> Dict[str, Any]:
    installed = _list_ollama_models(client) if client.provider == "ollama" else []
    configured = client.model if is_nex_ai_model(client.model) else REASONING_MODEL
    present = configured in installed or f"{configured}:latest" in installed
    if client.provider != "ollama":
        present = True
    note = ""
    if not present:
        note = (
            f"NEX-AI `{configured}` is not installed on the local endpoint. "
            "Do not substitute Qwen, Llama, or any other ollama list entry. "
            "Register the owner's model as nex-ai-protect, then re-run llm-eval."
        )
    return {
        "configured": configured,
        "chosen": configured,
        "installed": installed,
        "present": present,
        "note": note,
    }


def _score_verifier(client: LlmClient) -> List[Dict[str, Any]]:
    rows = []
    for case in _VERIFIER_CASES:
        review = client.review_finding(
            language=case["language"],
            snippet=case["snippet"],
            title=case["title"],
            cwe_id=case["cwe_id"],
        )
        parsed = isinstance(review, dict) and "confirmed" in review
        got = review.get("confirmed") if parsed else None
        expect = case["expect_confirmed"]
        correct = parsed and bool(got) is bool(expect)
        rows.append(
            {
                "id": case["id"],
                "parsed": parsed,
                "expected_confirmed": expect,
                "got_confirmed": got,
                "correct": correct,
                "raw": review,
            }
        )
    return rows


def _score_planner(client: LlmClient) -> Dict[str, Any]:
    payload = client.propose_live_plan(
        hypotheses=[
            {
                "id": "H-jwt",
                "cwe": "CWE-347",
                "title": "JWT decode without verify",
                "path": "/api/login",
            },
            {
                "id": "H-mut",
                "cwe": "CWE-306",
                "title": "Mutating HTTP route without an authentication decorator",
                "path": "/users/1",
            },
        ],
        paths=["/", "/api/login", "/users/1"],
    )
    steps = payload.get("steps") if isinstance(payload, dict) else None
    accepted = []
    dropped = 0
    if isinstance(steps, list):
        for item in steps:
            if not isinstance(item, dict):
                dropped += 1
                continue
            check = live_check_from_json(item)
            if check:
                accepted.append({"check": check.check, "path": check.path, "hypothesis_id": check.hypothesis_id})
            else:
                dropped += 1
    names = {item["check"] for item in accepted}
    has_jwt = "request_without_authorization" in names
    has_mut = "unauthenticated_mutating_route" in names
    return {
        "parsed": isinstance(steps, list),
        "accepted_steps": accepted,
        "dropped_steps": dropped,
        "has_jwt_family": has_jwt,
        "has_mutating_family": has_mut,
        "correct": isinstance(steps, list) and has_jwt and has_mut,
        "raw": payload,
    }


def run_llm_eval(*, output_dir: Optional[Path] = None) -> Dict[str, Any]:
    client = LlmClient()
    stamp = datetime.now(timezone.utc).isoformat()
    result: Dict[str, Any] = {
        "generated_at": stamp,
        "reachable": False,
        "provider": client.provider,
        "model": {},
        "verifier": [],
        "planner": {},
        "verdict": "not_run",
        "note": "",
    }
    if not client.available():
        result["note"] = (
            "LLM endpoint is not reachable (default http://127.0.0.1:11434). "
            "Start Ollama, then: python NEX-RED/nexred.py llm-eval"
        )
        result["verdict"] = "unreachable"
        return _maybe_write(result, output_dir)

    result["reachable"] = True
    model_info = resolve_eval_model(client)
    result["model"] = model_info
    client.model = model_info["chosen"]
    if not model_info.get("present"):
        result["verdict"] = "missing_model"
        result["note"] = model_info.get("note") or "nex-ai-protect is not installed."
        return _maybe_write(result, output_dir)

    client.timeout = max(client.timeout, 90)

    verifier_rows = _score_verifier(client)
    planner = _score_planner(client)
    result["verifier"] = verifier_rows
    result["planner"] = planner
    v_ok = sum(1 for row in verifier_rows if row["correct"])
    v_n = len(verifier_rows)
    parsed = all(row["parsed"] for row in verifier_rows) and planner.get("parsed")
    accurate = v_ok == v_n and planner.get("correct")
    result["verifier_score"] = f"{v_ok}/{v_n}"
    if not parsed:
        result["verdict"] = "invalid_json"
        result["note"] = "Model replied but JSON was missing or unusable. Planner/verifier is not ready."
    elif accurate:
        result["verdict"] = "pass"
        result["note"] = (
            f"Smoke eval passed on `{client.model}`. Small labeled set only — not Shannon parity."
        )
    else:
        result["verdict"] = "fail"
        result["note"] = (
            f"Smoke eval did not meet the bar on `{client.model}` "
            f"(verifier {v_ok}/{v_n}, planner jwt={planner.get('has_jwt_family')} "
            f"mutating={planner.get('has_mutating_family')}). Do not treat the LLM as accurate yet."
        )
    if model_info.get("note"):
        result["note"] = model_info["note"] + " " + result["note"]
    return _maybe_write(result, output_dir)


def _maybe_write(result: Dict[str, Any], output_dir: Optional[Path]) -> Dict[str, Any]:
    if output_dir is None:
        return result
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)
    path = out / "nexred_llm_eval.json"
    path.write_text(json.dumps(result, indent=2, default=str), encoding="utf-8")
    result["json_path"] = str(path)
    return result
