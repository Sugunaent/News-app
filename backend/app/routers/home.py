from fastapi import APIRouter, Query

from app.db.supabase import supabase
from app.schemas.home import HomeDiscoveryResponse
from app.services.article_teasers import fetch_published_teasers


router = APIRouter(
    prefix="/api/v1/home",
    tags=["Home"],
)


def _fetch_active_categories() -> list[dict]:
    response = (
        supabase
        .table("categories")
        .select(
            """
            id,
            name,
            slug
            """
        )
        .eq("is_active", True)
        .order("display_order")
        .execute()
    )

    return response.data or []


@router.get(
    "/discovery",
    response_model=HomeDiscoveryResponse,
)
async def get_home_discovery(
    trending_limit: int = Query(default=10, ge=1, le=50),
    category_limit: int = Query(default=6, ge=1, le=50),
    authors_picks_limit: int = Query(default=6, ge=1, le=50),
):
    trending = fetch_published_teasers(
        author_picks=False,
        limit=trending_limit,
    )

    categories = _fetch_active_categories()

    category_sections = []

    for category in categories:
        articles = fetch_published_teasers(
            category_id=category["id"],
            limit=category_limit,
        )

        if not articles:
            continue

        category_sections.append(
            {
                "category": category,
                "articles": articles,
            }
        )

    authors_picks = fetch_published_teasers(
        author_picks=True,
        limit=authors_picks_limit,
    )

    return {
        "trending": trending,
        "category_sections": category_sections,
        "authors_picks": authors_picks,
    }
