from fastapi import APIRouter, Depends

from app.dependencies.auth import AuthContext, get_current_user
from app.schemas.auth import CurrentUser


router = APIRouter(
    prefix="/api/v1/users",
    tags=["Users"],
)


@router.get(
    "/me",
    response_model=CurrentUser,
)
async def get_me(
    auth: AuthContext = Depends(get_current_user),
):
    return auth.user