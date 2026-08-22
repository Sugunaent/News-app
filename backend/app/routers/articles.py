from fastapi import APIRouter, Query

from app.db.supabase import supabase
from app.schemas.articles import ArticleListResponse


router = APIRouter(
    prefix="/api/v1/articles",
    tags=["Articles"],
)


@router.get(
    "",
    response_model=ArticleListResponse,
)
async def list_articles(
    language: str = Query(default="en"),
):
    response = (
        supabase
        .table("articles")
        .select(
            """
            id,
            article_type,
            published_at,
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
        .order("published_at", desc=True)
        .execute()
    )

    items = []

    for article in response.data or []:
        translation = article["article_translations"]
        category = article["categories"]

        items.append(
            {
                "id": article["id"],
                "slug": translation["slug"],
                "title": translation["title"],
                "subtitle": translation["subtitle"],
                "summary": translation["summary"],
                "article_type": article["article_type"],
                "category": category,
                "published_at": article["published_at"],
            }
        )

    return {"items": items}