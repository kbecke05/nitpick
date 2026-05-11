from cli.prompts import build_messages


def test_file_mode_returns_single_user_message():
    # build_messages must always return a list with exactly one item — the
    # Anthropic API expects a non-empty messages array and raises otherwise.
    messages = build_messages("print('hello')", "file")
    assert len(messages) == 1
    assert messages[0]["role"] == "user"


def test_file_mode_includes_code():
    messages = build_messages("print('hello')", "file")
    assert "print('hello')" in messages[0]["content"]


def test_file_mode_prompt_mentions_file():
    # Sanity-check that the user message frames this as a file review, not a diff.
    messages = build_messages("x = 1", "file")
    content = messages[0]["content"]
    assert "file" in content.lower()


def test_diff_mode_returns_single_user_message():
    messages = build_messages("- old\n+ new", "diff")
    assert len(messages) == 1
    assert messages[0]["role"] == "user"


def test_diff_mode_includes_diff_content():
    diff = "- old\n+ new"
    messages = build_messages(diff, "diff")
    assert diff in messages[0]["content"]


def test_diff_mode_instructs_null_lines():
    # The system prompt tells Claude to set line numbers to null for diffs
    # because diff line numbers don't map to source lines. The user message
    # must reinforce this so Claude actually does it.
    messages = build_messages("- old\n+ new", "diff")
    content = messages[0]["content"]
    assert "null" in content.lower()


def test_staged_mode_treated_as_diff():
    # "staged" produces a git diff — the message should be identical to "diff" mode.
    staged_messages = build_messages("- x\n+ y", "staged")
    diff_messages = build_messages("- x\n+ y", "diff")
    assert staged_messages[0]["content"] == diff_messages[0]["content"]
