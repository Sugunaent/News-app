from fastapi import FastAPI

from app.core.exceptions import AppException
from app.core.handlers import app_exception_handler
from app.routers.articles import router as articles_router
from app.routers.categories import router as categories_router
from app.routers.users import router as users_router
from app.routers.progress import router as progress_router


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
app.include_router(articles_router)
app.include_router(categories_router)
app.include_router(progress_router)