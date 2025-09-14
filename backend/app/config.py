"""Configuration module for environment variables.

Loads environment variables from a `.env` file if present and exposes
typed constants with reasonable defaults. Raises a clear error if the
OpenAI API key is missing at import time so the failure is early.
"""

from dotenv import load_dotenv
import os
from typing import Optional
from pathlib import Path

# Build a reliable path to the .env file, which is in the `backend` directory.
# This script is in `backend/app`, so we go up one level.
dotenv_path = Path(__file__).parent.parent / ".env"

if dotenv_path.exists():
    load_dotenv(dotenv_path=dotenv_path)
else:
    # This is a fallback for environments where .env might not be present,
    # but it will likely fail on the _require call if keys aren't set externally.
    load_dotenv()

def _require(name: str) -> str:
	value = os.getenv(name)
	if not value:
		raise RuntimeError(f"Required environment variable '{name}' is not set")
	return value

OPENROUTER_API_KEY: str = _require("OPENROUTER_API_KEY")
FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
DEFAULT_MODEL: str = os.getenv("DEFAULT_MODEL", "deepseek/deepseek-r1:free")
MAX_TOKENS: int = int(os.getenv("MAX_TOKENS", "1200"))

# Optional: temperature override if needed in future
TEMPERATURE: float = float(os.getenv("TEMPERATURE", "0.0"))

# OpenRouter specific settings
OPENROUTER_SITE_URL: str = os.getenv("OPENROUTER_SITE_URL", "http://localhost:3000")
OPENROUTER_SITE_NAME: str = os.getenv("OPENROUTER_SITE_NAME", "AI Log Explainer")
