from types import SimpleNamespace
from unittest.mock import patch
from xml.etree import ElementTree as ET

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_sitemap_contains_canonical_public_content():
    with (
        patch("app.routers.seo.supabase_admin.table") as mock_table,
        patch("app.routers.seo.settings.sitemap_articles_indexable", True),
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
    root = ET.fromstring(response.content)
    locations = [node.text for node in root.findall("{http://www.sitemaps.org/schemas/sitemap/0.9}url/{http://www.sitemaps.org/schemas/sitemap/0.9}loc")]
    assert "https://www.themodernstories.in/" in locations
    assert "https://www.themodernstories.in/category/science" in locations
    assert "https://www.themodernstories.in/article/story-about-ai" in locations
    assert not any("/profile" in location or "/superadmin" in location for location in locations)


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
