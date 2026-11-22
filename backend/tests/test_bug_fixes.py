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


def test_delete_unit_with_items_in_compartment_returns_400_not_500(client, auth_headers):
    """Items inside a unit's compartments used to be ignored -> crash (500)."""
    _, unit_a, _, comp = _setup(client, auth_headers)
    client.post("/api/items/", headers=auth_headers, json={"name": "In drawer", "compartment_id": comp["id"]})

    r = client.delete(f"/api/storage-units/{unit_a['id']}", headers=auth_headers)
    assert r.status_code == 400
    assert "1 item" in r.json()["detail"]
    assert client.get(f"/api/storage-units/{unit_a['id']}", headers=auth_headers).status_code == 200


def test_delete_unit_with_only_deleted_items_in_compartment_succeeds(client, auth_headers):
    _, unit_a, _, comp = _setup(client, auth_headers)
    item = client.post("/api/items/", headers=auth_headers, json={
        "name": "Gone", "compartment_id": comp["id"]}).json()
    client.delete(f"/api/items/{item['id']}", headers=auth_headers)

    r = client.delete(f"/api/storage-units/{unit_a['id']}", headers=auth_headers)
    assert r.status_code == 204, r.text


def test_csv_export_hebrew_room_name_and_compartment_items(client, auth_headers):
    """Hebrew room names used to crash the export (non-ASCII header -> 500);
    items in compartments and projects were missing; no BOM for Excel."""
    room = client.post("/api/rooms/", json={"name": "מעבדה ראשית"}, headers=auth_headers).json()
    unit = client.post("/api/storage-units/", headers=auth_headers, json={
        "room_id": room["id"], "label": "ארון 1", "type": "cabinet"}).json()
    comp = client.post("/api/compartments/", headers=auth_headers, json={
        "storage_unit_id": unit["id"], "name": "מגירה"}).json()
    client.post("/api/items/", headers=auth_headers, json={
        "name": "מולטימטר", "storage_unit_id": unit["id"], "projects": ["פרויקט א", "B"]})
    client.post("/api/items/", headers=auth_headers, json={
        "name": "נגדים", "compartment_id": comp["id"]})

    r = client.get(f"/api/rooms/{room['id']}/export", headers=auth_headers)
    assert r.status_code == 200, r.text
    assert r.content.startswith(b"\xef\xbb\xbf")  # UTF-8 BOM for Excel
    assert "filename*=UTF-8''" in r.headers["content-disposition"]
    text = r.content.decode("utf-8-sig")
    assert "מולטימטר" in text and "פרויקט א, B" in text
    assert "מגירה" in text and "נגדים" in text  # compartment item included


def test_list_items_by_unit_includes_compartment_items(client, auth_headers):
    _, unit_a, _, comp = _setup(client, auth_headers)
    client.post("/api/items/", headers=auth_headers, json={"name": "Direct", "storage_unit_id": unit_a["id"]})
    client.post("/api/items/", headers=auth_headers, json={"name": "In drawer", "compartment_id": comp["id"]})

    names = {i["name"] for i in client.get(
        f"/api/items/?storage_unit_id={unit_a['id']}", headers=auth_headers).json()}
    assert names == {"Direct", "In drawer"}


def test_edit_count_increments_only_for_successful_inventory_edits(client, auth_headers, db, admin_user):
    from app.models.user import User

    def count():
        db.expire_all()
        return db.query(User).filter(User.id == admin_user.id).one().edit_count

    room = client.post("/api/rooms/", json={"name": "Counted"}, headers=auth_headers).json()
    assert count() == 1
    client.put(f"/api/rooms/{room['id']}", json={"notes": "x"}, headers=auth_headers)
    assert count() == 2
    client.get(f"/api/rooms/{room['id']}", headers=auth_headers)          # reads don't count
    client.post("/api/items/", json={"name": "no location"}, headers=auth_headers)  # 400, not counted
    assert count() == 2
    stats = client.get("/api/auth/stats", headers=auth_headers).json()
    assert stats["top_editors"][0] == {"username": "admin", "edit_count": 2}


def test_item_history_has_readable_names(client, auth_headers):
    room, unit_a, unit_b, comp = _setup(client, auth_headers)
    item = client.post("/api/items/", headers=auth_headers, json={
        "name": "Tracked", "storage_unit_id": unit_a["id"]}).json()
    client.post(f"/api/items/{item['id']}/move", headers=auth_headers,
                json={"to_compartment_id": comp["id"], "reason": "into drawer"})
    client.post(f"/api/items/{item['id']}/move", headers=auth_headers,
                json={"to_storage_unit_id": unit_b["id"]})

    history = client.get(f"/api/items/{item['id']}/history", headers=auth_headers).json()
    assert len(history) == 2
    # Both moves happen within the same second here (SQLite stores whole
    # seconds), so identify them by content rather than by order.
    oldest = next(h for h in history if h["reason"] == "into drawer")
    newest = next(h for h in history if h is not oldest)
    assert oldest["from_location"] == "R > A"
    assert oldest["to_location"] == "R > A > Drawer"
    assert oldest["reason"] == "into drawer"
    assert oldest["username"] == "admin"
    assert newest["from_location"] == "R > A > Drawer"
    assert newest["to_location"] == "R > B"


def test_delete_empty_compartment_succeeds(client, auth_headers):
    _, _, _, comp = _setup(client, auth_headers)
    assert client.delete(f"/api/compartments/{comp['id']}", headers=auth_headers).status_code == 204
