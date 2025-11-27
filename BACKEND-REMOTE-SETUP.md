# Configuración del Backend Remoto para The Bridge

## Problema Actual

La aplicación "The Bridge" está configurada para usar servidores locales (`localhost:3001` y `localhost:3005`), pero cuando se accede desde `pableitez.github.io`, necesita un backend remoto.

## Solución Implementada

### 1. Detección Automática de Entorno

La aplicación ahora detecta automáticamente si está en:
- **Desarrollo**: `localhost` o `127.0.0.1` → Usa servidores locales
- **Producción**: `pableitez.github.io` → Usa servidores remotos

### 2. Configuración Centralizada

Se creó un archivo de configuración centralizado en `src/config/backend.js` que maneja las URLs del backend según el entorno.

### 3. Modo Offline

Cuando no hay backend disponible en producción, la aplicación funciona en modo offline usando almacenamiento local del navegador.

## Configuración del Backend Remoto

### Opción 1: Usar un Servicio de Hosting

1. **Heroku** (Gratuito para proyectos pequeños):
   ```bash
   # Clonar el repositorio del backend
   git clone https://github.com/tu-usuario/the-bridge-backend.git
   cd the-bridge-backend
   
   # Crear app en Heroku
   heroku create the-bridge-backend
   
   # Desplegar
   git push heroku main
   ```

2. **Railway** (Alternativa a Heroku):
   - Conectar tu repositorio de GitHub
   - Configurar variables de entorno
   - Desplegar automáticamente

3. **Vercel** (Para Node.js):
   - Importar proyecto desde GitHub
   - Configurar build settings
   - Desplegar

### Opción 2: Servidor VPS

1. **DigitalOcean, AWS, Google Cloud**:
   ```bash
   # En tu servidor
   git clone https://github.com/tu-usuario/the-bridge-backend.git
   cd the-bridge-backend
   npm install
   npm start
   ```

2. **Configurar dominio**:
   - Apuntar tu dominio a la IP del servidor
   - Configurar SSL con Let's Encrypt

### Opción 3: Servicios Serverless

1. **AWS Lambda + API Gateway**
2. **Google Cloud Functions**
3. **Azure Functions**

## Actualizar URLs en la Configuración

Una vez que tengas tu backend desplegado, actualiza las URLs en `src/config/backend.js`:

```javascript
production: {
  main: 'https://tu-backend.herokuapp.com',  // Tu backend principal
  csv: 'https://tu-csv-backend.herokuapp.com' // Tu backend CSV
}
```

## Estructura del Backend

Tu backend remoto debe tener estos endpoints:

### Backend Principal (Puerto 3001)
- `GET /health` - Health check
- `GET /api/versions` - Listar versiones
- `POST /api/versions` - Guardar versión
- `GET /api/versions/:id` - Cargar versión
- `DELETE /api/versions/:id` - Eliminar versión
- `GET /api/teams` - Listar equipos
- `POST /api/teams/create` - Crear equipo

### Backend CSV (Puerto 3005)
- `GET /health` - Health check
- `GET /api/csv/last-upload` - Último CSV subido
- `POST /api/csv/upload` - Subir CSV

## Variables de Entorno

Configura estas variables en tu hosting:

```env
NODE_ENV=production
PORT=3001
DATA_ROOT=/app/data
CORS_ORIGIN=https://pableitez.github.io
```

## CORS Configuration

Asegúrate de que tu backend permita requests desde `pableitez.github.io`:

```javascript
app.use(cors({
  origin: [
    'https://pableitez.github.io',
    'https://pableitez.github.io/the-bridge',
    'https://pableitez.github.io/the-bridge/'
  ],
  credentials: true
}));
```

## Testing

Para probar tu backend remoto:

1. **Health Check**:
   ```bash
   curl https://tu-backend.herokuapp.com/health
   ```

2. **Desde el navegador**:
   - Abrir `https://pableitez.github.io/the-bridge/`
   - Verificar que no hay errores de conexión en la consola
   - Probar funcionalidades como guardar versiones

## Modo Offline

Si no tienes backend remoto, la aplicación funcionará en modo offline:

- Los datos se guardan en el localStorage del navegador
- Se muestra una notificación de "Modo Offline"
- Las funcionalidades básicas siguen funcionando

## Troubleshooting

### Error: CORS Policy
- Verificar que el backend permite requests desde `pableitez.github.io`
- Revisar la configuración de CORS en el servidor

### Error: Connection Refused
- Verificar que el servidor esté corriendo
- Comprobar que las URLs en la configuración sean correctas
- Revisar logs del servidor

### Error: SSL Certificate
- Asegurar que el backend use HTTPS
- Verificar que el certificado SSL sea válido

## Próximos Pasos

1. **Desplegar backend remoto** usando una de las opciones anteriores
2. **Actualizar URLs** en `src/config/backend.js`
3. **Probar** la aplicación desde `pableitez.github.io`
4. **Configurar dominio personalizado** (opcional)

## Contacto

Si necesitas ayuda con la configuración, puedes:
- Revisar los logs del servidor
- Verificar la configuración de CORS
- Comprobar que todos los endpoints estén funcionando 