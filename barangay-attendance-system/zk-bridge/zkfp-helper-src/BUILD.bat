@echo off
REM BUILD.bat — Compile zkfp-helper.exe v5.0
REM Run this ONCE after extracting v9. Requires .NET 6 SDK.
REM Download: https://dotnet.microsoft.com/download/dotnet/6.0
REM Output: ..\zkfp-helper.exe

echo.
echo ============================================
echo  Building zkfp-helper.exe v5.0 (x64, .NET 6)
echo ============================================
echo.

dotnet publish zkfp-helper.csproj ^
  -c Release ^
  -r win-x64 ^
  --self-contained true ^
  -p:PublishSingleFile=true ^
  -p:EnableCompressionInSingleFile=true ^
  -o ..\

if %ERRORLEVEL% == 0 (
    echo.
    echo [OK] Build succeeded — zkfp-helper.exe is in the zk-bridge folder.
    echo      You can now run START-BRIDGE.bat
) else (
    echo.
    echo [FAIL] Build failed. Ensure .NET 6 SDK is installed:
    echo        https://dotnet.microsoft.com/download/dotnet/6.0
)
pause
