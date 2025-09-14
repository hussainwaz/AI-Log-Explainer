# Backend (AI Log Explainer)

FastAPI service that accepts raw application or system logs and uses an LLM (OpenAI ChatCompletion) to produce a structured explanation.

## Features
- `/health` endpoint for liveness
- `/explain` endpoint accepting JSON body `{ "raw_log": "...", "context": "optional" }`
- Extracts JSON structure from model response if returned in text
- Simple prompt engineering encapsulated in `app/prompts.py`

## Requirements
Set environment variables (or use `.env` file):
```
OPENAI_API_KEY=sk-...
FRONTEND_URL=http://localhost:3000
DEFAULT_MODEL=gpt-3.5-turbo  # optional override
MAX_TOKENS=1200              # optional override
TEMPERATURE=0.0              # optional override
```

## Install & Run (Windows PowerShell)
```powershell
# From repo root (ensures venv already created) or create one:
python -m venv .venv
& .venv/Scripts/Activate.ps1
pip install -r backend/requirements.txt

# Run development server
uvicorn app.main:app --reload --app-dir backend/app --port 8000
# or because we export app in __init__.py you can also:
uvicorn app:app --reload --app-dir backend/app --port 8000
```

Then open http://127.0.0.1:8000/docs for interactive Swagger UI.

## Testing
```powershell
& .venv/Scripts/Activate.ps1
pytest backend/test_smoke.py -q
```

## Project Structure
```
backend/
  app/
    __init__.py
    main.py
    config.py
    prompts.py
    schemas.py
    utils.py
  test_smoke.py
  requirements.txt
  .env (not committed normally)
```

## Notes
- Currently pinned to OpenAI Python SDK <1.0.0 for stability; upgrade path would involve migrating to the new client API.
- `extract_json_from_text` performs a simple balanced-brace scan; for more complex outputs consider a streaming parser or a JSON schema constrained model.
- Ensure you never commit a real API key. Replace placeholders in deployment via environment.
