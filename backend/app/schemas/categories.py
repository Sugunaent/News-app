from uuid import UUID

from pydantic import BaseModel


class CategoryResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    description: str | None
    display_order: int
    image_url: str | None = None


class CategoryListResponse(BaseModel):
    items: list[CategoryResponse]