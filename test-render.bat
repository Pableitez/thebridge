@echo off
echo 🧪 Probando despliegue en Render.com...

REM URL del backend en Render
set BACKEND_URL=https://the-bridge-backend.onrender.com

echo 🔍 Probando health check...
curl -s -o nul -w "%%{http_code}" "%BACKEND_URL%/health" > temp.txt
set /p response=<temp.txt
del temp.txt

if "%response%"=="200" (
    echo ✅ Backend funcionando correctamente!
    echo 🌐 URL: %BACKEND_URL%
    echo 📊 Health check: %BACKEND_URL%/health
) else (
    echo ❌ Backend no responde (HTTP %response%)
    echo 🔧 Verifica el despliegue en Render.com
)

echo.
echo 🌐 Frontend: https://pableitez.github.io/the-bridge/
pause 