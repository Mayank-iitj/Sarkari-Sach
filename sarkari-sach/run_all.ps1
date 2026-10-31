# Sarkari Sach - Full Stack Runner (Backend + Frontend)
$PSScriptRoot = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition
$backendScript = "$PSScriptRoot\run_backend.ps1"
$frontendScript = "$PSScriptRoot\run_frontend.ps1"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Starting Sarkari Sach Full Stack (Backend + Frontend)    " -ForegroundColor Green
Write-Host " API Docs: http://localhost:8000/docs                      " -ForegroundColor Yellow
Write-Host " Web App:  http://localhost:3000                           " -ForegroundColor Yellow
Write-Host " WhatsApp: http://localhost:3000/whatsapp                  " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

Start-Process powershell -ArgumentList "-NoExit", "-File", "`"$backendScript`""
Start-Process powershell -ArgumentList "-NoExit", "-File", "`"$frontendScript`""

Write-Host "`nBoth servers have been launched in separate terminal windows." -ForegroundColor Green
Write-Host "Press Ctrl+C inside their respective windows to stop." -ForegroundColor Gray
