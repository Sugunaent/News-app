from supabase import Client, create_client

from app.core.config import settings


supabase: Client = create_client(
    settings.supabase_url,
    settings.supabase_anon_key,
)


def create_user_client(access_token: str) -> Client:
    client = create_client(
        settings.supabase_url,
        settings.supabase_anon_key,
    )

    client.postgrest.auth(access_token)

    return client