from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel
from backend.app.services.reminder_service import ReminderService

router = APIRouter()

class ReminderCreate(BaseModel):
    title: str
    due_date_time: str
    priority: Optional[str] = "normal"
    category: Optional[str] = "general"
    notes: Optional[str] = ""

class ReminderUpdate(BaseModel):
    title: Optional[str] = None
    due_date_time: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None
    notes: Optional[str] = None

@router.get('/reminders')
def get_reminders(filter_type: str = Query('all', enum=['all', 'today', 'upcoming', 'completed'])):
    return ReminderService.list_reminders(filter_type)

@router.get('/reminders/due')
def get_due_reminders():
    return ReminderService.get_due_reminders()

@router.post('/reminders')
def create_reminder(data: ReminderCreate):
    if not data.title.strip():
        raise HTTPException(status_code=400, detail="Titlul reminderului nu poate fi gol")
    return ReminderService.create_reminder(
        title=data.title,
        due_date_time=data.due_date_time,
        priority=data.priority or "normal",
        category=data.category or "general",
        notes=data.notes or ""
    )

@router.post('/reminders/{reminder_id}/toggle')
def toggle_reminder(reminder_id: str):
    res = ReminderService.toggle_reminder(reminder_id)
    if not res:
        raise HTTPException(status_code=404, detail="Reminderul nu a fost găsit")
    return res

@router.post('/reminders/{reminder_id}/snooze')
def snooze_reminder(reminder_id: str, minutes: int = Query(10, ge=1, le=1440)):
    res = ReminderService.snooze_reminder(reminder_id, minutes)
    if not res:
        raise HTTPException(status_code=404, detail="Reminderul nu a fost găsit")
    return res

@router.patch('/reminders/{reminder_id}')
def update_reminder(reminder_id: str, data: ReminderUpdate):
    res = ReminderService.update_reminder(reminder_id, data.dict(exclude_unset=True))
    if not res:
        raise HTTPException(status_code=404, detail="Reminderul nu a fost găsit")
    return res

@router.delete('/reminders/{reminder_id}')
def delete_reminder(reminder_id: str):
    success = ReminderService.delete_reminder(reminder_id)
    if not success:
        raise HTTPException(status_code=404, detail="Reminderul nu a fost găsit")
    return {"success": True, "deleted_id": reminder_id}
