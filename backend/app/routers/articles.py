from uuid import UUID

from fastapi import APIRouter, Depends, Query
from postgrest.exceptions import APIError

from app.core.exceptions import NotFoundError
from app.db.supabase import supabase_admin
from app.dependencies.auth import AuthContext, get_current_user, get_optional_user
from app.schemas.articles import (
    ArticleDetailResponse,
    ArticleListResponse,
)
from app.services.analytics import record_article_view
from app.services.article_teasers import fetch_published_teasers
from app.services.media_urls import attach_signed_url, create_signed_url
from app.services.gamification import get_active_xp_amount

router = APIRouter(
    prefix="/api/v1/articles",
    tags=["Articles"],
)


@router.get(
    "",
    response_model=ArticleListResponse,
)
def list_articles(
    q: str | None = Query(default=None),
    category_id: str | None = Query(default=None),
    featured: bool = Query(default=False),
    author_picks: bool = Query(default=False),
    limit: int | None = Query(default=None, ge=1, le=100),
):
    search_term = q.strip() if q else None
    return {
        "items": fetch_published_teasers(
            search_term=search_term,
            category_id=category_id,
            featured=featured,
            author_picks=author_picks,
            limit=limit,
        )
    }


@router.get(
    "/search",
    response_model=ArticleListResponse,
)
def search_articles(
    q: str = Query(..., min_length=1, max_length=100),
):
    search_term = q.strip()

    if not search_term:
        return {"items": []}

    return {
        "items": fetch_published_teasers(search_term=search_term),
    }


def _looks_like_uuid(value: str) -> bool:
    if len(value) != 36:
        return False
    try:
        UUID(value)
        return True
    except ValueError:
        return False


@router.get(
    "/{slug}",
    response_model=ArticleDetailResponse,
)
def get_article(
    slug: str,
    auth: AuthContext = Depends(get_current_user),
):
    client = supabase_admin
    query = (
        client
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
            category_id,
            is_author_pick,
            is_featured,
            cover_image_url,
            reading_time_minutes,
            author_name,
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
        )
        .eq("status", "PUBLISHED")
    )
    if _looks_like_uuid(slug):
        query = query.eq("id", slug)
    else:
        query = query.ilike("slug", slug)

    response = query.maybe_single().execute()

    article_data = getattr(response, "data", None) if response else None

    if not article_data:
        raise NotFoundError("Article not found")

    article = article_data

    try:
        blocks_response = (
            client
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
                title,
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
                    "external_url": block.get("external_url"),
                    "media": attach_signed_url(media),
                }
            )

        elif block_type == "PODCAST":
            ext_url = block.get("external_url") or ""
            if ext_url and not (ext_url.startswith("http://") or ext_url.startswith("https://")):
                ext_url = create_signed_url(ext_url) or ext_url

            media = block.get("media_assets")
            if isinstance(media, list):
                media = media[0] if media else None
                
            internal_audio = attach_signed_url(media)
            if internal_audio and not ext_url:
                if isinstance(internal_audio, dict):
                    ext_url = internal_audio.get("signed_url") or internal_audio.get("storage_path") or ""
                elif isinstance(internal_audio, str):
                    ext_url = internal_audio

            blocks.append(
                {
                    "id": block["id"],
                    "type": "PODCAST",
                    "display_order": block["display_order"],
                    "podcast": {
                        "id": block["id"],
                        "title": block.get("title") or "Podcast",
                        "description": block.get("text_content") or "",
                        "audio_url": ext_url,
                    }
                }
            )

        elif block_type == "QUIZ":
            quiz_data = None
            quiz_id = block.get("quiz_id")

            if quiz_id:
                try:
                    questions_res = (
                        client
                        .table("quiz_questions")
                        .select(
                            """
                            id,
                            display_order,
                            question_text,
                            quiz_options (
                                id,
                                option_text,
                                display_order,
                                is_correct,
                                explanation
                            )
                            """
                        )
                        .eq("quiz_id", str(quiz_id))
                        .order("display_order")
                        .execute()
                    )
                    questions = []
                    for raw_q in getattr(questions_res, "data", None) or []:
                        options = raw_q.get("quiz_options") or []
                        if isinstance(options, dict):
                            options = [options]
                        questions.append(
                            {
                                "id": raw_q["id"],
                                "question": raw_q.get("question_text"),
                                "display_order": raw_q.get("display_order", 0),
                                "options": sorted(
                                    options,
                                    key=lambda item: item.get("display_order", 0),
                                ),
                            }
                        )
                    if questions:
                        quiz_data = {
                            "id": quiz_id,
                            "questions": questions,
                            "xp_reward": get_active_xp_amount("QUIZ_CORRECT"),
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
                        client
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
                            "allow_custom_response": raw_o.get(
                                "allow_custom_response", True
                            ),
                            "options": raw_o.get("opinion_options", []),
                            "xp_reward": get_active_xp_amount("OPINION_SUBMITTED"),
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

    cover = attach_signed_url(article.get("cover"))
    cover_url = article.get("cover_image_url")
    if not cover_url and isinstance(cover, dict):
        cover_url = cover.get("signed_url")
    category = article.get("categories")

    return {
        "id": article["id"],
        "slug": article.get("slug") or "",
        "title": article.get("title"),
        "subtitle": article.get("subtitle"),
        "summary": article.get("summary"),
        "article_type": article["article_type"],
        "category": category,
        "category_id": article.get("category_id") or (category or {}).get("id"),
        "published_at": article["published_at"],
        "cover_image_url": cover_url,
        "is_author_pick": bool(article.get("is_author_pick")),
        "is_featured": bool(article.get("is_featured")),
        "reading_time_minutes": article.get("reading_time_minutes"),
        "author_name": article.get("author_name"),
        "is_published": True,
        "blocks": blocks,
    }
