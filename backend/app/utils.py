import json
from typing import Any, Optional


def extract_json_from_text(text: str) -> Optional[Any]:
	"""Attempt to extract the first valid JSON object from free-form text.

	Scans for a balanced JSON object starting from the first '{'. If parsing
	fails it continues searching until text end.
	"""
	start = text.find("{")
	if start == -1:
		return None

	stack = []
	for i in range(start, len(text)):
		ch = text[i]
		if ch == "{":
			stack.append("{")
		elif ch == "}":
			if stack:
				stack.pop()
			if not stack:
				candidate = text[start : i + 1]
				try:
					return json.loads(candidate)
				except json.JSONDecodeError:
					# Continue searching in case of nested braces beyond this point
					continue
	return None