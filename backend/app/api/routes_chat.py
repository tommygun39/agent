from typing import Optional
from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import StreamingResponse
from backend.app.models.schema import ChatRequest
from backend.app.services.llm_service import LLMService
from backend.app.core.config import settings
from backend.app.core.database import get_db_connection

router = APIRouter()

@router.post('/chat/stream')
async def chat_stream(request: ChatRequest, x_gemini_key: Optional[str] = Header(None)):
    if x_gemini_key and not settings.GEMINI_API_KEY:
        settings.update_gemini_key(x_gemini_key)
    return StreamingResponse(
        LLMService.stream_chat(
            message=request.message,
            conversation_id=request.conversation_id,
            model_name=request.model
        ),
        media_type='text/event-stream'
    )

@router.get('/conversations/{conv_id}/messages')
def get_conversation_messages(conv_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        'SELECT id, conversation_id, role, content, metadata, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
        (conv_id,)
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]
