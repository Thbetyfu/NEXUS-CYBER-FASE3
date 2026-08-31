"""Sandbox image contract and HTTP allow-list (no Docker required)."""

import os
import sys
import unittest
from pathlib import Path

package_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if package_root not in sys.path:
    sys.path.insert(0, package_root)

from sandbox.policy import is_url_allowed
from sandbox.runner import compose_command, compose_file, docker_available


class TestSandboxFiles(unittest.TestCase):
    def test_dockerfile_is_non_root(self):
        text = (Path(package_root) / "sandbox" / "Dockerfile").read_text(encoding="utf-8")
        self.assertIn("USER nexred", text)
        self.assertIn("10001", text)
        self.assertNotIn("USER root", text.split("USER nexred", 1)[-1])

    def test_compose_drops_caps_and_skips_docker_socket(self):
        text = compose_file().read_text(encoding="utf-8")
        self.assertIn("cap_drop", text)
        self.assertIn("no-new-privileges", text)
        self.assertIn('user: "10001:10001"', text)
        self.assertNotIn("docker.sock", text)

    def test_compose_command_targets_nexred_service(self):
        cmd = compose_command(["python", "nexred.py", "--help"])
        self.assertEqual(cmd[0], "docker")
        self.assertIn("nexred", cmd)

    def test_docker_available_is_boolean(self):
        self.assertIsInstance(docker_available(), bool)


class TestSandboxPolicy(unittest.TestCase):
    def test_metadata_blocked(self):
        self.assertFalse(is_url_allowed("http://169.254.169.254/latest", "http://127.0.0.1:8080"))

    def test_unrelated_internet_host_blocked(self):
        self.assertFalse(is_url_allowed("https://example.com/", "http://127.0.0.1:8080"))

    def test_lab_loopback_allowed(self):
        self.assertTrue(is_url_allowed("http://127.0.0.1:3003/", "http://127.0.0.1:3003"))


class TestLabOriginPolicy(unittest.TestCase):
    def test_only_lab_http_origins(self):
        from sandbox.policy import is_lab_origin_url, resolve_lab_origin

        self.assertTrue(is_lab_origin_url("http://192.168.137.1:3002"))
        self.assertIsNone(resolve_lab_origin("https://portfolio-website-three-ruddy-65.vercel.app"))
