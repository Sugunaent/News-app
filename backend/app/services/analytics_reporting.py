from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from uuid import UUID

from app.db.supabase import supabase


def _rows(response) -> list[dict]:
    data = getattr(response, "data", None)

    if not data:
        return []

    if isinstance(data, dict):
        return [data]

    return list(data)


def _percentage(correct: int, total: int) -> float:
    if total <= 0:
        return 0.0

    return round((correct / total) * 100, 2)


def _safe_int(value) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def _get_users(client) -> list[dict]:
    response = (
        client
        .table("profiles")
        .select("id, display_name")
        .execute()
    )

    return _rows(response)


def _get_articles(client) -> list[dict]:
    response = (
        client
        .table("articles")
        .select(
            """
            id,
            category_id,
            article_translations (
                language_code,
                title
            ),
            categories (
                id,
                name
            )
            """
        )
        .execute()
    )

    return _rows(response)


def _get_events(client) -> list[dict]:
    response = (
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
        .order("created_at", desc=True)
        .execute()
    )

    return _rows(response)


def _get_completions(client) -> list[dict]:
    response = (
        client
        .table("article_completions")
        .select(
            "user_id, article_id, completed_at"
        )
        .execute()
    )

    return _rows(response)


def _get_quiz_attempts(client) -> list[dict]:
    response = (
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
        .execute()
    )

    return _rows(response)


def _get_opinion_responses(client) -> list[dict]:
    response = (
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
        .execute()
    )

    return _rows(response)


def _get_comments(client) -> list[dict]:
    """
    Comments are already part of the implemented backend.

    We deliberately retrieve only fields needed for analytics.
    """

    response = (
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
        .execute()
    )

    return _rows(response)


def _get_xp_transactions(client) -> list[dict]:
    response = (
        client
        .table("xp_transactions")
        .select(
            """
            user_id,
            amount
            """
        )
        .execute()
    )

    return _rows(response)


def _get_advertisements(client) -> list[dict]:
    response = (
        client
        .table("advertisements")
        .select(
            """
            id,
            title,
            slot:advertisement_slots (
                key
            )
            """
        )
        .execute()
    )

    return _rows(response)


def build_dashboard(
    *,
    client=None,
    top_articles_limit: int = 10,
    top_categories_limit: int = 10,
    top_users_limit: int = 10,
) -> dict:
    """
    Build the complete V1 Superadmin analytics dashboard.

    This intentionally performs aggregation in the application
    layer rather than introducing a warehouse or a complex
    analytics infrastructure.
    """

    db = client or supabase

    users = _get_users(db)
    articles = _get_articles(db)
    events = _get_events(db)
    completions = _get_completions(db)
    quiz_attempts = _get_quiz_attempts(db)
    opinions = _get_opinion_responses(db)
    comments = _get_comments(db)
    xp_transactions = _get_xp_transactions(db)
    advertisements = _get_advertisements(db)

    # ---------------------------------------------------------
    # USERS
    # ---------------------------------------------------------

    user_ids = {
        str(user["id"])
        for user in users
        if user.get("id")
    }

    total_users = len(users)

    # Users with activity during the last 30 days.
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)

    active_user_ids: set[str] = set()

    for event in events:
        user_id = event.get("user_id")
        created_at = event.get("created_at")

        if not user_id or not created_at:
            continue

        try:
            timestamp = datetime.fromisoformat(
                str(created_at).replace("Z", "+00:00")
            )
        except ValueError:
            continue

        if timestamp >= cutoff:
            active_user_ids.add(str(user_id))

    active_users = len(active_user_ids)

    # ---------------------------------------------------------
    # ARTICLES
    # ---------------------------------------------------------

    article_by_id = {
        str(article["id"]): article
        for article in articles
        if article.get("id")
    }

    article_views = Counter()
    article_unique_readers: dict[str, set[str]] = defaultdict(set)

    shares_by_article = Counter()
    comments_by_article = Counter()
    opinions_by_article = Counter()

    for event in events:
        event_type = event.get("event_type")
        article_id = event.get("article_id")

        if not article_id:
            continue

        article_id = str(article_id)

        if event_type == "ARTICLE_VIEWED":
            article_views[article_id] += 1

            if event.get("user_id"):
                article_unique_readers[article_id].add(
                    str(event["user_id"])
                )

        elif event_type == "SHARE_CREATED":
            shares_by_article[article_id] += 1

    for comment in comments:
        if comment.get("article_id"):
            comments_by_article[
                str(comment["article_id"])
            ] += 1

    # ---------------------------------------------------------
    # COMPLETIONS
    # ---------------------------------------------------------

    completions_by_article = Counter()

    for completion in completions:
        article_id = completion.get("article_id")

        if article_id:
            completions_by_article[
                str(article_id)
            ] += 1

    total_completions = len(completions)

    # ---------------------------------------------------------
    # QUIZZES
    # ---------------------------------------------------------

    quiz_attempts_by_article = Counter()
    quiz_correct_by_article = Counter()

    total_quiz_attempts = len(quiz_attempts)
    total_quiz_correct = 0

    # question -> article lookup
    question_to_article: dict[str, str] = {}

    question_response = (
        db
        .table("quiz_questions")
        .select("id, quiz_id, quizzes(article_id)")
        .execute()
    )

    for question in _rows(question_response):
        question_id = question.get("id")
        quiz = question.get("quizzes") or {}

        if isinstance(quiz, list):
            quiz = quiz[0] if quiz else {}

        article_id = quiz.get("article_id")

        if question_id and article_id:
            question_to_article[str(question_id)] = str(
                article_id
            )

    for attempt in quiz_attempts:
        question_id = attempt.get("question_id")

        if not question_id:
            continue

        article_id = question_to_article.get(
            str(question_id)
        )

        if not article_id:
            continue

        quiz_attempts_by_article[article_id] += 1

        if attempt.get("is_correct"):
            quiz_correct_by_article[article_id] += 1
            total_quiz_correct += 1

    # ---------------------------------------------------------
    # OPINIONS
    # ---------------------------------------------------------

    question_to_opinion_article: dict[str, str] = {}

    opinion_question_response = (
        db
        .table("opinion_questions")
        .select("id, article_id")
        .execute()
    )

    for question in _rows(opinion_question_response):
        if question.get("id") and question.get("article_id"):
            question_to_opinion_article[
                str(question["id"])
            ] = str(question["article_id"])

    for opinion in opinions:
        question_id = opinion.get(
            "opinion_question_id"
        )

        if not question_id:
            continue

        article_id = question_to_opinion_article.get(
            str(question_id)
        )

        if article_id:
            opinions_by_article[article_id] += 1

    # ---------------------------------------------------------
    # ARTICLE REPORTS
    # ---------------------------------------------------------

    article_reports = []

    for article_id, article in article_by_id.items():
        translations = article.get(
            "article_translations"
        ) or []

        title = None

        if isinstance(translations, dict):
            title = translations.get("title")
        else:
            for translation in translations:
                if (
                    isinstance(translation, dict)
                    and translation.get("title")
                ):
                    title = translation["title"]
                    break

        category = article.get("categories") or {}

        if isinstance(category, list):
            category = category[0] if category else {}

        views = article_views[article_id]
        correct = quiz_correct_by_article[article_id]
        attempts = quiz_attempts_by_article[article_id]

        article_reports.append(
            {
                "article_id": article_id,
                "title": title,
                "category_id": (
                    str(category["id"])
                    if category.get("id")
                    else None
                ),
                "category_name": category.get("name"),
                "views": views,
                "unique_readers": len(
                    article_unique_readers[article_id]
                ),
                "completions": completions_by_article[
                    article_id
                ],
                "quiz_attempts": attempts,
                "quiz_correct_attempts": correct,
                "quiz_success_rate": _percentage(
                    correct,
                    attempts,
                ),
                "opinion_responses": opinions_by_article[
                    article_id
                ],
                "comments": comments_by_article[
                    article_id
                ],
                "shares": shares_by_article[
                    article_id
                ],
            }
        )

    article_reports.sort(
        key=lambda item: (
            item["views"],
            item["unique_readers"],
            item["completions"],
        ),
        reverse=True,
    )

    top_articles = article_reports[
        :top_articles_limit
    ]

    # ---------------------------------------------------------
    # CATEGORY REPORTS
    # ---------------------------------------------------------

    category_reports: dict[str, dict] = {}

    for article_report in article_reports:
        category_id = article_report["category_id"]
        category_name = article_report["category_name"]

        if not category_id:
            continue

        if category_id not in category_reports:
            category_reports[category_id] = {
                "category_id": category_id,
                "category_name": (
                    category_name or "Unknown"
                ),
                "article_views": 0,
                "unique_reader_ids": set(),
                "article_completions": 0,
            }

        report = category_reports[category_id]

        report["article_views"] += (
            article_report["views"]
        )

        report["article_completions"] += (
            article_report["completions"]
        )

        for user_id in article_unique_readers[
            article_report["article_id"]
        ]:
            report["unique_reader_ids"].add(user_id)

    popular_categories = []

    for report in category_reports.values():
        popular_categories.append(
            {
                "category_id": report["category_id"],
                "category_name": report[
                    "category_name"
                ],
                "article_views": report[
                    "article_views"
                ],
                "unique_readers": len(
                    report["unique_reader_ids"]
                ),
                "article_completions": report[
                    "article_completions"
                ],
            }
        )

    popular_categories.sort(
        key=lambda item: (
            item["article_views"],
            item["article_completions"],
        ),
        reverse=True,
    )

    popular_categories = popular_categories[
        :top_categories_limit
    ]

    # ---------------------------------------------------------
    # USER ENGAGEMENT
    # ---------------------------------------------------------

    user_views = Counter()
    user_completions = Counter()
    user_quiz_attempts = Counter()
    user_quiz_correct = Counter()
    user_opinions = Counter()
    user_comments = Counter()
    user_shares = Counter()
    user_xp = Counter()

    for event in events:
        user_id = event.get("user_id")

        if not user_id:
            continue

        user_id = str(user_id)

        if event.get("event_type") == "ARTICLE_VIEWED":
            user_views[user_id] += 1

        elif event.get("event_type") == "SHARE_CREATED":
            user_shares[user_id] += 1

    for completion in completions:
        if completion.get("user_id"):
            user_completions[
                str(completion["user_id"])
            ] += 1

    for attempt in quiz_attempts:
        if attempt.get("user_id"):
            user_id = str(attempt["user_id"])
            user_quiz_attempts[user_id] += 1

            if attempt.get("is_correct"):
                user_quiz_correct[user_id] += 1

    for opinion in opinions:
        if opinion.get("user_id"):
            user_opinions[
                str(opinion["user_id"])
            ] += 1

    for comment in comments:
        if comment.get("user_id"):
            user_comments[
                str(comment["user_id"])
            ] += 1

    for transaction in xp_transactions:
        if transaction.get("user_id"):
            user_xp[
                str(transaction["user_id"])
            ] += _safe_int(transaction.get("amount"))

    users_by_id = {
        str(user["id"]): user
        for user in users
        if user.get("id")
    }

    user_reports = []

    for user_id in user_ids:
        user = users_by_id.get(user_id) or {}

        user_reports.append(
            {
                "user_id": user_id,
                "display_name": user.get("display_name"),
                "email": None,
                "article_views": user_views[user_id],
                "articles_completed": user_completions[
                    user_id
                ],
                "quiz_attempts": user_quiz_attempts[
                    user_id
                ],
                "quiz_correct_attempts": user_quiz_correct[
                    user_id
                ],
                "opinions_submitted": user_opinions[
                    user_id
                ],
                "comments_created": user_comments[
                    user_id
                ],
                "shares_created": user_shares[
                    user_id
                ],
                "total_xp": user_xp[user_id],
            }
        )

    user_reports.sort(
        key=lambda item: (
            item["article_views"]
            + item["articles_completed"]
            + item["quiz_attempts"]
            + item["opinions_submitted"]
            + item["comments_created"]
            + item["shares_created"]
        ),
        reverse=True,
    )

    most_engaged_users = user_reports[
        :top_users_limit
    ]

    # ---------------------------------------------------------
    # ADVERTISEMENTS
    # ---------------------------------------------------------

    advertisement_clicks = Counter()
    advertisement_unique_clickers: dict[
        str, set[str]
    ] = defaultdict(set)

    for event in events:
        if (
            event.get("event_type")
            != "ADVERTISEMENT_CLICKED"
        ):
            continue

        source_id = event.get("source_id")

        if not source_id:
            continue

        source_id = str(source_id)

        advertisement_clicks[source_id] += 1

        if event.get("user_id"):
            advertisement_unique_clickers[
                source_id
            ].add(str(event["user_id"]))

    advertisement_reports = []

    for advertisement in advertisements:
        advertisement_id = str(
            advertisement["id"]
        )

        slot = advertisement.get("slot") or {}

        if isinstance(slot, list):
            slot = slot[0] if slot else {}

        advertisement_reports.append(
            {
                "advertisement_id": advertisement_id,
                "title": advertisement.get("title", ""),
                "slot_key": slot.get("key"),
                "clicks": advertisement_clicks[
                    advertisement_id
                ],
                "unique_clickers": len(
                    advertisement_unique_clickers[
                        advertisement_id
                    ]
                ),
            }
        )

    advertisement_reports.sort(
        key=lambda item: (
            item["clicks"],
            item["unique_clickers"],
        ),
        reverse=True,
    )

    # ---------------------------------------------------------
    # OVERVIEW
    # ---------------------------------------------------------

    total_article_views = sum(
        article_views.values()
    )

    unique_article_readers = len(
        {
            user_id
            for readers in article_unique_readers.values()
            for user_id in readers
        }
    )

    total_opinions = len(opinions)
    total_comments = len(comments)

    total_shares = sum(
        shares_by_article.values()
    )

    total_ad_clicks = sum(
        advertisement_clicks.values()
    )

    overview = {
        "total_users": total_users,
        "active_users": active_users,
        "total_article_views": total_article_views,
        "unique_article_readers": unique_article_readers,
        "articles_completed": total_completions,
        "quiz_attempts": total_quiz_attempts,
        "quiz_correct_attempts": total_quiz_correct,
        "quiz_success_rate": _percentage(
            total_quiz_correct,
            total_quiz_attempts,
        ),
        "opinions_submitted": total_opinions,
        "comments_created": total_comments,
        "shares_created": total_shares,
        "advertisement_clicks": total_ad_clicks,
    }

    # ---------------------------------------------------------
    # RECENT ANALYTICS EVENTS
    # ---------------------------------------------------------

    recent_activity = []

    for event in events[:20]:
        recent_activity.append(
            {
                "id": str(event["id"]),
                "event_type": event["event_type"],
                "user_id": (
                    str(event["user_id"])
                    if event.get("user_id")
                    else None
                ),
                "article_id": (
                    str(event["article_id"])
                    if event.get("article_id")
                    else None
                ),
                "source_type": event.get(
                    "source_type"
                ),
                "source_id": (
                    str(event["source_id"])
                    if event.get("source_id")
                    else None
                ),
                "metadata": (
                    event.get("metadata")
                    or {}
                ),
                "created_at": event["created_at"],
            }
        )

    return {
        "overview": overview,
        "top_articles": top_articles,
        "popular_categories": popular_categories,
        "most_engaged_users": most_engaged_users,
        "advertisements": advertisement_reports,
        "recent_activity": recent_activity,
    }