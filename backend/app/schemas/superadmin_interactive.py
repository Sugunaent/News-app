from uuid import UUID

from pydantic import BaseModel, Field, field_validator


# ============================================================
# SHARED VALIDATION
# ============================================================


def _validate_non_blank(value: str) -> str:
    value = value.strip()

    if not value:
        raise ValueError("Text cannot be blank")

    return value


# ============================================================
# QUIZ
# ============================================================


class SuperadminQuizCreate(BaseModel):
    article_id: UUID


class SuperadminQuizUpdate(BaseModel):
    article_id: UUID | None = None


class SuperadminQuizListItem(BaseModel):
    id: UUID
    article_id: UUID
    created_at: str
    updated_at: str


class SuperadminQuizDetailResponse(BaseModel):
    id: UUID
    article_id: UUID
    created_at: str
    updated_at: str
    questions: list["SuperadminQuizQuestionResponse"]


# ============================================================
# QUIZ QUESTIONS
# ============================================================


class SuperadminQuizQuestionCreate(BaseModel):
    question_text: str = Field(min_length=1)
    display_order: int = Field(default=0, ge=0)

    @field_validator("question_text")
    @classmethod
    def validate_question_text(cls, value: str) -> str:
        return _validate_non_blank(value)


class SuperadminQuizQuestionUpdate(BaseModel):
    question_text: str | None = None
    display_order: int | None = Field(default=None, ge=0)

    @field_validator("question_text")
    @classmethod
    def validate_question_text(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        return _validate_non_blank(value)


class SuperadminQuizQuestionResponse(BaseModel):
    id: UUID
    quiz_id: UUID
    display_order: int
    question_text: str | None
    created_at: str
    updated_at: str
    options: list["SuperadminQuizOptionResponse"] = Field(
        default_factory=list
    )


class SuperadminQuizQuestionReorderItem(BaseModel):
    id: UUID
    display_order: int = Field(ge=0)


class SuperadminQuizQuestionReorder(BaseModel):
    items: list[SuperadminQuizQuestionReorderItem]

    @field_validator("items")
    @classmethod
    def validate_unique_ids(
        cls,
        value: list[SuperadminQuizQuestionReorderItem],
    ):
        ids = [str(item.id) for item in value]

        if len(ids) != len(set(ids)):
            raise ValueError("Question IDs must be unique")

        orders = [item.display_order for item in value]

        if len(orders) != len(set(orders)):
            raise ValueError("Display orders must be unique")

        return value


# ============================================================
# QUIZ OPTIONS
# ============================================================


class SuperadminQuizOptionCreate(BaseModel):
    option_text: str = Field(min_length=1)
    display_order: int = Field(default=0, ge=0)
    is_correct: bool = False

    @field_validator("option_text")
    @classmethod
    def validate_option_text(cls, value: str) -> str:
        return _validate_non_blank(value)


class SuperadminQuizOptionUpdate(BaseModel):
    option_text: str | None = None
    display_order: int | None = Field(default=None, ge=0)
    is_correct: bool | None = None

    @field_validator("option_text")
    @classmethod
    def validate_option_text(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        return _validate_non_blank(value)


class SuperadminQuizOptionResponse(BaseModel):
    id: UUID
    question_id: UUID
    display_order: int
    is_correct: bool
    option_text: str | None
    created_at: str
    updated_at: str


class SuperadminQuizOptionReorderItem(BaseModel):
    id: UUID
    display_order: int = Field(ge=0)


class SuperadminQuizOptionReorder(BaseModel):
    items: list[SuperadminQuizOptionReorderItem]

    @field_validator("items")
    @classmethod
    def validate_unique_ids(
        cls,
        value: list[SuperadminQuizOptionReorderItem],
    ):
        ids = [str(item.id) for item in value]

        if len(ids) != len(set(ids)):
            raise ValueError("Option IDs must be unique")

        orders = [item.display_order for item in value]

        if len(orders) != len(set(orders)):
            raise ValueError("Display orders must be unique")

        return value


class SuperadminQuizCorrectAnswerUpdate(BaseModel):
    option_id: UUID


# ============================================================
# OPINION QUESTIONS
# ============================================================


class SuperadminOpinionCreate(BaseModel):
    article_id: UUID
    question_text: str = Field(min_length=1)
    display_order: int = Field(default=0, ge=0)
    allow_custom_response: bool = True

    @field_validator("question_text")
    @classmethod
    def validate_question_text(cls, value: str) -> str:
        return _validate_non_blank(value)


class SuperadminOpinionUpdate(BaseModel):
    question_text: str | None = None
    display_order: int | None = Field(default=None, ge=0)
    allow_custom_response: bool | None = None

    @field_validator("question_text")
    @classmethod
    def validate_question_text(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        return _validate_non_blank(value)


class SuperadminOpinionOptionCreate(BaseModel):
    option_text: str = Field(min_length=1)
    display_order: int = Field(default=0, ge=0)

    @field_validator("option_text")
    @classmethod
    def validate_option_text(cls, value: str) -> str:
        return _validate_non_blank(value)


class SuperadminOpinionOptionUpdate(BaseModel):
    option_text: str | None = None
    display_order: int | None = Field(default=None, ge=0)

    @field_validator("option_text")
    @classmethod
    def validate_option_text(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        return _validate_non_blank(value)


class SuperadminOpinionOptionResponse(BaseModel):
    id: UUID
    question_id: UUID
    display_order: int
    option_text: str | None
    created_at: str
    updated_at: str


class SuperadminOpinionResponse(BaseModel):
    id: UUID
    article_id: UUID
    display_order: int
    allow_custom_response: bool
    question_text: str | None
    created_at: str
    updated_at: str
    options: list[SuperadminOpinionOptionResponse] = Field(
        default_factory=list
    )


class SuperadminOpinionReorderItem(BaseModel):
    id: UUID
    display_order: int = Field(ge=0)


class SuperadminOpinionReorder(BaseModel):
    items: list[SuperadminOpinionReorderItem]

    @field_validator("items")
    @classmethod
    def validate_unique_ids(
        cls,
        value: list[SuperadminOpinionReorderItem],
    ):
        ids = [str(item.id) for item in value]

        if len(ids) != len(set(ids)):
            raise ValueError("Opinion IDs must be unique")

        orders = [item.display_order for item in value]

        if len(orders) != len(set(orders)):
            raise ValueError("Display orders must be unique")

        return value


class SuperadminOpinionOptionReorder(
    BaseModel
):
    items: list[SuperadminOpinionReorderItem]

    @field_validator("items")
    @classmethod
    def validate_unique_ids(
        cls,
        value: list[SuperadminOpinionReorderItem],
    ):
        ids = [str(item.id) for item in value]

        if len(ids) != len(set(ids)):
            raise ValueError("Option IDs must be unique")

        orders = [item.display_order for item in value]

        if len(orders) != len(set(orders)):
            raise ValueError("Display orders must be unique")

        return value


SuperadminQuizDetailResponse.model_rebuild()