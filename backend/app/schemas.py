from pydantic import BaseModel
from typing import Optional, Any


class LogRequest(BaseModel):
	"""Incoming request with raw log text and optional context string."""

	raw_log: str
	context: Optional[str] = None


class ExplainerResponse(BaseModel):
	"""Response containing raw LLM text output and optionally parsed JSON."""

	raw_llm: str
	parsed: Optional[Any] = None
