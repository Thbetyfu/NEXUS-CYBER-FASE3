"""
NEX-RED LLM client.

Talks to the same NEX-AI / Ollama / OpenAI-compatible endpoint used by the Go gateway.
Used only to confirm or reject static findings and to suggest remediations.
Does not generate exploit payloads.
"""

from __future__ import annotations

import json
import re
from typing import Any, Dict, Optional

import requests

from core.config import config
from core.nex_ai import canonical_reasoning_model


class LlmClient:
    def __init__(self) -> None:
        self.provider = (config.ai_provider or "ollama").lower()
        self.model = canonical_reasoning_model(config.ai_model_name)
        self.timeout = config.llm_timeout_seconds
        self.api_key = config.ai_api_key
        self.endpoint = config.ai_endpoint
        self.base_url = config.ai_base_url.rstrip("/")

    def available(self) -> bool:
        try:
            url = f"{self.base_url}/api/tags" if self.provider == "ollama" else self.endpoint
            resp = requests.get(url, timeout=3)
            return resp.status_code < 500
        except requests.RequestException:
            return False

    def review_finding(self, *, language: str, snippet: str, title: str, cwe_id: str) -> Optional[Dict[str, Any]]:
        prompt = (
            "You are a senior application-security reviewer for Nexus Cyber.\n"
            "Decide if the code snippet is a true vulnerability of the stated class.\n"
            "Do not provide exploit payloads, attack steps, or proof-of-concept exploits.\n"
            "Reply with JSON only:\n"
            '{"confirmed": true|false, "confidence": 0.0-1.0, "severity": "CRITICAL|HIGH|MEDIUM|LOW|INFO",'
            ' "rationale": "...", "remediation": "..."}\n\n'
            f"Language: {language}\nCWE: {cwe_id}\nHypothesis: {title}\n\n"
            f"Code:\n{snippet[:2500]}\n"
        )
        raw = self._chat(prompt)
        if not raw:
            return None
        parsed = _extract_json(raw)
        return parsed if isinstance(parsed, dict) else None

    def propose_live_plan(self, *, hypotheses: list[dict[str, str]], paths: list[str]) -> Optional[Dict[str, Any]]:
        """Ask for live *checks* only. Never ask for exploit payloads."""
        allowed = (
            "public_get, benign_json_no_500, request_without_authorization, "
            "unauthenticated_mutating_route, unauthenticated_object_read, cross_account_object_read, "
            "verify_jwt_rejects_unverified, mutating_route_requires_auth"
        )
        hypo_lines = "\n".join(
            f"- id={item.get('id')} cwe={item.get('cwe')} title={item.get('title')} path={item.get('path')}"
            for item in hypotheses[:20]
        ) or "- none"
        path_lines = ", ".join(paths[:15]) or "/"
        prompt = (
            "You plan safe live HTTP *checks* for Nexus Cyber NEX-RED.\n"
            "Do not provide exploit payloads, SQL/XSS/SSRF strings, wordlists, or attack tutorials.\n"
            "Choose only these check names: "
            f"{allowed}.\n"
            "endpoint must be a single path starting with / (example /api/login).\n"
            "Also say how to remediate if the check fails (safe behavior), not how to attack.\n"
            f"Budget: at most {config.max_live_steps} steps, about {config.max_live_minutes} minutes.\n"
            "Reply with JSON only:\n"
            '{"steps":[{"hypothesis_id":"...","check":"...","endpoint":"/...","stop_condition":"..."}]}\n\n'
            f"Hypotheses:\n{hypo_lines}\n\nKnown paths: {path_lines}\n"
        )
        raw = self._chat(prompt)
        if not raw:
            return None
        parsed = _extract_json(raw)
        return parsed if isinstance(parsed, dict) else None

    def _chat(self, user_prompt: str) -> str:
        system = (
            "You are NEX-RED Reviewer for Nexus Cyber. "
            "Be conservative. Never output exploit code or attack payloads. "
            "When planning live checks, only name allowed checks and URL paths."
        )
        try:
            if self.provider in ("openai", "openrouter", "compatible"):
                return self._chat_openai(system, user_prompt)
            return self._chat_ollama(system, user_prompt)
        except requests.RequestException:
            return ""

    def _chat_ollama(self, system: str, user_prompt: str) -> str:
        resp = requests.post(
            self.endpoint or f"{self.base_url}/api/chat",
            json={
                "model": self.model,
                "stream": False,
                "options": {"temperature": 0.1},
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user_prompt},
                ],
            },
            timeout=self.timeout,
        )
        resp.raise_for_status()
        data = resp.json()
        return str(data.get("message", {}).get("content") or data.get("response") or "")

    def _chat_openai(self, system: str, user_prompt: str) -> str:
        url = self.endpoint
        if "/chat/completions" not in url:
            url = f"{self.base_url}/v1/chat/completions"
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        resp = requests.post(
            url,
            headers=headers,
            json={
                "model": self.model,
                "temperature": 0.1,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user_prompt},
                ],
            },
            timeout=self.timeout,
        )
        resp.raise_for_status()
        data = resp.json()
        return str(data["choices"][0]["message"]["content"])


def _extract_json(text: str) -> Optional[Dict[str, Any]]:
    text = text.strip()
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    blob = fenced.group(1) if fenced else None
    if blob is None:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        blob = match.group(0) if match else None
    if not blob:
        return None
    try:
        parsed = json.loads(blob)
    except json.JSONDecodeError:
        return None
    if not isinstance(parsed, dict):
        return None
    return _strip_json_keys(parsed)


def _strip_json_keys(value: Any) -> Any:
    """Tolerate spaced keys from small local models (e.g. ' endpoint')."""
    if isinstance(value, dict):
        out = {}
        for key, item in value.items():
            clean = str(key).strip().replace(" ", "_")
            out[clean] = _strip_json_keys(item)
        return out
    if isinstance(value, list):
        return [_strip_json_keys(item) for item in value]
    return value
