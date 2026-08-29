from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ArticleCompletionShareResponse(BaseModel):
    article_id: UUID
    article_title: str
    completed_at: datetime


class OpinionShareResponse(BaseModel):
    article_id: UUID
    article_title: str
    opinion_question_id: UUID
    opinion_question: str
    selected_option_id: UUID | None
    selected_option_text: str | None
    custom_response: str | None
    created_at: datetime