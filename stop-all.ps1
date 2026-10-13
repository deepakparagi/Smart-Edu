# ========================================================
# Smart Study Portal — Shutdown Script (PowerShell)
# ========================================================

Write-Host ">>> Stopping Smart Study Portal Services..." -ForegroundColor Yellow

# Kill mysqld, python, java, node processes started for this project if desired
Get-Process -Name mysqld, uvicorn -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "Services stopped." -ForegroundColor Green
