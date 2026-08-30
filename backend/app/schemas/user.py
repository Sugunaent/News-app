from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

class UserProfileResponse(BaseModel):
    id: UUID
    email: str
    display_name: str | None
    avatar_media_id: UUID | None
    role: str
    is_active: bool

class UserProfileLevelResponse(BaseModel):
    id: UUID
    name: str
    minimum_xp: int
    display_order: int

class UserProfileBadgeResponse(BaseModel):
    id: UUID
    name: str
    description: str
    image_asset_id: UUID | None
    earned_at: datetime

class UserProfileQuizPerformanceResponse(BaseModel):
    total_attempts: int
    correct_attempts: int
    incorrect_attempts: int
    accuracy_percentage: float

class UserProfileReadingProgressResponse(BaseModel):
    article_id: UUID
    progress_percentage: float
    last_block_id: UUID | None
    last_position: float | None
    started_at: datetime
    last_read_at: datetime
    completed_at: datetime | None

class UserProfileAchievementResponse(BaseModel):
    type: str
    title: str
    description: str
    earned_at: datetime
    article_id: UUID | None = None
    badge_id: UUID | None = None

class UserProfileAggregateResponse(BaseModel):
    user: UserProfileResponse
    total_xp: int
    current_level: UserProfileLevelResponse | None
    articles_completed: int
    quiz_performance: UserProfileQuizPerformanceResponse
    opinions_submitted: int
    badges: list[UserProfileBadgeResponse]
    achievement_history: list[UserProfileAchievementResponse]
    reading_history: list[UserProfileReadingProgressResponse]
