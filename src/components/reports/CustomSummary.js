import { getVisibleColumns } from '../../store/index.js';
import { getFilteredData } from '../filters/FilterManager.js';
const XLSX = window.XLSX;

// Lógica de agrupación y métricas
export function groupAndSummarize(data, groupByFields, metrics) {
  const groups = {};
  data.forEach(row => {
    // Crea una clave única combinando los valores de los campos seleccionados
    const groupKey = groupByFields.map(f => row[f] || 'N/A').join(' | ');
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(row);
  });
  return Object.entries(groups).map(([groupValue, rows]) => {
    const summary = {};
    groupByFields.forEach((f, idx) => {
      summary[f] = groupValue.split(' | ')[idx];
    });
    metrics.forEach(metric => {
      if (metric.type === 'count') {
        summary[`Count of ${metric.field}`] = rows.length;
      }
      if (metric.type === 'sum') {
        summary[`Sum of ${metric.field}`] = rows.reduce((acc, r) => acc + (parseFloat(r[metric.field]) || 0), 0);
      }
      if (metric.type === 'avg') {
        summary[`Avg of ${metric.field}`] = rows.length
          ? rows.reduce((acc, r) => acc + (parseFloat(r[metric.field]) || 0), 0) / rows.length
          : 0;
      }
      if (metric.type === 'min') {
        summary[`Min of ${metric.field}`] = Math.min(...rows.map(r => parseFloat(r[metric.field]) || Infinity));
      }
      if (metric.type === 'max') {
        summary[`Max of ${metric.field}`] = Math.max(...rows.map(r => parseFloat(r[metric.field]) || -Infinity));
      }
      if (metric.type === 'unique') {
        summary[`Unique count of ${metric.field}`] = new Set(rows.map(r => r[metric.field])).size;
      }
      if (metric.type === 'concat') {
        // Solo valores no vacíos ni nulos
        const uniqueVals = Array.from(new Set(rows.map(r => (r[metric.field] || '').toString().trim()).filter(v => v)));
        summary[`List of ${metric.field}`] = uniqueVals.length > 0 ? `(${uniqueVals.length}): ${uniqueVals.join(', ')}` : '(sin datos)';
      }
    });
    return summary;
  });
}

const METRICS = [
  { type: 'count', label: 'Count', help: 'Number of records in each group.' },
  { type: 'sum', label: 'Sum', help: 'Sum of values in the selected field.' },
  { type: 'avg', label: 'Average', help: 'Average value of the selected field.' },
  { type: 'min', label: 'Min', help: 'Minimum value in the selected field.' },
  { type: 'max', label: 'Max', help: 'Maximum value in the selected field.' },
  { type: 'unique', label: 'Unique count', help: 'Number of unique values in the selected field.' },
  { type: 'concat', label: 'List unique values', help: 'List of unique values in the selected field.' }
];

function createMetricRow(headers, metric = { type: 'count', field: headers[0] }) {
  const div = document.createElement('div');
  div.className = 'metric-row metric-row-flex';
  div.innerHTML = `
    <label class="metric-label">Type:
      <select class="metric-field-select metric-type-select">
        ${METRICS.map(m => `<option value="${m.type}" ${m.type === metric.type ? 'selected' : ''}>${m.label}</option>`).join('')}
      </select>
    </label>
    <label class="metric-label">Field:
      <select class="metric-field-select metric-value-select">
        ${headers.map(h => `<option value="${h}" ${h === metric.field ? 'selected' : ''}>${h}</option>`).join('')}
      </select>
    </label>
    <button type="button" class="remove-metric-btn" title="Remove metric">×</button>
  `;
  // Choices.js para ambos selects - MISMO ESTILO QUE OTROS DROPDOWNS
  const typeSelect = div.querySelector('.metric-type-select');
  const fieldSelect = div.querySelector('.metric-value-select');
  
  new window.Choices(typeSelect, { 
    searchEnabled: false, 
    shouldSort: false, 
    itemSelectText: '', 
    position: 'bottom',
    removeItemButton: false,
    placeholder: true,
    placeholderValue: 'Select metric type...'
  });
  
  new window.Choices(fieldSelect, { 
    searchEnabled: true, 
    shouldSort: false, 
    itemSelectText: '', 
    position: 'bottom',
    removeItemButton: false,
    placeholder: true,
    placeholderValue: 'Select field...'
  });
  typeSelect.onchange = updatePivotPreview;
  fieldSelect.onchange = updatePivotPreview;
  // Eliminar métrica
  div.querySelector('.remove-metric-btn').onclick = () => {
    div.remove();
    updatePivotPreview();
  };
  return div;
}

export function openSummaryModal() {
  try {
    console.log('🚀 openSummaryModal iniciado');
    const headers = getVisibleColumns();
    console.log('Opening summary modal with headers:', headers);
    
    // --- Rows (Group by) ---
    const rowsSelect = document.getElementById('pivotRowsSelect');
    if (!rowsSelect) {
      console.error('pivotRowsSelect not found');
      return;
    }
    
    rowsSelect.innerHTML = '';
    headers.forEach(h => {
      rowsSelect.innerHTML += `<option value="${h}">${h}</option>`;
    });
    if (rowsSelect._choicesInstance) rowsSelect._choicesInstance.destroy();
    rowsSelect._choicesInstance = new window.Choices(rowsSelect, {
      searchEnabled: true,
      shouldSort: false,
      removeItemButton: true,
      itemSelectText: '',
      position: 'bottom',
      placeholder: true,
      placeholderValue: 'Select fields...'
    });

    // --- Remove Duplicates By ---
    const removeDupSelect = document.getElementById('removeDuplicatesSelect');
    removeDupSelect.innerHTML = '';
    headers.forEach(h => {
      removeDupSelect.innerHTML += `<option value="${h}">${h}</option>`;
    });
    if (removeDupSelect._choicesInstance) removeDupSelect._choicesInstance.destroy();
    removeDupSelect._choicesInstance = new window.Choices(removeDupSelect, {
      searchEnabled: true,
      shouldSort: false,
      removeItemButton: true,
      itemSelectText: '',
      position: 'bottom',
      placeholder: true,
      placeholderValue: 'Select fields...'
    });
    // Por defecto, igual que group by
    setTimeout(() => {
      const groupByFields = rowsSelect._choicesInstance.getValue(true);
      removeDupSelect._choicesInstance.removeActiveItems();
      groupByFields.forEach(val => removeDupSelect._choicesInstance.setChoiceByValue(val));
    }, 100);

    // --- Order By Field ---
    const orderBySelect = document.getElementById('orderBySelect');
    orderBySelect.innerHTML = '';
    headers.forEach(h => {
      orderBySelect.innerHTML += `<option value="${h}">${h}</option>`;
    });
    if (orderBySelect._choicesInstance) orderBySelect._choicesInstance.destroy();
    orderBySelect._choicesInstance = new window.Choices(orderBySelect, {
      searchEnabled: true,
      shouldSort: false,
      removeItemButton: true,
      itemSelectText: '',
      position: 'bottom',
      placeholder: true,
      placeholderValue: 'Select fields to order by...'
    });

    // --- Columns (pivot columns) ---
    const columnsSelect = document.getElementById('pivotColumnsSelect');
    columnsSelect.innerHTML = '';
    headers.forEach(h => {
      columnsSelect.innerHTML += `<option value="${h}">${h}</option>`;
    });
    if (columnsSelect._choicesInstance) columnsSelect._choicesInstance.destroy();
    columnsSelect._choicesInstance = new window.Choices(columnsSelect, {
      searchEnabled: true,
      shouldSort: false,
      removeItemButton: true,
      itemSelectText: '',
      position: 'bottom',
      placeholder: true,
      placeholderValue: 'Select columns...'
    });
    // --- Métricas dinámicas (igual que antes) ---
    const metricsList = document.getElementById('metricsList');
    metricsList.innerHTML = '';
    metricsList.appendChild(createMetricRow(headers, { type: 'concat', field: headers[0] }));
    updatePivotPreview();
    // Listeners para actualizar preview
    rowsSelect.onchange = updatePivotPreview;
    columnsSelect.onchange = updatePivotPreview;
    
    // Configurar botón de cerrar como respaldo
    setTimeout(() => {
      const closeBtn = document.getElementById('closeSummaryModalBtn');
      if (closeBtn) {
        console.log('🔄 Configurando botón de cerrar como respaldo');
        closeBtn.onclick = function(e) {
          console.log('🎯 CLICK en botón cerrar (respaldo)');
          e.preventDefault();
          e.stopPropagation();
          const modal = document.getElementById('summaryModal');
          if (modal) {
            modal.classList.add('hidden');
          }
        };
      }
    }, 100);
    removeDupSelect.onchange = updatePivotPreview;
    document.getElementById('addMetricBtn').onclick = () => {
      metricsList.appendChild(createMetricRow(headers, { type: 'concat', field: headers[0] }));
      updatePivotPreview();
    };
    metricsList.querySelectorAll('select').forEach(el => {
      el.onchange = updatePivotPreview;
    });
    document.getElementById('summaryModal').classList.remove('hidden');
    console.log('📋 Modal abierto, configurando eventos...');
    setupManageSummariesEvents();
    setupSummaryModalEvents();
    console.log('✅ Eventos configurados');
    document.getElementById('resetSummaryBtn').addEventListener('click', resetSummary);
    
    // Forzar conexión del botón Excel después de un delay
    setTimeout(() => {
      console.log('🔧 Forzando conexión del botón Excel después de abrir modal...');
      const excelBtn = document.getElementById('exportSummaryExcelBtn');
      if (excelBtn) {
        console.log('✅ Excel button found in open modal');
        excelBtn.onclick = function(e) {
          console.log('🎯 CLICK DETECTED on Excel button (modal open)!');
          exportCustomSummaryToExcel();
        };
        excelBtn.style.border = '3px solid #00ff00';
        console.log('✅ Botón Excel conectado en modal abierto');
      } else {
        console.error('❌ Botón Excel no encontrado en modal abierto');
      }
    }, 500);
    // --- Conectar botón Reset del modal-footer ---
    setTimeout(() => {
      const resetBtn = document.getElementById('resetSummaryBtn');
      if (resetBtn) resetBtn.onclick = resetSummary;
    }, 0);
  } catch (error) {
    console.error('Error opening summary modal:', error);
  }
}

function getPivotRows() {
  const rowsSelect = document.getElementById('pivotRowsSelect');
  if (rowsSelect && rowsSelect._choicesInstance) {
    return rowsSelect._choicesInstance.getValue(true);
  }
  return Array.from(rowsSelect.selectedOptions).map(opt => opt.value);
}
function getPivotColumn() {
  const columnsSelect = document.getElementById('pivotColumnsSelect');
  if (columnsSelect && columnsSelect._choicesInstance) {
    const values = columnsSelect._choicesInstance.getValue(true);
    return Array.isArray(values) ? values : [values].filter(v => v);
  }
  const value = columnsSelect.value;
  return Array.isArray(value) ? value : [value].filter(v => v);
}

function getOrderByField() {
  const orderBySelect = document.getElementById('orderBySelect');
  if (orderBySelect && orderBySelect._choicesInstance) {
    const values = orderBySelect._choicesInstance.getValue(true);
    return Array.isArray(values) ? values : [values].filter(v => v);
  }
  const value = orderBySelect.value;
  return Array.isArray(value) ? value : [value].filter(v => v);
}

function getRemoveDuplicatesFields() {
  const removeDupSelect = document.getElementById('removeDuplicatesSelect');
  if (removeDupSelect && removeDupSelect._choicesInstance) {
    return removeDupSelect._choicesInstance.getValue(true);
  }
  return Array.from(removeDupSelect.selectedOptions).map(opt => opt.value);
}

function updatePivotPreview() {
  const data = getFilteredData();
  const rows = getPivotRows();
  const col = getPivotColumn();
  const metrics = getSelectedMetrics();
  const orderByField = getOrderByField();
  const html = generatePivotTablePreview(data, rows, col, metrics, orderByField);
  document.getElementById('pivotPreviewContainer').innerHTML = html;
}

// Nueva función unificada que genera los datos y cabeceras de manera consistente
function getSummaryTableDataAndHeaders(data, rows, col, metrics, orderByField, removeDupFields = []) {
  if (!rows.length && (!col || !col.length)) {
    return { headers: [], rowsData: [], totalsRow: [] };
  }

  // Obtener valores únicos de columnas dinámicas
  let colValues = [];
  if (col && col.length > 0) {
    if (col.length === 1) {
      colValues = Array.from(new Set(data.map(r => r[col[0]]).filter(v => v !== undefined && v !== null)));
    } else {
      // Para múltiples columnas, crear combinaciones de valores
      const combinations = new Set();
      data.forEach(row => {
        const combo = col.map(c => row[c] || 'N/A').join(' | ');
        combinations.add(combo);
      });
      colValues = Array.from(combinations);
    }
  }

  // Agrupar datos por filas y columnas
  const groups = {};
  data.forEach(row => {
    const rowKey = rows.map(f => row[f] || 'N/A').join(' | ');
    let colKey = '';
    if (col && col.length > 0) {
      if (col.length === 1) {
        colKey = row[col[0]] || 'N/A';
      } else {
        colKey = col.map(c => row[c] || 'N/A').join(' | ');
      }
    }
    if (!groups[rowKey]) groups[rowKey] = {};
    if (!groups[rowKey][colKey]) groups[rowKey][colKey] = [];
    groups[rowKey][colKey].push(row);
  });

  const groupEntries = Object.entries(groups);

  // Generar cabeceras
  const headers = [...rows];
  if (col && col.length > 0) {
    colValues.forEach(v => {
      metrics.forEach(m => {
        headers.push(`${v} (${getMetricLabel(m)})`);
      });
    });
  } else {
    metrics.forEach(m => {
      headers.push(getMetricLabel(m));
    });
  }

  // Generar filas de datos
  let rowsData = groupEntries.map(([rowKey, cols]) => {
    const rowVals = rowKey.split(' | ');
    let rowArr = [...rowVals];
    
    if (col && col.length > 0) {
      colValues.forEach(colVal => {
        metrics.forEach(m => {
          const rowsArr = (cols[colVal] || []);
          rowArr.push(calcMetricPreview(rowsArr, m));
        });
      });
    } else {
      metrics.forEach(m => {
        const rowsArr = Object.values(cols).flat();
        rowArr.push(calcMetricPreview(rowsArr, m));
      });
    }
    return rowArr;
  });

  // Eliminar duplicados según selección
  if (rowsData && rowsData.length && removeDupFields.length > 0) {
    rowsData = removeDuplicatesFromRows(rowsData, headers, removeDupFields);
  }

  // Ordenar los grupos si se especificó un campo de orden
  if (orderByField && headers.includes(orderByField)) {
    const idx = headers.indexOf(orderByField);
    rowsData.sort((a, b) => {
      const valA = a[idx];
      const valB = b[idx];
      if (!isNaN(Date.parse(valA)) && !isNaN(Date.parse(valB))) {
        return new Date(valA) - new Date(valB);
      }
      return (valA || '').toString().localeCompare((valB || '').toString());
    });
  }

  // Calcular totales para métricas numéricas
  let totalsRow = Array(headers.length).fill('');
  let startIdx = rows.length;
  metrics.forEach((m, i) => {
    if (["sum", "count", "avg", "min", "max"].includes(m.type)) {
      let values = rowsData.map(r => parseFloat(r[startIdx + i])).filter(v => !isNaN(v));
      if (m.type === "sum" || m.type === "count") totalsRow[startIdx + i] = values.reduce((a, b) => a + b, 0);
      if (m.type === "avg") totalsRow[startIdx + i] = values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2) : '';
      if (m.type === "min") totalsRow[startIdx + i] = values.length ? Math.min(...values) : '';
      if (m.type === "max") totalsRow[startIdx + i] = values.length ? Math.max(...values) : '';
    }
  });
  
  if (totalsRow.some(v => v !== '')) {
    totalsRow[0] = 'Total';
  }

  return { headers, rowsData, totalsRow };
}

function generatePivotTablePreview(data, rows, col, metrics, orderByField) {
  if (!rows.length && (!col || !col.length)) return '<div style="color:#888;">Select at least one row or column field.</div>';
  
  const removeDupFields = getRemoveDuplicatesFields();
  const { headers, rowsData, totalsRow } = getSummaryTableDataAndHeaders(data, rows, col, metrics, orderByField, removeDupFields);
  
  // Limitar preview a los primeros 5 grupos
  const maxRows = 5;
  const displayRows = rowsData.slice(0, maxRows);
  
  let html = '<table class="pivot-preview-table"><thead><tr>';
  headers.forEach(h => { html += `<th>${h}</th>`; });
  html += '</tr></thead><tbody>';
  
  displayRows.forEach(rowArr => {
    html += '<tr>' + rowArr.map(cell => `<td>${cell}</td>`).join('') + '</tr>';
  });
  
  // Mostrar totales si existen y hay datos
  if (totalsRow.some(v => v !== '') && rowsData.length > 0) {
    html += '<tr style="font-weight:bold;background:#f5f5f5;">' + totalsRow.map(cell => `<td>${cell}</td>`).join('') + '</tr>';
  }
  
  html += '</tbody></table>';
  
  if (rowsData.length > maxRows) {
    html += `<div style='font-size:0.97em;color:#888;margin-top:0.5em;'>Showing first ${maxRows} groups only.</div>`;
  }
  
  return html;
}

function getMetricLabel(m) {
  if (m.type === 'concat') {
    if (m.field.toLowerCase().includes('booking')) return 'Bookings';
    if (m.field.toLowerCase().includes('container')) return 'Containers';
    return `Unique ${m.field}`;
  }
  if (m.type === 'unique') return `Unique count of ${m.field}`;
  if (m.type === 'count') return `Count of ${m.field}`;
  if (m.type === 'sum') return `Sum of ${m.field}`;
  if (m.type === 'avg') return `Average of ${m.field}`;
  if (m.type === 'min') return `Min of ${m.field}`;
  if (m.type === 'max') return `Max of ${m.field}`;
  return `${m.type} of ${m.field}`;
}

function calcMetricPreview(rowsArr, metric) {
  if (!rowsArr || !rowsArr.length) return '';
  if (metric.type === 'count') return rowsArr.length;
  if (metric.type === 'sum') return rowsArr.reduce((acc, r) => acc + (parseFloat(r[metric.field]) || 0), 0);
  if (metric.type === 'avg') return rowsArr.length ? (rowsArr.reduce((acc, r) => acc + (parseFloat(r[metric.field]) || 0), 0) / rowsArr.length).toFixed(2) : 0;
  if (metric.type === 'min') return Math.min(...rowsArr.map(r => parseFloat(r[metric.field]) || Infinity));
  if (metric.type === 'max') return Math.max(...rowsArr.map(r => parseFloat(r[metric.field]) || -Infinity));
  if (metric.type === 'unique') return new Set(rowsArr.map(r => r[metric.field])).size;
  if (metric.type === 'concat') {
    const uniqueVals = Array.from(new Set(rowsArr.map(r => (r[metric.field] || '').toString().trim()).filter(v => v)));
    return uniqueVals.length > 0 ? uniqueVals.join(', ') : '(sin datos)';
  }
  return '';
}

function getSelectedMetrics() {
  return Array.from(document.querySelectorAll('.metric-row')).map(row => ({
    type: row.querySelector('.metric-type-select').value,
    field: row.querySelector('.metric-value-select').value
  }));
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function showSummaryPDF(resumen, groupByFields, metrics, orderByField = groupByFields[0]) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait' });
  // Márgenes personalizados
  const marginLeft = 18;
  const marginRight = 192; // 210 (A4 width) - 18
  const contentWidth = marginRight - marginLeft;
  // Cargar logo y dibujar en la esquina superior izquierda
  const logoUrl = 'LOGOTAB_rounded.png';
  const addLogoAndTitle = (callback) => {
    const marginLeft = 18;
    const img = new window.Image();
    img.src = logoUrl;
    img.onload = function() {
      // Logo cuadrado y pequeño
      const logoHeight = 12;
      const logoWidth = 12;
      const logoY = 10;
      const logoX = marginLeft;
      doc.addImage(img, 'PNG', logoX, logoY, logoWidth, logoHeight);
      // Texto alineado verticalmente al centro del logo
      doc.setFontSize(10);
      doc.setTextColor(25, 118, 210);
      doc.text('The Bridge', logoX + logoWidth + 4, logoY + logoHeight / 2 + 4);
      callback();
    };
    img.onerror = function() {
      doc.setFontSize(10);
      doc.setTextColor(25, 118, 210);
      doc.text('The Bridge', marginLeft, 16);
      callback();
    };
  };
  addLogoAndTitle(() => {
    doc.setFontSize(18);
    doc.setTextColor(0,0,0);
    doc.text('Custom Summary', marginLeft, 30);
    doc.setFontSize(12);
    doc.text(`Grouped by: ${groupByFields.join(', ')}`, marginLeft, 38);
    let y = 48;
    // Ordenar resumen por el campo especificado
    const sortedResumen = [...resumen].sort((a, b) => {
      const valA = a[orderByField];
      const valB = b[orderByField];
      // Si es fecha, ordenar como fecha, si no, como string
      if (!isNaN(Date.parse(valA)) && !isNaN(Date.parse(valB))) {
        return new Date(valA) - new Date(valB);
      }
      return (valA || '').toString().localeCompare((valB || '').toString());
    });
    sortedResumen.forEach(group => {
      // Título de grupo en azul y negrita
      doc.setTextColor(25, 118, 210);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      const groupTitle = groupByFields.map(f => `${f}: ${group[f]}`).join(' | ');
      doc.text(groupTitle, marginLeft, y, { maxWidth: contentWidth });
      y += 8;
      // Métricas en negro y normal
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      metrics.forEach(m => {
        const label = `${m.type.toUpperCase()} of ${m.field}`;
        // Buscar la clave exacta generada en groupAndSummarize
        let key = '';
        if (m.type === 'concat') key = `List of ${m.field}`;
        else key = `${capitalize(m.type)} of ${m.field}`;
        let value = group[key] !== undefined ? group[key] : '';
        if (m.type === 'concat' && value) {
          doc.setFont('helvetica', 'bold');
          let [count, ...rest] = value.split(':');
          let list = rest.join(':').trim();
          doc.text(`${label} (${count.trim()})`, marginLeft + 6, y, { maxWidth: contentWidth - 6 });
          y += 6;
          if (list.length > 0) {
            const items = list.split(', ').map(v => v.trim()).filter(Boolean);
            items.forEach(item => {
              doc.text(`• ${item}`, marginLeft + 10, y, { maxWidth: contentWidth - 10 });
              y += 5;
            });
          }
          doc.setFont('helvetica', 'normal');
        } else {
          doc.text(`${label}: ${value}`, marginLeft + 6, y, { maxWidth: contentWidth - 6 });
        }
        y += 7;
      });
      // Separador visual
      doc.setDrawColor(200, 200, 200);
      doc.line(marginLeft, y, marginRight, y);
      y += 4;
      if (y > 270) { doc.addPage(); y = 20; }
    });
    doc.save('custom-summary.pdf');
  });
}

function exportCustomSummaryToExcel() {
  try {
    console.log('[CustomSummary] Export to Excel iniciado');
    if (!window.XLSX) {
      console.error('[CustomSummary] ❌ XLSX no está disponible');
      alert('Error: La librería XLSX no está cargada. Por favor, recarga la página.');
    return;
  }
    const XLSX = window.XLSX;
    // Obtener configuración actual del resumen
    const data = getFilteredData();
  const rows = getPivotRows();
  const col = getPivotColumn();
  const metrics = getSelectedMetrics();
  const orderByField = getOrderByField();
    const removeDupFields = getRemoveDuplicatesFields();
    // Obtener datos y cabeceras unificados
    const { headers, rowsData, totalsRow } = getSummaryTableDataAndHeaders(data, rows, col, metrics, orderByField, removeDupFields);
    // Preparar datos para exportar
    let finalRowsData = [...rowsData];
    if (totalsRow && totalsRow.some(v => v !== '')) {
      finalRowsData.push(totalsRow);
    }
    if (!headers.length || !finalRowsData.length) {
      console.warn('[CustomSummary] No hay datos para exportar');
      alert('No hay datos para exportar a Excel.');
      return;
    }
    const ws_data = [headers, ...finalRowsData];
    console.log('[CustomSummary] Datos para Excel:', ws_data);
  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Summary');
    const filename = `custom_summary_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
    console.log('[CustomSummary] Excel exportado exitosamente:', filename);
  } catch (error) {
    console.error('[CustomSummary] Error al exportar a Excel:', error);
    alert(`Error al exportar a Excel: ${error.message}`);
  }
}

function exportPivotToPDF() {
  // Usar la función unificada para obtener datos consistentes
  const rows = getPivotRows();
  const col = getPivotColumn();
  const metrics = getSelectedMetrics();
  const orderByField = getOrderByField();
  const data = getFilteredData();
  const removeDupFields = getRemoveDuplicatesFields();
  
  const { headers, rowsData, totalsRow } = getSummaryTableDataAndHeaders(data, rows, col, metrics, orderByField, removeDupFields);
  
  // Agregar fila de totales si existe
  let finalRowsData = [...rowsData];
  if (totalsRow.some(v => v !== '')) {
    finalRowsData.push(totalsRow);
  }
  
  // Exportar con jsPDF/autoTable
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait' });
  // Leyenda de filtros
  const legend = getActiveFiltersLegend();
  // Cargar logo y dibujar en la esquina superior izquierda
  const logoUrl = 'LOGOTAB_rounded.png';
  const addLogoAndTitle = (callback) => {
    const marginLeft = 18;
    const img = new window.Image();
    img.src = logoUrl;
    img.onload = function() {
      // Logo cuadrado y pequeño
      const logoHeight = 12;
      const logoWidth = 12;
      const logoY = 10;
      const logoX = marginLeft;
      doc.addImage(img, 'PNG', logoX, logoY, logoWidth, logoHeight);
      // Texto alineado verticalmente al centro del logo
      doc.setFontSize(10);
      doc.setTextColor(25, 118, 210);
      doc.text('The Bridge', logoX + logoWidth + 4, logoY + logoHeight / 2 + 4);
      // Leyenda de filtros
      if (legend) {
        doc.setFontSize(11);
        doc.setTextColor(25, 118, 210);
        doc.text(legend, marginLeft, logoY + logoHeight + 12, { maxWidth: 180 });
      }
      callback();
    };
    img.onerror = function() {
      doc.setFontSize(10);
      doc.setTextColor(25, 118, 210);
      doc.text('The Bridge', marginLeft, 16);
      if (legend) {
        doc.setFontSize(11);
        doc.setTextColor(25, 118, 210);
        doc.text(legend, marginLeft, 28, { maxWidth: 180 });
      }
      callback();
    };
  };
  addLogoAndTitle(() => {
    doc.autoTable({
      head: [headers],
      body: finalRowsData,
      startY: 40,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [24, 58, 86], textColor: [255,255,255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 244, 250] },
      margin: { left: 14, right: 14 }
    });
    doc.save('custom-summary.pdf');
  });
}

function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

// Asignar a los botones
export function setupSummaryModalEvents() {
  console.log('setupSummaryModalEvents ejecutado');
  
  // Verificar y conectar botón de Excel
  const excelBtn = document.getElementById('exportSummaryExcelBtn');
  if (!excelBtn) {
    console.error('❌ No se encontró el botón Export to Excel (id=exportSummaryExcelBtn)');
    
    // Buscar todos los botones para debug
    const allButtons = document.querySelectorAll('button');
    console.log('🔍 Todos los botones encontrados:');
    allButtons.forEach((btn, index) => {
      console.log(`${index}: id="${btn.id}", text="${btn.textContent.trim()}"`);
    });
    
    // Intentar conectar después de un delay
    setTimeout(() => {
      console.log('🔄 Reintentando conexión del botón Excel...');
      const retryBtn = document.getElementById('exportSummaryExcelBtn');
      if (retryBtn) {
        console.log('✅ Button found on retry');
        retryBtn.onclick = function(e) {
          console.log('🎯 CLICK DETECTED on Excel button (retry)!');
          exportCustomSummaryToExcel();
        };
        retryBtn.style.border = '3px solid #00ff00';
        console.log('✅ Botón conectado en reintento');
      } else {
        console.error('❌ Botón no encontrado en reintento');
      }
    }, 1000);
    
  } else {
    console.log('✅ Botón Export to Excel encontrado:', excelBtn);
    console.log('📝 Texto del botón:', excelBtn.textContent);
    console.log('🏷️ ID del botón:', excelBtn.id);
    
    // Limpiar eventos previos
    excelBtn.onclick = null;
    excelBtn.removeEventListener('click', exportCustomSummaryToExcel);
    
    // Asignar nuevo evento
    excelBtn.onclick = function(e) {
              console.log('🎯 CLICK DETECTED on Excel button!');
      console.log('Evento:', e);
      exportCustomSummaryToExcel();
    };
    
    // Test adicional: verificar que el evento se asignó
    console.log('🔗 Evento onclick asignado:', typeof excelBtn.onclick);
    
    // Test visual: cambiar color del botón para confirmar que lo encontramos
    excelBtn.style.border = '2px solid #ff0000';
    setTimeout(() => {
      excelBtn.style.border = '';
    }, 2000);
  }
  
  // Verificar y conectar botón de PDF
  const pdfBtn = document.getElementById('generateSummaryBtn');
  if (!pdfBtn) {
    console.error('No se encontró el botón Generate PDF (id=generateSummaryBtn)');
  } else {
    console.log('Botón Generate PDF encontrado, asignando evento');
    pdfBtn.onclick = exportPivotToPDF;
  }
  
  // Verificar y conectar botón de View
  const viewBtn = document.getElementById('viewSummaryBtn');
  if (!viewBtn) {
    console.error('No se encontró el botón View summary (id=viewSummaryBtn)');
  } else {
    console.log('Botón View summary encontrado, asignando evento');
    viewBtn.onclick = openCopySummaryModal;
  }

  // Cierre al hacer click en el overlay (blur)
  const summaryModal = document.getElementById('summaryModal');
  if (summaryModal) {
    summaryModal.addEventListener('mousedown', function(e) {
      if (e.target === summaryModal) {
        summaryModal.classList.add('hidden');
      }
    });
  }
  
  // Configurar botón de cerrar del modal
  const closeSummaryModalBtn = document.getElementById('closeSummaryModalBtn');
  if (closeSummaryModalBtn) {
    console.log('✅ Configurando botón de cerrar del summary modal');
    
    // Limpiar eventos previos
    closeSummaryModalBtn.onclick = null;
    closeSummaryModalBtn.removeEventListener('click', closeSummaryModal);
    
    // Asignar nuevo evento
    closeSummaryModalBtn.onclick = function(e) {
      console.log('🎯 CLICK en botón cerrar del summary modal');
      e.preventDefault();
      e.stopPropagation();
      if (summaryModal) {
        summaryModal.classList.add('hidden');
      }
    };
    
    // También agregar event listener como respaldo
    closeSummaryModalBtn.addEventListener('click', function(e) {
      console.log('🎯 CLICK (addEventListener) en botón cerrar del summary modal');
      e.preventDefault();
      e.stopPropagation();
      if (summaryModal) {
        summaryModal.classList.add('hidden');
      }
    });
    
    console.log('✅ Botón de cerrar configurado correctamente');
  } else {
    console.error('❌ No se encontró el botón de cerrar del summary modal (closeSummaryModalBtn)');
  }
  
  // Función para cerrar el modal
  function closeSummaryModal() {
    console.log('🔒 Cerrando summary modal');
    if (summaryModal) {
      summaryModal.classList.add('hidden');
    }
  }
  
  // Hacer la función disponible globalmente
  window.closeSummaryModal = closeSummaryModal;
  
  // Configurar botón de cerrar del copy summary modal como respaldo
  const closeCopySummaryModalBtn = document.getElementById('closeCopySummaryModalBtn');
  if (closeCopySummaryModalBtn) {
    console.log('✅ Configurando botón de cerrar del copy summary modal (respaldo)');
    
    // Limpiar eventos previos
    closeCopySummaryModalBtn.onclick = null;
    closeCopySummaryModalBtn.removeEventListener('click', closeCopySummaryModal);
    
    // Asignar nuevo evento
    closeCopySummaryModalBtn.onclick = function(e) {
      console.log('🎯 CLICK en botón cerrar del copy summary modal (respaldo)');
      e.preventDefault();
      e.stopPropagation();
      const modal = document.getElementById('copySummaryModal');
      if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
      }
    };
    
    // También agregar event listener como respaldo
    closeCopySummaryModalBtn.addEventListener('click', function(e) {
      console.log('🎯 CLICK (addEventListener) en botón cerrar del copy summary modal (respaldo)');
      e.preventDefault();
      e.stopPropagation();
      const modal = document.getElementById('copySummaryModal');
      if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
      }
    });
    
    console.log('✅ Botón de cerrar del copy summary modal configurado correctamente (respaldo)');
  } else {
    console.error('❌ No se encontró el botón de cerrar del copy summary modal (closeCopySummaryModalBtn) en respaldo');
  }
  
  // Función para cerrar el copy summary modal
  function closeCopySummaryModal() {
    console.log('🔒 Cerrando copy summary modal (respaldo)');
    const modal = document.getElementById('copySummaryModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
  }
  
  // Hacer la función disponible globalmente
  window.closeCopySummaryModal = closeCopySummaryModal;
  
  // Test adicional: verificar que XLSX está disponible
  setTimeout(() => {
    if (window.XLSX) {
      console.log('✅ XLSX está disponible:', typeof window.XLSX);
      
      // Agregar función de test global
      window.testExcelDownload = function() {
        console.log('🧪 Test de descarga Excel iniciado');
        try {
          const testData = [
            ['Nombre', 'Edad', 'Ciudad'],
            ['Juan', 25, 'Madrid'],
            ['Ana', 30, 'Barcelona'],
            ['Carlos', 35, 'Valencia']
          ];
          
          const ws = XLSX.utils.aoa_to_sheet(testData);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Test');
          
          const filename = `test_excel_${Date.now()}.xlsx`;
          XLSX.writeFile(wb, filename);
          
          console.log('✅ Test Excel exitoso:', filename);
        } catch (error) {
          console.error('❌ Error en test:', error);
        }
      };
      
      console.log('🧪 Función de test disponible: testExcelDownload()');
      
      // Función para forzar la conexión del botón
      window.forceConnectExcelButton = function() {
        console.log('🔧 Forzando conexión del botón Excel...');
        const excelBtn = document.getElementById('exportSummaryExcelBtn');
        if (excelBtn) {
          console.log('✅ Button found, connecting...');
          excelBtn.onclick = function(e) {
            console.log('🎯 FORCED CLICK on Excel button!');
            exportCustomSummaryToExcel();
          };
          excelBtn.style.border = '3px solid #00ff00';
          console.log('✅ Botón conectado y marcado en verde');
        } else {
          console.log('❌ Botón no encontrado');
        }
      };
      
      // Función para conectar todos los botones de Excel
      window.connectAllExcelButtons = function() {
        console.log('🔧 Conectando todos los botones de Excel...');
        const allExcelBtns = document.querySelectorAll('[id*="Excel"], [id*="excel"]');
        console.log('🔍 Botones encontrados:', allExcelBtns.length);
        
        allExcelBtns.forEach((btn, index) => {
          console.log(`${index}: ${btn.id} - "${btn.textContent}"`);
          btn.onclick = function(e) {
            console.log(`🎯 CLICK en botón ${btn.id}!`);
            exportCustomSummaryToExcel();
          };
          btn.style.border = '2px solid #ff00ff';
        });
        
        console.log('✅ Todos los botones de Excel conectados');
      };
      
      console.log('🔧 Función de conexión disponible: forceConnectExcelButton()');
      
    } else {
      console.error('❌ XLSX no está disponible');
    }
  }, 1000);
}

function getActiveFiltersLegend() {
  try {
    const active = window.getModuleActiveFilters ? window.getModuleActiveFilters() : {};
    const values = window.getModuleFilterValues ? window.getModuleFilterValues() : {};
    const legend = Object.entries(active).map(([col, type]) => {
      const val = values[col];
      if (val === undefined || val === null || (Array.isArray(val) && val.length === 0)) return null;
      if (Array.isArray(val)) return `${col}: ${val.join(', ')}`;
      if (type === 'date') {
        const start = values[`${col}_start`];
        const end = values[`${col}_end`];
        const empty = values[`${col}_empty`];
        let parts = [];
        if (start) parts.push(`≥ ${start}`);
        if (end) parts.push(`≤ ${end}`);
        if (empty) parts.push('(empty)');
        return `${col}: ${parts.join(' & ')}`;
      }
      return `${col}: ${val}`;
    }).filter(Boolean);
    return legend.length ? `Filters applied: ` + legend.join(' | ') : '';
  } catch { return ''; }
}

function openCopySummaryModal() {
  console.log('openCopySummaryModal ejecutado');
  // Leyenda de filtros
  const legend = getActiveFiltersLegend();
  
  // Usar la función unificada para obtener datos consistentes
  const rows = getPivotRows();
  const col = getPivotColumn();
  const metrics = getSelectedMetrics();
  const orderByField = getOrderByField();
  const data = getFilteredData();
  const removeDupFields = getRemoveDuplicatesFields();
  
  const { headers, rowsData, totalsRow } = getSummaryTableDataAndHeaders(data, rows, col, metrics, orderByField, removeDupFields);
  
  // Agregar fila de totales si existe
  let finalRowsData = [...rowsData];
  if (totalsRow.some(v => v !== '')) {
    finalRowsData.push(totalsRow);
  }
  
  // Generar tabla HTML visual
  let html = '';
  if (legend) html += `<div style="margin-bottom:0.7em;font-size:1.08em;color:#1976d2;font-weight:600;">${legend}</div>`;
  html += '<div style="max-width:100vw;overflow-x:auto;"><table style="border-collapse:collapse;width:100%;font-size:1em;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,0.07);">';
  html += '<thead><tr>' + headers.map(h => `<th style=\"border:1px solid rgba(0,0,0,0.1);padding:8px 10px;background:#E3F2FD;color:#000000;\">${h}</th>`).join('') + '</tr></thead>';
  html += '<tbody>';
  finalRowsData.forEach(rowArr => {
    html += '<tr>' + rowArr.map(cell => `<td style=\"border:1px solid #b3c6e6;padding:8px 10px;\">${cell}</td>`).join('') + '</tr>';
  });
  html += '</tbody></table></div>';
  document.getElementById('copySummaryContent').innerHTML = html;
  
  // Mostrar modal visual
  const modal = document.getElementById('copySummaryModal');
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
  
  // Si no hay datos
  if (!finalRowsData || !finalRowsData.length) {
    document.getElementById('copySummaryContent').innerHTML = '<div style="color:#d32f2f;padding:1em;">No data to copy.</div>';
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    
    // Configurar botones incluso cuando no hay datos
    setTimeout(() => {
      setupCopyModalButtons();
    }, 100);
    return;
  }
  
  // Configurar botones del modal de copia
  setTimeout(() => {
    setupCopyModalButtons();
  }, 100);
}

// Función para configurar los botones del modal de copia
function setupCopyModalButtons() {
  console.log('🔧 Configurando botones del modal de copia');
  
  // Configurar botón de cerrar
    const closeBtn = document.getElementById('closeCopySummaryModalBtn');
  if (closeBtn) {
    console.log('✅ Configurando botón de cerrar del copy summary modal');
    
    // Limpiar eventos previos
    closeBtn.onclick = null;
    closeBtn.removeEventListener('click', closeCopySummaryModal);
    
    // Asignar nuevo evento
    closeBtn.onclick = function(e) {
      console.log('🎯 CLICK en botón cerrar del copy summary modal');
      e.preventDefault();
      e.stopPropagation();
      const modal = document.getElementById('copySummaryModal');
      if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
      }
    };
    
    // También agregar event listener como respaldo
    closeBtn.addEventListener('click', function(e) {
      console.log('🎯 CLICK (addEventListener) en botón cerrar del copy summary modal');
      e.preventDefault();
      e.stopPropagation();
        const modal = document.getElementById('copySummaryModal');
      if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
      }
    });
    
    console.log('✅ Botón de cerrar del copy summary modal configurado correctamente');
  } else {
    console.error('❌ No se encontró el botón de cerrar del copy summary modal (closeCopySummaryModalBtn)');
  }
  
  // Configurar botón de copia
  const copyBtn = document.getElementById('copySummaryToClipboardBtn');
  if (copyBtn) {
    console.log('✅ Configurando botón de copia del copy summary modal');
          
    // Limpiar eventos previos
    copyBtn.onclick = null;
    copyBtn.removeEventListener('click', copySummaryToClipboard);
          
    // Asignar nuevo evento
    copyBtn.onclick = copySummaryToClipboard;
    
    console.log('✅ Botón de copia del copy summary modal configurado correctamente');
        } else {
    console.error('❌ No se encontró el botón de copia del copy summary modal (copySummaryToClipboardBtn)');
  }
  
  // Función para cerrar el copy summary modal
  function closeCopySummaryModal() {
    console.log('🔒 Cerrando copy summary modal');
    const modal = document.getElementById('copySummaryModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
        }
  }
  
  // Función para copiar al portapapeles
  async function copySummaryToClipboard() {
    console.log('🎯 CLICK en botón de copia');
    
    try {
      // Obtener datos del modal
      const modal = document.getElementById('copySummaryModal');
      const content = document.getElementById('copySummaryContent');
      
      if (!content || content.textContent === 'No data to copy.') {
        // Mostrar notificación de error
        if (typeof window.showUnifiedNotification === 'function') {
          window.showUnifiedNotification('No data available to copy.', 'error');
        }
        return;
      }
      
      // Crear versión TSV para fallback
      const table = content.querySelector('table');
      if (!table) {
        if (typeof window.showUnifiedNotification === 'function') {
          window.showUnifiedNotification('No table data found to copy.', 'error');
        }
        return;
      }
      
      // Extraer datos de la tabla
      const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent);
      const rows = Array.from(table.querySelectorAll('tbody tr')).map(row => 
        Array.from(row.querySelectorAll('td')).map(td => td.textContent)
      );
      
          let tsv = '';
          tsv += headers.join('\t') + '\n';
      rows.forEach(rowArr => {
            tsv += rowArr.join('\t') + '\n';
          });
          
      // Intentar copiar usando la API moderna
      try {
        await navigator.clipboard.writeText(tsv);
        
        // Mostrar notificación de éxito
        if (typeof window.showUnifiedNotification === 'function') {
          window.showUnifiedNotification('Summary copied to clipboard successfully!', 'success');
        }
        
        // Cambiar texto del botón temporalmente
        const btn = document.getElementById('copySummaryToClipboardBtn');
        if (btn) {
          btn.textContent = 'Copied!';
          btn.style.background = '#388e3c';
          setTimeout(() => { 
            btn.textContent = 'Copy to clipboard'; 
            btn.style.background = ''; 
          }, 2000);
        }
        
      } catch (clipboardError) {
        // Fallback: método tradicional
          const textarea = document.createElement('textarea');
          textarea.value = tsv;
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          
        // Mostrar notificación de éxito
        if (typeof window.showUnifiedNotification === 'function') {
          window.showUnifiedNotification('Summary copied to clipboard successfully!', 'success');
        }
        
        // Cambiar texto del botón temporalmente
        const btn = document.getElementById('copySummaryToClipboardBtn');
        if (btn) {
          btn.textContent = 'Copied!';
          btn.style.background = '#388e3c';
          setTimeout(() => { 
            btn.textContent = 'Copy to clipboard'; 
            btn.style.background = ''; 
          }, 2000);
        }
      }
      
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      
      // Mostrar notificación de error
      if (typeof window.showUnifiedNotification === 'function') {
        window.showUnifiedNotification('Failed to copy summary to clipboard. Please try again.', 'error');
      }
    }
  }
  
    // Hacer las funciones disponibles globalmente
  window.closeCopySummaryModal = closeCopySummaryModal;
  window.copySummaryToClipboard = copySummaryToClipboard;
}

// --- Gestión de Summaries ---
const SUMMARY_STORAGE_KEY = 'customSummaries';
function getSavedSummaries() {
  try {
    return JSON.parse(localStorage.getItem(SUMMARY_STORAGE_KEY)) || {};
  } catch { return {}; }
}
function saveSummaries(summaries) {
  localStorage.setItem(SUMMARY_STORAGE_KEY, JSON.stringify(summaries));
  
  // Trigger auto-save
  if (typeof window.triggerAutoSave === 'function') {
    window.triggerAutoSave();
  }
}
function getCurrentSummaryConfig() {
  return {
    rows: getPivotRows(),
    col: getPivotColumn(),
    orderBy: getOrderByField(),
    metrics: getSelectedMetrics(),
    removeDuplicates: getRemoveDuplicatesFields()
  };
}
function applySummaryConfig(cfg) {
  // Set rows
  const rowsSelect = document.getElementById('pivotRowsSelect');
  rowsSelect._choicesInstance.removeActiveItems();
  (cfg.rows || []).forEach(val => rowsSelect._choicesInstance.setChoiceByValue(val));
  // Set columns
  const colSelect = document.getElementById('pivotColumnsSelect');
  colSelect._choicesInstance.removeActiveItems();
  if (cfg.col) {
    if (Array.isArray(cfg.col)) {
      cfg.col.forEach(val => colSelect._choicesInstance.setChoiceByValue(val));
    } else {
      colSelect._choicesInstance.setChoiceByValue(cfg.col);
    }
  }
  // Set order by
  const orderBySelect = document.getElementById('orderBySelect');
  orderBySelect._choicesInstance.removeActiveItems();
  if (cfg.orderBy) {
    if (Array.isArray(cfg.orderBy)) {
      cfg.orderBy.forEach(val => orderBySelect._choicesInstance.setChoiceByValue(val));
    } else {
      orderBySelect._choicesInstance.setChoiceByValue(cfg.orderBy);
    }
  }
  // Set remove duplicates
  const removeDupSelect = document.getElementById('removeDuplicatesSelect');
  removeDupSelect._choicesInstance.removeActiveItems();
  (cfg.removeDuplicates || []).forEach(val => removeDupSelect._choicesInstance.setChoiceByValue(val));
  // Set metrics
  const headers = getVisibleColumns();
  const metricsList = document.getElementById('metricsList');
  metricsList.innerHTML = '';
  (cfg.metrics || []).forEach(m => {
    metricsList.appendChild(createMetricRow(headers, m));
  });
  updatePivotPreview();
}
function promptSaveSummary() {
  const name = prompt('Enter a name for this summary:');
  if (!name) return;
  const summaries = getSavedSummaries();
  summaries[name] = getCurrentSummaryConfig();
  saveSummaries(summaries);
  alert('Summary saved!');
}
function openManageSummariesModal() {
  const modal = document.getElementById('manageSummariesModal');
  const list = document.getElementById('savedSummariesList');
  const summaries = getSavedSummaries();
  list.innerHTML = '';
  Object.entries(summaries).forEach(([name, cfg]) => {
    const item = document.createElement('div');
    item.className = 'saved-view-item';
    const summaryName = document.createElement('span');
    summaryName.className = 'saved-view-name';
    summaryName.textContent = name;
    const actions = document.createElement('div');
    actions.className = 'saved-view-actions';
    // Apply button
    const applyBtn = document.createElement('button');
    applyBtn.className = 'modal-btn primary';
    applyBtn.textContent = 'Apply';
    applyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      applySummaryConfig(cfg);
      modal.classList.add('hidden');
      modal.style.display = 'none';
    });
    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'view-delete-btn';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`Are you sure you want to delete the summary "${name}"?`)) {
        delete summaries[name];
        saveSummaries(summaries);
        openManageSummariesModal();
      }
    });
    actions.appendChild(applyBtn);
    actions.appendChild(deleteBtn);
    item.appendChild(summaryName);
    item.appendChild(actions);
    // Click on name applies and closes
    item.addEventListener('click', (ev) => {
      if (ev.target === applyBtn || ev.target === deleteBtn) return;
      applySummaryConfig(cfg);
      modal.classList.add('hidden');
      modal.style.display = 'none';
    });
    list.appendChild(item);
  });
  // If no summaries, show message
  if (Object.keys(summaries).length === 0) {
    const message = document.createElement('div');
    message.className = 'no-views-message';
    message.textContent = 'No saved summaries';
    list.appendChild(message);
  }
  document.getElementById('summaryRenameSection').style.display = 'none';
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
}
function showRenameSection(oldName) {
  const input = document.getElementById('renameSummaryInput');
  input.value = oldName;
  document.getElementById('summaryRenameSection').style.display = '';
  input.focus();
  document.getElementById('confirmRenameSummaryBtn').onclick = function() {
    const newName = input.value.trim();
    if (!newName) return;
    const summaries = getSavedSummaries();
    if (summaries[newName]) { alert('Name already exists.'); return; }
    summaries[newName] = summaries[oldName];
    delete summaries[oldName];
    saveSummaries(summaries);
    openManageSummariesModal();
  };
}
function setupManageSummariesEvents() {
  console.log('setupManageSummariesEvents ejecutado');
  const saveBtn = document.getElementById('saveSummaryBtn');
  if (saveBtn) saveBtn.onclick = promptSaveSummary;
  const manageBtn = document.getElementById('manageSummariesBtn');
  if (manageBtn) {
    manageBtn.onclick = () => {
      console.log('Click en Manage Summaries');
      const modal = document.getElementById('manageSummariesModal');
      if (modal) {
        openManageSummariesModal();
      }
    };
  }
  const closeBtn = document.getElementById('closeManageSummariesBtn');
  if (closeBtn) closeBtn.onclick = () => {
    document.getElementById('manageSummariesModal').classList.add('hidden');
    document.getElementById('manageSummariesModal').style.display = 'none';
  };
}
document.addEventListener('DOMContentLoaded', setupManageSummariesEvents);

function removeDuplicatesFromRows(rowsData, headers, fields) {
  if (!fields.length) return rowsData;
  const idxs = fields.map(f => headers.indexOf(f)).filter(i => i >= 0);
  const seen = new Set();
  return rowsData.filter(row => {
    const key = idxs.map(i => row[i]).join('||');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function resetSummary() {
  const rowsSelect = document.getElementById('pivotRowsSelect');
  const columnsSelect = document.getElementById('pivotColumnsSelect');
  const removeDupSelect = document.getElementById('removeDuplicatesSelect');
  const orderBySelect = document.getElementById('orderBySelect');
  const metricsList = document.getElementById('metricsList');
  const headers = window.getVisibleColumns ? window.getVisibleColumns() : [];

  if (rowsSelect && rowsSelect._choicesInstance) rowsSelect._choicesInstance.removeActiveItems();
  if (columnsSelect && columnsSelect._choicesInstance) columnsSelect._choicesInstance.removeActiveItems();
  if (removeDupSelect && removeDupSelect._choicesInstance) removeDupSelect._choicesInstance.removeActiveItems();
  if (orderBySelect && orderBySelect._choicesInstance) orderBySelect._choicesInstance.removeActiveItems();
  if (metricsList && headers.length) {
    metricsList.innerHTML = '';
    metricsList.appendChild(createMetricRow(headers, { type: 'concat', field: headers[0] }));
  }
  if (typeof updatePivotPreview === 'function') updatePivotPreview();
} 

// --- DELEGACIÓN GLOBAL DE EVENTOS PARA EXPORT EXCEL ---
(function delegateExportExcelClick() {
  const modal = document.getElementById('summaryModal');
  if (!modal) return;
  modal.addEventListener('click', function(e) {
    const btn = e.target.closest('#exportSummaryExcelBtn');
    if (btn) {
      e.preventDefault();
      e.stopPropagation();
              console.log('🎯 CLICK DETECTED by delegation on Excel button');
      exportCustomSummaryToExcel();
    }
  }, true);
  console.log('✅ Delegación de click para Export to Excel activada');
})(); 