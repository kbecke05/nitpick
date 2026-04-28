import json
import os

import anthropic

from .prompts import SYSTEM_PROMPT, build_messages

MODEL = "claude-sonnet-4-6"
MAX_TOKENS = 2048


class ReviewError(Exception):
    pass


def review_code(code: str, mode: str) -> dict:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise ReviewError(
            "ANTHROPIC_API_KEY environment variable is not set.\n"
            "Export it with: export ANTHROPIC_API_KEY=your-key-here"
        )

    client = anthropic.Anthropic(api_key=api_key)

    try:
        response = client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            # Cache the system prompt — it never changes between calls,
            # so the API can reuse it and charge ~10% of normal token cost.
            system=[{"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}],
            messages=build_messages(code, mode),
        )
    except anthropic.AuthenticationError:
        raise ReviewError("Invalid API key. Check your ANTHROPIC_API_KEY.")
    except anthropic.RateLimitError:
        raise ReviewError("Rate limit hit. Wait a moment and try again.")
    except anthropic.APIError as e:
        raise ReviewError(f"Claude API returned an error: {e}")

    raw = response.content[0].text.strip()

    # Claude occasionally wraps the response in markdown fences despite instructions.
    # Strip them silently so the caller never sees this as an error.
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[-1]
        if raw.endswith("```"):
            raw = raw[: raw.rfind("```")]
        raw = raw.strip()

    try:
        review = json.loads(raw)
    except json.JSONDecodeError:
        raise ReviewError(f"Claude returned invalid JSON. Raw response:\n\n{raw}")

    return review
