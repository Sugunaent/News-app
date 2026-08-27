from uuid import UUID

from postgrest.exceptions import APIError

from app.db.supabase import supabase


def _get_active_xp_rule(event_type: str):
    response = (
        supabase
        .table("xp_rules")
        .select("id, event_type, amount")
        .eq("event_type", event_type)
        .eq("is_active", True)
        .order("created_at", desc=True)
        .limit(1)
        .maybe_single()
        .execute()
    )

    return response.data


def award_xp(
    *,
    user_id: UUID,
    event_type: str,
    source_type: str,
    source_id: UUID,
    article_id: UUID | None = None,
) -> dict | None:
    """
    Award XP according to the active server-side XP rule.

    The caller never supplies the XP amount.

    The source identity:
        user_id + source_type + source_id

    is used to make the award idempotent.
    """

    existing_response = (
        supabase
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

    if existing_response.data:
        return existing_response.data

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
            supabase
            .table("xp_transactions")
            .insert(transaction)
            .select(
                "id, xp_rule_id, article_id, source_type, "
                "source_id, amount, created_at"
            )
            .single()
            .execute()
        )

        return response.data

    except APIError:
        # Protect against a concurrent request winning the unique
        # constraint between our existence check and INSERT.
        existing_response = (
            supabase
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

        if existing_response.data:
            return existing_response.data

        raise


def get_gamification_status(user_id: UUID) -> dict:
    transactions_response = (
        supabase
        .table("xp_transactions")
        .select(
            "id, xp_rule_id, article_id, source_type, "
            "source_id, amount, created_at"
        )
        .eq("user_id", str(user_id))
        .order("created_at", desc=True)
        .execute()
    )

    transactions = transactions_response.data or []

    total_xp = sum(
        transaction["amount"]
        for transaction in transactions
    )

    level_response = (
        supabase
        .table("levels")
        .select(
            "id, name, minimum_xp, display_order"
        )
        .lte("minimum_xp", total_xp)
        .order("minimum_xp", desc=True)
        .limit(1)
        .maybe_single()
        .execute()
    )

    level = level_response.data

    badges_response = (
        supabase
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

    for item in badges_response.data or []:
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