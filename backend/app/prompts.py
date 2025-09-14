from typing import Optional

EXPLAINER_SYSTEM_PROMPT = (
	"You are a helpful debugging assistant. Given raw system or application logs, "
	"identify the probable root cause, summarize the error in one sentence, provide "
	"a step-by-step reproduction checklist (if possible), list probable fixes (ranked), "
	"assign a severity (low/medium/high/critical), and suggest tests to validate the fix. "
	"Output must be valid JSON with keys: summary, root_cause, probable_fixes (list), severity, "
	"reproduction_steps (list), follow_up_tests (list), confidence_score (0-100), and notes."
)


def build_log_prompt(log_text: str, context: Optional[str] = None) -> str:
	"""Construct the user prompt given log text and optional context."""
	user_content = f"""
Logs:
```
{log_text}
```
"""
	if context:
		user_content += f"\nContext: {context}\n"
	user_content += (
		"\nReturn only JSON. If you cannot determine root cause, be honest and say 'unknown'. "
		"Keep explanations concise."
	)
	return user_content