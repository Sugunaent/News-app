from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from app.db.supabase import supabase


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

    Audit records are written using the trusted backend Supabase
    client by default. This is intentional because the database
    does not allow ordinary authenticated clients to insert audit
    records directly.
    """
    db = client or supabase

    payload = {
        "actor_user_id": str(actor_user_id),
        "action": action,
        "entity_type": entity_type,
        "entity_id": str(entity_id) if entity_id else None,
        "metadata": metadata or {},
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    response = (
        db
        .table("audit_logs")
        .insert(payload)
        .select("*")
        .single()
        .execute()
    )

    return response.data


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

    The authenticated user's client is used here so the existing
    audit_logs RLS policy remains part of the security boundary.
    """
    db = client or supabase

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