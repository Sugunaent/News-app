from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def _article(
    *,
    article_id: str,
    slug: str,
    title: str,
    published_at: str,
    category_id: str = "00000000-0000-0000-0000-000000000001",
    category_name: str = "Technology",
    category_slug: str = "technology",
    is_author_pick: bool = False,
    author_pick_order: int | None = None,
):
    return {
        "id": article_id,
        "article_type": "STANDARD",
        "published_at": published_at,
        "is_author_pick": is_author_pick,
        "author_pick_order": author_pick_order,
        "categories": {
            "id": category_id,
            "name": category_name,
            "slug": category_slug,
        },
        "article_translations": {
            "slug": slug,
            "title": title,
            "subtitle": None,
            "summary": None,
        },
    }


def _category(
    *,
    category_id: str,
    name: str,
    slug: str,
):
    return {
        "id": category_id,
        "name": name,
        "slug": slug,
    }


def test_home_discovery_returns_trending_category_sections_and_authors_picks():
    trending_data = [
        _article(
            article_id="00000000-0000-0000-0000-000000000011",
            slug="latest-article",
            title="Latest Article",
            published_at="2026-08-27T08:00:00Z",
        )
    ]

    categories_data = [
        _category(
            category_id="00000000-0000-0000-0000-000000000001",
            name="Technology",
            slug="technology",
        ),
        _category(
            category_id="00000000-0000-0000-0000-000000000002",
            name="Science",
            slug="science",
        ),
    ]

    technology_data = [
        _article(
            article_id="00000000-0000-0000-0000-000000000013",
            slug="technology-story",
            title="Technology Story",
            published_at="2026-08-27T07:00:00Z",
            category_id="00000000-0000-0000-0000-000000000001",
            category_name="Technology",
            category_slug="technology",
        )
    ]

    science_data = [
        _article(
            article_id="00000000-0000-0000-0000-000000000014",
            slug="science-story",
            title="Science Story",
            published_at="2026-08-26T07:00:00Z",
            category_id="00000000-0000-0000-0000-000000000002",
            category_name="Science",
            category_slug="science",
        )
    ]

    authors_pick_data = [
        _article(
            article_id="00000000-0000-0000-0000-000000000012",
            slug="authors-pick",
            title="Author's Pick",
            published_at="2026-08-26T08:00:00Z",
            is_author_pick=True,
            author_pick_order=1,
        )
    ]

    with patch("app.routers.home.supabase") as mock_supabase:
        trending_query = MagicMock()
        trending_query.eq.return_value = trending_query
        trending_query.order.return_value = trending_query
        trending_query.limit.return_value = trending_query
        trending_query.execute.return_value = MagicMock(
            data=trending_data
        )

        categories_query = MagicMock()
        categories_query.eq.return_value = categories_query
        categories_query.order.return_value = categories_query
        categories_query.execute.return_value = MagicMock(
            data=categories_data
        )

        technology_query = MagicMock()
        technology_query.eq.return_value = technology_query
        technology_query.order.return_value = technology_query
        technology_query.limit.return_value = technology_query
        technology_query.execute.return_value = MagicMock(
            data=technology_data
        )

        science_query = MagicMock()
        science_query.eq.return_value = science_query
        science_query.order.return_value = science_query
        science_query.limit.return_value = science_query
        science_query.execute.return_value = MagicMock(
            data=science_data
        )

        authors_pick_query = MagicMock()
        authors_pick_query.eq.return_value = authors_pick_query
        authors_pick_query.order.return_value = authors_pick_query
        authors_pick_query.limit.return_value = authors_pick_query
        authors_pick_query.execute.return_value = MagicMock(
            data=authors_pick_data
        )

        table_mock = MagicMock()

        table_mock.select.side_effect = [
            trending_query,
            categories_query,
            technology_query,
            science_query,
            authors_pick_query,
        ]

        mock_supabase.table.return_value = table_mock

        response = client.get(
            "/api/v1/home/discovery"
        )

    assert response.status_code == 200

    data = response.json()

    assert len(data["trending"]) == 1
    assert data["trending"][0]["slug"] == "latest-article"

    assert len(data["category_sections"]) == 2

    assert data["category_sections"][0]["category"] == {
        "id": "00000000-0000-0000-0000-000000000001",
        "name": "Technology",
        "slug": "technology",
    }

    assert len(data["category_sections"][0]["articles"]) == 1
    assert (
        data["category_sections"][0]["articles"][0]["slug"]
        == "technology-story"
    )

    assert data["category_sections"][1]["category"] == {
        "id": "00000000-0000-0000-0000-000000000002",
        "name": "Science",
        "slug": "science",
    }

    assert len(data["category_sections"][1]["articles"]) == 1
    assert (
        data["category_sections"][1]["articles"][0]["slug"]
        == "science-story"
    )

    assert len(data["authors_picks"]) == 1
    assert data["authors_picks"][0]["slug"] == "authors-pick"


def test_home_discovery_skips_categories_without_articles():
    trending_data = [
        _article(
            article_id="00000000-0000-0000-0000-000000000011",
            slug="latest-article",
            title="Latest Article",
            published_at="2026-08-27T08:00:00Z",
        )
    ]

    categories_data = [
        _category(
            category_id="00000000-0000-0000-0000-000000000001",
            name="Technology",
            slug="technology",
        ),
        _category(
            category_id="00000000-0000-0000-0000-000000000002",
            name="Science",
            slug="science",
        ),
    ]

    technology_data = [
        _article(
            article_id="00000000-0000-0000-0000-000000000013",
            slug="technology-story",
            title="Technology Story",
            published_at="2026-08-27T07:00:00Z",
        )
    ]

    empty_science_data = []

    authors_pick_data = []

    with patch("app.routers.home.supabase") as mock_supabase:
        trending_query = MagicMock()
        trending_query.eq.return_value = trending_query
        trending_query.order.return_value = trending_query
        trending_query.limit.return_value = trending_query
        trending_query.execute.return_value = MagicMock(
            data=trending_data
        )

        categories_query = MagicMock()
        categories_query.eq.return_value = categories_query
        categories_query.order.return_value = categories_query
        categories_query.execute.return_value = MagicMock(
            data=categories_data
        )

        technology_query = MagicMock()
        technology_query.eq.return_value = technology_query
        technology_query.order.return_value = technology_query
        technology_query.limit.return_value = technology_query
        technology_query.execute.return_value = MagicMock(
            data=technology_data
        )

        science_query = MagicMock()
        science_query.eq.return_value = science_query
        science_query.order.return_value = science_query
        science_query.limit.return_value = science_query
        science_query.execute.return_value = MagicMock(
            data=empty_science_data
        )

        authors_pick_query = MagicMock()
        authors_pick_query.eq.return_value = authors_pick_query
        authors_pick_query.order.return_value = authors_pick_query
        authors_pick_query.limit.return_value = authors_pick_query
        authors_pick_query.execute.return_value = MagicMock(
            data=authors_pick_data
        )

        table_mock = MagicMock()

        table_mock.select.side_effect = [
            trending_query,
            categories_query,
            technology_query,
            science_query,
            authors_pick_query,
        ]

        mock_supabase.table.return_value = table_mock

        response = client.get(
            "/api/v1/home/discovery"
        )

    assert response.status_code == 200

    data = response.json()

    assert len(data["category_sections"]) == 1
    assert (
        data["category_sections"][0]["category"]["slug"]
        == "technology"
    )


def test_home_discovery_returns_empty_sections_when_no_articles():
    empty_query = MagicMock()
    empty_query.eq.return_value = empty_query
    empty_query.order.return_value = empty_query
    empty_query.limit.return_value = empty_query
    empty_query.execute.return_value = MagicMock(data=[])

    categories_query = MagicMock()
    categories_query.eq.return_value = categories_query
    categories_query.order.return_value = categories_query
    categories_query.execute.return_value = MagicMock(data=[])

    with patch("app.routers.home.supabase") as mock_supabase:
        table_mock = MagicMock()

        table_mock.select.side_effect = [
            empty_query,
            categories_query,
            empty_query,
        ]

        mock_supabase.table.return_value = table_mock

        response = client.get(
            "/api/v1/home/discovery"
        )

    assert response.status_code == 200

    data = response.json()

    assert data["trending"] == []
    assert data["category_sections"] == []
    assert data["authors_picks"] == []


def test_home_discovery_rejects_invalid_limits():
    response = client.get(
        "/api/v1/home/discovery?trending_limit=0"
    )

    assert response.status_code == 422

    response = client.get(
        "/api/v1/home/discovery?category_limit=0"
    )

    assert response.status_code == 422

    response = client.get(
        "/api/v1/home/discovery?category_limit=51"
    )

    assert response.status_code == 422

    response = client.get(
        "/api/v1/home/discovery?authors_picks_limit=51"
    )

    assert response.status_code == 422