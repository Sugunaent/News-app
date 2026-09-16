from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import Client

from app.core.exceptions import (
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
)
from app.db.supabase import create_user_client, supabase, supabase_admin
from app.schemas.auth import CurrentUser

bearer_scheme = HTTPBearer()
optional_bearer_scheme = HTTPBearer(auto_error=False)


class AuthContext:
    def __init__(
        self,
        user: CurrentUser,
        client: Client,
    ):
        self.user = user
        self.client = client


def _display_name_from_auth_user(auth_user) -> str | None:
    metadata = getattr(auth_user, "user_metadata", None) or {}
    if not isinstance(metadata, dict):
        return None

    for key in ("full_name", "name", "display_name"):
        value = metadata.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()

    email = getattr(auth_user, "email", None)
    if email and "@" in email:
        return email.split("@", 1)[0]

    return None


def _ensure_profile(auth_user) -> dict:
    user_id = str(auth_user.id)
    email = getattr(auth_user, "email", None)
    display_name = _display_name_from_auth_user(auth_user)

    # Replaced .maybe_single().execute() with .execute()
    existing = (
        supabase_admin
        .table("profiles")
        .select("id, email, display_name, role, is_active")
        .eq("id", user_id)
        .execute()
    )

    existing_rows = existing.data if existing and existing.data else []

    if existing_rows:
        data = dict(existing_rows[0])
        data["role"] = data.get("role") or "USER"
        data["is_active"] = (
            data.get("is_active") if data.get("is_active") is not None else True
        )

        updates = {}
        if email and data.get("email") != email:
            updates["email"] = email
        if display_name and not data.get("display_name"):
            updates["display_name"] = display_name

        if updates:
            updated = (
                supabase_admin
                .table("profiles")
                .update(updates)
                .eq("id", user_id)
                .select("id, email, display_name, role, is_active")
                .execute()
            )
            if updated and updated.data:
                updated_data = dict(updated.data[0])
                updated_data["role"] = updated_data.get("role") or "USER"
                updated_data["is_active"] = (
                    updated_data.get("is_active")
                    if updated_data.get("is_active") is not None
                    else True
                )
                return updated_data

        return data

    # Create profile if not found
    created = (
        supabase_admin
        .table("profiles")
        .insert(
            {
                "id": user_id,
                "email": email,
                "display_name": display_name,
                "role": "USER",
                "is_active": True,
            }
        )
        .select("id, email, display_name, role, is_active")
        .execute()
    )

    rows = created.data or []
    if not rows:
        raise NotFoundError("User profile could not be created")

    res_data = dict(rows[0])
    res_data["role"] = res_data.get("role") or "USER"
    res_data["is_active"] = (
        res_data.get("is_active") if res_data.get("is_active") is not None else True
    )
    return res_data


def get_current_user(
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

    try:
        profile_data = _ensure_profile(auth_user)
        profile = CurrentUser(**profile_data)
    except NotFoundError:
        raise
    except Exception as exc:
        print(f"[AUTH ERROR] {exc}")
        raise HTTPException(
            status_code=500, detail=f"Profile processing error: {str(exc)}"
        ) from exc

    if not profile.is_active:
        raise AuthorizationError("User account is inactive")

    return AuthContext(
        user=profile,
        client=create_user_client(access_token),
    )


def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(optional_bearer_scheme),
) -> AuthContext | None:
    if credentials is None:
        return None
    try:
        return get_current_user(credentials)
    except Exception:
        return None