@echo off
chcp 65001 >nul 2>&1
cd /d "%~dp0"
echo Checking database for admin/admin123...
call mvn -q compile exec:java "-Dexec.mainClass=com.countinghelper.tools.EnsureAdminUser"
echo.
pause
