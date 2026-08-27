from pydantic import BaseModel

from app.schemas.articles import ArticleListItem


class HomeDiscoveryResponse(BaseModel):
    trending: list[ArticleListItem]
    authors_picks: list[ArticleListItem]