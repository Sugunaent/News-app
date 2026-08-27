from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class GamificationLevelResponse(BaseModel):
    id: UUID
    name: str
    minimum_xp: int
    display_order: int


class GamificationBadgeResponse(BaseModel):
    id: UUID
    name: str
    description: str
    image_asset_id: UUID | None
    earned_at: datetime


class XPTransactionResponse(BaseModel):
    id: UUID
    xp_rule_id: UUID | None
    article_id: UUID | None
    source_type: str
    source_id: UUID
    amount: int
    created_at: datetime


class GamificationResponse(BaseModel):
    total_xp: int
    level: GamificationLevelResponse | None
    badges: list[GamificationBadgeResponse]
    transactions: list[XPTransactionResponse]