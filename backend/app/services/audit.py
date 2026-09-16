import logging
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from app.core.db_utils import extract_single_record
from app.db.supabase import supabase_admin

logger = logging.getLogger(__name__)


def record_audit(
    *,
    actor_user_id: UUID,
    action: str,
    entity_type: str,
    entity_id: UUID | None = None,
    metadata: dict[str, Any] | None = None,
    client=None,
) -> dict | None:
    """
    Record a trusted administrative audit event.

    Audit records are written with the service-role client unless a
    specific client is provided by the caller.
    """
    # Audit writes are trusted backend operations. A user-scoped client is
    # subject to the caller's INSERT RLS policy and can silently lose audit
    # events during otherwise successful CMS mutations.
    db = supabase_admin

    payload = {
        "actor_user_id": str(actor_user_id),
        "action": action,
        "entity_type": entity_type,
        "entity_id": str(entity_id) if entity_id else None,
        "metadata": metadata or {},
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    try:
        response = (
            db
            .table("audit_logs")
            .insert(payload)
            .select("*")
            .execute()
        )
        return extract_single_record(response.data)
    except Exception as exc:
        logger.warning(
            "Failed to record audit log for action %s: %s",
            action,
            exc,
        )
        return None


def list_audit_logs(
    *,
    limit: int = 100,
    offset: int = 0,
    actor_user_id: UUID | None = None,
    action: str | None = None,
    entity_type: str | None = None,
    entity_id: UUID | None = None,
    client=None,
) -> list[dict]:
    """
    Retrieve audit records for Superadmin inspection.

    Superadmin listing uses the service-role client after FastAPI
    has already authorized the caller.
    """
    db = client or supabase_admin

    query = (
        db
        .table("audit_logs")
        .select("*")
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
    )

    if actor_user_id is not None:
        query = query.eq("actor_user_id", str(actor_user_id))

    if action is not None:
        query = query.eq("action", action)

    if entity_type is not None:
        query = query.eq("entity_type", entity_type)

    if entity_id is not None:
        query = query.eq("entity_id", str(entity_id))

    response = query.execute()

    return response.data or []