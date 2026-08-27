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
    return get_gamification_status(auth.user.id)