"""Configuration: environment variables, and the set of models the UI may pick.

Loads a `.env` from the `backend` directory if present, then exposes typed
constants. A missing API key raises at import time, so the failure is early
and obvious rather than a 500 on the first request.
"""

from dotenv import load_dotenv
import os
from pathlib import Path
from typing import Dict, FrozenSet, List, Optional

# This file is backend/app/config.py, so the .env sits one level up.
dotenv_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=dotenv_path if dotenv_path.exists() else None)


def _require(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Required environment variable '{name}' is not set")
    return value


OPENROUTER_API_KEY: str = _require("OPENROUTER_API_KEY")
FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Mistral Nemo, not a free model. The three `:free` slugs this project used to
# default to were all withdrawn from OpenRouter, and a dead default means a
# fresh clone 404s on its first request. Nemo is about $0.00003 a run, so a
# thousand analyses cost roughly seven cents, and it does not get rate limited
# out from under you the way the free tier does.
DEFAULT_MODEL: str = os.getenv("DEFAULT_MODEL", "mistralai/mistral-nemo")

# Reasoning models spend part of this budget thinking before they emit a token
# of answer, and that spend counts here. At the old 1200 a reasoning model
# could exhaust the budget mid-thought and return truncated JSON, which read
# as "the app is broken". 4000 leaves room for the reasoning and the answer.
MAX_TOKENS: int = int(os.getenv("MAX_TOKENS", "4000"))
TEMPERATURE: float = float(os.getenv("TEMPERATURE", "0.0"))

OPENROUTER_SITE_URL: str = os.getenv("OPENROUTER_SITE_URL", "http://localhost:3000")
OPENROUTER_SITE_NAME: str = os.getenv("OPENROUTER_SITE_NAME", "AI Log Explainer")

# The models the picker offers. The request body carries one of these ids and
# nothing else: without an allowlist the endpoint is an open proxy to any
# model on the key's credit. `tier` is what the UI badges each option with.
MODEL_CHOICES: List[Dict[str, str]] = [
    {"id": "nvidia/nemotron-3-super-120b-a12b:free", "label": "Nemotron 3 Super",  "tier": "free"},
    {"id": "nvidia/nemotron-3.5-lightning:free",     "label": "Nemotron Lightning", "tier": "free"},
    {"id": "mistralai/mistral-nemo",                 "label": "Mistral Nemo",       "tier": "cheap"},
    {"id": "qwen/qwen3-30b-a3b-instruct-2507",       "label": "Qwen3 30B",          "tier": "cheap"},
    {"id": "google/gemini-2.5-flash-lite",           "label": "Gemini 2.5 Flash Lite", "tier": "cheap"},
    {"id": "openai/gpt-4o-mini",                     "label": "GPT-4o mini",        "tier": "mid"},
    {"id": "deepseek/deepseek-chat-v3.1",            "label": "DeepSeek V3.1",      "tier": "mid"},
    {"id": "google/gemini-2.5-flash",                "label": "Gemini 2.5 Flash",   "tier": "mid"},
    {"id": "openai/gpt-5-mini",                      "label": "GPT-5 mini",         "tier": "mid"},
    {"id": "anthropic/claude-haiku-4.5",             "label": "Claude Haiku 4.5",   "tier": "strong"},
    {"id": "anthropic/claude-sonnet-5",              "label": "Claude Sonnet 5",    "tier": "strong"},
    {"id": "openai/gpt-5.1",                         "label": "GPT-5.1",            "tier": "strong"},
]

ALLOWED_MODELS: FrozenSet[str] = frozenset(m["id"] for m in MODEL_CHOICES) | {DEFAULT_MODEL}


def resolve_model(requested: Optional[str]) -> str:
    """Return a model id that is safe to bill against this key."""
    if not requested:
        return DEFAULT_MODEL
    if requested not in ALLOWED_MODELS:
        raise ValueError(f"Model '{requested}' is not in the allowed list")
    return requested
