# 💾 Configuración de Usuario en Backend - Guía Completa

## 🎯 **Objetivo**
Permitir a cada usuario guardar y cargar su configuración personal completa (filtros, vistas, resúmenes, preferencias, etc.) en el backend, asegurando que cada usuario tenga su configuración independiente y persistente.

## ✅ **Funcionalidades Implementadas**

### 1. **Botones de Configuración**

#### A. **Save to Backend** 💾
- **Función**: Guarda TODA la configuración del usuario en el backend
- **Ubicación**: Modal "User Configuration" → Sección "Dashboard Configuration"
- **Datos guardados**:
  - ✅ Configuración del dashboard
  - ✅ Filtros activos y guardados
  - ✅ Quick filters
  - ✅ Vistas de tabla personalizadas
  - ✅ Resúmenes personalizados
  - ✅ Configuración de columnas
  - ✅ Favoritos y marcadores
  - ✅ Configuración de notificaciones
  - ✅ Tema y idioma
  - ✅ Configuración del backend
  - ✅ Metadatos de sesión

#### B. **Load from Backend** 📂
- **Función**: Carga la configuración más reciente del usuario desde el backend
- **Ubicación**: Modal "User Configuration" → Sección "Dashboard Configuration"
- **Comportamiento**:
  - Lista todas las configuraciones guardadas
  - Carga automáticamente la más reciente
  - Aplica toda la configuración al localStorage
  - Sugiere recargar la página para aplicar cambios

#### C. **Open Backend Folder** 📁
- **Función**: Abre la carpeta donde se guardan las configuraciones
- **Ubicación**: Modal "User Configuration" → Sección "Dashboard Configuration"
- **Comportamiento**:
  - Abre la carpeta del sistema de archivos
  - Muestra lista de configuraciones disponibles
  - Permite acceso directo a los archivos JSON

### 2. **Estructura de Datos Guardados**

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0",
  "description": "Configuración completa del usuario",
  
  "userEmail": "usuario@ejemplo.com",
  "userName": "Usuario Ejemplo",
  "teamId": "team-123",
  "teamName": "Equipo Ejemplo",
  
  "dashboard": { /* Configuración del dashboard */ },
  "filters": [ /* Filtros activos */ ],
  "quickFilters": { /* Quick filters */ },
  "tableViewViews": { /* Vistas de tabla */ },
  "customSummaries": { /* Resúmenes personalizados */ },
  "columnConfig": { /* Configuración de columnas */ },
  "visibleColumns": [ /* Columnas visibles */ ],
  "columnOrder": [ /* Orden de columnas */ ],
  "favoritos": [ /* Favoritos */ ],
  "notifications": { /* Configuración de notificaciones */ },
  "theme": "dark",
  "language": "es",
  "backendSettings": { /* Configuración del backend */ },
  
  "currentSession": {
    "lastActivity": "2024-01-15T10:30:00.000Z",
    "dataVersion": "v1.2.3",
    "activeFilters": [ /* Filtros activos actualmente */ ]
  }
}
```

### 3. **Flujo de Usuario**

#### **Para Guardar Configuración:**
1. Usuario configura filtros, vistas, resúmenes, etc.
2. Hace clic en "User Configuration" (ícono de usuario)
3. En el modal, hace clic en "Save to Backend"
4. Sistema detecta automáticamente usuario y equipo
5. Guarda configuración completa en backend
6. Muestra confirmación: "Configuration saved to backend successfully!"

#### **Para Cargar Configuración:**
1. Usuario hace clic en "User Configuration"
2. En el modal, hace clic en "Load from Backend"
3. Sistema busca configuraciones disponibles
4. Carga automáticamente la más reciente
5. Aplica toda la configuración
6. Sugiere recargar página para aplicar cambios

### 4. **Verificación de Backend**

#### **Estado Visual de Botones:**
- **✅ Backend Disponible**: Botones normales, funcionales
- **❌ Backend No Disponible**: Botones atenuados, no funcionales

#### **Verificación Automática:**
- Se ejecuta al abrir el modal de configuración
- Verifica endpoint `/health` del backend
- Actualiza estado visual de botones automáticamente

### 5. **Ubicación de Archivos**

#### **Estructura en Backend:**
```
WebMainData/
└── users/
    └── usuario_teamId/
        └── dashboard/
            ├── dashboard-config-usuario-2024-01-15T10-30-00.json
            ├── dashboard-config-usuario-2024-01-14T15-45-00.json
            └── ...
```

#### **Nombres de Archivo:**
- Formato: `dashboard-config-{email}-{timestamp}.json`
- Ejemplo: `dashboard-config-usuario@ejemplo.com-2024-01-15T10-30-00-000Z.json`

### 6. **APIs del Backend**

#### **Guardar Configuración:**
```javascript
POST /api/dashboard/save
{
  "filename": "dashboard-config-usuario-timestamp.json",
  "settings": { /* configuración completa */ },
  "teamId": "team-123",
  "userEmail": "usuario@ejemplo.com"
}
```

#### **Cargar Lista de Configuraciones:**
```javascript
GET /api/dashboard/list?teamId=team-123&userEmail=usuario@ejemplo.com
```

#### **Cargar Configuración Específica:**
```javascript
GET /api/dashboard/load/filename.json?teamId=team-123&userEmail=usuario@ejemplo.com
```

#### **Abrir Carpeta:**
```javascript
POST /api/dashboard/open-folder
{
  "teamId": "team-123",
  "userEmail": "usuario@ejemplo.com"
}
```

### 7. **Manejo de Errores**

#### **Backend No Disponible:**
- Muestra mensaje: "Error saving to backend. Check if backend is running on port 3001."
- Sugiere verificar que el servidor esté corriendo

#### **Usuario No Logueado:**
- Usa valores por defecto: `default@user.com`, `default-team`
- Guarda configuración local sin usuario específico

#### **Sin Configuraciones Guardadas:**
- Muestra mensaje: "No saved configurations found. Save a configuration first!"
- Sugiere guardar una configuración primero

### 8. **Seguridad y Privacidad**

#### **Datos NO Guardados:**
- ❌ Datos sensibles de la tabla
- ❌ Contraseñas o información personal
- ❌ Datos de sesión temporales

#### **Datos SÍ Guardados:**
- ✅ Configuración de interfaz
- ✅ Filtros y vistas personalizadas
- ✅ Preferencias de usuario
- ✅ Metadatos de configuración

### 9. **Compatibilidad**

#### **Navegadores Soportados:**
- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Edge 80+
- ✅ Safari 13+

#### **Backend Requerido:**
- ✅ Node.js 14+
- ✅ Puerto 3001 disponible
- ✅ Permisos de escritura en carpeta de datos

### 10. **Troubleshooting**

#### **Problema**: Botones aparecen atenuados
**Solución**: Verificar que el backend esté corriendo en `http://localhost:3001`

#### **Problema**: Error al guardar
**Solución**: 
1. Verificar conexión a internet
2. Verificar que el backend esté corriendo
3. Verificar permisos de escritura en carpeta de datos

#### **Problema**: No se cargan las configuraciones
**Solución**:
1. Verificar que haya configuraciones guardadas
2. Verificar que el usuario esté logueado correctamente
3. Verificar permisos de lectura en carpeta de datos

## 🚀 **Próximas Mejoras**

- [ ] Selector de configuración específica (no solo la más reciente)
- [ ] Comparación visual entre configuraciones
- [ ] Backup automático de configuraciones
- [ ] Sincronización en tiempo real entre dispositivos
- [ ] Historial de cambios de configuración
- [ ] Exportación/importación de configuraciones entre usuarios 