from fastapi import APIRouter, Depends, Query

from app.core.exceptions import AuthorizationError
from app.dependencies.auth import AuthContext, get_current_user
from app.schemas.analytics import AnalyticsDashboardResponse
from app.services.analytics_reporting import build_dashboard


router = APIRouter(
    prefix="/api/v1/analytics",
    tags=["Analytics"],
)


def _require_superadmin(
    context: AuthContext,
) -> None:
    role = getattr(
        context.user,
        "role",
        None,
    )

    if role != "SUPERADMIN":
        raise AuthorizationError(
            "Superadmin access required"
        )


@router.get(
    "/dashboard",
    response_model=AnalyticsDashboardResponse,
)
def get_analytics_dashboard(
    top_articles_limit: int = Query(
        default=10,
        ge=1,
        le=50,
    ),
    top_categories_limit: int = Query(
        default=10,
        ge=1,
        le=50,
    ),
    top_users_limit: int = Query(
        default=10,
        ge=1,
        le=50,
    ),
    current_user: AuthContext = Depends(
        get_current_user
    ),
):
    """
    Return the V1 Superadmin analytics dashboard.

    This endpoint exposes aggregated analytics only.
    Raw analytics events are never returned to normal users.
    """

    _require_superadmin(current_user)

    return build_dashboard(
        client=current_user.client,
        top_articles_limit=top_articles_limit,
        top_categories_limit=top_categories_limit,
        top_users_limit=top_users_limit,
    )