from contextlib import asynccontextmanager
import logging
from time import perf_counter

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
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
from app.routers.comments import router as comments_router
from app.routers.completions import router as completions_router
from app.routers.contact import router as contact_router
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
    try:
        if settings.supabase_url and settings.supabase_service_role_key:
            admin_client = create_client(
                settings.supabase_url,
                settings.supabase_service_role_key,
            )
            start_article_scheduler(admin_client=admin_client, interval_minutes=1)
            logger.info("Supabase client and article scheduler initialized successfully.")
        else:
            logger.warning("Supabase credentials missing during startup.")
    except Exception as e:
        logger.error(f"Failed to start article scheduler on startup: {e}")

    yield

    try:
        shutdown_article_scheduler()
    except Exception as e:
        logger.error(f"Error during article scheduler shutdown: {e}")


app = FastAPI(
    title="Cognition News API",
    version="1.0.0",
    lifespan=lifespan,
)

# 1. Broad Cors Middleware for standard routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # Set to False when using wildcard allow_origins for proxy compatibility
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=86400,
)


# 2. Universal Options Interceptor Middleware (Fixes Zoho Gateway Preflight dropping)
@app.middleware("http")
async def cors_options_interceptor(request: Request, call_next):
    origin = request.headers.get("origin", "*")
    
    if request.method == "OPTIONS":
        response = Response(status_code=200)
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
        response.headers["Access-Control-Allow-Headers"] = request.headers.get(
            "access-control-request-headers", "*"
        )
        response.headers["Access-Control-Max-Age"] = "86400"
        return response

    started = perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        logger.exception("HTTP %s %s failed", request.method, request.url.path)
        raise

    # Guarantee CORS headers on every response passing through
    response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Credentials"] = "true"
    
    if getattr(settings, "log_http_requests", True):
        elapsed_ms = (perf_counter() - started) * 1000
        logger.info(
            "HTTP %s %s -> %s (%.1f ms)",
            request.method,
            request.url.path,
            response.status_code,
            elapsed_ms,
        )

    return response


# Exception Handlers
def _add_cors_headers(request: Request, response: JSONResponse) -> JSONResponse:
    origin = request.headers.get("origin", "*")
    response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response


app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(APIError, api_error_handler)


@app.exception_handler(RequestValidationError)
async def request_validation_handler(request: Request, exc: RequestValidationError):
    def _json_safe(value):
        if isinstance(value, dict):
            return {str(k): _json_safe(v) for k, v in value.items()}
        if isinstance(value, list):
            return [_json_safe(item) for item in value]
        if isinstance(value, (str, int, float, bool)) or value is None:
            return value
        return str(value)

    safe_errors = [_json_safe(item) for item in exc.errors()]
    logger.error("VALIDATION 422 %s %s errors=%s", request.method, request.url.path, safe_errors)
    res = JSONResponse(status_code=422, content={"detail": safe_errors})
    return _add_cors_headers(request, res)


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
    headers = dict(exc.headers) if exc.headers else {}
    res = JSONResponse(status_code=exc.status_code, content={"detail": exc.detail}, headers=headers)
    return _add_cors_headers(request, res)


@app.get("/health")
async def health_check():
    return {"status": "ok"}

# Direct fallback route for preflight requests across all paths
@app.options("/{full_path:path}")
async def options_handler(request: Request, full_path: str):
    origin = request.headers.get("origin", "*")
    headers = {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
        "Access-Control-Allow-Headers": request.headers.get("access-control-request-headers", "*"),
        "Access-Control-Max-Age": "86400",
    }
    return Response(status_code=200, headers=headers)

app.include_router(users_router, prefix="/api/v1")
app.include_router(articles_router, prefix="/api/v1")
app.include_router(categories_router, prefix="/api/v1")
app.include_router(progress_router, prefix="/api/v1")
app.include_router(quizzes_router, prefix="/api/v1")
app.include_router(opinions_router, prefix="/api/v1")
app.include_router(completions_router, prefix="/api/v1")
app.include_router(gamification_router, prefix="/api/v1")
app.include_router(home_router, prefix="/api/v1")
app.include_router(promotions_router, prefix="/api/v1")
app.include_router(sharing_router, prefix="/api/v1")
app.include_router(comments_router, prefix="/api/v1")
app.include_router(advertisements_router, prefix="/api/v1")
app.include_router(analytics_router, prefix="/api/v1")
app.include_router(bookmarks_router, prefix="/api/v1")
app.include_router(site_router, prefix="/api/v1")
app.include_router(contact_router, prefix="/api/v1")
app.include_router(superadmin_content_router, prefix="/api/v1")
app.include_router(superadmin_interactive_router, prefix="/api/v1")
app.include_router(superadmin_management_router, prefix="/api/v1")
app.include_router(media_router, prefix="/api/v1")
app.include_router(audit_router, prefix="/api/v1")