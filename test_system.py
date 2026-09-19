import sys
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_all():
    print("1. Testing /health...")
    r = client.get("/health")
    assert r.status_code == 200, f"Health failed: {r.text}"
    print("   ✓ Health OK:", r.json())

    print("2. Testing static files & PWA...")
    for path in ["/", "/manifest.json", "/sw.js", "/static/app.js", "/static/reminders.js", "/static/notes.js"]:
        r = client.get(path)
        assert r.status_code == 200, f"Failed fetching {path}: {r.status_code}"
    print("   ✓ All static assets & JS modules served successfully!")

    print("3. Testing Settings API...")
    r = client.get("/api/settings")
    assert r.status_code == 200
    assert r.json()["assistant_name"] == "Pandele"
    print("   ✓ Settings OK: Assistant is", r.json()["assistant_name"])

    print("4. Testing Conversations API...")
    r = client.post("/api/conversations", json={"title": "Test Chat"})
    assert r.status_code == 200
    conv_id = r.json()["id"]
    print(f"   ✓ Created conversation ID: {conv_id}")

    print("5. Testing Memory API & Vector store...")
    r = client.post("/api/memories", json={
        "category": "preference",
        "content": "Utilizatorul preferă rapoarte clare.",
        "importance_score": 1.5
    })
    assert r.status_code == 200
    mem_id = r.json()["id"]
    print(f"   ✓ Added memory ID: {mem_id}")

    print("6. Testing Reminders & Function Calling API...")
    r = client.post("/api/reminders", json={
        "title": "Sună la contabil",
        "due_date_time": "2026-09-20T10:00:00",
        "priority": "high",
        "category": "business"
    })
    assert r.status_code == 200
    rem_id = r.json()["id"]
    print(f"   ✓ Created reminder ID: {rem_id}")

    # Toggle complete
    r = client.post(f"/api/reminders/{rem_id}/toggle")
    assert r.status_code == 200
    assert r.json()["is_completed"] is True
    print("   ✓ Toggled reminder status: Completed")

    # List reminders
    r = client.get("/api/reminders?filter_type=all")
    assert r.status_code == 200
    assert any(rem["id"] == rem_id for rem in r.json())
    print("   ✓ Listed reminders successfully")

    print("7. Testing Tools API (Pawn Commission)...")
    r = client.post("/api/tools/pawn-commission?principal=2000&days=10&rate=0.3")
    assert r.status_code == 200
    data = r.json()
    assert data["total_commission_lei"] == 60.0
    print("   ✓ Pawn Commission calc OK:", data)

    print("8. Testing Chat Stream API...")
    r = client.post("/api/chat/stream", json={"message": "Amintește-mi mâine să verific contractele"})
    assert r.status_code == 200
    assert "data: " in r.text
    print("   ✓ Chat SSE Streaming response OK!")

    print("\n=========================================")
    print("🎉 ALL 8 TESTS PASSED SUCCESSFULLY! 100% READY!")
    print("=========================================")

if __name__ == "__main__":
    test_all()
