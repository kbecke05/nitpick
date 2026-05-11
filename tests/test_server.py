import pytest
from fastapi.testclient import TestClient

from cli.reviewer import ReviewError
from server import app

client = TestClient(app)

GOOD_REVIEW = {
    "summary": "Looks clean.",
    "bugs": [],
    "style_issues": [],
    "suggestions": [],
    "score": 8,
}


# ---------------------------------------------------------------------------
# GET /health
# ---------------------------------------------------------------------------

def test_health_returns_ok():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


# ---------------------------------------------------------------------------
# POST /review — success
# ---------------------------------------------------------------------------

def test_review_returns_200_on_success(mocker):
    mocker.patch("server.review_code", return_value=GOOD_REVIEW)
    response = client.post("/review", json={"code": "x = 1", "mode": "file"})
    assert response.status_code == 200
    assert response.json() == GOOD_REVIEW


def test_review_passes_code_and_mode_to_review_code(mocker):
    mock = mocker.patch("server.review_code", return_value=GOOD_REVIEW)
    client.post("/review", json={"code": "print(1)", "mode": "diff"})
    mock.assert_called_once_with("print(1)", "diff")


def test_review_defaults_mode_to_file(mocker):
    # The `mode` field has a default of "file" — omitting it should work fine.
    mock = mocker.patch("server.review_code", return_value=GOOD_REVIEW)
    client.post("/review", json={"code": "x = 1"})
    mock.assert_called_once_with("x = 1", "file")


# ---------------------------------------------------------------------------
# POST /review — ReviewError → HTTP 500
# ---------------------------------------------------------------------------

def test_review_returns_500_on_review_error(mocker):
    mocker.patch("server.review_code", side_effect=ReviewError("Bad API key."))
    response = client.post("/review", json={"code": "x = 1", "mode": "file"})
    assert response.status_code == 500


def test_review_error_detail_in_response(mocker):
    mocker.patch("server.review_code", side_effect=ReviewError("Bad API key."))
    response = client.post("/review", json={"code": "x = 1", "mode": "file"})
    assert "Bad API key." in response.json()["detail"]


# ---------------------------------------------------------------------------
# POST /review — validation errors
# ---------------------------------------------------------------------------

def test_review_returns_422_when_code_missing():
    # Pydantic requires `code` — sending without it should give a validation error.
    response = client.post("/review", json={"mode": "file"})
    assert response.status_code == 422


def test_review_returns_422_for_invalid_mode():
    # The `mode` field is a Literal["file", "diff"] — anything else is rejected.
    response = client.post("/review", json={"code": "x = 1", "mode": "invalid"})
    assert response.status_code == 422


def test_review_returns_422_for_empty_body():
    response = client.post("/review", json={})
    assert response.status_code == 422
