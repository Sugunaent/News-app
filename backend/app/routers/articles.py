from fastapi import APIRouter, Query
from postgrest.exceptions import APIError

from app.core.exceptions import NotFoundError
from app.db.supabase import supabase
from app.schemas.articles import (
    ArticleDetailResponse,
    ArticleListResponse,
)

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



@router.get(
    "/search",
    response_model=ArticleListResponse,
)
async def search_articles(
    q: str = Query(..., min_length=1, max_length=100),
    language: str = Query(default="en"),
):
    search_term = q.strip()

    if not search_term:
        return {"items": []}

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
        .or_(
            (
                f"title.ilike.%{search_term}%,"
                f"subtitle.ilike.%{search_term}%,"
                f"summary.ilike.%{search_term}%,"
                f"slug.ilike.%{search_term}%"
            ),
            referenced_table="article_translations",
        )
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



@router.get(
    "/{slug}",
    response_model=ArticleDetailResponse,
)
async def get_article(
    slug: str,
    language: str = Query(default="en"),
):
    try:
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
            .eq("article_translations.slug", slug)
            .eq("article_translations.language_code", language)
            .single()
            .execute()
        )
    except APIError as exc:
        if exc.code == "PGRST116":
            raise NotFoundError("Article not found") from exc
        raise

    if not response.data:
        raise NotFoundError("Article not found")

    article = response.data
    translation = article["article_translations"]

    try:
        blocks_response = (
            supabase
            .table("article_blocks")
            .select(
                """
                id,
                block_type,
                display_order,
                media_id,
                article_block_translations!inner (
                    text_content,
                    caption
                ),
                media_assets (
                    id,
                    storage_path,
                    media_type,
                    mime_type
                )
                """
            )
            .eq("article_id", article["id"])
            .eq(
                "article_block_translations.language_code",
                language,
            )
            .eq("article_id", article["id"])
            .order("display_order")
            .execute()
        )
    except APIError:
        raise

    blocks = []

    for block in blocks_response.data or []:
        block_translation = block["article_block_translations"]
        block_type = block["block_type"]

        if block_type == "TEXT":
            blocks.append(
                {
                    "id": block["id"],
                    "type": "TEXT",
                    "display_order": block["display_order"],
                    "text": block_translation["text_content"],
                }
            )

        elif block_type == "IMAGE":
            media = block.get("media_assets")

            blocks.append(
                {
                    "id": block["id"],
                    "type": "IMAGE",
                    "display_order": block["display_order"],
                    "caption": block_translation["caption"],
                    "media": media,
                }
            )

    return {
        "id": article["id"],
        "slug": translation["slug"],
        "title": translation["title"],
        "subtitle": translation["subtitle"],
        "summary": translation["summary"],
        "article_type": article["article_type"],
        "category": article["categories"],
        "published_at": article["published_at"],
        "blocks": blocks,
    }