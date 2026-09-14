from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from app.schemas import LogRequest, ExplainerResponse, Usage
from app.prompts import EXPLAINER_SYSTEM_PROMPT, build_log_prompt
from app.utils import extract_json_from_text
from app import config
from openai import OpenAI
from typing import Any, Dict, AsyncGenerator, Optional
import json

app = FastAPI(title="AI Log Explainer")

# FRONTEND_URL plus localhost on any port. A fixed pair of ports meant a dev
# server started anywhere else had every request blocked by CORS, and the UI
# could only report that the backend was unreachable.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[config.FRONTEND_URL, "http://localhost:3000"],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(
    api_key=config.OPENROUTER_API_KEY,
    base_url="https://openrouter.ai/api/v1",
)

_EXTRA_HEADERS = {
    "HTTP-Referer": config.OPENROUTER_SITE_URL,
    "X-Title": config.OPENROUTER_SITE_NAME,
}


def _usage_from(raw_usage: Any, model: str) -> Optional[Usage]:
    """Pull OpenRouter's usage block into our own shape.

    OpenRouter attaches this to every response without being asked, so the
    cost here is what was actually charged, not a price-table estimate.
    """
    if raw_usage is None:
        return Usage(model=model)
    get = raw_usage.get if isinstance(raw_usage, dict) else lambda k, d=None: getattr(raw_usage, k, d)
    details = get("completion_tokens_details") or {}
    if not isinstance(details, dict):
        details = getattr(details, "__dict__", {}) or {}
    return Usage(
        model=model,
        prompt_tokens=get("prompt_tokens"),
        completion_tokens=get("completion_tokens"),
        reasoning_tokens=details.get("reasoning_tokens"),
        total_tokens=get("total_tokens"),
        cost=get("cost"),
    )


def _first_message(completion: Any) -> str:
    """The assistant's text, or a clear error if the provider sent none.

    A free or overloaded provider can return a 200 whose `choices` is null.
    Indexing that raises "NoneType object is not subscriptable", which tells
    nobody anything; the provider's own error field usually says why.
    """
    choices = getattr(completion, "choices", None)
    if not choices:
        detail = getattr(completion, "error", None)
        raise RuntimeError(
            f"provider returned no choices: {detail}" if detail
            else "provider returned no choices (it may be rate limited)"
        )
    return (choices[0].message.content or "").strip()


def _resolve(req: LogRequest) -> str:
    if not req.raw_log or not req.raw_log.strip():
        raise HTTPException(status_code=400, detail="raw_log cannot be empty")
    try:
        return config.resolve_model(req.model)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.get("/health")
async def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/models")
async def models() -> Dict[str, Any]:
    """The models the UI may choose between, and which one is the default."""
    return {"models": config.MODEL_CHOICES, "default": config.DEFAULT_MODEL}


@app.post("/explain", response_model=ExplainerResponse)
async def explain_log(req: LogRequest) -> ExplainerResponse:
    """Explain a raw log snippet, returning parsed JSON where recoverable."""
    model = _resolve(req)

    try:
        completion = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": EXPLAINER_SYSTEM_PROMPT},
                {"role": "user", "content": build_log_prompt(req.raw_log, req.context)},
            ],
            max_tokens=config.MAX_TOKENS,
            temperature=config.TEMPERATURE,
            extra_headers=_EXTRA_HEADERS,
        )
        text = _first_message(completion)
        usage = _usage_from(getattr(completion, "usage", None), model)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"API request error: {e}") from e

    return ExplainerResponse(raw_llm=text, parsed=extract_json_from_text(text), usage=usage)


def _sse_event(event: str, data: Dict[str, Any]) -> str:
    return f"event: {event}\n" + f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


@app.post("/explain/stream")
async def explain_log_stream(req: LogRequest) -> StreamingResponse:
    """Stream the answer as SSE: status, chunk, then a final payload."""
    model = _resolve(req)

    async def event_generator() -> AsyncGenerator[bytes, None]:
        full_text = ""
        usage: Optional[Usage] = None
        yield _sse_event("status", {"step": 1, "message": "Starting analysis"}).encode("utf-8")
        try:
            completion = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": EXPLAINER_SYSTEM_PROMPT},
                    {"role": "user", "content": build_log_prompt(req.raw_log, req.context)},
                ],
                max_tokens=config.MAX_TOKENS,
                temperature=config.TEMPERATURE,
                stream=True,
                # Without this, a streamed response carries no usage block and
                # the cost line would be empty for every streamed run.
                stream_options={"include_usage": True},
                extra_headers=_EXTRA_HEADERS,
            )

            yield _sse_event("status", {"step": 2, "message": "Generating explanation"}).encode("utf-8")

            for chunk in completion:
                # The usage block rides on the last message, which has no choices.
                chunk_usage = getattr(chunk, "usage", None)
                if chunk_usage is not None:
                    usage = _usage_from(chunk_usage, model)
                # A chunk can legitimately carry no choices: the usage-only
                # final frame is one, and an overloaded provider sends null.
                choices = getattr(chunk, "choices", None)
                content = ""
                if choices:
                    content = getattr(choices[0].delta, "content", None) or ""
                if content:
                    full_text += content
                    yield _sse_event("chunk", {"content": content}).encode("utf-8")

            yield _sse_event("status", {"step": 3, "message": "Parsing structured output"}).encode("utf-8")

            yield _sse_event("final", {
                "raw_llm": full_text,
                "parsed": extract_json_from_text(full_text),
                "usage": usage.model_dump() if usage else None,
            }).encode("utf-8")
        except Exception as e:
            yield _sse_event("error", {"message": f"API request error: {e}"}).encode("utf-8")

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )
