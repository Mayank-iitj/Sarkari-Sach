@echo off
title Sarkari Sach Launcher
echo ==========================================================
echo Starting Sarkari Sach Full Stack (Backend + Frontend)
echo ==========================================================

start "Sarkari Sach - Backend (Port 8000)" cmd /k "cd /d %~dp0backend && set PYTHONIOENCODING=utf-8 && set PYTHONUTF8=1 && py -3.12 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
start "Sarkari Sach - Frontend (Port 3000)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Both servers launched in separate windows!
echo - Web App:             http://localhost:3000
echo - WhatsApp Simulator:  http://localhost:3000/whatsapp
echo - Backend API Docs:    http://localhost:8000/docs
echo ==========================================================

