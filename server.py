from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from cli.reviewer import ReviewError, review_code

app = FastAPI(title="nitpick", description="AI-powered code review API")

# Allow the React dev server (port 5173) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class ReviewRequest(BaseModel):
    code: str
    mode: Literal["file", "diff"] = "file"


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/review")
def review(request: ReviewRequest):
    try:
        return review_code(request.code, request.mode)
    except ReviewError as e:
        raise HTTPException(status_code=500, detail=str(e))
