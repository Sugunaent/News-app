import asyncio
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app
from app.routers.articles import get_article


client = TestClient(app)
ARTICLE_ID = "11111111-1111-1111-1111-111111111111"
BLOCK_ID = "33333333-3333-3333-3333-333333333333"


def test_list_articles_returns_saved_translation():
    article = {
        "id": ARTICLE_ID,
        "slug": "future-of-ai",
        "title": "The Future of AI",
        "subtitle": "What comes next",
        "summary": "A look at where AI is heading.",
        "article_type": "STANDARD",
        "published_at": datetime(2026, 8, 23, 10, tzinfo=timezone.utc).isoformat(),
    }
    saved = {
        "title": "ఏఐ భవిష్యత్తు",
        "subtitle": "తర్వాత ఏమి?",
        "summary": "ఏఐ ఎటు వెళ్తుందో ఒక పరిశీలన.",
        "segments": {
            "subtitle": "తర్వాత ఏమి?",
            "summary": "ఏఐ ఎటు వెళ్తుందో ఒక పరిశీలన.",
        },
    }
    with (
        patch("app.routers.articles.fetch_published_teasers", return_value=[article]),
        patch("app.routers.articles._load_article_translation", return_value=saved),
        patch("app.routers.articles.settings.gemini_api_key", "test-key"),
        patch("app.routers.articles.generate_translation", new_callable=AsyncMock) as generate,
    ):
        response = client.get("/api/v1/articles?lang=te")

    assert response.status_code == 200
    assert response.json()["items"][0]["title"] == saved["title"]
    generate.assert_not_awaited()


def test_list_articles_can_filter_one_article_for_translation_fallback():
    with patch("app.routers.articles.fetch_published_teasers", return_value=[]) as fetch:
        response = client.get(f"/api/v1/articles?article_id={ARTICLE_ID}&limit=1&lang=te")

    assert response.status_code == 200
    assert response.json() == {"items": []}
    fetch.assert_called_once_with(
        search_term=None,
        article_id=ARTICLE_ID,
        category_id=None,
        featured=False,
        author_picks=False,
        limit=1,
    )


def test_list_articles_generates_and_saves_missing_translation():
    article = {
        "id": ARTICLE_ID,
        "slug": "future-of-ai",
        "title": "The Future of AI",
        "subtitle": None,
        "summary": None,
        "article_type": "STANDARD",
        "published_at": datetime(2026, 8, 23, 10, tzinfo=timezone.utc).isoformat(),
    }
    source_title = article["title"]
    translated = SimpleNamespace(title="ఏఐ భవిష్యత్తు", segments={})
    admin = MagicMock()

    with (
        patch("app.routers.articles.fetch_published_teasers", return_value=[article]),
        patch("app.routers.articles._load_article_translation", return_value=None),
        patch("app.routers.articles.settings.gemini_api_key", "test-key"),
        patch(
            "app.routers.articles.generate_translation",
            new_callable=AsyncMock,
            return_value=translated,
        ) as generate,
        patch("app.routers.articles.supabase_admin", admin),
    ):
        response = client.get("/api/v1/articles?lang=te")

    assert response.status_code == 200
    assert response.json()["items"][0]["title"] == translated.title
    generate.assert_awaited_once_with(title=source_title, segments={}, target_lang="Telugu")
    admin.table.return_value.upsert.assert_called_once()
    assert admin.table.return_value.upsert.call_args.args[0]["language_code"] == "te"


def test_article_detail_uses_saved_translated_block_content():
    article = {
        "id": ARTICLE_ID,
        "slug": "future-of-ai",
        "title": "The Future of AI",
        "subtitle": None,
        "summary": None,
        "article_type": "STANDARD",
        "published_at": datetime(2026, 8, 23, 10, tzinfo=timezone.utc).isoformat(),
        "categories": None,
        "cover": None,
        "cover_image_url": None,
    }
    admin = MagicMock()
    article_table = MagicMock()
    block_table = MagicMock()
    admin.table.side_effect = lambda name: {
        "articles": article_table,
        "article_blocks": block_table,
    }[name]
    article_query = article_table.select.return_value.eq.return_value.ilike.return_value
    article_query.maybe_single.return_value.execute.return_value.data = article
    blocks_query = block_table.select.return_value.eq.return_value
    blocks_query.order.return_value.execute.return_value.data = [
        {
            "id": BLOCK_ID,
            "block_type": "TEXT",
            "display_order": 0,
            "text_content": "AI is changing the world.",
        }
    ]
    saved = {
        "title": "ఏఐ భవిష్యత్తు",
        "subtitle": None,
        "summary": None,
        "segments": {f"block-{BLOCK_ID}": "ఏఐ ప్రపంచాన్ని మారుస్తోంది."},
    }

    with (
        patch("app.routers.articles.supabase_admin", admin),
        patch("app.routers.articles._load_article_translation", return_value=saved),
        patch("app.routers.articles.record_article_view"),
        patch("app.routers.articles.attach_signed_url", return_value=None),
    ):
        result = asyncio.run(get_article("future-of-ai", lang="te"))

    assert result["title"] == saved["title"]
    assert result["blocks"][0]["text"] == saved["segments"][f"block-{BLOCK_ID}"]
