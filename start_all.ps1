# AlteraFlux All-in-One Startup Script
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       AlteraFlux - Universal Conversion Engine" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Cyan

$dockerAvailable = Get-Command docker -ErrorAction SilentlyContinue

if ($dockerAvailable) {
    Write-Host "[1/2] Lancement de l'infrastructure via Docker Compose..." -ForegroundColor Green
    docker-compose up -d
    Write-Host "[2/2] Services demarres avec succes !" -ForegroundColor Green
    Write-Host "  -> Frontend Web      : http://localhost:3001" -ForegroundColor Yellow
    Write-Host "  -> Backend API Docs  : http://localhost:8000/docs" -ForegroundColor Yellow
    Write-Host "  -> MinIO S3 Console  : http://localhost:9001" -ForegroundColor Yellow
} else {
    Write-Host "Docker non disponible. Lancement local des serveurs..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot/backend'; ../.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot/frontend'; npm run dev"
    Write-Host "Serveurs locaux lances dans des fenetres dediees !" -ForegroundColor Green
}
