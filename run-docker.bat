@echo off
title NiniMed Enterprise - Docker Orchestration
echo ==========================================================
echo  NiniMed Enterprise CDSS v3.0 - Container Orchestrator
echo ==========================================================
echo.
echo [1/2] Checking Docker daemon...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker Desktop is not running. Please start Docker Desktop and try again.
    pause
    exit /b 1
)

echo [2/2] Running: docker compose up --build...
docker compose up --build

if %errorlevel% equ 0 (
    echo.
    echo [SUCCESS] Containers running on http://localhost:3000
) else (
    echo.
    echo [ERROR] Docker build or startup encountered an issue.
)
pause
