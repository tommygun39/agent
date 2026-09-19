import httpx
import json

base_url = "https://agent-5sfa.onrender.com"

print("1. Verificare status API Key pe Render...")
try:
    r_settings = httpx.get(f"{base_url}/api/settings", timeout=15)
    data = r_settings.json()
    print("   has_api_key:", data.get("has_api_key"))
    print("   masked_api_key:", data.get("masked_api_key"))
except Exception as e:
    print("   Eroare settings:", e)

print("\n2. Testare conversatie inteligenta cu Pandele prin Gemini...")
payload = {"message": "Salut Pandele! Confirma te rog ca cheia ta API functioneaza si spune-mi pe scurt cine esti."}

full_reply = ""
has_error = False

try:
    with httpx.stream("POST", f"{base_url}/api/chat/stream", json=payload, timeout=30) as response:
        for line in response.iter_lines():
            if line.startswith("data: "):
                evt = json.loads(line[6:])
                if evt.get("type") == "chunk":
                    full_reply += evt.get("content", "")
                elif evt.get("type") == "error":
                    print("   EROARE DE LA API:", evt.get("content"))
                    has_error = True

    if not has_error and full_reply:
        print("\n--- Răspuns Primit de la Pandele (Gemini) ---")
        print(full_reply.strip())
        print("---------------------------------------------")
        print("\n✓ CONEXIUNEA CU GEMINI API ESTE 100% FUNCȚIONALĂ ȘI VALIDATĂ!")
    elif not full_reply:
        print("Nu s-a primit niciun răspuns text.")
except Exception as e:
    print("Eroare la apelul chat stream:", e)
