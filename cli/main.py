import subprocess
import sys

import click

from .formatter import display_review, markdown_review
from .reviewer import ReviewError, review_code


@click.command()
@click.option("--file", "file_path", type=click.Path(exists=True), help="Path to a file to review.")
@click.option("--diff", "use_diff", is_flag=True, help="Read a git diff from stdin.")
@click.option("--staged", "use_staged", is_flag=True, help="Review staged changes (runs git diff --staged).")
@click.option("--markdown", "use_markdown", is_flag=True, help="Output GitHub-flavored markdown (for CI/Actions).")
def main(file_path, use_diff, use_staged, use_markdown):
    """nitpick — AI-powered code review in your terminal."""
    modes_provided = sum([bool(file_path), use_diff, use_staged])

    if modes_provided == 0:
        raise click.UsageError("Provide one of --file, --diff, or --staged.")
    if modes_provided > 1:
        raise click.UsageError("Provide only one of --file, --diff, or --staged.")

    if file_path:
        with open(file_path, "r") as f:
            code = f.read()
        mode = "file"

    elif use_diff:
        if sys.stdin.isatty():
            raise click.UsageError("--diff expects piped input. Try: git diff | python nitpick.py --diff")
        code = sys.stdin.read()
        mode = "diff"

    else:
        result = subprocess.run(["git", "diff", "--staged"], capture_output=True, text=True)
        if result.returncode != 0:
            raise click.ClickException(f"git diff --staged failed:\n{result.stderr}")
        code = result.stdout
        if not code.strip():
            raise click.ClickException("No staged changes found. Run git add first.")
        mode = "staged"

    try:
        review = review_code(code, mode)
    except ReviewError as e:
        raise SystemExit(f"Error: {e}")

    if use_markdown:
        print(markdown_review(review))
    else:
        display_review(review)

    high_bugs = [b for b in review.get("bugs", []) if b.get("severity") == "high"]
    if high_bugs:
        sys.exit(1)
