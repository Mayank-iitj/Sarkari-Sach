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

# Pre-clear ports 8000 and 3000 to prevent EADDRINUSE
$ports = @(3000, 8000)
foreach ($p in $ports) {
    $conn = Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue
    if ($conn) {
        $pids = $conn | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($procId in $pids) {
            if ($procId -gt 4) {
                Write-Host "Clearing lingering process $procId on port $p..." -ForegroundColor Yellow
                Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            }
        }
    }
}
Start-Sleep -Milliseconds 600

Start-Process powershell -ArgumentList "-NoExit", "-File", "`"$backendScript`""
Start-Process powershell -ArgumentList "-NoExit", "-File", "`"$frontendScript`""

Write-Host "`nBoth servers have been launched in separate terminal windows." -ForegroundColor Green
Write-Host "Press Ctrl+C inside their respective windows to stop." -ForegroundColor Gray
