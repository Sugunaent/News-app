from fastapi import Request, status
from fastapi.responses import JSONResponse
from postgrest.exceptions import APIError

from app.core.exceptions import AppException


async def app_exception_handler(
    request: Request,
    exc: AppException,
):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


async def api_error_handler(
    request: Request,
    exc: APIError,
):
    code = getattr(exc, "code", None)
    message = getattr(exc, "message", None) or str(exc)
    details = getattr(exc, "details", None)

    if code == "23505":
        status_code = status.HTTP_409_CONFLICT
        detail = details or message or "A resource with this unique value already exists."
    elif code == "23503":
        status_code = status.HTTP_400_BAD_REQUEST
        detail = details or message or "Referenced resource does not exist."
    elif code == "23502":
        status_code = status.HTTP_400_BAD_REQUEST
        detail = details or message or "Required field is missing."
    elif code == "22P02":
        status_code = status.HTTP_400_BAD_REQUEST
        detail = "Invalid identifier or data format."
    else:
        status_code = status.HTTP_400_BAD_REQUEST
        detail = message

    return JSONResponse(
        status_code=status_code,
        content={"detail": detail},
    )