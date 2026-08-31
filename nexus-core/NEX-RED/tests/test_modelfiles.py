"""Protect and reflex Ollama Modelfiles stay specialized (same GGUF, different prompts)."""

import os
import unittest
from pathlib import Path

_ROOT = Path(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
_MODELS = _ROOT / "nex-ai-models"


class TestNexAiModelfiles(unittest.TestCase):
    def test_protect_does_not_cut_json_on_brace(self):
        text = (_MODELS / "Modelfile.protect").read_text(encoding="utf-8")
        self.assertIn("FROM ./nex_ai_q4_k_m.gguf", text)
        self.assertNotIn('stop "}\\n"', text)
        self.assertIn("num_predict 1024", text)
        self.assertIn("NEX-AI Protect", text)

    def test_reflex_keeps_http_classifier_contract(self):
        text = (_MODELS / "Modelfile.production").read_text(encoding="utf-8")
        self.assertIn("FROM ./nex_ai_q4_k_m.gguf", text)
        self.assertIn("SQL_INJECTION", text)
        self.assertIn("BENIGN", text)


if __name__ == "__main__":
    unittest.main()
