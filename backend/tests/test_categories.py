from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


@patch("app.routers.categories.supabase")
def test_list_categories_returns_active_categories(
    mock_supabase,
):
    mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value.data = [
        {
            "id": "11111111-1111-1111-1111-111111111111",
            "name": "AI",
            "slug": "ai",
            "description": "Artificial intelligence news.",
            "display_order": 0,
        },
        {
            "id": "22222222-2222-2222-2222-222222222222",
            "name": "Technology",
            "slug": "technology",
            "description": "Technology news.",
            "display_order": 1,
        },
    ]

    response = client.get("/api/v1/categories")

    assert response.status_code == 200

    data = response.json()

    assert len(data["items"]) == 2

    assert data["items"][0]["id"] == (
        "11111111-1111-1111-1111-111111111111"
    )
    assert data["items"][0]["name"] == "AI"
    assert data["items"][0]["slug"] == "ai"
    assert data["items"][0]["description"] == (
        "Artificial intelligence news."
    )
    assert data["items"][0]["display_order"] == 0


@patch("app.routers.categories.supabase")
def test_list_categories_returns_empty_list_when_no_categories(
    mock_supabase,
):
    mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value.data = []

    response = client.get("/api/v1/categories")

    assert response.status_code == 200
    assert response.json() == {"items": []}


@patch("app.routers.categories.supabase")
def test_list_categories_filters_for_active_categories(
    mock_supabase,
):
    mock_query = (
        mock_supabase
        .table.return_value
        .select.return_value
        .eq.return_value
        .order.return_value
    )

    mock_query.execute.return_value.data = []

    response = client.get("/api/v1/categories")

    assert response.status_code == 200

    first_eq = (
        mock_supabase
        .table.return_value
        .select.return_value
        .eq
    )

    first_eq.assert_any_call("is_active", True)


@patch("app.routers.categories.supabase")
def test_list_categories_orders_by_display_order(
    mock_supabase,
):
    mock_query = (
        mock_supabase
        .table.return_value
        .select.return_value
        .eq.return_value
        .order
    )

    mock_query.return_value.execute.return_value.data = []

    response = client.get("/api/v1/categories")

    assert response.status_code == 200

    mock_query.assert_called_once_with(
        "display_order",
    )


@patch("app.routers.categories.supabase")
def test_list_categories_does_not_require_authentication(
    mock_supabase,
):
    mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value.data = []

    response = client.get("/api/v1/categories")

    assert response.status_code != 401