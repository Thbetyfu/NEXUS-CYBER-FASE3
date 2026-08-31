"""Optional Docker sandbox. Missing Docker is not a scan crash."""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path
from typing import List, Optional

_SANDBOX_DIR = Path(__file__).resolve().parent
_COMPOSE = _SANDBOX_DIR / "docker-compose.yml"


def compose_file() -> Path:
    return _COMPOSE


def docker_available() -> bool:
    return shutil.which("docker") is not None


def compose_command(extra: Optional[List[str]] = None) -> List[str]:
    cmd = ["docker", "compose", "-f", str(_COMPOSE), "run", "--rm", "nexred"]
    if extra:
        cmd.extend(extra)
    return cmd


def run_sandbox(extra: Optional[List[str]] = None) -> int:
    """Run NEX-RED in the non-root image. Returns 3 if Docker is missing."""
    if not docker_available():
        return 3
    completed = subprocess.run(compose_command(extra), check=False)
    return int(completed.returncode)
