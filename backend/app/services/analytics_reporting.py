from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from typing import Any


ARTICLE_VIEWED = "ARTICLE_VIEWED"
ADVERTISEMENT_CLICKED = "ADVERTISEMENT_CLICKED"
SHARE_CREATED = "SHARE_CREATED"


def _rows(response: Any) -> list[dict]:
    data = getattr(response, "data", None)
    if not data:
        return []

    if isinstance(data, list):
        return data

    if isinstance(data, dict):
        return [data]

    return []


def _execute_rows(query) -> list[dict]:
    return _rows(query.execute())


def _safe_str(value: Any) -> str | None:
    if value is None:
        return None

    return str(value)


def _translation_value(
    translations: Any,
    field_name: str,
) -> str | None:
    if not translations:
        return None

    if isinstance(translations, dict):
        translations = [translations]

    # Prefer English, case-insensitively.
    for translation in translations:
        language_code = str(
            translation.get("language_code", "")
        ).upper()

        if language_code == "EN":
            value = translation.get(field_name)

            if value:
                return str(value)

    # Fallback to first available translation.
    for translation in translations:
        value = translation.get(field_name)

        if value:
            return str(value)

    return None


def _article_title(article: dict) -> str | None:
    return _translation_value(
        article.get("article_translations"),
        "title",
    )


def _percentage(
    numerator: int,
    denominator: int,
) -> float:
    if denominator == 0:
        return 0.0

    return round(
        (numerator / denominator) * 100,
        2,
    )


def _event_key(value: Any) -> str | None:
    if value is None:
        return None

    return str(value)


def _build_event_maps(
    events: list[dict],
):
    article_views = defaultdict(int)
    article_view_users = defaultdict(set)

    advertisement_clicks = defaultdict(int)
    advertisement_click_users = defaultdict(set)

    user_views = defaultdict(int)
    user_shares = defaultdict(int)

    shares_by_article = defaultdict(int)

    recent_activity = []

    for event in events:
        event_type = event.get("event_type")
        user_id = _event_key(event.get("user_id"))
        article_id = _event_key(event.get("article_id"))
        source_type = event.get("source_type")
        source_id = _event_key(event.get("source_id"))

        if event_type == ARTICLE_VIEWED:
            if article_id is not None:
                article_views[article_id] += 1

                if user_id is not None:
                    article_view_users[
                        article_id
                    ].add(user_id)

            if user_id is not None:
                user_views[user_id] += 1

        elif event_type == ADVERTISEMENT_CLICKED:
            if source_id is not None:
                advertisement_clicks[source_id] += 1

                if user_id is not None:
                    advertisement_click_users[
                        source_id
                    ].add(user_id)

        elif event_type == SHARE_CREATED:
            if article_id is not None:
                shares_by_article[article_id] += 1

            if user_id is not None:
                user_shares[user_id] += 1

        recent_activity.append(event)

    return (
        article_views,
        article_view_users,
        advertisement_clicks,
        advertisement_click_users,
        user_views,
        user_shares,
        shares_by_article,
        recent_activity,
    )


def _load_profiles(client) -> list[dict]:
    query = (
        client
        .table("profiles")
        .select(
            """
            id,
            email,
            display_name,
            is_active
            """
        )
    )

    return _execute_rows(query)


def _load_articles(client) -> list[dict]:
    query = (
        client
        .table("articles")
        .select(
            """
            id,
            category_id,
            article_translations(
                language_code,
                title
            ),
            categories(
                id,
                name
            )
            """
        )
    )

    return _execute_rows(query)


def _load_events(client) -> list[dict]:
    query = (
        client
        .table("analytics_events")
        .select(
            """
            id,
            event_type,
            user_id,
            article_id,
            source_type,
            source_id,
            metadata,
            created_at
            """
        )
        .order(
            "created_at",
            desc=True,
        )
    )

    return _execute_rows(query)


def _load_completions(client) -> list[dict]:
    query = (
        client
        .table("article_completions")
        .select(
            """
            user_id,
            article_id,
            completed_at
            """
        )
    )

    return _execute_rows(query)


def _load_quiz_attempts(client) -> list[dict]:
    query = (
        client
        .table("quiz_attempts")
        .select(
            """
            user_id,
            question_id,
            is_correct,
            created_at
            """
        )
    )

    return _execute_rows(query)


def _load_quiz_questions(client) -> list[dict]:
    query = (
        client
        .table("quiz_questions")
        .select(
            """
            id,
            quiz_id,
            quizzes(
                article_id
            )
            """
        )
    )

    return _execute_rows(query)


def _load_opinions(client) -> list[dict]:
    query = (
        client
        .table("opinion_responses")
        .select(
            """
            id,
            user_id,
            opinion_question_id,
            created_at
            """
        )
    )

    return _execute_rows(query)


def _load_opinion_questions(client) -> list[dict]:
    query = (
        client
        .table("opinion_questions")
        .select(
            """
            id,
            article_id
            """
        )
    )

    return _execute_rows(query)


def _load_comments(client) -> list[dict]:
    query = (
        client
        .table("comments")
        .select(
            """
            id,
            user_id,
            article_id,
            created_at
            """
        )
    )

    return _execute_rows(query)


def _load_xp_transactions(client) -> list[dict]:
    query = (
        client
        .table("xp_transactions")
        .select(
            """
            user_id,
            amount
            """
        )
    )

    return _execute_rows(query)


def _load_advertisements(client) -> list[dict]:
    query = (
        client
        .table("advertisements")
        .select(
            """
            id,
            title,
            slot:advertisement_slots(
                key
            )
            """
        )
    )

    return _execute_rows(query)


def _quiz_article_map(
    quiz_questions: list[dict],
) -> dict[str, str]:
    mapping: dict[str, str] = {}

    for question in quiz_questions:
        question_id = _event_key(
            question.get("id")
        )

        quiz = question.get("quizzes") or {}

        article_id = _event_key(
            quiz.get("article_id")
        )

        if question_id and article_id:
            mapping[question_id] = article_id

    return mapping


def _opinion_article_map(
    opinion_questions: list[dict],
) -> dict[str, str]:
    mapping: dict[str, str] = {}

    for question in opinion_questions:
        question_id = _event_key(
            question.get("id")
        )

        article_id = _event_key(
            question.get("article_id")
        )

        if question_id and article_id:
            mapping[question_id] = article_id

    return mapping


def build_dashboard(
    *,
    client,
    top_articles_limit: int = 10,
    top_categories_limit: int = 10,
    top_users_limit: int = 10,
) -> dict:
    """
    Build the V1 Superadmin analytics dashboard.

    Reporting is intentionally calculated from existing product
    data and the append-only analytics event stream.

    This is not intended to be a BI/data-warehouse layer.
    """

    profiles = _load_profiles(client)
    articles = _load_articles(client)
    events = _load_events(client)

    completions = _load_completions(client)

    quiz_attempts = _load_quiz_attempts(client)
    quiz_questions = _load_quiz_questions(client)

    opinions = _load_opinions(client)
    opinion_questions = _load_opinion_questions(client)

    comments = _load_comments(client)

    xp_transactions = _load_xp_transactions(client)

    advertisements = _load_advertisements(client)

    (
        article_views,
        article_view_users,
        advertisement_clicks,
        advertisement_click_users,
        user_views,
        user_shares,
        shares_by_article,
        recent_activity,
    ) = _build_event_maps(events)

    # ---------------------------------------------------------
    # Article / quiz / opinion / comment aggregation
    # ---------------------------------------------------------

    completion_counts = defaultdict(int)
    completion_users = defaultdict(set)

    for completion in completions:
        article_id = _event_key(
            completion.get("article_id")
        )
        user_id = _event_key(
            completion.get("user_id")
        )

        if article_id:
            completion_counts[article_id] += 1

            if user_id:
                completion_users[article_id].add(
                    user_id
                )

    quiz_article_map = _quiz_article_map(
        quiz_questions
    )

    quiz_attempt_counts = defaultdict(int)
    quiz_correct_counts = defaultdict(int)

    user_quiz_attempts = defaultdict(int)
    user_quiz_correct = defaultdict(int)

    article_quiz_attempts = defaultdict(int)
    article_quiz_correct = defaultdict(int)

    for attempt in quiz_attempts:
        question_id = _event_key(
            attempt.get("question_id")
        )

        user_id = _event_key(
            attempt.get("user_id")
        )

        article_id = quiz_article_map.get(
            question_id
        )

        quiz_attempt_counts[
            article_id
        ] += 1 if article_id else 0

        if article_id and attempt.get("is_correct"):
            quiz_correct_counts[article_id] += 1

        if user_id:
            user_quiz_attempts[user_id] += 1

            if attempt.get("is_correct"):
                user_quiz_correct[user_id] += 1

        if article_id:
            article_quiz_attempts[article_id] += 1

            if attempt.get("is_correct"):
                article_quiz_correct[article_id] += 1

    opinion_article_map = _opinion_article_map(
        opinion_questions
    )

    opinion_counts = defaultdict(int)

    user_opinion_counts = defaultdict(int)
    article_opinion_counts = defaultdict(int)

    for opinion in opinions:
        question_id = _event_key(
            opinion.get("opinion_question_id")
        )

        user_id = _event_key(
            opinion.get("user_id")
        )

        article_id = opinion_article_map.get(
            question_id
        )

        if user_id:
            user_opinion_counts[user_id] += 1

        if article_id:
            opinion_counts[article_id] += 1
            article_opinion_counts[article_id] += 1

    comment_counts = defaultdict(int)
    user_comment_counts = defaultdict(int)

    for comment in comments:
        article_id = _event_key(
            comment.get("article_id")
        )

        user_id = _event_key(
            comment.get("user_id")
        )

        if article_id:
            comment_counts[article_id] += 1

        if user_id:
            user_comment_counts[user_id] += 1

    # ---------------------------------------------------------
    # XP aggregation
    # ---------------------------------------------------------

    user_xp = defaultdict(int)

    for transaction in xp_transactions:
        user_id = _event_key(
            transaction.get("user_id")
        )

        if user_id:
            user_xp[user_id] += int(
                transaction.get("amount") or 0
            )

    # ---------------------------------------------------------
    # Overview
    # ---------------------------------------------------------

    total_users = len(profiles)

    active_users = sum(
        1
        for profile in profiles
        if profile.get("is_active", True)
    )

    total_article_views = sum(
        article_views.values()
    )

    unique_article_readers = len(
        {
            user_id
            for readers in article_view_users.values()
            for user_id in readers
        }
    )

    quiz_attempt_total = len(quiz_attempts)

    quiz_correct_total = sum(
        1
        for attempt in quiz_attempts
        if attempt.get("is_correct")
    )

    advertisement_click_total = sum(
        advertisement_clicks.values()
    )

    overview = {
        "total_users": total_users,
        "active_users": active_users,
        "total_article_views": total_article_views,
        "unique_article_readers": unique_article_readers,
        "articles_completed": len(completions),
        "quiz_attempts": quiz_attempt_total,
        "quiz_correct_attempts": quiz_correct_total,
        "quiz_success_rate": _percentage(
            quiz_correct_total,
            quiz_attempt_total,
        ),
        "opinions_submitted": len(opinions),
        "comments_created": len(comments),
        "shares_created": sum(
            1
            for event in events
            if event.get("event_type")
            == SHARE_CREATED
        ),
        "advertisement_clicks": (
            advertisement_click_total
        ),
    }

    # ---------------------------------------------------------
    # Article reporting
    # ---------------------------------------------------------

    article_rows = []

    for article in articles:
        article_id = _event_key(
            article.get("id")
        )

        if article_id is None:
            continue

        category = article.get("categories") or {}

        views = article_views.get(
            article_id,
            0,
        )

        unique_readers = len(
            article_view_users.get(
                article_id,
                set(),
            )
        )

        completions_for_article = (
            completion_counts.get(
                article_id,
                0,
            )
        )

        attempts_for_article = (
            article_quiz_attempts.get(
                article_id,
                0,
            )
        )

        correct_for_article = (
            article_quiz_correct.get(
                article_id,
                0,
            )
        )

        article_rows.append(
            {
                "article_id": article_id,
                "title": _article_title(article),
                "category_id": _safe_str(
                    article.get("category_id")
                ),
                "category_name": category.get(
                    "name"
                ),
                "views": views,
                "unique_readers": unique_readers,
                "completions": (
                    completions_for_article
                ),
                "quiz_attempts": (
                    attempts_for_article
                ),
                "quiz_correct_attempts": (
                    correct_for_article
                ),
                "quiz_success_rate": _percentage(
                    correct_for_article,
                    attempts_for_article,
                ),
                "opinion_responses": (
                    article_opinion_counts.get(
                        article_id,
                        0,
                    )
                ),
                "comments": comment_counts.get(
                    article_id,
                    0,
                ),
                "shares": shares_by_article.get(
                    article_id,
                    0,
                ),
            }
        )

    article_rows.sort(
        key=lambda item: (
            item["views"],
            item["completions"],
        ),
        reverse=True,
    )

    top_articles = article_rows[
        :top_articles_limit
    ]

    # ---------------------------------------------------------
    # Category reporting
    # ---------------------------------------------------------

    category_metrics = defaultdict(
        lambda: {
            "article_views": 0,
            "unique_users": set(),
            "article_completions": 0,
        }
    )

    category_names: dict[str, str] = {}

    for article in articles:
        article_id = _event_key(
            article.get("id")
        )

        category_id = _event_key(
            article.get("category_id")
        )

        category = article.get("categories") or {}

        if not article_id or not category_id:
            continue

        category_name = category.get("name")

        if category_name:
            category_names[
                category_id
            ] = str(category_name)

        category_metrics[
            category_id
        ]["article_views"] += article_views.get(
            article_id,
            0,
        )

        category_metrics[
            category_id
        ]["unique_users"].update(
            article_view_users.get(
                article_id,
                set(),
            )
        )

        category_metrics[
            category_id
        ]["article_completions"] += (
            completion_counts.get(
                article_id,
                0,
            )
        )

    category_rows = []

    for category_id, metrics in category_metrics.items():
        category_rows.append(
            {
                "category_id": category_id,
                "category_name": category_names.get(
                    category_id,
                    "Category",
                ),
                "article_views": metrics[
                    "article_views"
                ],
                "unique_readers": len(
                    metrics["unique_users"]
                ),
                "article_completions": metrics[
                    "article_completions"
                ],
            }
        )

    category_rows.sort(
        key=lambda item: (
            item["article_views"],
            item["article_completions"],
        ),
        reverse=True,
    )

    popular_categories = category_rows[
        :top_categories_limit
    ]

    # ---------------------------------------------------------
    # User engagement
    # ---------------------------------------------------------

    user_metrics = defaultdict(
        lambda: {
            "article_views": 0,
            "articles_completed": 0,
            "quiz_attempts": 0,
            "quiz_correct_attempts": 0,
            "opinions_submitted": 0,
            "comments_created": 0,
            "shares_created": 0,
            "total_xp": 0,
        }
    )

    for user_id, count in user_views.items():
        user_metrics[user_id][
            "article_views"
        ] = count

    for completion in completions:
        user_id = _event_key(
            completion.get("user_id")
        )

        if user_id:
            user_metrics[user_id][
                "articles_completed"
            ] += 1

    for user_id, count in user_quiz_attempts.items():
        user_metrics[user_id][
            "quiz_attempts"
        ] = count

    for user_id, count in user_quiz_correct.items():
        user_metrics[user_id][
            "quiz_correct_attempts"
        ] = count

    for user_id, count in user_opinion_counts.items():
        user_metrics[user_id][
            "opinions_submitted"
        ] = count

    for user_id, count in user_comment_counts.items():
        user_metrics[user_id][
            "comments_created"
        ] = count

    for user_id, count in user_shares.items():
        user_metrics[user_id][
            "shares_created"
        ] = count

    for user_id, amount in user_xp.items():
        user_metrics[user_id][
            "total_xp"
        ] = amount

    # Include users with no activity.
    for profile in profiles:
        user_id = _event_key(
            profile.get("id")
        )

        if user_id:
            user_metrics[user_id]

    profile_by_id = {
        _event_key(profile.get("id")): profile
        for profile in profiles
        if profile.get("id") is not None
    }

    user_rows = []

    for user_id, metrics in user_metrics.items():
        profile = profile_by_id.get(
            user_id,
            {},
        )

        user_rows.append(
            {
                "user_id": user_id,
                "display_name": profile.get(
                    "display_name"
                ),
                "email": profile.get("email"),
                "article_views": metrics[
                    "article_views"
                ],
                "articles_completed": metrics[
                    "articles_completed"
                ],
                "quiz_attempts": metrics[
                    "quiz_attempts"
                ],
                "quiz_correct_attempts": metrics[
                    "quiz_correct_attempts"
                ],
                "opinions_submitted": metrics[
                    "opinions_submitted"
                ],
                "comments_created": metrics[
                    "comments_created"
                ],
                "shares_created": metrics[
                    "shares_created"
                ],
                "total_xp": metrics[
                    "total_xp"
                ],
            }
        )

    user_rows.sort(
        key=lambda item: (
            item["total_xp"],
            item["article_views"],
            item["articles_completed"],
            item["quiz_correct_attempts"],
        ),
        reverse=True,
    )

    most_engaged_users = user_rows[
        :top_users_limit
    ]

    # ---------------------------------------------------------
    # Advertisement reporting
    # ---------------------------------------------------------

    advertisement_rows = []

    for advertisement in advertisements:
        advertisement_id = _event_key(
            advertisement.get("id")
        )

        if advertisement_id is None:
            continue

        slot = advertisement.get("slot") or {}

        advertisement_rows.append(
            {
                "advertisement_id": advertisement_id,
                "title": str(
                    advertisement.get("title")
                    or ""
                ),
                "slot_key": slot.get("key"),
                "clicks": advertisement_clicks.get(
                    advertisement_id,
                    0,
                ),
                "unique_clickers": len(
                    advertisement_click_users.get(
                        advertisement_id,
                        set(),
                    )
                ),
            }
        )

    advertisement_rows.sort(
        key=lambda item: (
            item["clicks"],
            item["unique_clickers"],
        ),
        reverse=True,
    )

    # ---------------------------------------------------------
    # Recent activity
    # ---------------------------------------------------------

    recent_activity_rows = []

    for event in recent_activity[:50]:
        created_at = event.get("created_at")

        if isinstance(created_at, str):
            try:
                created_at = datetime.fromisoformat(
                    created_at.replace(
                        "Z",
                        "+00:00",
                    )
                )
            except ValueError:
                pass

        recent_activity_rows.append(
            {
                "id": _safe_str(
                    event.get("id")
                ),
                "event_type": str(
                    event.get("event_type")
                    or ""
                ),
                "user_id": _safe_str(
                    event.get("user_id")
                ),
                "article_id": _safe_str(
                    event.get("article_id")
                ),
                "source_type": event.get(
                    "source_type"
                ),
                "source_id": _safe_str(
                    event.get("source_id")
                ),
                "metadata": (
                    event.get("metadata")
                    if isinstance(
                        event.get("metadata"),
                        dict,
                    )
                    else {}
                ),
                "created_at": created_at,
            }
        )

    return {
        "overview": overview,
        "top_articles": top_articles,
        "popular_categories": popular_categories,
        "most_engaged_users": most_engaged_users,
        "advertisements": advertisement_rows,
        "recent_activity": recent_activity_rows,
    }