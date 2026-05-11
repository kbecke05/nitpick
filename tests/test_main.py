import json
import os
import tempfile

import pytest
from click.testing import CliRunner

from cli.main import main
from cli.reviewer import ReviewError

GOOD_REVIEW = {
    "summary": "Looks good.",
    "bugs": [],
    "style_issues": [],
    "suggestions": [],
    "score": 9,
}

HIGH_BUG_REVIEW = {
    "summary": "Has a serious bug.",
    "bugs": [{"line": 1, "severity": "high", "message": "Null pointer."}],
    "style_issues": [],
    "suggestions": [],
    "score": 3,
}


@pytest.fixture
def runner():
    return CliRunner()


# ---------------------------------------------------------------------------
# Input validation — must provide exactly one mode flag
# ---------------------------------------------------------------------------

def test_no_flags_shows_usage_error(runner):
    result = runner.invoke(main, [])
    assert result.exit_code != 0
    assert "Provide one of" in result.output


def test_multiple_flags_shows_usage_error(runner, mocker, tmp_path):
    f = tmp_path / "code.py"
    f.write_text("x = 1")
    result = runner.invoke(main, ["--file", str(f), "--staged"])
    assert result.exit_code != 0
    assert "only one" in result.output.lower()


# ---------------------------------------------------------------------------
# --file mode
# ---------------------------------------------------------------------------

def test_file_mode_calls_review_code(runner, mocker, tmp_path):
    mock_review = mocker.patch("cli.main.review_code", return_value=GOOD_REVIEW)
    f = tmp_path / "code.py"
    f.write_text("x = 1")

    result = runner.invoke(main, ["--file", str(f)])

    mock_review.assert_called_once_with("x = 1", "file")
    assert result.exit_code == 0


def test_file_mode_exits_1_on_high_severity_bug(runner, mocker, tmp_path):
    mocker.patch("cli.main.review_code", return_value=HIGH_BUG_REVIEW)
    f = tmp_path / "code.py"
    f.write_text("x = 1")

    result = runner.invoke(main, ["--file", str(f)])

    assert result.exit_code == 1


def test_file_mode_exits_0_without_high_bugs(runner, mocker, tmp_path):
    mocker.patch("cli.main.review_code", return_value=GOOD_REVIEW)
    f = tmp_path / "code.py"
    f.write_text("x = 1")

    result = runner.invoke(main, ["--file", str(f)])

    assert result.exit_code == 0


def test_file_mode_markdown_flag_routes_to_markdown_review(runner, mocker, tmp_path):
    mocker.patch("cli.main.review_code", return_value=GOOD_REVIEW)
    mock_md = mocker.patch("cli.main.markdown_review", return_value="## nitpick review\n")
    f = tmp_path / "code.py"
    f.write_text("x = 1")

    runner.invoke(main, ["--file", str(f), "--markdown"])

    mock_md.assert_called_once_with(GOOD_REVIEW)


# ---------------------------------------------------------------------------
# --diff mode
# ---------------------------------------------------------------------------

def test_diff_mode_reads_from_stdin(runner, mocker):
    mock_review = mocker.patch("cli.main.review_code", return_value=GOOD_REVIEW)
    diff_input = "- old\n+ new\n"

    result = runner.invoke(main, ["--diff"], input=diff_input)

    mock_review.assert_called_once_with(diff_input, "diff")
    assert result.exit_code == 0


# NOTE: The isatty() guard in --diff mode ("expects piped input") cannot be
# tested via CliRunner because Click replaces sys.stdin with its own BytesIO
# during invoke, overriding any patch. The important behavior — reading stdin
# and passing it to review_code — is covered by test_diff_mode_reads_from_stdin.


# ---------------------------------------------------------------------------
# --staged mode
# ---------------------------------------------------------------------------

def test_staged_mode_calls_git_diff(runner, mocker):
    mock_run = mocker.patch("cli.main.subprocess.run")
    mock_run.return_value = type("R", (), {"returncode": 0, "stdout": "- x\n+ y\n", "stderr": ""})()
    mocker.patch("cli.main.review_code", return_value=GOOD_REVIEW)

    result = runner.invoke(main, ["--staged"])

    mock_run.assert_called_once_with(["git", "diff", "--staged"], capture_output=True, text=True)
    assert result.exit_code == 0


def test_staged_mode_errors_on_empty_diff(runner, mocker):
    mock_run = mocker.patch("cli.main.subprocess.run")
    mock_run.return_value = type("R", (), {"returncode": 0, "stdout": "   ", "stderr": ""})()

    result = runner.invoke(main, ["--staged"])

    assert result.exit_code != 0
    assert "No staged changes" in result.output


def test_staged_mode_errors_on_git_failure(runner, mocker):
    mock_run = mocker.patch("cli.main.subprocess.run")
    mock_run.return_value = type("R", (), {"returncode": 1, "stdout": "", "stderr": "not a repo"})()

    result = runner.invoke(main, ["--staged"])

    assert result.exit_code != 0


# ---------------------------------------------------------------------------
# ReviewError propagation
# ---------------------------------------------------------------------------

def test_review_error_displayed_and_exits_nonzero(runner, mocker, tmp_path):
    mocker.patch("cli.main.review_code", side_effect=ReviewError("Invalid API key."))
    f = tmp_path / "code.py"
    f.write_text("x = 1")

    result = runner.invoke(main, ["--file", str(f)])

    assert result.exit_code != 0
    assert "Invalid API key" in result.output
