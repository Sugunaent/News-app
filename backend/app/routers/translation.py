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
TRANSLATION_SYSTEM_PROMPT = """You are an expert multilingual news editor and native content strategist for 'The Modern Stories'. Your task is to translate news articles from English to Telugu and Hindi.

STRICT TRANSLATION RULES:
1. BRAND PROTECTION: Never translate or alter the proper noun 'The Modern Stories' across any language locale (EN/TE/HI).
2. NATURAL HUMAN PROSE: Do NOT perform literal, word-for-word, or robotic machine translations. Use smooth, idiomatically accurate, natural news writing style (సహజమైన, వాడుక భాషా శైలి లో వార్తా శైలి).
3. CULTURAL NATIVITY: Adapt idiomatic expressions and headline styles so they sound like they were originally written by a senior native journalist in that language.
4. CONTEXT OVER DICTIONARY: Prioritize sentence flow, clarity, and emotional tone over rigid grammatical dictionary matches.
5. PRESERVE STRUCTURE: Retain all bullet points, paragraph structures, and Markdown formatting cleanly.

Translate into the requested target language. Return only a JSON object with string fields title and content, and a string-to-string segments object. Translate each segment value without changing its key. Keep fields that are empty in the input empty in the output."""
TELUGU_TO_ENGLISH_SYSTEM_PROMPT = """You are an expert bilingual Telugu-English writer and editor for The Modern Stories (themodernstories.in). Telugu is the source of truth. First understand the source's local voice, cultural context, idioms, emotional subtext, and conversational flow; then adapt it into polished, natural, engaging contemporary English for global readers without losing the story's soul.

STRICT EDITING RULES:
1. Do not invent, omit, or change facts, events, or the author's intended meaning.
2. Do not translate or alter the proper noun 'The Modern Stories' or the abbreviation 'TMS'.
3. Use smooth, high-quality English that reads as if originally written for a contemporary global audience; avoid literal or machine-like translation.
4. Preserve local tone, emotional depth, culturally meaningful details, and idiomatic intent. Render Telugu expressions naturally; add a concise explanation only when essential for comprehension, and never flatten or stereotype the culture.
5. Keep the writing faithful to the source. Do not add editorial commentary, sensationalism, or unsupported context.
6. Preserve paragraph structure and Markdown formatting, and make the result clean and ready to publish.
7. Return only the refined English title and story in the requested JSON fields; do not include a cultural analysis, translator's note, or explanation in the story text."""

class TranslationRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    title: str = ""
    content: str = ""
    segments: dict[str, str] = Field(default_factory=dict)
    target_lang: str | None = Field(default=None, alias="targetLang")
    source_lang: str = Field(default="English", alias="sourceLang")


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
    source_lang: str = "English",
) -> TranslationContent:
    system_prompt = (
        TELUGU_TO_ENGLISH_SYSTEM_PROMPT
        if source_lang.strip().casefold() == "telugu"
        and target_lang.strip().casefold() == "english"
        else TRANSLATION_SYSTEM_PROMPT
    )
    response = await client.post(
        f"{GEMINI_API_URL}/{model_name}:generateContent",
        headers={"x-goog-api-key": settings.gemini_api_key},
        json={
            "systemInstruction": {
                "parts": [{"text": system_prompt}]
            },
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {
                            "text": (
                                f"Translate this article from {source_lang} into {target_lang}:\n"
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
    source_lang: str = "English",
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
                    source_lang,
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
        source_lang=request.source_lang.strip(),
    )
    return {
        "success": True,
        "data": translated.model_dump(),
    }
