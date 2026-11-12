from types import SimpleNamespace
from unittest.mock import patch
from xml.etree import ElementTree as ET

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_sitemap_contains_canonical_public_content():
    with (
        patch("app.routers.seo.supabase_admin.table") as mock_table,
        patch("app.routers.seo.settings.site_url", "https://www.themodernstories.in"),
    ):
        mock_table.return_value.select.return_value.eq.return_value.range.return_value.execute.side_effect = [
            SimpleNamespace(data=[{
                "id": "22222222-2222-2222-2222-222222222222",
                "slug": "science",
                "updated_at": "2026-09-20T10:00:00+00:00",
            }]),
            SimpleNamespace(data=[{
                "slug": "story-about-ai",
                "category_id": "22222222-2222-2222-2222-222222222222",
                "updated_at": "2026-09-21T10:00:00+00:00",
            }]),
        ]
        response = client.get("/sitemap.xml")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/xml")
    assert response.headers["cache-control"] == "no-cache, max-age=0, must-revalidate"
    root = ET.fromstring(response.content)
    locations = [node.text for node in root.findall("{http://www.sitemaps.org/schemas/sitemap/0.9}url/{http://www.sitemaps.org/schemas/sitemap/0.9}loc")]
    assert "https://www.themodernstories.in/" in locations
    assert "https://www.themodernstories.in/category/science" in locations
    assert "https://www.themodernstories.in/article/story-about-ai" in locations
    article_url = next(
        node for node in root.findall("{http://www.sitemaps.org/schemas/sitemap/0.9}url")
        if node.find("{http://www.sitemaps.org/schemas/sitemap/0.9}loc").text
        == "https://www.themodernstories.in/article/story-about-ai"
    )
    assert article_url.find("{http://www.sitemaps.org/schemas/sitemap/0.9}lastmod").text == "2026-09-21"
    assert not any("/profile" in location or "/superadmin" in location for location in locations)


def test_llms_indexes_link_published_articles_and_full_index_includes_text():
    categories = [{"id": "category-1", "name": "Stories", "slug": "stories"}]
    articles = [{
        "slug": "story-about-ai",
        "title": "A story about AI",
        "summary": "A concise summary.",
        "category_id": "category-1",
        "categories": {"name": "Stories", "slug": "stories"},
        "published_at": "2026-09-21T10:00:00+00:00",
        "blocks": [{
            "block_type": "TEXT",
            "display_order": 0,
            "text_content": "The full article body.",
        }],
    }]
    with (
        patch("app.routers.seo._published_content", return_value=(categories, articles)),
        patch("app.routers.seo.settings.site_url", "https://www.themodernstories.in"),
    ):
        index_response = client.get("/llms.txt")
        full_response = client.get("/llms-full.txt")

    assert index_response.status_code == 200
    assert index_response.headers["content-type"].startswith("text/markdown")
    assert "[A story about AI](https://www.themodernstories.in/article/story-about-ai)" in index_response.text
    assert "The full article body." not in index_response.text
    assert "The full article body." in full_response.text


def test_legacy_article_redirect_is_permanent():
    with (
        patch("app.routers.articles.supabase_admin.table") as mock_table,
        patch("app.routers.articles.settings.site_url", "https://www.themodernstories.in"),
    ):
        mock_table.return_value.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
            "slug": "story-about-ai"
        }
        response = client.get(
            "/api/v1/articles/redirect/11111111-1111-1111-1111-111111111111",
            follow_redirects=False,
        )

    assert response.status_code == 301
    assert response.headers["location"] == "https://www.themodernstories.in/article/story-about-ai"
