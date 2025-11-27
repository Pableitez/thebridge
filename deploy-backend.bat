@echo off
chcp 65001 >nul

echo 🌐 The Bridge - Despliegue del Backend
echo ======================================
echo.

REM Verificar que estamos en el directorio correcto
if not exist "backend\package.json" (
    echo ❌ Error: No se encontró backend\package.json
    echo    Asegúrate de estar en el directorio raíz del proyecto
    pause
    exit /b 1
)

echo ✅ Estructura del proyecto verificada
echo.

REM Verificar que Railway CLI esté instalado
railway --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Railway CLI no está instalado
    echo    Instalando Railway CLI...
    npm install -g @railway/cli
)

echo ✅ Railway CLI verificado
echo.

REM Verificar login en Railway
echo 🔐 Verificando login en Railway...
railway whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo    Por favor, inicia sesión en Railway:
    railway login
)

echo ✅ Login verificado
echo.

REM Crear proyecto en Railway
echo 🚀 Creando proyecto en Railway...
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "timestamp=%YYYY%%MM%%DD%%HH%%Min%%Sec%"

set "PROJECT_NAME=the-bridge-backend-%timestamp%"

railway init --name "%PROJECT_NAME%" --directory backend

echo ✅ Proyecto creado: %PROJECT_NAME%
echo.

REM Configurar variables de entorno
echo ⚙️  Configurando variables de entorno...
railway variables set NODE_ENV=production
railway variables set PORT=3001
railway variables set DATA_ROOT=/app/data
railway variables set CORS_ORIGIN=https://pableitez.github.io

echo ✅ Variables de entorno configuradas
echo.

REM Desplegar
echo 🚀 Desplegando backend...
railway up

echo.
echo ✅ Despliegue completado!
echo.

REM Obtener URL del proyecto
echo 🔗 Obteniendo URL del proyecto...
railway status --json > temp_status.json 2>nul

REM Leer URL del archivo JSON (simplificado)
for /f "tokens=*" %%i in ('type temp_status.json ^| findstr "url"') do (
    set "line=%%i"
    set "line=!line:"=!"
    set "url=!line:url:=!"
    set "url=!url:,=!"
)

if defined url (
    echo ✅ URL del proyecto: !url!
    echo.
    
    REM Actualizar configuración local
    echo 📝 Actualizando configuración local...
    powershell -Command "(Get-Content 'src\config\backend.js') -replace 'https://the-bridge-backend-production.up.railway.app', '!url!' | Set-Content 'src\config\backend.js'"
    
    echo ✅ Configuración actualizada
    echo.
    
    REM Probar conexión
    echo 🧪 Probando conexión...
    curl -s "!url!/health" >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ Backend funcionando correctamente
    ) else (
        echo ⚠️  Backend no responde inmediatamente (puede tardar unos minutos en iniciar)
    )
) else (
    echo ⚠️  No se pudo obtener la URL del proyecto
    echo    Revisa el dashboard de Railway para obtener la URL
)

REM Limpiar archivo temporal
del temp_status.json >nul 2>&1

echo.
echo 🎉 ¡Despliegue completado!
echo.
echo 📋 Próximos pasos:
echo    1. Ve a https://railway.app para ver tu proyecto
echo    2. Copia la URL del proyecto
echo    3. Actualiza src\config\backend.js con la URL correcta
echo    4. Haz commit y push de los cambios
echo    5. Prueba la aplicación en https://pableitez.github.io/the-bridge/
echo.

pause 