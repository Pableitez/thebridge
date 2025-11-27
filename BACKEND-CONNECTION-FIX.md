# 🔧 BACKEND CONNECTION FIX - SOLUCIÓN COMPLETA

## 📋 **Problema Identificado**

```
POST http://localhost:3001/api/config/test
net::ERR_CONNECTION_REFUSED
```

**Error en el navegador**: "Cannot connect to backend. Make sure the server is running."

## ✅ **Solución Implementada**

### **1. Verificación de Servidores**

**Servidores Requeridos**:
- **Servidor Principal**: Puerto 3001 (`backend/server.js`)
- **Servidor CSV**: Puerto 3005 (`backend/simple-csv-server.js`)

### **2. Comandos de Verificación**

```bash
# Verificar si los puertos están en uso
netstat -an | findstr :3001
netstat -an | findstr :3005

# Verificar procesos específicos
netstat -ano | findstr :3001
netstat -ano | findstr :3005
```

### **3. Inicio de Servidores**

#### **Servidor Principal (Puerto 3001)**
```bash
cd backend
node server.js
```

**Salida esperada**:
```
🚀 Inicializando carpetas...
✅ Carpeta inicializada: C:\Users\pable\OneDrive\TheBridge\Versions
✅ Carpeta inicializada: C:\Users\pable\OneDrive\TheBridge\Versions\versions
✅ Carpeta inicializada: C:\Users\pable\OneDrive\TheBridge\Versions\backups
✅ Carpeta inicializada: C:\Users\pable\OneDrive\TheBridge\Versions\exports
✅ Carpeta inicializada: C:\Users\pable\OneDrive\TheBridge\Versions\temp
✅ Backend iniciado correctamente
📍 Puerto: 3001
📁 Carpeta de datos: C:\Users\pable\OneDrive\TheBridge\Versions
🌐 URL: http://localhost:3001
```

#### **Servidor CSV (Puerto 3005)**
```bash
cd backend
node simple-csv-server.js
```

**Salida esperada**:
```
🚀 Simple CSV Server running on port 3005
📋 Available endpoints:
   GET  /health
   GET  /api/csv/last-upload
   POST /api/csv/upload
🌐 URL: http://localhost:3005
🔧 CORS: Enabled for all origins
```

### **4. Verificación de Endpoints**

#### **Test del Endpoint de Configuración**
```bash
curl -X POST -H "Content-Type: application/json" -H "Origin: http://127.0.0.1:5501" -d "{\"location\":\"onedrive\"}" "http://localhost:3001/api/config/test"
```

**Respuesta esperada**:
```json
{
  "success": true,
  "message": "Configuration test successful",
  "path": "C:\\Users\\pable\\OneDrive\\TheBridge\\Versions"
}
```

#### **Test del Servidor CSV**
```bash
curl "http://localhost:3005/health"
```

**Respuesta esperada**:
```json
{
  "success": true,
  "message": "CSV Server running on port 3005",
  "timestamp": "2025-07-19T01:13:33.538Z",
  "cors": "enabled"
}
```

## 🔧 **Solución de Problemas**

### **Problema: Puerto en Uso**
```bash
# Error: Error: listen EADDRINUSE: address already in use :::3001
```

**Solución**:
```bash
# 1. Encontrar el proceso
netstat -ano | findstr :3001

# 2. Terminar el proceso (reemplazar XXXX con el PID)
taskkill //PID XXXX //F

# 3. Reiniciar el servidor
cd backend && node server.js
```

### **Problema: CORS Errors**
```bash
# Error: Access to fetch at 'http://localhost:3001/api/config/test' from origin 'http://127.0.0.1:5501' has been blocked by CORS policy
```

**Solución**:
- Verificar que `backend/config/paths.js` incluya el origen correcto
- Reiniciar el servidor después de cambios en la configuración
- Usar el servidor CSV simplificado para endpoints CSV

### **Problema: Endpoint No Encontrado**
```bash
# Error: {"success":false,"error":"Ruta no encontrada"}
```

**Solución**:
- Verificar que el servidor esté corriendo
- Verificar que la ruta esté correctamente definida
- Revisar los logs del servidor

## 📋 **Endpoints Disponibles**

### **Servidor Principal (Puerto 3001)**
- `GET /health` - Verificación de salud
- `GET /api/system/info` - Información del sistema
- `POST /api/config/test` - Test de configuración
- `POST /api/config/save` - Guardar configuración
- `GET /api/config/status` - Estado de configuración
- `GET /api/versions` - Listar versiones
- `POST /api/versions` - Guardar versión
- `GET /api/teams` - Listar equipos
- `GET /api/users` - Listar usuarios

### **Servidor CSV (Puerto 3005)**
- `GET /health` - Verificación de salud
- `GET /api/csv/last-upload` - Obtener último CSV
- `POST /api/csv/upload` - Subir nuevo CSV

## 🚀 **Scripts de Inicio Automático**

### **start-servers.bat** (Windows)
```batch
@echo off
echo Starting The Bridge Backend Servers...
echo.

echo Starting Main Server (Port 3001)...
start "Main Server" cmd /k "cd backend && node server.js"

echo Starting CSV Server (Port 3005)...
start "CSV Server" cmd /k "cd backend && node simple-csv-server.js"

echo.
echo Servers started! Check the new windows for status.
pause
```

### **start-servers.sh** (Linux/Mac)
```bash
#!/bin/bash
echo "Starting The Bridge Backend Servers..."

echo "Starting Main Server (Port 3001)..."
cd backend && node server.js &

echo "Starting CSV Server (Port 3005)..."
cd backend && node simple-csv-server.js &

echo "Servers started! Check the logs above for status."
```

## 🎯 **Verificación Final**

### **1. Verificar Servidores Activos**
```bash
netstat -an | findstr :3001
netstat -an | findstr :3005
```

### **2. Test de Endpoints Críticos**
```bash
# Test servidor principal
curl "http://localhost:3001/health"

# Test servidor CSV
curl "http://localhost:3005/health"

# Test endpoint de configuración
curl -X POST -H "Content-Type: application/json" -d "{\"location\":\"onedrive\"}" "http://localhost:3001/api/config/test"
```

### **3. Verificación en el Navegador**
1. **Abrir DevTools** (F12)
2. **Ir a la pestaña Network**
3. **Recargar la página**
4. **Verificar que no hay errores de conexión**
5. **Las peticiones a `localhost:3001` y `localhost:3005` deberían funcionar**

## ✅ **Estado Final Esperado**

- **Servidor Principal**: ✅ Funcionando en puerto 3001
- **Servidor CSV**: ✅ Funcionando en puerto 3005
- **CORS**: ✅ Configurado correctamente
- **Endpoints**: ✅ Respondiendo correctamente
- **Frontend**: ✅ Sin errores de conexión
- **Configuración**: ✅ Test exitoso

## 🔧 **Archivos Clave**

- `backend/server.js` - Servidor principal
- `backend/simple-csv-server.js` - Servidor CSV
- `backend/config/paths.js` - Configuración de CORS
- `backend/routes/config.js` - Endpoints de configuración
- `start-servers.bat` - Script de inicio automático

---

**¡El problema de conexión al backend ha sido completamente resuelto!** 🎉 