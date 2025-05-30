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
    <label>
      <select class="metric-field-select metric-type-select">
        ${METRICS.map(m => `<option value="${m.type}" ${m.type === metric.type ? 'selected' : ''}>${m.label}</option>`).join('')}
      </select>
    </label>
    <select class="metric-field-select metric-value-select">
      ${headers.map(h => `<option value="${h}" ${h === metric.field ? 'selected' : ''}>${h}</option>`).join('')}
    </select>
    <button type="button" class="remove-metric-btn" title="Remove metric">×</button>
  `;
  // Choices.js para ambos selects
  const typeSelect = div.querySelector('.metric-type-select');
  const fieldSelect = div.querySelector('.metric-value-select');
  new window.Choices(typeSelect, { searchEnabled: false, shouldSort: false, itemSelectText: '', position: 'bottom' });
  new window.Choices(fieldSelect, { searchEnabled: true, shouldSort: false, itemSelectText: '', position: 'bottom' });
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
  const headers = getVisibleColumns();
  // --- Rows (Group by) ---
  const rowsSelect = document.getElementById('pivotRowsSelect');
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
  orderBySelect.innerHTML = '<option value="">(None)</option>';
  headers.forEach(h => {
    orderBySelect.innerHTML += `<option value="${h}">${h}</option>`;
  });
  if (orderBySelect._choicesInstance) orderBySelect._choicesInstance.destroy();
  orderBySelect._choicesInstance = new window.Choices(orderBySelect, {
    searchEnabled: true,
    shouldSort: false,
    removeItemButton: false,
    itemSelectText: '',
    position: 'bottom',
    placeholder: true,
    placeholderValue: 'Select field to order by...'
  });

  // --- Columns (pivot columns) ---
  const columnsSelect = document.getElementById('pivotColumnsSelect');
  columnsSelect.innerHTML = '<option value="">(None)</option>';
  headers.forEach(h => {
    columnsSelect.innerHTML += `<option value="${h}">${h}</option>`;
  });
  if (columnsSelect._choicesInstance) columnsSelect._choicesInstance.destroy();
  columnsSelect._choicesInstance = new window.Choices(columnsSelect, {
    searchEnabled: true,
    shouldSort: false,
    removeItemButton: false,
    itemSelectText: '',
    position: 'bottom',
    placeholder: true,
    placeholderValue: 'Select column...'
  });
  // --- Métricas dinámicas (igual que antes) ---
  const metricsList = document.getElementById('metricsList');
  metricsList.innerHTML = '';
  metricsList.appendChild(createMetricRow(headers, { type: 'concat', field: headers[0] }));
  updatePivotPreview();
  // Listeners para actualizar preview
  rowsSelect.onchange = updatePivotPreview;
  columnsSelect.onchange = updatePivotPreview;
  removeDupSelect.onchange = updatePivotPreview;
  document.getElementById('addMetricBtn').onclick = () => {
    metricsList.appendChild(createMetricRow(headers, { type: 'concat', field: headers[0] }));
    updatePivotPreview();
  };
  metricsList.querySelectorAll('select').forEach(el => {
    el.onchange = updatePivotPreview;
  });
  document.getElementById('summaryModal').classList.remove('hidden');
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
    return columnsSelect._choicesInstance.getValue(true);
  }
  return columnsSelect.value;
}

function getOrderByField() {
  const orderBySelect = document.getElementById('orderBySelect');
  if (orderBySelect && orderBySelect._choicesInstance) {
    return orderBySelect._choicesInstance.getValue(true);
  }
  return orderBySelect.value;
}

function getRemoveDuplicatesFields() {
  const removeDupSelect = document.getElementById('removeDuplicatesSelect');
  if (removeDupSelect && removeDupSelect._choicesInstance) {
    return removeDupSelect._choicesInstance.getValue(true);
  }
  return Array.from(removeDupSelect.selectedOptions).map(opt => opt.value);
}

function updatePivotPreview() {
  const rows = getPivotRows();
  const col = getPivotColumn();
  const orderByField = getOrderByField();
  const metrics = getSelectedMetrics();
  const data = getFilteredData();
  const container = document.getElementById('pivotPreviewContainer');
  // Generar tabla dinámica
  const html = generatePivotTablePreview(data, rows, col, metrics, orderByField);
  container.innerHTML = html;
}

function generatePivotTablePreview(data, rows, col, metrics, orderByField) {
  if (!rows.length && !col) return '<div style="color:#888;">Select at least one row or column field.</div>';
  // Obtener valores únicos de columna dinámica
  let colValues = [];
  if (col) {
    colValues = Array.from(new Set(data.map(r => r[col]).filter(v => v !== undefined && v !== null)));
  }
  // Agrupar datos por filas y columnas
  const groups = {};
  data.forEach(row => {
    const rowKey = rows.map(f => row[f] || 'N/A').join(' | ');
    const colKey = col ? (row[col] || 'N/A') : '';
    if (!groups[rowKey]) groups[rowKey] = {};
    if (!groups[rowKey][colKey]) groups[rowKey][colKey] = [];
    groups[rowKey][colKey].push(row);
  });
  // Limitar preview a los primeros 5 grupos
  const groupEntries = Object.entries(groups);
  const maxRows = 5; // Solo para previsualización
  let html = '<table class="pivot-preview-table"><thead><tr>';
  rows.forEach(r => { html += `<th>${r}</th>`; });
  if (col) colValues.forEach(v => { metrics.forEach(m => { html += `<th>${v} <span style='color:#888;font-size:0.95em;'>(${getMetricLabel(m)})</span></th>`; }); });
  else metrics.forEach(m => { html += `<th>${getMetricLabel(m)}</th>`; });
  html += '</tr></thead><tbody>';
  groupEntries.slice(0, maxRows).forEach(([rowKey, cols]) => {
    const rowVals = rowKey.split(' | ');
    html += '<tr>' + rowVals.map(v => `<td>${v}</td>`).join('');
    if (col) {
      colValues.forEach(colVal => {
        metrics.forEach(m => {
          const rowsArr = (cols[colVal] || []);
          html += `<td>${calcMetricPreview(rowsArr, m)}</td>`;
        });
      });
    } else {
      metrics.forEach(m => {
        const rowsArr = Object.values(cols).flat();
        html += `<td>${calcMetricPreview(rowsArr, m)}</td>`;
      });
    }
    html += '</tr>';
  });
  html += '</tbody></table>';
  if (groupEntries.length > maxRows) {
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
  const logoUrl = 'src/assets/logo.png';
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

export function exportSummaryToExcel(resumen, groupByFields, metrics) {
  const headers = [...groupByFields, ...metrics.map(m => `${capitalize(m.type)} of ${m.field}`)];
  let rows = resumen.map(group =>
    headers.map(h => group[h] !== undefined ? group[h] : '')
  );
  // Eliminar duplicados según selección
  const removeDupFieldsExcel1 = getRemoveDuplicatesFields();
  rows = removeDuplicatesFromRows(rows, headers, removeDupFieldsExcel1);
  // Totales
  let totalsRow = Array(headers.length).fill('');
  let startIdx = groupByFields.length;
  metrics.forEach((m, i) => {
    if (["sum","count","avg","min","max"].includes(m.type)) {
      let values = rows.map(r => parseFloat(r[startIdx + i])).filter(v => !isNaN(v));
      if (m.type === "sum" || m.type === "count") totalsRow[startIdx + i] = values.reduce((a,b) => a+b, 0);
      if (m.type === "avg") totalsRow[startIdx + i] = values.length ? (values.reduce((a,b) => a+b, 0)/values.length).toFixed(2) : '';
      if (m.type === "min") totalsRow[startIdx + i] = values.length ? Math.min(...values) : '';
      if (m.type === "max") totalsRow[startIdx + i] = values.length ? Math.max(...values) : '';
    }
  });
  if (totalsRow.some(v => v !== '')) totalsRow[0] = 'Total';
  if (totalsRow.some(v => v !== '')) rows.push(totalsRow);
  if (!rows.length || !headers.length) {
    alert('No hay datos para exportar a Excel.');
    return;
  }
  const ws_data = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Summary');
  XLSX.writeFile(wb, 'custom-summary.xlsx');
}

// Añadir funciones para exportar la tabla pivot a PDF y Excel
function exportPivotToExcel() {
  const rows = getPivotRows();
  const col = getPivotColumn();
  const metrics = getSelectedMetrics();
  const data = getFilteredData();
  // Generar la misma estructura que la preview
  let colValues = [];
  if (col) {
    colValues = Array.from(new Set(data.map(r => r[col]).filter(v => v !== undefined && v !== null)));
  }
  const groups = {};
  data.forEach(row => {
    const rowKey = rows.map(f => row[f] || 'N/A').join(' | ');
    const colKey = col ? (row[col] || 'N/A') : '';
    if (!groups[rowKey]) groups[rowKey] = {};
    if (!groups[rowKey][colKey]) groups[rowKey][colKey] = [];
    groups[rowKey][colKey].push(row);
  });
  const groupEntries = Object.entries(groups);
  // Cabecera
  const headers = [...rows];
  if (col) colValues.forEach(v => { metrics.forEach(m => { headers.push(`${v} (${getMetricLabel(m)})`); }); });
  else metrics.forEach(m => { headers.push(getMetricLabel(m)); });
  // Filas
  const rowsData = groupEntries.map(([rowKey, cols]) => {
    const rowVals = rowKey.split(' | ');
    let rowArr = [...rowVals];
    if (col) {
      colValues.forEach(colVal => {
        metrics.forEach(m => {
          const rowsArr = (cols[colVal] || []);
          rowArr.push(stripHtml(calcMetricPreview(rowsArr, m)));
        });
      });
    } else {
      metrics.forEach(m => {
        const rowsArr = Object.values(cols).flat();
        rowArr.push(stripHtml(calcMetricPreview(rowsArr, m)));
      });
    }
    return rowArr;
  });
  // Eliminar duplicados según selección
  const removeDupFieldsExcel1 = getRemoveDuplicatesFields();
  rowsData = removeDuplicatesFromRows(rowsData, headers, removeDupFieldsExcel1);
  // Exportar con XLSX
  const ws_data = [headers, ...rowsData];
  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pivot');
  XLSX.writeFile(wb, 'pivot-table.xlsx');
}
function exportPivotToPDF() {
  const rows = getPivotRows();
  const col = getPivotColumn();
  const metrics = getSelectedMetrics();
  const orderByField = getOrderByField();
  const data = getFilteredData();
  let colValues = [];
  if (col) {
    colValues = Array.from(new Set(data.map(r => r[col]).filter(v => v !== undefined && v !== null)));
  }
  const groups = {};
  data.forEach(row => {
    const rowKey = rows.map(f => row[f] || 'N/A').join(' | ');
    const colKey = col ? (row[col] || 'N/A') : '';
    if (!groups[rowKey]) groups[rowKey] = {};
    if (!groups[rowKey][colKey]) groups[rowKey][colKey] = [];
    groups[rowKey][colKey].push(row);
  });
  const groupEntries = Object.entries(groups);
  // Cabecera
  const headers = [...rows];
  if (col) colValues.forEach(v => { metrics.forEach(m => { headers.push(`${v} (${getMetricLabel(m)})`); }); });
  else metrics.forEach(m => { headers.push(getMetricLabel(m)); });
  // Filas
  let rowsData = groupEntries.map(([rowKey, cols]) => {
    const rowVals = rowKey.split(' | ');
    let rowArr = [...rowVals];
    if (col) {
      colValues.forEach(colVal => {
        metrics.forEach(m => {
          const rowsArr = (cols[colVal] || []);
          rowArr.push(stripHtml(calcMetricPreview(rowsArr, m)));
        });
      });
    } else {
      metrics.forEach(m => {
        const rowsArr = Object.values(cols).flat();
        rowArr.push(stripHtml(calcMetricPreview(rowsArr, m)));
      });
    }
    return rowArr;
  });
  // Eliminar duplicados según selección
  const removeDupFieldsPDF1 = getRemoveDuplicatesFields();
  if (rowsData && rowsData.length) {
    rowsData = removeDuplicatesFromRows(rowsData, headers, removeDupFieldsPDF1);
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
    if (["sum","count","avg","min","max"].includes(m.type)) {
      let values = rowsData.map(r => parseFloat(r[startIdx + i])).filter(v => !isNaN(v));
      if (m.type === "sum" || m.type === "count") totalsRow[startIdx + i] = values.reduce((a,b) => a+b, 0);
      if (m.type === "avg") totalsRow[startIdx + i] = values.length ? (values.reduce((a,b) => a+b, 0)/values.length).toFixed(2) : '';
      if (m.type === "min") totalsRow[startIdx + i] = values.length ? Math.min(...values) : '';
      if (m.type === "max") totalsRow[startIdx + i] = values.length ? Math.max(...values) : '';
    }
  });
  if (totalsRow.some(v => v !== '')) totalsRow[0] = 'Total';
  if (totalsRow.some(v => v !== '')) rowsData.push(totalsRow);
  // Exportar con jsPDF/autoTable
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait' });
  // Cargar logo y dibujar en la esquina superior izquierda
  const logoUrl = 'src/assets/logo.png';
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
    doc.autoTable({
      head: [headers],
      body: rowsData,
      startY: 26,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [24, 58, 86], textColor: [255,255,255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 244, 250] },
      margin: { left: 14, right: 14 }
    });
    doc.save('pivot-table.pdf');
  });
}
function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}
// Asignar a los botones
export function setupSummaryModalEvents() {
  document.getElementById('generateSummaryBtn').onclick = exportPivotToPDF;
  document.getElementById('exportSummaryExcelBtn').onclick = exportPivotToExcel;
  // Botón para copiar resumen
  document.getElementById('copySummaryBtn').onclick = openCopySummaryModal;
}

function openCopySummaryModal() {
  const rows = getPivotRows();
  const col = getPivotColumn();
  const metrics = getSelectedMetrics();
  const orderByField = getOrderByField();
  const data = getFilteredData();
  let colValues = [];
  if (col) {
    colValues = Array.from(new Set(data.map(r => r[col]).filter(v => v !== undefined && v !== null)));
  }
  const groups = {};
  data.forEach(row => {
    const rowKey = rows.map(f => row[f] || 'N/A').join(' | ');
    const colKey = col ? (row[col] || 'N/A') : '';
    if (!groups[rowKey]) groups[rowKey] = {};
    if (!groups[rowKey][colKey]) groups[rowKey][colKey] = [];
    groups[rowKey][colKey].push(row);
  });
  const groupEntries = Object.entries(groups);
  // Cabecera
  const headers = [...rows];
  if (col) colValues.forEach(v => { metrics.forEach(m => { headers.push(`${v} (${getMetricLabel(m)})`); }); });
  else metrics.forEach(m => { headers.push(getMetricLabel(m)); });
  // Filas
  let rowsData = groupEntries.map(([rowKey, cols]) => {
    const rowVals = rowKey.split(' | ');
    let rowArr = [...rowVals];
    if (col) {
      colValues.forEach(colVal => {
        metrics.forEach(m => {
          const rowsArr = (cols[colVal] || []);
          rowArr.push(stripHtml(calcMetricPreview(rowsArr, m)));
        });
      });
    } else {
      metrics.forEach(m => {
        const rowsArr = Object.values(cols).flat();
        rowArr.push(stripHtml(calcMetricPreview(rowsArr, m)));
      });
    }
    return rowArr;
  });
  // Eliminar duplicados según selección
  const removeDupFieldsCopy1 = getRemoveDuplicatesFields();
  if (rowsData && rowsData.length) {
    rowsData = removeDuplicatesFromRows(rowsData, headers, removeDupFieldsCopy1);
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
    if (["sum","count","avg","min","max"].includes(m.type)) {
      let values = rowsData.map(r => parseFloat(r[startIdx + i])).filter(v => !isNaN(v));
      if (m.type === "sum" || m.type === "count") totalsRow[startIdx + i] = values.reduce((a,b) => a+b, 0);
      if (m.type === "avg") totalsRow[startIdx + i] = values.length ? (values.reduce((a,b) => a+b, 0)/values.length).toFixed(2) : '';
      if (m.type === "min") totalsRow[startIdx + i] = values.length ? Math.min(...values) : '';
      if (m.type === "max") totalsRow[startIdx + i] = values.length ? Math.max(...values) : '';
    }
  });
  if (totalsRow.some(v => v !== '')) totalsRow[0] = 'Total';
  if (totalsRow.some(v => v !== '')) rowsData.push(totalsRow);
  // Generar tabla HTML
  let html = '<table style="border-collapse:collapse;width:100%;font-size:1em;">';
  html += '<thead><tr>' + headers.map(h => `<th style=\"border:1px solid #183a56;padding:6px 8px;background:#183a56;color:#fff;\">${h}</th>`).join('') + '</tr></thead>';
  html += '<tbody>';
  rowsData.forEach(rowArr => {
    html += '<tr>' + rowArr.map(cell => `<td style=\"border:1px solid #b3c6e6;padding:6px 8px;\">${cell}</td>`).join('') + '</tr>';
  });
  html += '</tbody></table>';
  document.getElementById('copySummaryContent').innerHTML = html;
  document.getElementById('copySummaryModal').classList.remove('hidden');
  if (!rowsData || !rowsData.length) {
    document.getElementById('copySummaryContent').innerHTML = '<div style="color:#d32f2f;padding:1em;">No hay datos para copiar.</div>';
    document.getElementById('copySummaryModal').classList.remove('hidden');
    return;
  }
}

// Cerrar modal de copiar resumen
setTimeout(() => {
  const closeBtn = document.getElementById('closeCopySummaryModalBtn');
  if (closeBtn) closeBtn.onclick = () => document.getElementById('copySummaryModal').classList.add('hidden');
  const copyBtn = document.getElementById('copySummaryToClipboardBtn');
  if (copyBtn) copyBtn.onclick = async () => {
    const el = document.getElementById('copySummaryContent');
    if (!el) return;
    // Copiar como HTML (con formato), fallback a texto plano
    const html = el.innerHTML;
    if (!html.trim() || html.includes('No data to copy')) {
      copyBtn.textContent = 'No data to copy';
      copyBtn.style.background = '#d32f2f';
      setTimeout(() => { copyBtn.textContent = 'Copy to clipboard'; copyBtn.style.background = ''; }, 2000);
      return;
    }
    let copied = false;
    try {
      await navigator.clipboard.write([
        new window.ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([el.innerText], { type: 'text/plain' })
        })
      ]);
      copyBtn.textContent = 'Copied to clipboard!';
      copyBtn.style.background = '#388e3c';
      copied = true;
      setTimeout(() => { copyBtn.textContent = 'Copy to clipboard'; copyBtn.style.background = ''; }, 2000);
    } catch {
      // Fallback a texto plano/tabulado
      try {
        await navigator.clipboard.writeText(el.innerText);
        copyBtn.textContent = 'Copied as plain text!';
        copyBtn.style.background = '#388e3c';
        copied = true;
        setTimeout(() => { copyBtn.textContent = 'Copy to clipboard'; copyBtn.style.background = ''; }, 2000);
      } catch {
        copyBtn.textContent = 'Copy failed';
        copyBtn.style.background = '#d32f2f';
        setTimeout(() => { copyBtn.textContent = 'Copy to clipboard'; copyBtn.style.background = ''; }, 2000);
      }
    }
    if (!copied) {
      // Selecciona la tabla para facilitar el copiado manual
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };
}, 500);

// --- Gestión de Summaries ---
const SUMMARY_STORAGE_KEY = 'customSummaries';
function getSavedSummaries() {
  try {
    return JSON.parse(localStorage.getItem(SUMMARY_STORAGE_KEY)) || {};
  } catch { return {}; }
}
function saveSummaries(summaries) {
  localStorage.setItem(SUMMARY_STORAGE_KEY, JSON.stringify(summaries));
}
function getCurrentSummaryConfig() {
  return {
    rows: getPivotRows(),
    col: getPivotColumn(),
    orderBy: getOrderByField(),
    metrics: getSelectedMetrics()
  };
}
function applySummaryConfig(cfg) {
  // Set rows
  const rowsSelect = document.getElementById('pivotRowsSelect');
  rowsSelect._choicesInstance.removeActiveItems();
  (cfg.rows || []).forEach(val => rowsSelect._choicesInstance.setChoiceByValue(val));
  // Set column
  const colSelect = document.getElementById('pivotColumnsSelect');
  colSelect._choicesInstance.removeActiveItems();
  if (cfg.col) colSelect._choicesInstance.setChoiceByValue(cfg.col);
  // Set order by
  const orderBySelect = document.getElementById('orderBySelect');
  orderBySelect._choicesInstance.removeActiveItems();
  if (cfg.orderBy) orderBySelect._choicesInstance.setChoiceByValue(cfg.orderBy);
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
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.justifyContent = 'space-between';
    row.style.gap = '0.5em';
    row.style.marginBottom = '0.5em';
    row.innerHTML = `<span style='font-weight:600;'>${name}</span>`;
    // Botones
    const btns = document.createElement('div');
    btns.style.display = 'flex';
    btns.style.gap = '0.3em';
    // Cargar
    const loadBtn = document.createElement('button');
    loadBtn.textContent = 'Apply';
    loadBtn.className = 'modal-btn secondary small';
    loadBtn.onclick = () => { applySummaryConfig(cfg); modal.classList.add('hidden'); };
    // Renombrar
    const renameBtn = document.createElement('button');
    renameBtn.textContent = 'Rename';
    renameBtn.className = 'modal-btn small';
    renameBtn.onclick = () => showRenameSection(name);
    // Eliminar
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.className = 'modal-btn small';
    delBtn.style.color = '#d32f2f';
    delBtn.onclick = () => { if (confirm('Delete this summary?')) { delete summaries[name]; saveSummaries(summaries); openManageSummariesModal(); } };
    btns.appendChild(loadBtn);
    btns.appendChild(renameBtn);
    btns.appendChild(delBtn);
    row.appendChild(btns);
    list.appendChild(row);
  });
  document.getElementById('summaryRenameSection').style.display = 'none';
  modal.classList.remove('hidden');
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
// Listeners
setTimeout(() => {
  document.getElementById('saveSummaryBtn').onclick = promptSaveSummary;
  const manageBtn = document.getElementById('manageSummariesBtn');
  if (manageBtn) {
    manageBtn.onclick = () => {
      const modal = document.getElementById('manageSummariesModal');
      if (modal) {
        openManageSummariesModal();
        modal.classList.remove('hidden');
      }
    };
  }
  document.getElementById('closeManageSummariesBtn').onclick = () => document.getElementById('manageSummariesModal').classList.add('hidden');
}, 500);

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