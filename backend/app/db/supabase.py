from supabase import Client, create_client
from app.core.config import settings

# Anonymous public client
supabase: Client = create_client(
    settings.supabase_url,
    settings.supabase_anon_key,
)

# Admin service-role client (bypasses RLS)
supabase_admin: Client = create_client(
    settings.supabase_url,
    settings.supabase_service_role_key,
)


def create_user_client(access_token: str) -> Client:
    """
    Creates a user-scoped Supabase client that forwards the user's JWT
    to PostgREST and Storage so Row Level Security (RLS) is applied correctly.
    """
    # Instantiate user client
    client = create_client(
        settings.supabase_url,
        settings.supabase_anon_key,
    )

    # Attach bearer token to PostgREST
    client.postgrest.auth(access_token)

    # Attach bearer token to Storage if initialized
    if hasattr(client, "storage") and hasattr(client.storage, "auth"):
        client.storage.auth(access_token)

    return client