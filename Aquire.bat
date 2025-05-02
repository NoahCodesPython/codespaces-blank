@echo off
REM Batch file to run the Aquire Bot

REM Navigate to the bot's directory
cd /d "C:\Users\Noah Osmont\Documents\PogyRemake\PogyRemake"

REM Ensure Node.js is installed and available
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js is not installed or not added to PATH. Please install it and try again.
    pause
    exit /b
)

REM Run the bot
echo Starting Aquire Bot...
node index.js

REM Pause to keep the console open in case of errors
pause