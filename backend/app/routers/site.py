from fastapi import APIRouter, Depends

from app.core.exceptions import AuthorizationError
from app.db.supabase import supabase, supabase_admin
from app.dependencies.auth import AuthContext, get_current_user
from app.schemas.site import HeroConfig, HeroConfigUpdate, TeamMemberResponse
from app.services.audit import record_audit

router = APIRouter(
    prefix="/api/v1/site",
    tags=["Site"],
)

DEFAULT_HERO = {
    "imageUrl": "/modern_stories_hero.jpg",
    "title": "Human stories & modern ideas",
    "subtitle": (
        "A sanctuary to read, write, and deepen your understanding "
        "across technology, science, culture, and human ingenuity."
    ),
    "badgeText": "The Modern Stories • Curated Editorial",
    "linkText": "Know more",
    "linkUrl": "/about",
}


def _require_superadmin(context: AuthContext) -> None:
    if getattr(context.user, "role", None) != "SUPERADMIN":
        raise AuthorizationError("Superadmin access required")


@router.get("/hero", response_model=HeroConfig)
async def get_hero_config():
    response = (
        supabase.table("site_settings")
        .select("value")
        .eq("key", "hero_banner")
        .maybe_single()
        .execute()
    )
    value = (response.data or {}).get("value") if response and response.data else None
    if not isinstance(value, dict):
        return DEFAULT_HERO
    
    result = {**DEFAULT_HERO, **value}
    image_url = result.get("imageUrl")
    if image_url and not (image_url.startswith("http://") or image_url.startswith("https://") or image_url.startswith("/")):
        from app.services.media_urls import create_signed_url
        signed = create_signed_url(image_url)
        if signed:
            result["imageUrl"] = signed
            
    return result


@router.put("/hero", response_model=HeroConfig)
async def update_hero_config(
    payload: HeroConfigUpdate,
    auth: AuthContext = Depends(get_current_user),
):
    _require_superadmin(auth)
    
    response = (
        supabase.table("site_settings")
        .select("value")
        .eq("key", "hero_banner")
        .maybe_single()
        .execute()
    )
    raw_value = (response.data or {}).get("value") if response and response.data else None
    if not isinstance(raw_value, dict):
        raw_value = {}
        
    updated = {**DEFAULT_HERO, **raw_value}
    
    for key, value in payload.model_dump(exclude_none=True).items():
        updated[key] = value

    supabase_admin.table("site_settings").upsert(
        {
            "key": "hero_banner",
            "value": updated,
            "updated_by": str(auth.user.id),
        }
    ).execute()

    record_audit(
        actor_user_id=auth.user.id,
        action="HERO_UPDATED",
        entity_type="SITE_SETTINGS",
        entity_id=None,
        metadata={"keys": list(payload.model_dump(exclude_none=True).keys())},
        client=auth.client,
    )
    return updated


@router.get("/team", response_model=list[TeamMemberResponse])
async def list_team_members():
    response = (
        supabase.table("team_members")
        .select("id, name, role, bio, image_url, social_links, display_order")
        .eq("is_active", True)
        .order("display_order")
        .execute()
    )
    items = []
    for row in response.data or []:
        links = row.get("social_links") or []
        if not isinstance(links, list):
            links = []
        items.append({**row, "social_links": links})
    return items
