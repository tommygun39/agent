from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from backend.app.models.schema import ChatRequest
from backend.app.services.llm_service import LLMService
from backend.app.core.database import get_db_connection

router = APIRouter()

@router.post('/chat/stream')
async def chat_stream(request: ChatRequest):
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
