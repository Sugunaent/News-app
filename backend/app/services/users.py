from uuid import UUID

from app.services.gamification import get_my_gamification
from app.db.supabase import supabase

def get_user_profile(user_id: UUID) -> dict:
user_id_str = str(user_id)

```
# ---------------------------------------------------------
# 1. Profile
# ---------------------------------------------------------
profile_response = (
    supabase
    .table("profiles")
    .select(
        "id, email, display_name, avatar_media_id, role, is_active"
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
        "id, category_id, "
        "article_translations(title)"
        ")"
    )
    .eq("user_id", user_id_str)
    .order("completed_at", desc=True)
    .execute()
)

completions = completions_response.data or []

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
    1 for attempt in quiz_attempts
    if attempt.get("is_correct") is True
)

accuracy = (
    round((correct_count / quiz_count) * 100, 2)
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
        "id, opinion_question_id, selected_option_id, "
        "custom_response, created_at, "
        "opinion_questions("
        "article_id"
        ")"
    )
    .eq("user_id", user_id_str)
    .order("created_at", desc=True)
    .execute()
)

opinions = opinion_response.data or []

# ---------------------------------------------------------
# 6. Achievement/share-card history
#
# Cards are generated from durable records. Nothing is
# persisted separately, so cards remain available whenever
# the underlying achievement exists.
# ---------------------------------------------------------
achievement_history = []

for completion in completions:
    article = completion.get("articles") or {}

    article_id = article.get("id") or completion.get("article_id")

    title = None
    translations = article.get("article_translations") or []

    if isinstance(translations, list) and translations:
        title = translations[0].get("title")

    if not title:
        title = "Article"

    achievement_history.append(
        {
            "id": UUID(str(article_id)),
            "card_type": "ARTICLE_COMPLETION",
            "created_at": completion["completed_at"],
            "title": "Article completed",
            "description": f"Completed {title}",
            "article_id": article_id,
            "article_title": title,
            "badge_id": None,
            "badge_name": None,
            "opinion_question_id": None,
            "opinion_text": None,
        }
    )

for opinion in opinions:
    question = opinion.get("opinion_questions") or {}

    article_id = question.get("article_id")

    opinion_text = (
        opinion.get("custom_response")
        if opinion.get("custom_response") is not None
        else None
    )

    achievement_history.append(
        {
            "id": UUID(str(opinion["id"])),
            "card_type": "OPINION",
            "created_at": opinion["created_at"],
            "title": "Opinion shared",
            "description": "Shared an opinion on an article",
            "article_id": article_id,
            "article_title": None,
            "badge_id": None,
            "badge_name": None,
            "opinion_question_id": opinion.get(
                "opinion_question_id"
            ),
            "opinion_text": opinion_text,
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
        }
    )

achievement_history.sort(
    key=lambda item: item["created_at"],
    reverse=True,
)

# ---------------------------------------------------------
# 7. Assemble profile
# ---------------------------------------------------------
return {
    "id": profile["id"],
    "email": profile["email"],
    "display_name": profile.get("display_name"),
    "avatar_media_id": profile.get("avatar_media_id"),
    "role": profile["role"],
    "is_active": profile["is_active"],
    "total_xp": gamification["total_xp"],
    "level": gamification["level"],
    "articles_completed": len(completions),
    "quiz_performance": {
        "attempts": quiz_count,
        "correct": correct_count,
        "accuracy_percentage": accuracy,
    },
    "opinions_submitted": len(opinions),
    "badges": gamification["badges"],
    "achievement_history": achievement_history,
}
```
