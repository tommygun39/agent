from fastapi import APIRouter
from backend.app.models.schema import SettingsUpdate, NoteCreate
from backend.app.core.config import settings
from backend.app.services.tools_service import ToolsService

router = APIRouter()

@router.get('/settings')
def get_settings():
    has_key = bool(settings.GEMINI_API_KEY)
    masked_key = ''
    if has_key:
        masked_key = settings.GEMINI_API_KEY[:4] + '...' + settings.GEMINI_API_KEY[-4:] if len(settings.GEMINI_API_KEY) > 8 else '***'
    return {
        'assistant_name': settings.ASSISTANT_NAME,
        'default_model': settings.DEFAULT_MODEL,
        'has_api_key': has_key,
        'masked_api_key': masked_key,
        'system_prompt': settings.DEFAULT_SYSTEM_PROMPT,
        'available_models': [
            {'id': 'gemini-2.0-flash', 'name': 'Gemini 2.0 Flash (Recomandat, Rapid)'},
            {'id': 'gemini-1.5-pro', 'name': 'Gemini 1.5 Pro (Raționament Avansat)'},
            {'id': 'gemini-1.5-flash', 'name': 'Gemini 1.5 Flash (Economic)'}
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
