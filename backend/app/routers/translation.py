import json
import logging
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.core.config import settings
from app.dependencies.auth import get_current_user


logger = logging.getLogger("app.translation")

router = APIRouter(
    prefix="/api/v1/translate",
    tags=["Translation"],
)

CANDIDATE_MODELS = (
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-2.0-flash",
)
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models"


class TranslationRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    title: str = ""
    content: str = ""
    segments: dict[str, str] = Field(default_factory=dict)
    target_lang: str | None = Field(default=None, alias="targetLang")


class TranslationContent(BaseModel):
    title: str = ""
    content: str = ""
    segments: dict[str, str] = Field(default_factory=dict)


async def _generate_for_model(
    client: httpx.AsyncClient,
    model_name: str,
    title: str,
    content: str,
    segments: dict[str, str],
    target_lang: str,
) -> TranslationContent:
    response = await client.post(
        f"{GEMINI_API_URL}/{model_name}:generateContent",
        headers={"x-goog-api-key": settings.gemini_api_key},
        json={
            "systemInstruction": {
                "parts": [
                    {
                        "text": (
                            "You are a professional blog translator. Translate "
                            "naturally, use correct grammar, and preserve the "
                            "article's original formatting and headings. Translate "
                            "each segment value without changing its key. Return "
                            "only a JSON object with string fields title and content, "
                            "and a string-to-string segments object. Keep fields that "
                            "are empty in the input empty in the output."
                        )
                    }
                ]
            },
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {
                            "text": (
                                f"Translate this article into {target_lang}:\n"
                                f"{json.dumps({'title': title, 'content': content, 'segments': segments}, ensure_ascii=False)}"
                            )
                        }
                    ],
                }
            ],
            "generationConfig": {"responseMimeType": "application/json"},
        },
    )
    response.raise_for_status()

    payload: Any = response.json()
    generated_text = payload["candidates"][0]["content"]["parts"][0]["text"]
    return TranslationContent.model_validate_json(generated_text)


async def generate_translation(
    *,
    title: str = "",
    content: str = "",
    segments: dict[str, str] | None = None,
    target_lang: str,
) -> TranslationContent:
    request_segments = segments or {}
    async with httpx.AsyncClient(timeout=60.0) as client:
        for model_name in CANDIDATE_MODELS:
            try:
                return await _generate_for_model(
                    client,
                    model_name,
                    title,
                    content,
                    request_segments,
                    target_lang,
                )
            except (
                httpx.HTTPError,
                json.JSONDecodeError,
                KeyError,
                IndexError,
                TypeError,
                ValidationError,
            ) as exc:
                logger.warning(
                    "Translation model %s failed (%s); trying the next model",
                    model_name,
                    type(exc).__name__,
                )

    logger.error("All Gemini translation models failed")
    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail="Translation service could not process the article",
    )


@router.post("", dependencies=[Depends(get_current_user)])
async def translate_article(request: TranslationRequest):
    if (
        not any(
            value.strip()
            for value in (request.title, request.content, *request.segments.values())
        )
        or not request.target_lang
        or not request.target_lang.strip()
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Content and target language are required",
        )
    if not settings.gemini_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Translation service is not configured",
        )

    translated = await generate_translation(
        title=request.title,
        content=request.content,
        segments=request.segments,
        target_lang=request.target_lang.strip(),
    )
    return {
        "success": True,
        "data": translated.model_dump(),
    }
