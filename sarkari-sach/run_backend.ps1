# Sarkari Sach - Backend Server Runner
$env:PYTHONIOENCODING="utf-8"
Set-Location -Path "$PSScriptRoot\backend"
Write-Host "Starting Sarkari Sach Backend on http://localhost:8000 ..." -ForegroundColor Cyan
py -3.12 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

