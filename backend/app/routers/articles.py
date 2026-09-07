from fastapi import APIRouter, Query
from postgrest.exceptions import APIError

from app.core.exceptions import NotFoundError
from app.db.supabase import supabase
from app.schemas.articles import (
    ArticleDetailResponse,
    ArticleListResponse,
)
from app.services.analytics import record_article_view

router = APIRouter(
    prefix="/api/v1/articles",
    tags=["Articles"],
)


@router.get(
    "",
    response_model=ArticleListResponse,
)
async def list_articles():
    response = (
        supabase
        .table("articles")
        .select(
            """
            id,
            slug,
            title,
            subtitle,
            summary,
            article_type,
            published_at,
            categories (
                id,
                name,
                slug
            )
            """
        )
        .eq("status", "PUBLISHED")
        .order("published_at", desc=True)
        .execute()
    )

    items = []
    data = response.data if response and response.data else []

    for article in data:
        category = article.get("categories")

        items.append(
            {
                "id": article["id"],
                "slug": article.get("slug"),
                "title": article.get("title"),
                "subtitle": article.get("subtitle"),
                "summary": article.get("summary"),
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
            slug,
            title,
            subtitle,
            summary,
            article_type,
            published_at,
            categories (
                id,
                name,
                slug
            )
            """
        )
        .eq("status", "PUBLISHED")
        .or_(
            (
                f"title.ilike.%{search_term}%,"
                f"subtitle.ilike.%{search_term}%,"
                f"summary.ilike.%{search_term}%,"
                f"slug.ilike.%{search_term}%"
            )
        )
        .order("published_at", desc=True)
        .execute()
    )

    items = []
    data = response.data if response and response.data else []

    for article in data:
        category = article.get("categories")

        items.append(
            {
                "id": article["id"],
                "slug": article.get("slug"),
                "title": article.get("title"),
                "subtitle": article.get("subtitle"),
                "summary": article.get("summary"),
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
):
    response = (
        supabase
        .table("articles")
        .select(
            """
            id,
            slug,
            title,
            subtitle,
            summary,
            article_type,
            published_at,
            categories (
                id,
                name,
                slug
            )
            """
        )
        .eq("status", "PUBLISHED")
        .ilike("slug", slug)
        .maybe_single()
        .execute()
    )

    article_data = getattr(response, "data", None) if response else None

    if not article_data:
        raise NotFoundError("Article not found")

    article = article_data

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
                quiz_id,
                opinion_id,
                external_url,
                text_content,
                caption,
                media_assets (
                    id,
                    storage_path,
                    media_type,
                    mime_type
                )
                """
            )
            .eq("article_id", article["id"])
            .order("display_order")
            .execute()
        )
    except APIError:
        raise

    blocks = []
    blocks_data = getattr(blocks_response, "data", None) if blocks_response else None

    for block in blocks_data or []:
        block_type = block.get("block_type")

        if block_type == "TEXT":
            blocks.append(
                {
                    "id": block["id"],
                    "type": "TEXT",
                    "display_order": block["display_order"],
                    "text": block.get("text_content"),
                }
            )

        elif block_type == "IMAGE":
            media = block.get("media_assets")

            if isinstance(media, list):
                media = media[0] if media else None

            blocks.append(
                {
                    "id": block["id"],
                    "type": "IMAGE",
                    "display_order": block["display_order"],
                    "caption": block.get("caption"),
                    "media": media,
                }
            )

        elif block_type == "PODCAST":
            blocks.append(
                {
                    "id": block["id"],
                    "type": "PODCAST",
                    "display_order": block["display_order"],
                    "description": block.get("text_content") or "",
                    "external_url": block.get("external_url") or "",
                }
            )

        elif block_type == "QUIZ":
            quiz_data = None
            quiz_id = block.get("quiz_id")

            if quiz_id:
                try:
                    q_res = (
                        supabase
                        .table("quiz_questions")
                        .select(
                            """
                            id,
                            question_text,
                            explanation,
                            quiz_options (
                                id,
                                option_text,
                                display_order
                            )
                            """
                        )
                        .eq("id", str(quiz_id))
                        .maybe_single()
                        .execute()
                    )
                    raw_q = getattr(q_res, "data", None)
                    if raw_q:
                        quiz_data = {
                            "id": raw_q["id"],
                            "question": raw_q.get("question_text"),
                            "options": raw_q.get("quiz_options", []),
                        }
                except APIError:
                    pass

            blocks.append(
                {
                    "id": block["id"],
                    "type": "QUIZ",
                    "display_order": block["display_order"],
                    "quiz_id": quiz_id,
                    "quiz": quiz_data,
                }
            )

        elif block_type == "OPINION":
            opinion_data = None
            opinion_id = block.get("opinion_id")

            if opinion_id:
                try:
                    o_res = (
                        supabase
                        .table("opinion_questions")
                        .select(
                            """
                            id,
                            question_text,
                            allow_custom_response,
                            opinion_options (
                                id,
                                option_text,
                                display_order
                            )
                            """
                        )
                        .eq("id", str(opinion_id))
                        .maybe_single()
                        .execute()
                    )
                    raw_o = getattr(o_res, "data", None)
                    if raw_o:
                        opinion_data = {
                            "id": raw_o["id"],
                            "question": raw_o.get("question_text"),
                            "options": raw_o.get("opinion_options", []),
                        }
                except APIError:
                    pass

            blocks.append(
                {
                    "id": block["id"],
                    "type": "OPINION",
                    "display_order": block["display_order"],
                    "opinion_id": opinion_id,
                    "opinion": opinion_data,
                }
            )

    try:
        record_article_view(
            article_id=article["id"],
        )
    except Exception:
        pass

    return {
        "id": article["id"],
        "slug": article.get("slug"),
        "title": article.get("title"),
        "subtitle": article.get("subtitle"),
        "summary": article.get("summary"),
        "article_type": article["article_type"],
        "category": article.get("categories"),
        "published_at": article["published_at"],
        "blocks": blocks,
    }