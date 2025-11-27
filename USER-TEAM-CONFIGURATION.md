# 👥 Configuración por Usuario y Equipo - Guía Completa

## 🎯 **Objetivo**
Cada usuario puede tener configuraciones completamente independientes para cada equipo al que pertenece.

## 📁 **Estructura de Carpetas**

### **Separación por Usuario + Equipo**
```
WebMainData/
└── users/
    ├── julio@gmail.com_team_1753299451320_uvuf487th/     # Julio en equipo JULIO
    │   └── dashboard/
    │       ├── dashboard-config-julio@gmail.com-2025-01-15T10-30-00.json
    │       ├── dashboard-config-julio@gmail.com-2025-01-14T15-45-00.json
    │       └── ...
    │
    ├── julio@gmail.com_team_1234567890_abcdef/           # Julio en equipo TEST
    │   └── dashboard/
    │       ├── dashboard-config-julio@gmail.com-2025-01-13T09-20-00.json
    │       └── ...
    │
    ├── maria@gmail.com_team_1753299451320_uvuf487th/     # María en equipo JULIO
    │   └── dashboard/
    │       ├── dashboard-config-maria@gmail.com-2025-01-15T11-00-00.json
    │       └── ...
    │
    └── pedro@gmail.com_team_9876543210_xyz/              # Pedro en otro equipo
        └── dashboard/
            └── ...
```

## 🔄 **Cómo Funciona**

### **1. Identificación Única**
Cada combinación usuario+equipo tiene una carpeta única:
```javascript
const userFolder = `${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}_${teamId}`;
```

### **2. Ejemplos Prácticos**

#### **Usuario: julio@gmail.com**
- **Equipo JULIO** (ID: team_1753299451320_uvuf487th)
  - Filtros específicos para datos de Julio
  - Vistas personalizadas para su trabajo
  - Resúmenes adaptados a sus necesidades

- **Equipo TEST** (ID: team_1234567890_abcdef)
  - Filtros diferentes para pruebas
  - Vistas de desarrollo
  - Configuración de testing

#### **Usuario: maria@gmail.com**
- **Equipo JULIO** (ID: team_1753299451320_uvuf487th)
  - Filtros específicos para datos de María
  - Vistas adaptadas a su rol
  - Configuración independiente de Julio

## 💾 **Datos Guardados por Usuario+Equipo**

### **Configuración Completa Incluye:**
```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "userEmail": "julio@gmail.com",
  "userName": "Julio",
  "teamId": "team_1753299451320_uvuf487th",
  "teamName": "JULIO",
  
  "dashboard": {
    "layout": "custom",
    "widgets": ["filters", "summary", "charts"]
  },
  
  "filters": [
    {
      "field": "status",
      "value": "active",
      "operator": "equals"
    },
    {
      "field": "priority",
      "value": "high",
      "operator": "equals"
    }
  ],
  
  "quickFilters": {
    "urgent": { "status": "urgent" },
    "completed": { "status": "completed" }
  },
  
  "tableViewViews": {
    "default": {
      "columns": ["id", "name", "status", "priority"],
      "sortBy": "name",
      "sortOrder": "asc"
    },
    "detailed": {
      "columns": ["id", "name", "status", "priority", "created", "updated"],
      "sortBy": "created",
      "sortOrder": "desc"
    }
  },
  
  "customSummaries": {
    "totalActive": {
      "type": "count",
      "field": "id",
      "filter": { "status": "active" }
    },
    "highPriority": {
      "type": "count",
      "field": "id",
      "filter": { "priority": "high" }
    }
  },
  
  "columnConfig": {
    "visible": ["id", "name", "status", "priority"],
    "order": ["id", "name", "status", "priority"],
    "width": {
      "id": 80,
      "name": 200,
      "status": 100,
      "priority": 100
    }
  },
  
  "favoritos": ["record_123", "record_456"],
  "theme": "dark",
  "language": "es"
}
```

## 🎯 **Casos de Uso**

### **Caso 1: Usuario con Múltiples Equipos**
**Julio trabaja en 2 equipos:**

1. **Equipo JULIO** (trabajo principal)
   - Filtros para datos de producción
   - Vistas optimizadas para análisis diario
   - Resúmenes de KPIs importantes

2. **Equipo TEST** (desarrollo)
   - Filtros para datos de prueba
   - Vistas de desarrollo
   - Configuración temporal

### **Caso 2: Múltiples Usuarios en el Mismo Equipo**
**Equipo JULIO tiene 2 usuarios:**

1. **Julio** (Administrador)
   - Acceso completo a todos los filtros
   - Vistas administrativas
   - Resúmenes ejecutivos

2. **María** (Analista)
   - Filtros específicos para su área
   - Vistas de análisis
   - Resúmenes operativos

## 🔧 **APIs del Backend**

### **Guardar Configuración**
```javascript
POST /api/dashboard/save
{
  "filename": "dashboard-config-julio@gmail.com-2025-01-15T10-30-00.json",
  "settings": { /* configuración completa */ },
  "teamId": "team_1753299451320_uvuf487th",
  "userEmail": "julio@gmail.com"
}
```

### **Cargar Configuración**
```javascript
GET /api/dashboard/list?teamId=team_1753299451320_uvuf487th&userEmail=julio@gmail.com
```

### **Estructura de Respuesta**
```javascript
{
  "success": true,
  "path": "C:\\Users\\pable\\Documents\\WebMainData\\users\\julio@gmail.com_team_1753299451320_uvuf487th\\dashboard",
  "files": [
    {
      "filename": "dashboard-config-julio@gmail.com-2025-01-15T10-30-00.json",
      "size": 2048,
      "modified": "2025-01-15T10:30:00.000Z",
      "userEmail": "julio@gmail.com"
    }
  ],
  "count": 1
}
```

## 🚀 **Flujo de Usuario**

### **1. Cambiar de Equipo**
1. Usuario hace clic en "Team Management"
2. Selecciona un equipo diferente
3. La aplicación detecta el cambio de equipo
4. Carga automáticamente la configuración específica de ese usuario+equipo

### **2. Guardar Configuración**
1. Usuario configura filtros, vistas, etc.
2. Hace clic en "Save to Backend"
3. Sistema guarda en la carpeta específica: `usuario_equipo/dashboard/`
4. Configuración queda asociada a esa combinación usuario+equipo

### **3. Cargar Configuración**
1. Usuario hace clic en "Load from Backend"
2. Sistema busca en la carpeta específica del usuario+equipo actual
3. Carga la configuración más reciente
4. Aplica filtros, vistas, etc. específicos de ese equipo

## 📊 **Ventajas del Sistema**

### **✅ Separación Completa**
- Cada usuario tiene configuraciones independientes
- Cada equipo tiene configuraciones independientes
- Combinación usuario+equipo es única

### **✅ Flexibilidad**
- Usuario puede tener configuraciones diferentes por equipo
- Fácil cambio entre equipos sin perder configuraciones
- Configuraciones específicas por rol y contexto

### **✅ Escalabilidad**
- Sistema soporta múltiples usuarios
- Sistema soporta múltiples equipos
- Fácil agregar nuevos usuarios o equipos

### **✅ Persistencia**
- Configuraciones se mantienen entre sesiones
- Backup automático por usuario+equipo
- Historial de configuraciones

## 🎉 **Resultado Final**

**Cada usuario puede tener:**
- ✅ Filtros diferentes para cada equipo
- ✅ Vistas personalizadas por equipo
- ✅ Resúmenes específicos por contexto
- ✅ Configuración de columnas independiente
- ✅ Favoritos separados por equipo
- ✅ Tema y preferencias por equipo

**¡La configuración es completamente independiente por usuario y equipo!** 🎯 