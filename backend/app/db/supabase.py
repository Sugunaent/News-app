from supabase import Client, create_client
from app.core.config import settings

# Local/dev/test environments may not have real Supabase credentials configured.
# Use safe placeholders so the app can start and tests can import without failing.
_anon_url = settings.supabase_url or "http://localhost:54321"
_anon_key = settings.supabase_anon_key or "local-anon-key"

# Anonymous public client
supabase: Client = create_client(
    _anon_url,
    _anon_key,
)

# Admin service-role client (bypasses RLS). Falls back to anon key if service role key is not configured.
admin_key = settings.supabase_service_role_key or _anon_key
supabase_admin: Client = create_client(
    _anon_url,
    admin_key,
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