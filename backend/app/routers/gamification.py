from uuid import UUID
from fastapi import APIRouter, Depends

from app.dependencies.auth import AuthContext, get_current_user
from app.db.supabase import supabase, supabase_admin
from app.schemas.gamification import (
    GamificationBadgeCatalogItem,
    GamificationLevelResponse,
    GamificationResponse,
    XPRulePublicResponse,
)
from app.services.gamification import get_gamification_status
from app.services.media_urls import create_signed_url


router = APIRouter(
    prefix="/api/v1/gamification",
    tags=["Gamification"],
)


@router.get(
    "/me",
    response_model=GamificationResponse,
)
def get_my_gamification(
    auth: AuthContext = Depends(get_current_user),
):
    # Standardize user_id conversion whether auth.user.id is string or UUID
    user_id = auth.user.id
    if isinstance(user_id, str):
        user_id = UUID(user_id)

    # Pass the user_id to service layer
    return get_gamification_status(user_id)


@router.get(
    "/levels",
    response_model=list[GamificationLevelResponse],
)
def list_levels():
    response = (
        supabase_admin.table("levels")
        .select("id, name, minimum_xp, display_order")
        .order("minimum_xp")
        .execute()
    )
    return response.data or []


@router.get(
    "/badges",
    response_model=list[GamificationBadgeCatalogItem],
)
def list_badges():
    response = (
        supabase_admin.table("badges")
        .select("id, name, description, image_asset_id")
        .eq("is_active", True)
        .execute()
    )
    items = []
    for badge in response.data or []:
        image_url = None
        asset_id = badge.get("image_asset_id")
        if asset_id:
            media = (
                supabase_admin.table("media_assets")
                .select("storage_path")
                .eq("id", str(asset_id))
                .maybe_single()
                .execute()
            )
            if media and media.data:
                image_url = create_signed_url(media.data.get("storage_path"))
        items.append(
            {
                "id": badge["id"],
                "name": badge["name"],
                "description": badge["description"],
                "image_asset_id": asset_id,
                "image_url": image_url,
            }
        )
    return items


@router.get(
    "/xp-rules",
    response_model=list[XPRulePublicResponse],
)
def list_public_xp_rules():
    response = (
        supabase.table("xp_rules")
        .select("event_type, amount")
        .eq("is_active", True)
        .execute()
    )
    return response.data or []