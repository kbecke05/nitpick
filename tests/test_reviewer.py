import json
import os

import anthropic
import pytest

from cli.reviewer import ReviewError, review_code


def _make_response(text: str):
    """Build a minimal mock Anthropic response object."""
    mock_content = type("Content", (), {"text": text})()
    return type("Response", (), {"content": [mock_content]})()


# ---------------------------------------------------------------------------
# Happy path
# ---------------------------------------------------------------------------

def test_review_code_returns_parsed_json(mocker):
    payload = {"summary": "ok", "bugs": [], "style_issues": [], "suggestions": [], "score": 9}
    mocker.patch("cli.reviewer.anthropic.Anthropic").return_value.messages.create.return_value = (
        _make_response(json.dumps(payload))
    )
    mocker.patch.dict(os.environ, {"ANTHROPIC_API_KEY": "test-key"})

    result = review_code("print('hi')", "file")
    assert result == payload


def test_review_code_strips_markdown_fences(mocker):
    # Claude occasionally wraps its JSON in ```json ... ``` despite instructions.
    # The reviewer must strip this silently.
    payload = {"summary": "ok", "bugs": [], "style_issues": [], "suggestions": [], "score": 7}
    fenced = f"```json\n{json.dumps(payload)}\n```"
    mocker.patch("cli.reviewer.anthropic.Anthropic").return_value.messages.create.return_value = (
        _make_response(fenced)
    )
    mocker.patch.dict(os.environ, {"ANTHROPIC_API_KEY": "test-key"})

    result = review_code("x = 1", "file")
    assert result == payload


def test_review_code_strips_plain_fences(mocker):
    # Also handle ``` without a language tag
    payload = {"summary": "ok", "bugs": [], "style_issues": [], "suggestions": [], "score": 5}
    fenced = f"```\n{json.dumps(payload)}\n```"
    mocker.patch("cli.reviewer.anthropic.Anthropic").return_value.messages.create.return_value = (
        _make_response(fenced)
    )
    mocker.patch.dict(os.environ, {"ANTHROPIC_API_KEY": "test-key"})

    result = review_code("x = 1", "diff")
    assert result == payload


# ---------------------------------------------------------------------------
# Missing API key
# ---------------------------------------------------------------------------

def test_review_code_raises_on_missing_api_key(mocker):
    # Ensure ANTHROPIC_API_KEY is absent from the environment.
    env = {k: v for k, v in os.environ.items() if k != "ANTHROPIC_API_KEY"}
    mocker.patch.dict(os.environ, env, clear=True)

    with pytest.raises(ReviewError, match="ANTHROPIC_API_KEY"):
        review_code("x = 1", "file")


# ---------------------------------------------------------------------------
# Anthropic SDK exceptions → ReviewError
# ---------------------------------------------------------------------------

def test_review_code_wraps_auth_error(mocker):
    mock_client = mocker.patch("cli.reviewer.anthropic.Anthropic").return_value
    mock_client.messages.create.side_effect = anthropic.AuthenticationError(
        message="bad key", response=mocker.Mock(status_code=401), body={}
    )
    mocker.patch.dict(os.environ, {"ANTHROPIC_API_KEY": "bad-key"})

    with pytest.raises(ReviewError, match="Invalid API key"):
        review_code("x = 1", "file")


def test_review_code_wraps_rate_limit_error(mocker):
    mock_client = mocker.patch("cli.reviewer.anthropic.Anthropic").return_value
    mock_client.messages.create.side_effect = anthropic.RateLimitError(
        message="slow down", response=mocker.Mock(status_code=429), body={}
    )
    mocker.patch.dict(os.environ, {"ANTHROPIC_API_KEY": "test-key"})

    with pytest.raises(ReviewError, match="Rate limit"):
        review_code("x = 1", "file")


def test_review_code_wraps_api_error(mocker):
    mock_client = mocker.patch("cli.reviewer.anthropic.Anthropic").return_value
    mock_client.messages.create.side_effect = anthropic.APIStatusError(
        message="server error", response=mocker.Mock(status_code=500), body={}
    )
    mocker.patch.dict(os.environ, {"ANTHROPIC_API_KEY": "test-key"})

    with pytest.raises(ReviewError, match="Claude API returned an error"):
        review_code("x = 1", "file")


# ---------------------------------------------------------------------------
# Bad JSON response
# ---------------------------------------------------------------------------

def test_review_code_raises_on_invalid_json(mocker):
    mocker.patch("cli.reviewer.anthropic.Anthropic").return_value.messages.create.return_value = (
        _make_response("this is not json at all")
    )
    mocker.patch.dict(os.environ, {"ANTHROPIC_API_KEY": "test-key"})

    with pytest.raises(ReviewError, match="invalid JSON"):
        review_code("x = 1", "file")
