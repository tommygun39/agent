import math
from datetime import datetime
import json
import uuid
from typing import Dict, Any, List
from backend.app.core.database import get_db_connection

class ToolsService:
    @staticmethod
    def get_current_time(timezone: str = 'Europe/Bucharest') -> Dict[str, Any]:
        now = datetime.now()
        days_ro = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică']
        day_name = days_ro[now.weekday()]
        time_str = now.strftime("%d.%m.%Y %H:%M:%S")
        return {
            'timestamp': now.isoformat(),
            'formatted': f'{day_name}, {time_str}',
            'timezone': timezone
        }

    @staticmethod
    def calculate_expression(expression: str) -> Dict[str, Any]:
        """Safely evaluate mathematical expressions"""
        try:
            allowed_names = {
                k: v for k, v in math.__dict__.items() if not k.startswith("__")
            }
            allowed_names.update({"abs": abs, "round": round, "min": min, "max": max})
            clean_expr = expression.replace("^", "**")
            result = eval(clean_expr, {"__builtins__": {}}, allowed_names)
            return {"expression": expression, "result": result, "success": True}
        except Exception as e:
            return {"expression": expression, "error": str(e), "success": False}

    @staticmethod
    def calculate_pawn_commission(principal_lei: float, days: int, daily_rate_percent: float = 0.3) -> Dict[str, Any]:
        """Calculate loan commission and total reimbursement for pawn transactions"""
        effective_days = max(days, 5) # Minimum 5 days
        daily_commission = principal_lei * (daily_rate_percent / 100.0)
        total_commission = max(daily_commission * effective_days, 10.0) # Minimum 10 LEI
        total_due = principal_lei + total_commission
        return {
            'principal_lei': principal_lei,
            'days_requested': days,
            'effective_days': effective_days,
            'daily_rate_percent': daily_rate_percent,
            'total_commission_lei': round(total_commission, 2),
            'total_due_lei': round(total_due, 2),
            'currency': 'RON'
        }

    @staticmethod
    def create_note(title: str, content: str, tags: str = '') -> Dict[str, Any]:
        conn = get_db_connection()
        cursor = conn.cursor()
        note_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        cursor.execute(
            'INSERT INTO notes (id, title, content, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
            (note_id, title, content, tags, now, now)
        )
        conn.commit()
        conn.close()
        return {'id': note_id, 'title': title, 'content': content, 'tags': tags, 'success': True}

    @staticmethod
    def list_notes() -> List[Dict[str, Any]]:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT id, title, content, tags, created_at, updated_at FROM notes ORDER BY updated_at DESC')
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
