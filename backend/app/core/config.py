import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
ENV_PATH = BASE_DIR / '.env'

if ENV_PATH.exists():
    load_dotenv(dotenv_path=ENV_PATH)
else:
    load_dotenv()

class Settings:
    PROJECT_NAME: str = 'Pandele'
    VERSION: str = '1.2.0'
    BASE_DIR: Path = BASE_DIR
    DATA_DIR: Path = BASE_DIR / 'data'
    
    # AI Model Settings
    GEMINI_API_KEY: str = os.getenv('GEMINI_API_KEY', '')
    DEFAULT_MODEL: str = os.getenv('DEFAULT_MODEL', 'gemini-2.0-flash')
    
    # Database
    DATABASE_URL: str = os.getenv('DATABASE_URL', f'sqlite:///{DATA_DIR}/agent.db')
    
    # Assistant Default Identity
    ASSISTANT_NAME: str = os.getenv('ASSISTANT_NAME', 'Pandele')
    ASSISTANT_LANGUAGE: str = os.getenv('ASSISTANT_LANGUAGE', 'ro')
    DEFAULT_SYSTEM_PROMPT: str = (
        'Ești Pandele, asistentul personal inteligent, devotat și de încredere al utilizatorului. '
        'Răspunzi întotdeauna cu mândrie și promptitudine la numele de Pandele. Comunici natural, '
        'cald, eficient și structurat în limba română. Reții preferințele utilizatorului, '
        'gestionezi reminderele și sarcinile, ajuți la calcule (inclusiv contracte/comisioane amanet), '
        'organizare și rezolvarea sarcinilor de zi cu zi. Când ești strigat Pandele, '
        'confirmi cu entuziasm și prezență de spirit că ești aici la dispoziție.'
    )
    
    HOST: str = os.getenv('HOST', '0.0.0.0')
    PORT: int = int(os.getenv('PORT', '8000'))

    def update_gemini_key(self, new_key: str):
        self.GEMINI_API_KEY = new_key.strip()
        # Optionally write back to .env
        try:
            lines = []
            if ENV_PATH.exists():
                with open(ENV_PATH, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
            
            key_found = False
            new_lines = []
            for line in lines:
                if line.startswith('GEMINI_API_KEY='):
                    new_lines.append(f'GEMINI_API_KEY={new_key}\n')
                    key_found = True
                else:
                    new_lines.append(line)
            if not key_found:
                new_lines.append(f'GEMINI_API_KEY={new_key}\n')
            
            with open(ENV_PATH, 'w', encoding='utf-8') as f:
                f.writelines(new_lines)
        except Exception as e:
            print(f'Error updating .env: {e}')

settings = Settings()
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
