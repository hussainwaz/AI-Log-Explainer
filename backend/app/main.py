from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from app.schemas import LogRequest, ExplainerResponse
from app.prompts import EXPLAINER_SYSTEM_PROMPT, build_log_prompt
from app.utils import extract_json_from_text
from app import config
from openai import OpenAI
from typing import Any, Dict, AsyncGenerator
import json

app = FastAPI(title="AI Log Explainer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[config.FRONTEND_URL, "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI client with OpenRouter configuration
client = OpenAI(
    api_key=config.OPENROUTER_API_KEY,
    base_url="https://openrouter.ai/api/v1",
)


@app.get("/health")
async def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/explain", response_model=ExplainerResponse)
async def explain_log(req: LogRequest) -> ExplainerResponse:
    """Explain a raw log snippet using an LLM and return parsed JSON if possible."""
    print("Incoming request:", req)
    if not req.raw_log or not req.raw_log.strip():
        raise HTTPException(status_code=400, detail="raw_log cannot be empty")

    system_prompt = EXPLAINER_SYSTEM_PROMPT
    user_prompt = build_log_prompt(req.raw_log, req.context)

    try:
        completion = client.chat.completions.create(
            model=config.DEFAULT_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=config.MAX_TOKENS,
            temperature=config.TEMPERATURE,
            extra_headers={
                "HTTP-Referer": config.OPENROUTER_SITE_URL,
                "X-Title": config.OPENROUTER_SITE_NAME,
            }
        )
        
        text = completion.choices[0].message.content.strip()
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"API request error: {e}") from e

    parsed = extract_json_from_text(text)
    return ExplainerResponse(raw_llm=text, parsed=parsed)


def _sse_event(event: str, data: Dict[str, Any]) -> str:
    """Format a server-sent event line."""
    return f"event: {event}\n" + f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


@app.post("/explain/stream")
async def explain_log_stream(req: LogRequest) -> StreamingResponse:
    """Stream LLM response as SSE events (chunk + final)."""
    if not req.raw_log or not req.raw_log.strip():
        raise HTTPException(status_code=400, detail="raw_log cannot be empty")

    system_prompt = EXPLAINER_SYSTEM_PROMPT
    user_prompt = build_log_prompt(req.raw_log, req.context)

    async def event_generator() -> AsyncGenerator[bytes, None]:
        full_text = ""
        # initial status
        yield _sse_event("status", {"step": 1, "message": "Starting analysis"}).encode("utf-8")
        try:
            completion = client.chat.completions.create(
                model=config.DEFAULT_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                max_tokens=config.MAX_TOKENS,
                temperature=config.TEMPERATURE,
                stream=True,
                extra_headers={
                    "HTTP-Referer": config.OPENROUTER_SITE_URL,
                    "X-Title": config.OPENROUTER_SITE_NAME,
                }
            )

            # Notify generating step
            yield _sse_event("status", {"step": 2, "message": "Generating explanation"}).encode("utf-8")

            for chunk in completion:
                try:
                    delta = chunk.choices[0].delta
                    content = getattr(delta, "content", None) or ""
                except Exception:
                    content = ""
                if content:
                    full_text += content
                    yield _sse_event("chunk", {"content": content}).encode("utf-8")

            # Parsing step
            yield _sse_event("status", {"step": 3, "message": "Parsing structured output"}).encode("utf-8")
            parsed = extract_json_from_text(full_text)

            # Final payload
            final_payload = {"raw_llm": full_text, "parsed": parsed}
            yield _sse_event("final", final_payload).encode("utf-8")
        except Exception as e:
            # Emit error event
            yield _sse_event("error", {"message": f"API request error: {e}"}).encode("utf-8")

    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    }
    return StreamingResponse(event_generator(), media_type="text/event-stream", headers=headers)

