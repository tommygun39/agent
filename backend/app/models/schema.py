from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    conversation_id: Optional[str] = None
    model: Optional[str] = None

class MessageSchema(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    metadata: Optional[Dict[str, Any]] = None
    created_at: str

class ConversationSchema(BaseModel):
    id: str
    title: str
    is_pinned: bool = False
    created_at: str
    updated_at: str

class ConversationCreate(BaseModel):
    title: Optional[str] = 'Conversație nouă'

class MemorySchema(BaseModel):
    id: str
    category: str
    content: str
    importance_score: float = 1.0
    last_accessed_at: str
    created_at: str

class MemoryCreate(BaseModel):
    category: str = 'fact'
    content: str
    importance_score: float = 1.0

class NoteSchema(BaseModel):
    id: str
    title: str
    content: str
    tags: str = ''
    created_at: str
    updated_at: str

class NoteCreate(BaseModel):
    title: str
    content: str
    tags: Optional[str] = ''

class SettingsUpdate(BaseModel):
    gemini_api_key: Optional[str] = None
    assistant_name: Optional[str] = None
    system_prompt: Optional[str] = None
    default_model: Optional[str] = None
    assistant_language: Optional[str] = None
