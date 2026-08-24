from fastapi import APIRouter

from app.db.supabase import supabase
from app.schemas.categories import CategoryListResponse


router = APIRouter(
    prefix="/api/v1/categories",
    tags=["Categories"],
)


@router.get(
    "",
    response_model=CategoryListResponse,
)
async def list_categories():
    response = (
        supabase
        .table("categories")
        .select(
            """
            id,
            name,
            slug,
            description,
            display_order
            """
        )
        .eq("is_active", True)
        .order("display_order")
        .execute()
    )

    items = []

    for category in response.data or []:
        items.append(
            {
                "id": category["id"],
                "name": category["name"],
                "slug": category["slug"],
                "description": category["description"],
                "display_order": category["display_order"],
            }
        )

    return {"items": items}