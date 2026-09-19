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
    r = client.get("/")
    assert r.status_code == 200
    assert "<title>Momo Agent" in r.text
    print("   ✓ index.html OK")

    r = client.get("/manifest.json")
    assert r.status_code == 200
    assert "Momo Agent" in r.json()["name"]
    print("   ✓ manifest.json OK")

    r = client.get("/sw.js")
    assert r.status_code == 200
    print("   ✓ sw.js OK")

    print("3. Testing Settings API...")
    r = client.get("/api/settings")
    assert r.status_code == 200
    print("   ✓ Settings OK:", r.json()["assistant_name"])

    print("4. Testing Conversations API...")
    r = client.post("/api/conversations", json={"title": "Test Chat"})
    assert r.status_code == 200
    conv_id = r.json()["id"]
    print(f"   ✓ Created conversation ID: {conv_id}")

    r = client.get("/api/conversations")
    assert r.status_code == 200
    assert any(c["id"] == conv_id for c in r.json())
    print("   ✓ Conversations list OK")

    print("5. Testing Memory API & Vector store...")
    r = client.post("/api/memories", json={
        "category": "preference",
        "content": "Utilizatorul preferă rapoarte clare.",
        "importance_score": 1.5
    })
    assert r.status_code == 200
    mem_id = r.json()["id"]
    print(f"   ✓ Added memory ID: {mem_id}")

    r = client.get("/api/memories")
    assert r.status_code == 200
    print(f"   ✓ Memories count: {len(r.json())}")

    print("6. Testing Tools API (Pawn Commission)...")
    r = client.post("/api/tools/pawn-commission?principal=2000&days=10&rate=0.3")
    assert r.status_code == 200
    data = r.json()
    assert data["total_commission_lei"] == 60.0
    assert data["total_due_lei"] == 2060.0
    print("   ✓ Pawn Commission calc OK:", data)

    print("7. Testing Chat Stream API (onboarding fallback)...")
    r = client.post("/api/chat/stream", json={"message": "Salut"})
    assert r.status_code == 200
    assert "data: " in r.text
    print("   ✓ Chat SSE Streaming response OK!")

    print("\n=========================================")
    print("🎉 ALL TESTS PASSED SUCCESSFULLY! 100% READY!")
    print("=========================================")

if __name__ == "__main__":
    test_all()
