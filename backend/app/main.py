import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.app.core.config import settings
from backend.app.core.database import init_db
from backend.app.api.routes_chat import router as chat_router
from backend.app.api.routes_conversations import router as conv_router
from backend.app.api.routes_memory import router as memory_router
from backend.app.api.routes_settings import router as settings_router
from backend.app.api.routes_reminders import router as reminders_router

# Initialize Database
init_db()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Asistent Personal Inteligent Cross-Platform cu Memorie & Remindere"
)

# Enable CORS for cross-device mobile & PC access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(chat_router, prefix="/api", tags=["Chat"])
app.include_router(conv_router, prefix="/api", tags=["Conversations"])
app.include_router(memory_router, prefix="/api", tags=["Memories"])
app.include_router(settings_router, prefix="/api", tags=["Settings"])
app.include_router(reminders_router, prefix="/api", tags=["Reminders"])

# Frontend directory
FRONTEND_DIR = settings.BASE_DIR / "frontend"

@app.get("/health")
def health_check():
    return {"status": "ok", "app": settings.PROJECT_NAME, "version": settings.VERSION}

# Mount static files (PWA, js, css, icons)
if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")

    @app.get("/")
    def serve_index():
        return FileResponse(FRONTEND_DIR / "index.html")

    @app.get("/manifest.json")
    def serve_manifest():
        return FileResponse(FRONTEND_DIR / "manifest.json")

    @app.get("/sw.js")
    def serve_service_worker():
        return FileResponse(FRONTEND_DIR / "sw.js", media_type="application/javascript")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
