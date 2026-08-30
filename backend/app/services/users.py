from uuid import UUID

from app.db.supabase import supabase
from app.services.gamification import get_my_gamification


def _resolve_article_title(article: dict | None) -> str | None:
    if not article:
        return None

    translations = article.get("article_translations") or []

    if isinstance(translations, dict):
        translations = [translations]

    for translation in translations:
        if translation.get("language_code") == "EN":
            title = translation.get("title")
            if title:
                return title

    for translation in translations:
        title = translation.get("title")
        if title:
            return title

    return None


def get_user_profile(user_id: UUID) -> dict | None:
    user_id_str = str(user_id)

    # ---------------------------------------------------------
    # 1. Profile
    # ---------------------------------------------------------

    profile_response = (
        supabase
        .table("profiles")
        .select(
            "id, email, display_name, avatar_media_id, "
            "role, is_active"
        )
        .eq("id", user_id_str)
        .maybe_single()
        .execute()
    )

    if not profile_response.data:
        return None

    profile = profile_response.data

    # ---------------------------------------------------------
    # 2. Gamification
    # ---------------------------------------------------------

    gamification = get_my_gamification(user_id)

    # ---------------------------------------------------------
    # 3. Article completions
    # ---------------------------------------------------------

    completions_response = (
        supabase
        .table("article_completions")
        .select(
            "article_id, completed_at, "
            "articles("
            "id, "
            "article_translations("
            "language_code, title"
            ")"
            ")"
        )
        .eq("user_id", user_id_str)
        .order("completed_at", desc=True)
        .execute()
    )

    completions = (
        completions_response.data or []
    )

    # ---------------------------------------------------------
    # 4. Quiz performance
    # ---------------------------------------------------------

    quiz_response = (
        supabase
        .table("quiz_attempts")
        .select("is_correct")
        .eq("user_id", user_id_str)
        .execute()
    )

    quiz_attempts = quiz_response.data or []

    quiz_count = len(quiz_attempts)

    correct_count = sum(
        1
        for attempt in quiz_attempts
        if attempt.get("is_correct") is True
    )

    incorrect_count = (
        quiz_count - correct_count
    )

    accuracy = (
        round(
            (correct_count / quiz_count) * 100,
            2,
        )
        if quiz_count
        else 0.0
    )

    # ---------------------------------------------------------
    # 5. Opinions submitted
    # ---------------------------------------------------------

    opinion_response = (
        supabase
        .table("opinion_responses")
        .select(
            "id, "
            "opinion_question_id, "
            "selected_option_id, "
            "custom_response, "
            "created_at, "
            "opinion_questions("
            "id, "
            "article_id, "
            "articles("
            "id, "
            "article_translations("
            "language_code, title"
            ")"
            ")"
            ")"
        )
        .eq("user_id", user_id_str)
        .order("created_at", desc=True)
        .execute()
    )

    opinions = (
        opinion_response.data or []
    )

    # ---------------------------------------------------------
    # 6. Resolve predefined opinion texts
    # ---------------------------------------------------------

    selected_option_ids = [
        str(opinion["selected_option_id"])
        for opinion in opinions
        if opinion.get("selected_option_id") is not None
    ]

    opinion_option_text_by_id: dict[str, str] = {}

    if selected_option_ids:
        options_response = (
            supabase
            .table("opinion_options")
            .select(
                "id, question_id, "
                "opinion_option_translations("
                "language_code, option_text"
                ")"
            )
            .in_("id", selected_option_ids)
            .execute()
        )

        options = options_response.data or []

        for option in options:
            translations = (
                option.get(
                    "opinion_option_translations"
                )
                or []
            )

            if isinstance(translations, dict):
                translations = [translations]

            option_text = None

            for translation in translations:
                if translation.get(
                    "language_code"
                ) == "EN":
                    option_text = translation.get(
                        "option_text"
                    )
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
    # 7. Achievement history
    # ---------------------------------------------------------

    achievement_history = []

    for completion in completions:
        article = completion.get("articles") or {}

        article_id = (
            article.get("id")
            or completion.get("article_id")
        )

        article_title = (
            _resolve_article_title(article)
            or "Article"
        )

        achievement_history.append(
            {
                "id": UUID(str(article_id)),
                "card_type": "ARTICLE_COMPLETION",
                "created_at": completion["completed_at"],
                "title": "Article completed",
                "description": (
                    f"Completed {article_title}"
                ),
                "article_id": article_id,
                "article_title": article_title,
                "badge_id": None,
                "badge_name": None,
                "opinion_question_id": None,
                "opinion_text": None,
                "share_path": (
                    f"/api/v1/articles/"
                    f"{article_id}/completion/share"
                ),
            }
        )

    for opinion in opinions:
        question = (
            opinion.get("opinion_questions")
            or {}
        )

        article_id = question.get("article_id")

        article = question.get("articles") or {}

        article_title = (
            _resolve_article_title(article)
            or "Article"
        )

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

        opinion_text = (
            opinion.get("custom_response")
            if opinion.get("custom_response") is not None
            else selected_option_text
        )

        achievement_history.append(
            {
                "id": UUID(str(opinion["id"])),
                "card_type": "OPINION",
                "created_at": opinion["created_at"],
                "title": "Opinion shared",
                "description": (
                    f"Shared an opinion on "
                    f"{article_title}"
                ),
                "article_id": article_id,
                "article_title": article_title,
                "badge_id": None,
                "badge_name": None,
                "opinion_question_id": opinion.get(
                    "opinion_question_id"
                ),
                "opinion_text": opinion_text,
                "share_path": (
                    f"/api/v1/articles/"
                    f"{article_id}/opinion/share"
                    f"?response_id={opinion['id']}"
                ),
            }
        )

    for badge in gamification["badges"]:
        achievement_history.append(
            {
                "id": badge["id"],
                "card_type": "BADGE",
                "created_at": badge["earned_at"],
                "title": badge["name"],
                "description": badge["description"],
                "article_id": None,
                "article_title": None,
                "badge_id": badge["id"],
                "badge_name": badge["name"],
                "opinion_question_id": None,
                "opinion_text": None,
                "share_path": None,
            }
        )

    achievement_history.sort(
        key=lambda item: item["created_at"],
        reverse=True,
    )

    # ---------------------------------------------------------
    # 8. Share cards
    #
    # Only records for which an actual sharing endpoint exists
    # are exposed here.
    # ---------------------------------------------------------

    share_cards = []

    for completion in completions:
        article_id = completion["article_id"]

        article = completion.get("articles") or {}

        article_title = (
            _resolve_article_title(article)
            or "Article"
        )

        share_cards.append(
            {
                "id": UUID(str(article_id)),
                "card_type": "ARTICLE_COMPLETION",
                "created_at": completion["completed_at"],
                "title": "Article completed",
                "description": (
                    f"Completed {article_title}"
                ),
                "article_id": article_id,
                "article_title": article_title,
                "badge_id": None,
                "badge_name": None,
                "opinion_question_id": None,
                "opinion_text": None,
                "share_path": (
                    f"/api/v1/articles/"
                    f"{article_id}/completion/share"
                ),
            }
        )

    for opinion in opinions:
        question = (
            opinion.get("opinion_questions")
            or {}
        )

        article_id = question.get("article_id")

        article = question.get("articles") or {}

        article_title = (
            _resolve_article_title(article)
            or "Article"
        )

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

        opinion_text = (
            opinion.get("custom_response")
            if opinion.get("custom_response") is not None
            else selected_option_text
        )

        share_cards.append(
            {
                "id": UUID(str(opinion["id"])),
                "card_type": "OPINION",
                "created_at": opinion["created_at"],
                "title": "Opinion shared",
                "description": (
                    f"Shared an opinion on "
                    f"{article_title}"
                ),
                "article_id": article_id,
                "article_title": article_title,
                "badge_id": None,
                "badge_name": None,
                "opinion_question_id": opinion.get(
                    "opinion_question_id"
                ),
                "opinion_text": opinion_text,
                "share_path": (
                    f"/api/v1/articles/"
                    f"{article_id}/opinion/share"
                    f"?response_id={opinion['id']}"
                ),
            }
        )

    share_cards.sort(
        key=lambda item: item["created_at"],
        reverse=True,
    )

    # ---------------------------------------------------------
    # 9. Assemble profile
    # ---------------------------------------------------------

    return {
        "id": profile["id"],
        "email": profile["email"],
        "display_name": profile.get("display_name"),
        "avatar_media_id": profile.get(
            "avatar_media_id"
        ),
        "role": profile["role"],
        "is_active": profile["is_active"],
        "total_xp": gamification["total_xp"],
        "level": gamification["level"],
        "articles_completed": len(completions),
        "quiz_performance": {
            "attempts": quiz_count,
            "correct": correct_count,
            "incorrect": incorrect_count,
            "accuracy_percentage": accuracy,
        },
        "opinions_submitted": len(opinions),
        "badges": gamification["badges"],
        "achievement_history": achievement_history,
        "share_cards": share_cards,
    }