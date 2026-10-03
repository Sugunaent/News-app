import logging
from uuid import UUID

from postgrest.exceptions import APIError

from app.core.db_utils import extract_single_record
from app.db.supabase import supabase, supabase_admin

# Shared Supabase client alias for compatibility with the current test suite
# and downstream service calls that expect a module-level `supabase` handle.
supabase = supabase_admin

logger = logging.getLogger("app.gamification")


def _get_active_xp_rule(event_type: str) -> dict | None:
    response = (
        supabase_admin
        .table("xp_rules")
        .select("id, event_type, amount")
        .eq("event_type", event_type.strip())
        .eq("is_active", True)
        .limit(1)
        .execute()
    )
    rules = getattr(response, "data", None) or []
    return rules[0] if rules else None


def _find_xp_transaction(
    *,
    user_id: UUID,
    source_type: str,
    source_id: UUID,
) -> dict | None:
    response = (
        supabase_admin
        .table("xp_transactions")
        .select(
            "id, xp_rule_id, article_id, source_type, "
            "source_id, amount, created_at"
        )
        .eq("user_id", str(user_id))
        .eq("source_type", source_type)
        .eq("source_id", str(source_id))
        .maybe_single()
        .execute()
    )
    return getattr(response, "data", None)


def get_active_xp_amount(event_type: str, default: int = 0) -> int:
    rule = _get_active_xp_rule(event_type)
    return int(rule["amount"]) if rule else default


def award_xp(
    *,
    user_id: UUID,
    event_type: str,
    source_type: str,
    source_id: UUID,
    article_id: UUID | None = None,
) -> dict | None:
    existing_data = _find_xp_transaction(
        user_id=user_id,
        source_type=source_type,
        source_id=source_id,
    )
    if existing_data:
        return existing_data

    rule = _get_active_xp_rule(event_type)

    if not rule:
        return None

    transaction = {
        "user_id": str(user_id),
        "xp_rule_id": rule["id"],
        "article_id": str(article_id) if article_id else None,
        "source_type": source_type,
        "source_id": str(source_id),
        "amount": rule["amount"],
    }

    try:
        response = (
            supabase_admin
            .table("xp_transactions")
            .insert(transaction)
            .select(
                "id, xp_rule_id, article_id, source_type, "
                "source_id, amount, created_at"
            )
            .execute()
        )
    except APIError as error:
        if error.code != "23505":
            raise
        existing_data = _find_xp_transaction(
            user_id=user_id,
            source_type=source_type,
            source_id=source_id,
        )
        if existing_data:
            return existing_data
        logger.exception(
            "XP transaction conflicted but could not be reloaded "
            "(user_id=%s, source_type=%s, source_id=%s)",
            user_id,
            source_type,
            source_id,
        )
        raise

    response_data = getattr(response, "data", None)
    if not response_data:
        return None

    record = extract_single_record(response_data)

    try:
        award_badges_for_user(user_id)
    except Exception:
        logger.exception("Could not award badges after XP transaction for user %s", user_id)

    return record


def get_gamification_status(user_id: UUID) -> dict:
    try:
        award_badges_for_user(user_id)
    except Exception:
        logger.exception("Could not evaluate badge rules for user %s", user_id)

    transactions_response = (
        supabase_admin
        .table("xp_transactions")
        .select(
            "id, xp_rule_id, article_id, source_type, "
            "source_id, amount, created_at"
        )
        .eq("user_id", str(user_id))
        .order("created_at", desc=True)
        .execute()
    )

    transactions = getattr(transactions_response, "data", None) or []
    total_xp = sum(transaction.get("amount", 0) for transaction in transactions)

    level = None
    try:
        level_response = (
            supabase_admin
            .table("levels")
            .select("id, name, minimum_xp, display_order")
            .execute()
        )
        all_levels = getattr(level_response, "data", None) or []

        sorted_levels = sorted(
            all_levels,
            key=lambda x: int(x.get("minimum_xp", 0)),
            reverse=True,
        )

        for lvl in sorted_levels:
            if int(lvl.get("minimum_xp", 0)) <= total_xp:
                level = lvl
                break
    except Exception:
        logger.exception("Could not load level configuration for user %s", user_id)

    badges_response = (
        supabase_admin
        .table("user_badges")
        .select(
            "badge_id, earned_at, "
            "badges(id, name, description, image_asset_id)"
        )
        .eq("user_id", str(user_id))
        .order("earned_at", desc=True)
        .execute()
    )

    badges = []
    for item in (getattr(badges_response, "data", None) or []):
        badge = item.get("badges")
        if not badge:
            continue

        badges.append(
            {
                "id": badge["id"],
                "name": badge["name"],
                "description": badge["description"],
                "image_asset_id": badge.get("image_asset_id"),
                "earned_at": item["earned_at"],
            }
        )

    return {
        "total_xp": total_xp,
        "level": level,
        "badges": badges,
        "transactions": transactions,
    }


def _has_user_badge(*, user_id: UUID, badge_id: UUID) -> bool:
    try:
        response = (
            supabase_admin
            .table("user_badges")
            .select("user_id, badge_id")
            .eq("user_id", str(user_id))
            .eq("badge_id", str(badge_id))
            .maybe_single()
            .execute()
        )
        return getattr(response, "data", None) is not None
    except APIError:
        logger.exception(
            "Could not check badge assignment (user_id=%s, badge_id=%s)",
            user_id,
            badge_id,
        )
        raise


def _award_badge(*, user_id: UUID, badge: dict) -> dict | None:
    badge_id = UUID(str(badge["id"]))
    if _has_user_badge(user_id=user_id, badge_id=badge_id):
        return None

    try:
        response = (
            supabase_admin
            .table("user_badges")
            .insert(
                {
                    "user_id": str(user_id),
                    "badge_id": str(badge["id"]),
                }
            )
            .select("user_id, badge_id, earned_at")
            .execute()
        )

        response_data = getattr(response, "data", None)
        if response_data:
            return extract_single_record(response_data)
        return None
    except APIError as error:
        if error.code == "23505":
            return None
        logger.exception(
            "Could not assign badge (user_id=%s, badge_id=%s)",
            user_id,
            badge_id,
        )
        raise


def award_badges_for_user(user_id: UUID) -> list[dict]:
    try:
        active_badges_res = (
            supabase_admin
            .table("badges")
            .select("id, name, description, image_asset_id, rule_type, rule_config")
            .eq("is_active", True)
            .execute()
        )
        active_badges = getattr(active_badges_res, "data", None) or []
    except Exception:
        logger.exception("Could not load active badge rules")
        raise

    if not active_badges:
        return []

    try:
        completion_res = (
            supabase_admin
            .table("article_completions")
            .select("article_id")
            .eq("user_id", str(user_id))
            .execute()
        )
        completed_articles_count = len(getattr(completion_res, "data", None) or [])
    except Exception:
        logger.exception("Could not load article completions for user %s", user_id)
        raise

    try:
        xp_res = (
            supabase_admin
            .table("xp_transactions")
            .select("amount")
            .eq("user_id", str(user_id))
            .execute()
        )
        total_xp = sum(item.get("amount", 0) for item in (getattr(xp_res, "data", None) or []))
    except Exception:
        logger.exception("Could not load XP transactions for user %s", user_id)
        raise

    try:
        quiz_res = (
            supabase_admin
            .table("quiz_attempts")
            .select("id")
            .eq("user_id", str(user_id))
            .eq("is_correct", True)
            .execute()
        )
        quiz_correct_count = len(getattr(quiz_res, "data", None) or [])
    except Exception:
        logger.exception("Could not load quiz attempts for user %s", user_id)
        raise

    newly_awarded = []

    for badge in active_badges:
        rule_type = badge.get("rule_type")
        rule_config = badge.get("rule_config") or {}
        is_eligible = False

        if rule_type == "ARTICLE_COUNT":
            target = rule_config.get("target_count") or rule_config.get("count", 0)
            if completed_articles_count >= target:
                is_eligible = True

        elif rule_type == "TOTAL_XP":
            target = rule_config.get("target_xp", 0)
            if total_xp >= target:
                is_eligible = True

        elif rule_type == "QUIZ_CORRECT_ANSWERS":
            target = rule_config.get("count") or rule_config.get("target_count", 0)
            if quiz_correct_count >= target:
                is_eligible = True

        if is_eligible:
            assignment = _award_badge(user_id=user_id, badge=badge)
            if assignment:
                newly_awarded.append(
                    {
                        "id": badge["id"],
                        "name": badge["name"],
                        "description": badge["description"],
                        "image_asset_id": badge.get("image_asset_id"),
                        "earned_at": assignment["earned_at"],
                    }
                )

    return newly_awarded
