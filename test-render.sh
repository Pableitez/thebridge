#!/bin/bash

echo "🧪 Probando despliegue en Render.com..."

# URL del backend en Render
BACKEND_URL="https://the-bridge-backend.onrender.com"

echo "🔍 Probando health check..."
response=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/health")

if [ "$response" = "200" ]; then
    echo "✅ Backend funcionando correctamente!"
    echo "🌐 URL: $BACKEND_URL"
    echo "📊 Health check: $BACKEND_URL/health"
else
    echo "❌ Backend no responde (HTTP $response)"
    echo "🔧 Verifica el despliegue en Render.com"
fi

echo ""
echo "🌐 Frontend: https://pableitez.github.io/the-bridge/" 