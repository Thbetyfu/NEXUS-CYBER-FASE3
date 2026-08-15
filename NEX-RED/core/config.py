"""
NEX-RED Configuration Module
Central settings for target orchestration, gateway communication, and execution environments.
"""

import os
from pathlib import Path
from pydantic import BaseModel, Field


_PACKAGE_ROOT = Path(__file__).resolve().parent.parent


class NexRedConfig(BaseModel):
    gateway_url: str = Field(default_factory=lambda: os.getenv("NEXUS_GATEWAY_URL", "http://127.0.0.1:8080"))
    dashboard_url: str = Field(default_factory=lambda: os.getenv("NEXUS_DASHBOARD_URL", "http://127.0.0.1:3000"))
    bridge_port: int = Field(default_factory=lambda: int(os.getenv("NEX_RED_BRIDGE_PORT", "3004")))
    bridge_host: str = Field(default_factory=lambda: os.getenv("NEX_RED_BRIDGE_HOST", "127.0.0.1"))

    reports_dir: str = Field(
        default_factory=lambda: os.getenv("NEX_RED_REPORTS_DIR", str(_PACKAGE_ROOT / "reports"))
    )
    workspaces_dir: str = Field(
        default_factory=lambda: os.getenv("NEX_RED_WORKSPACES_DIR", str(_PACKAGE_ROOT / "workspaces"))
    )

    max_concurrent_agents: int = 5
    default_timeout: int = 60
    max_file_bytes: int = 524288
    max_files: int = 2500
    user_agent: str = Field(
        default_factory=lambda: os.getenv("NEX_RED_USER_AGENT", "NEX-RED/5.0 (Nexus Cyber Security Validation)")
    )

    ai_provider: str = Field(default_factory=lambda: os.getenv("NEX_AI_PROVIDER", "ollama"))
    ai_base_url: str = Field(default_factory=lambda: os.getenv("NEX_AI_BASE_URL", "http://127.0.0.1:11434"))
    ai_endpoint: str = Field(default_factory=lambda: os.getenv("NEX_AI_ENDPOINT", "http://127.0.0.1:11434/api/chat"))
    ai_api_key: str = Field(default_factory=lambda: os.getenv("NEX_AI_API_KEY", ""))
    ai_model_name: str = Field(
        default_factory=lambda: os.getenv("NEX_AI_MODEL_REASONING", os.getenv("NEX_AI_REASONING_MODEL", "nex-ai-protect"))
    )
    llm_timeout_seconds: int = Field(default_factory=lambda: int(os.getenv("NEX_RED_LLM_TIMEOUT", "20")))
    max_llm_reviews: int = Field(default_factory=lambda: int(os.getenv("NEX_RED_MAX_LLM_REVIEWS", "15")))
    live_target: str = Field(default_factory=lambda: os.getenv("NEX_RED_LIVE_TARGET", "http://127.0.0.1"))
    max_live_steps: int = Field(default_factory=lambda: int(os.getenv("NEX_RED_MAX_LIVE_STEPS", "20")))
    idor_owner_token: str = Field(default_factory=lambda: os.getenv("NEX_RED_IDOR_OWNER_TOKEN", ""))
    idor_peer_token: str = Field(default_factory=lambda: os.getenv("NEX_RED_IDOR_PEER_TOKEN", ""))
    idor_object_path: str = Field(default_factory=lambda: os.getenv("NEX_RED_IDOR_OBJECT_PATH", ""))
    enable_browser: bool = Field(
        default_factory=lambda: os.getenv("NEX_RED_BROWSER", "0").strip() in {"1", "true", "yes"}
    )


config = NexRedConfig()
