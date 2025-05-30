import { 
    getVisibleColumns, 
    getCurrentPage, 
    getRowsPerPage, 
    setCurrentPage, 
    getOriginalData, 
    getSortConfig, 
    setSortConfig,
    setVisibleColumns,
    getTableActiveFilters,
    getTableFilterValues,
    setTableActiveFilters,
    setTableFilterValues
} from '../../store/index.js';
import { sortData, createElement, getElement } from '../../utils/general.js';
import { applyFilters } from '../filters/FilterManager.js';
import { getFilteredData, detectColumnTypes, parseFlexibleDate } from '../filters/FilterManager.js';
import { getCurrentCustomColumns } from '../custom/CustomColumnManager.js';

// Track selection state
let isSelecting = false;
let selectionStart = null;
let isTextSelecting = false;

// Track hidden columns
let hiddenColumns = new Set();

// --- Utilidad debounce simple ---
function debounce(fn, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), delay);
  };
}

export function displayTable(data = []) {
    console.log("📊 Starting table display with data:", { 
        dataLength: data.length,
        visibleColumns: getVisibleColumns(),
        currentPage: getCurrentPage(),
        rowsPerPage: getRowsPerPage(),
        sampleRow: data[0]
    });

    const container = getElement("#tableContainer");
    if (!container) {
        console.error("❌ Table container not found!");
        return;
    }
    
    // Refuerzo: aseguro que los chips de filtros activos se muestran arriba de la tabla, sin contenedor extra
    let summary = document.getElementById('activeFiltersSummary');
    if (!summary || summary.parentNode !== container.parentNode || container.previousSibling !== summary) {
        if (summary) summary.remove();
        summary = document.createElement('div');
        summary.id = 'activeFiltersSummary';
        // Sin clase de contenedor, solo chips flotantes
        container.parentNode.insertBefore(summary, container);
    }

    // Ensure container is visible
    container.classList.add('visible');
    container.innerHTML = "";

    if (!Array.isArray(data) || data.length === 0) {
        console.warn("⚠️ No data to display");
        container.innerHTML = "<p>No data found.</p>";
        return;
    }

    const table = createElement("table", "data-table");
    
    // Add selection event listeners
    table.addEventListener('mousedown', startSelection);
    table.addEventListener('mousemove', updateSelection);
    table.addEventListener('mouseup', endSelection);
    document.addEventListener('mouseup', endSelection);
    
    // Add copy event listener
    document.addEventListener('copy', handleCopy);
    document.addEventListener('keydown', handleKeyDown);
    
    table.appendChild(createTableHeader());
    table.appendChild(createTableBody(data));
    container.appendChild(table);
    
    console.log("✅ Table rendered successfully");
    
    updatePagination(data.length);

    // Permitir selección fluida desde el header (versión refinada)
    const ths = table.querySelectorAll('th');
    ths.forEach(th => {
        th.addEventListener('selectstart', (e) => {
            isTextSelecting = true;
            ths.forEach(t => t.style.pointerEvents = 'none');
        });
    });
    function restorePointerEvents() {
        if (isTextSelecting) {
            ths.forEach(t => t.style.pointerEvents = '');
            isTextSelecting = false;
        }
    }
    document.addEventListener('mouseup', restorePointerEvents);
    document.addEventListener('selectionchange', () => {
        if (!window.getSelection().toString()) {
            restorePointerEvents();
        }
    });

    // --- Botón Reset Filtros debajo de la paginación ---
    let resetBtn = document.getElementById('resetAllFiltersBtn');
    if (!resetBtn && pagination) {
        resetBtn = document.createElement('button');
        resetBtn.id = 'resetAllFiltersBtn';
        resetBtn.className = 'reset-filters-btn';
        resetBtn.textContent = 'Reset Filters';
        resetBtn.setAttribute('style', 'color:#fff; background:none; border:none; font-size:16px; font-family:inherit; padding:0; margin:0;');
        resetBtn.onclick = () => window.resetAllFilters();
        if (pagination.nextSibling) {
            pagination.parentNode.insertBefore(resetBtn, pagination.nextSibling);
        } else {
            pagination.parentNode.appendChild(resetBtn);
        }
    }

    const refreshBtn = document.getElementById('resetAllFiltersBtn');
    if (refreshBtn) {
        refreshBtn.onclick = () => {
            // Solo limpiar filtros Excel de cabecera de tabla
            const filterValues = { ...getTableFilterValues() };
            const activeFilters = { ...getTableActiveFilters() };
            let changed = false;
            Object.keys(activeFilters).forEach(col => {
                if (['reference', 'date'].includes(activeFilters[col])) {
                    delete filterValues[col];
                    delete activeFilters[col];
                    changed = true;
                }
            });
            if (changed) {
                setTableFilterValues(filterValues);
                setTableActiveFilters(activeFilters);
                applyFilters();
                refreshHeaderFilterIcons();
            }
            // Limpiar visualmente los dropdowns y embudos
            document.querySelectorAll('.excel-filter-dropdown').forEach(el => el.remove());
            document.querySelectorAll('.excel-filter-icon').forEach(icon => icon.classList.remove('excel-filter-active'));
        };
    }
}

function createTableHeader() {
    const thead = createElement("thead");
    const headRow = createElement("tr");
    
    const filterValues = getTableFilterValues();
    getVisibleColumns().forEach(column => {
        const th = createElement("th");
        th.draggable = true;
        th.dataset.column = column;

        // --- Icono de filtro tipo Excel (embudo sólido) ---
        const filterIcon = document.createElement('span');
        filterIcon.className = 'excel-filter-icon';
        filterIcon.style.position = 'relative';
        filterIcon.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;">
            <path d="M3 5a2 2 0 0 1 2-2h10a2 2 0 0 1 1.6 3.2l-4.6 6.4V17a1 1 0 0 1-1.447.894l-2-1A1 1 0 0 1 8 16v-4.99L3.2 6.6A2 2 0 0 1 3 5z"/>
          </svg>
        `;
        filterIcon.style.cursor = 'pointer';
        filterIcon.style.marginRight = '0.5em';
        filterIcon.title = 'Filter this column';
        if (filterValues[column] && Array.isArray(filterValues[column]) && filterValues[column].length > 0) {
            filterIcon.classList.add('excel-filter-active');
            // Badge rojo
            const badge = document.createElement('span');
            badge.className = 'excel-filter-badge';
            badge.style.position = 'absolute';
            badge.style.top = '0px';
            badge.style.right = '0px';
            badge.style.width = '8px';
            badge.style.height = '8px';
            badge.style.background = '#F44336';
            badge.style.borderRadius = '50%';
            badge.style.border = '1.5px solid #fff';
            badge.style.display = 'block';
            badge.style.zIndex = '2';
            filterIcon.appendChild(badge);
        }
        filterIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            showExcelFilterDropdown(th, column);
        });
        th.appendChild(filterIcon);

        // --- Título de la columna ---
        const titleSpan = document.createElement('span');
        titleSpan.textContent = column;
        th.appendChild(titleSpan);

        // --- Botón de ocultar columna (X, solo texto) ---
        const hideBtn = document.createElement('button');
        hideBtn.className = 'hide-column-x-btn';
        hideBtn.textContent = '×';
        hideBtn.type = 'button';
        hideBtn.style.marginLeft = '0.3em';
        hideBtn.style.marginRight = '1.2em';
        hideBtn.style.cursor = 'pointer';
        hideBtn.style.fontWeight = 'bold';
        hideBtn.style.fontSize = '1.2em';
        hideBtn.style.color = '#F44336';
        hideBtn.setAttribute('style', hideBtn.getAttribute('style') + ';color:#F44336 !important;');
        hideBtn.title = 'Hide column';
        hideBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const currentVisible = getVisibleColumns();
            if (currentVisible.length <= 1) return;
            const newVisible = currentVisible.filter(col => col !== column);
            setVisibleColumns(newVisible);
            hiddenColumns.add(column);
            displayTable(getOriginalData());
            const checkbox = document.querySelector(`#columnList input[type='checkbox'][value='${column.replace(/'/g, "\\'") }']`);
            if (checkbox) checkbox.checked = false;
            updateHiddenColumnsButton();
        });
        th.appendChild(hideBtn);
        
        const sortConfig = getSortConfig();
        if (sortConfig && sortConfig.column === column) {
            th.classList.add(sortConfig.direction === 'asc' ? 'sorted-asc' : 'sorted-desc');
        }
        
        th.addEventListener('dragstart', handleDragStart);
        th.addEventListener('dragover', handleDragOver);
        th.addEventListener('drop', handleDrop);
        th.addEventListener('dragend', handleDragEnd);
        
        th.addEventListener('click', () => handleSort(column));
        headRow.appendChild(th);
    });

    thead.appendChild(headRow);
    return thead;
}

// Drag and drop handlers
let draggedColumn = null;

function handleDragStart(e) {
    draggedColumn = e.target;
    e.target.classList.add('dragging');
    // Set custom drag image or transparency
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const th = e.target.closest('th');
    if (th && th !== draggedColumn) {
        const rect = th.getBoundingClientRect();
        const midPoint = rect.x + rect.width / 2;
        
        // Add visual indicator for drop position
        th.classList.remove('drop-right', 'drop-left');
        if (e.clientX > midPoint) {
            th.classList.add('drop-right');
        } else {
            th.classList.add('drop-left');
        }
    }
}

function handleDrop(e) {
    e.preventDefault();
    const targetTh = e.target.closest('th');
    
    if (targetTh && draggedColumn && targetTh !== draggedColumn) {
        const columns = getVisibleColumns();
        const fromIndex = columns.indexOf(draggedColumn.dataset.column);
        const toIndex = columns.indexOf(targetTh.dataset.column);
        
        // Reorder columns
        columns.splice(fromIndex, 1);
        columns.splice(toIndex, 0, draggedColumn.dataset.column);
        
        // Update state and redraw table
        setVisibleColumns(columns);
        applyFilters();
    }
    
    // Clean up visual indicators
    document.querySelectorAll('th').forEach(th => {
        th.classList.remove('drop-right', 'drop-left');
    });
}

function handleDragEnd() {
    draggedColumn = null;
    document.querySelectorAll('th').forEach(th => {
        th.classList.remove('dragging', 'drop-right', 'drop-left');
    });
}

function handleKeyDown(e) {
    // Handle Ctrl+C or Cmd+C
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        copySelectedCells();
    }
}

function handleCopy(e) {
    const selectedCells = document.querySelectorAll('.data-table td.selected');
    if (selectedCells.length > 0) {
        e.preventDefault();
        copySelectedCells();
    }
}

function startSelection(e) {
    // Si el click es sobre un input, textarea o select, no hacer selección
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        return;
    }
    const cell = e.target.closest('td');
    if (!cell) return;
    isSelecting = true;
    selectionStart = cell;
    clearSelection();
    cell.classList.add('selected');
    e.preventDefault();
}

function updateSelection(e) {
    // Si el mouse está sobre un input, textarea o select, no actualizar selección
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        return;
    }
    if (!isSelecting || !selectionStart) return;
    const currentCell = e.target.closest('td');
    if (!currentCell) return;
    const table = currentCell.closest('table');
    if (!table) return;
    // Selección rectangular tipo Excel
    const allRows = Array.from(table.querySelectorAll('tbody tr'));
    const allCells = Array.from(table.querySelectorAll('td'));
    const startRow = selectionStart.parentElement.rowIndex - 1; // tbody rowIndex
    const startCol = selectionStart.cellIndex;
    const endRow = currentCell.parentElement.rowIndex - 1;
    const endCol = currentCell.cellIndex;
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);
        clearSelection();
    for (let r = minRow; r <= maxRow; r++) {
        const row = allRows[r];
        if (!row) continue;
        for (let c = minCol; c <= maxCol; c++) {
            const cell = row.cells[c];
            if (cell) cell.classList.add('selected');
            }
    }
    e.preventDefault();
}

function endSelection() {
    isSelecting = false;
}

function getColumnIndex(cell) {
    return Array.from(cell.parentElement.children).indexOf(cell);
}

function clearSelection() {
    document.querySelectorAll('.data-table td.selected').forEach(cell => {
        cell.classList.remove('selected');
    });
}

function createTableBody(data) {
    const tbody = createElement("tbody");
    const startIndex = (getCurrentPage() - 1) * getRowsPerPage();
    const endIndex = startIndex + getRowsPerPage();
    const pageData = data.slice(startIndex, endIndex);

    // Obtener tipos de columna
    const columnTypes = detectColumnTypes(getOriginalData());
    const customColumns = getCurrentCustomColumns ? getCurrentCustomColumns() : [];
    const customHeaders = customColumns.map(c => c.header);
    const allHeaders = getVisibleColumns();

    pageData.forEach((row, rowIdx) => {
        const tr = createElement("tr");
        getVisibleColumns().forEach((column, colIdx) => {
            const td = createElement("td");
            const isCustom = customHeaders.includes(column);
            let value = row[column];
            if (isCustom) {
                // Buscar el valor en la columna personalizada
                const customCol = customColumns.find(c => c.header === column);
                value = customCol && customCol.values ? customCol.values[startIndex + rowIdx] : '';
                // Renderizar input editable
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'cell-input';
                input.value = value || '';
                input.removeAttribute('readonly');
                input.removeAttribute('disabled');
                // Si es fórmula, evalúa y muestra el resultado
                if (typeof value === 'string' && value.startsWith('=')) {
                    try {
                        const context = {};
                        getVisibleColumns().forEach((col, i) => {
                            context[col] = row[col] || '';
                        });
                        let expr = value.slice(1);
                        // Ordenar los headers de mayor a menor longitud para evitar reemplazos parciales
                        const sortedHeaders = Object.keys(context).sort((a, b) => b.length - a.length);
                        sortedHeaders.forEach((header) => {
                            // Reemplazar el header solo si aparece como palabra completa (usando \b y escapando espacios)
                            const safeHeader = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                            const regex = new RegExp(`\\b${safeHeader}\\b`, 'g');
                            expr = expr.replace(regex, `context[${JSON.stringify(header)}]`);
                        });
                        // Funciones de fechas
                        function parseDate(val) {
                            if (!val) return null;
                            if (val instanceof Date) return val;
                            if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) return new Date(val);
                            const d = new Date(val);
                            return isNaN(d) ? null : d;
                        }
                        function DAYS(f2, f1) {
                            const d2 = parseDate(f2);
                            const d1 = parseDate(f1);
                            if (!d1 || !d2) return '#ERROR';
                            return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
                        }
                        function DATEDIF(f1, f2, unit) {
                            const d1 = parseDate(f1);
                            const d2 = parseDate(f2);
                            if (!d1 || !d2) return '#ERROR';
                            if (unit === 'd') return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
                            if (unit === 'm') return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
                            if (unit === 'y') return d2.getFullYear() - d1.getFullYear();
                            return '#ERROR';
                        }
                        function YEAR(f) { const d = parseDate(f); return d ? d.getFullYear() : '#ERROR'; }
                        function MONTH(f) { const d = parseDate(f); return d ? d.getMonth() + 1 : '#ERROR'; }
                        function DAY(f) { const d = parseDate(f); return d ? d.getDate() : '#ERROR'; }
                        // Sugerencia si se intenta restar fechas directamente
                        if (/context\[.*?\]\s*-\s*context\[.*?\]/.test(expr)) {
                            input.value = '#ERROR';
                            if (!input.nextSibling || !input.nextSibling.classList || !input.nextSibling.classList.contains('formula-help-box')) {
                                const help = document.createElement('div');
                                help.className = 'formula-help-box';
                                help.style.position = 'absolute';
                                help.style.zIndex = '100000';
                                help.style.background = '#f8f9fa';
                                help.style.border = '1px solid #228be6';
                                help.style.borderRadius = '4px';
                                help.style.boxShadow = '0 2px 8px rgba(34,139,230,0.08)';
                                help.style.margin = '0';
                                help.style.padding = '0.5em 1em';
                                help.style.fontSize = '13px';
                                help.style.color = '#d32f2f';
                                help.textContent = 'Para diferencias de fechas usa: DAYS(fecha_fin, fecha_inicio) o DATEDIF(fecha_inicio, fecha_fin, "d")';
                                input.parentNode.appendChild(help);
                            }
                            return;
                        } else if (input.nextSibling && input.nextSibling.classList && input.nextSibling.classList.contains('formula-help-box')) {
                            input.nextSibling.remove();
                        }
                        // eslint-disable-next-line no-eval
                        input.value = eval(expr);
                    } catch {
                        input.value = '#ERROR';
                    }
                }
                // --- AUTOCOMPLETADO DE ENCABEZADOS Y FUNCIONES ---
                const FUNCTION_HELP = {
                    SUM: 'SUM(n1, n2, ...): Suma los valores dados. Ej: SUM(A, B)',
                    AVG: 'AVG(n1, n2, ...): Promedio de los valores. Ej: AVG(A, B)',
                    MIN: 'MIN(n1, n2, ...): Mínimo de los valores. Ej: MIN(A, B)',
                    MAX: 'MAX(n1, n2, ...): Máximo de los valores. Ej: MAX(A, B)',
                    IF: 'IF(condición, valor_si_verdadero, valor_si_falso): Ej: IF(A > 10, "Sí", "No")',
                    COUNT: 'COUNT(n1, n2, ...): Cuenta los valores no vacíos.',
                    DAYS: 'DAYS(fecha_fin, fecha_inicio): Días entre dos fechas.',
                    DATEDIF: 'DATEDIF(fecha_inicio, fecha_fin, "d"): Diferencia entre fechas en días ("d"), meses ("m") o años ("y").',
                    YEAR: 'YEAR(fecha): Año de una fecha.',
                    MONTH: 'MONTH(fecha): Mes de una fecha.',
                    DAY: 'DAY(fecha): Día de una fecha.'
                };
                const FUNCTION_LIST = Object.keys(FUNCTION_HELP);
                let autocompleteBox = null;
                let helpBox = null;
                function showAutocompleteBox(matches, isFunc = false) {
                    if (!autocompleteBox) {
                        autocompleteBox = document.createElement('ul');
                        autocompleteBox.className = 'autocomplete-header-list';
                        autocompleteBox.style.position = 'absolute';
                        autocompleteBox.style.zIndex = '99999';
                        autocompleteBox.style.background = '#fff';
                        autocompleteBox.style.border = '1px solid #228be6';
                        autocompleteBox.style.borderRadius = '4px';
                        autocompleteBox.style.boxShadow = '0 2px 8px rgba(34,139,230,0.08)';
                        autocompleteBox.style.margin = '0';
                        autocompleteBox.style.padding = '0.2em 0';
                        autocompleteBox.style.listStyle = 'none';
                        autocompleteBox.style.fontSize = '14px';
                        autocompleteBox.style.minWidth = '160px';
                        document.body.appendChild(autocompleteBox);
                    }
                    // Posicionar justo debajo del input
                    const rect = input.getBoundingClientRect();
                    autocompleteBox.style.left = `${rect.left + window.scrollX}px`;
                    autocompleteBox.style.top = `${rect.bottom + window.scrollY}px`;
                    autocompleteBox.innerHTML = '';
                    matches.forEach(header => {
                        const li = document.createElement('li');
                        li.textContent = header;
                        li.style.padding = '0.2em 0.8em';
                        li.style.cursor = 'pointer';
                        li.addEventListener('mousedown', (ev) => {
                            ev.preventDefault();
                            const val = input.value;
                            const cursorPos = input.selectionStart;
                            const before = val.slice(0, cursorPos);
                            const after = val.slice(cursorPos);
                            if (isFunc) {
                                // Insertar función con paréntesis y colocar el cursor dentro
                                const funcSyntax = header + '()';
                                input.value = before + funcSyntax + after;
                                setTimeout(() => {
                                    input.selectionStart = input.selectionEnd = before.length + header.length + 1;
                                }, 0);
                                showHelpBox(header);
                            } else {
                                // Reemplazar el término actual por el encabezado seleccionado
                                const lastTermIdx = before.lastIndexOf('=') + 1;
                                const newVal = before.slice(0, lastTermIdx) + header + after;
                                input.value = newVal;
                                hideHelpBox();
                            }
                            input.dispatchEvent(new Event('input'));
                            if (autocompleteBox) autocompleteBox.remove();
                            autocompleteBox = null;
                            input.focus();
                        });
                        li.addEventListener('mouseover', () => {
                            li.style.background = '#e3f0fc';
                            if (isFunc) showHelpBox(header);
                        });
                        li.addEventListener('mouseout', () => {
                            li.style.background = '';
                        });
                        autocompleteBox.appendChild(li);
                    });
                }
                function showHelpBox(funcName) {
                    if (!FUNCTION_HELP[funcName]) return;
                    if (!helpBox) {
                        helpBox = document.createElement('div');
                        helpBox.className = 'formula-help-box';
                        helpBox.style.position = 'absolute';
                        helpBox.style.zIndex = '100000';
                        helpBox.style.background = '#f8f9fa';
                        helpBox.style.border = '1px solid #228be6';
                        helpBox.style.borderRadius = '4px';
                        helpBox.style.boxShadow = '0 2px 8px rgba(34,139,230,0.08)';
                        helpBox.style.margin = '0';
                        helpBox.style.padding = '0.5em 1em';
                        helpBox.style.fontSize = '13px';
                        helpBox.style.color = '#1976d2';
                        document.body.appendChild(helpBox);
                    }
                    const rect = input.getBoundingClientRect();
                    helpBox.style.left = `${rect.left + window.scrollX}px`;
                    helpBox.style.top = `${rect.bottom + window.scrollY + 36}px`;
                    helpBox.textContent = FUNCTION_HELP[funcName];
                }
                function hideHelpBox() {
                    if (helpBox) { helpBox.remove(); helpBox = null; }
                }
                input.addEventListener('input', (e) => {
                    const val = input.value;
                    if (val.startsWith('=') && val.length > 1) {
                        const term = val.slice(1).split(/[^a-zA-Z0-9_ ]/).pop().trim().toLowerCase();
                        // Sugerir funciones si el término coincide
                        const funcMatches = FUNCTION_LIST.filter(f => f.toLowerCase().startsWith(term));
                        const headerMatches = allHeaders.filter(h => h.toLowerCase().includes(term) && term.length > 0);
                        if (funcMatches.length > 0) {
                            showAutocompleteBox(funcMatches, true);
                        } else if (headerMatches.length > 0) {
                            showAutocompleteBox(headerMatches, false);
                        } else if (autocompleteBox) {
                            autocompleteBox.remove();
                            autocompleteBox = null;
                            hideHelpBox();
                        }
                    } else if (autocompleteBox) {
                        autocompleteBox.remove();
                        autocompleteBox = null;
                        hideHelpBox();
                    }
                });
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        if (autocompleteBox) {
                            autocompleteBox.remove();
                            autocompleteBox = null;
                        }
                        if (helpBox) { helpBox.remove(); helpBox = null; }
                        input.blur(); // Forzar blur para guardar y evaluar la fórmula
                        e.preventDefault();
                    } else if (e.key === 'Escape') {
                        if (autocompleteBox) {
                            autocompleteBox.remove();
                            autocompleteBox = null;
                        }
                        if (helpBox) { helpBox.remove(); helpBox = null; }
                        e.preventDefault();
                    }
                });
                // --- FIN AUTOCOMPLETADO ---
                input.addEventListener('focus', () => {
                    // Al enfocar, mostrar la fórmula original si existe
                    if (typeof value === 'string' && value.startsWith('=')) {
                        input.value = value;
                    }
                });
                input.addEventListener('blur', () => {
                    // Guardar valor/fórmula en la columna personalizada
                    const customCol = customColumns.find(c => c.header === column);
                    if (customCol) {
                        customCol.values[startIndex + rowIdx] = input.value;
                        // Guardar en localStorage
                        if (typeof customColManager !== 'undefined') {
                            customColManager.saveCustomColumns();
                        }
                    }
                    // Recalcular todas las fórmulas
                    recalculateAllCustomFormulas(customColumns, pageData, startIndex);
                });
                td.innerHTML = '';
                td.appendChild(input);
                td.style.position = 'relative';
            } else {
                // Columna normal
            td.textContent = value;
            }
            const columnType = columnTypes[column];
            if (columnType) {
                td.setAttribute('data-type', columnType);
            }
            td.classList.add('selectable');
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });

    return tbody;
}

// Función para recalcular todas las fórmulas de columnas personalizadas
function recalculateAllCustomFormulas(customColumns, pageData, startIndex) {
    customColumns.forEach((col, colIdx) => {
        if (!col.values) return;
        col.values.forEach((val, rowIdx) => {
            if (typeof val === 'string' && val.startsWith('=')) {
                try {
                    const context = {};
                    getVisibleColumns().forEach((colName) => {
                        context[colName] = pageData[rowIdx] ? pageData[rowIdx][colName] : '';
                    });
                    let expr = val.slice(1);
                    Object.entries(context).forEach(([k, v]) => {
                        expr = expr.replaceAll(new RegExp(`\\b${k}\\b`, 'g'), v || 0);
                    });
                    // eslint-disable-next-line no-eval
                    col.values[rowIdx + startIndex] = eval(expr);
                } catch {
                    col.values[rowIdx + startIndex] = '#ERROR';
                }
            }
        });
    });
    // Forzar refresco de la tabla
    displayTable(getOriginalData());
}

function handleSort(column) {
    const currentSortConfig = getSortConfig();
    const direction = currentSortConfig && currentSortConfig.column === column
        ? (currentSortConfig.direction === 'asc' ? 'desc' : 'asc')
        : 'asc';
    setSortConfig({ column, direction });
    applyFilters();
}

function updatePagination(totalRecords) {
    const paginationContainer = getElement("#pagination");
    if (!paginationContainer) return;

    const totalPages = Math.ceil(totalRecords / getRowsPerPage());
    const currentPage = getCurrentPage();

    paginationContainer.innerHTML = "";

    // Previous button
    appendPaginationButton(paginationContainer, "«", currentPage > 1, () => handlePageChange(1), false, "First");
    appendPaginationButton(paginationContainer, "‹", currentPage > 1, () => handlePageChange(currentPage - 1), false, "Previous");

    // Calculate page range to show
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    // Adjust start if we're near the end
    if (endPage === totalPages) {
        startPage = Math.max(1, endPage - 4);
    }

    // First page if not in range
    if (startPage > 1) {
        appendPaginationButton(paginationContainer, "1", true, () => handlePageChange(1));
        if (startPage > 2) {
            appendPaginationButton(paginationContainer, "...", false, null, false, "More pages");
        }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        appendPaginationButton(paginationContainer, i.toString(), true, () => handlePageChange(i), i === currentPage);
    }

    // Last page if not in range
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            appendPaginationButton(paginationContainer, "...", false, null, false, "More pages");
        }
        appendPaginationButton(paginationContainer, totalPages.toString(), true, () => handlePageChange(totalPages));
    }

    // Next buttons
    appendPaginationButton(paginationContainer, "›", currentPage < totalPages, () => handlePageChange(currentPage + 1), false, "Next");
    appendPaginationButton(paginationContainer, "»", currentPage < totalPages, () => handlePageChange(totalPages), false, "Last");

    // Update record count and page info
    const recordCount = getElement("#recordCount");
    if (recordCount) {
        const start = (currentPage - 1) * getRowsPerPage() + 1;
        const end = Math.min(currentPage * getRowsPerPage(), totalRecords);
        recordCount.textContent = `${start}-${end} of ${totalRecords} records`;
    }
}

function appendPaginationButton(container, text, enabled, onClick, isActive = false, title = "") {
    const button = createElement("button", "pagination-btn");
    button.textContent = text;
    button.disabled = !enabled;
    if (isActive) button.classList.add("active");
    if (title) button.title = title;
    if (onClick) button.addEventListener("click", onClick);
    container.appendChild(button);
}

function handlePageChange(newPage) {
    setCurrentPage(newPage);
    applyFilters();
}

function copySelectedCells() {
    const selectedCells = document.querySelectorAll('.data-table td.selected');
    if (selectedCells.length === 0) return;

    // Convert selected cells to comma-separated text
    const text = Array.from(selectedCells)
        .map(cell => cell.textContent.trim())
        .join(',');

    // Copy to clipboard
    navigator.clipboard.writeText(text).then(() => {
        showCopyFeedback(selectedCells);
    }).catch(() => {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.classList.add('offscreen');
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showCopyFeedback(selectedCells);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
        document.body.removeChild(textarea);
    });
}

function showCopyFeedback(cells) {
    cells.forEach(cell => {
        cell.classList.add('copy-feedback');
        setTimeout(() => cell.classList.remove('copy-feedback'), 300);
    });
}

// --- Dropdown básico para filtro tipo Excel ---
function showExcelFilterDropdown(th, column) {
    document.querySelectorAll('.excel-filter-dropdown').forEach(el => el.remove());

    const dropdown = document.createElement('div');
    dropdown.className = 'excel-filter-dropdown';
    dropdown.style.position = 'absolute';
    // --- Posicionamiento exacto debajo del th ---
    const rect = th.getBoundingClientRect();
    dropdown.style.top = (rect.bottom + window.scrollY) + 'px';
    dropdown.style.left = (rect.left + window.scrollX) + 'px';
    dropdown.style.width = rect.width + 'px';
    // ---
    dropdown.style.background = '#fff';
    dropdown.style.border = '1px solid var(--border-color)';
    dropdown.style.borderRadius = '0 0 6px 6px';
    dropdown.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
    dropdown.style.zIndex = '100';
    dropdown.style.padding = '0.5rem';
    dropdown.style.fontSize = '0.95rem';

    // Search input
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'excel-filter-search';
    searchInput.placeholder = 'Search...';
    searchInput.style.width = '100%';
    searchInput.style.padding = '0.3rem';
    searchInput.style.marginBottom = '0.5rem';
    searchInput.style.border = '1px solid var(--border-color)';
    searchInput.style.borderRadius = '4px';
    dropdown.appendChild(searchInput);

    // Options container
    const optionsDiv = document.createElement('div');
    optionsDiv.className = 'excel-filter-options';
    optionsDiv.style.maxHeight = '200px';
    optionsDiv.style.overflowY = 'auto';
    dropdown.appendChild(optionsDiv);

    // Buttons container
    const buttonsDiv = document.createElement('div');
    buttonsDiv.style.display = 'flex';
    buttonsDiv.style.justifyContent = 'space-between';
    buttonsDiv.style.marginTop = '0.5rem';
    buttonsDiv.style.paddingTop = '0.5rem';
    buttonsDiv.style.borderTop = '1px solid var(--border-color)';

    // Select all button
    const selectAllBtn = document.createElement('button');
    selectAllBtn.className = 'excel-filter-selectall-btn';
    selectAllBtn.textContent = 'Select all';
    selectAllBtn.style.marginRight = '0.5rem';
    buttonsDiv.appendChild(selectAllBtn);

    // Clear all button
    const clearAllBtn = document.createElement('button');
    clearAllBtn.className = 'excel-filter-clearall-btn';
    clearAllBtn.textContent = 'Clear all';
    clearAllBtn.style.marginRight = '0.5rem';
    buttonsDiv.appendChild(clearAllBtn);

    // Apply button
    const applyBtn = document.createElement('button');
    applyBtn.className = 'excel-filter-apply-btn';
    applyBtn.textContent = 'Apply';
    buttonsDiv.appendChild(applyBtn);

    dropdown.appendChild(buttonsDiv);
    document.body.appendChild(dropdown);

    // Get unique values
    const filteredData = getFilteredData();
    const values = filteredData.map(row => row[column] ?? '').map(String);
    const columnTypes = detectColumnTypes(getOriginalData());
    const isDateColumn = columnTypes[column] === 'date';
    // --- selectedSet debe estar disponible en todo el scope ---
    let selectedSet = new Set(getTableFilterValues()[column] || []);

    // --- Lógica especial para fechas ---
    if (isDateColumn) {
        // Agrupar por año > mes > día usando parseFlexibleDate
        const dateTree = {};
        const originalsMap = {};
        values.forEach(val => {
            const date = parseFlexibleDate(val);
            if (!date) return;
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            if (!dateTree[year]) dateTree[year] = {};
            if (!dateTree[year][month]) dateTree[year][month] = {};
            if (!dateTree[year][month][day]) dateTree[year][month][day] = [];
            dateTree[year][month][day].push(val);
            // Mapear valor original a su fecha
            if (!originalsMap[year]) originalsMap[year] = {};
            if (!originalsMap[year][month]) originalsMap[year][month] = {};
            if (!originalsMap[year][month][day]) originalsMap[year][month][day] = [];
            originalsMap[year][month][day].push(val);
        });

        // Renderizado del árbol de fechas
        function renderDateTree(filter = '') {
            optionsDiv.innerHTML = '';
            const years = Object.keys(dateTree).sort();
            years.forEach(year => {
                if (filter && !year.includes(filter)) return;
                // Año
                const yearDiv = document.createElement('div');
                yearDiv.style.fontWeight = 'bold';
                yearDiv.style.margin = '0.2em 0';
                yearDiv.style.cursor = 'pointer';
                // Checkbox año
                const yearCheckbox = document.createElement('input');
                yearCheckbox.type = 'checkbox';
                yearCheckbox.value = year;
                // Todos los originales de ese año
                const allYearOriginals = Object.values(originalsMap[year]).flatMap(monthObj => Object.values(monthObj).flatMap(dayArr => dayArr));
                yearCheckbox.checked = allYearOriginals.every(d => selectedSet.has(d));
                yearCheckbox.indeterminate = !yearCheckbox.checked && allYearOriginals.some(d => selectedSet.has(d));
                yearCheckbox.addEventListener('change', () => {
                    if (yearCheckbox.checked) {
                        allYearOriginals.forEach(d => selectedSet.add(d));
                    } else {
                        allYearOriginals.forEach(d => selectedSet.delete(d));
                    }
                    renderDateTree(filter);
                });
                yearDiv.appendChild(yearCheckbox);
                yearDiv.appendChild(document.createTextNode(' ' + year));
                // Flecha expand/collapse
                let expandedYear = false;
                const monthsDiv = document.createElement('div');
                monthsDiv.style.display = 'none';
                monthsDiv.style.marginLeft = '1em';
                yearDiv.onclick = (e) => {
                    if (e.target !== yearCheckbox) {
                        expandedYear = !expandedYear;
                        monthsDiv.style.display = expandedYear ? 'block' : 'none';
                        arrow.textContent = expandedYear ? ' ▼' : ' ▶';
                    }
                };
                const arrow = document.createElement('span');
                arrow.textContent = ' ▶';
                yearDiv.appendChild(arrow);
                optionsDiv.appendChild(yearDiv);
                optionsDiv.appendChild(monthsDiv);
                // Meses
                const months = Object.keys(dateTree[year]).sort();
                months.forEach(month => {
                    if (filter && !month.includes(filter)) return;
                    const monthDiv = document.createElement('div');
                    monthDiv.style.fontWeight = 'normal';
                    monthDiv.style.margin = '0.1em 0';
                    monthDiv.style.cursor = 'pointer';
                    // Checkbox mes
                    const monthCheckbox = document.createElement('input');
                    monthCheckbox.type = 'checkbox';
                    monthCheckbox.value = `${year}-${month}`;
                    const allMonthOriginals = Object.values(originalsMap[year][month]).flatMap(dayArr => dayArr);
                    monthCheckbox.checked = allMonthOriginals.every(d => selectedSet.has(d));
                    monthCheckbox.indeterminate = !monthCheckbox.checked && allMonthOriginals.some(d => selectedSet.has(d));
                    monthCheckbox.addEventListener('change', () => {
                        if (monthCheckbox.checked) {
                            allMonthOriginals.forEach(d => selectedSet.add(d));
                        } else {
                            allMonthOriginals.forEach(d => selectedSet.delete(d));
                        }
                        renderDateTree(filter);
                    });
                    monthDiv.appendChild(monthCheckbox);
                    monthDiv.appendChild(document.createTextNode(' ' + month));
                    // Flecha expand/collapse
                    let expandedMonth = false;
                    const daysDiv = document.createElement('div');
                    daysDiv.style.display = 'none';
                    daysDiv.style.marginLeft = '1em';
                    monthDiv.onclick = (e) => {
                        if (e.target !== monthCheckbox) {
                            expandedMonth = !expandedMonth;
                            daysDiv.style.display = expandedMonth ? 'block' : 'none';
                            monthArrow.textContent = expandedMonth ? ' ▼' : ' ▶';
                        }
                    };
                    const monthArrow = document.createElement('span');
                    monthArrow.textContent = ' ▶';
                    monthDiv.appendChild(monthArrow);
                    monthsDiv.appendChild(monthDiv);
                    monthsDiv.appendChild(daysDiv);
                    // Días
                    const days = Object.keys(dateTree[year][month]).sort();
                    days.forEach(day => {
                        if (filter && !day.includes(filter)) return;
                        const dayDiv = document.createElement('div');
                        dayDiv.style.display = 'flex';
                        dayDiv.style.alignItems = 'center';
                        dayDiv.style.gap = '0.5rem';
                        dayDiv.style.padding = '0.1rem 0.5rem';
                        // Mostrar solo valores únicos (sin duplicados)
                        const uniqueOriginals = Array.from(new Set(dateTree[year][month][day]));
                        uniqueOriginals.forEach(origVal => {
                            const checkbox = document.createElement('input');
                            checkbox.type = 'checkbox';
                            checkbox.value = origVal;
                            checkbox.checked = selectedSet.has(origVal);
                            checkbox.addEventListener('change', () => {
                                if (checkbox.checked) {
                                    selectedSet.add(origVal);
                                } else {
                                    selectedSet.delete(origVal);
                                }
                                renderDateTree(filter);
                            });
                            const label = document.createElement('span');
                            label.textContent = origVal;
                            dayDiv.appendChild(checkbox);
                            dayDiv.appendChild(label);
                        });
                        daysDiv.appendChild(dayDiv);
                    });
                });
            });
        }
        renderDateTree();
        // Buscar por año, mes o día
        searchInput.addEventListener('input', debounce(() => {
            const term = searchInput.value.trim();
            renderDateTree(term);
        }, 150));

        // Seleccionar todo
        selectAllBtn.addEventListener('click', () => {
            // Selecciona todos los valores originales
            Object.values(originalsMap).forEach(yearObj => {
                Object.values(yearObj).forEach(monthObj => {
                    Object.values(monthObj).forEach(dayArr => {
                        dayArr.forEach(val => selectedSet.add(val));
                    });
                });
            });
            renderDateTree();
        });
        // Limpiar selección
        clearAllBtn.addEventListener('click', () => {
            selectedSet.clear();
            renderDateTree();
        });
        // Aplicar filtro
        applyBtn.addEventListener('click', () => {
            setTableFilterValues({ ...getTableFilterValues(), [column]: Array.from(selectedSet) });
            setTableActiveFilters({ ...getTableActiveFilters(), [column]: 'date' });
            dropdown.remove();
            applyFilters();
            refreshHeaderFilterIcons();
        });
        // Cerrar al hacer click fuera
        setTimeout(() => {
            document.addEventListener('mousedown', function handler(e) {
                if (!dropdown.contains(e.target) && e.target !== th) {
                    dropdown.remove();
                    document.removeEventListener('mousedown', handler);
                }
            });
        }, 10);
        return;
    }

    // --- Lógica normal para columnas no fecha ---
    const uniqueValues = [...new Set(values)].sort();
    let filteredValues = uniqueValues.slice();
    function renderCheckboxList() {
        optionsDiv.innerHTML = '';
        const MAX_OPTIONS = 200;
        if (filteredValues.length > MAX_OPTIONS) {
            const msg = document.createElement('div');
            msg.textContent = 'Too many values to display. Please use the search box.';
            msg.style.color = '#F44336';
            msg.style.padding = '0.5em 0';
            optionsDiv.appendChild(msg);
            return;
        }
        // Opción (Empty)
        const emptyLabel = document.createElement('label');
        emptyLabel.style.display = 'flex';
        emptyLabel.style.alignItems = 'center';
        emptyLabel.style.gap = '0.5rem';
        emptyLabel.style.padding = '0.15rem 0.5rem';
        const emptyCheckbox = document.createElement('input');
        emptyCheckbox.type = 'checkbox';
        emptyCheckbox.value = '__EMPTY__';
        emptyCheckbox.checked = selectedSet.has('__EMPTY__');
        emptyCheckbox.addEventListener('change', () => {
            if (emptyCheckbox.checked) {
                selectedSet.add('__EMPTY__');
            } else {
                selectedSet.delete('__EMPTY__');
            }
            renderCheckboxList();
        });
        emptyLabel.appendChild(emptyCheckbox);
        emptyLabel.appendChild(document.createTextNode('(Empty)'));
        optionsDiv.appendChild(emptyLabel);
        // Resto de valores
        filteredValues.forEach(val => {
            if (val === '') return; // Ya cubierto por (Empty)
            const label = document.createElement('label');
            label.style.display = 'flex';
            label.style.alignItems = 'center';
            label.style.gap = '0.5rem';
            label.style.padding = '0.15rem 0.5rem';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = val;
            checkbox.checked = selectedSet.has(val);
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    selectedSet.add(val);
                } else {
                    selectedSet.delete(val);
                }
                renderCheckboxList();
            });
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(val));
            optionsDiv.appendChild(label);
        });
    }
    // Buscar y mostrar dropdown (con debounce)
    const handleInput = debounce(() => {
        const term = searchInput.value.trim().toLowerCase();
        filteredValues = uniqueValues.filter(val => val.toLowerCase().includes(term));
        renderCheckboxList();
    }, 150);
    searchInput.addEventListener('input', handleInput);
    // Seleccionar todo
    selectAllBtn.addEventListener('click', () => {
        selectedSet = new Set(filteredValues);
        renderCheckboxList();
    });
    // Limpiar selección
    clearAllBtn.addEventListener('click', () => {
        selectedSet.clear();
        renderCheckboxList();
    });
    // Aplicar filtro
    applyBtn.addEventListener('click', () => {
        setTableFilterValues({ ...getTableFilterValues(), [column]: Array.from(selectedSet) });
        setTableActiveFilters({ ...getTableActiveFilters(), [column]: isDateColumn ? 'date' : 'reference' });
        dropdown.remove();
        applyFilters();
        refreshHeaderFilterIcons();
    });
    // Inicializar lista
    renderCheckboxList();
    // Cerrar al hacer click fuera
    setTimeout(() => {
        document.addEventListener('mousedown', function handler(e) {
            if (!dropdown.contains(e.target) && e.target !== th) {
                dropdown.remove();
                document.removeEventListener('mousedown', handler);
            }
        });
    }, 10);
}

// Refuerzo: tras aplicar o limpiar filtro, refrescar header y badges
function refreshHeaderFilterIcons() {
    const filterValues = getTableFilterValues();
    document.querySelectorAll('.data-table th').forEach(th => {
        const col = th.dataset.column;
        const icon = th.querySelector('.excel-filter-icon');
        if (!icon) return;
        // Elimina badge previo
        icon.querySelectorAll('.excel-filter-badge').forEach(b => b.remove());
        if (filterValues[col] && Array.isArray(filterValues[col]) && filterValues[col].length > 0) {
            icon.classList.add('excel-filter-active');
            // Badge rojo
            const badge = document.createElement('span');
            badge.className = 'excel-filter-badge';
            badge.style.position = 'absolute';
            badge.style.top = '0px';
            badge.style.right = '0px';
            badge.style.width = '8px';
            badge.style.height = '8px';
            badge.style.background = '#F44336';
            badge.style.borderRadius = '50%';
            badge.style.border = '1.5px solid #fff';
            badge.style.display = 'block';
            badge.style.zIndex = '2';
            icon.appendChild(badge);
        } else {
            icon.classList.remove('excel-filter-active');
        }
    });
}

// Función global para resetear todos los filtros
window.resetAllFilters = function() {
    if (typeof setTableActiveFilters === 'function' && typeof setTableFilterValues === 'function') {
        setTableActiveFilters({});
        setTableFilterValues({});
        applyFilters();
        refreshHeaderFilterIcons();
        // Limpiar visualmente los filtros Excel de las cabeceras
        document.querySelectorAll('.excel-filter-dropdown').forEach(el => el.remove());
        document.querySelectorAll('.excel-filter-icon').forEach(icon => icon.classList.remove('excel-filter-active'));
        document.querySelectorAll('.excel-dropdown input[type="checkbox"]').forEach(cb => { cb.checked = false; });
        document.querySelectorAll('.excel-dropdown input[type="text"]').forEach(inp => { inp.value = ''; });
        document.querySelectorAll('.excel-dropdown .excel-checkbox-list label').forEach(lbl => lbl.classList.remove('active'));
        // Refresca la tabla para forzar el render limpio de iconos y filtros
        displayTable(getOriginalData());
    }
}

// Función para actualizar el botón de mostrar columnas ocultas
function updateHiddenColumnsButton() {
    let hiddenColumnsBtn = document.getElementById('showHiddenColumnsBtn');
    if (!hiddenColumnsBtn) {
        hiddenColumnsBtn = document.createElement('button');
        hiddenColumnsBtn.id = 'showHiddenColumnsBtn';
        hiddenColumnsBtn.className = 'toolbar-button';
        hiddenColumnsBtn.textContent = 'Show Hidden Columns';
        hiddenColumnsBtn.style.display = 'none';
        document.querySelector('.toolbar-right').appendChild(hiddenColumnsBtn);
    }
    if (hiddenColumns.size > 0) {
        hiddenColumnsBtn.style.display = 'flex';
        hiddenColumnsBtn.onclick = showHiddenColumnsDropdown;
    } else {
        hiddenColumnsBtn.style.display = 'none';
    }
}

// Función para mostrar el dropdown de columnas ocultas
function showHiddenColumnsDropdown() {
    document.querySelectorAll('.hidden-columns-dropdown').forEach(el => el.remove());
    const dropdown = document.createElement('div');
    dropdown.className = 'hidden-columns-dropdown';
    dropdown.style.position = 'absolute';
    dropdown.style.zIndex = '1000';
    dropdown.style.background = 'white';
    dropdown.style.border = '1px solid #ddd';
    dropdown.style.borderRadius = '6px';
    dropdown.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
    dropdown.style.minWidth = '200px';
    dropdown.style.padding = '1em';
    const button = document.getElementById('showHiddenColumnsBtn');
    const rect = button.getBoundingClientRect();
    dropdown.style.left = rect.left + window.scrollX + 'px';
    dropdown.style.top = rect.bottom + window.scrollY + 'px';
    const title = document.createElement('div');
    title.style.fontWeight = '600';
    title.style.marginBottom = '0.5em';
    title.textContent = 'Hidden Columns';
    dropdown.appendChild(title);
    // --- Botón Show All ---
    if (hiddenColumns.size > 1) {
        const showAllBtn = document.createElement('button');
        showAllBtn.textContent = 'Show All';
        showAllBtn.className = 'show-column-btn';
        showAllBtn.style.marginBottom = '0.5em';
        showAllBtn.style.fontWeight = 'bold';
        showAllBtn.style.color = '#4CAF50';
        showAllBtn.onclick = (e) => {
            e.stopPropagation();
            const currentVisible = getVisibleColumns();
            const allHidden = Array.from(hiddenColumns);
            setVisibleColumns([...currentVisible, ...allHidden]);
            hiddenColumns.clear();
            displayTable(getOriginalData());
            // Sincronizar el modal de columnas
            allHidden.forEach(column => {
                const checkbox = document.querySelector(`#columnList input[type='checkbox'][value='${column.replace(/'/g, "\\'") }']`);
                if (checkbox) checkbox.checked = true;
            });
            updateHiddenColumnsButton();
            dropdown.remove();
        };
        dropdown.appendChild(showAllBtn);
    }
    const list = document.createElement('div');
    list.style.display = 'flex';
    list.style.flexDirection = 'column';
    list.style.gap = '0.5em';
    Array.from(hiddenColumns).forEach(column => {
        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.justifyContent = 'space-between';
        item.style.padding = '0.5em';
        item.style.borderRadius = '4px';
        item.style.cursor = 'pointer';
        item.style.transition = 'background 0.2s';
        const columnName = document.createElement('span');
        columnName.textContent = column;
        item.appendChild(columnName);
        const showBtn = document.createElement('button');
        showBtn.className = 'show-column-btn';
        showBtn.textContent = 'Show';
        showBtn.type = 'button';
        showBtn.title = 'Show column';
        showBtn.style.marginLeft = '1em';
        showBtn.style.cursor = 'pointer';
        showBtn.onclick = (e) => {
            e.stopPropagation();
            const currentVisible = getVisibleColumns();
            const newVisible = [...currentVisible, column];
            setVisibleColumns(newVisible);
            hiddenColumns.delete(column);
            displayTable(getOriginalData());
            const checkbox = document.querySelector(`#columnList input[type='checkbox'][value='${column.replace(/'/g, "\\'") }']`);
            if (checkbox) checkbox.checked = true;
            updateHiddenColumnsButton();
            dropdown.remove();
        };
        item.appendChild(showBtn);
        item.onmouseover = () => item.style.background = '#f5f5f5';
        item.onmouseout = () => item.style.background = 'transparent';
        list.appendChild(item);
    });
    dropdown.appendChild(list);
    document.body.appendChild(dropdown);
    setTimeout(() => {
        document.addEventListener('mousedown', function handler(e) {
            if (!dropdown.contains(e.target) && e.target !== button) {
                dropdown.remove();
                document.removeEventListener('mousedown', handler);
            }
        });
    }, 10);
}

function generateExcelReport(data) {
    // ... existing code ...
    // En generateExcelReport, pon '[Maersk Logo]' en la primera fila del array ws_data y elimina la asignación manual a ws['A1'].v y ws['A1'].s.
    // ... existing code ...
} 