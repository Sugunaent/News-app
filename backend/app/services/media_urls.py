from app.db.supabase import supabase_admin

BUCKET_NAME = "article-media"
SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7


def create_signed_url(storage_path: str | None) -> str | None:
    if not storage_path:
        return None

    try:
        result = (
            supabase_admin
            .storage
            .from_(BUCKET_NAME)
            .create_signed_url(
                storage_path,
                SIGNED_URL_TTL_SECONDS,
            )
        )
    except Exception:
        return None

    if isinstance(result, dict):
        return (
            result.get("signedURL")
            or result.get("signedUrl")
            or result.get("signed_url")
        )

    return None


def attach_signed_url(media: dict | None) -> dict | None:
    if not media:
        return media

    if isinstance(media, list):
        media = media[0] if media else None

    if not isinstance(media, dict):
        return media

    media = dict(media)
    media["signed_url"] = create_signed_url(media.get("storage_path"))
    return media
