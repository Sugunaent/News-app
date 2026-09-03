from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ============================================================
# USERS
# ============================================================


class SuperadminUserListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str | None
    display_name: str | None
    avatar_media_id: UUID | None
    role: str
    is_active: bool
    created_at: datetime


class SuperadminUserListResponse(BaseModel):
    items: list[SuperadminUserListItem]
    total: int


class SuperadminUserDetailResponse(BaseModel):
    id: UUID
    email: str | None
    display_name: str | None
    avatar_media_id: UUID | None
    role: str
    is_active: bool

    total_xp: int
    level: dict | None
    articles_completed: int
    quiz_performance: dict
    opinions_submitted: int
    badges: list
    achievement_history: list
    share_cards: list


class SuperadminUserStatusUpdate(BaseModel):
    is_active: bool


# ============================================================
# COMMENTS
# ============================================================


class SuperadminCommentAuthor(BaseModel):
    id: UUID
    display_name: str | None
    email: str | None


class SuperadminCommentResponse(BaseModel):
    id: UUID
    article_id: UUID
    user_id: UUID
    content: str
    is_hidden: bool
    deleted_at: datetime | None
    created_at: datetime
    updated_at: datetime
    author: SuperadminCommentAuthor


class SuperadminCommentListResponse(BaseModel):
    items: list[SuperadminCommentResponse]
    total: int


# ============================================================
# XP RULES
# ============================================================


class SuperadminXPCreate(BaseModel):
    event_type: str = Field(min_length=1, max_length=100)
    amount: int = Field(ge=0)
    description: str | None = Field(
        default=None,
        max_length=500,
    )
    is_active: bool = True


class SuperadminXPUpdate(BaseModel):
    event_type: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )
    amount: int | None = Field(
        default=None,
        ge=0,
    )
    description: str | None = Field(
        default=None,
        max_length=500,
    )
    is_active: bool | None = None


class SuperadminXPResponse(BaseModel):
    id: UUID
    event_type: str
    amount: int
    description: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class SuperadminXPListResponse(BaseModel):
    items: list[SuperadminXPResponse]


# ============================================================
# LEVELS
# ============================================================


class SuperadminLevelCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    minimum_xp: int = Field(ge=0)
    display_order: int = Field(ge=0)


class SuperadminLevelUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )
    minimum_xp: int | None = Field(
        default=None,
        ge=0,
    )
    display_order: int | None = Field(
        default=None,
        ge=0,
    )


class SuperadminLevelResponse(BaseModel):
    id: UUID
    name: str
    minimum_xp: int
    display_order: int
    created_at: datetime


class SuperadminLevelListResponse(BaseModel):
    items: list[SuperadminLevelResponse]


# ============================================================
# BADGES
# ============================================================


class SuperadminBadgeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str = Field(min_length=1, max_length=500)
    image_asset_id: UUID | None = None
    rule_type: str = Field(min_length=1, max_length=100)
    rule_config: dict = Field(default_factory=dict)
    is_active: bool = True


class SuperadminBadgeUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )
    description: str | None = Field(
        default=None,
        min_length=1,
        max_length=500,
    )
    image_asset_id: UUID | None = None
    rule_type: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )
    rule_config: dict | None = None
    is_active: bool | None = None


class SuperadminBadgeResponse(BaseModel):
    id: UUID
    name: str
    description: str
    image_asset_id: UUID | None
    rule_type: str
    rule_config: dict
    is_active: bool
    created_at: datetime
    updated_at: datetime


class SuperadminBadgeListResponse(BaseModel):
    items: list[SuperadminBadgeResponse]