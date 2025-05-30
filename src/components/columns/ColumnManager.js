import { 
    getCurrentHeaders, 
    getVisibleColumns, 
    setVisibleColumns,
    getOriginalData
} from '../../store/index.js';
import { createElement, getElement, saveToIndexedDB, loadFromIndexedDB } from '../../utils/general.js';
import { displayTable } from '../table/Table.js';
import { applyFilters } from '../filters/FilterManager.js';

// Load saved views
function loadSavedViews() {
    try {
        const saved = localStorage.getItem('tableViews');
        return saved ? JSON.parse(saved) : {};
    } catch (e) {
        console.error('Error loading saved views:', e);
        return {};
    }
}

// Save view
function saveView(name, columns) {
    try {
        const views = loadSavedViews();
        const headers = getCurrentHeaders();
        const headerHash = getHeaderHash(headers);
        // Get current column order from the table
        const currentOrder = getVisibleColumns();
        // Save both the selected columns and their order
        views[name] = { 
            columns, 
            headerHash,
            columnOrder: currentOrder 
        };
        localStorage.setItem('tableViews', JSON.stringify(views));
        updateViewSelect();
    } catch (e) {
        console.error('Error saving view:', e);
    }
}

// Delete view
function deleteView(name) {
    try {
        const views = loadSavedViews();
        delete views[name];
        localStorage.setItem('tableViews', JSON.stringify(views));
        updateViewSelect();
    } catch (e) {
        console.error('Error deleting view:', e);
    }
}

// Update view select dropdown
function updateViewSelect() {
    const viewSelect = getElement('#viewSelect');
    if (!viewSelect) return;

    const views = loadSavedViews();
    const headers = getCurrentHeaders();
    const headerHash = getHeaderHash(headers);
    
    // Store current selection
    const currentValue = viewSelect.value;
    
    // Clear current options and add default option
    viewSelect.innerHTML = `
        <option value="__all__">All Columns</option>
    `;
    
    // Add saved views that match current header hash
    Object.entries(views).forEach(([viewName, viewObj]) => {
        if (viewObj.headerHash === headerHash) {
            const option = createElement('option');
            option.value = viewName;
            option.textContent = viewName;
            viewSelect.appendChild(option);
        }
    });
    
    // Restore selection if still exists
    if (currentValue && (views[currentValue]?.headerHash === headerHash || currentValue === '__all__')) {
        viewSelect.value = currentValue;
    } else {
        viewSelect.value = '__all__';
    }
}

// Show manage views dialog
function showManageViewsDialog() {
    const dialog = getElement('#manageViewsDialog');
    const viewsList = getElement('#savedViewsList');
    const views = loadSavedViews();
    const headers = getCurrentHeaders();
    const headerHash = getHeaderHash(headers);

    if (!dialog || !viewsList) {
        console.error('Required elements for manage views dialog not found');
        return;
    }

    // Clear existing list
    viewsList.innerHTML = '';

    // Add views to list (solo las del hash actual)
    Object.entries(views).forEach(([name, viewObj]) => {
        if (viewObj.headerHash !== headerHash) return;
        const columns = viewObj.columns;
        const item = createElement('div', 'saved-view-item');
        const viewName = createElement('span', 'saved-view-name');
        viewName.textContent = name;
        const actions = createElement('div', 'saved-view-actions');
        const deleteBtn = createElement('button', 'view-delete-btn');
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`Are you sure you want to delete the view "${name}"?`)) {
                deleteView(name);
                item.remove();
                if (Object.keys(loadSavedViews()).length === 0) {
                    dialog.classList.add('hidden');
                }
            }
        });
        actions.appendChild(deleteBtn);
        item.appendChild(viewName);
        item.appendChild(actions);
        item.addEventListener('click', () => {
            // Apply both column visibility and order
            setVisibleColumns(viewObj.columnOrder || columns);
            applyFilters();
            dialog.classList.add('hidden');
        });
        viewsList.appendChild(item);
    });

    // Show dialog
    dialog.style.display = 'block';
    dialog.classList.remove('hidden');

    // Setup close button
    const closeBtn = getElement('#closeManageViewsBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            dialog.classList.add('hidden');
            setTimeout(() => {
                dialog.style.display = 'none';
            }, 300);
        });
    }

    // If no views, show message
    if (!Object.values(views).some(v => v.headerHash === headerHash)) {
        const message = createElement('div', 'no-views-message');
        message.textContent = 'No saved views';
        viewsList.appendChild(message);
    }
}

export function showColumnManager() {
    const modal = getElement('#columnManagerModal');
    const columnList = getElement('#columnList');
    const searchInput = getElement('#columnSearchInput');
    if (!modal || !columnList) {
        console.error('Required elements for column manager not found');
        return;
    }
    // Clear existing columns
    columnList.innerHTML = '';
    // Add column checkboxes
    const allColumns = getCurrentHeaders();
    const visibleColumns = getVisibleColumns();

    // --- Renderizado dinámico con búsqueda y orden ---
    function renderColumnList(term = '') {
        columnList.innerHTML = '';
        let filtered = allColumns;
        if (term) {
            const lowerTerm = term.toLowerCase();
            // Ordenar por prioridad: exacta, empieza por, incluye, resto
            filtered = [...allColumns].sort((a, b) => {
                const aL = a.toLowerCase(), bL = b.toLowerCase();
                if (aL === lowerTerm && bL !== lowerTerm) return -1;
                if (bL === lowerTerm && aL !== lowerTerm) return 1;
                if (aL.startsWith(lowerTerm) && !bL.startsWith(lowerTerm)) return -1;
                if (bL.startsWith(lowerTerm) && !aL.startsWith(lowerTerm)) return 1;
                if (aL.includes(lowerTerm) && !bL.includes(lowerTerm)) return -1;
                if (bL.includes(lowerTerm) && !aL.includes(lowerTerm)) return 1;
                return a.localeCompare(b);
            }).filter(col => col.toLowerCase().includes(lowerTerm));
        }
        filtered.forEach(column => {
            const item = createElement('div', 'column-item');
            const checkbox = createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `col-${column}`;
            checkbox.checked = visibleColumns.includes(column);
            checkbox.dataset.column = column;
            checkbox.value = column;
            checkbox.addEventListener('change', handleColumnVisibilityChange);
            const label = createElement('label');
            label.htmlFor = `col-${column}`;
            label.textContent = column;
            item.appendChild(checkbox);
            item.appendChild(label);
            columnList.appendChild(item);
        });
    }
    // Inicializar renderizado
    renderColumnList();
    // Listener de búsqueda
    if (searchInput) {
        searchInput.value = '';
        searchInput.oninput = (e) => {
            renderColumnList(e.target.value);
        };
    }
    // Show modal centrado
    modal.style.display = 'flex';
    modal.classList.remove('hidden');
    // Setup close button
    const closeBtn = getElement('#closeColumnManagerBtn');
    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.classList.add('hidden');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        };
    }
    // --- Módulo de Backups ---
    let backupModule = document.getElementById('backupModule');
    if (backupModule) {
        backupModule.remove();
    }
}

function setupColumnManagerEvents(elements) {
    const {
        columnManagerModal: modal,
        columnList,
        closeColumnManagerBtn: closeBtn,
        selectAllBtn,
        deselectAllBtn,
        saveBtn,
        saveViewBtn,
        manageViewsBtn
    } = elements;

    if (!modal || !columnList) {
        console.error('❌ Column manager modal or column list not found');
        return;
    }

    // Close button
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        });
    }

    // Select All button
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', handleSelectAll);
    }

    // Deselect All button
    if (deselectAllBtn) {
        deselectAllBtn.addEventListener('click', handleDeselectAll);
    }

    // Save button
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            handleColumnVisibilityChange();
            modal.classList.add('hidden');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        });
    }

    // Save as View button
    if (saveViewBtn) {
        saveViewBtn.addEventListener('click', () => {
            const viewName = prompt('Enter a name for this view:');
            if (viewName) {
                saveView(viewName, getSelectedColumns());
                updateViewSelect();
                alert('View saved!');
            }
        });
    }

    // Manage Views button
    if (manageViewsBtn) {
        manageViewsBtn.addEventListener('click', showManageViewsDialog);
    }
}

export function initializeColumnManager() {
    try {
        const requiredElements = {
            viewSelect: getElement('#viewSelect'),
            columnManagerModal: getElement('#columnManagerModal'),
            columnList: getElement('#columnList'),
            closeColumnManagerBtn: getElement('#closeColumnManagerBtn'),
            selectAllBtn: getElement('#selectAllBtn'),
            deselectAllBtn: getElement('#deselectAllBtn'),
            saveBtn: getElement('#saveBtn'),
            saveViewBtn: getElement('#saveViewBtn'),
            manageViewsBtn: getElement('#manageViewsBtn')
        };

        // Check if all required elements exist
        const missingElements = Object.entries(requiredElements)
            .filter(([key, element]) => !element)
            .map(([key]) => key);

        if (missingElements.length > 0) {
            console.error('❌ Missing required column manager elements:', missingElements);
            return;
        }

        // Initialize components
        setupViewSelect(requiredElements.viewSelect);
        setupColumnManagerEvents(requiredElements);

        // Asegurar que el botón Columns solo está en el sidebar y funciona
        const sidebarColumnsBtn = getElement('#columnsBtn');
        if (sidebarColumnsBtn) {
            sidebarColumnsBtn.addEventListener('click', showColumnManager);
        }

        console.log('✅ Column manager initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing column manager:', error);
    }
}

function setupViewSelect(viewSelect) {
    if (!viewSelect) return;
    updateViewSelect();
    viewSelect.addEventListener('change', (e) => {
        const viewName = e.target.value;
        if (!viewName) {
            const defaultColumns = getCurrentHeaders().slice(0, 10);
            setVisibleColumns(defaultColumns);
            applyFilters();
            return;
        }
        if (viewName === '__all__') {
            const allColumns = getCurrentHeaders();
            setVisibleColumns(allColumns);
            applyFilters();
            return;
        }
        const views = loadSavedViews();
        const headers = getCurrentHeaders();
        const headerHash = getHeaderHash(headers);
        const viewObj = views[viewName];
        if (viewObj && viewObj.headerHash === headerHash) {
            setVisibleColumns(viewObj.columns);
            applyFilters();
        } else {
            // Si el hash no coincide, ignora
            alert('This view does not match the current CSV columns.');
            viewSelect.value = '__all__';
        }
    });
}

function handleColumnVisibilityChange() {
    const visibleColumns = getSelectedColumns();
    setVisibleColumns(visibleColumns);
    // Aplicar filtros y actualizar la tabla
    applyFilters();
}

function handleSelectAll() {
    const checkboxes = document.querySelectorAll('#columnList input[type="checkbox"]');
    checkboxes.forEach(checkbox => checkbox.checked = true);
    setVisibleColumns(getCurrentHeaders());
    // Aplicar filtros y actualizar la tabla
    applyFilters();
}

function handleDeselectAll() {
    const checkboxes = document.querySelectorAll('#columnList input[type="checkbox"]');
    checkboxes.forEach(checkbox => checkbox.checked = false);
    setVisibleColumns([]);
    // Aplicar filtros y actualizar la tabla
    applyFilters();
}

// Corrige getSelectedColumns para leer el estado real de los checkboxes
function getSelectedColumns() {
    return Array.from(document.querySelectorAll('#columnList input[type="checkbox"]:checked'))
        .map(cb => cb.value);
}

// --- Hash simple para cabeceras ---
function getHeaderHash(headers) {
    // Un hash simple y rápido para arrays de strings
    let hash = 0, i, chr;
    const str = headers.join('||');
    for (i = 0; i < str.length; i++) {
        chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convierte a 32bit int
    }
    return hash.toString();
} 