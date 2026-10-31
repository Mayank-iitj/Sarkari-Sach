# Sarkari Sach - Backend Server Runner
$env:PYTHONIOENCODING="utf-8"
$env:PYTHONUTF8="1"
Set-Location -Path "$PSScriptRoot\backend"

# Automatically clear any stale process on port 8000
$conn = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if ($conn) {
    $pids = $conn | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($p in $pids) {
        if ($p -gt 4) {
            Write-Host "Releasing port 8000 (Process ID: $p)..." -ForegroundColor Yellow
            Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
        }
    }
    Start-Sleep -Milliseconds 600
}

Write-Host "Starting Sarkari Sach Backend on http://localhost:8000 ..." -ForegroundColor Cyan
py -3.12 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
