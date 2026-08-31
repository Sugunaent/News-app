from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AnalyticsOverviewResponse(BaseModel):
    total_users: int
    active_users: int

    total_article_views: int
    unique_article_readers: int

    articles_completed: int

    quiz_attempts: int
    quiz_correct_attempts: int
    quiz_success_rate: float

    opinions_submitted: int
    comments_created: int
    shares_created: int

    advertisement_clicks: int


class AnalyticsArticleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    article_id: str
    title: str | None
    category_id: str | None
    category_name: str | None

    views: int
    unique_readers: int
    completions: int

    quiz_attempts: int
    quiz_correct_attempts: int
    quiz_success_rate: float

    opinion_responses: int
    comments: int
    shares: int


class AnalyticsCategoryResponse(BaseModel):
    category_id: str
    category_name: str

    article_views: int
    unique_readers: int
    article_completions: int


class AnalyticsUserEngagementResponse(BaseModel):
    user_id: str
    display_name: str | None
    email: str | None

    article_views: int
    articles_completed: int

    quiz_attempts: int
    quiz_correct_attempts: int

    opinions_submitted: int
    comments_created: int
    shares_created: int

    total_xp: int


class AnalyticsAdvertisementResponse(BaseModel):
    advertisement_id: str
    title: str
    slot_key: str | None

    clicks: int
    unique_clickers: int


class AnalyticsRecentActivityResponse(BaseModel):
    id: str
    event_type: str
    user_id: str | None
    article_id: str | None
    source_type: str | None
    source_id: str | None
    metadata: dict = Field(default_factory=dict)
    created_at: datetime


class AnalyticsDashboardResponse(BaseModel):
    overview: AnalyticsOverviewResponse
    top_articles: list[AnalyticsArticleResponse]
    popular_categories: list[AnalyticsCategoryResponse]
    most_engaged_users: list[AnalyticsUserEngagementResponse]
    advertisements: list[AnalyticsAdvertisementResponse]
    recent_activity: list[AnalyticsRecentActivityResponse]