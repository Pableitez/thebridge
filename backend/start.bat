@echo off
echo ========================================
echo    Backend Web Main - Iniciando...
echo ========================================
echo.

REM Verificar si Node.js está instalado
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Error: Node.js no está instalado
    echo Por favor, instala Node.js desde: https://nodejs.org/
    pause
    exit /b 1
)

REM Verificar si las dependencias están instaladas
if not exist "node_modules" (
    echo 📦 Instalando dependencias...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Error instalando dependencias
        pause
        exit /b 1
    )
)

echo ✅ Dependencias verificadas
echo.

REM Iniciar el servidor
echo 🚀 Iniciando servidor backend...
echo 📍 Puerto: 3001
echo 🌐 URL: http://localhost:3001
echo 🔗 Health check: http://localhost:3001/health
echo.
echo Presiona Ctrl+C para detener el servidor
echo.

npm start

pause 