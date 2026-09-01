from datetime import datetime, timezone
from uuid import UUID
from app.db.supabase import supabase

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.exceptions import AuthorizationError, NotFoundError
from app.dependencies.auth import AuthContext, get_current_user
from app.schemas.advertisements import (
    AdvertisementCreate,
    AdvertisementResponse,
    AdvertisementSlotCreate,
    AdvertisementSlotResponse,
    AdvertisementSlotUpdate,
    AdvertisementUpdate,
)
from fastapi.responses import RedirectResponse

from app.services.analytics import (
    record_advertisement_click,
)


router = APIRouter(
    prefix="/api/v1/advertisements",
    tags=["Advertisements"],
)


def _require_superadmin(context: AuthContext) -> None:
    user_role = getattr(context.user, "role", None)

    if user_role != "SUPERADMIN":
        raise AuthorizationError(
            "Superadmin access required"
        )


def _build_slot_select_query() -> str:
    return """
        id,
        key,
        name,
        description,
        is_active,
        created_at,
        updated_at
    """


def _build_ad_select_query() -> str:
    return """
        id,
        slot_id,
        image_media_id,
        title,
        description,
        destination_url,
        starts_at,
        ends_at,
        is_active,
        display_order,
        created_at,
        updated_at,

        slot:advertisement_slots (
            id,
            key,
            name,
            description,
            is_active,
            created_at,
            updated_at
        ),

        image:media_assets (
            id,
            storage_path
        )
    """


def _parse_datetime(value):
    if not value:
        return None

    if isinstance(value, datetime):
        return value

    return datetime.fromisoformat(
        value.replace("Z", "+00:00")
    )


def _validate_visibility_window(
    starts_at,
    ends_at,
) -> None:
    starts_at = _parse_datetime(starts_at)
    ends_at = _parse_datetime(ends_at)

    if starts_at and ends_at and ends_at <= starts_at:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="ends_at must be later than starts_at",
        )


def _validate_media(
    client,
    image_media_id: UUID,
) -> None:
    result = (
        client
        .table("media_assets")
        .select("id, storage_path")
        .eq("id", str(image_media_id))
        .maybe_single()
        .execute()
    )

    if not result.data:
        raise NotFoundError(
            "Advertisement image media not found"
        )


def _validate_slot(
    client,
    slot_id: UUID,
) -> None:
    result = (
        client
        .table("advertisement_slots")
        .select(_build_slot_select_query())
        .eq("id", str(slot_id))
        .maybe_single()
        .execute()
    )

    if not result.data:
        raise NotFoundError(
            "Advertisement slot not found"
        )


# ============================================================
# PUBLIC ADVERTISEMENT RETRIEVAL
# ============================================================

@router.get(
    "",
    response_model=list[AdvertisementResponse],
)
def list_advertisements(
    slot: str | None = None,
):
    """
    Return currently eligible advertisements.

    Public access is intentional. Supabase RLS limits the
    underlying dataset to active advertisements belonging to
    active slots and currently valid scheduling windows.
    """

    query = (
        supabase
        .table("advertisements")
        .select(_build_ad_select_query())
    )

    if slot is not None:
        query = (
            query
            .eq("slot.key", slot)
        )

    result = (
        query
        .order("display_order", desc=False)
        .order("created_at", desc=True)
        .execute()
    )

    advertisements = result.data or []

    # Keep visibility enforcement explicit at the API layer as
    # well as in RLS, matching the existing promotions pattern.
    now = datetime.now(timezone.utc)

    visible = []

    for advertisement in advertisements:
        starts_at = _parse_datetime(
            advertisement.get("starts_at")
        )

        ends_at = _parse_datetime(
            advertisement.get("ends_at")
        )

        if starts_at and starts_at > now:
            continue

        if ends_at and ends_at <= now:
            continue

        slot_data = advertisement.get("slot") or {}

        if not slot_data.get("is_active", False):
            continue

        if not advertisement.get("is_active", False):
            continue

        visible.append(advertisement)

    return visible


# ============================================================
# PUBLIC SLOT RETRIEVAL
# ============================================================

@router.get(
    "/slots",
    response_model=list[AdvertisementSlotResponse],
)
def list_advertisement_slots():
    """
    Return active advertisement slots.
    """

    result = (
        supabase
        .table("advertisement_slots")
        .select(_build_slot_select_query())
        .eq("is_active", True)
        .order("key", desc=False)
        .execute()
    )

    return result.data or []


# ============================================================
# SUPERADMIN ADVERTISEMENT LIST
# ============================================================

@router.get(
    "/admin",
    response_model=list[AdvertisementResponse],
)
def list_advertisements_admin(
    current_user: AuthContext = Depends(
        get_current_user
    ),
):
    """
    Return all advertisements for Superadmin management.
    """

    _require_superadmin(current_user)

    result = (
        current_user.client
        .table("advertisements")
        .select(_build_ad_select_query())
        .order("display_order", desc=False)
        .order("created_at", desc=True)
        .execute()
    )

    return result.data or []


# ============================================================
# PUBLIC ADVERTISEMENT CLICK
# ============================================================

@router.get(
    "/{advertisement_id}/click",
)
def click_advertisement(
    advertisement_id: UUID,
):
    """
    Record an advertisement click and redirect the visitor
    to the advertisement destination URL.

    This endpoint is intentionally public because advertisements
    can be clicked by anonymous visitors.

    Authentication-aware attribution will be added through the
    optional-auth dependency so authenticated clicks can also
    contribute to unique-clicker analytics.
    """

    result = (
        supabase
        .table("advertisements")
        .select(
            """
            id,
            destination_url,
            starts_at,
            ends_at,
            is_active,
            slot:advertisement_slots (
                id,
                is_active
            )
            """
        )
        .eq("id", str(advertisement_id))
        .maybe_single()
        .execute()
    )

    advertisement = result.data

    if not advertisement:
        raise NotFoundError(
            "Advertisement not found"
        )

    now = datetime.now(timezone.utc)

    starts_at = _parse_datetime(
        advertisement.get("starts_at")
    )

    ends_at = _parse_datetime(
        advertisement.get("ends_at")
    )

    if starts_at and starts_at > now:
        raise NotFoundError(
            "Advertisement not found"
        )

    if ends_at and ends_at <= now:
        raise NotFoundError(
            "Advertisement not found"
        )

    if not advertisement.get("is_active", False):
        raise NotFoundError(
            "Advertisement not found"
        )

    slot = advertisement.get("slot") or {}

    if not slot.get("is_active", False):
        raise NotFoundError(
            "Advertisement not found"
        )

    destination_url = advertisement.get(
        "destination_url"
    )

    if not destination_url:
        raise NotFoundError(
            "Advertisement destination not found"
        )

    # Record the successful click.
    #
    # user_id will be supplied by optional authentication once
    # the shared auth dependency is extended.
    record_advertisement_click(
        advertisement_id=advertisement_id,
        user_id=None,
    )

    return RedirectResponse(
        url=destination_url,
        status_code=status.HTTP_307_TEMPORARY_REDIRECT,
    )

# ============================================================
# SUPERADMIN SINGLE ADVERTISEMENT
# ============================================================

@router.get(
    "/admin/{advertisement_id}",
    response_model=AdvertisementResponse,
)
def get_advertisement_admin(
    advertisement_id: UUID,
    current_user: AuthContext = Depends(
        get_current_user
    ),
):
    """
    Return one advertisement for Superadmin management.
    """

    _require_superadmin(current_user)

    result = (
        current_user.client
        .table("advertisements")
        .select(_build_ad_select_query())
        .eq("id", str(advertisement_id))
        .maybe_single()
        .execute()
    )

    if not result.data:
        raise NotFoundError(
            "Advertisement not found"
        )

    return result.data


# ============================================================
# SUPERADMIN CREATE
# ============================================================

@router.post(
    "",
    response_model=AdvertisementResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_advertisement(
    payload: AdvertisementCreate,
    current_user: AuthContext = Depends(
        get_current_user
    ),
):
    """
    Create an advertisement.
    """

    _require_superadmin(current_user)

    _validate_visibility_window(
        payload.starts_at,
        payload.ends_at,
    )

    _validate_slot(
        current_user.client,
        payload.slot_id,
    )

    _validate_media(
        current_user.client,
        payload.image_media_id,
    )

    data = payload.model_dump(mode="json")

    data["destination_url"] = str(
        payload.destination_url
    )

    result = (
        current_user.client
        .table("advertisements")
        .insert(data)
        .select(_build_ad_select_query())
        .single()
        .execute()
    )

    if not result.data:
        raise NotFoundError(
            "Advertisement could not be created"
        )

    return result.data


# ============================================================
# SUPERADMIN UPDATE
# ============================================================

@router.patch(
    "/{advertisement_id}",
    response_model=AdvertisementResponse,
)
def update_advertisement(
    advertisement_id: UUID,
    payload: AdvertisementUpdate,
    current_user: AuthContext = Depends(
        get_current_user
    ),
):
    """
    Update an advertisement.
    """

    _require_superadmin(current_user)

    existing_result = (
        current_user.client
        .table("advertisements")
        .select("*")
        .eq("id", str(advertisement_id))
        .maybe_single()
        .execute()
    )

    if not existing_result.data:
        raise NotFoundError(
            "Advertisement not found"
        )

    existing = existing_result.data

    merged_starts_at = payload.starts_at

    if "starts_at" not in payload.model_fields_set:
        merged_starts_at = existing.get("starts_at")

    merged_ends_at = payload.ends_at

    if "ends_at" not in payload.model_fields_set:
        merged_ends_at = existing.get("ends_at")

    _validate_visibility_window(
        merged_starts_at,
        merged_ends_at,
    )

    if "slot_id" in payload.model_fields_set:
        if payload.slot_id is not None:
            _validate_slot(
                current_user.client,
                payload.slot_id,
            )

    if "image_media_id" in payload.model_fields_set:
        if payload.image_media_id is not None:
            _validate_media(
                current_user.client,
                payload.image_media_id,
            )

    data = payload.model_dump(
        mode="json",
        exclude_unset=True,
    )

    if (
        "destination_url" in data
        and data["destination_url"] is not None
    ):
        data["destination_url"] = str(
            payload.destination_url
        )

    result = (
        current_user.client
        .table("advertisements")
        .update(data)
        .eq("id", str(advertisement_id))
        .select(_build_ad_select_query())
        .single()
        .execute()
    )

    if not result.data:
        raise NotFoundError(
            "Advertisement not found"
        )

    return result.data


# ============================================================
# SUPERADMIN DELETE
# ============================================================

@router.delete(
    "/{advertisement_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_advertisement(
    advertisement_id: UUID,
    current_user: AuthContext = Depends(
        get_current_user
    ),
):
    """
    Delete an advertisement.
    """

    _require_superadmin(current_user)

    existing_result = (
        current_user.client
        .table("advertisements")
        .select("id")
        .eq("id", str(advertisement_id))
        .maybe_single()
        .execute()
    )

    if not existing_result.data:
        raise NotFoundError(
            "Advertisement not found"
        )

    (
        current_user.client
        .table("advertisements")
        .delete()
        .eq("id", str(advertisement_id))
        .execute()
    )

    return None


# ============================================================
# SUPERADMIN SLOT MANAGEMENT
# ============================================================

@router.get(
    "/slots/admin",
    response_model=list[AdvertisementSlotResponse],
)
def list_advertisement_slots_admin(
    current_user: AuthContext = Depends(
        get_current_user
    ),
):
    """
    Return all advertisement slots for Superadmin management.
    """

    _require_superadmin(current_user)

    result = (
        current_user.client
        .table("advertisement_slots")
        .select(_build_slot_select_query())
        .order("key", desc=False)
        .execute()
    )

    return result.data or []


@router.post(
    "/slots",
    response_model=AdvertisementSlotResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_advertisement_slot(
    payload: AdvertisementSlotCreate,
    current_user: AuthContext = Depends(
        get_current_user
    ),
):
    """
    Create an advertisement slot.
    """

    _require_superadmin(current_user)

    data = payload.model_dump()

    data["key"] = data["key"].strip()
    data["name"] = data["name"].strip()

    if data.get("description") is not None:
        data["description"] = data["description"].strip()

    result = (
        current_user.client
        .table("advertisement_slots")
        .insert(data)
        .select(_build_slot_select_query())
        .single()
        .execute()
    )

    if not result.data:
        raise NotFoundError(
            "Advertisement slot could not be created"
        )

    return result.data


@router.patch(
    "/slots/{slot_id}",
    response_model=AdvertisementSlotResponse,
)
def update_advertisement_slot(
    slot_id: UUID,
    payload: AdvertisementSlotUpdate,
    current_user: AuthContext = Depends(
        get_current_user
    ),
):
    """
    Update an advertisement slot.
    """

    _require_superadmin(current_user)

    existing_result = (
        current_user.client
        .table("advertisement_slots")
        .select("id")
        .eq("id", str(slot_id))
        .maybe_single()
        .execute()
    )

    if not existing_result.data:
        raise NotFoundError(
            "Advertisement slot not found"
        )

    data = payload.model_dump(
        exclude_unset=True
    )

    if "key" in data and data["key"] is not None:
        data["key"] = data["key"].strip()

    if "name" in data and data["name"] is not None:
        data["name"] = data["name"].strip()

    if (
        "description" in data
        and data["description"] is not None
    ):
        data["description"] = data["description"].strip()

    result = (
        current_user.client
        .table("advertisement_slots")
        .update(data)
        .eq("id", str(slot_id))
        .select(_build_slot_select_query())
        .single()
        .execute()
    )

    if not result.data:
        raise NotFoundError(
            "Advertisement slot not found"
        )

    return result.data


@router.delete(
    "/slots/{slot_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_advertisement_slot(
    slot_id: UUID,
    current_user: AuthContext = Depends(
        get_current_user
    ),
):
    """
    Delete an advertisement slot.
    """

    _require_superadmin(current_user)

    existing_result = (
        current_user.client
        .table("advertisement_slots")
        .select("id")
        .eq("id", str(slot_id))
        .maybe_single()
        .execute()
    )

    if not existing_result.data:
        raise NotFoundError(
            "Advertisement slot not found"
        )

    (
        current_user.client
        .table("advertisement_slots")
        .delete()
        .eq("id", str(slot_id))
        .execute()
    )

    return None