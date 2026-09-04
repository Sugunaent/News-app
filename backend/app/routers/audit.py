from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.core.exceptions import AuthorizationError
from app.dependencies.auth import AuthContext, get_current_user
from app.schemas.audit import AuditLogListResponse
from app.services.audit import list_audit_logs


router = APIRouter(
    prefix="/api/v1/superadmin/audit-logs",
    tags=["Superadmin Audit"],
)


def _require_superadmin(context: AuthContext) -> None:
    if context.user.role != "SUPERADMIN":
        raise AuthorizationError(
            "Superadmin access required"
        )


@router.get(
    "",
    response_model=AuditLogListResponse,
)
def get_audit_logs(
    actor_user_id: UUID | None = Query(default=None),
    action: str | None = Query(default=None),
    entity_type: str | None = Query(default=None),
    entity_id: UUID | None = Query(default=None),
    limit: int = Query(
        default=100,
        ge=1,
        le=500,
    ),
    offset: int = Query(
        default=0,
        ge=0,
    ),
    current_user: AuthContext = Depends(
        get_current_user
    ),
):
    """
    Return administrative audit history.

    Only the Superadmin can inspect audit logs.
    """
    _require_superadmin(current_user)

    items = list_audit_logs(
        actor_user_id=actor_user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        limit=limit,
        offset=offset,
        client=current_user.client,
    )

    return AuditLogListResponse(items=items)