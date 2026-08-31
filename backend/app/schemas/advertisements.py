from datetime import datetime
from uuid import UUID

from pydantic import AnyHttpUrl, BaseModel, ConfigDict, Field


class AdvertisementSlotResponse(BaseModel):
    id: UUID
    key: str
    name: str
    description: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class AdvertisementMediaResponse(BaseModel):
    id: UUID
    storage_path: str


class AdvertisementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    slot_id: UUID
    slot: AdvertisementSlotResponse

    image_media_id: UUID
    image: AdvertisementMediaResponse

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
    image_media_id: UUID

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


class AdvertisementUpdate(BaseModel):
    slot_id: UUID | None = None
    image_media_id: UUID | None = None

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