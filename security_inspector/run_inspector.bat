@echo off
setlocal enabledelayedexpansion

TITLE Local Security Inspector Launcher

echo ===================================================
echo   Local Security Inspector - Initialization
echo ===================================================

:: Check for Python installation
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in your PATH.
    echo Please install Python 3.10 or higher from python.org
    pause
    exit /b
)

echo [1/3] Checking dependencies...
pip install -r requirements.txt --quiet
if %errorlevel% neq 0 (
    echo [WARNING] Some dependencies failed to install automatically.
    echo Attempting manual installation of core packages...
    pip install PyQt6 psutil requests pywin32 fpdf2 python-dotenv --quiet
)

echo [2/3] Checking .env configuration...
if not exist .env (
    echo [WARNING] .env file not found. VirusTotal API features will be disabled.
    echo To enable, create a .env file with: VIRUSTOTAL_API_KEY=your_key
)

echo [3/3] Launching Local Security Inspector...
echo ---------------------------------------------------
python main.py

if %errorlevel% neq 0 (
    echo.
    echo [CRITICAL] Application crashed or failed to start.
    echo Check the error message above for details.
    pause
)

endlocal
