from fastapi import APIRouter
from backend.app.models.schema import SettingsUpdate, NoteCreate
from backend.app.core.config import settings
from backend.app.services.tools_service import ToolsService

router = APIRouter()

@router.get('/settings')
def get_settings():
    key = settings.get_gemini_key()
    has_key = bool(key)
    masked_key = ''
    if has_key:
        masked_key = key[:4] + '...' + key[-4:] if len(key) > 8 else '***'
    return {
        'assistant_name': settings.ASSISTANT_NAME,
        'default_model': settings.DEFAULT_MODEL,
        'has_api_key': has_key,
        'masked_api_key': masked_key,
        'timezone': 'Europe/Bucharest',
        'current_ro_time': ToolsService.get_current_time()['formatted'],
        'system_prompt': settings.DEFAULT_SYSTEM_PROMPT,
        'available_models': [
            {'id': 'gemini-flash-latest', 'name': 'Gemini Flash (Stabil, Cotă mare - Recomandat)'},
            {'id': 'gemini-flash-lite-latest', 'name': 'Gemini Flash Lite (Ultra-Rapid)'},
            {'id': 'gemini-3.5-flash', 'name': 'Gemini 3.5 Flash'},
            {'id': 'gemini-3.6-flash', 'name': 'Gemini 3.6 Flash (Preview - Limitat 20 req/zi)'},
        ]
    }

@router.post('/settings')
def update_settings(payload: SettingsUpdate):
    if payload.gemini_api_key is not None:
        settings.update_gemini_key(payload.gemini_api_key)
    if payload.default_model:
        settings.DEFAULT_MODEL = payload.default_model
    if payload.assistant_name:
        settings.ASSISTANT_NAME = payload.assistant_name
    if payload.system_prompt:
        settings.DEFAULT_SYSTEM_PROMPT = payload.system_prompt
    return {'success': True, 'message': 'Setările au fost actualizate.'}

# Tool endpoints
@router.get('/tools/time')
def get_time():
    return ToolsService.get_current_time()

@router.post('/tools/calculate')
def calculate(expression: str):
    return ToolsService.calculate_expression(expression)

@router.post('/tools/pawn-commission')
def calculate_pawn(principal: float, days: int, rate: float = 0.3):
    return ToolsService.calculate_pawn_commission(principal, days, rate)

@router.get('/notes')
def list_notes():
    return ToolsService.list_notes()

@router.post('/notes')
def create_note(data: NoteCreate):
    return ToolsService.create_note(data.title, data.content, data.tags or '')
