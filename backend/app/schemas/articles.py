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
    description: str | None = None
    image_url: str | None = None


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
    category_id: UUID | None = None
    published_at: datetime | None = None
    created_at: datetime | None = None
    cover: ArticleMedia | None = None
    cover_image_url: str | None = None
    is_author_pick: bool = False
    is_featured: bool = False
    reading_time_minutes: int | None = None
    author_name: str | None = None
    is_published: bool = True


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
    allow_custom_response: bool = True
    xp_reward: int = 0


class ArticleQuizOption(BaseModel):
    id: UUID
    option_text: str
    display_order: int
    is_correct: bool = False
    explanation: str | None = None


class ArticleQuizQuestion(BaseModel):
    id: UUID
    question: str
    display_order: int
    options: list[ArticleQuizOption] = []


class ArticleQuizData(BaseModel):
    id: UUID
    questions: list[ArticleQuizQuestion] = []
    xp_reward: int = 0


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
    external_url: str | None = None
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
    category: ArticleCategory | None = None
    category_id: UUID | None = None
    published_at: datetime | None = None
    cover_image_url: str | None = None
    is_author_pick: bool = False
    is_featured: bool = False
    reading_time_minutes: int | None = None
    author_name: str | None = None
    is_published: bool = True
    blocks: list[ArticleBlock]