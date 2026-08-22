from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import Client

from app.core.exceptions import (
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
)
from app.db.supabase import create_user_client, supabase
from app.schemas.auth import CurrentUser


bearer_scheme = HTTPBearer()


class AuthContext:
    def __init__(
        self,
        user: CurrentUser,
        client: Client,
    ):
        self.user = user
        self.client = client


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> AuthContext:
    access_token = credentials.credentials

    try:
        response = supabase.auth.get_user(access_token)
    except Exception as exc:
        raise AuthenticationError() from exc

    auth_user = response.user

    if auth_user is None:
        raise AuthenticationError()

    user_client = create_user_client(access_token)

    try:
        response = (
            user_client
            .table("profiles")
            .select(
                "id, email, display_name, role, is_active"
            )
            .eq("id", str(auth_user.id))
            .single()
            .execute()
        )
    except Exception as exc:
        raise NotFoundError("User profile not found") from exc

    if not response.data:
        raise NotFoundError("User profile not found")

    profile = CurrentUser(**response.data)

    if not profile.is_active:
        raise AuthorizationError("User account is inactive")

    return AuthContext(
        user=profile,
        client=user_client,
    )