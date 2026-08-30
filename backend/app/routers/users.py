from uuid import UUID

from fastapi import APIRouter, Depends

from app.dependencies.auth import AuthContext, get_current_user
from app.schemas.user import (
    UserProfileAchievementResponse,
    UserProfileAggregateResponse,
    UserProfileBadgeResponse,
    UserProfileLevelResponse,
    UserProfileQuizPerformanceResponse,
    UserProfileReadingProgressResponse,
    UserProfileResponse,
    UserProfileShareCardResponse,
)

router = APIRouter(
    prefix="/api/v1/users",
    tags=["Users"],
)


def _resolve_article_title(article: dict | None) -> str | None:
    if not article:
        return None

    translations = article.get("article_translations") or []

    if isinstance(translations, dict):
        translations = [translations]

    # Prefer English.
    for translation in translations:
        if translation.get("language_code") == "EN":
            title = translation.get("title")
            if title:
                return title

    # Fall back to first available translation.
    for translation in translations:
        title = translation.get("title")
        if title:
            return title

    return None


def _resolve_opinion_text(
    response: dict,
    option_text: str | None,
) -> str | None:
    custom_response = response.get("custom_response")

    if custom_response is not None:
        return custom_response

    return option_text


@router.get(
    "/me",
    response_model=UserProfileResponse,
)
async def get_me(
    auth: AuthContext = Depends(get_current_user),
):
    profile = auth.profile

    return UserProfileResponse(
        id=profile["id"],
        email=profile["email"],
        display_name=profile.get("display_name"),
        avatar_media_id=profile.get("avatar_media_id"),
        role=profile["role"],
        is_active=profile["is_active"],
    )


@router.get(
    "/me/profile",
    response_model=UserProfileAggregateResponse,
)
async def get_my_profile(
    auth: AuthContext = Depends(get_current_user),
):
    client = auth.client
    user_id = str(auth.user.id)

    # ---------------------------------------------------------
    # 1. Profile identity
    # ---------------------------------------------------------

    profile_response = (
        client.table("profiles")
        .select(
            "id, email, display_name, avatar_media_id, role, is_active"
        )
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )

    profile = auth.profile

    if (
        profile_response
        and isinstance(profile_response.data, dict)
    ):
        profile = profile_response.data

    user_profile = UserProfileResponse(
        id=profile["id"],
        email=profile["email"],
        display_name=profile.get("display_name"),
        avatar_media_id=profile.get("avatar_media_id"),
        role=profile["role"],
        is_active=profile["is_active"],
    )

    # ---------------------------------------------------------
    # 2. Gamification
    # ---------------------------------------------------------

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

    transactions = (
        transactions_response.data
        if (
            transactions_response
            and isinstance(transactions_response.data, list)
        )
        else []
    )

    total_xp = sum(
        transaction["amount"]
        for transaction in transactions
    )

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

    current_level = None

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

    badges: list[UserProfileBadgeResponse] = []

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

    # ---------------------------------------------------------
    # 3. Article completions
    #
    # Every article completion is a historical share card.
    #
    # This covers:
    #   - standard articles
    #   - quiz articles
    #   - opinion articles after completion
    # ---------------------------------------------------------

    completions_response = (
        client.table("article_completions")
        .select(
            "article_id, completed_at, "
            "articles("
            "id, "
            "article_translations(language_code, title)"
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

    articles_completed = len(completions)

    # ---------------------------------------------------------
    # 4. Quiz performance
    # ---------------------------------------------------------

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

    total_attempts = len(quiz_attempts)

    correct_attempts = sum(
        1
        for attempt in quiz_attempts
        if attempt.get("is_correct") is True
    )

    incorrect_attempts = (
        total_attempts - correct_attempts
    )

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
    #
    # Retrieve the article and question information because
    # historical opinion cards need enough information for the
    # frontend to display the card without losing context.
    # ---------------------------------------------------------

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
            "opinion_question_translations("
            "language_code, "
            "question_text"
            "), "
            "articles("
            "id, "
            "article_translations("
            "language_code, "
            "title"
            ")"
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

    opinions_submitted = len(opinions)

    # ---------------------------------------------------------
    # 6. Resolve selected opinion option text
    #
    # We intentionally resolve each selected option using the
    # question_id as an ownership boundary.
    # ---------------------------------------------------------

    opinion_option_text_by_id: dict[str, str] = {}

    selected_option_ids = [
        str(opinion["selected_option_id"])
        for opinion in opinions
        if opinion.get("selected_option_id") is not None
    ]

    if selected_option_ids:
        options_response = (
            client.table("opinion_options")
            .select(
                "id, question_id, "
                "opinion_option_translations("
                "language_code, option_text"
                ")"
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
            translations = (
                option.get("opinion_option_translations")
                or []
            )

            if isinstance(translations, dict):
                translations = [translations]

            option_text = None

            for translation in translations:
                if translation.get("language_code") == "EN":
                    option_text = translation.get("option_text")
                    break

            if option_text is None and translations:
                option_text = translations[0].get(
                    "option_text"
                )

            if option_text:
                opinion_option_text_by_id[
                    str(option["id"])
                ] = option_text

    # ---------------------------------------------------------
    # 7. Reading history / progress
    # ---------------------------------------------------------

    progress_response = (
        client.table("reading_progress")
        .select(
            "article_id, progress_percentage, "
            "last_block_id, last_position, "
            "started_at, last_read_at, completed_at"
        )
        .eq("user_id", user_id)
        .order("last_read_at", desc=True)
        .execute()
    )

    reading_progress = []

    progress_items = (
        progress_response.data
        if (
            progress_response
            and isinstance(progress_response.data, list)
        )
        else []
    )

    for item in progress_items:
        reading_progress.append(
            UserProfileReadingProgressResponse(
                article_id=item["article_id"],
                progress_percentage=item[
                    "progress_percentage"
                ],
                last_block_id=item.get("last_block_id"),
                last_position=item.get("last_position"),
                started_at=item["started_at"],
                last_read_at=item["last_read_at"],
                completed_at=item.get("completed_at"),
            )
        )

    # ---------------------------------------------------------
    # 8. Achievement history
    #
    # This remains the general activity/gamification history.
    # Share cards are maintained separately below.
    # ---------------------------------------------------------

    achievement_history: list[
        UserProfileAchievementResponse
    ] = []

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
    # 9. Historical share cards
    #
    # These are the cards the frontend can expose under:
    #
    #       My Share Cards
    #
    # A card does NOT store a generated image.
    #
    # The durable database record is the source of truth.
    # The frontend can request the corresponding share payload
    # whenever the user opens/shares the card.
    # ---------------------------------------------------------

    share_cards: list[
        UserProfileShareCardResponse
    ] = []

    # ---------------------------------------------------------
    # 9A. Article completion cards
    # ---------------------------------------------------------

    for completion in completions:
        article_id = completion["article_id"]

        article = completion.get("articles") or {}

        article_title = _resolve_article_title(article)

        if not article_title:
            article_title = "Article"

        share_cards.append(
            UserProfileShareCardResponse(
                id=UUID(str(article_id)),
                card_type="ARTICLE_COMPLETION",
                created_at=completion["completed_at"],
                title="Article completed",
                description=(
                    f"Completed {article_title}"
                ),
                article_id=article_id,
                article_title=article_title,
                badge_id=None,
                badge_name=None,
                opinion_question_id=None,
                opinion_text=None,
                share_path=(
                    f"/api/v1/articles/"
                    f"{article_id}/completion/share"
                ),
            )
        )

    # ---------------------------------------------------------
    # 9B. Opinion cards
    #
    # IMPORTANT:
    # The share path includes the historical opinion response
    # ID. Therefore opening an older card retrieves THAT opinion,
    # rather than whichever response happens to be latest.
    # ---------------------------------------------------------

    for opinion in opinions:
        question = (
            opinion.get("opinion_questions")
            or {}
        )

        article_id = question.get("article_id")

        article = question.get("articles") or {}

        article_title = _resolve_article_title(article)

        if not article_title:
            article_title = "Article"

        selected_option_id = opinion.get(
            "selected_option_id"
        )

        selected_option_text = None

        if selected_option_id is not None:
            selected_option_text = (
                opinion_option_text_by_id.get(
                    str(selected_option_id)
                )
            )

        opinion_text = _resolve_opinion_text(
            opinion,
            selected_option_text,
        )

        share_cards.append(
            UserProfileShareCardResponse(
                id=UUID(str(opinion["id"])),
                card_type="OPINION",
                created_at=opinion["created_at"],
                title="Opinion shared",
                description=(
                    f"Shared an opinion on "
                    f"{article_title}"
                ),
                article_id=article_id,
                article_title=article_title,
                badge_id=None,
                badge_name=None,
                opinion_question_id=opinion.get(
                    "opinion_question_id"
                ),
                opinion_text=opinion_text,
                share_path=(
                    f"/api/v1/articles/"
                    f"{article_id}/opinion/share"
                    f"?response_id={opinion['id']}"
                ),
            )
        )

    # ---------------------------------------------------------
    # 9C. Badge cards
    #
    # Badges are retained in achievement history and exposed
    # through the profile's badge collection.
    #
    # They are not included here because the currently
    # implemented sharing API has no badge-share endpoint.
    # ---------------------------------------------------------

    share_cards.sort(
        key=lambda item: item.created_at,
        reverse=True,
    )

    # ---------------------------------------------------------
    # 10. Final aggregate response
    # ---------------------------------------------------------

    return UserProfileAggregateResponse(
        user=user_profile,
        total_xp=total_xp,
        current_level=current_level,
        articles_completed=articles_completed,
        quiz_performance=quiz_performance,
        opinions_submitted=opinions_submitted,
        badges=badges,
        achievement_history=achievement_history,
        share_cards=share_cards,
        reading_history=reading_progress,
    )