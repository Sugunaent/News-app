from app.db.supabase import supabase
from app.services.media_urls import attach_signed_url

TEASER_SELECT = """
    id,
    slug,
    title,
    subtitle,
    article_type,
    published_at,
    categories (
        id,
        name,
        slug
    ),
    cover:media_assets!articles_cover_media_fkey (
        id,
        storage_path,
        media_type,
        mime_type
    )
"""


def map_article_teaser(article: dict) -> dict:
    return {
        "id": article["id"],
        "slug": article.get("slug") or "",
        "title": article.get("title") or "",
        "subtitle": article.get("subtitle"),
        "article_type": article.get("article_type", ""),
        "category": article.get("categories"),
        "published_at": article.get("published_at"),
        "cover": attach_signed_url(article.get("cover")),
    }


def fetch_published_teasers(
    *,
    search_term: str | None = None,
    author_picks: bool = False,
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
    else:
        query = query.order("published_at", desc=True)

    if limit is not None:
        query = query.limit(limit)

    response = query.execute()
    return [
        map_article_teaser(article)
        for article in (response.data or [])
    ]
