from supabase import Client, create_client
from supabase.lib.client_options import ClientOptions
from app.core.config import settings

# Anonymous public client
supabase: Client = create_client(
    settings.supabase_url,
    settings.supabase_anon_key,
)

# Admin service-role client (bypasses RLS)
supabase_admin: Client = create_client(
    settings.supabase_url,
    settings.supabase_service_role_key,  # Ensure this is defined in app.core.config
)

def create_user_client(access_token: str) -> Client:
    options = ClientOptions(
        headers={"Authorization": f"Bearer {access_token}"}
    )
    
    client = create_client(
        settings.supabase_url,
        settings.supabase_anon_key,
        options=options,
    )

    # Attach token to sub-clients to ensure Storage and PostgREST receive it
    client.postgrest.auth(access_token)
    if hasattr(client.storage, "auth"):
        client.storage.auth(access_token)

    return client