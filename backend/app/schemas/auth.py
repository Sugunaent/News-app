from uuid import UUID

from pydantic import BaseModel


class CurrentUser(BaseModel):
    id: UUID
    email: str | None
    display_name: str | None
    role: str
    is_active: bool