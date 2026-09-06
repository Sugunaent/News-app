from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.db_utils import extract_single_record
from app.core.exceptions import AuthorizationError, NotFoundError
from app.db.supabase import supabase
from app.dependencies.auth import AuthContext, get_current_user
from app.schemas.promotions import (
    PromotionalItemCreate,
    PromotionalItemResponse,
    PromotionalItemUpdate,
)
from app.schemas.auth import CurrentUser
from app.services.audit import record_audit


router = APIRouter(
    prefix="/api/v1/promotions",
    tags=["Promotions"],
)


def _require_superadmin(current_user: AuthContext | CurrentUser) -> None:
    # Unwrap CurrentUser if AuthContext was passed
    user = current_user.user if isinstance(current_user, AuthContext) else current_user

    user_role = getattr(user, "role", None)

    if not user_role and hasattr(user, "profile"):
        user_role = (
            user.profile.get("role")
            if isinstance(user.profile, dict)
            else getattr(user.profile, "role", None)
        )

    if not user_role or str(user_role).upper() != "SUPERADMIN":
        raise AuthorizationError("Superadmin access required")


def _build_select_query():
    return """
        id,
        image_media_id,
        title,
        description,
        external_url,
        event_date,
        display_order,
        is_active,
        starts_at,
        ends_at,
        created_at,
        updated_at,
        image:media_assets (
            id,
            storage_path
        )
    """


@router.get(
    "",
    response_model=list[PromotionalItemResponse],
)
def list_promotions():
    """
    Return currently visible promotional carousel items.

    This endpoint is public. Promotional items are content displayed
    to all users, so authentication is not required.
    """
    result = (
        supabase
        .table("promotional_items")
        .select(_build_select_query())
        .eq("is_active", True)
        .order("display_order", desc=False)
        .order("created_at", desc=True)
        .execute()
    )

    items = result.data or []

    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)
    visible_items = []

    for item in items:
        starts_at = item.get("starts_at")
        ends_at = item.get("ends_at")

        if starts_at:
            starts_at_dt = (
                datetime.fromisoformat(
                    starts_at.replace("Z", "+00:00")
                )
                if isinstance(starts_at, str)
                else starts_at
            )

            if starts_at_dt > now:
                continue

        if ends_at:
            ends_at_dt = (
                datetime.fromisoformat(
                    ends_at.replace("Z", "+00:00")
                )
                if isinstance(ends_at, str)
                else ends_at
            )

            if ends_at_dt <= now:
                continue

        visible_items.append(item)

    return visible_items


@router.get(
    "/admin",
    response_model=list[PromotionalItemResponse],
)
def list_promotions_admin(
    current_user: AuthContext = Depends(get_current_user),
):
    """
    Return all promotional items for Superadmin management.
    """
    _require_superadmin(current_user)

    result = (
        current_user.client
        .table("promotional_items")
        .select(_build_select_query())
        .order("display_order", desc=False)
        .order("created_at", desc=True)
        .execute()
    )

    return getattr(result, "data", None) or []


@router.post(
    "",
    response_model=PromotionalItemResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_promotion(
    payload: PromotionalItemCreate,
    current_user: AuthContext = Depends(get_current_user),
):
    """
    Create a promotional carousel item.
    """
    _require_superadmin(current_user)

    if payload.starts_at and payload.ends_at:
        if payload.ends_at <= payload.starts_at:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="ends_at must be later than starts_at",
            )

    if payload.image_media_id is not None:
        media_result = (
            current_user.client
            .table("media_assets")
            .select("id, storage_path")
            .eq("id", str(payload.image_media_id))
            .maybe_single()
            .execute()
        )

        media_data = getattr(media_result, "data", None) if media_result else None
        if not media_data:
            raise NotFoundError("Promotional image media not found")

    data = payload.model_dump(mode="json")
    if payload.external_url is not None:
        data["external_url"] = str(payload.external_url)

    result = (
        current_user.client
        .table("promotional_items")
        .insert(data)
        .select(_build_select_query())
        .execute()
    )

    result_data = getattr(result, "data", None) if result else None
    promotion = extract_single_record(result_data, "Promotional item could not be created")

    record_audit(
        actor_user_id=current_user.user.id,
        action="PROMOTION_CREATED",
        entity_type="PROMOTIONAL_ITEM",
        entity_id=UUID(str(promotion["id"])),
        metadata={
            "title": promotion.get("title"),
            "image_media_id": promotion.get("image_media_id"),
            "external_url": promotion.get("external_url"),
            "event_date": promotion.get("event_date"),
            "display_order": promotion.get("display_order"),
            "is_active": promotion.get("is_active"),
            "starts_at": promotion.get("starts_at"),
            "ends_at": promotion.get("ends_at"),
        },
        client=current_user.client,
    )

    return promotion


@router.patch(
    "/{promotion_id}",
    response_model=PromotionalItemResponse,
)
def update_promotion(
    promotion_id: UUID,
    payload: PromotionalItemUpdate,
    current_user: AuthContext = Depends(get_current_user),
):
    """
    Update a promotional carousel item.
    """
    _require_superadmin(current_user)

    existing_result = (
        current_user.client
        .table("promotional_items")
        .select("*")
        .eq("id", str(promotion_id))
        .maybe_single()
        .execute()
    )

    existing_data = getattr(existing_result, "data", None) if existing_result else None
    if not existing_data:
        raise NotFoundError("Promotional item not found")

    existing = existing_data

    merged_starts_at = payload.starts_at

    if "starts_at" not in payload.model_fields_set:
        merged_starts_at = existing.get("starts_at")

    merged_ends_at = payload.ends_at

    if "ends_at" not in payload.model_fields_set:
        merged_ends_at = existing.get("ends_at")

    if merged_starts_at and merged_ends_at:
        from datetime import datetime

        if isinstance(merged_starts_at, str):
            merged_starts_at = datetime.fromisoformat(
                merged_starts_at.replace("Z", "+00:00")
            )

        if isinstance(merged_ends_at, str):
            merged_ends_at = datetime.fromisoformat(
                merged_ends_at.replace("Z", "+00:00")
            )

        if merged_ends_at <= merged_starts_at:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="ends_at must be later than starts_at",
            )

    if "image_media_id" in payload.model_fields_set:
        if payload.image_media_id is not None:
            media_result = (
                current_user.client
                .table("media_assets")
                .select("id")
                .eq("id", str(payload.image_media_id))
                .maybe_single()
                .execute()
            )

            media_data = getattr(media_result, "data", None) if media_result else None
            if not media_data:
                raise NotFoundError(
                    "Promotional image media not found"
                )

    data = payload.model_dump(
        mode="json",
        exclude_unset=True,
    )

    if "external_url" in data and data["external_url"] is not None:
        data["external_url"] = str(payload.external_url)

    result = (
        current_user.client
        .table("promotional_items")
        .update(data)
        .eq("id", str(promotion_id))
        .select(_build_select_query())
        .execute()
    )

    result_data = getattr(result, "data", None) if result else None
    promotion = extract_single_record(result_data, "Promotional item not found")

    record_audit(
        actor_user_id=current_user.user.id,
        action="PROMOTION_UPDATED",
        entity_type="PROMOTIONAL_ITEM",
        entity_id=promotion_id,
        metadata={
            "title": promotion.get("title"),
            "image_media_id": promotion.get("image_media_id"),
            "external_url": promotion.get("external_url"),
            "event_date": promotion.get("event_date"),
            "display_order": promotion.get("display_order"),
            "is_active": promotion.get("is_active"),
            "starts_at": promotion.get("starts_at"),
            "ends_at": promotion.get("ends_at"),
        },
        client=current_user.client,
    )

    return promotion


@router.delete(
    "/{promotion_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_promotion(
    promotion_id: UUID,
    current_user: AuthContext = Depends(get_current_user),
):
    """
    Delete a promotional carousel item.
    """
    _require_superadmin(current_user)

    existing_result = (
        current_user.client
        .table("promotional_items")
        .select("*")
        .eq("id", str(promotion_id))
        .maybe_single()
        .execute()
    )

    existing_data = getattr(existing_result, "data", None) if existing_result else None
    if not existing_data:
        raise NotFoundError("Promotional item not found")

    existing = existing_data

    (
        current_user.client
        .table("promotional_items")
        .delete()
        .eq("id", str(promotion_id))
        .execute()
    )

    record_audit(
        actor_user_id=current_user.user.id,
        action="PROMOTION_DELETED",
        entity_type="PROMOTIONAL_ITEM",
        entity_id=promotion_id,
        metadata={
            "title": existing.get("title"),
            "image_media_id": existing.get("image_media_id"),
            "external_url": existing.get("external_url"),
            "event_date": existing.get("event_date"),
            "display_order": existing.get("display_order"),
            "is_active": existing.get("is_active"),
            "starts_at": existing.get("starts_at"),
            "ends_at": existing.get("ends_at"),
        },
        client=current_user.client,
    )

    return None