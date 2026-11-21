"""
Regression tests for bugs found during the offline-deployment review.
"""
from fastapi.testclient import TestClient


def _setup(client: TestClient, headers: dict):
    room = client.post("/api/rooms/", json={"name": "R"}, headers=headers).json()
    unit_a = client.post("/api/storage-units/", headers=headers, json={
        "room_id": room["id"], "label": "A", "type": "cabinet"}).json()
    unit_b = client.post("/api/storage-units/", headers=headers, json={
        "room_id": room["id"], "label": "B", "type": "shelf"}).json()
    comp = client.post("/api/compartments/", headers=headers, json={
        "storage_unit_id": unit_a["id"], "name": "Drawer"}).json()
    return room, unit_a, unit_b, comp


def test_batch_move_is_not_captured_by_single_item_route(client, auth_headers):
    """POST /items/batch/move used to be routed to /items/{item_id}/move -> 422."""
    _, unit_a, unit_b, _ = _setup(client, auth_headers)
    item = client.post("/api/items/", headers=auth_headers, json={
        "name": "X", "storage_unit_id": unit_a["id"]}).json()

    r = client.post("/api/items/batch/move", headers=auth_headers, json={
        "item_ids": [item["id"]], "to_storage_unit_id": unit_b["id"]})
    assert r.status_code == 200, r.text
    assert r.json()["moved_count"] == 1
    assert client.get(f"/api/items/{item['id']}", headers=auth_headers).json()["storage_unit_id"] == unit_b["id"]
    history = client.get(f"/api/items/{item['id']}/history", headers=auth_headers).json()
    assert len(history) == 1


def test_delete_room_with_items_returns_400_not_500(client, auth_headers):
    room, unit_a, _, comp = _setup(client, auth_headers)
    client.post("/api/items/", headers=auth_headers, json={"name": "In drawer", "compartment_id": comp["id"]})

    r = client.delete(f"/api/rooms/{room['id']}", headers=auth_headers)
    assert r.status_code == 400
    assert "item" in r.json()["detail"]
    # Nothing was deleted
    assert client.get(f"/api/rooms/{room['id']}", headers=auth_headers).status_code == 200


def test_delete_room_with_only_deleted_items_succeeds(client, auth_headers):
    room, unit_a, _, comp = _setup(client, auth_headers)
    item = client.post("/api/items/", headers=auth_headers, json={
        "name": "Gone", "storage_unit_id": unit_a["id"]}).json()
    client.delete(f"/api/items/{item['id']}", headers=auth_headers)

    r = client.delete(f"/api/rooms/{room['id']}", headers=auth_headers)
    assert r.status_code == 204, r.text


def test_delete_compartment_with_items_returns_400_not_500(client, auth_headers):
    _, _, _, comp = _setup(client, auth_headers)
    client.post("/api/items/", headers=auth_headers, json={"name": "In drawer", "compartment_id": comp["id"]})

    r = client.delete(f"/api/compartments/{comp['id']}", headers=auth_headers)
    assert r.status_code == 400
    assert client.get(f"/api/compartments/{comp['id']}", headers=auth_headers).status_code == 200


def test_delete_empty_compartment_succeeds(client, auth_headers):
    _, _, _, comp = _setup(client, auth_headers)
    assert client.delete(f"/api/compartments/{comp['id']}", headers=auth_headers).status_code == 204
