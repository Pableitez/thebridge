// CustomColumnManager.js
// Gestor de columnas personalizadas para la tabla

import { getCurrentHeaders, setVisibleColumns, getVisibleColumns, getOriginalData } from '../../store/index.js';
import { displayTable } from '../table/Table.js';

function getHeaderHash(headers) {
  let hash = 0, i, chr;
  const str = headers.join('||');
  for (i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash.toString();
}

class CustomColumnManager {
  constructor() {
    this.customColumns = [];
    this.loadCustomColumns();
  }

  getStorageKey() {
    const headers = getCurrentHeaders();
    const hash = getHeaderHash(headers);
    return `customColumns_${hash}`;
  }

  saveCustomColumns() {
    localStorage.setItem(this.getStorageKey(), JSON.stringify(this.customColumns));
    
    // Trigger auto-save
    if (typeof window.triggerAutoSave === 'function') {
      window.triggerAutoSave();
    }
  }

  loadCustomColumns() {
    try {
      const key = this.getStorageKey();
      const saved = localStorage.getItem(key);
      this.customColumns = saved ? JSON.parse(saved) : [];
    } catch {
      this.customColumns = [];
    }
  }

  addNewColumn() {
    // Evitar duplicados: comprobar si ya existe una columna con el mismo nombre
    const headers = getCurrentHeaders();
    let newHeader = 'New Column';
    let count = 1;
    while (headers.includes(newHeader)) {
      newHeader = `New Column ${++count}`;
    }
    // Crear la nueva columna personalizada
    const newColumn = {
      header: newHeader,
      type: 'text',
      values: []
    };
    this.customColumns.push(newColumn);
    this.saveCustomColumns();
    // Actualizar columnas visibles solo si no existe
    const visibleColumns = getVisibleColumns();
    if (!visibleColumns.includes(newHeader)) {
      setVisibleColumns([...visibleColumns, newHeader]);
    }
    // Forzar refresco de la tabla
    const data = getOriginalData();
    if (data && data.length > 0) {
      displayTable(data);
      }
  }

  updateColumnHeader(th, newHeader) {
    const index = Array.from(th.parentNode.children).indexOf(th);
    if (index >= 0 && this.customColumns[index]) {
      this.customColumns[index].header = newHeader;
      this.saveCustomColumns();
    }
  }

  updateColumnType(th, newType) {
    const index = Array.from(th.parentNode.children).indexOf(th);
    if (index >= 0 && this.customColumns[index]) {
      this.customColumns[index].type = newType;
      this.saveCustomColumns();
    }
  }

  deleteColumn(th) {
    const index = Array.from(th.parentNode.children).indexOf(th);
    if (index >= 0) {
      // Eliminar del DOM
      th.remove();
      const tbody = document.querySelector('.data-table tbody');
      const rows = tbody.querySelectorAll('tr');
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells[index]) cells[index].remove();
      });

      // Eliminar de customColumns
      this.customColumns.splice(index, 1);
      this.saveCustomColumns();

      // Actualizar columnas visibles
      const visibleColumns = getVisibleColumns();
      visibleColumns.splice(index, 1);
      setVisibleColumns(visibleColumns);
    }
  }

  saveCellValue(cell, value, rowIndex) {
    const colIndex = Array.from(cell.parentNode.children).indexOf(cell);
    if (rowIndex >= 0 && colIndex >= 0 && this.customColumns[colIndex]) {
      if (!this.customColumns[colIndex].values) {
        this.customColumns[colIndex].values = [];
      }
      this.customColumns[colIndex].values[rowIndex] = value;
      this.saveCustomColumns();
    }
  }

  recalculateFormulas() {
    // Recalcula todas las fórmulas de columnas personalizadas
    const table = document.querySelector('.data-table');
    if (!table) return;
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
      const rows = tbody.querySelectorAll('tr');
    this.customColumns.forEach((col, colIndex) => {
      if (!col.values) return;
      col.values.forEach((val, rowIndex) => {
        if (typeof val === 'string' && val.startsWith('=')) {
          // Evaluar la fórmula
          const formula = val.slice(1);
          const row = rows[rowIndex];
          if (!row) return;
          // Construir contexto de variables: {colName: value}
          const context = {};
          Array.from(row.children).forEach((cell, i) => {
            const header = (table.querySelector('thead tr').children[i] || {}).innerText || `COL${i+1}`;
            context[header.trim()] = cell.querySelector('input') ? cell.querySelector('input').value : cell.textContent;
          });
          let result = '';
          try {
            // Reemplazar nombres de columna por valores
            let expr = formula;
            Object.entries(context).forEach(([k, v]) => {
              const safeK = k.replace(/[^a-zA-Z0-9_]/g, '_');
              expr = expr.replaceAll(new RegExp(`\b${k}\b`, 'g'), v || 0);
            });
            // Evaluar expresión matemática simple
            // eslint-disable-next-line no-eval
            result = eval(expr);
          } catch {
            result = '#ERROR';
          }
          // Actualizar el input de la celda
          const cell = row.children[colIndex];
          if (cell && cell.querySelector('input')) {
            cell.querySelector('input').value = result;
        }
        }
      });
    });
  }

  getCustomColumns() {
    return this.customColumns;
  }
}

// Exportar instancia única
export const customColumnManager = new CustomColumnManager();

// Exportar función helper
export function getCurrentCustomColumns() {
  return customColumnManager.getCustomColumns();
} 