"""
NEX-RED unit tests — AST detection, evidence gate, honest scenario metrics.
"""

import os
import sys
import tempfile
import unittest

package_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if package_root not in sys.path:
    sys.path.insert(0, package_root)

from agents.reporting.report_generator import ReportGenerator
from agents.whitebox.code_analyzer import WhiteboxCodeAnalyzer
from core.orchestrator import NexRedOrchestrator
from core.types import ScanMode, ScanTarget


class TestPythonAstAnalyzer(unittest.TestCase):
    def test_detects_dynamic_sql_and_hardcoded_secret(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "app.py")
            with open(path, "w", encoding="utf-8") as handle:
                handle.write(
                    "def login(user):\n"
                    "    q = \"SELECT * FROM users WHERE name = '%s'\" % user\n"
                    "    cursor.execute(q)\n"
                    "\n"
                    "api_key = \"NexusLiveSecretKey99\"\n"
                )
            findings = WhiteboxCodeAnalyzer(tmp).analyze()
            titles = {item.title for item in findings}
            self.assertTrue(any("SQL" in title for title in titles), titles)
            self.assertTrue(any("Hardcoded" in title for title in titles), titles)

    def test_parameterized_sql_is_not_flagged(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "safe.py")
            with open(path, "w", encoding="utf-8") as handle:
                handle.write(
                    "def login(user):\n"
                    "    cursor.execute(\"SELECT * FROM users WHERE name = %s\", (user,))\n"
                )
            findings = WhiteboxCodeAnalyzer(tmp).analyze()
            self.assertEqual(findings, [])

    def test_detects_jwt_idor_and_missing_auth(self):
        with tempfile.TemporaryDirectory() as tmp:
            jwt_path = os.path.join(tmp, "tokens.py")
            with open(jwt_path, "w", encoding="utf-8") as handle:
                handle.write(
                    "import jwt\n"
                    "def identity(token):\n"
                    "    return jwt.decode(token, verify=False)\n"
                )
            idor_path = os.path.join(tmp, "orders.py")
            with open(idor_path, "w", encoding="utf-8") as handle:
                handle.write(
                    "def show_order():\n"
                    "    order_id = request.args.get(\"id\")\n"
                    "    return Order.objects.get(id=order_id)\n"
                )
            auth_path = os.path.join(tmp, "admin.py")
            with open(auth_path, "w", encoding="utf-8") as handle:
                handle.write(
                    "@app.route(\"/users/<uid>\", methods=[\"DELETE\"])\n"
                    "def delete_user(uid):\n"
                    "    User.objects.filter(id=uid).delete()\n"
                )
            findings = WhiteboxCodeAnalyzer(tmp).analyze()
            cwes = {item.cwe_id for item in findings}
            self.assertIn("CWE-347", cwes, findings)
            self.assertIn("CWE-639", cwes, findings)
            self.assertIn("CWE-306", cwes, findings)

    def test_safe_jwt_and_owned_lookup_are_clean(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "safe_access.py")
            with open(path, "w", encoding="utf-8") as handle:
                handle.write(
                    "import jwt, os\n"
                    "def identity(token):\n"
                    "    return jwt.decode(token, key=os.getenv(\"JWT_SECRET\"), algorithms=[\"HS256\"])\n"
                    "\n"
                    "def show_order():\n"
                    "    order_id = request.args.get(\"id\")\n"
                    "    return Order.objects.get(id=order_id, owner_id=current_user.id)\n"
                    "\n"
                    "@app.route(\"/users/<uid>\", methods=[\"DELETE\"])\n"
                    "@login_required\n"
                    "def delete_user(uid):\n"
                    "    User.objects.filter(id=uid).delete()\n"
                )
            findings = WhiteboxCodeAnalyzer(tmp).analyze()
            self.assertEqual(findings, [])


class TestOrchestratorHonesty(unittest.TestCase):
    def test_scenario_mode_does_not_invent_64000_attacks(self):
        target = ScanTarget(
            target_url="http://127.0.0.1:9",
            mode=ScanMode.SCENARIO,
            enable_llm=False,
        )
        result = NexRedOrchestrator(target).execute()
        self.assertEqual(result.status, "COMPLETED")
        self.assertLess(result.total_attacks_attempted, 100)
        markdown = ReportGenerator.generate_markdown_report(result)
        self.assertIn(result.scan_id, markdown)
        self.assertNotIn("100% integrity", markdown.lower())

    def test_whitebox_scan_on_temp_repo(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "vuln.py")
            with open(path, "w", encoding="utf-8") as handle:
                handle.write("eval(user_input)\n")
            target = ScanTarget(
                target_url="http://127.0.0.1:9",
                repo_path=tmp,
                mode=ScanMode.WHITEBOX,
                enable_llm=False,
            )
            result = NexRedOrchestrator(target).execute()
            self.assertGreaterEqual(result.files_analyzed, 1)
            self.assertGreaterEqual(result.vulnerabilities_found, 1)


if __name__ == "__main__":
    unittest.main()
