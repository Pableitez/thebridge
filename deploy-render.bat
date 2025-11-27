@echo off
echo 🚀 Desplegando The Bridge Backend en Render.com...

REM Verificar que estamos en el directorio correcto
if not exist "backend\package.json" (
    echo ❌ Error: No se encuentra backend\package.json
    pause
    exit /b 1
)

REM Ir al directorio backend
cd backend

REM Desplegar en Render
echo 🌐 Desplegando en Render.com...
echo.
echo 📋 Instrucciones:
echo 1. Ve a https://render.com
echo 2. Crea una cuenta o inicia sesión
echo 3. Conecta tu repositorio de GitHub
echo 4. Selecciona el directorio 'backend'
echo 5. Configura como Web Service
echo 6. Build Command: npm install
echo 7. Start Command: npm start
echo.
echo 🌐 URL esperada: https://the-bridge-backend.onrender.com

pause 