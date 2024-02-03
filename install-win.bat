@echo off

REM Check if the script is running with administrator privileges
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"

REM If the previous command's exit code is not 0, the script is not running as administrator
if %errorlevel% neq 0 (
    echo This script requires administrator privileges. Please run it as an administrator.
    echo Right-click on the batch file and select "Run as Administrator".
    pause
    exit /b 1
)

REM Check if Chocolatey is installed
where choco >nul 2>&1
if %errorlevel% neq 0 (
    echo Chocolatey is not installed. Installing Chocolatey...
    @powershell -NoProfile -ExecutionPolicy Bypass -Command "[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))"
) else (
    echo Chocolatey is already installed.
)

REM Wait for Chocolatey to settle
timeout /t 2 /nobreak >nul

REM Install Node.js if not already installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js is not installed. Installing Node.js...
    start cmd /k choco install nodejs-lts -y
) else (
    echo Node.js is already installed.
)

REM Wait for Node.js installation to settle
timeout /t 2 /nobreak >nul

REM Install Volta if not already installed
where volta >nul 2>&1
if %errorlevel% neq 0 (
    echo Volta is not installed. Installing Volta...
    start cmd /k choco install volta -y
) else (
    echo Volta is already installed.
)

REM Wait for Volta installation to settle
timeout /t 2 /nobreak >nul

REM Install FFmpeg if not already installed
where ffmpeg >nul 2>&1
if %errorlevel% neq 0 (
    echo FFmpeg is not installed. Installing FFmpeg...
    start cmd /k choco install ffmpeg -y
) else (
    echo FFmpeg is already installed.
)

REM Wait for FFmpeg installation to settle
timeout /t 2 /nobreak >nul

REM Get the path of the batch script
set "script_path=%~dp0"

REM Move to the script dir
cd /d "%script_path%"

REM Open a new terminal for subsequent commands
start cmd /k call "%script_path%SHPBOT-win.bat"

REM Prompt user before closing
pause
