from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ArticleCompletionResponse(BaseModel):
    article_id: UUID
    completed_at: datetime
    xp_earned: int = 0
    total_xp: int = 0
    new_level: int = 1
    already_completed: bool = False