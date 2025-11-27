# 🚀 Despliegue en Render.com - The Bridge Backend

## 📋 Pasos para desplegar:

### 1. Crear cuenta en Render.com
- Ve a https://render.com
- Haz clic en "Get Started"
- Regístrate con tu cuenta de GitHub

### 2. Conectar repositorio
- Haz clic en "New +"
- Selecciona "Web Service"
- Conecta tu repositorio: `Pableitez/the-bridge`

### 3. Configurar el servicio
- **Name:** `the-bridge-backend`
- **Root Directory:** `backend`
- **Environment:** `Node`
- **Build Command:** `npm install`
- **Start Command:** `npm start`

### 4. Variables de entorno (opcional)
- `NODE_ENV`: `production`

### 5. Desplegar
- Haz clic en "Create Web Service"
- Espera a que termine el build (2-3 minutos)

### 6. URL del backend
- Render te dará una URL como: `https://the-bridge-backend.onrender.com`
- Esta URL ya está configurada en el frontend

## ✅ Verificación
Una vez desplegado, prueba:
```bash
curl https://the-bridge-backend.onrender.com/health
```

Debería devolver: `OK`

## 🌐 Frontend
El frontend ya está configurado para usar esta URL:
- https://pableitez.github.io/the-bridge/

¡Listo! 🎉 