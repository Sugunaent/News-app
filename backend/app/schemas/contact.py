from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class BusinessEnquiryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    company: str = Field(min_length=1, max_length=200)
    purpose: str = Field(min_length=1, max_length=500)
    phone: str = Field(min_length=7, max_length=20)
    email: str = Field(min_length=3, max_length=320)


class FeedbackCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)


class FeedbackItem(BaseModel):
    id: UUID
    content: str
    user_email: str | None = None
    status: str
    created_at: datetime


class FeedbackListResponse(BaseModel):
    items: list[FeedbackItem]
    total: int


class BusinessEnquiryItem(BaseModel):
    id: UUID
    name: str
    company: str
    purpose: str
    phone: str
    email: str
    status: str
    created_at: datetime


class BusinessEnquiryListResponse(BaseModel):
    items: list[BusinessEnquiryItem]
    total: int


class StatusUpdate(BaseModel):
    status: str = Field(min_length=1, max_length=50)
