@echo off
chcp 65001 >nul 2>&1
title Astra Deploy Tool
powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%~dp0deploy.ps1" %*
if %ERRORLEVEL% neq 0 (
    echo.
    echo  [Exit code: %ERRORLEVEL%] Script exited with errors
)
echo.
pause
