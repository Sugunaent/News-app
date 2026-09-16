from uuid import UUID

from pydantic import BaseModel, Field


class HeroConfig(BaseModel):
    imageUrl: str
    title: str
    subtitle: str
    badgeText: str
    linkText: str
    linkUrl: str


class HeroConfigUpdate(BaseModel):
    imageUrl: str | None = None
    title: str | None = None
    subtitle: str | None = None
    badgeText: str | None = None
    linkText: str | None = None
    linkUrl: str | None = None


class TeamSocialLink(BaseModel):
    label: str
    url: str


class TeamMemberResponse(BaseModel):
    id: UUID
    name: str
    role: str
    bio: str
    image_url: str
    social_links: list[TeamSocialLink] = Field(default_factory=list)
    display_order: int = 0
