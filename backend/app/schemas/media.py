from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class MediaReferenceResponse(BaseModel):
    resource_type: str
    resource_id: UUID


class MediaAssetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    storage_path: str
    media_type: str
    mime_type: str
    file_size: int | None
    uploaded_by: UUID | None
    created_at: datetime
    signed_url: str | None = None


class MediaAssetDetailResponse(MediaAssetResponse):
    references: list[MediaReferenceResponse] = []


class MediaUploadResponse(MediaAssetResponse):
    pass