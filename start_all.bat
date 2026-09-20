@echo off
setlocal enabledelayedexpansion
title AlteraFlux Launcher

echo ========================================================
echo        AlteraFlux - Universal Conversion Engine
echo ========================================================
echo.

where docker >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] Docker detecte. Tentative de lancement via Docker Compose...
    docker-compose up -d
    if !errorlevel! equ 0 (
        echo.
        echo Tous les services sont demarres via Docker :
        echo   - Frontend Web   : http://localhost:3001
        echo   - Backend API    : http://localhost:8000/docs
        echo   - MinIO Console  : http://localhost:9001
        goto READY
    )
)

echo [INFO] Demarrage direct des serveurs locaux...
set "PATH=%PATH%;C:\Program Files\LibreOffice\program;%LOCALAPPDATA%\Microsoft\WinGet\Links;%LOCALAPPDATA%\Pandoc"

echo Demarrage du Backend FastAPI sur le port 8000...
start "AlteraFlux Backend" cmd /k "cd /d "%~dp0backend" && ..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000 --host 0.0.0.0"

echo Demarrage du Frontend Next.js sur le port 3001...
start "AlteraFlux Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

:READY
echo.
echo ========================================================
echo   AlteraFlux est pret !
echo   Frontend : http://localhost:3001
echo   Backend  : http://localhost:8000
echo ========================================================
pause
