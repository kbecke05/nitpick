import io

from rich.console import Console

from cli.formatter import (
    _score_emoji,
    _score_style,
    _severity_badge,
    display_review,
    markdown_review,
)

# ---------------------------------------------------------------------------
# _score_style
# ---------------------------------------------------------------------------

def test_score_style_high():
    assert _score_style(10) == "bold green"
    assert _score_style(8) == "bold green"


def test_score_style_medium():
    assert _score_style(7) == "bold yellow"
    assert _score_style(5) == "bold yellow"


def test_score_style_low():
    assert _score_style(4) == "bold red"
    assert _score_style(1) == "bold red"


# ---------------------------------------------------------------------------
# _score_emoji
# ---------------------------------------------------------------------------

def test_score_emoji_green():
    assert _score_emoji(10) == "🟢"
    assert _score_emoji(8) == "🟢"


def test_score_emoji_yellow():
    assert _score_emoji(7) == "🟡"
    assert _score_emoji(5) == "🟡"


def test_score_emoji_red():
    assert _score_emoji(4) == "🔴"
    assert _score_emoji(1) == "🔴"


def test_score_emoji_zero_returns_fallback():
    # 0 is outside every defined range, so we get the default "⚪"
    assert _score_emoji(0) == "⚪"


# ---------------------------------------------------------------------------
# _severity_badge
# ---------------------------------------------------------------------------

def test_severity_badge_contains_severity_text():
    badge = _severity_badge("high")
    assert "HIGH" in badge.plain


def test_severity_badge_case_insensitive():
    # The input might come from Claude in any case; we normalise to upper in the display
    badge = _severity_badge("High")
    assert "HIGH" in badge.plain


def test_severity_badge_unknown_severity_does_not_crash():
    # If Claude invents a new severity we've never seen, we should degrade gracefully
    badge = _severity_badge("critical")
    assert "CRITICAL" in badge.plain


# ---------------------------------------------------------------------------
# markdown_review — full output
# ---------------------------------------------------------------------------

SAMPLE_REVIEW = {
    "summary": "A simple addition function.",
    "score": 9,
    "bugs": [
        {"line": 5, "severity": "high", "message": "Division by zero possible."},
        {"line": 10, "severity": "low", "message": "Unused variable."},
    ],
    "style_issues": [
        {"line": 3, "message": "Missing type annotation."},
    ],
    "suggestions": ["Add docstring.", "Consider edge cases."],
}


def test_markdown_review_contains_summary():
    output = markdown_review(SAMPLE_REVIEW)
    assert "A simple addition function." in output


def test_markdown_review_contains_score():
    output = markdown_review(SAMPLE_REVIEW)
    assert "9/10" in output


def test_markdown_review_score_emoji_present():
    output = markdown_review(SAMPLE_REVIEW)
    assert "🟢" in output


def test_markdown_review_bugs_table_present():
    output = markdown_review(SAMPLE_REVIEW)
    assert "Division by zero possible." in output
    assert "Unused variable." in output


def test_markdown_review_severity_emojis():
    output = markdown_review(SAMPLE_REVIEW)
    assert "🔴" in output  # high severity
    assert "🟢" in output  # low severity (also matches score, that's fine)


def test_markdown_review_style_issues_present():
    output = markdown_review(SAMPLE_REVIEW)
    assert "Missing type annotation." in output


def test_markdown_review_suggestions_present():
    output = markdown_review(SAMPLE_REVIEW)
    assert "Add docstring." in output
    assert "Consider edge cases." in output


def test_markdown_review_empty_bugs_shows_no_bugs_found():
    review = {**SAMPLE_REVIEW, "bugs": []}
    output = markdown_review(review)
    assert "No bugs found" in output


def test_markdown_review_empty_style_issues_omits_section():
    review = {**SAMPLE_REVIEW, "style_issues": []}
    output = markdown_review(review)
    assert "Style Issues" not in output


def test_markdown_review_pipe_chars_escaped_in_messages():
    # Unescaped pipes break Markdown tables
    review = {
        **SAMPLE_REVIEW,
        "bugs": [{"line": 1, "severity": "low", "message": "Use a|b instead of c"}],
    }
    output = markdown_review(review)
    assert r"a\|b" in output


def test_markdown_review_missing_optional_fields_do_not_crash():
    minimal = {"summary": "ok", "score": 7}
    output = markdown_review(minimal)
    assert "ok" in output
    assert "7/10" in output


# ---------------------------------------------------------------------------
# display_review — smoke test (Rich terminal output)
# ---------------------------------------------------------------------------

def test_display_review_does_not_crash():
    # We don't assert exact terminal output (ANSI codes are fragile), but we
    # do verify the function runs to completion without raising an exception.
    buf = io.StringIO()
    import cli.formatter as fmt
    original_console = fmt.console
    fmt.console = Console(file=buf, highlight=False)
    try:
        display_review(SAMPLE_REVIEW)
    finally:
        fmt.console = original_console

    output = buf.getvalue()
    assert "nitpick review" in output
    assert "A simple addition function." in output
