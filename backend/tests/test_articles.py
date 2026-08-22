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


def test_list_articles_does_not_require_authentication():
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