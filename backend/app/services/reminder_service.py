import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from backend.app.core.database import get_db_connection
from backend.app.core.timezone import now_ro, now_ro_iso, today_ro_str

class ReminderService:
    @staticmethod
    def create_reminder(
        title: str,
        due_date_time: str,
        priority: str = 'normal',
        category: str = 'general',
        notes: str = ''
    ) -> Dict[str, Any]:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        rem_id = str(uuid.uuid4())
        now = now_ro_iso()
        
        # Clean due_date_time
        clean_due = due_date_time.strip()
        
        cursor.execute(
            '''
            INSERT INTO reminders (id, title, due_date_time, priority, category, is_completed, google_event_id, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 0, '', ?, ?, ?)
            ''',
            (rem_id, title, clean_due, priority, category, notes, now, now)
        )
        conn.commit()
        conn.close()
        
        return {
            'id': rem_id,
            'title': title,
            'due_date_time': clean_due,
            'priority': priority,
            'category': category,
            'is_completed': False,
            'notes': notes,
            'created_at': now
        }

    @staticmethod
    def list_reminders(filter_type: str = 'all') -> List[Dict[str, Any]]:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        today_str = today_ro_str()
        
        if filter_type == 'today':
            cursor.execute(
                'SELECT * FROM reminders WHERE due_date_time LIKE ? ORDER BY is_completed ASC, due_date_time ASC',
                (f'{today_str}%',)
            )
        elif filter_type == 'upcoming':
            cursor.execute(
                'SELECT * FROM reminders WHERE is_completed = 0 ORDER BY due_date_time ASC'
            )
        elif filter_type == 'completed':
            cursor.execute(
                'SELECT * FROM reminders WHERE is_completed = 1 ORDER BY updated_at DESC'
            )
        else: # all
            cursor.execute(
                'SELECT * FROM reminders ORDER BY is_completed ASC, due_date_time ASC'
            )
            
        rows = cursor.fetchall()
        conn.close()
        
        results = []
        for r in rows:
            d = dict(r)
            d['is_completed'] = bool(d['is_completed'])
            results.append(d)
        return results

    @staticmethod
    def toggle_reminder(reminder_id: str) -> Optional[Dict[str, Any]]:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT is_completed FROM reminders WHERE id = ?', (reminder_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return None
            
        new_status = 0 if row['is_completed'] else 1
        now = now_ro_iso()
        cursor.execute(
            'UPDATE reminders SET is_completed = ?, updated_at = ? WHERE id = ?',
            (new_status, now, reminder_id)
        )
        conn.commit()
        
        cursor.execute('SELECT * FROM reminders WHERE id = ?', (reminder_id,))
        updated = dict(cursor.fetchone())
        updated['is_completed'] = bool(updated['is_completed'])
        conn.close()
        return updated

    @staticmethod
    def delete_reminder(reminder_id: str) -> bool:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM reminders WHERE id = ?', (reminder_id,))
        conn.commit()
        deleted = cursor.rowcount > 0
        conn.close()
        return deleted

    @staticmethod
    def update_reminder(reminder_id: str, payload: dict) -> Optional[Dict[str, Any]]:
        conn = get_db_connection()
        cursor = conn.cursor()
        updates = []
        params = []
        for k in ['title', 'due_date_time', 'priority', 'category', 'notes']:
            if k in payload:
                updates.append(f'{k} = ?')
                params.append(payload[k])
        if not updates:
            conn.close()
            return None
        now = now_ro_iso()
        updates.append('updated_at = ?')
        params.append(now)
        params.append(reminder_id)
        cursor.execute(f'UPDATE reminders SET {", ".join(updates)} WHERE id = ?', params)
        conn.commit()
        cursor.execute('SELECT * FROM reminders WHERE id = ?', (reminder_id,))
        res = cursor.fetchone()
        conn.close()
        if res:
            d = dict(res)
            d['is_completed'] = bool(d['is_completed'])
            return d
        return None

    @staticmethod
    def get_due_reminders() -> List[Dict[str, Any]]:
        """Găsește toate reminderele nefinalizate a căror scadență a sosit raportat la ora României."""
        conn = get_db_connection()
        cursor = conn.cursor()
        now_str = now_ro_iso()
        cursor.execute(
            'SELECT * FROM reminders WHERE is_completed = 0 AND due_date_time <= ? ORDER BY due_date_time ASC',
            (now_str,)
        )
        rows = cursor.fetchall()
        conn.close()
        results = []
        for r in rows:
            d = dict(r)
            d['is_completed'] = bool(d['is_completed'])
            results.append(d)
        return results

    @staticmethod
    def snooze_reminder(reminder_id: str, minutes: int = 10) -> Optional[Dict[str, Any]]:
        """Amână un reminder cu un anumit număr de minute."""
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT due_date_time FROM reminders WHERE id = ?', (reminder_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return None
        
        now_dt = now_ro()
        new_due_dt = now_dt + timedelta(minutes=minutes)
        new_due_str = new_due_dt.isoformat()
        
        cursor.execute(
            'UPDATE reminders SET due_date_time = ?, updated_at = ? WHERE id = ?',
            (new_due_str, now_ro_iso(), reminder_id)
        )
        conn.commit()
        cursor.execute('SELECT * FROM reminders WHERE id = ?', (reminder_id,))
        res = cursor.fetchone()
        conn.close()
        if res:
            d = dict(res)
            d['is_completed'] = bool(d['is_completed'])
            return d
        return None
