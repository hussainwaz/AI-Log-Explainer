from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.schemas import LogRequest, ExplainerResponse
from app.prompts import EXPLAINER_SYSTEM_PROMPT, build_log_prompt
from app.utils import extract_json_from_text
from app import config
from openai import OpenAI
from typing import Any, Dict

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

