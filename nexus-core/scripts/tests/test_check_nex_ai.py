"""Unit tests for the fail-closed NEX-AI start gate (JSON parse only)."""

from __future__ import annotations

import os
import sys
import unittest

SCRIPT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from check_nex_ai import (  # noqa: E402
    MISSING_MESSAGE,
    SKIP_MESSAGE,
    cli_requires_nex_ai,
    evaluate_tags_payload,
    missing_required_models,
    names_from_tags_payload,
    run_check,
)


BOTH_PRESENT = {
    "models": [
        {"name": "nex-ai-protect:latest"},
        {"name": "nex-ai-reflex:latest"},
        {"name": "qwen2.5:3b"},
    ]
}

ONLY_PROTECT = {"models": [{"name": "nex-ai-protect"}]}
ONLY_REFLEX = {"models": [{"name": "nex-ai-reflex:latest"}]}
HUB_ONLY = {"models": [{"name": "qwen2.5:7b"}, {"name": "llama3:latest"}]}
EMPTY = {"models": []}


class TestParseOllamaTags(unittest.TestCase):
    def test_both_required_names_present_with_latest_suffix(self) -> None:
        names = names_from_tags_payload(BOTH_PRESENT)
        self.assertIn("nex-ai-protect", names)
        self.assertIn("nex-ai-reflex", names)
        self.assertEqual(missing_required_models(names), ())

    def test_missing_reflex(self) -> None:
        names = names_from_tags_payload(ONLY_PROTECT)
        self.assertEqual(missing_required_models(names), ("nex-ai-reflex",))

    def test_missing_protect(self) -> None:
        names = names_from_tags_payload(ONLY_REFLEX)
        self.assertEqual(missing_required_models(names), ("nex-ai-protect",))

    def test_hub_models_do_not_satisfy_gate(self) -> None:
        names = names_from_tags_payload(HUB_ONLY)
        self.assertEqual(
            missing_required_models(names),
            ("nex-ai-protect", "nex-ai-reflex"),
        )

    def test_empty_or_malformed_payload_is_fail_closed(self) -> None:
        self.assertEqual(
            missing_required_models(names_from_tags_payload(EMPTY)),
            ("nex-ai-protect", "nex-ai-reflex"),
        )
        self.assertEqual(
            missing_required_models(names_from_tags_payload(None)),
            ("nex-ai-protect", "nex-ai-reflex"),
        )
        self.assertEqual(
            missing_required_models(names_from_tags_payload({"models": "nope"})),
            ("nex-ai-protect", "nex-ai-reflex"),
        )

    def test_evaluate_success_and_failure_text(self) -> None:
        ok, text = evaluate_tags_payload(BOTH_PRESENT)
        self.assertTrue(ok)
        self.assertIn("nex-ai-protect", text)
        self.assertIn("nex-ai-reflex", text)

        ok, text = evaluate_tags_payload(ONLY_PROTECT)
        self.assertFalse(ok)
        self.assertIn("nex-ai-reflex", text)
        self.assertIn("Model AI tidak ada. Silakan pasang terlebih dahulu.", text)
        self.assertIn("nex_ai_q4_k_m.gguf", text)
        self.assertIn("nex-ai-models\\", text)
        self.assertIn("IMPORT-OLLAMA.bat", text)
        self.assertIn("NEX_AI_REQUIRED=0", text)
        self.assertNotIn("ollama pull qwen", MISSING_MESSAGE.split("Jangan")[0])


class TestCliRequireFlag(unittest.TestCase):
    def test_default_is_required(self) -> None:
        self.assertTrue(cli_requires_nex_ai({}))
        self.assertTrue(cli_requires_nex_ai({"NEX_AI_REQUIRED": ""}))
        self.assertTrue(cli_requires_nex_ai({"NEX_AI_REQUIRED": "1"}))

    def test_explicit_off_skips(self) -> None:
        self.assertFalse(cli_requires_nex_ai({"NEX_AI_REQUIRED": "0"}))
        self.assertFalse(cli_requires_nex_ai({"NEX_AI_REQUIRED": "false"}))
        code, text = run_check(payload=EMPTY, env={"NEX_AI_REQUIRED": "0"})
        self.assertEqual(code, 0)
        self.assertEqual(text, SKIP_MESSAGE)

    def test_run_check_fails_without_models_when_required(self) -> None:
        code, text = run_check(payload=HUB_ONLY, env={"NEX_AI_REQUIRED": "1"})
        self.assertEqual(code, 1)
        self.assertIn("Model AI tidak ada. Silakan pasang terlebih dahulu.", text)


if __name__ == "__main__":
    unittest.main()
