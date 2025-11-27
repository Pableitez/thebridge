@echo off
echo 🌐 Configuración del Backend - The Bridge
echo ==========================================
echo.

cd /d "%~dp0"

echo 📁 Configurando carpetas de sincronización...
echo.

node configure.js

echo.
echo ✅ Configuración completada!
echo.
echo 📋 Para usar el backend:
echo 1. Ejecuta: start.bat
echo 2. Abre index.html en tu navegador
echo 3. Ve a "Data Versions" y haz clic en "Connect to Backend"
echo.

pause 