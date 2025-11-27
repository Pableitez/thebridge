import { 
    getCurrentHeaders, 
    getVisibleColumns, 
    setVisibleColumns,
    getOriginalData,
    getModuleFilterValues,
    setModuleFilterValues
} from '../../store/index.js';
import { createElement, getElement, saveToIndexedDB, loadFromIndexedDB } from '../../utils/general.js';
import { displayTable } from '../table/Table.js';
import { applyFilters } from '../filters/FilterManager.js';

// Load saved views
function loadSavedViews() {
    try {
        const saved = localStorage.getItem('tableViews');
        const views = saved ? JSON.parse(saved) : {};
        // Forzar la actualización del dropdown después de cargar las vistas
        setTimeout(() => {
            setupViewSelect();
        }, 100);
        return views;
    } catch (e) {
        console.error('Error loading saved views:', e);
        return {};
    }
}



// Función global para forzar la recarga de vistas guardadas
window.refreshSavedViews = function(showNotification = false) {
    console.log('🔄 Forcing refresh of saved views...');
    
    if (showNotification) {
        showNotification('🔄 Refreshing saved views...', 'info');
    }
    
    setupViewSelect();
    
    // También actualizar en otros componentes que usen vistas guardadas
    if (window.dqHubSummary && typeof window.dqHubSummary.renderCardsSelection === 'function') {
        window.dqHubSummary.renderCardsSelection();
    }
    
    console.log('✅ Saved views refreshed');
    
    if (showNotification) {
        const views = window.loadSavedViews ? window.loadSavedViews() : {};
        const viewCount = Object.keys(views).length;
        showNotification(`✅ Saved views refreshed! (${viewCount} views available)`, 'success');
    }
};

// Función para verificar y reparar vistas guardadas
window.checkAndRepairSavedViews = function(showNotification = false) {
    console.log('🔍 Checking saved views integrity...');
    
    try {
        const saved = localStorage.getItem('tableViews');
        if (!saved) {
            console.log('⚠️ No saved views found in localStorage');
            if (showNotification) {
                showNotification('⚠️ No saved views found', 'info');
            }
            return false;
        }
        
        const views = JSON.parse(saved);
        const viewCount = Object.keys(views).length;
        
        console.log(`📊 Found ${viewCount} saved views`);
        
        // Verificar que cada vista tenga la estructura correcta
        let repaired = false;
        let repairedCount = 0;
        Object.entries(views).forEach(([name, viewObj]) => {
            if (!viewObj.columns || !Array.isArray(viewObj.columns)) {
                console.log(`⚠️ Repairing view "${name}" - missing or invalid columns`);
                viewObj.columns = [];
                repaired = true;
                repairedCount++;
            }
            if (!viewObj.headerHash) {
                console.log(`⚠️ Repairing view "${name}" - missing headerHash`);
                viewObj.headerHash = 'unknown';
                repaired = true;
                repairedCount++;
            }
        });
        
        if (repaired) {
            localStorage.setItem('tableViews', JSON.stringify(views));
            console.log('🔧 Repaired saved views structure');
            if (showNotification) {
                showNotification(`🔧 Repaired ${repairedCount} saved views`, 'warning');
            }
        }
        
        // Forzar actualización
        setupViewSelect();
        
        console.log('✅ Saved views check completed');
        if (showNotification && !repaired) {
            showNotification(`✅ Saved views check completed (${viewCount} views)`, 'success');
        }
        return true;
    } catch (error) {
        console.error('❌ Error checking saved views:', error);
        if (showNotification) {
            showNotification('❌ Error checking saved views', 'error');
        }
        return false;
    }
};

// Monitoreo automático de vistas guardadas
window.startSavedViewsMonitoring = function() {
    console.log('🔍 Starting saved views monitoring...');
    
    // Verificar cada 30 segundos si las vistas están disponibles
    setInterval(() => {
        const viewSelect = getElement('#viewSelect');
        if (viewSelect) {
            const views = loadSavedViews();
            const currentOptions = Array.from(viewSelect.options).map(opt => opt.value);
            const savedViewNames = Object.keys(views);
            
            // Si hay vistas guardadas pero no están en el dropdown, forzar actualización
            if (savedViewNames.length > 0 && currentOptions.length <= 1) {
                console.log('⚠️ Saved views detected but not in dropdown, forcing refresh...');
                showNotification('🔄 Auto-refreshing saved views...', 'info');
                window.refreshSavedViews();
                showNotification(`✅ Auto-refresh completed (${savedViewNames.length} views restored)`, 'success');
            }
        }
    }, 30000); // 30 segundos
    
    console.log('✅ Saved views monitoring started');
};

// Función de debug para mostrar el estado de las vistas guardadas
window.debugSavedViews = function(showNotification = false) {
    console.log('🔍 === SAVED VIEWS DEBUG ===');
    
    try {
        const saved = localStorage.getItem('tableViews');
        console.log('Raw localStorage data:', saved);
        
        if (saved) {
            const views = JSON.parse(saved);
            console.log('Parsed views:', views);
            const viewCount = Object.keys(views).length;
            console.log('Number of views:', viewCount);
            
            if (showNotification) {
                showNotification(`🔍 Debug: Found ${viewCount} saved views`, 'info');
            }
            
            Object.entries(views).forEach(([name, viewObj]) => {
                console.log(`View "${name}":`, {
                    columns: viewObj.columns,
                    columnCount: viewObj.columns ? viewObj.columns.length : 0,
                    headerHash: viewObj.headerHash,
                    columnOrder: viewObj.columnOrder
                });
            });
        } else {
            if (showNotification) {
                showNotification('🔍 Debug: No saved views found', 'info');
            }
        }
        
        const viewSelect = getElement('#viewSelect');
        if (viewSelect) {
            const options = Array.from(viewSelect.options).map(opt => opt.value);
            console.log('Dropdown options:', options);
            console.log('Current selection:', viewSelect.value);
            
            if (showNotification) {
                showNotification(`🔍 Debug: Dropdown has ${options.length} options, current: ${viewSelect.value}`, 'info');
            }
        } else {
            console.log('❌ viewSelect element not found');
            if (showNotification) {
                showNotification('❌ Debug: viewSelect element not found', 'error');
            }
        }
        
        console.log('=== END DEBUG ===');
    } catch (error) {
        console.error('❌ Error in debug:', error);
        if (showNotification) {
            showNotification('❌ Debug: Error occurred', 'error');
        }
    }
};

// Save view
function saveView(name, columns) {
    try {
        const views = loadSavedViews();
        const headers = getCurrentHeaders();
        const headerHash = getHeaderHash(headers);
        // Get current column order from the table
        const currentOrder = getVisibleColumns();
        // Save both the selected columns and their order, always using copies
        views[name] = { 
            columns: [...columns], 
            headerHash,
            columnOrder: [...currentOrder] 
        };
        localStorage.setItem('tableViews', JSON.stringify(views));
        
        // Trigger auto-save
        if (typeof window.triggerAutoSave === 'function') {
            window.triggerAutoSave();
        }
        
        // Forzar actualización inmediata del dropdown
        setupViewSelect();
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
        
        // Trigger auto-save
        if (typeof window.triggerAutoSave === 'function') {
            window.triggerAutoSave();
        }
        
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
    
    // Add saved views that match current header hash OR are compatible
    const currentHeaders = getCurrentHeaders();
    Object.entries(views).forEach(([viewName, viewObj]) => {
        const viewColumns = viewObj.columnOrder || viewObj.columns || [];
        const allColumnsExist = viewColumns.length > 0 && viewColumns.every(col => currentHeaders.includes(col));
        
        if (viewObj.headerHash === headerHash || allColumnsExist) {
            const option = createElement('option');
            option.value = viewName;
            option.textContent = viewName;
            // Marcar con indicador si no coincide el hash exacto pero es compatible
            if (viewObj.headerHash !== headerHash && allColumnsExist) {
                option.textContent = `${viewName} (compatible)`;
            }
            viewSelect.appendChild(option);
        }
    });
    
    // Restore selection if still exists
    const currentViewObj = views[currentValue];
    const isCompatible = currentViewObj && (
        currentViewObj.headerHash === headerHash || 
        (currentViewObj.columnOrder || currentViewObj.columns || []).every(col => currentHeaders.includes(col))
    );
    
    if (currentValue && (isCompatible || currentValue === '__all__')) {
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
        // Botón Apply
        const applyBtn = createElement('button', 'modal-btn primary');
        applyBtn.textContent = 'Apply';
        applyBtn.style.marginRight = '0.5em';
        applyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            setVisibleColumns(viewObj.columnOrder || columns);
            applyFilters();
            // NO cerramos el modal para permitir probar varias vistas
        });
        // Botón Delete
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
        actions.appendChild(applyBtn);
        actions.appendChild(deleteBtn);
        item.appendChild(viewName);
        item.appendChild(actions);
        // Click en el nombre sigue aplicando y cerrando el modal
        item.addEventListener('click', (ev) => {
            if (ev.target === applyBtn || ev.target === deleteBtn) return;
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
    // Refrescar el dropdown de vistas cada vez que se abre el modal
    setupViewSelect();
    // Clear existing columns
    columnList.innerHTML = '';
    // Add column checkboxes
    const allColumns = getCurrentHeaders();
    let visibleColumns = getVisibleColumns();

    // --- Renderizado dinámico con búsqueda y orden ---
    function renderColumnList(term = '') {
        columnList.innerHTML = '';
        let filtered = allColumns;
        if (term) {
            const lowerTerm = term.toLowerCase();
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
            checkbox.addEventListener('change', (e) => {
                // Actualizar visibleColumns solo para esta columna
                if (e.target.checked) {
                    if (!visibleColumns.includes(column)) visibleColumns.push(column);
                } else {
                    visibleColumns = visibleColumns.filter(col => col !== column);
                }
                setVisibleColumns(visibleColumns);
                applyFilters();
            });
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
        // Limpiar el texto al hacer focus
        searchInput.onfocus = () => {
            searchInput.value = '';
            renderColumnList('');
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

    // Select All y Deselect All solo afectan a las columnas filtradas
    const selectAllBtn = getElement('#selectAllBtn');
    const deselectAllBtn = getElement('#deselectAllBtn');
    if (selectAllBtn) {
        selectAllBtn.onclick = () => {
            const term = searchInput ? searchInput.value : '';
            let filtered = allColumns;
            if (term) {
                const lowerTerm = term.toLowerCase();
                filtered = allColumns.filter(col => col.toLowerCase().includes(lowerTerm));
            }
            visibleColumns = Array.from(new Set([...visibleColumns, ...filtered]));
            setVisibleColumns(visibleColumns);
            renderColumnList(term);
            applyFilters();
        };
    }
    if (deselectAllBtn) {
        deselectAllBtn.onclick = () => {
            const term = searchInput ? searchInput.value : '';
            let filtered = allColumns;
            if (term) {
                const lowerTerm = term.toLowerCase();
                filtered = allColumns.filter(col => col.toLowerCase().includes(lowerTerm));
            }
            visibleColumns = visibleColumns.filter(col => !filtered.includes(col));
            setVisibleColumns(visibleColumns);
            renderColumnList(term);
            applyFilters();
        };
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
        manageViewsBtn,
        refreshViewsBtn
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

    // Refresh Views button
    if (refreshViewsBtn) {
        refreshViewsBtn.addEventListener('click', () => {
            console.log('🔄 Manual refresh of saved views triggered');
            
            // Mostrar notificación de inicio
            if (typeof window.showUnifiedNotification === 'function') {
                window.showUnifiedNotification('🔄 Refreshing saved views...', 'info');
            }
            
            // Ejecutar refresh
            window.refreshSavedViews();
            
            // Mostrar notificación de éxito con detalles
            const views = window.loadSavedViews ? window.loadSavedViews() : {};
            const viewCount = Object.keys(views).length;
            if (typeof window.showUnifiedNotification === 'function') {
                window.showUnifiedNotification(`Saved views refreshed successfully!`, 'success');
            }
        });
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
            manageViewsBtn: getElement('#manageViewsBtn'),
        refreshViewsBtn: getElement('#refreshViewsBtn')
        };

        // Check if all required elements exist
        const missingElements = Object.entries(requiredElements)
            .filter(([key, element]) => !element)
            .map(([key]) => key);

        if (missingElements.length > 0) {
            console.error('❌ Missing required column manager elements:', missingElements);
            return;
        }

        // Verificar y reparar vistas guardadas al inicializar
        setTimeout(() => {
            window.checkAndRepairSavedViews();
        }, 500);

        // Initialize components
        setupViewSelect();
        setupColumnManagerEvents(requiredElements);

        // Iniciar monitoreo automático de vistas guardadas
        setTimeout(() => {
            window.startSavedViewsMonitoring();
        }, 1000);

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

function setupViewSelect(retry = 0) {
    const viewSelect = getElement('#viewSelect');
    if (!viewSelect) {
        if (retry < 5) {
            setTimeout(() => setupViewSelect(retry + 1), 100);
        } else {
            console.error('DEBUG - viewSelect element not found after retries');
        }
        return;
    }

    // Cargar vistas guardadas
    const views = loadSavedViews();
    const headers = getCurrentHeaders();
    const headerHash = getHeaderHash(headers);

    // Guardar el valor seleccionado antes de reconstruir
    const prevValue = viewSelect.value;

    // Limpiar opciones existentes
    viewSelect.innerHTML = '';

    // Añadir opción por defecto
    const defaultOption = document.createElement('option');
    defaultOption.value = '__all__';
    defaultOption.textContent = 'All Columns';
    viewSelect.appendChild(defaultOption);

    // Añadir vistas guardadas que coincidan con el hash actual O que sean compatibles
    const currentHeaders = getCurrentHeaders();
    Object.entries(views).forEach(([name, viewObj]) => {
        // Mostrar vista si el headerHash coincide O si todas las columnas de la vista existen en los headers actuales
        const viewColumns = viewObj.columnOrder || viewObj.columns || [];
        const allColumnsExist = viewColumns.length > 0 && viewColumns.every(col => currentHeaders.includes(col));
        
        if (viewObj.headerHash === headerHash || allColumnsExist) {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            // Marcar con indicador si no coincide el hash exacto pero es compatible
            if (viewObj.headerHash !== headerHash && allColumnsExist) {
                option.textContent = `${name} (compatible)`;
            }
            viewSelect.appendChild(option);
        }
    });

    // Restaurar el valor seleccionado si existe, si no, dejar en All Columns
    if ([...viewSelect.options].some(opt => opt.value === prevValue)) {
        viewSelect.value = prevValue;
    } else {
        viewSelect.value = '__all__';
    }

    // Eliminar cualquier evento anterior
    viewSelect.onchange = null;
    viewSelect.onclick = null;

    // Refresca siempre aunque el valor no cambie
    function applySelectedView(force = false) {
        const selectedView = viewSelect.value;
        
        // El filtro de duplicados se preserva automáticamente en el sistema de filtros
        
        if (selectedView === '__all__') {
            // Mostrar todas las columnas del dataset original
            const allHeaders = Object.keys(getOriginalData()[0] || {});
            setVisibleColumns(allHeaders);
        } else {
            const viewObj = views[selectedView];
            if (viewObj) {
                const viewColumns = viewObj.columnOrder || viewObj.columns || [];
                const currentHeaders = getCurrentHeaders();
                // Filtrar solo las columnas que existen en los headers actuales
                const validColumns = viewColumns.filter(col => currentHeaders.includes(col));
                if (validColumns.length > 0) {
                    setVisibleColumns(validColumns);
                } else {
                    // Si ninguna columna es válida, mostrar todas
                    setVisibleColumns(currentHeaders);
                }
            }
        }
        
        // Refrescar la tabla con los filtros activos actuales
        const filteredData = applyFilters();
        displayTable(filteredData);
        
        // El filtro de duplicados ahora se maneja automáticamente en applyFilters()
        // No necesitamos reaplicarlo manualmente aquí
    }

    viewSelect.onchange = () => applySelectedView();
    // Si el usuario hace click en la opción ya seleccionada, también refresca
    viewSelect.onclick = () => applySelectedView(true);
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
    // Ordena las cabeceras alfabéticamente para que el hash sea consistente
    const sorted = [...headers].sort();
    let hash = 0, i, chr;
    const str = sorted.join('||');
    for (i = 0; i < str.length; i++) {
        chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convierte a 32bit int
    }
    return hash.toString();
}

export { setupViewSelect }; 