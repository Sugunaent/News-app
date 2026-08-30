from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


@patch("app.routers.articles.supabase")
def test_list_articles_returns_published_articles(
    mock_supabase,
):
    mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.order.return_value.execute.return_value.data = [
        {
            "id": "11111111-1111-1111-1111-111111111111",
            "article_type": "STANDARD",
            "published_at": "2026-08-23T10:00:00+00:00",
            "categories": {
                "id": "22222222-2222-2222-2222-222222222222",
                "name": "AI",
                "slug": "ai",
            },
            "article_translations": {
                "slug": "future-of-ai",
                "title": "The Future of AI",
                "subtitle": "What comes next",
                "summary": "A look at where AI is heading.",
            },
        }
    ]

    response = client.get("/api/v1/articles?language=en")

    assert response.status_code == 200

    data = response.json()

    assert len(data["items"]) == 1

    article = data["items"][0]

    assert article["id"] == "11111111-1111-1111-1111-111111111111"
    assert article["slug"] == "future-of-ai"
    assert article["title"] == "The Future of AI"
    assert article["subtitle"] == "What comes next"
    assert article["summary"] == "A look at where AI is heading."
    assert article["article_type"] == "STANDARD"
    assert article["category"]["name"] == "AI"
    assert article["category"]["slug"] == "ai"


@patch("app.routers.articles.supabase")
def test_list_articles_returns_empty_list_when_no_articles(
    mock_supabase,
):
    mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.order.return_value.execute.return_value.data = []

    response = client.get("/api/v1/articles?language=en")

    assert response.status_code == 200
    assert response.json() == {"items": []}


@patch("app.routers.articles.supabase")
def test_list_articles_does_not_require_authentication(
    mock_supabase,
):
    mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.order.return_value.execute.return_value.data = []

    response = client.get("/api/v1/articles?language=en")

    assert response.status_code != 401


@patch("app.routers.articles.supabase")
def test_list_articles_filters_for_published_status(
    mock_supabase,
):
    mock_query = (
        mock_supabase
        .table.return_value
        .select.return_value
        .eq.return_value
        .eq.return_value
        .order.return_value
    )

    mock_query.execute.return_value.data = []

    response = client.get("/api/v1/articles?language=en")

    assert response.status_code == 200

    first_eq = (
        mock_supabase
        .table.return_value
        .select.return_value
        .eq
    )

    first_eq.assert_any_call("status", "PUBLISHED")


@patch("app.routers.articles.supabase")
def test_get_article_returns_published_article(
    mock_supabase,
):
    mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": "11111111-1111-1111-1111-111111111111",
        "article_type": "STANDARD",
        "published_at": "2026-08-23T10:00:00+00:00",
        "categories": {
            "id": "22222222-2222-2222-2222-222222222222",
            "name": "AI",
            "slug": "ai",
        },
        "article_translations": {
            "slug": "future-of-ai",
            "title": "The Future of AI",
            "subtitle": "What comes next",
            "summary": "A look at where AI is heading.",
        },
    }

    response = client.get(
        "/api/v1/articles/future-of-ai?language=en"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["slug"] == "future-of-ai"
    assert data["title"] == "The Future of AI"
    assert data["article_type"] == "STANDARD"
    assert data["category"]["slug"] == "ai"


@patch("app.routers.articles.supabase")
def test_get_article_returns_404_when_not_found(
    mock_supabase,
):
    mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value.data = None

    response = client.get(
        "/api/v1/articles/does-not-exist?language=en"
    )

    assert response.status_code == 404
    assert response.json() == {
        "detail": "Article not found"
    }


@patch("app.routers.articles.supabase")
def test_get_article_returns_text_blocks(mock_supabase):
    article_mock = MagicMock()
    article_mock.select.return_value.eq.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": "11111111-1111-1111-1111-111111111111",
        "article_type": "STANDARD",
        "published_at": "2026-08-23T10:00:00+00:00",
        "categories": {
            "id": "22222222-2222-2222-2222-222222222222",
            "name": "AI",
            "slug": "ai",
        },
        "article_translations": {
            "slug": "future-of-ai",
            "title": "The Future of AI",
            "subtitle": "What comes next",
            "summary": "A look at where AI is heading.",
        },
    }

    blocks_mock = MagicMock()
    # Allow chainable method calls (.select().eq().eq().order().execute())
    blocks_mock.select.return_value = blocks_mock
    blocks_mock.eq.return_value = blocks_mock
    blocks_mock.order.return_value = blocks_mock
    blocks_mock.execute.return_value.data = [
        {
            "id": "33333333-3333-3333-3333-333333333333",
            "block_type": "TEXT",
            "display_order": 0,
            "article_block_translations": {
                "text_content": "AI is changing the world.",
                "caption": None,
            },
        },
        {
            "id": "44444444-4444-4444-4444-444444444444",
            "block_type": "TEXT",
            "display_order": 1,
            "article_block_translations": {
                "text_content": "The changes are happening rapidly.",
                "caption": None,
            },
        },
    ]

    def get_table_mock(table_name):
        if table_name == "articles":
            return article_mock
        return blocks_mock

    mock_supabase.table.side_effect = get_table_mock

    response = client.get("/api/v1/articles/future-of-ai?language=en")

    assert response.status_code == 200
    data = response.json()

    assert len(data["blocks"]) == 2
    assert data["blocks"][0]["type"] == "TEXT"
    assert data["blocks"][0]["display_order"] == 0
    assert data["blocks"][0]["text"] == "AI is changing the world."

    assert data["blocks"][1]["type"] == "TEXT"
    assert data["blocks"][1]["display_order"] == 1
    assert data["blocks"][1]["text"] == "The changes are happening rapidly."

@patch("app.routers.articles.supabase")
def test_get_article_returns_image_blocks(mock_supabase):
    article_mock = MagicMock()
    article_mock.select.return_value.eq.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": "11111111-1111-1111-1111-111111111111",
        "article_type": "STANDARD",
        "published_at": "2026-08-23T10:00:00+00:00",
        "categories": {
            "id": "22222222-2222-2222-2222-222222222222",
            "name": "AI",
            "slug": "ai",
        },
        "article_translations": {
            "slug": "future-of-ai",
            "title": "The Future of AI",
            "subtitle": "What comes next",
            "summary": "A look at where AI is heading.",
        },
    }

    blocks_mock = MagicMock()
    blocks_mock.select.return_value = blocks_mock
    blocks_mock.eq.return_value = blocks_mock
    blocks_mock.order.return_value = blocks_mock
    blocks_mock.execute.return_value.data = [
        {
            "id": "55555555-5555-5555-5555-555555555555",
            "block_type": "IMAGE",
            "display_order": 1,
            "media_id": "66666666-6666-6666-6666-666666666666",
            "article_block_translations": {
                "text_content": None,
                "caption": "The future of artificial intelligence.",
            },
            "media_assets": {
                "id": "66666666-6666-6666-6666-666666666666",
                "storage_path": "articles/11111111-1111-1111-1111-111111111111/content/future-ai.jpg",
                "media_type": "IMAGE",
                "mime_type": "image/jpeg",
            },
        }
    ]

    def get_table_mock(table_name):
        if table_name == "articles":
            return article_mock
        return blocks_mock

    mock_supabase.table.side_effect = get_table_mock

    response = client.get("/api/v1/articles/future-of-ai?language=en")

    assert response.status_code == 200
    data = response.json()

    assert len(data["blocks"]) == 1
    assert data["blocks"][0]["type"] == "IMAGE"
    assert data["blocks"][0]["display_order"] == 1
    assert data["blocks"][0]["caption"] == "The future of artificial intelligence."


@patch("app.routers.articles.supabase")
def test_search_articles_returns_matching_published_articles(
    mock_supabase,
):
    mock_query = (
        mock_supabase
        .table.return_value
        .select.return_value
        .eq.return_value
        .eq.return_value
        .or_
        .return_value
        .order.return_value
    )

    mock_query.execute.return_value.data = [
        {
            "id": "11111111-1111-1111-1111-111111111111",
            "article_type": "STANDARD",
            "published_at": "2026-08-23T10:00:00+00:00",
            "categories": {
                "id": "22222222-2222-2222-2222-222222222222",
                "name": "AI",
                "slug": "ai",
            },
            "article_translations": {
                "slug": "future-of-ai",
                "title": "The Future of AI",
                "subtitle": "What comes next",
                "summary": "A look at where AI is heading.",
            },
        }
    ]

    response = client.get(
        "/api/v1/articles/search?q=AI&language=en"
    )

    assert response.status_code == 200

    data = response.json()

    assert len(data["items"]) == 1

    article = data["items"][0]

    assert article["id"] == (
        "11111111-1111-1111-1111-111111111111"
    )
    assert article["slug"] == "future-of-ai"
    assert article["title"] == "The Future of AI"
    assert article["subtitle"] == "What comes next"
    assert article["summary"] == (
        "A look at where AI is heading."
    )
    assert article["article_type"] == "STANDARD"
    assert article["category"]["name"] == "AI"
    assert article["category"]["slug"] == "ai"


@patch("app.routers.articles.supabase")
def test_search_articles_returns_empty_list_when_no_matches(
    mock_supabase,
):
    mock_query = (
        mock_supabase
        .table.return_value
        .select.return_value
        .eq.return_value
        .eq.return_value
        .or_
        .return_value
        .order.return_value
    )

    mock_query.execute.return_value.data = []

    response = client.get(
        "/api/v1/articles/search?q=nonexistent&language=en"
    )

    assert response.status_code == 200
    assert response.json() == {"items": []}


@patch("app.routers.articles.supabase")
def test_search_articles_filters_for_published_status(
    mock_supabase,
):
    mock_query = (
        mock_supabase
        .table.return_value
        .select.return_value
        .eq.return_value
        .eq.return_value
        .or_
        .return_value
        .order.return_value
    )

    mock_query.execute.return_value.data = []

    response = client.get(
        "/api/v1/articles/search?q=AI&language=en"
    )

    assert response.status_code == 200

    first_eq = (
        mock_supabase
        .table.return_value
        .select.return_value
        .eq
    )

    first_eq.assert_any_call(
        "status",
        "PUBLISHED",
    )


@patch("app.routers.articles.supabase")
def test_search_articles_searches_translation_fields(
    mock_supabase,
):
    mock_query = (
        mock_supabase
        .table.return_value
        .select.return_value
        .eq.return_value
        .eq.return_value
        .or_
        .return_value
        .order.return_value
    )

    mock_query.execute.return_value.data = []

    response = client.get(
        "/api/v1/articles/search?q=future&language=en"
    )

    assert response.status_code == 200

    or_method = (
        mock_supabase
        .table.return_value
        .select.return_value
        .eq.return_value
        .eq.return_value
        .or_
    )

    or_method.assert_called_once()

    search_expression = or_method.call_args.args[0]

    assert "title.ilike.%future%" in search_expression
    assert "subtitle.ilike.%future%" in search_expression
    assert "summary.ilike.%future%" in search_expression
    assert "slug.ilike.%future%" in search_expression

    assert or_method.call_args.kwargs == {
        "referenced_table": "article_translations"
    }


def test_search_articles_requires_query():
    response = client.get(
        "/api/v1/articles/search?language=en"
    )

    assert response.status_code == 422


@patch("app.routers.articles.supabase")
def test_search_articles_does_not_require_authentication(
    mock_supabase,
):
    mock_query = (
        mock_supabase
        .table.return_value
        .select.return_value
        .eq.return_value
        .eq.return_value
        .or_
        .return_value
        .order.return_value
    )

    mock_query.execute.return_value.data = []

    response = client.get(
        "/api/v1/articles/search?q=AI&language=en"
    )

    assert response.status_code != 401


@patch("app.routers.articles.supabase")
def test_get_article_returns_podcast_blocks(mock_supabase):
    article_mock = MagicMock()
    article_mock.select.return_value.eq.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": "11111111-1111-1111-1111-111111111111",
        "article_type": "STANDARD",
        "published_at": "2026-08-23T10:00:00+00:00",
        "categories": {
            "id": "22222222-2222-2222-2222-222222222222",
            "name": "AI",
            "slug": "ai",
        },
        "article_translations": {
            "slug": "future-of-ai",
            "title": "The Future of AI",
            "subtitle": "What comes next",
            "summary": "A look at where AI is heading.",
        },
    }

    blocks_mock = MagicMock()
    blocks_mock.select.return_value = blocks_mock
    blocks_mock.eq.return_value = blocks_mock
    blocks_mock.order.return_value = blocks_mock
    blocks_mock.execute.return_value.data = [
        {
            "id": "77777777-7777-7777-7777-777777777777",
            "block_type": "PODCAST",
            "display_order": 2,
            "media_id": None,
            "external_url": "https://open.spotify.com/embed/episode/example",
            "article_block_translations": {
                "text_content": "Listen to our team discuss the future of AI.",
                "caption": None,
            },
            "media_assets": None,
        }
    ]

    def get_table_mock(table_name):
        if table_name == "articles":
            return article_mock
        return blocks_mock

    mock_supabase.table.side_effect = get_table_mock

    response = client.get("/api/v1/articles/future-of-ai?language=en")

    assert response.status_code == 200
    data = response.json()

    assert len(data["blocks"]) == 1
    podcast = data["blocks"][0]
    assert podcast["id"] == "77777777-7777-7777-7777-777777777777"
    assert podcast["type"] == "PODCAST"
    assert podcast["display_order"] == 2
    assert podcast["description"] == "Listen to our team discuss the future of AI."
    assert podcast["external_url"] == "https://open.spotify.com/embed/episode/example"


@patch("app.routers.articles.supabase")
def test_get_article_preserves_podcast_block_order(mock_supabase):
    article_mock = MagicMock()
    article_mock.select.return_value.eq.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": "11111111-1111-1111-1111-111111111111",
        "article_type": "STANDARD",
        "published_at": "2026-08-23T10:00:00+00:00",
        "categories": {
            "id": "22222222-2222-2222-2222-222222222222",
            "name": "AI",
            "slug": "ai",
        },
        "article_translations": {
            "slug": "future-of-ai",
            "title": "The Future of AI",
            "subtitle": None,
            "summary": None,
        },
    }

    blocks_mock = MagicMock()
    blocks_mock.select.return_value = blocks_mock
    blocks_mock.eq.return_value = blocks_mock
    blocks_mock.order.return_value = blocks_mock
    blocks_mock.execute.return_value.data = [
        {
            "id": "33333333-3333-3333-3333-333333333333",
            "block_type": "TEXT",
            "display_order": 0,
            "media_id": None,
            "external_url": None,
            "article_block_translations": {
                "text_content": "Opening paragraph.",
                "caption": None,
            },
            "media_assets": None,
        },
        {
            "id": "77777777-7777-7777-7777-777777777777",
            "block_type": "PODCAST",
            "display_order": 1,
            "media_id": None,
            "external_url": "https://www.youtube.com/embed/example",
            "article_block_translations": {
                "text_content": "Listen to our discussion.",
                "caption": None,
            },
            "media_assets": None,
        },
        {
            "id": "44444444-4444-4444-4444-444444444444",
            "block_type": "TEXT",
            "display_order": 2,
            "media_id": None,
            "external_url": None,
            "article_block_translations": {
                "text_content": "Continue reading.",
                "caption": None,
            },
            "media_assets": None,
        },
    ]

    def get_table_mock(table_name):
        if table_name == "articles":
            return article_mock
        return blocks_mock

    mock_supabase.table.side_effect = get_table_mock

    response = client.get("/api/v1/articles/future-of-ai?language=en")

    assert response.status_code == 200
    blocks = response.json()["blocks"]

    assert [block["type"] for block in blocks] == ["TEXT", "PODCAST", "TEXT"]
    assert blocks[1]["display_order"] == 1