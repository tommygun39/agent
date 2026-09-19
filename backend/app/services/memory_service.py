import json
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
import google.generativeai as genai
from backend.app.core.config import settings
from backend.app.core.database import get_db_connection, cosine_similarity

class MemoryService:
    @staticmethod
    def get_embedding(text: str) -> List[float]:
        """Generate embedding using Gemini API or fallback vector"""
        if settings.GEMINI_API_KEY:
            try:
                genai.configure(api_key=settings.GEMINI_API_KEY)
                result = genai.embed_content(
                    model="models/text-embedding-004",
                    content=text,
                    task_type="semantic_similarity"
                )
                return result.get('embedding', [])
            except Exception as e:
                print(f"Warning: Embedding generation failed via API: {e}")
        
        # Fallback deterministic pseudo-embedding based on character frequencies
        vector = [0.0] * 64
        for i, char in enumerate(text.lower()):
            vector[ord(char) % 64] += 1.0 / (i + 1)
        # Normalize
        norm = sum(x*x for x in vector) ** 0.5
        if norm > 0:
            vector = [x / norm for x in vector]
        return vector

    @staticmethod
    def add_memory(category: str, content: str, importance: float = 1.0) -> Dict[str, Any]:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        mem_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        embedding = MemoryService.get_embedding(content)
        
        cursor.execute(
            '''
            INSERT INTO memories (id, category, content, embedding, importance_score, last_accessed_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ''',
            (mem_id, category, content, json.dumps(embedding), importance, now, now)
        )
        conn.commit()
        conn.close()
        
        return {
            "id": mem_id,
            "category": category,
            "content": content,
            "importance_score": importance,
            "last_accessed_at": now,
            "created_at": now
        }

    @staticmethod
    def get_relevant_memories(query: str, top_k: int = 5, threshold: float = 0.25) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, category, content, embedding, importance_score, last_accessed_at, created_at FROM memories")
        rows = cursor.fetchall()
        
        if not rows:
            conn.close()
            return []
            
        query_embedding = MemoryService.get_embedding(query)
        scored_memories = []
        
        for row in rows:
            try:
                emb = json.loads(row["embedding"])
                sim = cosine_similarity(query_embedding, emb)
                # Boost with importance score
                effective_score = sim * row["importance_score"]
                if effective_score >= threshold or sim >= 0.3:
                    scored_memories.append((effective_score, dict(row)))
            except Exception:
                continue
                
        # Sort descending by score
        scored_memories.sort(key=lambda x: x[0], reverse=True)
        results = [item[1] for item in scored_memories[:top_k]]
        
        # Update last_accessed_at for retrieved memories
        if results:
            now = datetime.now().isoformat()
            ids = [r["id"] for r in results]
            cursor.execute(
                f"UPDATE memories SET last_accessed_at = ? WHERE id IN ({','.join(['?']*len(ids))})",
                [now] + ids
            )
            conn.commit()
            
        conn.close()
        return results

    @staticmethod
    def list_all_memories(limit: int = 50) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, category, content, importance_score, last_accessed_at, created_at FROM memories ORDER BY created_at DESC LIMIT ?",
            (limit,)
        )
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]

    @staticmethod
    def delete_memory(memory_id: str) -> bool:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM memories WHERE id = ?", (memory_id,))
        conn.commit()
        deleted = cursor.rowcount > 0
        conn.close()
        return deleted

    @staticmethod
    def auto_extract_memories(user_message: str, assistant_response: str):
        """Detect if user shared durable preferences or personal info to persist"""
        keywords_ro = ["îmi place", "prefer", "reține", "amintește-ți", "lucrez la", "regula este", "numărul meu", "adresa"]
        lower = user_message.lower()
        if any(k in lower for k in keywords_ro):
            # Extract memory
            try:
                MemoryService.add_memory(
                    category="preference",
                    content=user_message.strip(),
                    importance=1.2
                )
            except Exception as e:
                print(f"Error in auto_extract_memories: {e}")
