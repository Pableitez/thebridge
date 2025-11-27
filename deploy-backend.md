# 🚀 Guía de Despliegue del Backend - The Bridge

## Opción 1: Railway (Recomendado - Gratuito)

### Paso 1: Crear cuenta en Railway
1. Ve a [railway.app](https://railway.app)
2. Regístrate con tu cuenta de GitHub
3. Crea un nuevo proyecto

### Paso 2: Conectar repositorio
1. Selecciona "Deploy from GitHub repo"
2. Conecta tu repositorio de GitHub
3. Selecciona la carpeta `backend` del repositorio

### Paso 3: Configurar variables de entorno
En Railway, ve a la pestaña "Variables" y agrega:

```env
NODE_ENV=production
PORT=3001
DATA_ROOT=/app/data
CORS_ORIGIN=https://pableitez.github.io
```

### Paso 4: Desplegar
1. Railway detectará automáticamente que es un proyecto Node.js
2. Usará el `package.json` para instalar dependencias
3. Ejecutará `npm start` para iniciar el servidor

### Paso 5: Obtener URL
1. Ve a la pestaña "Settings"
2. Copia la URL generada (ej: `https://the-bridge-backend-production.up.railway.app`)

## Opción 2: Heroku (Alternativa)

### Paso 1: Instalar Heroku CLI
```bash
# Windows
winget install --id=Heroku.HerokuCLI

# macOS
brew tap heroku/brew && brew install heroku
```

### Paso 2: Login y crear app
```bash
heroku login
heroku create the-bridge-backend
```

### Paso 3: Configurar variables
```bash
heroku config:set NODE_ENV=production
heroku config:set CORS_ORIGIN=https://pableitez.github.io
```

### Paso 4: Desplegar
```bash
git add .
git commit -m "Deploy backend"
git push heroku main
```

## Opción 3: Vercel (Serverless)

### Paso 1: Conectar con Vercel
1. Ve a [vercel.com](https://vercel.com)
2. Conecta tu repositorio de GitHub
3. Selecciona la carpeta `backend`

### Paso 2: Configurar
- Framework Preset: Node.js
- Build Command: `npm install`
- Output Directory: `backend`
- Install Command: `npm install`

### Paso 3: Variables de entorno
```env
NODE_ENV=production
CORS_ORIGIN=https://pableitez.github.io
```

## Actualizar URLs en la Aplicación

Una vez desplegado, actualiza las URLs en `src/config/backend.js`:

```javascript
production: {
  main: 'https://tu-backend.railway.app',  // Tu URL de Railway
  csv: 'https://tu-csv-backend.railway.app' // Tu URL de CSV backend
}
```

## Verificar Despliegue

### Health Check
```bash
curl https://tu-backend.railway.app/health
```

Respuesta esperada:
```json
{
  "success": true,
  "message": "Backend running on port 3001",
  "timestamp": "2025-01-XX..."
}
```

### CORS Test
```bash
curl -H "Origin: https://pableitez.github.io" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://tu-backend.railway.app/health
```

## Troubleshooting

### Error: Build Failed
- Verificar que `package.json` tenga el script `start`
- Comprobar que todas las dependencias estén en `dependencies` (no `devDependencies`)

### Error: CORS Policy
- Verificar que `CORS_ORIGIN` incluya `https://pableitez.github.io`
- Revisar configuración de CORS en `server.js`

### Error: Port Already in Use
- Railway/Heroku asignan automáticamente el puerto
- Usar `process.env.PORT` en lugar de puerto fijo

### Error: Module Not Found
- Verificar que `node_modules` no esté en `.gitignore`
- Comprobar que todas las dependencias estén instaladas

## Monitoreo

### Logs en Railway
```bash
railway logs
```

### Logs en Heroku
```bash
heroku logs --tail
```

### Logs en Vercel
- Ve a la pestaña "Functions" en el dashboard
- Revisa los logs de las funciones

## Costos Estimados

### Railway
- **Gratuito**: 500 horas/mes
- **Pro**: $5/mes por proyecto

### Heroku
- **Gratuito**: 550-1000 horas/mes
- **Basic**: $7/mes

### Vercel
- **Gratuito**: 100GB bandwidth/mes
- **Pro**: $20/mes

## Recomendación Final

**Railway** es la mejor opción porque:
- ✅ Gratuito para proyectos pequeños
- ✅ Despliegue automático desde GitHub
- ✅ SSL automático
- ✅ Variables de entorno fáciles de configurar
- ✅ Logs en tiempo real
- ✅ Escalado automático 