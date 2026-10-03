from datetime import datetime
from uuid import UUID

from pydantic import AnyHttpUrl, BaseModel, ConfigDict, Field, model_validator


class PromotionalMediaResponse(BaseModel):
    id: UUID
    storage_path: str
    signed_url: str | None = None


class PromotionalItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    image_media_id: UUID | None
    image_url: AnyHttpUrl | None = None
    image: PromotionalMediaResponse | None = None
    title: str
    description: str
    external_url: AnyHttpUrl
    event_date: datetime | None
    display_order: int
    is_active: bool
    starts_at: datetime | None
    ends_at: datetime | None
    created_at: datetime
    updated_at: datetime


class PromotionalItemCreate(BaseModel):
    image_media_id: str | None = None
    image_url: AnyHttpUrl | None = None
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=1000)
    external_url: AnyHttpUrl
    event_date: datetime | None = None
    display_order: int = Field(default=0, ge=0)
    is_active: bool = True
    starts_at: datetime | None = None
    ends_at: datetime | None = None

    @model_validator(mode="after")
    def require_image_source(self):
        if (self.image_media_id is None) == (self.image_url is None):
            raise ValueError("Provide exactly one of image_media_id or image_url")
        return self


class PromotionalItemUpdate(BaseModel):
    image_media_id: str | None = None
    image_url: AnyHttpUrl | None = None
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, min_length=1, max_length=1000)
    external_url: AnyHttpUrl | None = None
    event_date: datetime | None = None
    display_order: int | None = Field(default=None, ge=0)
    is_active: bool | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None

    @model_validator(mode="after")
    def allow_only_one_image_source(self):
        if self.image_media_id is not None and self.image_url is not None:
            raise ValueError("Provide only one of image_media_id or image_url")
        return self