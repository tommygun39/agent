from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from backend.app.models.schema import MemorySchema, MemoryCreate
from backend.app.services.memory_service import MemoryService

router = APIRouter()

@router.get('/memories')
def list_memories(limit: int = 50):
    return MemoryService.list_all_memories(limit=limit)

@router.post('/memories')
def add_memory(data: MemoryCreate):
    if not data.content.strip():
        raise HTTPException(status_code=400, detail='Conținutul memoriei nu poate fi gol')
    return MemoryService.add_memory(
        category=data.category,
        content=data.content,
        importance=data.importance_score
    )

@router.delete('/memories/{memory_id}')
def delete_memory(memory_id: str):
    success = MemoryService.delete_memory(memory_id)
    if not success:
        raise HTTPException(status_code=404, detail='Memoria nu a fost găsită')
    return {'success': True, 'deleted_id': memory_id}

@router.get('/memories/search')
def search_memories(q: str = Query(..., min_length=1)):
    return MemoryService.get_relevant_memories(query=q, top_k=5)
