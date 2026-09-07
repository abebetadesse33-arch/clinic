# NiniMed Enterprise - Multi-Container Automated Build & Startup Script
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " NiniMed Enterprise CDSS v3.0 - Container Orchestrator " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Check Docker status
Write-Host "[1/3] Checking Docker Engine availability..." -ForegroundColor Yellow
$null = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Docker Desktop / Docker daemon is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Docker Engine is running." -ForegroundColor Green

# 2. Build and start containers
Write-Host "[2/3] Building images and starting multi-container network (App + PostgreSQL 16 + Redis)..." -ForegroundColor Yellow
docker compose up --build

# 3. Completion
if ($LASTEXITCODE -eq 0) {
    Write-Host "[3/3] NiniMed Enterprise successfully built and running on http://localhost:3000" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Build failed. Please review container logs above." -ForegroundColor Red
}
