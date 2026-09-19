# 🌟 Momo Agent - Asistent Personal Inteligent Cross-Platform

Asistent inteligent personalizat, proiectat pentru funcționare cross-platform impecabilă pe **PC și Telefon**, dotat cu **memorie persistentă pe termen lung (semantic memory)**, calcule specializate și suport pentru modelele **Google Gemini (2.0 Flash / 1.5 Pro)**.

---

## 📱 Caracteristici Cheie

1. **Cross-Platform PWA (Progressive Web App):**
   - **PC:** Interfață dual-pane optimizată cu istoric conversații, căutare și panouri laterale.
   - **Mobil (iOS & Android):** Se instalează direct pe ecranul principal (*Add to Home Screen*) fără a fi nevoie de App Store sau Google Play.
2. **Memorie Semantică Persistentă pe 3 Niveluri:**
   - **Memorie de lucru:** Istoricul conversației curente.
   - **Memorie pe termen lung:** Fapte, preferințe și instrucțiuni indexate prin vector embeddings și căutare prin similitudine cosinus.
   - **Profil permanent:** Personalitate, ton și rol personalizat.
3. **Control Vocal & Audio:**
   - Dictare vocală directă din microfon (Web Speech API în limba română).
   - Sinteză vocală (Text-to-Speech) pentru redarea audio a răspunsurilor asistentului.
4. **Unelte & Calcule Integrate:**
   - Calculator de comisioane și termene pentru contracte de amanet (cu regulile Momo Amanet).
   - Evaluator de expresii matematice și notițe rapide.
5. **Streaming în timp real (SSE):**
   - Răspunsurile sunt afișate fluid cuvânt cu cuvânt, cu randare Markdown și evidențiere cod sintactică.

---

## 🚀 Pornire Rapidă

### Pe PC (Windows)
Fă dublu click pe:
```bat
start.bat
```
Sau rulează manual din terminal:
```bash
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
Aplicația se va deschide automat în browser la: `http://localhost:8000`.

### Pe Telefon (Mobil)
1. Asigură-te că telefonul este conectat la aceeași rețea Wi-Fi cu PC-ul.
2. Deschide browserul pe telefon (Safari pe iPhone sau Chrome pe Android) și tastează adresa IP a PC-ului (afișată automat în fereastra `start.bat`), de exemplu:
   ```
   http://192.168.1.X:8000
   ```
3. **Instalare ca aplicație pe ecranul telefonului:**
   - **Pe iPhone (Safari):** Apasă butonul de Share (pătratul cu săgeată) -> Alege **„Add to Home Screen” (Adaugă pe ecranul principal)**.
   - **Pe Android (Chrome):** Apasă pe meniul cu trei puncte -> Alege **„Install app” / „Add to Home screen”**.

---

## ⚙️ Configurare Cheie API

1. Deschide aplicația și apasă pe butonul **Setări (⚙️)**.
2. Introdu cheia ta **Google Gemini API** (poți obține gratuit una de pe [Google AI Studio](https://aistudio.google.com/app/apikey)).
3. Salvează setările. Asistentul va fi activ instantaneu!

---

## 🧪 Rulare Teste Automate

```bash
python -X utf8 test_system.py
```
