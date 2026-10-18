from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from app.main import app
from app import main as main_module


client = TestClient(app)


def test_health_reports_database_and_storage(monkeypatch):
    supabase = MagicMock()
    monkeypatch.setattr(main_module, "supabase_admin", supabase)
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "checks": {
            "database": "ok",
            "promotion_images": "ok",
            "storage": "ok",
        },
    }
    supabase.table.assert_any_call("media_assets")
    supabase.table.assert_any_call("promotional_items")
    assert supabase.table.call_count == 2
    supabase.storage.from_.assert_called_once_with("article-media")


def test_health_reports_missing_promotion_image_schema(monkeypatch):
    supabase = MagicMock()
    supabase.table.side_effect = lambda table: (
        MagicMock()
        if table == "media_assets"
        else _promotion_schema_query(error=RuntimeError("image_url does not exist"))
    )
    monkeypatch.setattr(main_module, "supabase_admin", supabase)

    response = client.get("/health")

    assert response.status_code == 503
    assert response.json() == {
        "status": "degraded",
        "checks": {
            "database": "ok",
            "promotion_images": "error",
            "storage": "ok",
        },
    }


def test_health_reports_supabase_failure(monkeypatch):
    supabase = MagicMock()
    supabase.table.return_value.select.return_value.limit.return_value.execute.side_effect = RuntimeError("database unavailable")
    monkeypatch.setattr(main_module, "supabase_admin", supabase)

    response = client.get("/health")

    assert response.status_code == 503
    assert response.json() == {
        "status": "degraded",
        "checks": {
            "database": "error",
            "promotion_images": "unavailable",
            "storage": "ok",
        },
    }


def test_health_reports_storage_failure(monkeypatch):
    supabase = MagicMock()
    supabase.storage.from_.return_value.list.side_effect = RuntimeError("storage unavailable")
    monkeypatch.setattr(main_module, "supabase_admin", supabase)

    response = client.get("/health")

    assert response.status_code == 503
    assert response.json() == {
        "status": "degraded",
        "checks": {
            "database": "ok",
            "promotion_images": "ok",
            "storage": "error",
        },
    }


def _promotion_schema_query(error: Exception) -> MagicMock:
    query = MagicMock()
    query.select.return_value.limit.return_value.execute.side_effect = error
    return query
