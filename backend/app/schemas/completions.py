from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ArticleCompletionResponse(BaseModel):
    article_id: UUID
    completed_at: datetime