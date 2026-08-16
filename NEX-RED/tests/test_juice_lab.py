"""Juice Shop gold-set mapping and probe interpretation (no Docker required)."""

import os
import sys
import unittest

package_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if package_root not in sys.path:
    sys.path.insert(0, package_root)

from agents.runtime.http import HttpEvidence
from agents.verify.posture import looks_like_identity, looks_like_sensitive_record, looks_like_session, looks_like_user_directory
from benchmarks.gold_set import JUICE_SHOP_GOLD_CLASSES, classes_from_labels, recall_ratio
from benchmarks.juice_lab import interpret_probe, run_juice_lab


class TestGoldSet(unittest.TestCase):
    def test_idor_maps_to_authorization(self):
        hits = classes_from_labels(cwe_id="CWE-639", check="cross_account_object_read")
        self.assertEqual(hits, {"authorization"})

    def test_unauthenticated_object_read_maps_to_authorization(self):
        hits = classes_from_labels(check="unauthenticated_object_read")
        self.assertEqual(hits, {"authorization"})

    def test_sql_maps_to_injection(self):
        hits = classes_from_labels(cwe_id="CWE-89")
        self.assertEqual(hits, {"injection"})

    def test_recall_ratio_is_honest(self):
        self.assertEqual(len(JUICE_SHOP_GOLD_CLASSES), 5)
        self.assertAlmostEqual(recall_ratio({"authorization"}), 0.2)
        self.assertAlmostEqual(recall_ratio({"authorization", "xss", "ssrf"}), 0.6)


class TestJuiceInterpretation(unittest.TestCase):
    def test_user_directory_json_is_authorization(self):
        body = '{"status":"success","data":[{"email":"demo@example.invalid"}]}'
        self.assertTrue(looks_like_user_directory(200, body))
        ev = HttpEvidence("GET", "http://127.0.0.1:3003/api/Users", 200, False, body=body)
        hit = interpret_probe("juice_user_directory", ev, "collection")
        self.assertTrue(hit["confirmed"])
        self.assertEqual(hit["gold_class"], "authorization")

    def test_html_home_is_not_a_user_directory(self):
        self.assertFalse(looks_like_user_directory(200, "<html>Juice Shop</html>"))

    def test_public_feedback_catalog_is_not_authorization(self):
        body = '{"status":"success","data":[{"UserId":1,"comment":"Nice shop","rating":5}]}'
        self.assertFalse(looks_like_sensitive_record(200, body))
        ev = HttpEvidence("GET", "http://127.0.0.1:3003/api/Feedbacks", 200, False, body=body)
        hit = interpret_probe("juice_feedbacks", ev, "collection")
        self.assertFalse(hit["confirmed"])
        self.assertEqual(hit["verdict"], "rejected")

    def test_denied_object_read_is_rejected_not_a_hit(self):
        ev = HttpEvidence("GET", "http://127.0.0.1:3003/api/Users/1", 401, False, body="Unauthorized")
        hit = interpret_probe("juice_user_object", ev, "record")
        self.assertFalse(hit["confirmed"])
        self.assertEqual(hit["verdict"], "rejected")

    def test_object_with_email_is_authorization(self):
        body = '{"status":"success","data":{"id":1,"email":"demo@example.invalid"}}'
        self.assertTrue(looks_like_sensitive_record(200, body))
        ev = HttpEvidence("GET", "http://127.0.0.1:3003/api/Users/1", 200, False, body=body)
        hit = interpret_probe("juice_user_object", ev, "record")
        self.assertTrue(hit["confirmed"])

    def test_empty_whoami_is_not_authentication(self):
        body = '{"user":{}}'
        self.assertFalse(looks_like_identity(200, body))
        ev = HttpEvidence("GET", "http://127.0.0.1:3003/rest/user/whoami", 200, False, body=body)
        hit = interpret_probe("juice_whoami", ev, "identity")
        self.assertFalse(hit["confirmed"])

    def test_failed_login_is_not_authentication_hit(self):
        body = '{"error":"Invalid email or password."}'
        ev = HttpEvidence("POST", "http://127.0.0.1:3003/rest/user/login", 401, False, body=body)
        hit = interpret_probe("juice_dummy_login", ev, "session")
        self.assertFalse(hit["confirmed"])
        self.assertFalse(looks_like_session(401, body))

    def test_unexpected_session_is_authentication_hit(self):
        body = '{"authentication":{"token":"lab-token","umail":"x"}}'
        self.assertTrue(looks_like_session(200, body))

    def test_benign_search_500_is_injection(self):
        ev = HttpEvidence("GET", "http://127.0.0.1:3003/rest/products/search?q=apple", 500, False, body="error")
        hit = interpret_probe("juice_product_search", ev, "no_500")
        self.assertTrue(hit["confirmed"])
        self.assertEqual(hit["gold_class"], "injection")

    def test_unreachable_loopback_is_not_parity(self):
        result = run_juice_lab("http://127.0.0.1:39999", wait=False)
        self.assertFalse(result["reachable"])
        self.assertEqual(result["live_recall"], 0.0)
        self.assertTrue(result["loopback_only"])

    def test_non_loopback_is_refused(self):
        result = run_juice_lab("http://192.168.137.1:3003", wait=False)
        self.assertFalse(result["reachable"])
        self.assertIn("loopback", result["note"].lower())


if __name__ == "__main__":
    unittest.main()
