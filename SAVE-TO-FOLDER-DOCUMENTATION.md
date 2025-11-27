# 📁 Save to Folder - Documentación Completa

## 🎯 ¿Qué guarda el botón "Save to Folder"?

El botón **"Save to Folder"** guarda **TODA** la configuración de tu aplicación The Bridge en un archivo JSON. Aquí está la lista completa:

### 📋 **Información del Usuario y Equipo**
```json
{
  "userInfo": {
    "email": "usuario@ejemplo.com",
    "name": "Nombre del Usuario",
    "teamId": "team-123",
    "teamName": "Nombre del Equipo"
  }
}
```

### 👥 **Configuración de Equipos**
```json
{
  "teams": [
    // Todos los equipos del usuario
  ],
  "currentTeam": {
    // Equipo actualmente seleccionado
  }
}
```

### 🔍 **Filtros y Búsquedas**
```json
{
  "filters": {
    // Filtros aplicados actualmente
  },
  "quickFilters": {
    // Filtros rápidos guardados
  }
}
```

### 📊 **Vistas de Tabla**
```json
{
  "tableViews": {
    // Todas las vistas de tabla personalizadas
  },
  "currentTableView": "nombre-vista-actual"
}
```

### 📋 **Configuración de Columnas**
```json
{
  "columnConfig": {
    // Configuración de todas las columnas
  },
  "visibleColumns": [
    // Columnas visibles actualmente
  ],
  "columnOrder": [
    // Orden de las columnas
  ]
}
```

### 📈 **Resúmenes Personalizados**
```json
{
  "customSummaries": {
    // Todos los resúmenes personalizados creados
  }
}
```

### ⭐ **Favoritos**
```json
{
  "favorites": [
    // Elementos marcados como favoritos
  ]
}
```

### 🎨 **Configuración de Tema e Idioma**
```json
{
  "theme": "dark", // o "light"
  "language": "es" // o "en"
}
```

### ⚙️ **Configuración de Auto-save**
```json
{
  "autoSave": true // o false
}
```

### 🌐 **Configuración de Backend**
```json
{
  "backendUrl": "https://the-bridge-9g01.onrender.com"
}
```

### 📅 **Metadatos**
```json
{
  "timestamp": "2025-01-24T12:00:00.000Z",
  "version": "1.0",
  "description": "Configuration exported from The Bridge for Usuario (usuario@ejemplo.com) in team Equipo"
}
```

## 🔄 **¿Cómo funciona?**

### **1. Al hacer click en "Save to Folder":**
1. ✅ Recopila toda la información del usuario actual
2. ✅ Obtiene todos los datos del localStorage
3. ✅ Incluye configuración de equipos, filtros, vistas, etc.
4. ✅ Crea un archivo JSON con timestamp
5. ✅ Descarga automáticamente el archivo

### **2. Al hacer click en "Load from Folder":**
1. ✅ Abre selector de archivos
2. ✅ Valida que sea un archivo JSON válido
3. ✅ Aplica toda la configuración
4. ✅ Recarga la página para aplicar cambios

## 🎯 **Casos de Uso**

### **✅ Para Usuarios Registrados:**
- Guarda toda su configuración personal
- Incluye equipos, filtros, vistas personalizadas
- Mantiene preferencias de tema e idioma

### **✅ Para Usuarios Guest:**
- Guarda configuración temporal
- Incluye filtros y vistas creadas
- Mantiene preferencias de interfaz

## 📁 **Nombre del Archivo**

El archivo se guarda con el formato:
```
the-bridge-config-{email}-{teamId}-{timestamp}.json
```

**Ejemplo:**
```
the-bridge-config-usuario@ejemplo.com-team-123-2025-01-24T12-00-00-000Z.json
```

## 🔧 **Sobre el Botón "Enable Guest Access"**

### **¿Por qué aparece?**
El botón "Enable Guest Access" aparece cuando:
- No hay equipos creados
- No hay usuario actual o equipo actual

### **¿Qué hace?**
Permite a usuarios no registrados acceder a funcionalidades del backend.

### **¿Por qué lo ocultamos?**
- Causa confusión en la interfaz
- No es necesario para la mayoría de usuarios
- La funcionalidad guest ya está disponible sin este botón

## ✅ **Resumen**

**El botón "Save to Folder" guarda TODO:**
- ✅ Configuración completa del usuario
- ✅ Todos los equipos y equipos actuales
- ✅ Filtros y búsquedas personalizadas
- ✅ Vistas de tabla personalizadas
- ✅ Configuración de columnas
- ✅ Resúmenes personalizados
- ✅ Favoritos
- ✅ Preferencias de tema e idioma
- ✅ Configuración de auto-save
- ✅ URL del backend
- ✅ Metadatos completos

**Es un backup completo de toda tu configuración en The Bridge!** 🚀 