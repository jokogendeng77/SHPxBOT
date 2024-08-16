@echo off

REM Cek apakah Node.js terinstal
where node > nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo Node.js not found.
    pause
    exit /b
)

REM Instal Chrome browser untuk Puppeteer
npx puppeteer browsers install chrome


echo Dependencies updated successfully.
echo.
echo SUKSES UPDATE SHPXBOT!
echo.
pause
exit /b
