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
                article_block_translations (
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
            .order("display_order")
            .execute()
        )
    except APIError:
        raise

    blocks = []

    for block in blocks_response.data or []:
        block_translation = block.get("article_block_translations")
        media = block.get("media_assets")

        if block["block_type"] == "TEXT":
            blocks.append(
                {
                    "id": block["id"],
                    "type": block["block_type"],
                    "display_order": block["display_order"],
                    "text": (
                        block_translation["text_content"]
                        if block_translation
                        else None
                    ),
                }
            )

        elif block["block_type"] == "IMAGE":
            blocks.append(
                {
                    "id": block["id"],
                    "type": block["block_type"],
                    "display_order": block["display_order"],
                    "caption": (
                        block_translation["caption"]
                        if block_translation
                        else None
                    ),
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