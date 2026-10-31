# Sarkari Sach - Evaluation Runner
$env:PYTHONIOENCODING="utf-8"
Set-Location -Path "$PSScriptRoot"
Write-Host "Running Benchmark Evaluation over 24 Gold Cases..." -ForegroundColor Cyan
py -3.12 -m eval.run
Write-Host "Scoring Evaluation Report..." -ForegroundColor Cyan
py -3.12 -m eval.score --report

