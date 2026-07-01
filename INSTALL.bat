@echo off
echo ========================================
echo  Barangay Attendance System - INSTALL
echo ========================================
echo.
echo Run each step ONE AT A TIME.
echo.
echo Step 1: Install website dependencies
cd /d "%~dp0"
call npm install
if errorlevel 1 ( echo FAILED: npm install & pause & exit /b 1 )

echo.
echo Step 2: Setup database
call npx prisma db push
if errorlevel 1 ( echo FAILED: prisma db push & pause & exit /b 1 )

echo.
echo Step 3: Create admin account
call node prisma/seed.js

echo.
echo Step 4: Install bridge dependencies
cd zk-bridge
call npm install
if errorlevel 1 ( echo FAILED: bridge npm install & pause & exit /b 1 )
cd ..

echo.
echo ========================================
echo  INSTALL COMPLETE!
echo  Now run START-BRIDGE.bat and START-WEBSITE.bat
echo ========================================
pause
