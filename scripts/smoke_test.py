#!/usr/bin/env python3
"""
End-to-end feature test for a running Inventory Manager installation.

Exercises every API feature through the real web server (nginx -> backend ->
PostgreSQL). Uses only the Python standard library.

Everything it creates is prefixed with "SMOKE-<random>" and is removed again at
the end (rooms/units/compartments/blocks are deleted, items are soft-deleted),
unless --keep is given. Existing data is never modified or deleted.

Note: with --with-users it registers two extra user accounts
(smoke_editor_*/smoke_viewer_*). Users cannot be deleted through the API, so
they are deactivated at the end instead.

Usage:
    python smoke_test.py --url http://localhost --admin-user admin --admin-pass admin
"""
import argparse
import json
import sys
import uuid
import urllib.error
import urllib.parse
import urllib.request

PASSED, FAILED = [], []


class Api:
    def __init__(self, base):
        self.base = base.rstrip("/")
        self.token = None

    COLLECTIONS = ("/rooms", "/storage-units", "/compartments", "/blocks", "/items")

    def call(self, method, path, body=None, form=None, token="default", raw=False):
        # Collection endpoints live at "/rooms/" (like the web UI uses them).
        base_path, sep, query = path.partition("?")
        if base_path in self.COLLECTIONS:
            path = base_path + "/" + sep + query
        url = self.base + "/api" + path
        headers = {}
        data = None
        tok = self.token if token == "default" else token
        if tok:
            headers["Authorization"] = f"Bearer {tok}"
        if form is not None:
            data = urllib.parse.urlencode(form).encode()
            headers["Content-Type"] = "application/x-www-form-urlencoded"
        elif body is not None:
            data = json.dumps(body).encode()
            headers["Content-Type"] = "application/json"
        req = urllib.request.Request(url, data=data, method=method, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                content = r.read()
                status = r.status
        except urllib.error.HTTPError as e:
            content = e.read()
            status = e.code
        if raw:
            return status, content.decode("utf-8", "replace")
        try:
            return status, json.loads(content) if content else None
        except ValueError:
            return status, content.decode("utf-8", "replace")


def check(name, cond, detail=""):
    (PASSED if cond else FAILED).append(name)
    print(("  PASS  " if cond else "  FAIL  ") + name + ("" if cond else f"   -> {detail}"))
    return cond


def login(api, user, pw):
    s, r = api.call("POST", "/auth/login", form={"username": user, "password": pw}, token=None)
    return r["access_token"] if s == 200 else None


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--url", default="http://localhost")
    p.add_argument("--admin-user", default="admin")
    p.add_argument("--admin-pass", default="admin")
    p.add_argument("--with-users", action="store_true", help="also test registration/roles (creates 2 users)")
    p.add_argument("--keep", action="store_true", help="do not clean up created data")
    a = p.parse_args()

    tag = "SMOKE-" + uuid.uuid4().hex[:6]
    api = Api(a.url)
    print(f"Testing {a.url}  (test data prefix: {tag})\n")

    # --- health ---------------------------------------------------------------
    s, _ = api.call("GET", "/health", token=None)
    check("backend health via nginx", s == 200, s)
    try:
        with urllib.request.urlopen(a.url.rstrip("/") + "/", timeout=10) as r:
            html = r.read().decode()
        check("frontend page served", r.status == 200 and '<div id="root">' in html)
        for asset in [x.split('"')[0] for x in html.split('src="')[1:] + html.split('href="')[1:]]:
            if asset.startswith("/assets/"):
                with urllib.request.urlopen(a.url.rstrip("/") + asset, timeout=10) as r2:
                    check(f"frontend asset {asset}", r2.status == 200)
    except Exception as e:  # noqa: BLE001
        check("frontend page served", False, e)

    # --- auth -----------------------------------------------------------------
    api.token = login(api, a.admin_user, a.admin_pass)
    if not check("admin login", api.token is not None, "cannot log in - check --admin-user/--admin-pass"):
        return finish()
    s, me = api.call("GET", "/auth/me")
    check("GET /auth/me is admin", s == 200 and me["role"] == "admin", me)
    check("bad password rejected", login(api, a.admin_user, a.admin_pass + "x") is None)
    s, _ = api.call("GET", "/auth/me", token="not-a-token")
    check("invalid token rejected", s == 401, s)
    s, _ = api.call("POST", "/auth/heartbeat")
    check("heartbeat", s == 200, s)
    s, stats = api.call("GET", "/auth/stats")
    check("admin stats", s == 200 and "total_items" in stats, stats)
    s, users = api.call("GET", "/auth/users")
    check("list users", s == 200 and isinstance(users, list), users)

    editor_tok = viewer_tok = None
    created_users = []
    if a.with_users:
        for role in ("editor", "viewer"):
            uname = f"smoke_{role}_{tag[-6:]}"
            s, u = api.call("POST", "/auth/register", token=None, body={
                "username": uname, "email": f"{uname}@example.com", "password": "smokepass123"})
            check(f"register {role}", s == 201 and u["role"] == "viewer", u)
            if s == 201:
                created_users.append(u["id"])
                if role == "editor":
                    s, u2 = api.call("PUT", f"/auth/users/{u['id']}", body={"role": "editor"})
                    check("admin promotes user to editor", s == 200 and u2["role"] == "editor", u2)
                tok = login(api, uname, "smokepass123")
                if role == "editor":
                    editor_tok = tok
                else:
                    viewer_tok = tok
        s, _ = api.call("POST", "/auth/register", token=None, body={
            "username": f"smoke_editor_{tag[-6:]}", "email": "dup@example.com", "password": "smokepass123"})
        check("duplicate username rejected", s == 400, s)

    # --- rooms ----------------------------------------------------------------
    s, room = api.call("POST", "/rooms/", body={
        "name": f"{tag} Lab", "building": "B1", "width": 10, "height": 8,
        "shape": "l_shape", "shape_cutout_width": 3, "shape_cutout_height": 2,
        "shape_cutout_corner": "top_right", "door_wall": "north", "door_position": 0.3, "door_width": 1.2})
    if not check("create room (L-shape + door)", s == 201, room):
        return finish()
    s, room2 = api.call("POST", "/rooms/", body={"name": f"{tag} Store", "width": 5, "height": 5})
    check("create second room", s == 201, room2)
    s, r = api.call("PUT", f"/rooms/{room['id']}", body={"notes": "updated by smoke test"})
    check("update room", s == 200 and r["notes"] == "updated by smoke test", r)
    s, rooms = api.call("GET", "/rooms/", token=None)
    check("public room list", s == 200 and any(x["id"] == room["id"] for x in rooms), s)
    s, _ = api.call("GET", f"/rooms/{room['id']}", token=None)
    check("room details need login", s == 401, s)

    # --- storage units / compartments / blocks --------------------------------
    s, u1 = api.call("POST", "/storage-units", body={"room_id": room["id"], "label": f"{tag} Cabinet A",
                                                      "type": "cabinet", "x": 1, "y": 1, "width": 2, "height": 1})
    check("create storage unit", s == 201, u1)
    s, u2 = api.call("POST", "/storage-units", body={"room_id": room2["id"], "label": f"{tag} Shelf B",
                                                      "type": "shelf", "x": 0, "y": 0, "width": 1, "height": 1})
    check("create second storage unit", s == 201, u2)
    s, r = api.call("PUT", f"/storage-units/{u1['id']}", body={"x": 3, "rotation": 90})
    check("move/rotate storage unit", s == 200 and r["x"] == 3 and r["rotation"] == 90, r)
    s, lst = api.call("GET", f"/storage-units?room_id={room['id']}")
    check("list storage units by room", s == 200 and len(lst) == 1, lst)
    s, comp = api.call("POST", "/compartments", body={"storage_unit_id": u1["id"], "name": "Drawer 1", "index_order": 0})
    check("create compartment", s == 201, comp)
    s, r = api.call("PUT", f"/compartments/{comp['id']}", body={"name": "Drawer 1 (top)"})
    check("update compartment", s == 200 and r["name"] == "Drawer 1 (top)", r)
    s, lst = api.call("GET", f"/compartments?storage_unit_id={u1['id']}")
    check("list compartments", s == 200 and len(lst) == 1, lst)
    s, blk = api.call("POST", "/blocks", body={"room_id": room["id"], "label": "Pillar", "x": 5, "y": 5})
    check("create block", s == 201, blk)
    s, r = api.call("PUT", f"/blocks/{blk['id']}", body={"x": 6})
    check("update block", s == 200 and r["x"] == 6, r)
    s, det = api.call("GET", f"/rooms/{room['id']}")
    check("room details include units & blocks",
          s == 200 and len(det["storage_units"]) == 1 and len(det["blocks"]) == 1, det)

    # --- items ----------------------------------------------------------------
    s, i1 = api.call("POST", "/items", body={"name": f"{tag} Oscilloscope", "storage_unit_id": u1["id"],
                                              "catalog_number": "CAT-1", "unit_catalog_number": "UCN-1",
                                              "serial_number": "SN-1", "owned_by": "Lab team", "quantity": 2,
                                              "projects": ["פרויקט אלפא", "Beta"]})
    check("create item (Hebrew project name)", s == 201, i1)
    s, i2 = api.call("POST", "/items", body={"name": f"{tag} Resistor kit", "compartment_id": comp["id"]})
    check("create item in compartment", s == 201, i2)
    s, i3 = api.call("POST", "/items", body={"name": f"{tag} Cable", "storage_unit_id": u1["id"]})
    check("create third item", s == 201, i3)
    s, _ = api.call("POST", "/items", body={"name": "no location"})
    check("item without location rejected", s == 400, s)
    s, r = api.call("PUT", f"/items/{i1['id']}", body={"quantity": 3, "description": "updated"})
    check("update item", s == 200 and r["quantity"] == 3, r)
    s, r = api.call("GET", f"/items/{i1['id']}")
    check("get item", s == 200 and r["name"] == i1["name"], r)

    def search(q, **kw):
        qs = urllib.parse.urlencode({"query": q, **kw})
        return api.call("GET", f"/items/search?{qs}")

    s, r = search(tag)
    check("search by name", s == 200 and r["total"] == 3, r)
    s, r = search("SN-1")
    check("search by serial number", s == 200 and any(x["id"] == i1["id"] for x in r["items"]), r)
    s, r = search("cat-1")
    check("search case-insensitive catalog no.", s == 200 and any(x["id"] == i1["id"] for x in r["items"]), r)
    s, r = search("אלפא")
    check("search Hebrew project", s == 200 and any(x["id"] == i1["id"] for x in r["items"]), r)
    s, r = search(f"{tag} Cabinet")
    check("search by storage unit label", s == 200 and r["total"] >= 2, r)
    s, r = search(tag, room_id=room["id"])
    check("search filtered by room", s == 200 and r["total"] >= 2, r)
    hit = next((x for x in search(tag)[1]["items"] if x["id"] == i2["id"]), {})
    check("search returns location path", (hit.get("location_path") or "").endswith("Drawer 1 (top)"), hit)

    s, r = api.call("POST", f"/items/{i1['id']}/move", body={"to_storage_unit_id": u2["id"], "reason": "smoke"})
    check("move item", s == 200 and r["storage_unit_id"] == u2["id"], r)
    s, h = api.call("GET", f"/items/{i1['id']}/history")
    check("movement history", s == 200 and len(h) == 1 and h[0]["reason"] == "smoke", h)
    s, r = api.call("POST", "/items/batch/move", body={"item_ids": [i3["id"]], "to_storage_unit_id": u2["id"]})
    check("batch move", s == 200 and r["moved_count"] == 1, r)
    s, r = api.call("POST", f"/storage-units/{u2['id']}/move-all-items", body={"to_storage_unit_id": u1["id"]})
    check("move all items from unit", s == 200 and r["moved_count"] == 2, r)
    s, lst = api.call("GET", f"/items?storage_unit_id={u1['id']}")
    check("list items by unit", s == 200 and len(lst) == 2, lst)

    s, csv_text = api.call("GET", f"/rooms/{room['id']}/export", raw=True)
    check("CSV export", s == 200 and "Oscilloscope" in csv_text, csv_text[:200])

    # --- deletion rules -------------------------------------------------------
    s, _ = api.call("DELETE", f"/storage-units/{u1['id']}")
    check("cannot delete unit holding items", s == 400, s)
    s, body = api.call("DELETE", f"/rooms/{room['id']}")
    check("cannot delete room holding items (clean error, no crash)", s == 400, (s, body))
    s, body = api.call("DELETE", f"/compartments/{comp['id']}")
    check("cannot delete compartment holding items (clean error, no crash)", s == 400, (s, body))

    # --- roles ----------------------------------------------------------------
    if editor_tok:
        s, _ = api.call("POST", "/rooms/", body={"name": f"{tag} by editor"}, token=editor_tok)
        check("editor can create room", s == 201, s)
        if s == 201:
            pass
        s, _ = api.call("GET", "/auth/users", token=editor_tok)
        check("editor cannot list users", s == 403, s)
    if viewer_tok:
        s, _ = api.call("GET", f"/rooms/{room['id']}", token=viewer_tok)
        check("viewer cannot see room details", s == 403, s)
        s, _ = api.call("POST", "/rooms/", body={"name": "x"}, token=viewer_tok)
        check("viewer cannot create room", s == 403, s)

    if a.keep:
        print("\n--keep given: test data left in place.")
        return finish()

    # --- cleanup (also tests deletes) ----------------------------------------
    s, r = api.call("POST", "/items/batch/delete", body={"item_ids": [i1["id"], i3["id"]]})
    check("batch delete (soft)", s == 200 and r["success_count"] == 2, r)
    s, _ = api.call("DELETE", f"/items/{i2['id']}")
    check("delete item (soft)", s == 204, s)
    s, r = search(tag)
    check("deleted items hidden from search", s == 200 and r["total"] == 0, r)
    s, r = api.call("GET", f"/items/search?{urllib.parse.urlencode({'query': tag, 'status': 'deleted'})}")
    check("deleted items still findable as deleted", s == 200 and r["total"] == 3, r)
    s, _ = api.call("DELETE", f"/blocks/{blk['id']}")
    check("delete block", s == 204, s)
    s, _ = api.call("DELETE", f"/compartments/{comp['id']}")
    check("delete empty compartment", s == 204, s)
    s, _ = api.call("DELETE", f"/storage-units/{u2['id']}")
    check("delete empty storage unit", s == 204, s)
    s, _ = api.call("DELETE", f"/rooms/{room['id']}")
    check("delete room (only soft-deleted items left)", s == 204, s)
    s, _ = api.call("DELETE", f"/rooms/{room2['id']}")
    check("delete second room", s == 204, s)
    if editor_tok:
        for x in api.call("GET", "/rooms/")[1]:
            if x["name"] == f"{tag} by editor":
                api.call("DELETE", f"/rooms/{x['id']}")
    for uid in created_users:
        s, _ = api.call("PUT", f"/auth/users/{uid}", body={"is_active": False})
        check("deactivate test user", s == 200, s)
    return finish()


def finish():
    print(f"\n{len(PASSED)} passed, {len(FAILED)} failed")
    if FAILED:
        print("Failed checks:\n  - " + "\n  - ".join(FAILED))
    return 1 if FAILED else 0


if __name__ == "__main__":
    sys.exit(main())
