from types import SimpleNamespace
from unittest.mock import AsyncMock

import httpx
import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.dependencies.auth import get_current_user
from app.main import app
from app.routers.translation import TranslationContent


client = TestClient(app)


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
