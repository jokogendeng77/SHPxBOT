@echo off

REM Function to handle errors
:handleError
echo %1
pause
exit /b

REM Check if Node.js is installed
SET NODE_PATH=
FOR /F "delims=" %%i IN ('where node 2^>nul') DO SET NODE_PATH=%%i

IF NOT DEFINED NODE_PATH (
    echo Node.js not found. Installing fnm Fast Node Manager...
    winget install Schniz.fnm
    IF ERRORLEVEL 1 (
        call :handleError "Error installing fnm. Please check your installation."
    )

    REM Configure fnm environment
    call fnm env --use-on-cd
    IF ERRORLEVEL 1 (
        call :handleError "Error configuring fnm environment. Please check your installation."
    )

    REM Download and install the latest Node.js version
    fnm use --install-if-missing 20
    IF ERRORLEVEL 1 (
        call :handleError "Error installing Node.js. Please check your installation."
    )
) ELSE (
    echo Node.js is already installed.
)

REM Check if ffmpeg is installed
SET FFMPEG_PATH=
FOR /F "delims=" %%i IN ('where ffmpeg 2^>nul') DO SET FFMPEG_PATH=%%i

IF NOT DEFINED FFMPEG_PATH (
    echo ffmpeg not found. Installing ffmpeg...
    winget install --id=Gyan.FFmpeg -e
    IF ERRORLEVEL 1 (
        call :handleError "Error installing ffmpeg. Please check your installation."
    )
) ELSE (
    echo ffmpeg is already installed.
)

REM Check if node_modules exists
IF EXIST "node_modules" (
    echo Running the application...
    call node SHPBOT.js
    IF ERRORLEVEL 1 (
        echo Application closed unexpectedly. Installing dependencies...
        npm install --no-interactive
        IF ERRORLEVEL 1 (
            call :handleError "Error installing dependencies. Please check your setup."
        )
        call node SHPBOT.js
    )
) ELSE (
    echo Installing dependencies...
    npm install --no-interactive
    IF ERRORLEVEL 1 (
        call :handleError "Error installing dependencies. Please check your setup."
    )
    call node SHPBOT.js
)

REM Keep the command prompt open after running Node.js
pause