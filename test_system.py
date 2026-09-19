import sys
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_all():
    print("1. Testing /health...")
    r = client.get("/health")
    assert r.status_code == 200, f"Health failed: {r.text}"
    print("   [OK] Health OK:", r.json())

    print("2. Testing static files & PWA...")
    for path in ["/", "/manifest.json", "/sw.js", "/static/app.js", "/static/reminders.js", "/static/notes.js"]:
        r = client.get(path)
        assert r.status_code == 200, f"Failed fetching {path}: {r.status_code}"
    print("   [OK] All static assets & JS modules served successfully!")

    print("3. Testing Settings API...")
    r = client.get("/api/settings")
    assert r.status_code == 200
    assert r.json()["assistant_name"] == "Pandele"
    assert r.json()["timezone"] == "Europe/Bucharest"
    print("   [OK] Settings OK: Assistant is", r.json()["assistant_name"], "Timezone is", r.json()["timezone"])

    print("4. Testing Conversations API...")
    r = client.post("/api/conversations", json={"title": "Test Chat"})
    assert r.status_code == 200
    conv_id = r.json()["id"]
    print(f"   [OK] Created conversation ID: {conv_id}")

    print("5. Testing Memory API & Vector store...")
    r = client.post("/api/memories", json={
        "category": "preference",
        "content": "Utilizatorul prefera rapoarte clare.",
        "importance_score": 1.5
    })
    assert r.status_code == 200
    mem_id = r.json()["id"]
    print(f"   [OK] Added memory ID: {mem_id}")

    print("6. Testing Reminders & Function Calling API...")
    r = client.post("/api/reminders", json={
        "title": "Suna la contabil",
        "due_date_time": "2026-09-20T10:00:00",
        "priority": "high",
        "category": "business"
    })
    assert r.status_code == 200
    rem_id = r.json()["id"]
    print(f"   [OK] Created reminder ID: {rem_id}")

    # Toggle complete
    r = client.post(f"/api/reminders/{rem_id}/toggle")
    assert r.status_code == 200
    assert r.json()["is_completed"] is True
    print("   [OK] Toggled reminder status: Completed")

    # List reminders
    r = client.get("/api/reminders?filter_type=all")
    assert r.status_code == 200
    assert any(rem["id"] == rem_id for rem in r.json())
    print("   [OK] Listed reminders successfully")

    # Due reminders
    r = client.get("/api/reminders/due")
    assert r.status_code == 200
    print("   [OK] Due reminders API returned successfully:", len(r.json()), "due")

    # Snooze reminder
    r = client.post(f"/api/reminders/{rem_id}/snooze?minutes=15")
    assert r.status_code == 200
    print("   [OK] Snooze reminder 15 min OK")

    print("7. Testing Tools API (Pawn Commission)...")
    r = client.post("/api/tools/pawn-commission?principal=2000&days=10&rate=0.3")
    assert r.status_code == 200
    data = r.json()
    assert data["total_commission_lei"] == 60.0
    print("   [OK] Pawn Commission calc OK:", data)

    print("8. Testing Chat Stream API...")
    r = client.post("/api/chat/stream", json={"message": "Ce ora este acum?"})
    assert r.status_code == 200
    assert "data: " in r.text
    print("   [OK] Chat SSE Streaming response OK!")

    print("\n=========================================")
    print("[SUCCESS] ALL 8 TESTS PASSED SUCCESSFULLY! 100% READY!")
    print("=========================================")

if __name__ == "__main__":
    test_all()
