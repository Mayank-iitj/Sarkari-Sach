# Sarkari Sach - Frontend Server Runner
Set-Location -Path "$PSScriptRoot\frontend"

# Automatically clear any stale process on port 3000
$conn = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($conn) {
    $pids = $conn | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($p in $pids) {
        if ($p -gt 4) {
            Write-Host "Releasing port 3000 (Process ID: $p)..." -ForegroundColor Yellow
            Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
        }
    }
    Start-Sleep -Milliseconds 600
}

Write-Host "Starting Sarkari Sach Frontend on http://localhost:3000 ..." -ForegroundColor Cyan
npm run dev
