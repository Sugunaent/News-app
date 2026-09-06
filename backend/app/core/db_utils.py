from typing import Any
from app.core.exceptions import NotFoundError


def extract_single_record(
    data: Any,
    error_detail: str = "Record not found",
) -> dict:
    """
    Safely unpacks single record data returned from PostgREST execute().
    Handles both list responses (e.g. from insert/update) and dict responses,
    preventing AttributeError (.single on SyncQueryRequestBuilder) and
    TypeError (accessing list with string keys).
    """
    if data is None:
        raise NotFoundError(error_detail)

    if isinstance(data, list):
        if not data:
            raise NotFoundError(error_detail)
        return data[0]

    if isinstance(data, dict):
        return data

    raise NotFoundError(error_detail)
