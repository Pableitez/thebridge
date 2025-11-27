# Reorganización del Sistema CSS - The Bridge

## 🎯 Objetivo
Crear un sistema de diseño unificado y mantenible que elimine conflictos y garantice consistencia visual en toda la aplicación.

## 📁 Nueva Estructura de Archivos CSS

### Orden de Carga (CRÍTICO - NO MODIFICAR)

```
1. 00-design-system.css          → Variables CSS (PRIMERO)
2. common.css                     → Estilos base
3. layout.css                     → Layout general
4. sidebar-scroll.css             → Sidebar
5. table.css                      → Tablas
6. filters.css                    → Filtros
7. columns.css                    → Columnas
8. modals.css                     → Modales base
9. customColumns.css              → Columnas personalizadas
10. custom-columns.css            → Columnas personalizadas (legacy)
11. customSummary.css             → Resúmenes
12. dashboard.css                 → Dashboard
13. dq-hub.css                    → DQ Hub
14. ops-hub.css                   → Ops Hub
15. modals-glassmorphism.css       → Efectos glassmorphism
16. excel-dropdown-fix.css         → Fixes dropdowns
17. dashboard-charts.css           → Gráficos dashboard
18. analytics.css                  → Analytics
19. dashboard-override.css         → Overrides dashboard
20. force-light-blue-theme.css     → Tema azul claro
21. unified-color-palette.css      → Paleta unificada (legacy)
22. unified-scrollbars-buttons.css → Scrollbars y botones
23. 99-master-override.css         → Override maestro (ÚLTIMO)
```

## 🎨 Sistema de Variables CSS

### Archivo: `00-design-system.css`

Este archivo define **TODAS** las variables CSS centralizadas usando el prefijo `--tb-` (The Bridge).

#### Variables Principales:

- **Fondos**: `--tb-bg-primary`, `--tb-bg-secondary`, `--tb-bg-hover`, etc.
- **Textos**: `--tb-text-primary`, `--tb-text-secondary`, `--tb-text-muted`, etc.
- **Bordes**: `--tb-border-color`, `--tb-border-hover`, `--tb-border-active`, etc.
- **Componentes**: Botones, inputs, modales, sidebar, tabla
- **Espaciado**: `--tb-spacing-xs` a `--tb-spacing-xxl`
- **Sombras**: `--tb-shadow-sm` a `--tb-shadow-xl`
- **Transiciones**: `--tb-transition-fast`, `--tb-transition-normal`, `--tb-transition-slow`

#### Compatibilidad Legacy:

El archivo también mapea las variables antiguas (`--unified-*`) a las nuevas para mantener compatibilidad con código existente.

## 🔧 Master Override

### Archivo: `99-master-override.css`

Este archivo se carga **ÚLTIMO** y fuerza la aplicación del sistema de diseño en **TODOS** los elementos usando selectores de máxima especificidad y `!important`.

#### Funciones:

1. **Forzar paleta de colores** en todos los elementos
2. **Unificar botones** (sidebar, modales, bienvenida)
3. **Eliminar fondos oscuros** y textos blancos
4. **Unificar modales** y botones de cerrar
5. **Forzar estilos de tabla** y contenedores

## 📋 Reglas de Uso

### ✅ HACER:

1. **Usar variables CSS** del sistema de diseño:
   ```css
   .mi-componente {
     background: var(--tb-bg-primary);
     color: var(--tb-text-primary);
     border: 1px solid var(--tb-border-color);
   }
   ```

2. **Cargar archivos en el orden correcto** (ver lista arriba)

3. **Usar prefijo `--tb-`** para nuevas variables

4. **Documentar** estilos complejos o específicos

### ❌ NO HACER:

1. **NO crear nuevas variables** fuera de `00-design-system.css`
2. **NO usar colores hardcodeados** (#1a2332, #0A1929, white, #fff, etc.)
3. **NO usar `!important`** a menos que sea absolutamente necesario
4. **NO modificar** `99-master-override.css` sin revisar impacto global
5. **NO cambiar el orden** de carga de archivos CSS

## 🔍 Resolución de Conflictos

### Si un estilo no se aplica:

1. Verificar que el archivo CSS se carga en el orden correcto
2. Verificar que se está usando la variable CSS correcta
3. Verificar que `99-master-override.css` no está sobrescribiendo
4. Usar selectores más específicos si es necesario

### Si hay conflictos entre archivos:

1. Revisar el orden de carga
2. Mover el estilo conflictivo a `99-master-override.css` si es global
3. Usar especificidad de selectores en lugar de `!important`

## 🚀 Migración de Código Existente

### Paso 1: Reemplazar colores hardcodeados

**Antes:**
```css
.mi-elemento {
  background: #1a2332;
  color: white;
}
```

**Después:**
```css
.mi-elemento {
  background: var(--tb-bg-primary);
  color: var(--tb-text-primary);
}
```

### Paso 2: Reemplazar variables antiguas

**Antes:**
```css
.mi-elemento {
  background: var(--unified-bg-primary);
}
```

**Después:**
```css
.mi-elemento {
  background: var(--tb-bg-primary);
}
```

*(Nota: Las variables `--unified-*` siguen funcionando por compatibilidad)*

## 📊 Beneficios

1. **Consistencia visual** en toda la aplicación
2. **Mantenibilidad** - Cambios centralizados en variables
3. **Escalabilidad** - Fácil agregar nuevos componentes
4. **Rendimiento** - Menos conflictos y reglas duplicadas
5. **Documentación** - Sistema claro y documentado

## 🔄 Próximos Pasos

1. Migrar gradualmente código existente a usar variables CSS
2. Eliminar estilos duplicados entre archivos
3. Reducir uso de `!important` usando mejor especificidad
4. Consolidar archivos CSS relacionados cuando sea posible

## 📝 Notas

- El archivo `99-master-override.css` tiene **máxima prioridad** y se carga último
- Las variables `--unified-*` se mantienen por compatibilidad pero se recomienda usar `--tb-*`
- El orden de carga es **crítico** - no modificar sin revisar impacto


















