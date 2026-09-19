from uuid import UUID, uuid4
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.db.supabase import supabase_admin
from app.dependencies.auth import AuthContext, get_current_user
from app.schemas.user import (
    UserProfileAchievementResponse,
    UserProfileAggregateResponse,
    UserProfileBadgeResponse,
    UserProfileLevelResponse,
    UserProfileOpinionResponse,
    UserProfileQuizPerformanceResponse,
    UserProfileReadingProgressResponse,
    UserProfileResponse,
    UserProfileShareCardResponse,
    UserProfileUpdate,
)
from app.services.gamification import get_active_xp_amount
from app.services.media_urls import create_signed_url

router = APIRouter(
    prefix="/api/v1/users",
    tags=["Users"],
)


def _resolve_opinion_text(
    response: dict,
    option_text: str | None,
) -> str | None:
    custom_response = response.get("custom_response")

    if custom_response is not None:
        return custom_response

    return option_text


PROFILE_SELECT = (
    "id, email, display_name, avatar_media_id, role, is_active, bio"
)


def _profile_payload(profile: dict | None) -> dict | None:
    if isinstance(profile, dict):
        return profile
    if profile is None:
        return None
    if hasattr(profile, "data"):
        data = getattr(profile, "data")
        if isinstance(data, dict):
            return data
        if isinstance(data, list) and data:
            return data[0]
    return None


def _avatar_url_for(avatar_media_id) -> str | None:
    if not avatar_media_id:
        return None
    media = (
        supabase_admin.table("media_assets")
        .select("storage_path")
        .eq("id", str(avatar_media_id))
        .maybe_single()
        .execute()
    )
    if not media or not media.data:
        return None
    return create_signed_url(media.data.get("storage_path"))


def _to_user_profile(profile: dict, fallback_email: str | None) -> UserProfileResponse:
    email_val = profile.get("email")
    if not isinstance(email_val, str) or not email_val:
        email_val = fallback_email if isinstance(fallback_email, str) else None

    display_name_val = profile.get("display_name")
    if not isinstance(display_name_val, str):
        display_name_val = None

    role_val = profile.get("role", "USER")
    if not isinstance(role_val, str):
        role_val = "USER"

    is_active_val = profile.get("is_active", True)
    if not isinstance(is_active_val, bool):
        is_active_val = True

    return UserProfileResponse(
        id=profile["id"],
        email=email_val,
        display_name=display_name_val,
        avatar_media_id=profile.get("avatar_media_id"),
        avatar_url=_avatar_url_for(profile.get("avatar_media_id")),
        bio=profile.get("bio") if isinstance(profile.get("bio"), str) else None,
        role=role_val,
        is_active=is_active_val,
    )


@router.get(
    "/me",
    response_model=UserProfileResponse,
)
def get_me(
    auth: AuthContext = Depends(get_current_user),
):
    client = auth.client if hasattr(auth, "client") and auth.client else supabase_admin
    user_id = str(auth.user.id)

    profile = getattr(auth, "profile", None)
    if profile is None:
        try:
            profile_response = (
                client.table("profiles")
                .select(PROFILE_SELECT)
                .eq("id", user_id)
                .maybe_single()
                .execute()
            )
            profile = _profile_payload(profile_response)
        except Exception:
            profile = None

    if profile is None:
        try:
            profile_response = (
                supabase_admin.table("profiles")
                .select(PROFILE_SELECT)
                .eq("id", user_id)
                .maybe_single()
                .execute()
            )
            profile = _profile_payload(profile_response)
        except Exception:
            profile = None

    if profile is None:
        user_email = auth.user.email if isinstance(getattr(auth.user, "email", None), str) else None
        user_display = auth.user.display_name if isinstance(getattr(auth.user, "display_name", None), str) else None
        profile = {
            "id": user_id,
            "email": user_email,
            "display_name": user_display,
            "avatar_media_id": None,
            "role": "USER",
            "is_active": True,
            "bio": None,
        }

    fallback_email = auth.user.email if isinstance(getattr(auth.user, "email", None), str) else None
    return _to_user_profile(profile, fallback_email)


@router.get(
    "/me/profile",
    response_model=UserProfileAggregateResponse,
)
def get_my_profile(
    auth: AuthContext = Depends(get_current_user),
):
    client = auth.client if hasattr(auth, "client") and auth.client else supabase_admin
    user_id = str(auth.user.id)

    # ---------------------------------------------------------
    # 1. Profile identity
    # ---------------------------------------------------------

    profile = getattr(auth, "profile", None)
    if profile is None:
        try:
            profile_response = (
                client.table("profiles")
                .select(PROFILE_SELECT)
                .eq("id", user_id)
                .maybe_single()
                .execute()
            )
            profile = _profile_payload(profile_response)
        except Exception:
            profile = None

    if profile is None:
        try:
            profile_response = (
                supabase_admin.table("profiles")
                .select(PROFILE_SELECT)
                .eq("id", user_id)
                .maybe_single()
                .execute()
            )
            profile = _profile_payload(profile_response)
        except Exception:
            profile = None

    if profile is None:
        user_email = auth.user.email if isinstance(getattr(auth.user, "email", None), str) else None
        user_display = auth.user.display_name if isinstance(getattr(auth.user, "display_name", None), str) else None
        profile = {
            "id": user_id,
            "email": user_email,
            "display_name": user_display,
            "avatar_media_id": None,
            "role": "USER",
            "is_active": True,
            "bio": None,
        }

    fallback_email = auth.user.email if isinstance(getattr(auth.user, "email", None), str) else None
    user_profile = _to_user_profile(profile, fallback_email)

    # ---------------------------------------------------------
    # 2. Gamification
    # ---------------------------------------------------------

    transactions = []
    try:
        transactions_response = (
            client.table("xp_transactions")
            .select(
                "id, xp_rule_id, article_id, source_type, "
                "source_id, amount, created_at"
            )
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        if transactions_response and isinstance(transactions_response.data, list):
            transactions = transactions_response.data
    except Exception:
        transactions = []

    total_xp = sum(
        transaction["amount"]
        for transaction in transactions
    )

    current_level = None
    current_level = None
    try:
        level_response = (
            client.table("levels")
            .select(
                "id, name, minimum_xp, display_order"
            )
            .lte("minimum_xp", total_xp)
            .order("minimum_xp", desc=True)
            .limit(1)
            .maybe_single()
            .execute()
        )

        if (
            level_response
            and isinstance(level_response.data, dict)
        ):
            current_level = UserProfileLevelResponse(
                id=level_response.data["id"],
                name=level_response.data["name"],
                minimum_xp=level_response.data["minimum_xp"],
                display_order=level_response.data["display_order"],
            )
    except Exception:
        current_level = None

    badges: list[UserProfileBadgeResponse] = []
    try:
        badges_response = (
            client.table("user_badges")
            .select(
                "badge_id, earned_at, "
                "badges(id, name, description, image_asset_id)"
            )
            .eq("user_id", user_id)
            .order("earned_at", desc=True)
            .execute()
        )

        badge_items = (
            badges_response.data
            if (
                badges_response
                and isinstance(badges_response.data, list)
            )
            else []
        )

        for item in badge_items:
            badge = item.get("badges")

            if not badge:
                continue

            badges.append(
                UserProfileBadgeResponse(
                    id=badge["id"],
                    name=badge["name"],
                    description=badge["description"],
                    image_asset_id=badge.get("image_asset_id"),
                    earned_at=item["earned_at"],
                )
            )
    except Exception:
        badges = []

    # ---------------------------------------------------------
    # 3. Article completions
    # ---------------------------------------------------------

    completions = []
    try:
        completions_response = (
            client.table("article_completions")
            .select(
                "article_id, completed_at, "
                "articles("
                "id, "
                "title"
                ")"
            )
            .eq("user_id", user_id)
            .order("completed_at", desc=True)
            .execute()
        )

        completions = (
            completions_response.data
            if (
                completions_response
                and isinstance(completions_response.data, list)
            )
            else []
        )
    except Exception:
        completions = []

    articles_completed = len(completions)

    # ---------------------------------------------------------
    # 4. Quiz performance
    # ---------------------------------------------------------

    quiz_attempts = []
    try:
        quiz_attempts_response = (
            client.table("quiz_attempts")
            .select(
                "question_id, selected_option_id, "
                "is_correct, created_at"
            )
            .eq("user_id", user_id)
            .execute()
        )

        quiz_attempts = (
            quiz_attempts_response.data
            if (
                quiz_attempts_response
                and isinstance(quiz_attempts_response.data, list)
            )
            else []
        )
    except Exception:
        quiz_attempts = []

    total_attempts = len(quiz_attempts)

    correct_attempts = sum(
        1
        for attempt in quiz_attempts
        if attempt.get("is_correct") is True
    )

    incorrect_attempts = total_attempts - correct_attempts

    accuracy_percentage = (
        round(
            (correct_attempts / total_attempts) * 100,
            2,
        )
        if total_attempts
        else 0.0
    )

    quiz_performance = UserProfileQuizPerformanceResponse(
        total_attempts=total_attempts,
        correct_attempts=correct_attempts,
        incorrect_attempts=incorrect_attempts,
        accuracy_percentage=accuracy_percentage,
    )

    # ---------------------------------------------------------
    # 5. Opinion submissions
    # ---------------------------------------------------------

    opinions = []
    try:
        opinions_response = (
            client.table("opinion_responses")
            .select(
                "id, "
                "opinion_question_id, "
                "selected_option_id, "
                "custom_response, "
                "created_at, "
                "opinion_questions("
                "id, "
                "article_id, "
                "question_text, "
                "articles("
                "id, "
                "title"
                ")"
                ")"
            )
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )

        opinions = (
            opinions_response.data
            if (
                opinions_response
                and isinstance(opinions_response.data, list)
            )
            else []
        )
    except Exception:
        opinions = []

    opinions_submitted = len(opinions)

    # ---------------------------------------------------------
    # 6. Resolve selected opinion option text
    # ---------------------------------------------------------

    opinion_option_text_by_id: dict[str, str] = {}

    selected_option_ids = [
        str(opinion["selected_option_id"])
        for opinion in opinions
        if opinion.get("selected_option_id") is not None
    ]

    if selected_option_ids:
        try:
            options_response = (
                client.table("opinion_options")
                .select(
                    "id, question_id, option_text"
                )
                .in_("id", selected_option_ids)
                .execute()
            )

            options = (
                options_response.data
                if (
                    options_response
                    and isinstance(options_response.data, list)
                )
                else []
            )

            for option in options:
                option_text = option.get("option_text")

                if option_text:
                    opinion_option_text_by_id[
                        str(option["id"])
                    ] = option_text
        except Exception:
            pass

    # ---------------------------------------------------------
    # 7. Reading history / progress
    # ---------------------------------------------------------

    reading_progress = []
    try:
        progress_response = (
            client.table("reading_progress")
            .select(
                "article_id, progress_percentage, "
                "last_block_id, last_position, "
                "started_at, last_read_at, completed_at, "
                "articles(title)"
            )
            .eq("user_id", user_id)
            .order("last_read_at", desc=True)
            .execute()
        )

        progress_items = (
            progress_response.data
            if (
                progress_response
                and isinstance(progress_response.data, list)
            )
            else []
        )

        for item in progress_items:
            article_data = item.get("articles") or {}
            reading_progress.append(
                UserProfileReadingProgressResponse(
                    article_id=item["article_id"],
                    article_title=article_data.get("title"),
                    progress_percentage=item["progress_percentage"],
                    last_block_id=item.get("last_block_id"),
                    last_position=item.get("last_position"),
                    started_at=item["started_at"],
                    last_read_at=item["last_read_at"],
                    completed_at=item.get("completed_at"),
                )
            )
    except Exception:
        reading_progress = []

    # ---------------------------------------------------------
    # 8. Achievement history
    # ---------------------------------------------------------

    achievement_history: list[UserProfileAchievementResponse] = []

    for completion in completions:
        achievement_history.append(
            UserProfileAchievementResponse(
                type="ARTICLE_COMPLETION",
                title="Article Completed",
                description="Completed an article.",
                earned_at=completion["completed_at"],
                article_id=completion["article_id"],
            )
        )

    for badge in badges:
        achievement_history.append(
            UserProfileAchievementResponse(
                type="BADGE",
                title=badge.name,
                description=badge.description,
                earned_at=badge.earned_at,
                badge_id=badge.id,
            )
        )

    for transaction in transactions:
        achievement_history.append(
            UserProfileAchievementResponse(
                type="XP_ACTIVITY",
                title=f"+{transaction['amount']} XP",
                description=(
                    "XP earned from "
                    f"{transaction['source_type']}."
                ),
                earned_at=transaction["created_at"],
                article_id=transaction.get("article_id"),
            )
        )

    achievement_history.sort(
        key=lambda item: item.earned_at,
        reverse=True,
    )

    # ---------------------------------------------------------
    # 9. Historical share cards & Opinions List
    # ---------------------------------------------------------

    share_cards: list[UserProfileShareCardResponse] = []
    opinions_list: list[UserProfileOpinionResponse] = []

    for completion in completions:
        article_id = completion["article_id"]
        article = completion.get("articles") or {}
        article_title = article.get("title") or "Article"

        completion_xp = sum(
            txn["amount"]
            for txn in transactions
            if str(txn.get("article_id", "")) == str(article_id)
            and txn["source_type"] in ["ARTICLE_COMPLETION", "QUIZ"]
        )

        share_cards.append(
            UserProfileShareCardResponse(
                id=UUID(str(article_id)),
                card_type="ARTICLE_COMPLETION",
                created_at=completion["completed_at"],
                xp_gained=completion_xp,
                title="Article completed",
                description=f"Completed {article_title}",
                article_id=article_id,
                article_title=article_title,
                badge_id=None,
                badge_name=None,
                opinion_question_id=None,
                opinion_text=None,
                share_path=(
                    f"/api/v1/articles/{article_id}/completion/share"
                ),
            )
        )

    for opinion in opinions:
        question = opinion.get("opinion_questions") or {}
        article_id = question.get("article_id")
        article = question.get("articles") or {}
        article_title = article.get("title") or "Article"

        selected_option_id = opinion.get("selected_option_id")
        selected_option_text = None

        if selected_option_id is not None:
            selected_option_text = opinion_option_text_by_id.get(
                str(selected_option_id)
            )

        opinion_text = _resolve_opinion_text(
            opinion,
            selected_option_text,
        )

        opinions_list.append(
            UserProfileOpinionResponse(
                id=opinion["id"],
                opinion_question_id=question.get("id", opinion["opinion_question_id"]),
                article_id=article_id,
                article_title=article_title,
                question_text=question.get("question_text", "Opinion Question"),
                opinion_text=opinion_text,
                created_at=opinion["created_at"],
            )
        )

        opinion_xp = sum(
            txn["amount"]
            for txn in transactions
            if txn["source_type"] == "OPINION_RESPONSE"
            and str(txn.get("source_id", "")) == str(opinion["id"])
        )

        if opinion_xp == 0:
            opinion_xp = get_active_xp_amount("OPINION_SUBMITTED")

        share_cards.append(
            UserProfileShareCardResponse(
                id=UUID(str(opinion["id"])),
                card_type="OPINION",
                created_at=opinion["created_at"],
                xp_gained=opinion_xp,
                title="Opinion shared",
                description=f"Shared an opinion on {article_title}",
                article_id=article_id,
                article_title=article_title,
                badge_id=None,
                badge_name=None,
                opinion_question_id=opinion.get("opinion_question_id"),
                opinion_text=opinion_text,
                share_path=(
                    f"/api/v1/articles/{article_id}/opinion/share"
                    f"?response_id={opinion['id']}"
                ),
            )
        )

    share_cards.sort(
        key=lambda item: item.created_at,
        reverse=True,
    )

    opinions_list.sort(
        key=lambda item: item.created_at,
        reverse=True,
    )

    # ---------------------------------------------------------
    # 10. Final aggregate response
    # ---------------------------------------------------------

    print(f"DEBUG GET MY PROFILE - USER {user_id}")
    print(f"DEBUG reading_progress: {reading_progress}")
    print(f"DEBUG opinions_list: {opinions_list}")

    return UserProfileAggregateResponse(
        user=user_profile,
        total_xp=total_xp,
        current_level=current_level,
        articles_completed=articles_completed,
        quiz_performance=quiz_performance,
        opinions_submitted=opinions_submitted,
        opinions=opinions_list,
        badges=badges,
        achievement_history=achievement_history,
        share_cards=share_cards,
        reading_history=reading_progress,
    )


@router.patch(
    "/me",
    response_model=UserProfileResponse,
)
async def update_me(
    payload: UserProfileUpdate,
    auth: AuthContext = Depends(get_current_user),
):
    updates = {}
    if payload.display_name is not None:
        name = payload.display_name.strip()
        if not name:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="display_name cannot be blank",
            )
        updates["display_name"] = name
    if payload.bio is not None:
        updates["bio"] = payload.bio.strip() or None

    if updates:
        (
            supabase_admin.table("profiles")
            .update(updates)
            .eq("id", str(auth.user.id))
            .execute()
        )

    profile_response = (
        supabase_admin.table("profiles")
        .select(PROFILE_SELECT)
        .eq("id", str(auth.user.id))
        .maybe_single()
        .execute()
    )
    if not profile_response or not profile_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found.",
        )
    return _to_user_profile(profile_response.data, auth.user.email)


@router.post(
    "/me/avatar",
    response_model=UserProfileResponse,
)
async def upload_my_avatar(
    file: UploadFile = File(...),
    auth: AuthContext = Depends(get_current_user),
):
    mime = (file.content_type or "").strip().lower()
    if not mime.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Avatar must be an image",
        )
    suffix = Path(file.filename or "avatar.jpg").suffix.lower() or ".jpg"
    storage_path = f"media/image/avatars/{auth.user.id}/{uuid4()}{suffix}"
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded file is empty",
        )
    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Avatar exceeds the 10 MB upload limit",
        )

    try:
        supabase_admin.storage.from_("article-media").upload(
            storage_path,
            file_bytes,
            {"content-type": mime, "upsert": "true"},
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Avatar storage upload failed") from exc

    media = (
        supabase_admin.table("media_assets")
        .insert(
            {
                "storage_path": storage_path,
                "media_type": "IMAGE",
                "mime_type": mime,
                "file_size": len(file_bytes),
                "uploaded_by": str(auth.user.id),
            }
        )
        .select("id")
        .execute()
    )
    if not media or not media.data:
        raise HTTPException(status_code=502, detail="Avatar metadata could not be persisted")
    media_id = media.data[0]["id"]
    (
        supabase_admin.table("profiles")
        .update({"avatar_media_id": media_id})
        .eq("id", str(auth.user.id))
        .execute()
    )
    profile_response = (
        supabase_admin.table("profiles")
        .select(PROFILE_SELECT)
        .eq("id", str(auth.user.id))
        .maybe_single()
        .execute()
    )
    if not profile_response or not profile_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found.",
        )
    return _to_user_profile(profile_response.data, auth.user.email)