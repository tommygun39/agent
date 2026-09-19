@echo off
chcp 65001 >nul
title Pandele - Asistent Personal Inteligent

echo ===================================================
echo              PANDELE - ASISTENT PERSONAL
echo ===================================================
echo.

:: Detect local IP for mobile access
for /f "tokens=4" %%a in ('route print ^| findstr 0.0.0.0.*0.0.0.0') do set LOCAL_IP=%%a

echo [OK] Pornire server pe PC si retea locala...
echo.
echo -> Acces de pe PC:    http://localhost:8000
if defined LOCAL_IP (
    echo -> Acces de pe Telefon: http://%LOCAL_IP%:8000
    echo    (deschide in Safari/Chrome pe telefon si apasa "Add to Home Screen")
)
echo.
echo Apasa CTRL+C pentru a opri serverul.
echo.

:: Open default browser after 1 second
start "" cmd /c "timeout /t 1 /nobreak >nul & start http://localhost:8000"

:: Start Uvicorn FastAPI server
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload

pause
