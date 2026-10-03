from datetime import datetime
from uuid import UUID

from pydantic import AnyHttpUrl, BaseModel, ConfigDict, Field, model_validator


class AdvertisementSlotResponse(BaseModel):
    id: UUID
    key: str
    name: str
    description: str | None
    placement: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class AdvertisementMediaResponse(BaseModel):
    id: UUID
    storage_path: str
    signed_url: str | None = None


class AdvertisementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    slot_id: UUID
    slot: AdvertisementSlotResponse

    image_media_id: UUID | None
    image_url: AnyHttpUrl | None = None
    image: AdvertisementMediaResponse | None = None

    title: str
    description: str
    destination_url: AnyHttpUrl

    starts_at: datetime | None
    ends_at: datetime | None

    is_active: bool
    display_order: int

    created_at: datetime
    updated_at: datetime


class AdvertisementCreate(BaseModel):
    slot_id: UUID
    image_media_id: str | None = None
    image_url: AnyHttpUrl | None = None

    title: str = Field(
        min_length=1,
        max_length=200,
    )

    description: str = Field(
        min_length=1,
        max_length=1000,
    )

    destination_url: AnyHttpUrl

    starts_at: datetime | None = None
    ends_at: datetime | None = None

    is_active: bool = True

    display_order: int = Field(
        default=0,
        ge=0,
    )

    @model_validator(mode="after")
    def require_image_source(self):
        if (self.image_media_id is None) == (self.image_url is None):
            raise ValueError("Provide exactly one of image_media_id or image_url")
        return self


class AdvertisementUpdate(BaseModel):
    slot_id: UUID | None = None
    image_media_id: str | None = None
    image_url: AnyHttpUrl | None = None

    title: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
    )

    description: str | None = Field(
        default=None,
        min_length=1,
        max_length=1000,
    )

    destination_url: AnyHttpUrl | None = None

    starts_at: datetime | None = None
    ends_at: datetime | None = None

    is_active: bool | None = None

    display_order: int | None = Field(
        default=None,
        ge=0,
    )

    @model_validator(mode="after")
    def allow_only_one_image_source(self):
        if self.image_media_id is not None and self.image_url is not None:
            raise ValueError("Provide only one of image_media_id or image_url")
        return self


class AdvertisementSlotCreate(BaseModel):
    key: str = Field(
        min_length=1,
        max_length=100,
    )

    name: str = Field(
        min_length=1,
        max_length=200,
    )

    description: str | None = Field(
        default=None,
        max_length=1000,
    )

    is_active: bool = True


class AdvertisementSlotUpdate(BaseModel):
    key: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )

    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
    )

    description: str | None = Field(
        default=None,
        max_length=1000,
    )

    is_active: bool | None = None