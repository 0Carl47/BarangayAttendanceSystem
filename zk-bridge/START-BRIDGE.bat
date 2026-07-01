@echo off
title Barangay System - FINGERPRINT BRIDGE
color 0D
echo.
echo ============================================
echo   ZKTeco R20i Fingerprint Bridge
echo ============================================
echo.
echo Make sure ZKTeco R20i is plugged in via USB!
echo.
echo Bridge will start on:
echo   WebSocket:  ws://localhost:8888
echo   HTTP:       http://localhost:8889
echo.
node bridge.js
pause
