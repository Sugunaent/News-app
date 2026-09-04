from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.db.supabase import supabase
from app.dependencies.auth import AuthContext, get_current_user
from app.schemas.superadmin_management import (
    SuperadminBadgeCreate,
    SuperadminBadgeListResponse,
    SuperadminBadgeResponse,
    SuperadminBadgeUpdate,
    SuperadminCommentAuthor,
    SuperadminCommentListResponse,
    SuperadminCommentResponse,
    SuperadminLevelCreate,
    SuperadminLevelListResponse,
    SuperadminLevelResponse,
    SuperadminLevelUpdate,
    SuperadminUserDetailResponse,
    SuperadminUserListItem,
    SuperadminUserListResponse,
    SuperadminUserStatusUpdate,
    SuperadminXPCreate,
    SuperadminXPListResponse,
    SuperadminXPResponse,
    SuperadminXPUpdate,
)
from app.services.audit import record_audit
from app.services.users import get_user_profile


router = APIRouter(
    prefix="/api/v1/superadmin",
    tags=["Superadmin Management"],
)


# ============================================================
# AUTHORIZATION
# ============================================================


def _require_superadmin(auth: AuthContext) -> None:
    if auth.user.role != "SUPERADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superadmin access required",
        )


# ============================================================
# USERS
# ============================================================


@router.get(
    "/users",
    response_model=SuperadminUserListResponse,
)
async def list_users(
    search: str | None = Query(
        default=None,
        max_length=100,
    ),
    is_active: bool | None = None,
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)

    query = (
        supabase
        .table("profiles")
        .select(
            "id, email, display_name, avatar_media_id, "
            "role, is_active, created_at",
            count="exact",
        )
        .order("created_at", desc=True)
    )

    if search:
        search_pattern = f"%{search.strip()}%"

        query = query.or_(
            f"email.ilike.{search_pattern},"
            f"display_name.ilike.{search_pattern}"
        )

    if is_active is not None:
        query = query.eq("is_active", is_active)

    response = query.execute()

    items = response.data or []

    total = (
        response.count
        if response.count is not None
        else len(items)
    )

    return {
        "items": items,
        "total": total,
    }


@router.get(
    "/users/{user_id}",
    response_model=SuperadminUserDetailResponse,
)
async def get_user(
    user_id: UUID,
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)

    profile = get_user_profile(user_id)

    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return profile


@router.patch(
    "/users/{user_id}/status",
    response_model=SuperadminUserListItem,
)
async def update_user_status(
    user_id: UUID,
    payload: SuperadminUserStatusUpdate,
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)

    # Never allow the Superadmin account to deactivate itself.
    if user_id == auth.user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Superadmin cannot deactivate their own account",
        )

    response = (
        supabase
        .table("profiles")
        .update(
            {
                "is_active": payload.is_active,
            }
        )
        .eq("id", str(user_id))
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    updated_user = response.data[0]

    record_audit(
        actor_user_id=auth.user.id,
        action="USER_STATUS_UPDATED",
        entity_type="USER",
        entity_id=user_id,
        metadata={
            "is_active": payload.is_active,
        },
    )

    return updated_user


# ============================================================
# COMMENTS
# ============================================================


@router.get(
    "/comments",
    response_model=SuperadminCommentListResponse,
)
async def list_comments(
    article_id: UUID | None = None,
    user_id: UUID | None = None,
    hidden: bool | None = None,
    deleted: bool | None = None,
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)

    query = (
        supabase
        .table("comments")
        .select(
            "id, article_id, user_id, content, "
            "is_hidden, deleted_at, created_at, updated_at, "
            "profiles(id, display_name, email)",
            count="exact",
        )
        .order("created_at", desc=True)
    )

    if article_id is not None:
        query = query.eq(
            "article_id",
            str(article_id),
        )

    if user_id is not None:
        query = query.eq(
            "user_id",
            str(user_id),
        )

    if hidden is not None:
        query = query.eq(
            "is_hidden",
            hidden,
        )

    if deleted is True:
        query = query.not_.is_(
            "deleted_at",
            "null",
        )
    elif deleted is False:
        query = query.is_(
            "deleted_at",
            "null",
        )

    response = query.execute()

    rows = response.data or []

    items = []

    for row in rows:
        profile = row.get("profiles") or {}

        items.append(
            SuperadminCommentResponse(
                id=row["id"],
                article_id=row["article_id"],
                user_id=row["user_id"],
                content=row["content"],
                is_hidden=row["is_hidden"],
                deleted_at=row.get("deleted_at"),
                created_at=row["created_at"],
                updated_at=row["updated_at"],
                author=SuperadminCommentAuthor(
                    id=profile.get("id", row["user_id"]),
                    display_name=profile.get(
                        "display_name"
                    ),
                    email=profile.get("email"),
                ),
            )
        )

    total = (
        response.count
        if response.count is not None
        else len(items)
    )

    return {
        "items": items,
        "total": total,
    }


# ============================================================
# XP RULES
# ============================================================


@router.get(
    "/gamification/xp-rules",
    response_model=SuperadminXPListResponse,
)
async def list_xp_rules(
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)

    response = (
        supabase
        .table("xp_rules")
        .select(
            "id, event_type, amount, description, "
            "is_active, created_at, updated_at"
        )
        .order("created_at", desc=True)
        .execute()
    )

    return {
        "items": response.data or [],
    }


@router.post(
    "/gamification/xp-rules",
    response_model=SuperadminXPResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_xp_rule(
    payload: SuperadminXPCreate,
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)

    response = (
        supabase
        .table("xp_rules")
        .insert(
            payload.model_dump()
        )
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to create XP rule",
        )

    created_rule = response.data[0]

    record_audit(
        actor_user_id=auth.user.id,
        action="XP_RULE_CREATED",
        entity_type="XP_RULE",
        entity_id=UUID(str(created_rule["id"])),
        metadata={
            "event_type": created_rule["event_type"],
            "amount": created_rule["amount"],
            "description": created_rule.get("description"),
            "is_active": created_rule["is_active"],
        },
    )

    return created_rule


@router.patch(
    "/gamification/xp-rules/{rule_id}",
    response_model=SuperadminXPResponse,
)
async def update_xp_rule(
    rule_id: UUID,
    payload: SuperadminXPUpdate,
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)

    updates = payload.model_dump(
        exclude_unset=True
    )

    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    response = (
        supabase
        .table("xp_rules")
        .update(updates)
        .eq("id", str(rule_id))
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="XP rule not found",
        )

    updated_rule = response.data[0]

    record_audit(
        actor_user_id=auth.user.id,
        action="XP_RULE_UPDATED",
        entity_type="XP_RULE",
        entity_id=rule_id,
        metadata={
            "updated_fields": list(updates.keys()),
            "values": updates,
        },
    )

    return updated_rule


@router.delete(
    "/gamification/xp-rules/{rule_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_xp_rule(
    rule_id: UUID,
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)

    response = (
        supabase
        .table("xp_rules")
        .delete()
        .eq("id", str(rule_id))
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="XP rule not found",
        )

    record_audit(
        actor_user_id=auth.user.id,
        action="XP_RULE_DELETED",
        entity_type="XP_RULE",
        entity_id=rule_id,
        metadata={},
    )


# ============================================================
# LEVELS
# ============================================================


@router.get(
    "/gamification/levels",
    response_model=SuperadminLevelListResponse,
)
async def list_levels(
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)

    response = (
        supabase
        .table("levels")
        .select(
            "id, name, minimum_xp, display_order, created_at"
        )
        .order("display_order")
        .execute()
    )

    return {
        "items": response.data or [],
    }


@router.post(
    "/gamification/levels",
    response_model=SuperadminLevelResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_level(
    payload: SuperadminLevelCreate,
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)

    response = (
        supabase
        .table("levels")
        .insert(
            payload.model_dump()
        )
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to create level",
        )

    created_level = response.data[0]

    record_audit(
        actor_user_id=auth.user.id,
        action="LEVEL_CREATED",
        entity_type="LEVEL",
        entity_id=UUID(str(created_level["id"])),
        metadata={
            "name": created_level["name"],
            "minimum_xp": created_level["minimum_xp"],
            "display_order": created_level["display_order"],
        },
    )

    return created_level


@router.patch(
    "/gamification/levels/{level_id}",
    response_model=SuperadminLevelResponse,
)
async def update_level(
    level_id: UUID,
    payload: SuperadminLevelUpdate,
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)

    updates = payload.model_dump(
        exclude_unset=True
    )

    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    response = (
        supabase
        .table("levels")
        .update(updates)
        .eq("id", str(level_id))
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Level not found",
        )

    updated_level = response.data[0]

    record_audit(
        actor_user_id=auth.user.id,
        action="LEVEL_UPDATED",
        entity_type="LEVEL",
        entity_id=level_id,
        metadata={
            "updated_fields": list(updates.keys()),
            "values": updates,
        },
    )

    return updated_level


@router.delete(
    "/gamification/levels/{level_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_level(
    level_id: UUID,
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)

    response = (
        supabase
        .table("levels")
        .delete()
        .eq("id", str(level_id))
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Level not found",
        )

    record_audit(
        actor_user_id=auth.user.id,
        action="LEVEL_DELETED",
        entity_type="LEVEL",
        entity_id=level_id,
        metadata={},
    )


# ============================================================
# BADGES
# ============================================================


@router.get(
    "/gamification/badges",
    response_model=SuperadminBadgeListResponse,
)
async def list_badges(
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)

    response = (
        supabase
        .table("badges")
        .select(
            "id, name, description, image_asset_id, "
            "rule_type, rule_config, is_active, "
            "created_at, updated_at"
        )
        .order("created_at", desc=True)
        .execute()
    )

    return {
        "items": response.data or [],
    }


@router.post(
    "/gamification/badges",
    response_model=SuperadminBadgeResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_badge(
    payload: SuperadminBadgeCreate,
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)

    response = (
        supabase
        .table("badges")
        .insert(
            payload.model_dump()
        )
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to create badge",
        )

    created_badge = response.data[0]

    record_audit(
        actor_user_id=auth.user.id,
        action="BADGE_CREATED",
        entity_type="BADGE",
        entity_id=UUID(str(created_badge["id"])),
        metadata={
            "name": created_badge["name"],
            "rule_type": created_badge["rule_type"],
            "is_active": created_badge["is_active"],
            "image_asset_id": created_badge.get(
                "image_asset_id"
            ),
        },
    )

    return created_badge


@router.patch(
    "/gamification/badges/{badge_id}",
    response_model=SuperadminBadgeResponse,
)
async def update_badge(
    badge_id: UUID,
    payload: SuperadminBadgeUpdate,
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)

    updates = payload.model_dump(
        exclude_unset=True
    )

    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    response = (
        supabase
        .table("badges")
        .update(updates)
        .eq("id", str(badge_id))
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Badge not found",
        )

    updated_badge = response.data[0]

    record_audit(
        actor_user_id=auth.user.id,
        action="BADGE_UPDATED",
        entity_type="BADGE",
        entity_id=badge_id,
        metadata={
            "updated_fields": list(updates.keys()),
            "values": updates,
        },
    )

    return updated_badge


@router.delete(
    "/gamification/badges/{badge_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_badge(
    badge_id: UUID,
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)

    response = (
        supabase
        .table("badges")
        .delete()
        .eq("id", str(badge_id))
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Badge not found",
        )

    record_audit(
        actor_user_id=auth.user.id,
        action="BADGE_DELETED",
        entity_type="BADGE",
        entity_id=badge_id,
        metadata={},
    )