from pydantic import BaseModel

from app.schemas.articles import ArticleCategory, ArticleListItem


class HomeCategorySection(BaseModel):
    category: ArticleCategory
    articles: list[ArticleListItem]


class HomeDiscoveryResponse(BaseModel):
    trending: list[ArticleListItem]
    category_sections: list[HomeCategorySection]
    authors_picks: list[ArticleListItem]