@echo off
cd /d "%~dp0"

REM Check if Git is installed
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo Git is not installed. Attempting to run install-win.bat again...
    call install-win.bat
    exit /b 1
)

REM Check if the current version is the same as the git version
git fetch
set "localRev="
set "remoteRev="
for /f "tokens=*" %%a in ('git rev-parse HEAD') do set localRev=%%a
for /f "tokens=*" %%a in ('git rev-parse @{u}') do set remoteRev=%%a

echo "%localRev%"
echo "%remoteRev%"

if not "%localRev%"=="%remoteRev%" (
    echo Updating to the latest version...
    git stash
    git pull
    git stash apply
)

call npm install
call node SHPBOT
pause
exit /b 1
