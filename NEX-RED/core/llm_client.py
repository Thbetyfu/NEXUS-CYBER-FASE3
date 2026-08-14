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


class LlmClient:
    def __init__(self) -> None:
        self.provider = (config.ai_provider or "ollama").lower()
        self.model = config.ai_model_name
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
        return _extract_json(raw)

    def _chat(self, user_prompt: str) -> str:
        system = (
            "You are NEX-RED Reviewer, a static-analysis verifier. "
            "Be conservative: reject findings that are parameterized, mocked, or comments. "
            "Never output exploit code."
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
    return parsed if isinstance(parsed, dict) else None
