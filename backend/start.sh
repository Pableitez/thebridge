#!/bin/bash

echo "========================================"
echo "   Backend Web Main - Iniciando..."
echo "========================================"
echo

# Verificar si Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js no está instalado"
    echo "Por favor, instala Node.js desde: https://nodejs.org/"
    exit 1
fi

# Verificar si las dependencias están instaladas
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Error instalando dependencias"
        exit 1
    fi
fi

echo "✅ Dependencias verificadas"
echo

# Iniciar el servidor
echo "🚀 Iniciando servidor backend..."
echo "📍 Puerto: 3001"
echo "🌐 URL: http://localhost:3001"
echo "🔗 Health check: http://localhost:3001/health"
echo
echo "Presiona Ctrl+C para detener el servidor"
echo

npm start 