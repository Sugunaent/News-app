from __future__ import annotations

from pathlib import Path
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.core.exceptions import AuthorizationError, NotFoundError
from app.dependencies.auth import AuthContext, get_current_user
from app.schemas.media import (
    MediaAssetDetailResponse,
    MediaAssetResponse,
    MediaReferenceResponse,
    MediaUploadResponse,
)


router = APIRouter(
    prefix="/api/v1/media",
    tags=["Media"],
)


BUCKET_NAME = "article-media"

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

ALLOWED_MIME_PREFIXES = (
    "image/",
    "video/",
    "audio/",
)

ALLOWED_MEDIA_TYPES = {
    "image": "IMAGE",
    "video": "VIDEO",
    "audio": "AUDIO",
}


def _require_superadmin(context: AuthContext) -> None:
    user_role = getattr(context.user, "role", None)

    if user_role != "SUPERADMIN":
        raise AuthorizationError(
            "Superadmin access required"
        )


def _get_user_id(context: AuthContext) -> UUID:
    user_id = getattr(context.user, "id", None)

    if not user_id:
        raise AuthorizationError(
            "Authenticated user identity is required"
        )

    return UUID(str(user_id))


def _validate_mime_type(mime_type: str | None) -> str:
    if not mime_type:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="File MIME type is required",
        )

    normalized = mime_type.strip().lower()

    if not normalized.startswith(ALLOWED_MIME_PREFIXES):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Unsupported media type. "
                "Only image, video, and audio files are allowed."
            ),
        )

    return normalized


def _derive_media_type(mime_type: str) -> str:
    prefix = mime_type.split("/", 1)[0]

    try:
        return ALLOWED_MEDIA_TYPES[prefix]
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Unsupported media type",
        )


def _sanitize_filename(filename: str | None) -> str:
    if not filename:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Filename is required",
        )

    original_name = Path(filename).name
    suffix = Path(original_name).suffix.lower()

    if not suffix:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded file must have an extension",
        )

    # The original filename is not used as the storage identity.
    # A UUID-based filename prevents path traversal, collisions,
    # and unsafe user-controlled storage paths.
    return f"{uuid4()}{suffix}"


def _build_storage_path(
    media_type: str,
    filename: str,
) -> str:
    folder = media_type.lower()

    return f"media/{folder}/{filename}"


def _build_media_response(
    data: dict,
    signed_url: str | None = None,
) -> MediaAssetResponse:
    return MediaAssetResponse(
        id=UUID(str(data["id"])),
        storage_path=data["storage_path"],
        media_type=data["media_type"],
        mime_type=data["mime_type"],
        file_size=data.get("file_size"),
        uploaded_by=(
            UUID(str(data["uploaded_by"]))
            if data.get("uploaded_by")
            else None
        ),
        created_at=data["created_at"],
        signed_url=signed_url,
    )


def _create_signed_url(
    client,
    storage_path: str,
) -> str | None:
    try:
        result = (
            client
            .storage
            .from_(BUCKET_NAME)
            .create_signed_url(
                storage_path,
                3600,
            )
        )

        if isinstance(result, dict):
            return (
                result.get("signedURL")
                or result.get("signedUrl")
                or result.get("signed_url")
            )

        return None

    except Exception:
        # A signed URL is a convenience for the dashboard.
        # Failure to generate one should not make the metadata
        # operation itself fail.
        return None


def _find_media_references(
    client,
    media_id: UUID,
) -> list[MediaReferenceResponse]:
    references: list[MediaReferenceResponse] = []

    media_id_string = str(media_id)

    # ---------------------------------------------------------
    # Article cover
    # ---------------------------------------------------------

    result = (
        client
        .table("articles")
        .select("id")
        .eq("cover_media_id", media_id_string)
        .execute()
    )

    for row in result.data or []:
        references.append(
            MediaReferenceResponse(
                resource_type="article_cover",
                resource_id=UUID(str(row["id"])),
            )
        )

    # ---------------------------------------------------------
    # Article image blocks
    # ---------------------------------------------------------

    result = (
        client
        .table("article_blocks")
        .select("id")
        .eq("media_id", media_id_string)
        .execute()
    )

    for row in result.data or []:
        references.append(
            MediaReferenceResponse(
                resource_type="article_block",
                resource_id=UUID(str(row["id"])),
            )
        )

    # ---------------------------------------------------------
    # Promotional carousel
    # ---------------------------------------------------------

    result = (
        client
        .table("promotional_items")
        .select("id")
        .eq("image_media_id", media_id_string)
        .execute()
    )

    for row in result.data or []:
        references.append(
            MediaReferenceResponse(
                resource_type="promotional_item",
                resource_id=UUID(str(row["id"])),
            )
        )

    # ---------------------------------------------------------
    # Advertisements
    # ---------------------------------------------------------

    result = (
        client
        .table("advertisements")
        .select("id")
        .eq("image_media_id", media_id_string)
        .execute()
    )

    for row in result.data or []:
        references.append(
            MediaReferenceResponse(
                resource_type="advertisement",
                resource_id=UUID(str(row["id"])),
            )
        )

    # ---------------------------------------------------------
    # Profile avatars
    # ---------------------------------------------------------

    result = (
        client
        .table("profiles")
        .select("id")
        .eq("avatar_media_id", media_id_string)
        .execute()
    )

    for row in result.data or []:
        references.append(
            MediaReferenceResponse(
                resource_type="profile_avatar",
                resource_id=UUID(str(row["id"])),
            )
        )

    # ---------------------------------------------------------
    # Badge images
    # ---------------------------------------------------------

    result = (
        client
        .table("badges")
        .select("id")
        .eq("image_asset_id", media_id_string)
        .execute()
    )

    for row in result.data or []:
        references.append(
            MediaReferenceResponse(
                resource_type="badge",
                resource_id=UUID(str(row["id"])),
            )
        )

    return references


# ============================================================
# SUPERADMIN MEDIA LIBRARY
# ============================================================


@router.get(
    "/admin",
    response_model=list[MediaAssetResponse],
)
def list_media_assets(
    current_user: AuthContext = Depends(get_current_user),
):
    """
    Return the complete media library for the Superadmin.
    """

    _require_superadmin(current_user)

    result = (
        current_user.client
        .table("media_assets")
        .select(
            """
            id,
            storage_path,
            media_type,
            mime_type,
            file_size,
            uploaded_by,
            created_at
            """
        )
        .order("created_at", desc=True)
        .execute()
    )

    media_assets = result.data or []

    response: list[MediaAssetResponse] = []

    for media in media_assets:
        signed_url = _create_signed_url(
            current_user.client,
            media["storage_path"],
        )

        response.append(
            _build_media_response(
                media,
                signed_url,
            )
        )

    return response


# ============================================================
# SUPERADMIN MEDIA DETAIL
# ============================================================


@router.get(
    "/admin/{media_id}",
    response_model=MediaAssetDetailResponse,
)
def get_media_asset(
    media_id: UUID,
    current_user: AuthContext = Depends(get_current_user),
):
    """
    Return one media asset and all known database references.
    """

    _require_superadmin(current_user)

    result = (
        current_user.client
        .table("media_assets")
        .select(
            """
            id,
            storage_path,
            media_type,
            mime_type,
            file_size,
            uploaded_by,
            created_at
            """
        )
        .eq("id", str(media_id))
        .maybe_single()
        .execute()
    )

    if not result.data:
        raise NotFoundError(
            "Media asset not found"
        )

    references = _find_media_references(
        current_user.client,
        media_id,
    )

    signed_url = _create_signed_url(
        current_user.client,
        result.data["storage_path"],
    )

    media = _build_media_response(
        result.data,
        signed_url,
    )

    return MediaAssetDetailResponse(
        **media.model_dump(),
        references=references,
    )


# ============================================================
# SUPERADMIN MEDIA UPLOAD
# ============================================================


@router.post(
    "/admin/upload",
    response_model=MediaUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
def upload_media_asset(
    file: UploadFile = File(...),
    current_user: AuthContext = Depends(get_current_user),
):
    """
    Upload a media file and create its media_assets metadata.

    The metadata row is created before the Storage object because
    the existing Storage INSERT policy requires the matching
    media_assets row to already exist and belong to the uploader.
    """

    _require_superadmin(current_user)

    user_id = _get_user_id(current_user)

    mime_type = _validate_mime_type(
        file.content_type
    )

    media_type = _derive_media_type(
        mime_type
    )

    filename = _sanitize_filename(
        file.filename
    )

    storage_path = _build_storage_path(
        media_type,
        filename,
    )

    file_bytes = file.file.read()

    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded file is empty",
        )

    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds the 10 MB upload limit",
        )

    # ---------------------------------------------------------
    # 1. Create metadata first.
    # ---------------------------------------------------------

    metadata_result = (
        current_user.client
        .table("media_assets")
        .insert(
            {
                "storage_path": storage_path,
                "media_type": media_type,
                "mime_type": mime_type,
                "file_size": len(file_bytes),
                "uploaded_by": str(user_id),
            }
        )
        .select(
            """
            id,
            storage_path,
            media_type,
            mime_type,
            file_size,
            uploaded_by,
            created_at
            """
        )
        .single()
        .execute()
    )

    media_data = metadata_result.data

    if not media_data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create media metadata",
        )

    media_id = UUID(str(media_data["id"]))

    # ---------------------------------------------------------
    # 2. Upload the actual object.
    # ---------------------------------------------------------

    try:
        (
            current_user.client
            .storage
            .from_(BUCKET_NAME)
            .upload(
                storage_path,
                file_bytes,
                {
                    "content-type": mime_type,
                    "upsert": False,
                },
            )
        )

    except Exception as exc:
        # The metadata row must not remain without its object.
        try:
            (
                current_user.client
                .table("media_assets")
                .delete()
                .eq("id", str(media_id))
                .execute()
            )
        except Exception:
            pass

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Media upload failed",
        ) from exc

    signed_url = _create_signed_url(
        current_user.client,
        storage_path,
    )

    return _build_media_response(
        media_data,
        signed_url,
    )


# ============================================================
# SUPERADMIN MEDIA DELETE
# ============================================================


@router.delete(
    "/admin/{media_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_media_asset(
    media_id: UUID,
    current_user: AuthContext = Depends(get_current_user),
):
    """
    Delete a media asset only when no application record
    references it.
    """

    _require_superadmin(current_user)

    result = (
        current_user.client
        .table("media_assets")
        .select(
            """
            id,
            storage_path
            """
        )
        .eq("id", str(media_id))
        .maybe_single()
        .execute()
    )

    if not result.data:
        raise NotFoundError(
            "Media asset not found"
        )

    storage_path = result.data["storage_path"]

    references = _find_media_references(
        current_user.client,
        media_id,
    )

    if references:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Media asset is still referenced by "
                f"{len(references)} resource(s) and cannot be deleted"
            ),
        )

    # ---------------------------------------------------------
    # 1. Delete Storage object.
    # ---------------------------------------------------------

    try:
        (
            current_user.client
            .storage
            .from_(BUCKET_NAME)
            .remove([storage_path])
        )

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete media object from storage",
        ) from exc

    # ---------------------------------------------------------
    # 2. Delete metadata row.
    # ---------------------------------------------------------

    try:
        (
            current_user.client
            .table("media_assets")
            .delete()
            .eq("id", str(media_id))
            .execute()
        )

    except Exception as exc:
        # Do not silently pretend the operation succeeded.
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete media metadata",
        ) from exc

    return None