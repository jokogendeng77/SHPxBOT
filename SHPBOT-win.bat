@echo off
cd /d "%~dp0"
call npm install
call node SHPBOT
pause
exit /b 1
