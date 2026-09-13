from pydantic import BaseModel, Field
from typing import Optional, Any


class LogRequest(BaseModel):
    """Incoming request: raw log text, optional context, optional model choice."""

    raw_log: str
    context: Optional[str] = None
    model: Optional[str] = Field(
        default=None,
        description="One of the ids from /models. Falls back to the server default.",
    )


class Usage(BaseModel):
    """What the call actually cost, as reported by OpenRouter.

    `cost` is in USD and comes back on every response, so this is the real
    charge rather than an estimate from a price table. `reasoning_tokens` is
    the part of the completion the model spent thinking, which is billed at
    the completion rate but never appears in the answer.
    """

    model: str
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    reasoning_tokens: Optional[int] = None
    total_tokens: Optional[int] = None
    cost: Optional[float] = None


class ExplainerResponse(BaseModel):
    """Raw LLM text, the parsed JSON when it could be recovered, and the bill."""

    raw_llm: str
    parsed: Optional[Any] = None
    usage: Optional[Usage] = None
