import { getOriginalData, getCurrentHeaders, getVisibleColumns, getCurrentPage, getRowsPerPage } from '../store/index.js';
import { getFilteredData } from '../components/filters/FilterManager.js';
const Choices = window.Choices;
// Quitar import de xlsx para entorno navegador
// import * as XLSX from 'xlsx';
// Asegúrate de tener en tu index.html:
// <script src="https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js"></script>
// Y usa window.XLSX:
const XLSX = window.XLSX;

let selectedReportType = 'pdf';
let dedupeColumns = [];
let dedupeChoices = null;

// Función para generar gráficos de manera eficiente
function generateCharts(data, headers) {
  const charts = [];
  
  // Limitar la cantidad de datos para los gráficos
  const maxDataPoints = 50;
  const sampledData = data.length > maxDataPoints 
    ? data.filter((_, index) => index % Math.ceil(data.length / maxDataPoints) === 0)
    : data;

  // Generar gráfico de barras solo para las primeras 3 columnas numéricas
  const numericColumns = headers.filter(header => {
    const sample = data[0][header];
    return !isNaN(sample) && typeof sample === 'number';
  }).slice(0, 3);

  if (numericColumns.length > 0) {
    const chartData = {
      type: 'bar',
      data: {
        labels: sampledData.map(row => row[headers[0]]),
        datasets: numericColumns.map(column => ({
          label: column,
          data: sampledData.map(row => row[column]),
          backgroundColor: `rgba(71, 178, 229, ${0.6})`,
          borderColor: `rgba(71, 178, 229, 1)`,
          borderWidth: 1
        }))
      },
      options: {
        responsive: true,
        animation: false,
        plugins: {
          title: {
            display: true,
            text: 'Data Analysis'
          }
        }
      }
    };
    charts.push(chartData);
  }

  return charts;
}

// Función para cargar el logo como base64
async function getLogoBase64() {
  // Puedes cambiar la ruta si usas otro logo
  const logoUrl = 'src/assets/logo.png';
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'Anonymous';
    img.onload = function() {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = logoUrl;
  });
}

// Función para extraer los datos visibles de la tabla del DOM
function getVisibleTableDataFromDOM() {
  const table = document.querySelector('.data-table');
  if (!table) return { headers: [], rows: [] };
  // Extraer headers visibles
  const headers = Array.from(table.querySelectorAll('thead th'))
    .map(th => th.innerText.trim())
    .filter(h => h && h !== '×'); // Excluir botones de cerrar columna
  // Extraer filas visibles
  const rows = Array.from(table.querySelectorAll('tbody tr')).map(tr =>
    Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim())
  );
  return { headers, rows };
}

// Función para generar el PDF
async function generatePDFReport() {
  const { headers, rows } = getVisibleTableDataFromDOM();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape' });

  // Logo y título pequeños
  try {
    const logoBase64 = await getLogoBase64();
    doc.addImage(logoBase64, 'PNG', 14, 8, 12, 12);
  } catch (e) {}

  doc.setFontSize(12);
  doc.text('The Bridge', 28, 15);

  // Info pequeña arriba derecha
  doc.setFontSize(9);
  doc.text('Data Report', 180, 10, { align: 'right' });
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 180, 15, { align: 'right' });

  // Añadir tabla de datos
  doc.autoTable({
    head: [headers],
    body: rows,
    startY: 50,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [0, 36, 61],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 247, 249],
    },
    didDrawPage: function(data) {
      doc.setFontSize(8);
      doc.text(
        `Page ${data.pageCount} of ${data.pageNumber}`,
        data.settings.margin.left,
        doc.internal.pageSize.height - 10
      );
    }
  });

  // No gráficos, solo tabla visible
  return doc;
}

// Función para generar el Excel usando los datos filtrados y deduplicados
async function generateExcelReport() {
  // Usa los mismos datos que generateReport
  let data = (typeof getFilteredData === 'function' ? getFilteredData() : getOriginalData());
  const headers = getVisibleColumns();
  // Aplica deduplicación si corresponde
  if (dedupeColumns && dedupeColumns.length > 0) {
    data = removeDuplicates(data, dedupeColumns);
  }
  // Prepara los datos para SheetJS
  const ws_data = [
    ['[Maersk Logo]'], // Primera fila: logo (texto)
    ['The Bridge'],    // Segunda fila: título
    headers,           // Tercera fila: encabezados
    ...data.map(row => headers.map(h => row[h] !== undefined ? row[h] : ''))
  ];

  // Crea la hoja
  const ws = XLSX.utils.aoa_to_sheet(ws_data);

  // Estilo: encabezado azul, letras blancas, negrita
  headers.forEach((col, idx) => {
    const cell = ws[XLSX.utils.encode_cell({ r: 2, c: idx })];
    if (cell) {
      cell.s = {
        fill: { fgColor: { rgb: '00243D' } },
        font: { color: { rgb: 'FFFFFF' }, bold: true },
        border: { bottom: { style: 'thin', color: { rgb: 'CCCCCC' } } }
      };
    }
  });

  // Título grande y centrado
  ws['A2'].s = {
    font: { sz: 18, bold: true, color: { rgb: '00243D' } },
    alignment: { horizontal: 'center' }
  };
  ws['!merges'] = [{ s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } }];

  // Crea el libro y descarga
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  XLSX.writeFile(wb, 'the_bridge_report.xlsx');
}

// Función para generar el resumen
async function generateSummaryReport(data, headers) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Título
  doc.setFontSize(20);
  doc.text('Data Summary Report', 14, 20);
  doc.setFontSize(12);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

  let y = 40;

  // Resumen general
  doc.setFontSize(14);
  doc.text('General Summary', 14, y);
  y += 10;

  doc.setFontSize(10);
  doc.text(`Total Records: ${data.length}`, 14, y);
  y += 7;
  doc.text(`Total Columns: ${headers.length}`, 14, y);
  y += 15;

  // Análisis por columna
  doc.setFontSize(14);
  doc.text('Column Analysis', 14, y);
  y += 10;

  doc.setFontSize(10);
  headers.forEach(header => {
    const values = data.map(row => row[header]);
    const numericValues = values.filter(v => !isNaN(v) && typeof v === 'number');
    
    if (numericValues.length > 0) {
      const sum = numericValues.reduce((a, b) => a + b, 0);
      const avg = sum / numericValues.length;
      const max = Math.max(...numericValues);
      const min = Math.min(...numericValues);

      doc.text(`${header}:`, 14, y);
      y += 7;
      doc.text(`  Average: ${avg.toFixed(2)}`, 20, y);
      y += 7;
      doc.text(`  Max: ${max}`, 20, y);
      y += 7;
      doc.text(`  Min: ${min}`, 20, y);
      y += 10;
    } else {
      const uniqueValues = new Set(values).size;
      doc.text(`${header}: ${uniqueValues} unique values`, 14, y);
      y += 7;
    }

    // Nueva página si es necesario
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
  });

  return doc;
}

// Función para eliminar duplicados por columnas
function removeDuplicates(data, columns) {
  if (!columns || columns.length === 0) return data;
  const seen = new Set();
  return data.filter(row => {
    const key = columns.map(col => row[col]).join('||');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Función principal para generar el reporte
export async function generateReport() {
  // Usar solo los datos filtrados y columnas visibles
  let data = (typeof getFilteredData === 'function' ? getFilteredData() : getOriginalData());
  const headers = getVisibleColumns();

  // Eliminar duplicados si corresponde (para todos los tipos de reporte)
  if (dedupeColumns && dedupeColumns.length > 0) {
    data = removeDuplicates(data, dedupeColumns);
  }

  if (!data || data.length === 0) {
    throw new Error('No data available for report generation');
  }

  try {
    let result;
    
    switch (selectedReportType) {
      case 'pdf':
        result = await generatePDFReport();
        result.save('data-report.pdf');
        break;
      case 'excel':
        await generateExcelReport();
        break;
      case 'summary':
        result = await generateSummaryReport(data, headers);
        result.save('data-summary.pdf');
        break;
      default:
        throw new Error('Invalid report type');
    }
  } catch (error) {
    console.error('Error al generar el reporte:', error);
    throw error;
  }
}

// Función para inicializar el servicio de reportes
export function initializeReportService() {
  console.log('Initializing report service...');
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupReportService);
  } else {
    setupReportService();
  }
}

function setupReportService() {
  console.log('Setting up report service...');
  
  const reportBtn = document.getElementById('generateReportBtn');
  const reportOptionsModal = document.getElementById('reportOptionsModal');
  const closeReportOptionsBtn = document.getElementById('closeReportOptionsBtn');
  const reportOptions = document.querySelectorAll('.report-option');
  const dedupeColumnsContainer = document.getElementById('dedupeColumnsContainer');
  const dedupeColumnsSelect = document.getElementById('dedupeColumnsSelect');
  
  // Mostrar checkboxes de columnas visibles
  if (dedupeColumnsContainer) {
    dedupeColumnsContainer.innerHTML = '';
    const columns = getVisibleColumns();
    columns.forEach(col => {
      const label = document.createElement('label');
      label.style.display = 'flex';
      label.style.alignItems = 'center';
      label.style.gap = '0.25rem';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = col;
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          dedupeColumns.push(col);
        } else {
          dedupeColumns = dedupeColumns.filter(c => c !== col);
        }
      });
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(col));
      dedupeColumnsContainer.appendChild(label);
    });
    dedupeColumns = [];
  }

  // Mostrar modal y rellenar select SOLO al abrir el modal
  if (reportBtn) {
    reportBtn.addEventListener('click', () => {
      if (dedupeColumnsSelect) {
        if (dedupeChoices) {
          dedupeChoices.destroy();
          dedupeChoices = null;
        }
        dedupeColumnsSelect.innerHTML = '';
        const columns = getVisibleColumns();
        columns.forEach(col => {
          const option = document.createElement('option');
          option.value = col;
          option.textContent = col;
          dedupeColumnsSelect.appendChild(option);
        });
        dedupeChoices = new Choices(dedupeColumnsSelect, {
          removeItemButton: true,
          placeholder: true,
          placeholderValue: 'Select columns...',
          searchEnabled: true,
          shouldSort: false,
          position: 'bottom',
          classNames: {
            containerOuter: 'choices-dedupe-choices',
          }
        });
        dedupeColumns = [];
        dedupeColumnsSelect.addEventListener('change', () => {
          dedupeColumns = Array.from(dedupeColumnsSelect.selectedOptions).map(opt => opt.value);
        });
        dedupeColumnsSelect.disabled = false;
      }
      reportOptionsModal.classList.remove('hidden');
    });
  }

  // Cerrar modal
  if (closeReportOptionsBtn) {
    closeReportOptionsBtn.addEventListener('click', () => {
      console.log('Close button clicked');
      if (reportOptionsModal) {
        reportOptionsModal.classList.add('hidden');
        console.log('Modal should be hidden now');
      }
    });
  }

  // Seleccionar tipo de reporte
  reportOptions.forEach(option => {
    option.addEventListener('click', () => {
      console.log('Report option clicked:', option.dataset.type);
      // Remover selección previa
      reportOptions.forEach(opt => opt.classList.remove('selected'));
      // Añadir selección actual
      option.classList.add('selected');
      selectedReportType = option.dataset.type;
      console.log('Selected report type:', selectedReportType);
    });
  });

  // Generar reporte
  const generateBtn = document.querySelector('#confirmGenerateReportBtn');
  if (generateBtn) {
    // Elimina listeners previos para evitar descargas dobles
    const newBtn = generateBtn.cloneNode(true);
    generateBtn.parentNode.replaceChild(newBtn, generateBtn);
    newBtn.addEventListener('click', async () => {
      // Verifica si la opción seleccionada es 'copy'
      const selected = document.querySelector('.report-option.selected');
      if (selected && selected.dataset.type === 'copy') {
        // No hacer nada si es copy
        return;
      }
      try {
        newBtn.disabled = true;
        newBtn.textContent = 'Generating...';
        await generateReport();
        if (reportOptionsModal) {
          reportOptionsModal.classList.add('hidden');
        }
        newBtn.disabled = false;
        newBtn.textContent = 'Generate';
        console.log('Report generated successfully');
      } catch (error) {
        console.error('Error generating report:', error);
        alert('Error generating report: ' + error.message);
        newBtn.disabled = false;
        newBtn.textContent = 'Generate';
      }
    });
  } else {
    console.error('Generate button not found');
  }
  
  console.log('Report service setup complete');
}

export async function copyTableToClipboard() {
  try {
    const table = document.querySelector('.table-container table');
    if (!table) throw new Error('No se encontró la tabla');

    // Clonar la tabla para no modificar la original
    const clone = table.cloneNode(true);

    // Eliminar iconos de filtro y botones de X (ocultar columna)
    clone.querySelectorAll('.hide-column-x-btn, .filter-icon, .excel-filter-icon, .filter-btn, .filter-x, .remove-filter-btn').forEach(el => el.remove());
    // También eliminar SVGs de filtros en los th
    clone.querySelectorAll('th svg').forEach(svg => svg.remove());

    // Función para copiar estilos computados a inline style
    function copyComputedStyle(srcElem, destElem) {
      const computed = window.getComputedStyle(srcElem);
      let styleStr = '';
      for (let i = 0; i < computed.length; i++) {
        const prop = computed[i];
        styleStr += `${prop}:${computed.getPropertyValue(prop)};`;
      }
      destElem.setAttribute('style', styleStr);
    }

    // Aplicar estilos a todas las celdas y filas
    const srcRows = table.querySelectorAll('tr');
    const destRows = clone.querySelectorAll('tr');
    srcRows.forEach((srcRow, i) => {
      copyComputedStyle(srcRow, destRows[i]);
      const srcCells = srcRow.children;
      const destCells = destRows[i].children;
      for (let j = 0; j < srcCells.length; j++) {
        copyComputedStyle(srcCells[j], destCells[j]);
      }
    });

    // Copiar HTML y texto plano
    const html = clone.outerHTML;
    const rows = Array.from(clone.rows);
    const text = rows.map(row =>
      Array.from(row.cells).map(cell => cell.textContent.trim()).join('\t')
    ).join('\n');

    await navigator.clipboard.write([
      new window.ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' })
      })
    ]);

    return {
      success: true,
      message: 'Tabla copiada al portapapeles con formato exacto'
    };
  } catch (error) {
    console.error('Error al copiar la tabla:', error);
    return {
      success: false,
      message: 'Error al copiar la tabla: ' + error.message
    };
  }
} 