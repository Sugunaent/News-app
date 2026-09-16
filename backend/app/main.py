from contextlib import asynccontextmanager
import logging
from time import perf_counter

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from postgrest.exceptions import APIError
from supabase import create_client

from app.core.config import settings
from app.core.exceptions import AppException
from app.core.handlers import api_error_handler, app_exception_handler
from app.routers.advertisements import router as advertisements_router
from app.routers.analytics import router as analytics_router
from app.routers.articles import router as articles_router
from app.routers.audit import router as audit_router
from app.routers.bookmarks import router as bookmarks_router
from app.routers.categories import router as categories_router
from app.routers.contact import router as contact_router
from app.routers.comments import router as comments_router
from app.routers.completions import router as completions_router
from app.routers.gamification import router as gamification_router
from app.routers.home import router as home_router
from app.routers.media import router as media_router
from app.routers.opinions import router as opinions_router
from app.routers.progress import router as progress_router
from app.routers.promotions import router as promotions_router
from app.routers.quizzes import router as quizzes_router
from app.routers.sharing import router as sharing_router
from app.routers.site import router as site_router
from app.routers.superadmin_content import router as superadmin_content_router
from app.routers.superadmin_interactive import router as superadmin_interactive_router
from app.routers.superadmin_management import router as superadmin_management_router
from app.routers.users import router as users_router
from app.services.scheduler import (
    shutdown_article_scheduler,
    start_article_scheduler,
)


logger = logging.getLogger("app.http")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize administrative Supabase client using Service Role Key
    admin_client = create_client(
        settings.supabase_url,
        settings.supabase_service_role_key,
    )

    # Start the cron job to run every 1 minute
    start_article_scheduler(admin_client=admin_client, interval_minutes=1)

    yield

    # Shutdown scheduler when application stops
    shutdown_article_scheduler()


# Registered lifespan here so FastAPI triggers startup and shutdown tasks
app = FastAPI(
    title="Cognition News API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_http_requests(request, call_next):
    if not settings.log_http_requests:
        return await call_next(request)

    started = perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        logger.exception("HTTP %s %s failed", request.method, request.url.path)
        raise

    elapsed_ms = (perf_counter() - started) * 1000
    logger.info(
        "HTTP %s %s -> %s (%.1f ms)",
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
    )
    return response

app.add_exception_handler(
    AppException,
    app_exception_handler,
)
app.add_exception_handler(
    APIError,
    api_error_handler,
)


@app.exception_handler(RequestValidationError)
async def request_validation_handler(request: Request, exc: RequestValidationError):
    def _json_safe(value):
        if isinstance(value, dict):
            return {str(k): _json_safe(v) for k, v in value.items()}
        if isinstance(value, list):
            return [_json_safe(item) for item in value]
        if isinstance(value, (str, int, float, bool)) or value is None:
            return value
        if isinstance(value, Exception):
            return str(value)
        return str(value)

    safe_errors = [_json_safe(item) for item in exc.errors()]
    logger.error(
        "VALIDATION 422 %s %s errors=%s",
        request.method,
        request.url.path,
        safe_errors,
    )
    return JSONResponse(status_code=422, content={"detail": safe_errors})


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    if exc.status_code >= 400:
        logger.warning(
            "HTTP ERROR %s %s status=%s detail=%s",
            request.method,
            request.url.path,
            exc.status_code,
            exc.detail,
        )
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail}, headers=exc.headers)


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
    }


app.include_router(users_router)
app.include_router(articles_router)
app.include_router(categories_router)
app.include_router(progress_router)
app.include_router(quizzes_router)
app.include_router(opinions_router)
app.include_router(completions_router)
app.include_router(gamification_router)
app.include_router(home_router)
app.include_router(promotions_router)
app.include_router(sharing_router)
app.include_router(comments_router)
app.include_router(advertisements_router)
app.include_router(analytics_router)
app.include_router(bookmarks_router)
app.include_router(site_router)
app.include_router(contact_router)
app.include_router(superadmin_content_router)
app.include_router(superadmin_interactive_router)
app.include_router(superadmin_management_router)
app.include_router(media_router)
app.include_router(audit_router)