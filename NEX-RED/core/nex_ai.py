"""NEX-AI is the only allowed reasoning/reflex model name at runtime."""

from __future__ import annotations

REASONING_MODEL = "nex-ai-protect"
REFLEX_MODEL = "nex-ai-reflex"

_FOREIGN = (
    "qwen",
    "llama",
    "gpt",
    "chatgpt",
    "claude",
    "gemini",
    "mistral",
    "deepseek",
    "gemma",
    "phi-",
    "yi-",
)


def is_nex_ai_model(name: str) -> bool:
    raw = (name or "").strip().lower()
    if not raw.startswith("nex-ai-"):
        return False
    return not any(token in raw for token in _FOREIGN)


def canonical_reasoning_model(raw: str) -> str:
    """Map env overrides. Foreign names (Qwen, Llama, GPT, …) become nex-ai-protect."""
    candidate = (raw or "").strip() or REASONING_MODEL
    if ":" in candidate:
        candidate = candidate.split(":", 1)[0]
    if is_nex_ai_model(candidate):
        return candidate
    return REASONING_MODEL
