# 🔧 Configuración Backend - Local vs Render

## 🎯 **Objetivo**
Configurar la aplicación para que funcione tanto en desarrollo local como en producción (Render).

## 📋 **Configuración Actual**

### **Backend Local (Desarrollo)**
- **URL**: `http://localhost:3000`
- **Puerto**: 3000
- **Archivos**: `C:\Users\pable\Documents\WebMainData`
- **Uso**: Desarrollo y pruebas locales

### **Backend Render (Producción)**
- **URL**: `https://the-bridge-9g01.onrender.com`
- **Puerto**: Automático (Render)
- **Archivos**: `/tmp/WebMainData` (temporal)
- **Uso**: Producción y acceso desde internet

## 🔄 **Cómo Cambiar Entre Entornos**

### **Opción 1: Cambio Manual en el Código**

En `index.html`, cambiar la URL del backend:

```javascript
// Para desarrollo local
window.backendUrl = 'http://localhost:3000';

// Para producción (Render)
window.backendUrl = 'https://the-bridge-9g01.onrender.com';
```

### **Opción 2: Configuración Automática (Recomendada)**

Vamos a implementar detección automática del entorno:

```javascript
// Detectar automáticamente el entorno
function getBackendUrl() {
    // Si estamos en localhost, usar backend local
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }
    // Si estamos en GitHub Pages o producción, usar Render
    else {
        return 'https://the-bridge-9g01.onrender.com';
    }
}

window.backendUrl = getBackendUrl();
```

## 🧪 **Pruebas**

### **1. Probar en Local**
1. Iniciar backend local: `cd backend && npm start`
2. Abrir `index.html` en navegador
3. Verificar que use `localhost:3000`
4. Probar funcionalidades de configuración

### **2. Probar en Render**
1. Abrir `https://pableitez.github.io/web-main/`
2. Verificar que use `https://the-bridge-9g01.onrender.com`
3. Probar funcionalidades de configuración

### **3. Archivo de Prueba**
Usar `test-user-config.html` para probar ambos entornos:
- Cambiar URL en el campo "Backend URL"
- Probar todas las funciones
- Verificar resultados

## 📁 **Estructura de Archivos**

### **Local**
```
C:\Users\pable\Documents\WebMainData\
├── users\
│   └── usuario_teamId\
│       └── dashboard\
│           ├── dashboard-config-usuario-2024-01-15T10-30-00.json
│           └── ...
├── versions\
├── backups\
└── exports\
```

### **Render**
```
/tmp/WebMainData\
├── users\
│   └── usuario_teamId\
│       └── dashboard\
│           ├── dashboard-config-usuario-2024-01-15T10-30-00.json
│           └── ...
├── versions\
├── backups\
└── exports\
```

## ⚙️ **Configuración Automática**

Vamos a implementar la detección automática en el código principal:

```javascript
// En index.html - Función de detección automática
function initializeBackendConfig() {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        // Desarrollo local
        window.backendUrl = 'http://localhost:3000';
        console.log('🔧 Modo desarrollo: usando backend local');
    } else {
        // Producción (GitHub Pages, etc.)
        window.backendUrl = 'https://the-bridge-9g01.onrender.com';
        console.log('🚀 Modo producción: usando backend Render');
    }
    
    console.log('Backend URL configurada:', window.backendUrl);
}

// Llamar al inicializar
initializeBackendConfig();
```

## 🚀 **Deployment**

### **Para Desarrollo Local:**
1. Iniciar backend: `cd backend && npm start`
2. Abrir `index.html` en navegador
3. Funciona automáticamente con `localhost:3000`

### **Para Producción:**
1. Subir cambios a GitHub
2. GitHub Pages se actualiza automáticamente
3. La aplicación detecta que está en producción
4. Usa automáticamente `https://the-bridge-9g01.onrender.com`

## 🔍 **Verificación**

### **Comandos de Verificación:**

```bash
# Verificar backend local
curl http://localhost:3000/health

# Verificar backend Render
curl https://the-bridge-9g01.onrender.com/health

# Verificar puertos en uso
netstat -an | grep 3000
```

### **Logs de Verificación:**

En la consola del navegador deberías ver:
- **Local**: `🔧 Modo desarrollo: usando backend local`
- **Producción**: `🚀 Modo producción: usando backend Render`

## 🎯 **Próximos Pasos**

1. ✅ Implementar detección automática de entorno
2. ✅ Probar en ambos entornos
3. ✅ Documentar configuración
4. ✅ Crear archivo de prueba
5. 🔄 Deploy a producción
6. 🔄 Verificar funcionamiento en Render

## 📝 **Notas Importantes**

- **Local**: Más rápido, archivos persistentes, ideal para desarrollo
- **Render**: Accesible desde internet, archivos temporales, ideal para producción
- **Detección automática**: La aplicación se adapta al entorno automáticamente
- **Fallback**: Si un backend falla, mostrar mensaje de error apropiado 