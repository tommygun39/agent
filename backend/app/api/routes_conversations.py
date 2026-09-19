from fastapi import APIRouter, HTTPException
from typing import List
import uuid
from backend.app.models.schema import ConversationSchema, ConversationCreate
from backend.app.core.database import get_db_connection
from backend.app.core.timezone import now_ro_iso

router = APIRouter()

@router.get('/conversations')
def list_conversations():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id, title, is_pinned, created_at, updated_at FROM conversations ORDER BY is_pinned DESC, updated_at DESC')
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@router.post('/conversations')
def create_conversation(data: ConversationCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    conv_id = str(uuid.uuid4())
    now = now_ro_iso()
    title = data.title or 'Conversație nouă'
    cursor.execute(
        'INSERT INTO conversations (id, title, is_pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        (conv_id, title, 0, now, now)
    )
    conn.commit()
    conn.close()
    return {'id': conv_id, 'title': title, 'is_pinned': 0, 'created_at': now, 'updated_at': now}

@router.delete('/conversations/{conv_id}')
def delete_conversation(conv_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM messages WHERE conversation_id = ?', (conv_id,))
    cursor.execute('DELETE FROM conversations WHERE id = ?', (conv_id,))
    conn.commit()
    conn.close()
    return {'success': True, 'deleted_id': conv_id}

@router.patch('/conversations/{conv_id}')
def update_conversation(conv_id: str, payload: dict):
    conn = get_db_connection()
    cursor = conn.cursor()
    updates = []
    params = []
    if 'title' in payload:
        updates.append('title = ?')
        params.append(payload['title'])
    if 'is_pinned' in payload:
        updates.append('is_pinned = ?')
        params.append(1 if payload['is_pinned'] else 0)
    
    if not updates:
        conn.close()
        return {'success': False}
        
    updates.append('updated_at = ?')
    params.append(now_ro_iso())
    params.append(conv_id)
    
    query = f"UPDATE conversations SET {', '.join(updates)} WHERE id = ?"
    cursor.execute(query, params)
    conn.commit()
    conn.close()
    return {'success': True}
