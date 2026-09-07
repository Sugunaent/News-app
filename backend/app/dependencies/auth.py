import os
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import Client, create_client  # <--- Import create_client

from app.core.config import settings
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

    # Resolve service role key from settings or environment
    service_role_key = (
        getattr(settings, "supabase_service_role_key", None)
        or getattr(settings, "SUPABASE_SERVICE_ROLE_KEY", None)
        or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        or os.getenv("supabase_service_role_key")
    )

    # 1. Allow Service Role Key for local testing / admin scripts
    if service_role_key and access_token.strip() == service_role_key.strip():
        service_user = CurrentUser(
            id="49c8cc3b-19ba-47e1-b6ac-5a479100147c",
            email="indu.28@gmail.com",
            display_name="Super Admin (Service Role)",
            role="SUPERADMIN",
            is_active=True,
        )

        # Create full admin client using Service Role Key
        admin_client = create_client(
            settings.supabase_url, 
            service_role_key.strip()
        )
        
        return AuthContext(
            user=service_user,
            client=admin_client,  # <--- Return admin_client here
        )

    # 2. Standard User JWT validation
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
            .select("id, email, display_name, role, is_active")
            .eq("id", str(auth_user.id))
            .maybe_single()
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