# Backend Local para Web Main

Backend Node.js + Express para gestionar versiones de datos en carpetas compartidas en la nube.

## 🚀 Características

- ✅ **Gestión de versiones** - Guardar, cargar y eliminar versiones de datos
- ✅ **Sincronización con nube** - Soporte para OneDrive, Google Drive, Dropbox
- ✅ **Exportación a CSV** - Exportar versiones a archivos CSV
- ✅ **Backups automáticos** - Crear backups antes de eliminar versiones
- ✅ **API REST completa** - Endpoints para todas las operaciones
- ✅ **Seguridad** - Rate limiting, CORS, validación de datos
- ✅ **Logging** - Registro detallado de operaciones

## 📋 Requisitos

- Node.js 16+ 
- npm o yarn
- Carpeta compartida en la nube (opcional)

## 🛠️ Instalación

1. **Instalar dependencias:**
```bash
cd backend
npm install
```

2. **Configurar carpetas de sincronización (RECOMENDADO):**
```bash
node configure.js
```
   Este script te guiará automáticamente para configurar tu carpeta de nube preferida.

3. **Configuración manual (opcional):**
   
   Edita `config/paths.js` y cambia la ruta de datos:
   ```javascript
   // Para OneDrive:
   dataRoot: process.env.DATA_ROOT || path.join(os.homedir(), 'OneDrive', 'TheBridge', 'Versions'),
   
   // Para Google Drive:
   dataRoot: process.env.DATA_ROOT || path.join(os.homedir(), 'Google Drive', 'TheBridge', 'Versions'),
   
   // Para Dropbox:
   dataRoot: process.env.DATA_ROOT || path.join(os.homedir(), 'Dropbox', 'TheBridge', 'Versions'),
   ```

4. **Iniciar el servidor:**
```bash
# Windows
start.bat

# Linux/Mac
./start.sh

# O manualmente:
npm start
```

## 🌐 Endpoints de la API

### Versiones

- `GET /api/versions` - Listar todas las versiones
- `POST /api/versions` - Guardar nueva versión
- `GET /api/versions/:id` - Cargar versión específica
- `DELETE /api/versions/:id` - Eliminar versión
- `POST /api/versions/:id/export` - Exportar versión a CSV
- `POST /api/versions/cleanup` - Limpiar versiones antiguas
- `GET /api/versions/stats` - Estadísticas de versiones
- `GET /api/versions/config/info` - Información de configuración

### Dashboard

- `POST /api/dashboard/save` - Guardar configuración del dashboard
- `POST /api/dashboard/open-folder` - Abrir carpeta del dashboard del usuario
- `GET /api/dashboard/list` - Listar configuraciones del dashboard
- `GET /api/dashboard/load/:filename` - Cargar configuración específica

### Sistema

- `GET /health` - Estado del servidor
- `GET /api/system/info` - Información del sistema

## 📁 Estructura de Carpetas

```
WebMainData/
├── versions/          # Versiones guardadas
├── backups/           # Backups automáticos
├── exports/           # Archivos CSV exportados
├── temp/              # Archivos temporales
└── users/             # Carpetas de usuarios
    └── user_teamId/   # Carpeta específica de usuario
        └── dashboard/ # Configuraciones del dashboard
```

## 🔧 Configuración

### Variables de Entorno

```bash
# Puerto del servidor (por defecto: 3001)
PORT=3001

# Carpeta de datos (por defecto: Documents/WebMainData)
DATA_ROOT=/path/to/your/cloud/folder

# Modo de desarrollo
NODE_ENV=development
```

### Configuración de Carpetas Compartidas

1. **OneDrive:**
   ```javascript
   dataRoot: path.join(os.homedir(), 'OneDrive', 'WebMainData')
   ```

2. **Google Drive:**
   ```javascript
   dataRoot: path.join(os.homedir(), 'Google Drive', 'WebMainData')
   ```

3. **Dropbox:**
   ```javascript
   dataRoot: path.join(os.homedir(), 'Dropbox', 'WebMainData')
   ```

## 🔌 Integración con Frontend

Para conectar tu frontend con el backend:

```javascript
// URL base del backend
const BACKEND_URL = 'http://localhost:3001';

// Ejemplo: Guardar versión
async function saveVersion(data, metadata) {
  const response = await fetch(`${BACKEND_URL}/api/versions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data, metadata })
  });
  return response.json();
}

// Ejemplo: Cargar versiones
async function loadVersions() {
  const response = await fetch(`${BACKEND_URL}/api/versions`);
  return response.json();
}
```

## 📊 Ejemplos de Uso

### Guardar configuración del dashboard

```javascript
// Guardar configuración del dashboard
async function saveDashboardConfig(userEmail, teamId, config) {
  const response = await fetch(`${BACKEND_URL}/api/dashboard/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filename: `dashboard-config-${new Date().toISOString()}.json`,
      settings: config,
      teamId: teamId,
      userEmail: userEmail
    })
  });
  return response.json();
}

// Abrir carpeta del dashboard
async function openDashboardFolder(userEmail, teamId) {
  const response = await fetch(`${BACKEND_URL}/api/dashboard/open-folder`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      teamId: teamId,
      userEmail: userEmail
    })
  });
  return response.json();
}
```

### Guardar una versión

```javascript
const versionData = [
  { id: 1, name: 'John', email: 'john@example.com' },
  { id: 2, name: 'Jane', email: 'jane@example.com' }
];

const metadata = {
  description: 'Datos de usuarios',
  source: 'import',
  tags: ['users', 'production']
};

const result = await saveVersion(versionData, metadata);
console.log('Versión guardada:', result.versionId);
```

### Cargar una versión

```javascript
const versionId = '123e4567-e89b-12d3-a456-426614174000';
const result = await fetch(`${BACKEND_URL}/api/versions/${versionId}`);
const version = await result.json();
console.log('Datos cargados:', version.data);
```

### Exportar a CSV

```javascript
const versionId = '123e4567-e89b-12d3-a456-426614174000';
const result = await fetch(`${BACKEND_URL}/api/versions/${versionId}/export`, {
  method: 'POST'
});
const exportInfo = await result.json();
console.log('CSV exportado:', exportInfo.fileName);
```

## 🛡️ Seguridad

- **Rate Limiting**: Máximo 100 requests por minuto por IP
- **CORS**: Configurado para permitir requests desde el frontend
- **Validación**: Validación de datos de entrada
- **Límites**: Tamaño máximo de archivo: 100MB

## 📝 Logs

El servidor registra todas las operaciones:

```
✅ Versión guardada: 123e4567-e89b-12d3-a456-426614174000 (150 registros)
✅ Versión cargada: 123e4567-e89b-12d3-a456-426614174000 (150 registros)
✅ Versión exportada a CSV: export_123e4567_1703123456789.csv
```

## 🔄 Sincronización con la Nube

El backend guarda los archivos en la carpeta configurada. Si usas una carpeta compartida:

1. **OneDrive/Google Drive/Dropbox** se sincronizará automáticamente
2. Los archivos estarán disponibles en todos tus dispositivos
3. Puedes acceder a las versiones desde cualquier lugar

## 🚨 Solución de Problemas

### Error: "Puerto ya en uso"
```bash
# Cambiar puerto
PORT=3002 npm start
```

### Error: "Carpeta no encontrada"
```bash
# Verificar que la carpeta existe
ls ~/OneDrive/WebMainData
```

### Error: "Permisos denegados"
```bash
# Dar permisos a la carpeta
chmod 755 ~/OneDrive/WebMainData
```

## 📞 Soporte

Para problemas o preguntas:
1. Revisa los logs del servidor
2. Verifica la configuración en `config/paths.js`
3. Asegúrate de que la carpeta de datos existe y tiene permisos

## 🔄 Actualizaciones

Para actualizar el backend:

```bash
git pull origin main
npm install
npm start
``` 