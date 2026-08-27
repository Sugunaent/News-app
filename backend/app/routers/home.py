from fastapi import APIRouter, Query

from app.db.supabase import supabase
from app.schemas.home import HomeDiscoveryResponse

router = APIRouter(
    prefix="/api/v1/home",
    tags=["Home"],
)


def _map_article(article: dict) -> dict:
    translation = article["article_translations"]
    category = article["categories"]

    return {
        "id": article["id"],
        "slug": translation["slug"],
        "title": translation["title"],
        "subtitle": translation["subtitle"],
        "summary": translation["summary"],
        "article_type": article["article_type"],
        "category": category,
        "published_at": article["published_at"],
    }


def _fetch_articles(
    *,
    language: str,
    author_picks: bool = False,
    limit: int = 10,
) -> list[dict]:
    query = (
        supabase
        .table("articles")
        .select(
            """
            id,
            article_type,
            published_at,
            author_pick_order,
            categories (
                id,
                name,
                slug
            ),
            article_translations!inner (
                slug,
                title,
                subtitle,
                summary
            )
            """
        )
        .eq("status", "PUBLISHED")
        .eq("article_translations.language_code", language)
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

    response = query.limit(limit).execute()

    return [
        _map_article(article)
        for article in (response.data or [])
    ]


@router.get(
    "/discovery",
    response_model=HomeDiscoveryResponse,
)
async def get_home_discovery(
    language: str = Query(default="en"),
    trending_limit: int = Query(default=10, ge=1, le=50),
    authors_picks_limit: int = Query(default=6, ge=1, le=50),
):
    trending = _fetch_articles(
        language=language,
        author_picks=False,
        limit=trending_limit,
    )

    authors_picks = _fetch_articles(
        language=language,
        author_picks=True,
        limit=authors_picks_limit,
    )

    return {
        "trending": trending,
        "authors_picks": authors_picks,
    }