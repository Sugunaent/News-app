from fastapi import FastAPI

from app.core.exceptions import AppException
from app.core.handlers import app_exception_handler
from app.routers.users import router as users_router


app = FastAPI(
    title="Cognition News API",
    version="1.0.0",
)

app.add_exception_handler(
    AppException,
    app_exception_handler,
)


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "environment": "development",
    }


app.include_router(users_router)