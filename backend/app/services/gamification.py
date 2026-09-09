from uuid import UUID
from postgrest.exceptions import APIError

from app.core.db_utils import extract_single_record
from app.db.supabase import supabase, supabase_admin


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
    Also triggers badge evaluation automatically upon successful XP award.
    """
    print("\n==================================================")
    print("--- [DEBUG award_xp] STARTING XP AWARD ---")

    # 1. Check for an existing transaction safely
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
            print(f"--- [DEBUG award_xp] Transaction ALREADY EXISTS: {existing_data} ---")
            return existing_data
    except APIError as e:
        print(f"--- [DEBUG award_xp] APIError during existence check: {e} ---")
    except Exception as e:
        print(f"--- [DEBUG award_xp] Unexpected error during existence check: {e} ---")

    # 2. Get active XP rule
    rule = _get_active_xp_rule(event_type)

    if not rule:
        print(f"--- [DEBUG award_xp] ABORT: No active rule matching event_type='{event_type}' ---")
        return None

    transaction = {
        "user_id": str(user_id),
        "xp_rule_id": rule["id"],
        "article_id": str(article_id) if article_id else None,
        "source_type": source_type,
        "source_id": str(source_id),
        "amount": rule["amount"],
    }

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
        if response_data:
            record = extract_single_record(response_data)
            print(f"--- [DEBUG award_xp] SUCCESS! Awarded XP Record: {record} ---")
            
            # Automatically evaluate badges whenever XP is granted
            try:
                award_badges_for_user(user_id)
            except Exception as badge_err:
                print(f"--- [DEBUG award_xp] Badge evaluation trigger failed: {badge_err} ---")

            return record

        return None

    except APIError as e:
        print(f"--- [DEBUG award_xp] APIError during Insert: {e} ---")
        raise
    except Exception as e:
        print(f"--- [DEBUG award_xp] Unexpected error during Insert: {e} ---")
        raise


def get_gamification_status(user_id: UUID) -> dict:
    print(f"\n--- [DEBUG get_gamification_status] Fetching status for user_id: {user_id} ---")
    
    # 1. Automatically evaluate and assign any newly eligible badges prior to returning status
    try:
        award_badges_for_user(user_id)
    except Exception as badge_eval_err:
        print(f"--- [DEBUG get_gamification_status] Auto badge assignment failed: {badge_eval_err} ---")

    # 2. Fetch XP Transactions
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
    total_xp = sum(transaction.get("amount", 0) for transaction in transactions)

    # 3. Fetch User Level Safely via admin client
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
            reverse=True
        )

        for lvl in sorted_levels:
            if int(lvl.get("minimum_xp", 0)) <= total_xp:
                level = lvl
                break

    except Exception as e:
        print(f"--- LEVEL DEBUG --- Error fetching levels: {e}")

    # 4. Fetch Badges
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
        return False


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

    except APIError as e:
        print(f"--- BADGE DEBUG --- APIError assigning badge {badge.get('name')}: {e}")
        return None


def award_badges_for_user(user_id: UUID) -> list[dict]:
    """
    Evaluates dynamic badge criteria (ARTICLE_COUNT, TOTAL_XP, QUIZ_CORRECT_ANSWERS)
    and awards missing badges to the user.
    """
    print(f"\n--- [DEBUG award_badges_for_user] Evaluating badges for user: {user_id} ---")

    # 1. Fetch active badges from DB using admin client
    try:
        active_badges_res = (
            supabase_admin
            .table("badges")
            .select("id, name, description, image_asset_id, rule_type, rule_config")
            .eq("is_active", True)
            .execute()
        )
        active_badges = getattr(active_badges_res, "data", None) or []
    except Exception as e:
        print(f"--- BADGE DEBUG --- Error loading active badges: {e}")
        return []

    if not active_badges:
        return []

    # 2. Gather metrics required for badge evaluation
    # A. Completed Articles
    try:
        completion_res = (
            supabase_admin
            .table("reading_progress")
            .select("article_id")
            .eq("user_id", str(user_id))
            .not_.is_("completed_at", "null")
            .execute()
        )
        completed_articles_count = len(getattr(completion_res, "data", None) or [])
    except Exception:
        completed_articles_count = 0

    # B. Total XP
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
        total_xp = 0

    # C. Quiz Correct Answers
    try:
        quiz_res = (
            supabase_admin
            .table("user_quiz_attempts")  # Adjust table name if different in your schema
            .select("id")
            .eq("user_id", str(user_id))
            .eq("is_correct", True)
            .execute()
        )
        quiz_correct_count = len(getattr(quiz_res, "data", None) or [])
    except Exception:
        quiz_correct_count = 0

    print(f"--- BADGE METRICS --- User Articles: {completed_articles_count}, Total XP: {total_xp}, Correct Quizzes: {quiz_correct_count}")

    # 3. Evaluate each active badge against rule_type and rule_config
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
                print(f"--- BADGE UNLOCKED --- Badge '{badge['name']}' awarded to user {user_id}")
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