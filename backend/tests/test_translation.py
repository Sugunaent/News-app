import asyncio
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock

import httpx
import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.dependencies.auth import get_current_user
from app.main import app
from app.routers.translation import (
    TRANSLATION_SYSTEM_PROMPT,
    TELUGU_TO_ENGLISH_SYSTEM_PROMPT,
    TranslationContent,
    _generate_for_model,
)


client = TestClient(app)


def test_gemini_request_uses_native_translation_system_prompt():
    captured_payload = {}

    async def capture_request(request):
        captured_payload.update(json.loads(request.content))
        return httpx.Response(
            200,
            json={
                "candidates": [
                    {
                        "content": {
                            "parts": [
                                {
                                    "text": json.dumps(
                                        {
                                            "title": "ఏఐ వార్తలు",
                                            "content": "",
                                            "segments": {"body-1": "సహజమైన అనువాదం"},
                                        }
                                    )
                                }
                            ]
                        }
                    }
                ]
            },
        )

    async def generate():
        transport = httpx.MockTransport(capture_request)
        async with httpx.AsyncClient(transport=transport) as http_client:
            return await _generate_for_model(
                http_client,
                "gemini-2.5-flash",
                "AI news",
                "",
                {"body-1": "Natural translation"},
                "Telugu",
            )

    result = asyncio.run(generate())

    assert result.title == "ఏఐ వార్తలు"
    assert result.segments == {"body-1": "సహజమైన అనువాదం"}
    assert (
        captured_payload["systemInstruction"]["parts"][0]["text"]
        == TRANSLATION_SYSTEM_PROMPT
    )
    assert "The Modern Stories" in TRANSLATION_SYSTEM_PROMPT
    assert "సహజమైన, వాడుక భాషా శైలి లో వార్తా శైలి" in TRANSLATION_SYSTEM_PROMPT


def test_gemini_request_adapts_telugu_source_for_english_readers():
    captured_payload = {}

    async def capture_request(request):
        captured_payload.update(json.loads(request.content))
        return httpx.Response(
            200,
            json={
                "candidates": [
                    {
                        "content": {
                            "parts": [
                                {
                                    "text": json.dumps(
                                        {
                                            "title": "A story from home",
                                            "content": "The story, in natural English.",
                                            "segments": {},
                                        }
                                    )
                                }
                            ]
                        }
                    }
                ]
            },
        )

    async def generate():
        transport = httpx.MockTransport(capture_request)
        async with httpx.AsyncClient(transport=transport) as http_client:
            return await _generate_for_model(
                http_client,
                "gemini-2.5-flash",
                "ఇంటి కథ",
                "ఒక చిన్న కథ.",
                {},
                "English",
                "Telugu",
            )

    result = asyncio.run(generate())

    assert result.title == "A story from home"
    assert result.content == "The story, in natural English."
    assert (
        captured_payload["systemInstruction"]["parts"][0]["text"]
        == TELUGU_TO_ENGLISH_SYSTEM_PROMPT
    )
    assert "from Telugu into English" in captured_payload["contents"][0]["parts"][0]["text"]
    assert "local voice, cultural context, idioms, emotional subtext" in TELUGU_TO_ENGLISH_SYSTEM_PROMPT
    assert "themodernstories.in" in TELUGU_TO_ENGLISH_SYSTEM_PROMPT
    assert "ready to publish" in TELUGU_TO_ENGLISH_SYSTEM_PROMPT
    assert "do not include a cultural analysis" in TELUGU_TO_ENGLISH_SYSTEM_PROMPT


@pytest.fixture
def authenticated_user():
    original = app.dependency_overrides.get(get_current_user)
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(
        user=SimpleNamespace(role="USER")
    )
    yield
    if original is None:
        app.dependency_overrides.pop(get_current_user, None)
    else:
        app.dependency_overrides[get_current_user] = original


@pytest.mark.usefixtures("authenticated_user")
def test_translate_article_uses_fallback_model(monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_key", "test-key")
    generate = AsyncMock(
        side_effect=[
            httpx.ConnectError("busy"),
            TranslationContent(
                title="Hola",
                content="Contenido traducido",
                segments={"body-1": "Texto traducido"},
            ),
        ]
    )
    monkeypatch.setattr("app.routers.translation._generate_for_model", generate)

    response = client.post(
        "/api/v1/translate",
        json={
            "title": "Hello",
            "content": "Article text",
            "segments": {"body-1": "Body text"},
            "targetLang": "Spanish",
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "data": {
            "title": "Hola",
            "content": "Contenido traducido",
            "segments": {"body-1": "Texto traducido"},
        },
    }
    assert generate.await_count == 2
    assert generate.await_args_list[0].args[1] == "gemini-2.5-flash"
    assert generate.await_args_list[1].args[1] == "gemini-2.5-pro"


@pytest.mark.usefixtures("authenticated_user")
def test_translate_article_accepts_telugu_source_and_english_target(monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_key", "test-key")
    generated = TranslationContent(
        title="An English title",
        content="An adapted English story.",
    )
    generate = AsyncMock(return_value=generated)
    monkeypatch.setattr("app.routers.translation.generate_translation", generate)

    response = client.post(
        "/api/v1/translate",
        json={
            "title": "తెలుగు శీర్షిక",
            "content": "తెలుగు కథ",
            "sourceLang": "Telugu",
            "targetLang": "English",
        },
    )

    assert response.status_code == 200
    assert response.json()["data"]["title"] == "An English title"
    assert generate.await_args.kwargs["source_lang"] == "Telugu"
    assert generate.await_args.kwargs["target_lang"] == "English"


@pytest.mark.usefixtures("authenticated_user")
def test_translate_article_rejects_missing_content(monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_key", "test-key")

    response = client.post(
        "/api/v1/translate",
        json={"title": "", "targetLang": "Spanish"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Content and target language are required"


@pytest.mark.usefixtures("authenticated_user")
def test_translate_article_requires_server_api_key(monkeypatch):
    monkeypatch.setattr(settings, "gemini_api_key", "")

    response = client.post(
        "/api/v1/translate",
        json={
            "title": "Hello",
            "content": "Article text",
            "targetLang": "Spanish",
        },
    )

    assert response.status_code == 503


def test_translate_article_requires_authentication():
    response = client.post(
        "/api/v1/translate",
        json={
            "title": "Hello",
            "content": "Article text",
            "targetLang": "Spanish",
        },
    )

    assert response.status_code == 401
