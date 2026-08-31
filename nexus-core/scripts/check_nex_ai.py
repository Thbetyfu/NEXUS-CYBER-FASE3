"""Fail-closed NEX-AI gate for the local lab.

The lab must not start unless both owner models are registered in local
Ollama: nex-ai-protect and nex-ai-reflex. Weights are a local GGUF copy
plus IMPORT-OLLAMA.bat — never an Ollama Hub pull (qwen/llama/gpt).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from typing import Any, FrozenSet, Iterable, Mapping, Sequence, Tuple

REQUIRED_MODELS: Tuple[str, ...] = ("nex-ai-protect", "nex-ai-reflex")
DEFAULT_TAGS_URL = "http://127.0.0.1:11434/api/tags"
DEFAULT_TIMEOUT_SEC = 5.0

# Operator-facing text. Keep in sync with nexus-core-gateway/internal/ai/nex_ai_gate.go
MISSING_MESSAGE = """\
============================================================
  Model AI tidak ada. Silakan pasang terlebih dahulu.
============================================================

NEX-AI milik Nexus. Bobot TIDAK diunduh dari Ollama Hub.
Jangan jalankan: ollama pull qwen / llama / gpt

Cara pasang:
  1. Salin nex_ai_q4_k_m.gguf ke folder nex-ai-models\\
  2. Jalankan nex-ai-models\\IMPORT-OLLAMA.bat
  3. Pastikan Ollama nyala di laptop ini
  4. Cek: ollama list  - harus ada nex-ai-protect DAN nex-ai-reflex

Lewati gerbang ini hanya untuk CI: set NEX_AI_REQUIRED=0
(bukan pengganti Hub; lab di PC ini tetap wajib model lokal).
============================================================
"""

SKIP_MESSAGE = (
    "[NEX-AI] Gerbang dilewati (NEX_AI_REQUIRED=0). Bukan unduhan Hub."
)


def env_truthy(raw: str) -> bool:
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def env_falsy(raw: str) -> bool:
    return raw.strip().lower() in {"0", "false", "no", "off"}


def cli_requires_nex_ai(env: Mapping[str, str] | None = None) -> bool:
    """Operator/CLI default is fail-closed. Only an explicit off-value skips."""
    source = os.environ if env is None else env
    raw = source.get("NEX_AI_REQUIRED", "")
    if env_falsy(raw):
        return False
    return True


def normalize_ollama_name(name: str) -> str:
    raw = (name or "").strip().lower()
    if ":" in raw:
        raw = raw.split(":", 1)[0]
    return raw


def names_from_tags_payload(payload: Any) -> FrozenSet[str]:
    """Parse GET /api/tags JSON. Unknown shapes yield an empty set (fail-closed)."""
    if not isinstance(payload, dict):
        return frozenset()
    models = payload.get("models")
    if not isinstance(models, list):
        return frozenset()
    names: set[str] = set()
    for item in models:
        if not isinstance(item, dict):
            continue
        raw = item.get("name")
        if not raw:
            continue
        names.add(normalize_ollama_name(str(raw)))
    return frozenset(names)


def missing_required_models(names: Iterable[str]) -> Tuple[str, ...]:
    have = {normalize_ollama_name(n) for n in names}
    return tuple(model for model in REQUIRED_MODELS if model not in have)


def tags_url_from_env(env: Mapping[str, str] | None = None) -> str:
    source = os.environ if env is None else env
    explicit = (source.get("NEX_AI_TAGS_URL") or "").strip()
    if explicit:
        return explicit
    base = (source.get("NEX_AI_BASE_URL") or "").strip().rstrip("/")
    if base:
        return f"{base}/api/tags"
    return DEFAULT_TAGS_URL


def fetch_tags_payload(url: str, timeout: float = DEFAULT_TIMEOUT_SEC) -> Any:
    req = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read()
    return json.loads(raw.decode("utf-8"))


def format_failure(reason: str) -> str:
    return f"{reason.rstrip()}\n\n{MISSING_MESSAGE}"


def evaluate_tags_payload(payload: Any) -> Tuple[bool, str]:
    missing = missing_required_models(names_from_tags_payload(payload))
    if not missing:
        return True, (
            "[OK] NEX-AI lokal siap: nex-ai-protect dan nex-ai-reflex "
            "ada di Ollama."
        )
    listed = ", ".join(missing)
    return False, format_failure(f"[GAGAL] Model hilang di Ollama lokal: {listed}.")


def run_check(
    *,
    payload: Any | None = None,
    tags_url: str | None = None,
    timeout: float = DEFAULT_TIMEOUT_SEC,
    env: Mapping[str, str] | None = None,
) -> Tuple[int, str]:
    if not cli_requires_nex_ai(env):
        return 0, SKIP_MESSAGE
    if payload is None:
        url = tags_url or tags_url_from_env(env)
        try:
            payload = fetch_tags_payload(url, timeout=timeout)
        except urllib.error.HTTPError as exc:
            return 1, format_failure(
                f"[GAGAL] Ollama menolak {url} (HTTP {exc.code})."
            )
        except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
            return 1, format_failure(
                f"[GAGAL] Ollama tidak merespons di {url} ({exc})."
            )
    ok, text = evaluate_tags_payload(payload)
    return (0 if ok else 1), text


def _load_payload_file(path: str) -> Any:
    with open(path, encoding="utf-8-sig") as handle:
        return json.load(handle)


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Fail-closed check: local nex-ai-protect and nex-ai-reflex."
    )
    parser.add_argument(
        "--payload-file",
        help="Parse this Ollama /api/tags JSON instead of calling the HTTP API.",
    )
    parser.add_argument(
        "--tags-url",
        default=None,
        help=f"Override GET URL (default {DEFAULT_TAGS_URL}).",
    )
    args = parser.parse_args(argv)

    payload = None
    if args.payload_file:
        try:
            payload = _load_payload_file(args.payload_file)
        except (OSError, json.JSONDecodeError) as exc:
            print(format_failure(f"[GAGAL] Berkas tags JSON tidak terbaca: {exc}"), file=sys.stderr)
            return 1

    code, text = run_check(payload=payload, tags_url=args.tags_url)
    stream = sys.stdout if code == 0 else sys.stderr
    print(text, file=stream)
    return code


if __name__ == "__main__":
    raise SystemExit(main())
