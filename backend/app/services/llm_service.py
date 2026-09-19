import json
import uuid
from datetime import datetime
from typing import AsyncGenerator, List, Dict, Any, Optional
import google.generativeai as genai
from backend.app.core.config import settings
from backend.app.core.database import get_db_connection
from backend.app.services.memory_service import MemoryService
from backend.app.services.tools_service import ToolsService
from backend.app.services.reminder_service import ReminderService

# Defined Tools for Gemini Function Calling
def tool_create_reminder(title: str, due_date_time: str, priority: str = "normal", category: str = "general") -> str:
    """Creează un nou reminder sau o sarcină programată la o anumită dată și oră.
    Args:
        title: Titlul reminderului (ex: 'Sună la bancă').
        due_date_time: Data și ora în format ISO 8601 (ex: '2026-09-20T10:00:00') calculată relativ la data curentă.
        priority: Prioritatea ('low', 'normal', 'high').
        category: Categoria ('business', 'personal', 'call', 'payment', 'general').
    """
    res = ReminderService.create_reminder(title=title, due_date_time=due_date_time, priority=priority, category=category)
    return json.dumps({"status": "created", "reminder": res})

def tool_list_reminders(filter_type: str = "all") -> str:
    """Afișează lista de remindere și sarcini programate ale utilizatorului.
    Args:
        filter_type: 'today' pentru reminderele de azi, 'upcoming' pentru cele viitoare, 'completed' pentru cele finalizate, 'all' pentru toate.
    """
    items = ReminderService.list_reminders(filter_type)
    return json.dumps({"status": "success", "count": len(items), "reminders": items})

def tool_calculate_pawn(principal_lei: float, days: int, daily_rate_percent: float = 0.3) -> str:
    """Calculează comisionul și suma totală de rambursat pentru un contract de amanet.
    Args:
        principal_lei: Suma împrumutată în LEI.
        days: Numărul de zile.
        daily_rate_percent: Procent comision pe zi (implicit 0.3%).
    """
    res = ToolsService.calculate_pawn_commission(principal_lei, days, daily_rate_percent)
    return json.dumps(res)

AVAILABLE_TOOLS = [tool_create_reminder, tool_list_reminders, tool_calculate_pawn]

class LLMService:
    @staticmethod
    def get_system_prompt(custom_instructions: Optional[str] = None) -> str:
        current_time = ToolsService.get_current_time()['formatted']
        iso_now = datetime.now().isoformat()
        base = settings.DEFAULT_SYSTEM_PROMPT
        if custom_instructions:
            base += f"\n\nInstrucțiuni personalizate permanente:\n{custom_instructions}"
        base += (
            f"\n\nContext Temporal & Spațial:\n"
            f"- Data și ora curentă: {current_time} (București, România).\n"
            f"- Timestamp ISO curent: {iso_now}.\n"
            f"- Când utilizatorul menționează termene relative (ex: 'mâine', 'luni', 'peste 2 ore', 'la ora 15'), "
            f"calculează data și ora exactă raportat la data și ora curentă de mai sus și apelează unealta corespunzătoare."
        )
        return base

    @staticmethod
    async def stream_chat(
        message: str,
        conversation_id: Optional[str] = None,
        model_name: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        now = datetime.now().isoformat()
        if not conversation_id:
            conversation_id = str(uuid.uuid4())
            title = message.strip().split('\n')[0][:40] or 'Conversație nouă'
            cursor.execute(
                'INSERT INTO conversations (id, title, is_pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
                (conversation_id, title, 0, now, now)
            )
        else:
            cursor.execute('UPDATE conversations SET updated_at = ? WHERE id = ?', (now, conversation_id))
            
        user_msg_id = str(uuid.uuid4())
        cursor.execute(
            'INSERT INTO messages (id, conversation_id, role, content, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            (user_msg_id, conversation_id, 'user', message, '{}', now)
        )
        conn.commit()

        relevant_memories = MemoryService.get_relevant_memories(message, top_k=4)
        
        # Check for any upcoming reminders for today
        today_reminders = ReminderService.list_reminders('today')

        yield f"data: {json.dumps({'type': 'init', 'conversation_id': conversation_id, 'memories': relevant_memories, 'today_reminders_count': len(today_reminders)})}\n\n"

        cursor.execute(
            'SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
            (conversation_id,)
        )
        raw_history = cursor.fetchall()
        conn.close()

        api_key = settings.GEMINI_API_KEY
        if not api_key:
            info_msg = (
                "Salut! 👋 Sunt **Pandele**, asistentul tău personal.\n\n"
                "Pentru a putea purta conversații inteligente, a crea remindere și a folosi uneltele, "
                "te rog să adaugi cheia ta **Google Gemini API** în panoul de **Setări (⚙️)** din colțul ecranului "
                "sau în fișierul `.env`.\n\n"
                "Poți obține o cheie gratuită în câteva secunde de pe [Google AI Studio](https://aistudio.google.com/app/apikey)."
            )
            for word in info_msg.split(' '):
                yield f"data: {json.dumps({'type': 'chunk', 'content': word + ' '})}\n\n"
            
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

        model_to_use = model_name or settings.DEFAULT_MODEL
        genai.configure(api_key=api_key)
        
        system_instruction = LLMService.get_system_prompt()
        if relevant_memories:
            memories_text = "\n".join([f"- [{m['category']}] {m['content']}" for m in relevant_memories])
            system_instruction += f"\n\nMEMORII IMPORTANTE DESPRE UTILIZATOR:\n{memories_text}"

        chat_contents = []
        for row in raw_history[:-1]:
            role = 'user' if row['role'] == 'user' else 'model'
            chat_contents.append({'role': role, 'parts': [row['content']]})
            
        full_assistant_reply = ""
        try:
            model = genai.GenerativeModel(
                model_name=model_to_use,
                system_instruction=system_instruction,
                tools=AVAILABLE_TOOLS
            )
            
            chat = model.start_chat(history=chat_contents, enable_automatic_function_calling=True)
            response = chat.send_message(message, stream=True)
            
            for chunk in response:
                if chunk.text:
                    full_assistant_reply += chunk.text
                    yield f"data: {json.dumps({'type': 'chunk', 'content': chunk.text})}\n\n"

        except Exception as e:
            err_msg = f"A apărut o eroare la apelarea modelului AI ({model_to_use}): {str(e)}"
            full_assistant_reply = err_msg
            yield f"data: {json.dumps({'type': 'error', 'content': err_msg})}\n\n"

        # Save assistant reply to database
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO messages (id, conversation_id, role, content, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            (str(uuid.uuid4()), conversation_id, 'assistant', full_assistant_reply, '{}', datetime.now().isoformat())
        )
        conn.commit()
        conn.close()

        MemoryService.auto_extract_memories(message, full_assistant_reply)

        yield f"data: {json.dumps({'type': 'done', 'conversation_id': conversation_id})}\n\n"
