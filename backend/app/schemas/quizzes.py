from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class QuizOptionResponse(BaseModel):
    id: UUID
    display_order: int
    option_text: str


class QuizQuestionResponse(BaseModel):
    id: UUID
    display_order: int
    question_text: str
    options: list[QuizOptionResponse]


class QuizResponse(BaseModel):
    id: UUID
    article_id: UUID
    questions: list[QuizQuestionResponse]


class QuizAttemptCreate(BaseModel):
    question_id: UUID
    selected_option_id: UUID


class QuizAttemptResponse(BaseModel):
    question_id: UUID
    selected_option_id: UUID
    is_correct: bool
    created_at: datetime


class QuizSubmitResponse(BaseModel):
    attempt: QuizAttemptResponse