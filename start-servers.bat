@echo off
echo ========================================
echo    THE BRIDGE - BACKEND SERVERS
echo ========================================
echo.

echo Checking if ports are available...
netstat -an | findstr :3001 >nul
if %errorlevel% equ 0 (
    echo ❌ Port 3001 is already in use!
    echo Stopping existing process...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do taskkill //PID %%a //F >nul 2>&1
    timeout /t 2 >nul
)

netstat -an | findstr :3005 >nul
if %errorlevel% equ 0 (
    echo ❌ Port 3005 is already in use!
    echo Stopping existing process...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3005') do taskkill //PID %%a //F >nul 2>&1
    timeout /t 2 >nul
)

echo.
echo Starting servers...
echo.

echo 🚀 Starting Main Server (Port 3001)...
start "Main Server" cmd /k "cd backend && node server.js"

echo 🚀 Starting CSV Server (Port 3005)...
start "CSV Server" cmd /k "cd backend && node simple-csv-server.js"

echo.
echo ⏳ Waiting for servers to start...
timeout /t 3 >nul

echo.
echo ========================================
echo           SERVER STATUS
echo ========================================
echo.

echo Checking Main Server (Port 3001)...
netstat -an | findstr :3001 >nul
if %errorlevel% equ 0 (
    echo ✅ Main Server is running on port 3001
) else (
    echo ❌ Main Server is not running
)

echo.
echo Checking CSV Server (Port 3005)...
netstat -an | findstr :3005 >nul
if %errorlevel% equ 0 (
    echo ✅ CSV Server is running on port 3005
) else (
    echo ❌ CSV Server is not running
)

echo.
echo ========================================
echo           TEST ENDPOINTS
echo ========================================
echo.

echo Testing Main Server health...
curl -s "http://localhost:3001/health" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Main Server health check: OK
) else (
    echo ❌ Main Server health check: FAILED
)

echo.
echo Testing CSV Server health...
curl -s "http://localhost:3005/health" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ CSV Server health check: OK
) else (
    echo ❌ CSV Server health check: FAILED
)

echo.
echo ========================================
echo           READY TO USE!
echo ========================================
echo.
echo 🌐 Main Server: http://localhost:3001
echo 📊 CSV Server:  http://localhost:3005
echo.
echo 📋 Available endpoints:
echo    GET  /health                    (both servers)
echo    POST /api/config/test           (main server)
echo    GET  /api/csv/last-upload       (csv server)
echo.
echo 💡 Keep the server windows open while using the application
echo 💡 Close this window when done
echo.
pause 