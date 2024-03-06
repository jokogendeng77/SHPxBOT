@echo off
cd /d "%~dp0"

call npm install
call node SHPBOT.js addon
pause
exit /b 1