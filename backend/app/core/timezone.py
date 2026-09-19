from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any

try:
    from zoneinfo import ZoneInfo
    RO_TZ = ZoneInfo("Europe/Bucharest")
except Exception:
    RO_TZ = timezone(timedelta(hours=3))

RO_DAYS = ["Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă", "Duminică"]
RO_MONTHS = [
    "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
    "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"
]

def now_ro() -> datetime:
    """Returneaza data si ora curenta exacta pe fusul orar al Romaniei (Europe/Bucharest)."""
    return datetime.now(RO_TZ)

def now_ro_iso() -> str:
    """Returneaza timestamp-ul curent in format ISO 8601 cu fusul orar al Romaniei."""
    return now_ro().isoformat()

def today_ro_str() -> str:
    """Returneaza data curenta a Romaniei in format YYYY-MM-DD."""
    return now_ro().strftime("%Y-%m-%d")

def format_ro_full(dt: Optional[datetime] = None) -> str:
    """Formateaza data si ora in limba romana."""
    if dt is None:
        dt = now_ro()
    elif dt.tzinfo is None:
        dt = dt.replace(tzinfo=RO_TZ)
    
    day_name = RO_DAYS[dt.weekday()]
    month_name = RO_MONTHS[dt.month - 1]
    return f"{day_name}, {dt.day} {month_name} {dt.year}, {dt.strftime('%H:%M:%S')} (Ora României)"

def get_time_context() -> Dict[str, Any]:
    """Returneaza un dictionar complet cu contextul temporal al Romaniei pentru unelte si LLM."""
    current = now_ro()
    return {
        "timestamp": current.isoformat(),
        "date": current.strftime("%Y-%m-%d"),
        "time": current.strftime("%H:%M:%S"),
        "formatted": format_ro_full(current),
        "timezone": "Europe/Bucharest",
        "day_of_week": RO_DAYS[current.weekday()],
        "day": current.day,
        "month": current.month,
        "year": current.year
    }
