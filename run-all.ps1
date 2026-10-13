# ========================================================
# Smart Study Portal — Unified Startup Script (PowerShell)
# ========================================================

Write-Host ">>> Starting Smart Study Portal Services..." -ForegroundColor Cyan

# 1. MySQL Server
$mysqlPortCheck = Get-NetTCPConnection -LocalPort 3306 -State Listen -ErrorAction SilentlyContinue
if (-not $mysqlPortCheck) {
    Write-Host "[1/4] Starting MySQL Server (Port 3306)..." -ForegroundColor Yellow
    $mysqldPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe"
    $dataDir = "$PSScriptRoot\mysql-local\data"
    Start-Process -FilePath $mysqldPath -ArgumentList "--datadir=`"$dataDir`"", "--port=3306", "--console" -WindowStyle Minimized
    Start-Sleep -Seconds 3
} else {
    Write-Host "[1/4] MySQL is already running on port 3306." -ForegroundColor Green
}

# 2. ML Engine (FastAPI)
$mlPortCheck = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if (-not $mlPortCheck) {
    Write-Host "[2/4] Starting ML Engine (Port 8000)..." -ForegroundColor Yellow
    $pythonExe = "$PSScriptRoot\ml\.venv\Scripts\python.exe"
    Start-Process -FilePath $pythonExe -ArgumentList "-m", "uvicorn", "app.main:app", "--port", "8000" -WorkingDirectory "$PSScriptRoot\ml" -WindowStyle Minimized
    Start-Sleep -Seconds 2
} else {
    Write-Host "[2/4] ML Engine is already running on port 8000." -ForegroundColor Green
}

# 3. Backend API (Spring Boot)
$backendPortCheck = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue
if (-not $backendPortCheck) {
    Write-Host "[3/4] Starting Spring Boot Backend (Port 8080)..." -ForegroundColor Yellow
    Start-Process -FilePath "mvn.cmd" -ArgumentList "spring-boot:run", "`-Dspring-boot.run.arguments=--spring.datasource.password=dev-password-change-me" -WorkingDirectory "$PSScriptRoot\backend" -WindowStyle Minimized
    Write-Host "      Waiting for Spring Boot to initialize..." -ForegroundColor DarkGray
    Start-Sleep -Seconds 8
} else {
    Write-Host "[3/4] Backend API is already running on port 8080." -ForegroundColor Green
}

# 4. Frontend (Next.js)
$frontendPortCheck = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if (-not $frontendPortCheck) {
    Write-Host "[4/4] Starting Next.js Frontend (Port 3000)..." -ForegroundColor Yellow
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm run dev" -WorkingDirectory "$PSScriptRoot\frontend" -WindowStyle Minimized
    Start-Sleep -Seconds 3
} else {
    Write-Host "[4/4] Frontend is already running on port 3000." -ForegroundColor Green
}

Write-Host "`n>>> All services initiated!" -ForegroundColor Cyan
Write-Host "    - Web App:   http://localhost:3000" -ForegroundColor White
Write-Host "    - REST API:  http://localhost:8080/api/v1" -ForegroundColor White
Write-Host "    - ML Engine: http://localhost:8000/ml/v1/health" -ForegroundColor White
Write-Host "    - Database:  localhost:3306 (smart_study)" -ForegroundColor White
