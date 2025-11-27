@echo off
echo ==========================================
echo 🔍 Debug Versions Issue
echo ==========================================

echo.
echo 🔧 Starting Backend Server (Port 3001)...
cd web-main\backend
start cmd /c "npm start"
cd ..\..\

echo.
echo 🌐 Starting HTTP Server (Port 8000)...
start cmd /c "python -m http.server 8000"

echo.
echo ⏳ Waiting for servers to start...
timeout /t 5 /nobreak >nul

echo.
echo 🔍 Opening Debug Page...
start "" "http://localhost:8000/web-main/debug-versions.html"

echo.
echo ✅ Debug environment ready!
echo.
echo 📋 Available Pages:
echo   🔍  Debug Versions: http://localhost:8000/web-main/debug-versions.html
echo   🏠  Main Application: http://localhost:8000/web-main/index.html
echo   🏥  Backend Health: http://localhost:3001/health
echo.
echo 🎯 Backend running on port 3001
echo 🌐 HTTP Server running on port 8000
echo.
echo ==========================================
echo 🚀 Instructions:
echo ==========================================
echo.
echo 1. Wait for all servers to start
echo 2. The debug page will open automatically
echo 3. Click "Test Backend Connection" first
echo 4. Then click "Test Team Versions Endpoint"
echo 5. If no versions show, click "Create Test Version"
echo 6. Test the main application at index.html
echo.
echo Press any key to continue...
pause >nul 
echo ==========================================
echo 🔍 Debug Versions Issue
echo ==========================================

echo.
echo 🔧 Starting Backend Server (Port 3001)...
cd web-main\backend
start cmd /c "npm start"
cd ..\..\

echo.
echo 🌐 Starting HTTP Server (Port 8000)...
start cmd /c "python -m http.server 8000"

echo.
echo ⏳ Waiting for servers to start...
timeout /t 5 /nobreak >nul

echo.
echo 🔍 Opening Debug Page...
start "" "http://localhost:8000/web-main/debug-versions.html"

echo.
echo ✅ Debug environment ready!
echo.
echo 📋 Available Pages:
echo   🔍  Debug Versions: http://localhost:8000/web-main/debug-versions.html
echo   🏠  Main Application: http://localhost:8000/web-main/index.html
echo   🏥  Backend Health: http://localhost:3001/health
echo.
echo 🎯 Backend running on port 3001
echo 🌐 HTTP Server running on port 8000
echo.
echo ==========================================
echo 🚀 Instructions:
echo ==========================================
echo.
echo 1. Wait for all servers to start
echo 2. The debug page will open automatically
echo 3. Click "Test Backend Connection" first
echo 4. Then click "Test Team Versions Endpoint"
echo 5. If no versions show, click "Create Test Version"
echo 6. Test the main application at index.html
echo.
echo Press any key to continue...
pause >nul 
 
 
 
 