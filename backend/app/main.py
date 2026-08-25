from fastapi import FastAPI

from app.core.exceptions import AppException
from app.core.handlers import app_exception_handler
from app.routers.articles import router as articles_router
from app.routers.categories import router as categories_router
from app.routers.users import router as users_router
from app.routers.progress import router as progress_router
from app.routers.quizzes import router as quizzes_router
from app.routers.opinions import router as opinions_router
from app.routers.completions import router as completions_router

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
app.include_router(quizzes_router)
app.include_router(opinions_router)
app.include_router(completions_router)