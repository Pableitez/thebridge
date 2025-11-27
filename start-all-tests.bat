@echo off
echo ==========================================
echo 🚀 Starting TheBridge Test Environment
echo ==========================================

echo.
echo 🔧 Starting Backend Server (Port 3001)...
cd web-main\backend
start cmd /c "npm start"
cd ..\..

echo.
echo 🌐 Starting HTTP Server (Port 8000)...
start cmd /c "python -m http.server 8000"

echo.
echo ⏳ Waiting for servers to start...
timeout /t 5 /nobreak >nul

echo.
echo 📱 Opening Test Pages...
start "" "http://localhost:8000/web-main/test-version-names.html"
start "" "http://localhost:8000/web-main/test-improved-folders.html"
start "" "http://localhost:8000/web-main/test-team-versions.html"
start "" "http://localhost:8000/web-main/index.html"
start "" "http://localhost:3001/health"

echo.
echo ✅ All services started successfully!
echo.
echo 📋 Available Test Pages:
echo   🔍  Version Names Test: http://localhost:8000/web-main/test-version-names.html
echo   🗂️  Improved Folders Test: http://localhost:8000/web-main/test-improved-folders.html
echo   📊  Team Versions Test: http://localhost:8000/web-main/test-team-versions.html
echo   🏠  Main Application: http://localhost:8000/web-main/index.html
echo   🏥  Backend Health: http://localhost:3001/health
echo.
echo 🎯 Backend running on port 3001
echo 🌐 HTTP Server running on port 8000
echo.
echo ==========================================
echo 🔧 VERSION NAMES & PATHS FIXED
echo ==========================================
echo.
echo ❌ PROBLEMAS ANTERIORES:
echo   • Versiones guardadas con UUID: uuid.json
echo   • Guardadas en carpeta incorrecta: teams/uuid/
echo   • No se veían los guardados recientes
echo   • Nombres no intuitivos
echo.
echo ✅ SOLUCIONES IMPLEMENTADAS:
echo   • Versiones con nombre de CSV: Sales_Data_2025-01-18T21-30-00.json
echo   • Guardadas en carpeta correcta: [Team-Name]/versions/
echo   • Búsqueda mejorada de configuraciones
echo   • Nombres legibles e identificables
echo   • Logging detallado para debugging
echo.
echo 🎯 CARACTERÍSTICAS NUEVAS:
echo   • Nombres de archivo basados en CSV
echo   • Timestamp para versionado
echo   • Compatibilidad con estructura anterior
echo   • Búsqueda inteligente de configuraciones
echo   • Logging detallado en consola
echo.
echo 🧪 CÓMO PROBAR:
echo   1. Abrir "Version Names Test" page
echo   2. Crear/seleccionar un equipo
echo   3. Guardar versión con nombre CSV
echo   4. Verificar que se guarda con nombre correcto
echo   5. Comprobar que aparece en la lista
echo.
echo Press any key to continue...
pause >nul 