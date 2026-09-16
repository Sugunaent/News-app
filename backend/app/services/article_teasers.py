from app.db.supabase import supabase
from app.services.media_urls import attach_signed_url

TEASER_SELECT = """
    id,
    slug,
    title,
    subtitle,
    article_type,
    published_at,
    created_at,
    is_author_pick,
    is_featured,
    cover_image_url,
    reading_time_minutes,
    author_name,
    category_id,
    categories (
        id,
        name,
        slug,
        description,
        image_url
    ),
    cover:media_assets!articles_cover_media_fkey (
        id,
        storage_path,
        media_type,
        mime_type
    )
"""


def map_article_teaser(article: dict) -> dict:
    category = article.get("categories")
    cover = attach_signed_url(article.get("cover"))
    cover_url = article.get("cover_image_url")
    if not cover_url and isinstance(cover, dict):
        cover_url = cover.get("signed_url")

    return {
        "id": article["id"],
        "slug": article.get("slug") or "",
        "title": article.get("title") or "",
        "subtitle": article.get("subtitle"),
        "article_type": article.get("article_type", ""),
        "category": category,
        "category_id": article.get("category_id") or (category or {}).get("id"),
        "published_at": article.get("published_at"),
        "created_at": article.get("created_at"),
        "cover": cover,
        "cover_image_url": cover_url,
        "is_author_pick": bool(article.get("is_author_pick")),
        "is_featured": bool(article.get("is_featured")),
        "reading_time_minutes": article.get("reading_time_minutes"),
        "author_name": article.get("author_name"),
        "is_published": True,
    }


def fetch_published_teasers(
    *,
    search_term: str | None = None,
    author_picks: bool = False,
    featured: bool = False,
    category_id: str | None = None,
    limit: int | None = None,
) -> list[dict]:
    query = (
        supabase
        .table("articles")
        .select(TEASER_SELECT)
        .eq("status", "PUBLISHED")
    )

    if category_id is not None:
        query = query.eq("category_id", category_id)

    if search_term:
        query = query.or_(
            (
                f"title.ilike.%{search_term}%,"
                f"subtitle.ilike.%{search_term}%,"
                f"slug.ilike.%{search_term}%"
            )
        )

    if author_picks:
        query = (
            query
            .eq("is_author_pick", True)
            .order("author_pick_order")
            .order("published_at", desc=True)
        )
    elif featured:
        query = (
            query
            .eq("is_featured", True)
            .order("published_at", desc=True)
        )
    else:
        query = query.order("published_at", desc=True)

    if limit is not None:
        query = query.limit(limit)

    response = query.execute()
    return [
        map_article_teaser(article)
        for article in (response.data or [])
    ]
