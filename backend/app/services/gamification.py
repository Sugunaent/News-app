from uuid import UUID
from postgrest.exceptions import APIError

from app.core.db_utils import extract_single_record
from app.db.supabase import supabase


def _get_active_xp_rule(event_type: str) -> dict | None:
    """
    Fetch active XP rule safely.
    Fetches all active rules and matches event_type in Python to avoid
    PostgREST custom Enum type matching issues.
    """
    print(f"\n--- [DEBUG _get_active_xp_rule] Looking up active rule for event_type: '{event_type}' ---")
    try:
        response = (
            supabase
            .table("xp_rules")
            .select("id, event_type, amount")
            .eq("is_active", True)
            .execute()
        )
        rules = getattr(response, "data", None) or []
        print(f"--- [DEBUG _get_active_xp_rule] Active rules retrieved: {rules} ---")
        
        for rule in rules:
            # Cast both to string and strip potential whitespace
            rule_event = str(rule.get("event_type", "")).strip()
            target_event = str(event_type).strip()
            
            if rule_event == target_event:
                print(f"--- [DEBUG _get_active_xp_rule] MATCH FOUND: {rule} ---")
                return rule
                
        print(f"--- [DEBUG _get_active_xp_rule] NO MATCH FOUND for '{event_type}' ---")
        return None
    except APIError as e:
        print(f"--- [DEBUG _get_active_xp_rule] APIError occurred: {e} ---")
        return None
    except Exception as e:
        print(f"--- [DEBUG _get_active_xp_rule] Unexpected error: {type(e).__name__} - {e} ---")
        return None


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
    print("\n==================================================")
    print("--- [DEBUG award_xp] STARTING XP AWARD ---")
    print(f"Input Args -> user_id: {user_id} (type: {type(user_id)})")
    print(f"Input Args -> event_type: '{event_type}'")
    print(f"Input Args -> source_type: '{source_type}', source_id: {source_id}")
    print(f"Input Args -> article_id: {article_id}")

    # 1. Check for an existing transaction safely
    try:
        print("--- [DEBUG award_xp] Step 1: Checking for existing transaction... ---")
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
        existing_data = getattr(existing_response, "data", None)
        if existing_data:
            print(f"--- [DEBUG award_xp] Transaction ALREADY EXISTS: {existing_data} ---")
            return existing_data
        print("--- [DEBUG award_xp] No existing transaction found. Proceeding. ---")
    except APIError as e:
        print(f"--- [DEBUG award_xp] APIError during existence check (ignoring): {e} ---")
    except Exception as e:
        print(f"--- [DEBUG award_xp] Unexpected error during existence check: {type(e).__name__} - {e} ---")

    # 2. Get active XP rule
    print("--- [DEBUG award_xp] Step 2: Querying active XP rule... ---")
    rule = _get_active_xp_rule(event_type)

    if not rule:
        print(f"--- [DEBUG award_xp] ABORT: No active rule matching event_type='{event_type}' ---")
        print("==================================================\n")
        return None

    transaction = {
        "user_id": str(user_id),
        "xp_rule_id": rule["id"],
        "article_id": str(article_id) if article_id else None,
        "source_type": source_type,
        "source_id": str(source_id),
        "amount": rule["amount"],
    }
    print(f"--- [DEBUG award_xp] Step 3: Prepared insert payload: {transaction} ---")

    # 3. Insert transaction
    try:
        response = (
            supabase
            .table("xp_transactions")
            .insert(transaction)
            .select(
                "id, xp_rule_id, article_id, source_type, "
                "source_id, amount, created_at"
            )
            .execute()
        )

        response_data = getattr(response, "data", None)
        print(f"--- [DEBUG award_xp] Insert response raw data: {response_data} ---")
        if response_data:
            record = extract_single_record(response_data)
            print(f"--- [DEBUG award_xp] SUCCESS! Awarded XP Record: {record} ---")
            print("==================================================\n")
            return record
        
        print("--- [DEBUG award_xp] WARNING: Insert succeeded but response.data was empty/None ---")
        print("==================================================\n")
        return None

    except APIError as e:
        print(f"--- [DEBUG award_xp] APIError during Insert: {e} ---")
        print("--- [DEBUG award_xp] Step 4: Attempting race-condition fallback query... ---")
        try:
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

            existing_data = getattr(existing_response, "data", None)
            if existing_data:
                print(f"--- [DEBUG award_xp] Race condition verified. Found existing transaction: {existing_data} ---")
                print("==================================================\n")
                return existing_data
        except APIError as fallback_err:
            print(f"--- [DEBUG award_xp] Fallback query also failed with APIError: {fallback_err} ---")

        print("--- [DEBUG award_xp] Raising original APIError... ---")
        print("==================================================\n")
        raise
    except Exception as e:
        print(f"--- [DEBUG award_xp] Unexpected error during Insert: {type(e).__name__} - {e} ---")
        print("==================================================\n")
        raise


def get_gamification_status(user_id: UUID) -> dict:
    print(f"\n--- [DEBUG get_gamification_status] Fetching status for user_id: {user_id} ---")
    # 1. Fetch XP Transactions
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

    transactions = getattr(transactions_response, "data", None) or []
    print(f"--- [DEBUG get_gamification_status] Found {len(transactions)} transaction(s) ---")

    # Calculate Total XP
    total_xp = sum(transaction.get("amount", 0) for transaction in transactions)
    print(f"--- [DEBUG get_gamification_status] Calculated Total XP: {total_xp} ---")

    # 2. Fetch User Level Safely
    level_response = (
        supabase
        .table("levels")
        .select("id, name, minimum_xp, display_order")
        .lte("minimum_xp", total_xp)
        .order("minimum_xp", desc=True)
        .limit(1)
        .execute()
    )

    level_data = getattr(level_response, "data", None)
    level = level_data[0] if (level_data and len(level_data) > 0) else None

    # 3. Fetch Badges
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


def _get_badge_by_name(name: str) -> dict | None:
    """
    Find an active badge by its configured name.
    """
    try:
        response = (
            supabase
            .table("badges")
            .select("id, name, description, image_asset_id")
            .eq("name", name)
            .eq("is_active", True)
            .maybe_single()
            .execute()
        )
        return getattr(response, "data", None)
    except APIError:
        return None


def _has_user_badge(
    *,
    user_id: UUID,
    badge_id: UUID,
) -> bool:
    try:
        response = (
            supabase
            .table("user_badges")
            .select("user_id, badge_id")
            .eq("user_id", str(user_id))
            .eq("badge_id", str(badge_id))
            .maybe_single()
            .execute()
        )
        return getattr(response, "data", None) is not None
    except APIError:
        return False


def _award_badge(
    *,
    user_id: UUID,
    badge: dict,
) -> dict | None:
    """
    Assign one badge to a user.
    """
    if _has_user_badge(
        user_id=user_id,
        badge_id=UUID(str(badge["id"])),
    ):
        return None

    try:
        response = (
            supabase
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

    except APIError:
        if _has_user_badge(
            user_id=user_id,
            badge_id=UUID(str(badge["id"])),
        ):
            return None

        raise


def award_badges_for_user(user_id: UUID) -> list[dict]:
    """
    Evaluate completion-based V1 badge achievements and assign
    any newly earned badges.
    """
    try:
        completion_response = (
            supabase
            .table("article_completions")
            .select("article_id")
            .eq("user_id", str(user_id))
            .execute()
        )
        completions = getattr(completion_response, "data", None) or []
    except APIError:
        completions = []

    completion_count = len(completions)

    eligible_badges: list[str] = []

    if completion_count >= 1:
        eligible_badges.append("First Article")

    if completion_count >= 10:
        eligible_badges.append("10 Articles Completed")

    newly_awarded: list[dict] = []

    for badge_name in eligible_badges:
        badge = _get_badge_by_name(badge_name)

        if not badge:
            continue

        assignment = _award_badge(
            user_id=user_id,
            badge=badge,
        )

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