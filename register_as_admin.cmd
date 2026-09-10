@echo off
:: Life OS ThinkPad Janitor Task Registration (Elevated Wrapper)
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ================================================================
    echo Requesting Administrator elevation for Scheduled Task registration...
    echo ================================================================
    powershell -NoProfile -Command "Start-Process cmd.exe -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

echo ================================================================
echo Running elevated registration for LifeOS_ThinkPad_Janitor...
echo ================================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0register_janitor_task.ps1"
echo.
echo ================================================================
echo Registration script finished. Check output above.
echo ================================================================
pause
