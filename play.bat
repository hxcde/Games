@echo off
REM SUNSET BLOCK - lokal starten (mit Auto-Update von GitHub)
cd /d "%~dp0"
where py >nul 2>nul && (py launcher.py %*) || (python launcher.py %*)
pause
