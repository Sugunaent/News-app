from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator


class OpinionOptionResponse(BaseModel):
    id: UUID
    display_order: int
    option_text: str


class OpinionQuestionResponse(BaseModel):
    id: UUID
    article_id: UUID
    display_order: int
    allow_custom_response: bool
    question_text: str
    options: list[OpinionOptionResponse]


class OpinionResponseCreate(BaseModel):
    selected_option_id: UUID | None = None
    custom_response: str | None = Field(
        default=None,
        max_length=200,
    )

    @field_validator("custom_response")
    @classmethod
    def validate_custom_response(cls, value):
        if value is not None and not value.strip():
            raise ValueError(
                "Custom opinion response cannot be blank"
            )
        return value

    @model_validator(mode="after")
    def validate_exactly_one_response(self):
        has_option = self.selected_option_id is not None
        has_custom = self.custom_response is not None

        if has_option == has_custom:
            raise ValueError(
                "Provide exactly one of selected_option_id or custom_response"
            )

        return self


class OpinionResponseData(BaseModel):
    id: UUID
    opinion_question_id: UUID
    selected_option_id: UUID | None
    custom_response: str | None
    created_at: datetime


class OpinionSubmitResponse(BaseModel):
    response: OpinionResponseData