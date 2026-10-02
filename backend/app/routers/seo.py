from __future__ import annotations

from urllib.parse import quote
from xml.etree import ElementTree as ET

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from app.core.config import settings
from app.db.supabase import supabase_admin

router = APIRouter(tags=["SEO"])

SITEMAP_NS = "http://www.sitemaps.org/schemas/sitemap/0.9"
ET.register_namespace("", SITEMAP_NS)
PUBLIC_PATHS = (
    "/",
    "/about",
    "/latest",
    "/authors-picks",
    "/privacy",
    "/legal",
)
PAGE_SIZE = 1000


def _site_url() -> str:
    return settings.site_url.rstrip("/")


def _add_url(urlset: ET.Element, path: str, lastmod: str | None = None) -> None:
    url_element = ET.SubElement(urlset, f"{{{SITEMAP_NS}}}url")
    ET.SubElement(url_element, f"{{{SITEMAP_NS}}}loc").text = f"{_site_url()}{path}"
    if lastmod:
        ET.SubElement(url_element, f"{{{SITEMAP_NS}}}lastmod").text = lastmod


def _published_rows(table: str, fields: str, *, published_only: bool = False) -> list[dict]:
    rows: list[dict] = []
    offset = 0
    while True:
        query = supabase_admin.table(table).select(fields)
        if published_only:
            query = query.eq("status", "PUBLISHED")
        elif table == "categories":
            query = query.eq("is_active", True)
        result = query.range(offset, offset + PAGE_SIZE - 1).execute()
        batch = result.data or []
        rows.extend(row for row in batch if isinstance(row, dict))
        if len(batch) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
    return rows


@router.get("/sitemap.xml", include_in_schema=False)
def get_sitemap() -> Response:
    urlset = ET.Element(f"{{{SITEMAP_NS}}}urlset")

    for path in PUBLIC_PATHS:
        _add_url(urlset, path)

    try:
        categories = _published_rows("categories", "id,slug,updated_at")
        articles = _published_rows(
            "articles",
            "slug,category_id,updated_at",
            published_only=True,
        )
        published_category_ids = {
            str(article.get("category_id"))
            for article in articles
            if article.get("category_id")
        }

        for category in categories:
            slug = str(category.get("slug") or "").strip()
            if slug and str(category.get("id")) in published_category_ids:
                _add_url(
                    urlset,
                    f"/category/{quote(slug, safe='')}",
                    str(category["updated_at"])[:10] if category.get("updated_at") else None,
                )

        # Full story pages currently require login. Do not submit those URLs
        # as indexable sitemap entries until an anonymous crawler receives
        # substantive article HTML; enable via SITEMAP_ARTICLES_INDEXABLE only
        # after that public access path has been deployed.
        if settings.sitemap_articles_indexable:
            for article in articles:
                slug = str(article.get("slug") or "").strip()
                if slug:
                    _add_url(
                        urlset,
                        f"/article/{quote(slug, safe='')}",
                        str(article["updated_at"])[:10] if article.get("updated_at") else None,
                    )
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="The sitemap is temporarily unavailable",
        ) from exc

    body = ET.tostring(urlset, encoding="utf-8", xml_declaration=True)
    return Response(
        content=body,
        media_type="application/xml",
        headers={"Cache-Control": "public, max-age=300, stale-while-revalidate=3600"},
    )
