import json
import uuid
from datetime import datetime
from typing import AsyncGenerator, List, Dict, Any, Optional
import google.generativeai as genai
from backend.app.core.config import settings
from backend.app.core.database import get_db_connection
from backend.app.services.memory_service import MemoryService
from backend.app.services.tools_service import ToolsService

class LLMService:
    @staticmethod
    def get_system_prompt(custom_instructions: Optional[str] = None) -> str:
        current_time = ToolsService.get_current_time()['formatted']
        base = settings.DEFAULT_SYSTEM_PROMPT
        if custom_instructions:
            base += f"\n\nInstrucțiuni personalizate permanente:\n{custom_instructions}"
        base += f"\n\nData și ora curentă: {current_time} (București, România)."
        return base

    @staticmethod
    async def stream_chat(
        message: str,
        conversation_id: Optional[str] = None,
        model_name: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 1. Ensure conversation exists
        now = datetime.now().isoformat()
        if not conversation_id:
            conversation_id = str(uuid.uuid4())
            # Generate initial title from first message
            title = message.strip().split('\n')[0][:40] or 'Conversație nouă'
            cursor.execute(
                'INSERT INTO conversations (id, title, is_pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
                (conversation_id, title, 0, now, now)
            )
        else:
            cursor.execute('UPDATE conversations SET updated_at = ? WHERE id = ?', (now, conversation_id))
            
        # 2. Save user message to database
        user_msg_id = str(uuid.uuid4())
        cursor.execute(
            'INSERT INTO messages (id, conversation_id, role, content, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            (user_msg_id, conversation_id, 'user', message, '{}', now)
        )
        conn.commit()

        # 3. Retrieve relevant long-term memories
        relevant_memories = MemoryService.get_relevant_memories(message, top_k=4)
        
        # Yield metadata event with conversation_id and matched memories
        yield f"data: {json.dumps({'type': 'init', 'conversation_id': conversation_id, 'memories': relevant_memories})}\n\n"

        # 4. Fetch recent short-term history for this conversation (last 10 messages)
        cursor.execute(
            'SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
            (conversation_id,)
        )
        raw_history = cursor.fetchall()
        conn.close()

        # 5. Check API key
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            info_msg = (
                "Salut! 👋 Sunt **Momo Agent**.\n\n"
                "Pentru a putea purta conversații inteligente și a folosi modelele Gemini, "
                "te rog să adaugi cheia ta **Google Gemini API** în panoul de **Setări (⚙️)** din colțul ecranului "
                "sau în fișierul `.env`.\n\n"
                "Poți obține o cheie gratuită în câteva secunde de pe [Google AI Studio](https://aistudio.google.com/app/apikey)."
            )
            # Yield stream for onboarding
            for word in info_msg.split(' '):
                yield f"data: {json.dumps({'type': 'chunk', 'content': word + ' '})}\n\n"
            
            # Save assistant message
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                'INSERT INTO messages (id, conversation_id, role, content, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)',
                (str(uuid.uuid4()), conversation_id, 'assistant', info_msg, '{}', datetime.now().isoformat())
            )
            conn.commit()
            conn.close()
            yield f"data: {json.dumps({'type': 'done', 'conversation_id': conversation_id})}\n\n"
            return

        # 6. Build prompt context with Gemini SDK
        model_to_use = model_name or settings.DEFAULT_MODEL
        genai.configure(api_key=api_key)
        
        system_instruction = LLMService.get_system_prompt()
        if relevant_memories:
            memories_text = "\n".join([f"- [{m['category']}] {m['content']}" for m in relevant_memories])
            system_instruction += f"\n\nMEMORII IMPORTANTE DESPRE UTILIZATOR:\n{memories_text}"

        # Format history for Gemini
        chat_contents = []
        for row in raw_history[:-1]:
            role = 'user' if row['role'] == 'user' else 'model'
            chat_contents.append({'role': role, 'parts': [row['content']]})
            
        full_assistant_reply = ""
        try:
            model = genai.GenerativeModel(
                model_name=model_to_use,
                system_instruction=system_instruction
            )
            
            chat = model.start_chat(history=chat_contents)
            response = chat.send_message(message, stream=True)
            
            for chunk in response:
                if chunk.text:
                    full_assistant_reply += chunk.text
                    yield f"data: {json.dumps({'type': 'chunk', 'content': chunk.text})}\n\n"

        except Exception as e:
            err_msg = f"A apărut o eroare la apelarea modelului AI ({model_to_use}): {str(e)}"
            full_assistant_reply = err_msg
            yield f"data: {json.dumps({'type': 'error', 'content': err_msg})}\n\n"

        # 7. Save assistant reply to database
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO messages (id, conversation_id, role, content, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            (str(uuid.uuid4()), conversation_id, 'assistant', full_assistant_reply, '{}', datetime.now().isoformat())
        )
        conn.commit()
        conn.close()

        # 8. Trigger memory extraction in background if applicable
        MemoryService.auto_extract_memories(message, full_assistant_reply)

        yield f"data: {json.dumps({'type': 'done', 'conversation_id': conversation_id})}\n\n"
