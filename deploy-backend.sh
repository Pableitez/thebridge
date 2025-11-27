#!/bin/bash

# 🚀 Script de Despliegue Automático - The Bridge Backend
# Este script te ayuda a desplegar el backend en Railway

echo "🌐 The Bridge - Despliegue del Backend"
echo "======================================"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "backend/package.json" ]; then
    echo "❌ Error: No se encontró backend/package.json"
    echo "   Asegúrate de estar en el directorio raíz del proyecto"
    exit 1
fi

echo "✅ Estructura del proyecto verificada"
echo ""

# Verificar que Railway CLI esté instalado
if ! command -v railway &> /dev/null; then
    echo "⚠️  Railway CLI no está instalado"
    echo "   Instalando Railway CLI..."
    
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
        # Windows
        npm install -g @railway/cli
    else
        # macOS/Linux
        curl -fsSL https://railway.app/install.sh | sh
    fi
fi

echo "✅ Railway CLI verificado"
echo ""

# Verificar login en Railway
echo "🔐 Verificando login en Railway..."
if ! railway whoami &> /dev/null; then
    echo "   Por favor, inicia sesión en Railway:"
    railway login
fi

echo "✅ Login verificado"
echo ""

# Crear proyecto en Railway si no existe
echo "🚀 Creando proyecto en Railway..."
PROJECT_NAME="the-bridge-backend-$(date +%s)"

railway init --name "$PROJECT_NAME" --directory backend

echo "✅ Proyecto creado: $PROJECT_NAME"
echo ""

# Configurar variables de entorno
echo "⚙️  Configurando variables de entorno..."
railway variables set NODE_ENV=production
railway variables set PORT=3001
railway variables set DATA_ROOT=/app/data
railway variables set CORS_ORIGIN=https://pableitez.github.io

echo "✅ Variables de entorno configuradas"
echo ""

# Desplegar
echo "🚀 Desplegando backend..."
railway up

echo ""
echo "✅ Despliegue completado!"
echo ""

# Obtener URL del proyecto
echo "🔗 Obteniendo URL del proyecto..."
PROJECT_URL=$(railway status --json | grep -o '"url":"[^"]*"' | cut -d'"' -f4)

if [ -n "$PROJECT_URL" ]; then
    echo "✅ URL del proyecto: $PROJECT_URL"
    echo ""
    
    # Actualizar configuración local
    echo "📝 Actualizando configuración local..."
    sed -i "s|https://the-bridge-backend-production.up.railway.app|$PROJECT_URL|g" src/config/backend.js
    
    echo "✅ Configuración actualizada"
    echo ""
    
    # Probar conexión
    echo "🧪 Probando conexión..."
    if curl -s "$PROJECT_URL/health" > /dev/null; then
        echo "✅ Backend funcionando correctamente"
    else
        echo "⚠️  Backend no responde inmediatamente (puede tardar unos minutos en iniciar)"
    fi
else
    echo "⚠️  No se pudo obtener la URL del proyecto"
    echo "   Revisa el dashboard de Railway para obtener la URL"
fi

echo ""
echo "🎉 ¡Despliegue completado!"
echo ""
echo "📋 Próximos pasos:"
echo "   1. Ve a https://railway.app para ver tu proyecto"
echo "   2. Copia la URL del proyecto"
echo "   3. Actualiza src/config/backend.js con la URL correcta"
echo "   4. Haz commit y push de los cambios"
echo "   5. Prueba la aplicación en https://pableitez.github.io/the-bridge/"
echo "" 