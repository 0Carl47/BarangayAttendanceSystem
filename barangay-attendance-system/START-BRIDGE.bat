@echo off
echo Starting ZKTeco Bridge...
echo Make sure ZKTeco R20i is plugged in via USB!
echo.
cd /d "%~dp0zk-bridge"
node bridge.js
pause
