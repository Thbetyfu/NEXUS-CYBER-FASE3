"""Live LLM eval is optional — skip when Ollama is down."""

import os
import sys
import unittest

package_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if package_root not in sys.path:
    sys.path.insert(0, package_root)

from core.llm_client import LlmClient, _extract_json
from core.nex_ai import REASONING_MODEL, canonical_reasoning_model


class TestNexAiOnly(unittest.TestCase):
    def test_qwen_and_llama_are_rejected(self):
        self.assertEqual(canonical_reasoning_model("qwen2.5:7b-instruct"), REASONING_MODEL)
        self.assertEqual(canonical_reasoning_model("llama3:latest"), REASONING_MODEL)
        self.assertEqual(canonical_reasoning_model("nex-ai-protect"), REASONING_MODEL)

    def test_available_is_boolean(self):
        self.assertIsInstance(LlmClient().available(), bool)

    def test_json_keys_with_spaces_are_normalized(self):
        parsed = _extract_json('{" endpoint": "/users/1", "check": "unauthenticated_mutating_route"}')
        self.assertEqual(parsed["endpoint"], "/users/1")
        self.assertEqual(parsed["check"], "unauthenticated_mutating_route")

    def test_live_eval_skips_foreign_models(self):
        from benchmarks.llm_eval import run_llm_eval

        if not LlmClient().available():
            self.skipTest("LLM endpoint not reachable")
        payload = run_llm_eval()
        self.assertIn(payload["verdict"], {"pass", "fail", "invalid_json", "missing_model"})
        self.assertTrue(payload["reachable"])
        self.assertEqual(payload["model"]["chosen"], REASONING_MODEL)
        if payload["verdict"] != "missing_model":
            self.assertTrue(payload["model"].get("present"))


if __name__ == "__main__":
    unittest.main()
