# 🎯 Sistema de Versiones por Equipo - Implementación Completa

## 📋 Resumen de la Implementación

Este documento describe la implementación completa del sistema de versiones por equipo que resuelve el problema de que las versiones de datos se guardaban en una carpeta global en lugar de en las carpetas específicas de cada equipo.

## ❌ Problema Original

**Antes del arreglo:**
- Las versiones se guardaban en: `C:\Users\usuario\OneDrive\TheBridge\Versions\versions\`
- Todas las versiones iban a la misma carpeta global
- No había separación por equipos
- Las versiones no respetaban la ubicación seleccionada por el usuario

**Después del arreglo:**
- Las versiones se guardan en: `[carpeta-seleccionada-por-usuario]\teams\[team-id]\versions\`
- Cada equipo tiene su propio espacio de versiones
- Las versiones respetan la ubicación de almacenamiento del equipo

## 🛠️ Cambios Implementados

### 1. **Frontend: `src/services/backendService.js`**

**Funciones Agregadas:**
- `getCurrentTeam()`: Obtiene el equipo actual desde `window.currentTeam` o `localStorage`
- `getVersionsEndpoints()`: Determina qué endpoints usar según el contexto (equipo vs global)

**Métodos Modificados:**
- `saveVersion()`: Ahora usa endpoints de equipo cuando hay un equipo seleccionado
- `getVersionsList()`: Lista versiones del equipo específico
- `loadVersion()`: Carga versiones desde la carpeta del equipo
- `deleteVersion()`: Elimina versiones del equipo
- `exportVersionToCSV()`: Exporta versiones usando endpoints de equipo
- `getVersionStats()`: Obtiene estadísticas específicas del equipo

**Lógica de Selección:**
```javascript
// Si hay equipo seleccionado:
GET /api/teams/{teamId}/versions

// Si no hay equipo (fallback):
GET /api/versions
```

### 2. **Backend: `routes/teams.js`**

**Funciones Helper Agregadas:**
- `getTeamConfig(teamId)`: Obtiene la configuración del equipo desde `team-config.json`
- `getTeamVersionsPath(teamId)`: Resuelve la ruta de versiones del equipo dinámicamente

**Endpoints Agregados:**
- `POST /api/teams/:teamId/versions/:versionId/export`: Exportar versión a CSV
- `GET /api/teams/:teamId/versions/stats`: Estadísticas de versiones del equipo

**Endpoints Modificados:**
- `GET /api/teams/:teamId/versions`: Usa rutas dinámicas
- `POST /api/teams/:teamId/versions`: Guarda en la carpeta del equipo
- `GET /api/teams/:teamId/versions/:versionId`: Carga desde carpeta del equipo
- `DELETE /api/teams/:teamId/versions/:versionId`: Elimina de carpeta del equipo

### 3. **Sistema de Rutas Dinámicas**

**Resolución de Rutas:**
1. Lee `team-config.json` del equipo
2. Usa `storagePath` como ruta base
3. Fallback a rutas comunes si no encuentra la configuración:
   - `~/OneDrive/TheBridge/teams/[teamId]/`
   - `~/Documents/TheBridge/teams/[teamId]/`
   - `~/Google Drive/TheBridge/teams/[teamId]/`
   - `~/Dropbox/TheBridge/teams/[teamId]/`

### 4. **Página de Pruebas: `test-team-versions.html`**

**Funcionalidades de Prueba:**
- ✅ Crear equipo de prueba
- ✅ Guardar versiones de prueba
- ✅ Listar versiones del equipo
- ✅ Cargar versiones específicas
- ✅ Obtener estadísticas
- ✅ Exportar versiones a CSV
- ✅ Eliminar versiones
- ✅ Verificar salud del backend

## 🔄 Flujo de Funcionamiento

### Paso 1: Detección del Equipo
```javascript
// El frontend detecta el equipo actual
const currentTeam = getCurrentTeam();
if (currentTeam) {
    // Usar endpoints de equipo
    url = `/api/teams/${currentTeam.id}/versions`;
} else {
    // Usar endpoints globales
    url = `/api/versions`;
}
```

### Paso 2: Resolución de Rutas en Backend
```javascript
// El backend resuelve la ruta dinámicamente
const teamConfig = await getTeamConfig(teamId);
const teamPath = teamConfig.storagePath || defaultPath;
const versionsPath = path.join(teamPath, 'versions');
```

### Paso 3: Operaciones en Carpeta Específica
```javascript
// Todas las operaciones se realizan en la carpeta del equipo
await fs.writeJson(path.join(versionsPath, `${versionId}.json`), versionData);
```

## 📁 Estructura de Carpetas

```
[Carpeta seleccionada por el usuario]/
├── TheBridge/
│   └── teams/
│       └── [team-id]/
│           ├── team-config.json
│           ├── versions/           ← AQUÍ SE GUARDAN LAS VERSIONES
│           │   ├── version_uuid1.json
│           │   ├── version_uuid2.json
│           │   └── ...
│           ├── backups/
│           ├── exports/
│           ├── temp/
│           └── csvs/
```

## 🧪 Cómo Probar el Sistema

### 1. Iniciar Servicios
```bash
# Opción 1: Script automático
start-all-tests.bat

# Opción 2: Manual
cd web-main/backend && npm start
python -m http.server 8000
```

### 2. Abrir Página de Pruebas
```
http://localhost:8000/web-main/test-team-versions.html
```

### 3. Secuencia de Pruebas
1. **Crear Equipo de Prueba**: Seleccionar carpeta de almacenamiento
2. **Guardar Versión**: Crear versión con datos de prueba
3. **Verificar Ubicación**: Confirmar que se guardó en la carpeta correcta
4. **Listar Versiones**: Ver versiones del equipo
5. **Cargar Versión**: Probar carga de versiones específicas
6. **Estadísticas**: Obtener métricas del equipo
7. **Exportar**: Generar CSV desde versión
8. **Eliminar**: Probar eliminación con backup

## 🎯 Beneficios de la Implementación

### ✅ **Organización por Equipos**
- Cada equipo tiene su propio espacio de versiones
- No hay conflictos entre equipos
- Fácil backup y sincronización por equipo

### ✅ **Ubicación Personalizable**
- Los usuarios pueden elegir dónde almacenar los datos
- Soporte para diferentes proveedores de nube
- Respeta las preferencias del usuario

### ✅ **Compatibilidad con Sistema Existente**
- Fallback a sistema global cuando no hay equipo
- Mantiene compatibilidad con versiones anteriores
- Migración transparente

### ✅ **Robustez**
- Búsqueda automática en múltiples ubicaciones
- Manejo de errores y fallbacks
- Logging detallado para debugging

## 🔧 Configuración del Sistema

### Variables de Entorno
```bash
# Puerto del backend
PORT=3001

# Ruta de datos por defecto
DATA_ROOT=C:\Users\usuario\OneDrive\TheBridge\Versions
```

### Configuración del Equipo (team-config.json)
```json
{
  "id": "team-uuid",
  "name": "Nombre del Equipo",
  "storagePath": "C:\\Users\\usuario\\Desktop\\MiEquipo",
  "storageLocation": "custom",
  "createdAt": "2025-01-18T21:00:00.000Z"
}
```

## 📊 Métricas y Monitoreo

### Logs del Backend
```
✅ Team version saved: uuid for team teamId
✅ Versión guardada en backend: uuid (Equipo: NombreEquipo)
✅ Lista de versiones cargada desde backend: 5 (Equipo: NombreEquipo)
```

### Endpoints de Salud
```
GET /health                           - Salud general del backend
GET /api/teams/:teamId/versions/stats - Estadísticas del equipo
```

## 🚀 Próximos Pasos

### Posibles Mejoras
1. **Sincronización automática** entre dispositivos
2. **Versionado semántico** para las versiones
3. **Compresión automática** de versiones antiguas
4. **Interfaz gráfica** para gestión de versiones
5. **API REST completa** para integración externa

### Consideraciones de Escalabilidad
- **Límites de almacenamiento** por equipo
- **Políticas de retención** automáticas
- **Indexación** para búsqueda rápida
- **Caché** para versiones frecuentemente accedidas

---

## 📞 Soporte y Debugging

### Logs Útiles
```bash
# Backend logs
npm start  # Ver logs en tiempo real

# Verificar salud
curl http://localhost:3001/health

# Probar endpoints
curl http://localhost:3001/api/teams/[teamId]/versions
```

### Solución de Problemas Comunes
1. **Versiones no aparecen**: Verificar que hay equipo seleccionado
2. **Error de permisos**: Verificar permisos de carpeta
3. **Configuración no encontrada**: Verificar `team-config.json`
4. **Backend no responde**: Verificar puerto 3001

---

**✅ Implementación completada exitosamente**
**🎯 Las versiones ahora se guardan correctamente en las carpetas de cada equipo** 