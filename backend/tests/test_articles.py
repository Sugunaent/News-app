import asyncio
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app
from app.routers import articles as articles_router


client = TestClient(app)


def test_list_articles_returns_published_teasers():
    teaser = {
        "id": "11111111-1111-1111-1111-111111111111",
        "slug": "future-of-ai",
        "title": "The Future of AI",
        "article_type": "STANDARD",
        "published_at": "2026-08-23T10:00:00+00:00",
    }

    with patch(
        "app.routers.articles.fetch_published_teasers",
        return_value=[teaser],
    ) as fetch_teasers:
        response = client.get("/api/v1/articles?lang=en")

    assert response.status_code == 200
    assert response.json()["items"][0]["slug"] == "future-of-ai"
    fetch_teasers.assert_called_once_with(
        search_term=None,
        article_id=None,
        category_id=None,
        featured=False,
        author_picks=False,
        limit=None,
    )


def test_search_articles_passes_search_term_to_teaser_service():
    with patch(
        "app.routers.articles.fetch_published_teasers",
        return_value=[],
    ) as fetch_teasers:
        response = client.get("/api/v1/articles/search?q=  science  ")

    assert response.status_code == 200
    assert response.json() == {"items": []}
    fetch_teasers.assert_called_once()
    assert fetch_teasers.call_args.kwargs["search_term"] == "science"


def _mock_article_detail(article, blocks):
    article_query = MagicMock()
    article_query.eq.return_value = article_query
    article_query.maybe_single.return_value.execute.return_value = SimpleNamespace(
        data=article
    )

    blocks_query = MagicMock()
    blocks_query.eq.return_value = blocks_query
    blocks_query.order.return_value = blocks_query
    blocks_query.execute.return_value = SimpleNamespace(data=blocks)

    client = MagicMock()
    client.table.side_effect = lambda table: {
        "articles": MagicMock(
            select=MagicMock(return_value=article_query),
        ),
        "article_blocks": MagicMock(
            select=MagicMock(return_value=blocks_query),
        ),
    }[table]
    return client, article_query


def test_get_article_returns_all_text_blocks_for_full_article():
    article_id = "11111111-1111-1111-1111-111111111111"
    article = {
        "id": article_id,
        "slug": "complete-article",
        "title": "Complete article",
        "subtitle": "Full subtitle",
        "summary": "Full summary",
        "article_type": "STANDARD",
        "published_at": datetime(2026, 8, 23, 10, tzinfo=timezone.utc),
        "categories": None,
        "cover": None,
    }
    blocks = [
        {
            "id": "33333333-3333-3333-3333-333333333333",
            "block_type": "TEXT",
            "display_order": 0,
            "text_content": "The complete article body.",
        },
        {
            "id": "44444444-4444-4444-4444-444444444444",
            "block_type": "TEXT",
            "display_order": 1,
            "text_content": "The final article paragraph.",
        },
    ]
    supabase, article_query = _mock_article_detail(article, blocks)

    with (
        patch.object(articles_router, "supabase_admin", supabase),
        patch.object(articles_router, "record_article_view"),
        patch.object(articles_router, "attach_signed_url", side_effect=lambda media: media),
    ):
        response = asyncio.run(
            articles_router.get_article(article_id, lang="en")
        )

    article_query.eq.assert_any_call("id", article_id)
    assert response["title"] == "Complete article"
    assert [block["text"] for block in response["blocks"]] == [
        "The complete article body.",
        "The final article paragraph.",
    ]


def test_public_article_detail_is_available_without_authentication():
    article_id = "11111111-1111-1111-1111-111111111111"
    article = {
        "id": article_id,
        "slug": "guest-readable-article",
        "title": "Guest-readable article",
        "subtitle": "A published story",
        "summary": "Article summary",
        "article_type": "STANDARD",
        "published_at": datetime(2026, 8, 23, 10, tzinfo=timezone.utc),
        "categories": None,
        "cover": None,
    }
    supabase, _ = _mock_article_detail(article, [])

    with (
        patch.object(articles_router, "supabase_admin", supabase),
        patch.object(articles_router, "record_article_view"),
        patch.object(articles_router, "attach_signed_url", side_effect=lambda media: media),
    ):
        response = client.get(f"/api/v1/articles/{article_id}")

    assert response.status_code == 200
    assert response.json()["slug"] == "guest-readable-article"


def test_get_article_uses_translated_text_for_non_english_language():
    article_id = "11111111-1111-1111-1111-111111111111"
    block_id = "33333333-3333-3333-3333-333333333333"
    article = {
        "id": article_id,
        "slug": "complete-article",
        "title": "Complete article",
        "subtitle": "Full subtitle",
        "summary": "Full summary",
        "article_type": "STANDARD",
        "published_at": datetime(2026, 8, 23, 10, tzinfo=timezone.utc),
        "categories": None,
        "cover": None,
    }
    blocks = [
        {
            "id": block_id,
            "block_type": "TEXT",
            "display_order": 0,
            "text_content": "The complete article body.",
        },
    ]
    supabase, _ = _mock_article_detail(article, blocks)
    translated = {
        "title": "వ్యాసం",
        "subtitle": "ఉపశీర్షిక",
        "summary": "సారాంశం",
        "segments": {f"block-{block_id}": "పూర్తి వ్యాసం"},
        "content_language": "te",
    }

    with (
        patch.object(articles_router, "supabase_admin", supabase),
        patch.object(articles_router, "record_article_view"),
        patch.object(articles_router, "attach_signed_url", side_effect=lambda media: media),
        patch.object(
            articles_router,
            "_get_or_create_article_translation",
            new_callable=AsyncMock,
            return_value=translated,
        ),
    ):
        response = asyncio.run(
            articles_router.get_article("complete-article", lang="te")
        )

    assert response["title"] == "వ్యాసం"
    assert response["blocks"][0]["text"] == "పూర్తి వ్యాసం"


def test_get_article_keeps_full_content_when_translation_is_not_configured():
    article_id = "11111111-1111-1111-1111-111111111111"
    article = {
        "id": article_id,
        "slug": "complete-article",
        "title": "Complete article",
        "subtitle": "Full subtitle",
        "summary": "Full summary",
        "article_type": "STANDARD",
        "published_at": datetime(2026, 8, 23, 10, tzinfo=timezone.utc),
        "categories": None,
        "cover": None,
    }
    blocks = [
        {
            "id": "33333333-3333-3333-3333-333333333333",
            "block_type": "TEXT",
            "display_order": 0,
            "text_content": "The complete article body.",
        },
        {
            "id": "44444444-4444-4444-4444-444444444444",
            "block_type": "TEXT",
            "display_order": 1,
            "text_content": "The final article paragraph.",
        },
    ]
    supabase, _ = _mock_article_detail(article, blocks)

    with (
        patch.object(articles_router, "supabase_admin", supabase),
        patch.object(articles_router, "record_article_view"),
        patch.object(articles_router, "attach_signed_url", side_effect=lambda media: media),
        patch.object(articles_router, "_load_article_translation", return_value=None),
        patch.object(articles_router.settings, "gemini_api_key", ""),
    ):
        response = asyncio.run(
            articles_router.get_article("complete-article", lang="te")
        )

    assert response["content_language"] == "en"
    assert response["title"] == "Complete article"
    assert [block["text"] for block in response["blocks"]] == [
        "The complete article body.",
        "The final article paragraph.",
    ]
