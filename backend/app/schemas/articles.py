from datetime import datetime
from typing import Annotated, Literal, Union
from uuid import UUID

from pydantic import BaseModel, Field


# ============================================================
# CATEGORY & LIST SCHEMAS
# ============================================================


class ArticleCategory(BaseModel):
    id: UUID
    name: str
    slug: str


class ArticleMedia(BaseModel):
    id: UUID
    storage_path: str
    media_type: str
    mime_type: str
    signed_url: str | None = None


class ArticleListItem(BaseModel):
    id: UUID
    slug: str
    title: str
    subtitle: str | None = None
    article_type: str
    category: ArticleCategory | None = None
    published_at: datetime | None = None
    cover: ArticleMedia | None = None


class ArticleListResponse(BaseModel):
    items: list[ArticleListItem]


# ============================================================
# MEDIA & NESTED BLOCK DATA SCHEMAS
# ============================================================


class OpinionOption(BaseModel):
    id: UUID
    option_text: str
    display_order: int
    vote_count: int | None = None


class ArticleOpinionData(BaseModel):
    id: UUID
    question: str
    options: list[OpinionOption] = []


class ArticleQuizOption(BaseModel):
    id: UUID
    option_text: str
    display_order: int


class ArticleQuizQuestion(BaseModel):
    id: UUID
    question: str
    display_order: int
    options: list[ArticleQuizOption] = []


class ArticleQuizData(BaseModel):
    id: UUID
    questions: list[ArticleQuizQuestion] = []


# ============================================================
# BLOCK TYPES (DISCRIMINATED UNION)
# ============================================================


class ArticleTextBlock(BaseModel):
    id: UUID
    type: Literal["TEXT"]
    display_order: int
    text: str | None = None


class ArticleImageBlock(BaseModel):
    id: UUID
    type: Literal["IMAGE"]
    display_order: int
    caption: str | None = None
    media: ArticleMedia | None = None


class ArticlePodcastBlock(BaseModel):
    id: UUID
    type: Literal["PODCAST"]
    display_order: int
    description: str | None = None
    external_url: str | None = None


class ArticleOpinionBlock(BaseModel):
    id: UUID
    type: Literal["OPINION"]
    display_order: int
    opinion_id: UUID | None = None
    opinion: ArticleOpinionData | None = None


class ArticleQuizBlock(BaseModel):
    id: UUID
    type: Literal["QUIZ"]
    display_order: int
    quiz_id: UUID | None = None
    quiz: ArticleQuizData | None = None


# Discriminated union based on the `type` field
ArticleBlock = Annotated[
    Union[
        ArticleTextBlock,
        ArticleImageBlock,
        ArticlePodcastBlock,
        ArticleOpinionBlock,
        ArticleQuizBlock,
    ],
    Field(discriminator="type"),
]


# ============================================================
# DETAIL RESPONSE SCHEMA
# ============================================================


class ArticleDetailResponse(BaseModel):
    id: UUID
    slug: str
    title: str
    subtitle: str | None = None
    summary: str | None = None
    article_type: str
    category: ArticleCategory
    published_at: datetime | None = None
    blocks: list[ArticleBlock]