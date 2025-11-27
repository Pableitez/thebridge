import { getOriginalData, getCurrentHeaders, getVisibleColumns, getCurrentPage, getRowsPerPage } from '../store/index.js';
import { getFilteredData } from '../components/filters/FilterManager.js';
import { showNotification } from '../components/notifications/NotificationManager.js';
const Choices = window.Choices;
console.log('Choices.js available:', !!Choices);
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
  const logoUrl = 'LOGOTAB_rounded.png';
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
    ['[Logo]'], // Primera fila: logo (texto)
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

    // Función para inicializar el selector de columnas
  function initializeColumnSelector() {
    if (!dedupeColumnsSelect) return;
    
    // Limpiar selector existente
    if (dedupeChoices) {
      dedupeChoices.destroy();
      dedupeChoices = null;
    }
    dedupeColumnsSelect.innerHTML = '';
    
    // Obtener columnas disponibles
    const columns = getVisibleColumns();
    console.log('Available columns for deduplication:', columns);
    
    if (!columns || columns.length === 0) {
      console.warn('No columns available for deduplication selector');
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No data loaded - Load a CSV file first';
      option.disabled = true;
      dedupeColumnsSelect.appendChild(option);
      dedupeColumnsSelect.disabled = true;
      return;
    }
    
    // Agregar opciones al select
    columns.forEach(col => {
      const option = document.createElement('option');
      option.value = col;
      option.textContent = col;
      dedupeColumnsSelect.appendChild(option);
    });
    
         // Inicializar Choices.js
     try {
       if (window.Choices) {
         dedupeChoices = new window.Choices(dedupeColumnsSelect, {
           removeItemButton: true,
           searchEnabled: true,
           shouldSort: false,
           placeholderValue: 'Select columns...',
           itemSelectText: ''
         });
         console.log('Choices.js initialized successfully');
       } else {
         console.warn('Choices.js not available, using native select');
       }
     } catch (error) {
       console.error('Error initializing Choices.js:', error);
     }
    
    dedupeColumns = [];
    dedupeColumnsSelect.disabled = false;
    
    // Event listener para cambios
    const changeHandler = () => {
      dedupeColumns = Array.from(dedupeColumnsSelect.selectedOptions).map(opt => opt.value);
      console.log('Selected dedupe columns:', dedupeColumns);
    };
    
    // Remover listeners anteriores y agregar nuevo
    dedupeColumnsSelect.removeEventListener('change', changeHandler);
    dedupeColumnsSelect.addEventListener('change', changeHandler);
  }

  // Mostrar modal y rellenar select SOLO al abrir el modal
  if (reportBtn) {
    reportBtn.addEventListener('click', () => {
      console.log('Report button clicked, initializing columns selector...');
      initializeColumnSelector();
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
      
      // Cambiar texto del botón según el tipo seleccionado
      const generateBtn = document.querySelector('#confirmGenerateReportBtn');
      if (generateBtn) {
        if (selectedReportType === 'copy') {
          generateBtn.textContent = 'Copy to Clipboard';
        } else {
          generateBtn.textContent = 'Generate';
        }
      }
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
        try {
          // ACTUALIZAR dedupeColumns con los valores seleccionados actuales
          if (dedupeColumnsSelect) {
            dedupeColumns = Array.from(dedupeColumnsSelect.selectedOptions).map(opt => opt.value);
          }
          newBtn.disabled = true;
          newBtn.textContent = 'Copying...';
          const result = await copyTableToClipboard();
          if (result.success) {
            // Mostrar notificación de éxito
            showNotification(result.message, 'success');
            if (reportOptionsModal) {
              reportOptionsModal.classList.add('hidden');
            }
          } else {
            showNotification(result.message, 'error');
          }
          newBtn.disabled = false;
          newBtn.textContent = selectedReportType === 'copy' ? 'Copy to Clipboard' : 'Generate';
        } catch (error) {
          console.error('Error copying to clipboard:', error);
          showNotification('Error copying to clipboard: ' + error.message, 'error');
          newBtn.disabled = false;
          newBtn.textContent = selectedReportType === 'copy' ? 'Copy to Clipboard' : 'Generate';
        }
        return;
      }
      try {
        // ACTUALIZAR dedupeColumns con los valores seleccionados actuales
        if (dedupeColumnsSelect) {
          dedupeColumns = Array.from(dedupeColumnsSelect.selectedOptions).map(opt => opt.value);
        }
        newBtn.disabled = true;
        newBtn.textContent = 'Generating...';
        await generateReport();
        if (reportOptionsModal) {
          reportOptionsModal.classList.add('hidden');
        }
        newBtn.disabled = false;
        newBtn.textContent = selectedReportType === 'copy' ? 'Copy to Clipboard' : 'Generate';
        console.log('Report generated successfully');
      } catch (error) {
        console.error('Error generating report:', error);
        alert('Error generating report: ' + error.message);
        newBtn.disabled = false;
        newBtn.textContent = selectedReportType === 'copy' ? 'Copy to Clipboard' : 'Generate';
      }
    });
  } else {
    console.error('Generate button not found');
  }
  
  console.log('Report service setup complete');
}

export async function copyTableToClipboard() {
  try {
    // Obtener solo los datos visibles en la tabla (lo que se ve en pantalla)
    let dataArr = typeof getVisibleTableDataFromDOM === 'function' ? getVisibleTableDataFromDOM() : null;
    let headers = getVisibleColumns();
    let data = [];

    // Si getVisibleTableDataFromDOM devuelve headers y rows, conviértelo a array de objetos
    if (dataArr && Array.isArray(dataArr.rows) && Array.isArray(dataArr.headers)) {
      headers = dataArr.headers;
      data = dataArr.rows.map(rowArr => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = rowArr[i] || ''; });
        return obj;
      });
    } else {
      // Fallback: usar los datos filtrados
      data = (typeof getFilteredData === 'function' ? getFilteredData() : getOriginalData());
      headers = getVisibleColumns();
    }

    // Crear formato de Excel (TSV - Tab Separated Values)
    const excelData = [
      headers, // Primera fila: encabezados
      ...data.map(row => headers.map(h => row[h] !== undefined ? row[h] : ''))
    ];

    // Convertir a texto con formato Excel (TSV)
    const excelText = excelData.map(row => 
      row.map(cell => {
        const cellStr = String(cell);
        if (cellStr.includes('\t') || cellStr.includes('\n') || cellStr.includes('"')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join('\t')
    ).join('\n');

    // Crear HTML con formato de tabla simple para Excel
    const htmlTable = `
      <table style="border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11px;">
        <thead>
          <tr>${headers.map(h => `<th style="border: 1px solid #000000; padding: 4px; background-color: #e3f2fd; font-weight: bold; text-align: center;">${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${data.map(row => 
            `<tr>${headers.map(h => `<td style="border: 1px solid #000000; padding: 4px; text-align: left;">${row[h] !== undefined ? row[h] : ''}</td>`).join('')}</tr>`
          ).join('')}
        </tbody>
      </table>
    `;

    await navigator.clipboard.write([
      new window.ClipboardItem({
        'text/html': new Blob([htmlTable], { type: 'text/html' }),
        'text/plain': new Blob([excelText], { type: 'text/plain' })
      })
    ]);

    return {
      success: true,
      message: 'Visible table data copied to clipboard!'
    };
  } catch (error) {
    console.error('Error al copiar la tabla:', error);
    return {
      success: false,
      message: 'Error al copiar la tabla: ' + error.message
    };
  }
} 