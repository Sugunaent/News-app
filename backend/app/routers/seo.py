from __future__ import annotations

import re
from urllib.parse import quote
from xml.etree import ElementTree as ET

from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse, Response

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
    "/compliance",
    "/legal",
)
PAGE_SIZE = 1000


def _site_url() -> str:
    return settings.site_url.rstrip("/")


def _markdown_text(value: object, max_length: int = 500) -> str:
    if not isinstance(value, str):
        return ""
    text = re.sub(r"\s+", " ", value).strip()
    return text[:max_length].replace("[", r"\[").replace("]", r"\]")


def _published_content(*, full: bool = False) -> tuple[list[dict], list[dict]]:
    categories = _published_rows("categories", "id,name,slug,description,updated_at")
    article_fields = (
        "slug,title,subtitle,summary,author_name,published_at,updated_at,category_id,categories(name,slug)"
    )
    if full:
        article_fields += ",blocks:article_blocks(block_type,text_content,display_order)"
    articles = _published_rows(
        "articles",
        article_fields,
        published_only=True,
    )
    return categories, articles


def _full_article_text(article: dict) -> str:
    blocks = article.get("blocks")
    if not isinstance(blocks, list):
        return ""
    text_blocks = sorted(
        (
            block
            for block in blocks
            if isinstance(block, dict)
            and block.get("block_type") == "TEXT"
            and isinstance(block.get("text_content"), str)
        ),
        key=lambda block: block.get("display_order") or 0,
    )
    return "\n\n".join(
        re.sub(r"\n{3,}", "\n\n", block["text_content"]).strip()
        for block in text_blocks
        if block["text_content"].strip()
    )


def _article_summary(article: dict) -> str:
    return _markdown_text(article.get("summary") or article.get("subtitle")) or "Published story."


def _llms_markdown(*, full: bool) -> str:
    try:
        categories, articles = _published_content(full=full)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="The published content index is temporarily unavailable",
        ) from exc

    site_url = _site_url()
    lines = [
        "# The Modern Stories",
        "",
        "> The Modern Stories publishes contemporary stories and editorial articles across technology, culture, wellness, spirituality, and personal growth.",
        "",
        "Use the linked article pages as the source of truth. Summaries below are editorial metadata, not substitutes for the full articles.",
        "",
        "## Platform",
        "",
        f"- [Home]({site_url}/): Discover published stories and categories.",
        f"- [Latest stories]({site_url}/latest): Browse recently published articles.",
        f"- [About]({site_url}/about): Learn about The Modern Stories.",
        "",
        "## Categories",
        "",
    ]

    category_by_id: dict[str, dict] = {}
    for category in categories:
        slug = str(category.get("slug") or "").strip()
        name = _markdown_text(category.get("name"), 120)
        if not slug or not name:
            continue
        category_by_id[str(category.get("id"))] = category
        description = _markdown_text(category.get("description"), 300)
        suffix = f" — {description}" if description else ""
        lines.append(f"- [{name}]({site_url}/category/{quote(slug, safe='')}){suffix}")

    lines.extend(["", "## Published articles", ""])
    for article in articles:
        slug = str(article.get("slug") or "").strip()
        title = _markdown_text(article.get("title"), 180)
        if not slug or not title:
            continue

        category = article.get("categories")
        if isinstance(category, list):
            category = category[0] if category else None
        if not isinstance(category, dict):
            category = category_by_id.get(str(article.get("category_id")), {})
        category_name = _markdown_text(category.get("name"), 120)
        summary = _article_summary(article)
        metadata = []
        if category_name:
            metadata.append(category_name)
        author = _markdown_text(article.get("author_name"), 120)
        if author:
            metadata.append(f"by {author}")
        if full and article.get("published_at"):
            metadata.append(f"published {str(article['published_at'])[:10]}")
        context = f" ({'; '.join(metadata)})" if metadata else ""
        article_link = f"[{title}]({site_url}/article/{quote(slug, safe='')})"
        if full:
            lines.extend([f"### {article_link}{context}", "", summary, ""])
            body = _full_article_text(article)
            if body:
                lines.extend([body, ""])
        else:
            lines.append(f"- {article_link}{context} — {summary}")

    lines.extend([
        "",
        "## Usage guidance",
        "",
        "- Cite the linked article when using its claims or reporting.",
        "- Preserve the author's meaning and distinguish editorial perspective from professional advice.",
        "- Do not infer credentials that are not stated in the article.",
    ])
    return "\n".join(lines) + "\n"


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
        headers={"Cache-Control": "no-cache, max-age=0, must-revalidate"},
    )


@router.get("/llms.txt", include_in_schema=False)
def get_llms_index() -> PlainTextResponse:
    return PlainTextResponse(
        _llms_markdown(full=False),
        media_type="text/markdown",
        headers={"Cache-Control": "public, max-age=300, stale-while-revalidate=3600"},
    )


@router.get("/llms-full.txt", include_in_schema=False)
def get_llms_full() -> PlainTextResponse:
    return PlainTextResponse(
        _llms_markdown(full=True),
        media_type="text/markdown",
        headers={"Cache-Control": "public, max-age=300, stale-while-revalidate=3600"},
    )
