#!/bin/bash

echo "🚀 Desplegando The Bridge Backend en Render.com..."

# Verificar que estamos en el directorio correcto
if [ ! -f "backend/package.json" ]; then
    echo "❌ Error: No se encuentra backend/package.json"
    exit 1
fi

# Instalar Render CLI si no está instalado
if ! command -v render &> /dev/null; then
    echo "📦 Instalando Render CLI..."
    curl -sL https://render.com/download-cli/linux | bash
fi

# Ir al directorio backend
cd backend

# Desplegar en Render
echo "🌐 Desplegando en Render.com..."
render deploy

echo "✅ Despliegue completado!"
echo "🌐 URL: https://the-bridge-backend.onrender.com" 