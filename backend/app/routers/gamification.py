from uuid import UUID
from fastapi import APIRouter, Depends

from app.dependencies.auth import AuthContext, get_current_user
from app.schemas.gamification import GamificationResponse
from app.services.gamification import get_gamification_status


router = APIRouter(
    prefix="/api/v1/gamification",
    tags=["Gamification"],
)


@router.get(
    "/me",
    response_model=GamificationResponse,
)
async def get_my_gamification(
    auth: AuthContext = Depends(get_current_user),
):
    # Standardize user_id conversion whether auth.user.id is string or UUID
    user_id = auth.user.id
    if isinstance(user_id, str):
        user_id = UUID(user_id)

    # Pass the user_id to service layer
    return get_gamification_status(user_id)