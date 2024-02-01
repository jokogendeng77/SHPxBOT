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
IF NOT EXIST "%SystemRoot%\System32\choco.exe" (
    echo "Chocolatey is not installed. Installing Chocolatey..."
    @powershell -NoProfile -ExecutionPolicy Bypass -Command "[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))"
) ELSE (
    echo "Chocolatey is already installed."
)

REM Wait for Chocolatey to settle
timeout /t 2 /nobreak >nul

REM Install Node.js if not already installed
IF NOT EXIST "%ProgramFiles%\nodejs\node.exe" (
    choco install nodejs-lts -y
) ELSE (
    echo "Node.js is already installed."
)

REM Install Volta if not already installed
IF NOT EXIST "%APPDATA%\Volta\volta.exe" (
    choco install volta -y
) ELSE (
    echo "Volta is already installed."
)

REM Install FFmpeg if not already installed
IF NOT EXIST "%ProgramFiles%\ffmpeg\bin\ffmpeg.exe" (
    choco install ffmpeg -y
) ELSE (
    echo "FFmpeg is already installed."
)

REM Navigate to the script's directory
cd /d "%~dp0"

REM Run npm install and wait for it to finish
call npm install

REM Run Node.js script
node SHPBOT

REM Prompt user before closing
pause
