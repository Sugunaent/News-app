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
        "checks": {"database": "ok", "storage": "ok"},
    }
    supabase.table.assert_called_once_with("media_assets")
    supabase.storage.from_.assert_called_once_with("article-media")


def test_health_reports_supabase_failure(monkeypatch):
    supabase = MagicMock()
    supabase.table.return_value.select.return_value.limit.return_value.execute.side_effect = RuntimeError("database unavailable")
    monkeypatch.setattr(main_module, "supabase_admin", supabase)

    response = client.get("/health")

    assert response.status_code == 503
    assert response.json() == {
        "status": "degraded",
        "checks": {"database": "error", "storage": "ok"},
    }


def test_health_reports_storage_failure(monkeypatch):
    supabase = MagicMock()
    supabase.storage.from_.return_value.list.side_effect = RuntimeError("storage unavailable")
    monkeypatch.setattr(main_module, "supabase_admin", supabase)

    response = client.get("/health")

    assert response.status_code == 503
    assert response.json() == {
        "status": "degraded",
        "checks": {"database": "ok", "storage": "error"},
    }