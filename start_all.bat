@echo off
title AlteraFlux Launcher
echo ========================================================
echo        AlteraFlux - Universal Conversion Engine
echo ========================================================
echo.

echo [1] Verifier ou lancer l'infrastructure complete avec Docker Compose...
docker-compose --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Docker detecte ! Lancement des conteneurs (FastAPI, Redis, Postgres, MinIO, Celery, Next.js)...
    docker-compose up -d
    echo.
    echo Tous les services sont demarres !
    echo - Frontend Next.js : http://localhost:3000
    echo - Backend API Docs : http://localhost:8000/docs
    echo - MinIO Console    : http://localhost:9001
    goto END
)

echo Docker non detecte ou non lance. Demarrage des serveurs locaux...

echo Demarrage du Backend FastAPI (port 8000)...
start "AlteraFlux Backend" cmd /k "cd /d %~dp0backend && ..\.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000"

echo Demarrage du Frontend Next.js (port 3000)...
start "AlteraFlux Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

:END
echo.
echo ========================================================
echo   AlteraFlux est pret !
echo ========================================================
pause
