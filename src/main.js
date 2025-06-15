import './components/custom/CustomColumnManager.js';
import { 
  initializeState, 
  setOriginalData, 
  setCurrentHeaders, 
  setVisibleColumns,
  getOriginalData,
  getCurrentHeaders,
  setRowsPerPage,
  getModuleFilterValues,
  setModuleFilterValues,
  setModuleActiveFilters,
  setTableFilterValues,
  setTableActiveFilters,
  setCurrentPage,
  getVisibleColumns,
  getTableActiveFilters,
  getTableFilterValues,
  getModuleActiveFilters // <-- Añadido aquí
} from './store/index.js';
import { validateCSVFile, parseCSVFile } from './services/csvService.js';
import { displayTable, updatePagination, colorRowsByUrgencia } from './components/table/Table.js';
import { 
  debounce, 
  searchData,
  getElement, 
  toggleElements, 
  showError,
  saveToIndexedDB,
  loadFromIndexedDB
} from './utils/general.js';
import { initializeColumnManager } from './components/columns/ColumnManager.js';
import { initializeFilterManager, resetFilterManager, generateFilterSidebar, renderActiveFiltersSummaryChips, loadQuickFilters, deleteQuickFilter, getFilteredData, applyFilters } from './components/filters/FilterManager.js';
import { initializeReportService, copyTableToClipboard } from './services/reportService.js';
import { showNotification } from './components/notifications/NotificationManager.js';
import { customColumnManager } from './components/custom/CustomColumnManager.js';
import { openSummaryModal, setupSummaryModalEvents } from './components/reports/CustomSummary.js';
import { tableNotification } from './js/notifications.js';
import './js/csvComparison.js';

let filterManager;

// Variable global para el nombre del archivo CSV actual
let currentCSVFileName = '';

let calendarMonthOffset = 0;

// Simple email validation function
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// --- Función global para obtener el email del usuario actual ---
function getCurrentUserEmail() {
  return localStorage.getItem('userEmail') || '';
}

// Initialize the application
document.addEventListener("DOMContentLoaded", async function () {
  try {
    // Verify Papa Parse is available
    if (typeof Papa === 'undefined') {
      throw new Error("Papa Parse is not loaded!");
    }
    console.log("✅ Papa Parse is loaded:", Papa.version);

    // Initialize core components
    await initializeState();
    
    // Initialize column manager (this will also add the button)
    initializeColumnManager();
    
    // Initialize filter manager
    filterManager = initializeFilterManager();
    
    // Initialize report service
    initializeReportService();
    
    // Setup event listeners
    setupEventListeners();
    setupFilterEvents();
    setupSidebarToggle();
    
    // Hide table container initially
    const tableContainer = getElement('#tableContainer');
    if (tableContainer) {
      tableContainer.classList.add('hidden');
    }
    
    console.log("✅ Application initialized successfully");

    const copyTableBtn = document.getElementById('copyTableBtn');
    if (copyTableBtn) {
      copyTableBtn.addEventListener('click', async () => {
        const result = await copyTableToClipboard();
        showNotification(result.message, result.success ? 'success' : 'error');
      });
    }

    // Botón Remove Duplicates
    const removeDuplicatesBtn = document.getElementById('removeDuplicatesBtn');
    const removeDuplicatesModal = document.getElementById('removeDuplicatesModal');
    const closeRemoveDuplicatesModalBtn = document.getElementById('closeRemoveDuplicatesModalBtn');
    const removeDuplicatesForm = document.getElementById('removeDuplicatesForm');
    const confirmRemoveDuplicatesBtn = document.getElementById('confirmRemoveDuplicatesBtn');
    const removeDuplicatesSearch = document.getElementById('removeDuplicatesSearch');
    const removeDuplicatesSelectAllBtn = document.getElementById('removeDuplicatesSelectAllBtn');
    const removeDuplicatesDeselectAllBtn = document.getElementById('removeDuplicatesDeselectAllBtn');

    // Estado temporal para columnas visibles en el modal
    let allRemoveDupColumns = [];
    let filteredRemoveDupColumns = [];

    if (removeDuplicatesBtn && removeDuplicatesModal && removeDuplicatesForm && confirmRemoveDuplicatesBtn) {
      removeDuplicatesBtn.addEventListener('click', () => {
        // Mostrar modal y rellenar checkboxes de columnas visibles
        removeDuplicatesForm.innerHTML = '';
        const data = getFilteredData();
        if (!data.length) {
          showNotification('No data to deduplicate.', 'info');
          return;
        }
        const columns = typeof getVisibleColumns === 'function' ? getVisibleColumns() : Object.keys(data[0] || {});
        allRemoveDupColumns = [...columns];
        filteredRemoveDupColumns = [...columns];
        renderRemoveDuplicatesForm();
        removeDuplicatesModal.classList.remove('hidden');
        removeDuplicatesModal.style.display = 'flex';
      });

      function renderRemoveDuplicatesForm() {
        removeDuplicatesForm.innerHTML = '';
        filteredRemoveDupColumns.forEach(col => {
          const label = document.createElement('label');
          label.style.display = 'flex';
          label.style.alignItems = 'center';
          label.style.gap = '0.5rem';
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.value = col;
          checkbox.checked = true;
          label.appendChild(checkbox);
          label.appendChild(document.createTextNode(col));
          removeDuplicatesForm.appendChild(label);
        });
      }

      // Buscador de columnas
      if (removeDuplicatesSearch) {
        removeDuplicatesSearch.addEventListener('input', (e) => {
          const term = e.target.value.trim().toLowerCase();
          filteredRemoveDupColumns = allRemoveDupColumns.filter(col => col.toLowerCase().includes(term));
          renderRemoveDuplicatesForm();
        });
      }

      // Select All
      if (removeDuplicatesSelectAllBtn) {
        removeDuplicatesSelectAllBtn.addEventListener('click', () => {
          removeDuplicatesForm.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
        });
      }
      // Deselect All
      if (removeDuplicatesDeselectAllBtn) {
        removeDuplicatesDeselectAllBtn.addEventListener('click', () => {
          removeDuplicatesForm.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        });
      }

      closeRemoveDuplicatesModalBtn.addEventListener('click', () => {
        removeDuplicatesModal.classList.add('hidden');
        setTimeout(() => {
          removeDuplicatesModal.style.display = 'none';
        }, 300);
      });

      confirmRemoveDuplicatesBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const checked = Array.from(removeDuplicatesForm.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
        if (!checked.length) {
          showNotification('Select at least one column.', 'warning');
          return;
        }
        const data = getFilteredData();
        const seen = new Set();
        const deduped = [];
        data.forEach(row => {
          const key = checked.map(col => row[col]).join('||');
          if (!seen.has(key)) {
            seen.add(key);
            deduped.push(row);
          }
        });
        if (deduped.length < data.length) {
          showNotification(`Removed ${data.length - deduped.length} duplicates.`, 'success');
          // Store current table filters
          const tableActiveFilters = getTableActiveFilters();
          const tableFilterValues = getTableFilterValues();
          // Update original data with deduplicated data
          setOriginalData(deduped);
          // Restore table filters
          setTableActiveFilters(tableActiveFilters);
          setTableFilterValues(tableFilterValues);
          // Reapply all filters
          applyFilters();
        } else {
          showNotification('No duplicates found.', 'info');
        }
        removeDuplicatesModal.classList.add('hidden');
        setTimeout(() => {
          removeDuplicatesModal.style.display = 'none';
        }, 300);
      });
    }

    // --- Login/Registro Modal Logic ---
    if (!getCurrentUserEmail()) {
      showLoginRegisterModal();
      const el = document.getElementById('logoutBtn');
      if (el) el.style.display = 'none';
    } else {
      showLogoutBtn();
    }

    // Backup Modal Setup
    setupBackupModal();

    const addCustomColumnBtn = document.getElementById('addCustomColumnBtn');
    if (addCustomColumnBtn) {
      addCustomColumnBtn.addEventListener('click', () => {
        console.log('Botón de añadir columna clickeado');
        customColumnManager.addNewColumn();
      });
    }

    // Custom Summary button
    const customSummaryBtn = document.getElementById('openCustomSummaryBtn');
    if (customSummaryBtn) {
      customSummaryBtn.addEventListener('click', () => {
        if (window.openSummaryModal) window.openSummaryModal();
      });
    }
    // Forzar setup de eventos y asignación global
    window.openSummaryModal = openSummaryModal;
    setupSummaryModalEvents();

    // Si hay un CSV pendiente en IndexedDB, procesarlo automáticamente
    const pendingCSV = await loadPendingCSVFromIndexedDB();
    if (pendingCSV) {
      try {
        // Simula un archivo CSV subido
        const data = Papa.parse(pendingCSV, { header: true });
        if (!data.data || !data.data.length) throw new Error('No data found in CSV');
        // Formatear fechas a YYYY-MM-DD
        const dateColumns = detectDateColumns(data.data);
        data.data.forEach(row => {
          dateColumns.forEach(col => {
            if (row[col]) row[col] = formatDateToYMD(row[col]);
          });
        });
        setOriginalData(data.data);
        setCurrentHeaders(Object.keys(data.data[0]));
        setVisibleColumns(Object.keys(data.data[0]));
        filterManager = null;
        setTimeout(() => {
          resetFilterManager();
          generateFilterSidebar(Object.keys(data.data[0]));
        }, 30);
        filterManager = initializeFilterManager(data.data);
        initializeReportService();
        displayTable(data.data);
        toggleElements('#tableContainer', 'show');
        await clearPendingCSVFromIndexedDB();
        console.log('✅ CSV auto-cargado tras reload (IndexedDB)');
      } catch (e) {
        showError('Error loading CSV after reload');
        await clearPendingCSVFromIndexedDB();
      }
      return;
    }

    const globalSearchInput = document.getElementById('globalSearchInput');
    if (globalSearchInput) {
      globalSearchInput.addEventListener('focus', function () {
        // Solo limpiamos el input y el filtro si hay un valor
        if (this.value) {
          this.value = '';
          // Limpiar el filtro global
          const updated = { ...getModuleFilterValues() };
          delete updated['__globalSearch'];
          setModuleFilterValues(updated);
          if (typeof applyFilters === 'function') applyFilters();
        }
      });

      // Añadir evento blur para restaurar el valor si se pierde el foco sin escribir
      globalSearchInput.addEventListener('blur', function() {
        const currentFilters = getModuleFilterValues();
        const globalSearch = currentFilters['__globalSearch'];
        if (globalSearch && !this.value) {
          this.value = globalSearch;
        }
      });
    }
  } catch (error) {
    showError("Error initializing application. Please check the console for details.");
    console.error("❌ Error details:", error);
  }
});

// Setup event listeners
function setupEventListeners() {
  const fileInput = getElement('#csvFileInput');
  const searchInput = getElement('#globalSearchInput');
  const rowsPerPageSelect = getElement('#rowsPerPageSelect');
  
  if (fileInput) {
    fileInput.addEventListener('change', handleFileUpload);
  }
  
  if (searchInput) {
    searchInput.addEventListener('input', debounce(handleSearch, 300));
  }
  
  if (rowsPerPageSelect) {
    rowsPerPageSelect.addEventListener('change', (e) => {
      setRowsPerPage(parseInt(e.target.value));
      displayTable(getOriginalData());
    });
  }
}

// Handle file upload
async function handleFileUpload(event) {
  // Si ya hay datos cargados, guarda el CSV en IndexedDB y recarga la página
  if (getOriginalData && getOriginalData().length > 0) {
    const fileInput = event.target;
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
      await savePendingCSVToIndexedDB(e.target.result);
      window.location.reload();
    };
    reader.readAsText(file);
    return;
  }
  const fileInput = event.target;
  try {
    const file = fileInput.files[0];
    if (!file) return;
    currentCSVFileName = file.name; // Guardar nombre del archivo
    
    // Validate file
    const validationResult = await validateCSVFile(file);
    if (!validationResult.isValid) {
      throw new Error(validationResult.error);
    }
    
    // Parse CSV
    const result = await parseCSVFile(file);
    if (!result.data || !result.data.length) {
      throw new Error("No data found in CSV file");
    }

    // Reset de filtros igual que el botón del módulo, justo antes de inicializar el módulo de filtros
    resetFilterManager();
    filterManager = initializeFilterManager(result.data);
    setTimeout(() => {
      resetFilterManager();
      generateFilterSidebar(Object.keys(result.data[0]));
    }, 30);

    // LIMPIEZA VISUAL: Eliminar todos los paneles y grids de filtros del DOM
    const filterPanels = document.querySelector('.filter-panels');
    if (filterPanels) {
      filterPanels.querySelectorAll('.filter-panel').forEach(panel => panel.innerHTML = '');
    }
    const filterTabs = document.querySelector('.filter-tabs');
    if (filterTabs) {
      filterTabs.querySelectorAll('.filter-tab').forEach(tab => tab.classList.remove('active'));
    }

    // Formatear fechas a YYYY-MM-DD
    const dateColumns = detectDateColumns(result.data);
    result.data.forEach(row => {
      dateColumns.forEach(col => {
        if (row[col]) row[col] = formatDateToYMD(row[col]);
      });
    });

    // Update application state
    setOriginalData(result.data);
    setCurrentHeaders(Object.keys(result.data[0]));
    setVisibleColumns(Object.keys(result.data[0]));

    // Initialize report service with new data
    initializeReportService();
    
    // Update UI
    displayTable(result.data);
    toggleElements('#tableContainer', 'show');
    
    // Refrescar el select de vistas
    if (typeof updateViewSelect === 'function') {
      updateViewSelect();
      // Forzar una segunda actualización después de un breve retraso
      setTimeout(() => {
        updateViewSelect();
      }, 100);
    }
    
    console.log("✅ CSV file processed successfully:", {
      rows: result.data.length,
      fields: result.meta.fields?.length || Object.keys(result.data[0]).length
    });
  } catch (error) {
    showError(error.message || "Error processing CSV file");
    console.error("❌ Error details:", error);
    // Clear the file input so the user can try again with the same file
    fileInput.value = '';
  }
}

// Handle global search
function handleSearch(event) {
  const searchTerm = event.target.value.toLowerCase();
  // Actualizar el valor de búsqueda global en moduleFilterValues
  setModuleFilterValues({ ...getModuleFilterValues(), '__globalSearch': searchTerm });
  // Ir siempre a la página 1 al buscar
  if (typeof setCurrentPage === 'function') setCurrentPage(1);
  // Aplicar los filtros
  applyFilters();
}

function setupSidebarToggle() {
  const toggleBtn = getElement('#toggleSidebarBtn');
  const sidebar = getElement('#sidebar');
  
  if (!toggleBtn || !sidebar) return;
  
  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
  });
}

// Setup filter-related events
function setupFilterEvents() {
  const toggleFiltersBtn = getElement('#toggleFiltersBtn');
  const filterModal = getElement('#filterModal');
  const filterOverlay = getElement('#filterModalOverlay');
  const closeFilterBtn = getElement('#closeFilterModalBtn');
  const applyFilterBtn = getElement('#applyFiltersBtn');
  const resetFilterBtn = getElement('#resetFiltersBtn');

  if (!toggleFiltersBtn || !filterModal || !filterOverlay || !closeFilterBtn) {
    console.warn('Some filter elements are missing');
    return;
}

  const showFilterModal = () => {
    try {
      // Generate filter content if we have data
      if (filterManager) {
        const data = getOriginalData();
        if (data && data.length > 0) {
          const headers = Object.keys(getOriginalData()[0] || {});
          generateFilterSidebar(headers);
        } else {
          console.warn('No data available for filters');
          return;
        }
      } else {
        console.warn('Filter manager not initialized');
        return;
      }
      filterModal.style.display = 'flex';
      filterOverlay.style.display = 'block';
      // Force a reflow to ensure the transition works
      filterModal.offsetHeight;
      filterModal.classList.remove('hidden');
      filterOverlay.classList.remove('hidden');
      // Seleccionar la pestaña Active Filters por defecto
      const tabs = filterModal.querySelectorAll('.filter-tab');
      tabs.forEach(tab => tab.classList.remove('active'));
      const activeTab = filterModal.querySelector('.filter-tab[data-target="active"]');
      if (activeTab) activeTab.classList.add('active');
      // Mostrar el panel correspondiente
      const panels = filterModal.querySelectorAll('.filter-panel');
      panels.forEach(panel => panel.classList.remove('active'));
      const activePanel = filterModal.querySelector('#activeFilterPanel');
      if (activePanel) activePanel.classList.add('active');
      renderActiveFiltersSummaryChips();
    } catch (error) {
      console.error('Error showing filter modal:', error);
      showError('Error loading filters. Please try again.');
    }
  };

  const hideFilterModal = () => {
    try {
      filterModal.classList.add('hidden');
      filterOverlay.classList.add('hidden');
      // Wait for transition to complete before hiding completely
      setTimeout(() => {
        if (filterModal.classList.contains('hidden')) {
          filterModal.style.display = 'none';
          filterOverlay.style.display = 'none';
        }
      }, 300);
    } catch (error) {
      console.error('Error hiding filter modal:', error);
      // Force hide in case of error
      filterModal.style.display = 'none';
      filterOverlay.style.display = 'none';
    }
  };

  // Toggle filters button
  toggleFiltersBtn.addEventListener('click', showFilterModal);

  // Close button
  closeFilterBtn.addEventListener('click', hideFilterModal);

  // Overlay click
  filterOverlay.addEventListener('click', (e) => {
    if (e.target === filterOverlay) {
      hideFilterModal();
}
  });

  // Apply filters
  applyFilterBtn?.addEventListener('click', () => {
    try {
      if (filterManager) {
        filterManager.applyFilters();
        updateActiveFiltersSummary();
        renderActiveFiltersSummaryChips();
        hideFilterModal();
      }
    } catch (error) {
      console.error('Error applying filters:', error);
      showError('Error applying filters. Please try again.');
    }
  });

  // Reset filters
  resetFilterBtn?.addEventListener('click', () => {
    try {
      resetFilterManager();
      generateFilterSidebar(getCurrentHeaders());
      tableNotification.show('All filters have been cleared');
      // Actualizar la tabla después de resetear los filtros
      const data = getOriginalData();
      if (data) {
        displayTable(data);
      }
    } catch (error) {
      console.error('Error resetting filters:', error);
      showError('Error resetting filters. Please try again.');
    }
  });

  // Handle ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !filterModal.classList.contains('hidden')) {
      hideFilterModal();
    }
  });
}

// Dashboard desplegable y edición
const dashboardBtn = document.getElementById('dashboardToggleBtn');
const dashboardPanel = document.getElementById('dashboardPanel');
const dashboardClose = document.getElementById('dashboardCloseBtn');
const dashboardEditBtn = document.getElementById('dashboardEditBtn');
const dashboardEditPanel = document.getElementById('dashboardEditPanel');
const dashboardEditForm = document.getElementById('dashboardEditForm');
const dashboardEditSaveBtn = document.getElementById('dashboardEditSaveBtn');
const dashboardEditCancelBtn = document.getElementById('dashboardEditCancelBtn');

// Drag & drop para reordenar secciones del dashboard
function setupDashboardEditDragDrop() {
  const list = document.getElementById('dashboardEditList');
  let draggedItem = null;
  list.querySelectorAll('.dashboard-edit-item').forEach(item => {
    item.draggable = true;
    item.addEventListener('dragstart', (e) => {
      draggedItem = item;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    item.addEventListener('dragend', () => {
      draggedItem = null;
      item.classList.remove('dragging');
    });
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (draggedItem && draggedItem !== item) {
        const rect = item.getBoundingClientRect();
        const next = (e.clientY - rect.top) > (rect.height / 2);
        list.insertBefore(draggedItem, next ? item.nextSibling : item);
      }
    });
  });
}

function getDashboardEditConfigFromForm() {
  const list = document.getElementById('dashboardEditList');
  const items = Array.from(list.querySelectorAll('.dashboard-edit-item'));
  const config = { order: [], titles: {}, kpis: false, charts: false, quickfilters: false, activity: false };
  items.forEach(item => {
    const section = item.dataset.section;
    const checked = item.querySelector('input[type="checkbox"]').checked;
    const title = item.querySelector('input[type="text"]').value || '';
    config.order.push(section);
    config.titles[section] = title;
    config[section] = checked;
  });
  return config;
}

function applyDashboardConfig(config) {
  // Ordenar y mostrar/ocultar secciones según config
  const panel = dashboardPanel;
  const sectionMap = {
    kpis: panel.querySelector('.dashboard-kpis'),
    charts: panel.querySelector('.dashboard-charts'),
    quickfilters: panel.querySelector('.dashboard-quickfilters'),
    activity: panel.querySelector('.dashboard-activity')
  };
  // Ordenar
  const order = Array.isArray(config.order)
    ? config.order
    : ['kpis', 'charts', 'quickfilters', 'activity'];
  order.forEach(section => {
    if (sectionMap[section]) panel.appendChild(sectionMap[section]);
  });
  // Mostrar/ocultar y títulos
  Object.entries(sectionMap).forEach(([section, el]) => {
    if (!el) return;
    el.style.display = config[section] ? '' : 'none';
    // Cambiar título si aplica
    const titleInput = el.querySelector('.kpi-title, .chart-placeholder, .activity-title');
    if (titleInput && config.titles && config.titles[section]) {
      if (section === 'kpis') titleInput.textContent = config.titles[section];
      if (section === 'charts') el.querySelectorAll('.chart-placeholder')[0].textContent = config.titles[section];
      if (section === 'quickfilters') {/* No hay título visual */}
      if (section === 'activity') titleInput.textContent = config.titles[section];
    }
  });
  if (typeof renderDashboardQuickFilters === 'function') renderDashboardQuickFilters();
}

function getDashboardConfig() {
  const defaultConfig = {
    order: ['kpis', 'charts', 'quickfilters', 'activity'],
    titles: { kpis: 'KPIs rápidos', charts: 'Gráficas mini', quickfilters: 'Filtros rápidos', activity: 'Actividad reciente' },
    kpis: true, charts: true, quickfilters: true, activity: true
  };
  try {
    const stored = JSON.parse(localStorage.getItem('dashboardConfig')) || {};
    // Fusiona con los valores por defecto
    return {
      ...defaultConfig,
      ...stored,
      order: Array.isArray(stored.order) ? stored.order : defaultConfig.order,
      titles: { ...defaultConfig.titles, ...(stored.titles || {}) }
    };
  } catch {
    return defaultConfig;
  }
}

function saveDashboardConfig(config) {
  localStorage.setItem('dashboardConfig', JSON.stringify(config));
}

if (dashboardBtn && dashboardPanel && dashboardClose && dashboardEditBtn && dashboardEditPanel && dashboardEditForm && dashboardEditSaveBtn && dashboardEditCancelBtn) {
  dashboardBtn.addEventListener('click', () => {
    dashboardPanel.classList.toggle('hidden');
    if (!dashboardPanel.classList.contains('hidden')) {
      applyDashboardConfig(getDashboardConfig());
    }
  });
  dashboardClose.addEventListener('click', () => {
    dashboardPanel.classList.add('hidden');
    dashboardEditPanel.classList.add('hidden');
  });
  document.addEventListener('mousedown', (e) => {
    if (!dashboardPanel.classList.contains('hidden') && !dashboardPanel.contains(e.target) && e.target !== dashboardBtn) {
      dashboardPanel.classList.add('hidden');
      dashboardEditPanel.classList.add('hidden');
    }
  });
  dashboardEditBtn.addEventListener('click', () => {
    // Cargar config actual en los checkboxes, títulos y orden
    const config = getDashboardConfig();
    const list = document.getElementById('dashboardEditList');
    // Ordenar items según config.order
    config.order.forEach(section => {
      const item = list.querySelector(`[data-section="${section}"]`);
      if (item) list.appendChild(item);
    });
    // Set checkboxes y títulos
    list.querySelectorAll('.dashboard-edit-item').forEach(item => {
      const section = item.dataset.section;
      item.querySelector('input[type="checkbox"]').checked = !!config[section];
      item.querySelector('input[type="text"]').value = config.titles[section] || '';
    });
    dashboardEditPanel.classList.remove('hidden');
    setupDashboardEditDragDrop();
  });
  dashboardEditSaveBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const config = getDashboardEditConfigFromForm();
    saveDashboardConfig(config);
    applyDashboardConfig(config);
    dashboardEditPanel.classList.add('hidden');
  });
  dashboardEditCancelBtn.addEventListener('click', (e) => {
    e.preventDefault();
    dashboardEditPanel.classList.add('hidden');
  });
  // Aplica config al cargar
  applyDashboardConfig(getDashboardConfig());
}

// Renderiza los filtros rápidos en el dashboard
function renderDashboardQuickFilters() {
  const quickFiltersDiv = document.querySelector('.quickfilters-grid');
  if (!quickFiltersDiv) return;

  // Limpiar contenedores existentes
  quickFiltersDiv.innerHTML = '';

  // Definir los contenedores que siempre deben mostrarse (ahora 5)
  const defaultContainers = {
    'default': 'Zone',
    'container1': 'Orders Management',
    'container2': 'Booking Management',
    'container3': 'Closings',
    'container4': 'Cargo Status'
  };

  // Cargar filtros guardados
  const quickFilters = loadQuickFilters();
  const grouped = {};
  
  // Inicializar los contenedores predeterminados
  Object.entries(defaultContainers).forEach(([key, title]) => {
    grouped[key] = { title, filters: [] };
  });
  
  // Agrupar filtros por contenedor
  Object.entries(quickFilters).forEach(([name, filterObj]) => {
    // Solo incluir si tiene un campo container definido y no vacío
    if (!filterObj.container || filterObj.container === '') return;
    const key = filterObj.container;
    if (!grouped[key]) {
      grouped[key] = { 
        title: filterObj.containerTitle || key.replace('container', 'Container '),
        filters: [] 
      };
    } else if (filterObj.containerTitle) {
      // Actualizar el título si hay uno personalizado
      grouped[key].title = filterObj.containerTitle;
    }
    grouped[key].filters.push({ name, filterObj });
  });

  // Obtener columnas actuales para validación
  const currentHeaders = Object.keys(getOriginalData()[0] || {});
  const currentSet = new Set(currentHeaders);

  // --- Quick filters acumulativos ---
  if (!window.activeDashboardQuickFilters) window.activeDashboardQuickFilters = [];

  // Mostrar los contenedores en fila
  Object.entries(grouped).forEach(([key, group]) => {
    const container = document.createElement('div');
    container.className = 'quickfilter-container';
    
    // Título del contenedor
    const title = document.createElement('h4');
    title.textContent = group.title;
    container.appendChild(title);

    // Contenedor para las tarjetas con scroll independiente
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'quickfilter-cards-container';
    container.appendChild(cardsContainer);

    if (group.filters.length === 0) {
      const empty = document.createElement('span');
      empty.textContent = 'No quick filters saved.';
      empty.style.color = '#888';
      cardsContainer.appendChild(empty);
    }
    group.filters.forEach(({ name, filterObj }) => {
      const savedHeaders = filterObj.headers || [];
      const savedSet = new Set(savedHeaders);
      const sameColumns = currentSet.size === savedSet.size && 
                         [...currentSet].every(col => savedSet.has(col));

      const card = document.createElement('div');
      card.className = 'kpi-card';
      card.style.cursor = sameColumns ? 'pointer' : 'not-allowed';
      card.style.position = 'relative';
      
      if (!sameColumns) {
        card.style.opacity = '0.5';
        card.title = 'This quick filter cannot be applied to the current CSV.';
      }

      // Title
      const cardTitle = document.createElement('div');
      cardTitle.className = 'kpi-title';
      cardTitle.textContent = name;
      card.appendChild(cardTitle);

      // Count (number of records if this filter is applied)
      const value = document.createElement('div');
      value.className = 'kpi-value';
      value.style.display = 'none'; // Oculta el número de registros visualmente
      value.textContent = sameColumns ? getDashboardQuickFilterPreviewCount(name) : '-';
      card.appendChild(value);

      // Delete button
      const closeBtn = document.createElement('button');
      closeBtn.className = 'quickfilter-close-btn';
      closeBtn.title = 'Delete filter';
      closeBtn.textContent = '×';
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Are you sure you want to delete the quick filter "${name}"?`)) {
          deleteQuickFilter(name);
          card.remove();
          // Si no quedan cards, mostrar mensaje vacío
          if (cardsContainer.children.length === 0) {
            const empty = document.createElement('span');
            empty.textContent = 'No quick filters saved.';
            empty.style.color = '#888';
            cardsContainer.appendChild(empty);
          }
        }
      });
      card.appendChild(closeBtn);

      // --- ACUMULATIVO: marcar activa y lógica de click ---
      const isActive = window.activeDashboardQuickFilters.includes(name);
      if (isActive) {
        card.classList.add('active');
        card.style.background = '#e3f0ff';
        card.style.border = '2.5px solid #0B36AD';
        card.style.boxShadow = '0 2px 12px #0B36AD33';
      } else {
        card.classList.remove('active');
        card.style.background = '';
        card.style.border = '';
        card.style.boxShadow = '';
      }

      if (sameColumns) {
        card.addEventListener('click', () => {
          // Alternar en el array global
          if (isActive) {
            window.activeDashboardQuickFilters = window.activeDashboardQuickFilters.filter(f => f !== name);
          } else {
            window.activeDashboardQuickFilters.push(name);
          }
          // Re-render y aplicar filtros acumulativos (urgency + quick filters)
          renderDashboardQuickFilters();
          applyOpsHubQuickFilters();
        });
      }

      cardsContainer.appendChild(card);
    });
    
    quickFiltersDiv.appendChild(container);
  });
}

// --- Aplica los quick filters acumulativos del dashboard ---
function applyDashboardQuickFilters() {
  const data = getOriginalData();
  if (!data || !data.length) {
    displayTable([]);
    return;
  }
  const quickFilters = loadQuickFilters();
  const activeNames = window.activeDashboardQuickFilters || [];
  let combinedFilterValues = {};
  let combinedActiveFilters = {};
  activeNames.forEach(name => {
    const filterObj = quickFilters[name];
    if (filterObj) {
      for (const key in filterObj.filterValues) {
        const value = filterObj.filterValues[key];
        if (combinedFilterValues[key]) {
          if (Array.isArray(combinedFilterValues[key]) || Array.isArray(value)) {
            const arr1 = Array.isArray(combinedFilterValues[key]) ? combinedFilterValues[key] : [combinedFilterValues[key]];
            const arr2 = Array.isArray(value) ? value : [value];
            combinedFilterValues[key] = Array.from(new Set([...arr1, ...arr2]));
            combinedActiveFilters[key] = 'categorical';
          } else {
            if (combinedFilterValues[key] !== value) {
              combinedFilterValues[key] = [combinedFilterValues[key], value];
              combinedActiveFilters[key] = 'categorical';
            }
          }
        } else {
          combinedFilterValues[key] = value;
          if (key.endsWith('_start') || key.endsWith('_end') || key.endsWith('_empty')) {
            const base = key.replace(/_(start|end|empty)$/, '');
            combinedActiveFilters[base] = 'date';
          } else if (Array.isArray(value)) {
            combinedActiveFilters[key] = 'categorical';
          } else {
            combinedActiveFilters[key] = 'text';
          }
        }
      }
    }
  });
  setModuleFilterValues(combinedFilterValues);
  setModuleActiveFilters(combinedActiveFilters);
  const filteredData = getFilteredData();
  displayTable(filteredData);
  renderActiveFiltersSummaryChips();
}

// Helper: get the number of records that would result from applying a quick filter
function getDashboardQuickFilterPreviewCount(name) {
  const data = getOriginalData();
  if (!data || !data.length) return 0;
  const quickFilters = loadQuickFilters();
  // Combina los quick filters activos + el nuevo
  const previewNames = window.activeDashboardQuickFilters.includes(name)
    ? window.activeDashboardQuickFilters // Si ya está activa, no añadir de nuevo
    : [...window.activeDashboardQuickFilters, name];
  let combinedFilterValues = {};
  let combinedActiveFilters = {};
  previewNames.forEach(n => {
    const filterObj = quickFilters[n];
    if (filterObj) {
      for (const key in filterObj.filterValues) {
        const value = filterObj.filterValues[key];
        if (combinedFilterValues[key]) {
          if (Array.isArray(combinedFilterValues[key]) || Array.isArray(value)) {
            const arr1 = Array.isArray(combinedFilterValues[key]) ? combinedFilterValues[key] : [combinedFilterValues[key]];
            const arr2 = Array.isArray(value) ? value : [value];
            combinedFilterValues[key] = Array.from(new Set([...arr1, ...arr2]));
            combinedActiveFilters[key] = 'categorical';
          } else {
            if (combinedFilterValues[key] !== value) {
              combinedFilterValues[key] = [combinedFilterValues[key], value];
              combinedActiveFilters[key] = 'categorical';
            }
          }
        } else {
          combinedFilterValues[key] = value;
          if (key.endsWith('_start') || key.endsWith('_end') || key.endsWith('_empty')) {
            const base = key.replace(/_(start|end|empty)$/, '');
            combinedActiveFilters[base] = 'date';
          } else if (Array.isArray(value)) {
            combinedActiveFilters[key] = 'categorical';
          } else {
            combinedActiveFilters[key] = 'text';
          }
        }
      }
    }
  });
  // Filtra los datos
  return data.filter(row => {
    return Object.entries(combinedFilterValues).every(([key, value]) => {
      // Soporte para filtros de fecha con _start y _end
      if (key.endsWith('_start') || key.endsWith('_end')) {
        const baseKey = key.replace(/_(start|end)$/, '');
        const cellValue = row[baseKey];
        // Si el filtro es empty y no hay valor, cuenta como válido
        if ((cellValue === '' || cellValue === null || cellValue === undefined) && (combinedFilterValues[`${baseKey}_empty`] || value === '__EMPTY__')) {
          return true;
        }
        // Si no hay valor y no se busca empty, no cuenta
        if (!cellValue) return false;
        // Parsear fechas (soporta __TODAY__ y formatos flexibles)
        let filterDate = value;
        let cellDate = cellValue;
        if (typeof resolveDynamicDateExpr === 'function') {
          filterDate = resolveDynamicDateExpr(value);
        }
        const filterD = typeof parseFlexibleDate === 'function' ? parseFlexibleDate(filterDate) : new Date(filterDate);
        const cellD = typeof parseFlexibleDate === 'function' ? parseFlexibleDate(cellDate) : new Date(cellDate);
        if (!filterD || !cellD || isNaN(filterD) || isNaN(cellD)) return false;
        if (key.endsWith('_start')) return cellD >= filterD;
        if (key.endsWith('_end')) return cellD <= filterD;
      }
      // Soporte para vacíos en fechas
      if (key.endsWith('_empty')) {
        const baseKey = key.replace(/_empty$/, '');
        if (value) {
          return row[baseKey] === '' || row[baseKey] === null || row[baseKey] === undefined;
        }
      }
      if (Array.isArray(value)) {
        // Si incluye __EMPTY__, cuenta también vacíos/null/undefined
        if (value.includes('__EMPTY__')) {
          return value.includes(row[key]) || row[key] === '' || row[key] === null || row[key] === undefined;
        }
        return value.includes(row[key]);
      }
      // Si el valor es __EMPTY__, cuenta vacíos/null/undefined
      if (value === '__EMPTY__') {
        return row[key] === '' || row[key] === null || row[key] === undefined;
      }
      return row[key] === value;
    });
  }).length;
}

// Genera un resumen textual del filtro
function resumenFiltro(filterValues) {
  return Object.entries(filterValues).map(([k,v]) => `${k}: ${Array.isArray(v) ? v.join(',') : v}`).join(' | ');
}

// Renderiza los filtros rápidos al abrir el dashboard
if (dashboardBtn && dashboardPanel) {
  dashboardBtn.addEventListener('click', () => {
    setTimeout(renderDashboardQuickFilters, 100);
  });
}

function updateActiveFiltersSummary() {
  // Implementation of updateActiveFiltersSummary function
} 

// Utilidad para formatear fechas a YYYY-MM-DD
function formatDateToYMD(dateStr) {
  if (!dateStr) return '';
  // Si ya está en formato YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  // Si está en formato DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const [d, m, y] = dateStr.split('-');
    return `${y}-${m}-${d}`;
  }
  // Si está en formato MM/DD/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [m, d, y] = dateStr.split('/');
    return `${y}-${m}-${d}`;
  }
  // Si está en formato DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [d, m, y] = dateStr.split('/');
    return `${y}-${m}-${d}`;
  }
  // Si está en formato YYYY/MM/DD
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('/');
    return `${y}-${m}-${d}`;
  }
  // Si está en formato MM-DD-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const [m, d, y] = dateStr.split('-');
    return `${y}-${m}-${d}`;
  }
  // Si es una fecha válida reconocida por Date
  const d = new Date(dateStr);
  if (!isNaN(d)) {
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return '';
}

// Detectar columnas de fecha por nombre o por contenido
function detectDateColumns(data) {
  if (!data || !data.length) return [];
  const headers = Object.keys(data[0]);
  // Por nombre
  const dateLike = headers.filter(h => /date|etd|eta|pickup|fecha|fch/i.test(h) && !/delivery/i.test(h));
  // Por contenido: si más del 80% de los valores son fechas válidas
  const byContent = headers.filter(h => {
    if (h.trim().toLowerCase() === 'number of containers' || /delivery/i.test(h)) return false;
    const vals = data.map(row => row[h]);
    const valid = vals.filter(v => v && !isNaN(Date.parse(v)));
    return valid.length > 0 && valid.length / vals.length > 0.8;
  });
  // Excluir explícitamente 'Number of containers' de la lista final
  return Array.from(new Set([...dateLike, ...byContent])).filter(h => h.trim().toLowerCase() !== 'number of containers');
}

// --- Login/Registro Modal Logic ---
function getUserKey(email) {
  return `user_${email.toLowerCase()}`;
}

function saveUserCredentials(email, password) {
  localStorage.setItem(getUserKey(email), JSON.stringify({ email, password }));
}

function getUserCredentials(email) {
  const data = localStorage.getItem(getUserKey(email));
  return data ? JSON.parse(data) : null;
}

function showLoginRegisterModal() {
  const modal = document.getElementById('loginModal');
  const loginPanel = document.getElementById('loginPanel');
  const registerPanel = document.getElementById('registerPanel');
  const showLoginBtn = document.getElementById('showLoginPanelBtn');
  const showRegisterBtn = document.getElementById('showRegisterPanelBtn');

  if (!modal || !loginPanel || !registerPanel || !showLoginBtn || !showRegisterBtn) return;

  // Mostrar panel de login por defecto
  function showLogin() {
    if (loginPanel) loginPanel.style.display = '';
    if (registerPanel) registerPanel.style.display = 'none';
    if (showLoginBtn) showLoginBtn.disabled = true;
    if (showRegisterBtn) showRegisterBtn.disabled = false;
  }
  function showRegister() {
    if (loginPanel) loginPanel.style.display = 'none';
    if (registerPanel) registerPanel.style.display = '';
    if (showLoginBtn) showLoginBtn.disabled = false;
    if (showRegisterBtn) showRegisterBtn.disabled = true;
  }
  if (showLoginBtn) showLoginBtn.onclick = showLogin;
  if (showRegisterBtn) showRegisterBtn.onclick = showRegister;
  showLogin();

  // Login
  const loginEmail = document.getElementById('loginEmailInput');
  const loginPassword = document.getElementById('loginPasswordInput');
  const loginBtn = document.getElementById('loginBtn');
  const loginError = document.getElementById('loginError');
  if (loginBtn) loginBtn.onclick = () => {
    const email = loginEmail?.value.trim().toLowerCase();
    const password = loginPassword?.value;
    if (!isValidEmail(email)) {
      if (loginError) loginError.textContent = 'Enter a valid email.';
      return;
    }
    const user = getUserCredentials(email);
    if (!user || user.password !== password) {
      if (loginError) loginError.textContent = 'Incorrect email or password.';
      return;
    }
    setCurrentUserEmail(email);
    if (modal) modal.classList.add('hidden');
    setTimeout(() => { if (modal) modal.style.display = 'none'; }, 300);
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.style.display = '';
    location.reload();
  };

  // Registration
  const registerEmail = document.getElementById('registerEmailInput');
  const registerPassword = document.getElementById('registerPasswordInput');
  const registerPasswordRepeat = document.getElementById('registerPasswordRepeatInput');
  const registerBtn = document.getElementById('registerBtn');
  const registerError = document.getElementById('registerError');
  if (registerBtn) registerBtn.onclick = () => {
    const email = registerEmail?.value.trim().toLowerCase();
    const password = registerPassword?.value;
    const passwordRepeat = registerPasswordRepeat?.value;
    if (!isValidEmail(email)) {
      if (registerError) registerError.textContent = 'Enter a valid email.';
      return;
    }
    // Strong password validation
    if (!password || password.length < 6 ||
        !/[A-Z]/.test(password) ||
        !/[a-z]/.test(password) ||
        !/[0-9]/.test(password)) {
      if (registerError) registerError.textContent = 'Password must be at least 6 characters, contain an uppercase letter, a lowercase letter, and a number.';
      return;
    }
    if (password !== passwordRepeat) {
      if (registerError) registerError.textContent = 'Passwords do not match.';
      return;
    }
    if (getUserCredentials(email)) {
      if (registerError) registerError.textContent = 'This email is already registered.';
      return;
    }
    saveUserCredentials(email, password);
    if (registerError) {
      registerError.style.color = '#10B981';
      registerError.textContent = 'User registered successfully. You can now sign in.';
      setTimeout(() => {
        registerError.style.color = '#d32f2f';
        showLogin();
      }, 1800);
    }
  };

  if (modal) modal.style.display = 'flex';
  if (modal) modal.classList.remove('hidden');
  if (loginEmail) loginEmail.value = '';
  if (loginPassword) loginPassword.value = '';
  if (registerEmail) registerEmail.value = '';
  if (registerPassword) registerPassword.value = '';
  if (registerPasswordRepeat) registerPasswordRepeat.value = '';
  if (loginError) loginError.textContent = '';
  if (registerError) registerError.textContent = '';
  if (loginEmail) loginEmail.focus();
}

// --- Mostrar login/registro modal si no hay usuario ---
document.addEventListener('DOMContentLoaded', function () {
  if (!getCurrentUserEmail()) {
    showLoginRegisterModal();
    const el = document.getElementById('logoutBtn');
    if (el) el.style.display = 'none';
  } else {
    showLogoutBtn();
  }
});

// --- Adaptar backups para usar email ---
export async function saveUserBackup(projectId, backup) {
  const email = getCurrentUserEmail();
  if (!email) return;
  await saveToIndexedDB(`backup-${email}-${projectId}`, backup);
}

export async function loadUserBackup(projectId) {
  const email = getCurrentUserEmail();
  if (!email) return null;
  return await loadFromIndexedDB(`backup-${email}-${projectId}`);
}

function setCurrentUserEmail(email) {
  localStorage.setItem('userEmail', email);
}

function showLogoutBtn() {
  const btn = document.getElementById('logoutBtn');
  if (btn) {
    btn.style.display = '';
    btn.style.color = '#d32f2f';
    btn.style.fontWeight = 'bold';
    btn.onclick = function () {
      if (confirm('Are you sure you want to log out?')) {
        localStorage.removeItem('userEmail');
        location.reload();
      }
    };
  }
}

// --- Versiones de datos cargados usando IndexedDB ---
function generateDataVersionId() {
  return Date.now() + '-' + Math.random().toString(36).substr(2, 6);
}

async function getDataVersions() {
  // Devuelve todos los registros de la store 'dataVersions'
  const all = await loadFromIndexedDB('dataVersions');
  if (!all) return [];
  if (Array.isArray(all)) return all; // compatibilidad antigua
  // Si es un objeto tipo {id: version, ...}, conviértelo a array
  return Object.values(all);
}

async function saveDataVersion(data) {
  const id = generateDataVersionId();
  const now = new Date();
  const name = now.toLocaleString('sv-SE', { hour12: false }).replace('T', ' ');
  const fileName = currentCSVFileName || `Data Version ${name}`;
  // Guardar como objeto individual
  let all = await loadFromIndexedDB('dataVersions');
  if (!all || Array.isArray(all)) all = {};
  all[id] = { id, name, fileName, data };
  await saveToIndexedDB('dataVersions', all);
}

async function deleteDataVersion(id) {
  let all = await loadFromIndexedDB('dataVersions');
  if (!all || Array.isArray(all)) all = {};
  delete all[id];
  await saveToIndexedDB('dataVersions', all);
}

// --- Data Version Modal (control de versiones de datos) ---
function setupDataVersionModal() {
  const dataVersionBtn = getElement('#dataVersionBtn');
  const dataVersionModal = getElement('#dataVersionModal');
  const closeDataVersionModalBtn = getElement('#closeDataVersionModalBtn');
  const saveDataVersionBtn = getElement('#saveDataVersionBtn');
  const dataVersionsSearchInput = getElement('#dataVersionsSearch');
  const dataVersionsListDiv = getElement('#dataVersionsList');
  let dataVersionsSearchTerm = '';

  if (!dataVersionBtn || !dataVersionModal || !closeDataVersionModalBtn) return;

  // Abrir modal
  dataVersionBtn.addEventListener('click', () => {
    dataVersionModal.style.display = 'flex';
    dataVersionModal.classList.remove('hidden');
    renderDataVersionsList();
  });
  // Cerrar modal
  closeDataVersionModalBtn.addEventListener('click', () => {
    dataVersionModal.classList.add('hidden');
    setTimeout(() => { dataVersionModal.style.display = 'none'; }, 300);
  });
  // Guardar versión de datos
  if (saveDataVersionBtn) {
    saveDataVersionBtn.addEventListener('click', async () => {
      const data = getOriginalData ? getOriginalData() : [];
      if (!data || !data.length) {
        showNotification('No data loaded to save.', 'warning');
        return;
      }
      await saveDataVersion(data);
      renderDataVersionsList();
      showNotification('Data version saved.', 'success');
    });
  }
  // Búsqueda
  if (dataVersionsSearchInput) {
    dataVersionsSearchInput.addEventListener('input', () => {
      dataVersionsSearchTerm = dataVersionsSearchInput.value;
      renderDataVersionsList();
    });
  }
  // Renderizar lista de versiones
  async function renderDataVersionsList() {
    if (!dataVersionsListDiv) return;
    let versions = await getDataVersions();
    if (!versions.length) {
      dataVersionsListDiv.innerHTML = '<div style="color:#888;font-style:italic;">No data versions saved.</div>';
      return;
    }
    // Filtrar por búsqueda
    if (dataVersionsSearchTerm) {
      const term = dataVersionsSearchTerm.toLowerCase();
      versions = versions.filter(v =>
        v.fileName.toLowerCase().includes(term) || v.name.toLowerCase().includes(term)
      );
    }
    if (!versions.length) {
      dataVersionsListDiv.innerHTML = '<div style="color:#888;font-style:italic;">No matches found.</div>';
      return;
    }
    // Tabla compacta
    let html = '<table class="data-versions-table"><thead><tr>' +
      '<th>Date/Time</th><th>File</th><th class="actions">Actions</th></tr></thead><tbody>';
    versions.sort((a, b) => b.name.localeCompare(a.name)).forEach(v => {
      html += `<tr>
        <td style="font-family:monospace;">${v.name}</td>
        <td><span style="color:#1976d2;">${v.fileName}</span></td>
        <td class="actions">
          <button class='modal-btn secondary' data-load-version='${v.id}' style='padding:0.2em 0.7em;font-size:0.95em;'>Load</button>
          <button class='modal-btn danger' data-delete-version='${v.id}' style='padding:0.2em 0.7em;font-size:0.95em;'>Delete</button>
          <button class='modal-btn' data-export-version='${v.id}' style='padding:0.2em 0.7em;font-size:0.95em;'>Export</button>
        </td>
      </tr>`;
    });
    html += '</tbody></table>';
    dataVersionsListDiv.innerHTML = html;
    // Listeners
    dataVersionsListDiv.querySelectorAll('[data-load-version]').forEach(btn => {
      btn.addEventListener('click', async e => {
        const id = btn.dataset.loadVersion;
        const versions = await getDataVersions();
        const v = versions.find(x => x.id === id);
        if (v) {
          setOriginalData(v.data);
          setCurrentHeaders(Object.keys(v.data[0]));
          setVisibleColumns(Object.keys(v.data[0]));
          resetFilterManager();
          filterManager = initializeFilterManager(v.data);
          initializeReportService();
          displayTable(v.data);
          toggleElements('#tableContainer', 'show');
          if (typeof updateViewSelect === 'function') updateViewSelect();
          if (typeof renderDashboardQuickFilters === 'function') renderDashboardQuickFilters();
          showNotification('Data version loaded.', 'success');
        } else {
          showNotification('Invalid data version file.', 'error');
        }
      });
    });
    dataVersionsListDiv.querySelectorAll('[data-delete-version]').forEach(btn => {
      btn.addEventListener('click', async e => {
        const id = btn.dataset.deleteVersion;
        const versions = await getDataVersions();
        const v = versions.find(x => x.id === id);
        if (v && confirm('Delete this data version?')) {
          await deleteDataVersion(id);
          renderDataVersionsList();
        }
      });
    });
    dataVersionsListDiv.querySelectorAll('[data-export-version]').forEach(btn => {
      btn.addEventListener('click', async e => {
        const id = btn.dataset.exportVersion;
        const versions = await getDataVersions();
        const v = versions.find(x => x.id === id);
        if (v) {
          const blob = new Blob([JSON.stringify(v, null, 2)], { type: 'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `data-version-${v.name.replace(/\s+/g, '_')}.json`;
          a.click();
        }
      });
    });
    // Después de renderizar la lista de versiones, agrega un botón para importar una versión:
    let importBtn = document.getElementById('importDataVersionBtn');
    if (!importBtn) {
      importBtn = document.createElement('button');
      importBtn.id = 'importDataVersionBtn';
      importBtn.className = 'modal-btn primary';
      importBtn.textContent = 'Import Data Version';
      importBtn.style.margin = '0.7em 0 0.5em 0';
      dataVersionsListDiv.parentElement.insertBefore(importBtn, dataVersionsListDiv);
      importBtn.onclick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = async (ev) => {
            try {
              const v = JSON.parse(ev.target.result);
              if (v && v.data && Array.isArray(v.data)) {
                setOriginalData(v.data);
                setCurrentHeaders(Object.keys(v.data[0]));
                setVisibleColumns(Object.keys(v.data[0]));
                resetFilterManager();
                filterManager = initializeFilterManager(v.data);
                initializeReportService();
                displayTable(v.data);
                toggleElements('#tableContainer', 'show');
                if (typeof updateViewSelect === 'function') updateViewSelect();
                if (typeof renderDashboardQuickFilters === 'function') renderDashboardQuickFilters();
                showNotification('Data version imported and loaded.', 'success');
              } else {
                showNotification('Invalid data version file.', 'error');
              }
            } catch (err) {
              showNotification('Error importing data version.', 'error');
            }
          };
          reader.readAsText(file);
        };
        input.click();
      };
    }
  }
}

// --- User Set Up Modal (gestión de filtros, vistas, quick filters, dashboard config) ---
function setupUserSetUpModal() {
  const userSetUpBtn = getElement('#userSetUpBtn');
  const userSetUpModal = getElement('#userSetUpModal');
  const closeUserSetUpBtn = getElement('#closeUserSetUpModalBtn');
  const userSetUpStatus = getElement('#userSetUpStatus');
  const modalContent = userSetUpModal ? userSetUpModal.querySelector('.modal-content') : null;

  if (!userSetUpBtn || !userSetUpModal || !closeUserSetUpBtn) return;

  // Abrir modal
  userSetUpBtn.addEventListener('click', () => {
    userSetUpModal.style.display = 'flex';
    userSetUpModal.classList.remove('hidden');
    if (userSetUpStatus) userSetUpStatus.textContent = '';
    renderUserSetUpModalContent();
  });
  // Cerrar modal
  closeUserSetUpBtn.addEventListener('click', () => {
    userSetUpModal.classList.add('hidden');
    setTimeout(() => { userSetUpModal.style.display = 'none'; }, 300);
  });

  function renderUserSetUpModalContent() {
    if (!modalContent) return;
    modalContent.innerHTML = `
      <div class="backup-section">
        <h4>Dashboard Configuration</h4>
        <div class="backup-actions" style="display: flex; flex-direction: column; gap: 0.7em;">
          <div style="display: flex; gap: 0.7em;">
            <button id="saveToFolderBtn_user" class="modal-btn primary" style="flex:1;">Save to Folder</button>
            <button id="loadFromFolderBtn_user" class="modal-btn secondary" style="flex:1;">Load from Folder</button>
          </div>
        </div>
      </div>
      <div id="userSetUpStatus_user" style="margin-top:1rem; font-size:0.95em; color:#1976d2;"></div>
    `;
    // Asignar listeners a los botones
    const saveToFolderBtn = getElement('#saveToFolderBtn_user');
    const loadFromFolderBtn = getElement('#loadFromFolderBtn_user');
    const userSetUpStatus = getElement('#userSetUpStatus_user');

    if (saveToFolderBtn) {
      saveToFolderBtn.onclick = async () => {
        // Exportar snapshot completo
        const filtros = JSON.parse(localStorage.getItem('myFilters') || '[]');
        const filtrosGuardados = JSON.parse(localStorage.getItem('myFilters') || '{}');
        const vistas = JSON.parse(localStorage.getItem('tableViews') || '{}');
        const favoritos = JSON.parse(localStorage.getItem('favoritos') || '[]');
        const quickFilters = JSON.parse(localStorage.getItem('quickFilters') || '{}');
        const customSummaries = JSON.parse(localStorage.getItem('customSummaries') || '{}');
        const tablas = getOriginalData ? getOriginalData() : [];
        const dashboardConfig = getDashboardConfig();
        const backup = {
          filtros,
          filtrosGuardados,
          vistas,
          favoritos,
          quickFilters,
          customSummaries,
          tablas,
          dashboardConfig,
          fecha: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'thebridge-snapshot.json';
        a.click();
        if (userSetUpStatus) {
          userSetUpStatus.textContent = '✅ Snapshot exported to file.';
          userSetUpStatus.className = 'success';
        }
      };
    }
    if (loadFromFolderBtn) {
      loadFromFolderBtn.onclick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = async (ev) => {
            try {
              const backup = JSON.parse(ev.target.result);
              if (backup.filtrosGuardados) localStorage.setItem('myFilters', JSON.stringify(backup.filtrosGuardados));
              if (backup.filtros) localStorage.setItem('myFilters', JSON.stringify(backup.filtros));
              if (backup.filtros && typeof setModuleFilterValues === 'function' && typeof applyFilters === 'function') {
                setModuleFilterValues(backup.filtros);
                applyFilters();
              }
              if (backup.vistas) {
                localStorage.setItem('tableViews', JSON.stringify(backup.vistas));
                if (typeof updateViewSelect === 'function') updateViewSelect();
              }
              if (backup.favoritos) localStorage.setItem('favoritos', JSON.stringify(backup.favoritos));
              if (backup.quickFilters) {
                localStorage.setItem('quickFilters', JSON.stringify(backup.quickFilters));
                if (typeof renderDashboardQuickFilters === 'function') renderDashboardQuickFilters();
              }
              if (backup.customSummaries) {
                localStorage.setItem('customSummaries', JSON.stringify(backup.customSummaries));
              }
              if (backup.dashboardConfig) saveDashboardConfig(backup.dashboardConfig);
              if (backup.tablas && Array.isArray(backup.tablas)) {
                if (typeof setOriginalData === 'function') {
                  setOriginalData(backup.tablas);
                  displayTable(backup.tablas);
                }
              }
              applyDashboardConfig(getDashboardConfig());
              if (userSetUpStatus) {
                userSetUpStatus.textContent = '✅ Snapshot imported and applied.';
                userSetUpStatus.className = 'success';
              }
            } catch (err) {
              if (userSetUpStatus) {
                userSetUpStatus.textContent = '❌ Error importing snapshot.';
                userSetUpStatus.className = 'error';
              }
            }
          };
          reader.readAsText(file);
        };
        input.click();
      };
    }
  }
}

// Inicializar ambos modales
setupDataVersionModal();
setupUserSetUpModal();

// Backup Modal Setup
function setupBackupModal() {
  const backupBtn = getElement('#backupBtn');
  const backupModal = getElement('#backupModal');
  const closeBackupBtn = getElement('#closeBackupModalBtn');
  const saveFilterBtn = getElement('#saveFilterBtn');
  const saveViewBtn = getElement('#saveViewBtn');
  const saveQuickFilterBtn = getElement('#saveQuickFilterBtn');
  const manageQuickFiltersBtn = getElement('#manageQuickFiltersBtn');
  const saveDashboardConfigBtn = getElement('#saveDashboardConfigBtn');
  const backupStatus = getElement('#backupStatus');
  const saveDataVersionBtn = getElement('#saveDataVersionBtn');

  if (!backupBtn || !backupModal || !closeBackupBtn) {
    console.warn('Required backup modal elements not found');
    return;
  }

  // Show modal
  backupBtn.addEventListener('click', () => {
    backupModal.style.display = 'flex';
    backupModal.classList.remove('hidden');
    renderDataVersionsList();
  });

  // Close modal
  closeBackupBtn.addEventListener('click', () => {
    backupModal.classList.add('hidden');
    setTimeout(() => {
      backupModal.style.display = 'none';
    }, 300);
  });

  // Guardar versión de datos
  if (saveDataVersionBtn) {
    saveDataVersionBtn.addEventListener('click', async () => {
      const data = getOriginalData ? getOriginalData() : [];
      if (!data || !data.length) {
        showNotification('No hay datos cargados para guardar.', 'warning');
        return;
      }
      await saveDataVersion(data);
      renderDataVersionsList();
      showNotification('Versión de datos guardada.', 'success');
    });
  }

  // Save current filter
  if (saveFilterBtn) {
    saveFilterBtn.addEventListener('click', () => {
      const name = prompt('Enter a name for this filter:');
      if (name) {
        saveMyFilter(name);
        backupStatus.textContent = '✅ Filtro guardado correctamente.';
        backupStatus.className = 'success';
      }
    });
  }

  // Save current view
  if (saveViewBtn) {
    saveViewBtn.addEventListener('click', () => {
      const name = prompt('Enter a name for this view:');
      if (name) {
        saveView(name, getVisibleColumns());
        backupStatus.textContent = '✅ Vista guardada correctamente.';
        backupStatus.className = 'success';
      }
    });
  }

  // Save quick filter
  if (saveQuickFilterBtn) {
    saveQuickFilterBtn.addEventListener('click', () => {
      const name = prompt('Name for the quick filter:');
      if (name) {
        saveQuickFilter(name);
        backupStatus.textContent = '✅ Filtro rápido guardado correctamente.';
        backupStatus.className = 'success';
      }
    });
  }

  // Manage quick filters
  if (manageQuickFiltersBtn) {
    manageQuickFiltersBtn.addEventListener('click', () => {
      // Show quick filters management UI
      const quickFilters = loadQuickFilters();
      const names = Object.keys(quickFilters);
      if (names.length === 0) {
        backupStatus.textContent = 'No hay filtros rápidos guardados.';
        backupStatus.className = '';
        return;
      }
      // Create and show quick filters list
      const list = document.createElement('div');
      list.className = 'quick-filters-list';
      names.forEach(name => {
        const item = document.createElement('div');
        item.className = 'quick-filter-item';
        item.innerHTML = `
          <span>${name}</span>
          <button class="delete-btn" data-name="${name}">🗑️</button>
        `;
        list.appendChild(item);
      });
      // Show list in modal
      const modalContent = backupModal.querySelector('.modal-content');
      modalContent.appendChild(list);
      // Add delete handlers
      list.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const name = btn.dataset.name;
          if (confirm(`¿Eliminar el filtro rápido "${name}"?`)) {
            deleteQuickFilter(name);
            btn.closest('.quick-filter-item').remove();
            backupStatus.textContent = '✅ Filtro rápido eliminado.';
            backupStatus.className = 'success';
          }
        });
      });
    });
  }

  // Save dashboard config
  if (saveDashboardConfigBtn) {
    saveDashboardConfigBtn.addEventListener('click', () => {
      const config = getDashboardConfig();
      saveDashboardConfig(config);
      backupStatus.textContent = '✅ Configuración del dashboard guardada.';
      backupStatus.className = 'success';
    });
  }
}

// Initialize backup modal
setupBackupModal();

// --- Snapshot Manager Modal ---
function setupSnapshotManagerModal() {
  const snapshotBtn = getElement('#snapshotManagerBtn');
  const snapshotModal = getElement('#snapshotManagerModal');
  const closeSnapshotBtn = getElement('#closeSnapshotManagerModalBtn');
  const saveSnapshotBtn = getElement('#saveSnapshotBtn');
  const restoreSnapshotBtn = getElement('#restoreSnapshotBtn');
  const snapshotStatus = getElement('#snapshotStatus');

  if (!snapshotBtn || !snapshotModal || !closeSnapshotBtn) return;

  // Abrir modal
  snapshotBtn.addEventListener('click', () => {
    snapshotModal.style.display = 'flex';
    snapshotModal.classList.remove('hidden');
    snapshotStatus.textContent = '';
    snapshotStatus.className = '';
  });
  // Cerrar modal
  closeSnapshotBtn.addEventListener('click', () => {
    snapshotModal.classList.add('hidden');
    setTimeout(() => { snapshotModal.style.display = 'none'; }, 300);
  });
  // Guardar snapshot
  if (saveSnapshotBtn) {
    saveSnapshotBtn.addEventListener('click', async () => {
      try {
        const filtros = JSON.parse(localStorage.getItem('myFilters') || '[]');
        const vistas = JSON.parse(localStorage.getItem('tableViews') || '{}');
        const favoritos = JSON.parse(localStorage.getItem('favoritos') || '[]');
        const tablas = getOriginalData ? getOriginalData() : [];
        const dashboardConfig = getDashboardConfig();
        const backup = {
          filtros,
          vistas,
          favoritos,
          tablas,
          dashboardConfig,
          fecha: new Date().toISOString()
        };
        await saveToIndexedDB('backup', backup);
        snapshotStatus.textContent = '✅ Snapshot saved successfully.';
        snapshotStatus.className = 'success';
      } catch (e) {
        snapshotStatus.textContent = '❌ Error saving snapshot.';
        snapshotStatus.className = 'error';
      }
    });
  }
  // Restaurar snapshot
  if (restoreSnapshotBtn) {
    restoreSnapshotBtn.addEventListener('click', async () => {
      try {
        const backup = await loadFromIndexedDB('backup');
        if (!backup) {
          snapshotStatus.textContent = '❌ No snapshot found.';
          snapshotStatus.className = 'error';
          return;
        }
        if (backup.filtros) localStorage.setItem('myFilters', JSON.stringify(backup.filtros));
        if (backup.vistas) {
          localStorage.setItem('tableViews', JSON.stringify(backup.vistas));
          if (typeof updateViewSelect === 'function') updateViewSelect();
        }
        if (backup.favoritos) localStorage.setItem('favoritos', JSON.stringify(backup.favoritos));
        if (backup.dashboardConfig) saveDashboardConfig(backup.dashboardConfig);
        if (backup.tablas && Array.isArray(backup.tablas)) {
          if (typeof setOriginalData === 'function') {
            setOriginalData(backup.tablas);
            displayTable(backup.tablas);
          }
        }
        snapshotStatus.textContent = '✅ Snapshot restored. Reload the page to apply all changes.';
        snapshotStatus.className = 'success';
      } catch (e) {
        snapshotStatus.textContent = '❌ Error restoring snapshot.';
        snapshotStatus.className = 'error';
      }
    });
  }
}

// Inicializar modal de snapshot manager
setupSnapshotManagerModal(); 

// Add notification for refresh
document.getElementById('refreshTableBtn')?.addEventListener('click', () => {
  // Your existing refresh code here
  tableNotification.show('Table has been refreshed');
});

// --- IndexedDB helpers para archivos grandes ---
function savePendingCSVToIndexedDB(content) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('TheBridgeDB', 1);
    request.onupgradeneeded = function(event) {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending')) {
        db.createObjectStore('pending');
      }
    };
    request.onsuccess = function(event) {
      const db = event.target.result;
      const tx = db.transaction('pending', 'readwrite');
      const store = tx.objectStore('pending');
      store.put(content, 'pendingCSV');
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e);
    };
    request.onerror = (e) => reject(e);
  });
}
function loadPendingCSVFromIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('TheBridgeDB', 1);
    request.onupgradeneeded = function(event) {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending')) {
        db.createObjectStore('pending');
      }
    };
    request.onsuccess = function(event) {
      const db = event.target.result;
      const tx = db.transaction('pending', 'readonly');
      const store = tx.objectStore('pending');
      const getReq = store.get('pendingCSV');
      getReq.onsuccess = () => resolve(getReq.result);
      getReq.onerror = (e) => reject(e);
    };
    request.onerror = (e) => reject(e);
  });
}
function clearPendingCSVFromIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('TheBridgeDB', 1);
    request.onupgradeneeded = function(event) {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending')) {
        db.createObjectStore('pending');
      }
    };
    request.onsuccess = function(event) {
      const db = event.target.result;
      const tx = db.transaction('pending', 'readwrite');
      const store = tx.objectStore('pending');
      store.delete('pendingCSV');
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e);
    };
    request.onerror = (e) => reject(e);
  });
}

// --- Week number and calendar popup in header ---
function getWeekNumber(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
  return weekNo;
}

function updateWeekNumberDisplay() {
  const el = document.getElementById('weekNumberDisplay');
  if (!el) return;
  const now = new Date();
  const week = getWeekNumber(now);
  el.textContent = `Week ${week}`;
}

function renderCalendarPopup() {
  const popup = document.getElementById('calendarPopup');
  if (!popup) return;
  const now = new Date();
  const baseDate = new Date(now.getFullYear(), now.getMonth() + calendarMonthOffset, 1);
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  // Get first day of month
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = firstDay.getDay() === 0 ? 7 : firstDay.getDay(); // Monday=1, Sunday=7
  let html = `<div style="background:#e3f2fd; color:#222; border-radius:8px; box-shadow:0 4px 16px rgba(0,0,0,0.18); padding:1em; min-width:320px; font-size:1em;">
    <div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5em;'>
      <button id='prevMonthBtn' style='background:none;border:none;font-size:1.3em;cursor:pointer;color:#1976d2;' title='Previous month'>&#8592;</button>
      <span style='font-weight:600;'>${baseDate.toLocaleString('default', { month: 'long' })} ${year}</span>
      <button id='nextMonthBtn' style='background:none;border:none;font-size:1.3em;cursor:pointer;color:#1976d2;' title='Next month'>&#8594;</button>
      <button id='closeCalendarPopupBtn' style='background:none;border:none;font-size:1.2em;cursor:pointer;margin-left:0.5em;'>&times;</button>
    </div>
    <table style='width:100%;border-collapse:collapse;'>
      <thead><tr><th style='color:#1976d2;'>Wk</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th><th>Sun</th></tr></thead><tbody>`;
  let day = 1;
  let weekRow = 0;
  const today = new Date();
  while (day <= lastDay.getDate()) {
    html += '<tr>';
    // Número de semana
    const weekDate = new Date(year, month, day);
    html += `<td style='color:#1976d2;font-weight:600;text-align:center;'>${getWeekNumber(weekDate)}</td>`;
    // Días de la semana
    for (let i = 1; i <= 7; i++) {
      const cellDay = (weekRow === 0 && i < startDay) ? '' : (day <= lastDay.getDate() ? day : '');
      if (cellDay) {
        const cellDate = new Date(year, month, cellDay);
        let highlight = '';
        if (
          cellDate.getDate() === today.getDate() &&
          cellDate.getMonth() === today.getMonth() &&
          cellDate.getFullYear() === today.getFullYear()
        ) {
          highlight = "background:#1976d2;color:#fff;font-weight:700;border-radius:6px;box-shadow:0 1px 4px rgba(25,118,210,0.10);";
        }
        html += `<td style='text-align:center;cursor:pointer;padding:0.2em 0.4em;border-radius:4px;${highlight}' data-date='${cellDate.toISOString()}'>${cellDay}</td>`;
        day++;
      } else {
        html += '<td></td>';
      }
    }
    html += '</tr>';
    weekRow++;
  }
  html += '</tbody></table>';
  html += `<div id='calendarDayInfo' style='margin-top:0.7em;color:#1976d2;font-size:1em;min-height:1.2em;'></div>`;
  html += '</div>';
  popup.innerHTML = html;

  // Navegación de meses
  document.getElementById('prevMonthBtn').onclick = (e) => {
    e.stopPropagation();
    calendarMonthOffset--;
    renderCalendarPopup();
  };
  document.getElementById('nextMonthBtn').onclick = (e) => {
    e.stopPropagation();
    calendarMonthOffset++;
    renderCalendarPopup();
  };
  // Cerrar popup
  document.getElementById('closeCalendarPopupBtn').onclick = () => {
    popup.style.display = 'none';
    calendarMonthOffset = 0;
  };
  // Mostrar info de día al hacer hover
  popup.querySelectorAll('td[data-date]').forEach(td => {
    td.addEventListener('mouseenter', (e) => {
      const date = new Date(td.dataset.date);
      const info = document.getElementById('calendarDayInfo');
      if (info) info.textContent = `${date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
    });
    td.addEventListener('mouseleave', (e) => {
      const info = document.getElementById('calendarDayInfo');
      if (info) info.textContent = '';
    });
  });
}

function setupWeekNumberCalendar() {
  const weekDiv = document.getElementById('dateTimeInfo');
  const popup = document.getElementById('calendarPopup');
  if (!weekDiv || !popup) return;
  weekDiv.onclick = (e) => {
    e.stopPropagation();
    renderCalendarPopup();
    popup.style.display = 'block';
  };
  // Cerrar al hacer click fuera
  document.addEventListener('mousedown', (e) => {
    if (!popup.contains(e.target) && !weekDiv.contains(e.target)) {
      popup.style.display = 'none';
      calendarMonthOffset = 0;
    }
  });
}

updateWeekNumberDisplay();
setupWeekNumberCalendar();
setInterval(updateWeekNumberDisplay, 60 * 1000);

// --- Gestión de configuraciones de dashboard ---
function getAllDashboardConfigs() {
  try {
    return JSON.parse(localStorage.getItem('dashboardConfigs')) || {};
  } catch {
    return {};
  }
}
function saveAllDashboardConfigs(configs) {
  localStorage.setItem('dashboardConfigs', JSON.stringify(configs));
}
function showManageDashboardConfigModal() {
  const modal = document.getElementById('manageDashboardConfigModal');
  const closeBtn = document.getElementById('closeManageDashboardConfigBtn');
  const listDiv = document.getElementById('dashboardConfigsList');
  const newNameInput = document.getElementById('newDashboardConfigName');
  const saveNewBtn = document.getElementById('saveNewDashboardConfigBtn');
  if (!modal || !closeBtn || !listDiv || !newNameInput || !saveNewBtn) return;
  function renderList() {
    const configs = getAllDashboardConfigs();
    const current = getDashboardConfig();
    if (Object.keys(configs).length === 0) {
      listDiv.innerHTML = '<div style="color:#888;font-style:italic;">No configs saved.</div>';
      return;
    }
    let html = '<ul style="list-style:none;padding:0;">';
    Object.entries(configs).forEach(([name, cfg]) => {
      html += `<li style='display:flex;align-items:center;gap:0.5em;margin-bottom:0.4em;'>
        <span style='flex:1;font-family:monospace;'>${name}</span>
        <button class='modal-btn secondary' data-load='${name}' style='padding:0.2em 0.7em;font-size:0.95em;'>Load</button>
        <button class='modal-btn' data-rename='${name}' style='padding:0.2em 0.7em;font-size:0.95em;'>Rename</button>
        <button class='modal-btn danger' data-delete='${name}' style='padding:0.2em 0.7em;font-size:0.95em;'>Delete</button>
      </li>`;
    });
    html += '</ul>';
    listDiv.innerHTML = html;
    // Listeners
    listDiv.querySelectorAll('[data-load]').forEach(btn => {
      btn.onclick = () => {
        const name = btn.getAttribute('data-load');
        const configs = getAllDashboardConfigs();
        if (configs[name]) {
          saveDashboardConfig(configs[name]);
          showNotification('Dashboard config loaded.', 'success');
        }
      };
    });
    listDiv.querySelectorAll('[data-delete]').forEach(btn => {
      btn.onclick = () => {
        const name = btn.getAttribute('data-delete');
        if (confirm(`Delete config '${name}'?`)) {
          const configs = getAllDashboardConfigs();
          delete configs[name];
          saveAllDashboardConfigs(configs);
          renderList();
        }
      };
    });
    listDiv.querySelectorAll('[data-rename]').forEach(btn => {
      btn.onclick = () => {
        const name = btn.getAttribute('data-rename');
        const newName = prompt('New name:', name);
        if (newName && newName !== name) {
          const configs = getAllDashboardConfigs();
          if (configs[newName]) {
            alert('A config with that name already exists.');
            return;
          }
          configs[newName] = configs[name];
          delete configs[name];
          saveAllDashboardConfigs(configs);
          renderList();
        }
      };
    });
  }
  renderList();
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
  closeBtn.onclick = () => {
    modal.classList.add('hidden');
    setTimeout(() => { modal.style.display = 'none'; }, 300);
  };
  saveNewBtn.onclick = () => {
    const name = newNameInput.value.trim();
    if (!name) return;
    const configs = getAllDashboardConfigs();
    if (configs[name]) {
      alert('A config with that name already exists.');
      return;
    }
    configs[name] = getDashboardConfig();
    saveAllDashboardConfigs(configs);
    newNameInput.value = '';
    renderList();
  };
}

// Quick Actions functionality
function setupQuickActions() {
  const quickFiltersGrid = document.querySelector('.quickfilters-grid');
  const addQuickFilterBtn = document.getElementById('addQuickFilterBtn');
  const savedFiltersList = document.querySelector('.saved-filters-list');

  if (!quickFiltersGrid || !addQuickFilterBtn || !savedFiltersList) return;

  // Handle predefined quick actions
  quickFiltersGrid.addEventListener('click', (e) => {
    const button = e.target.closest('.quickfilter-btn');
    if (!button) return;

    const action = button.dataset.action;
    if (!action) return;

    switch (action) {
      case 'pending':
        setModuleFilterValues({ status: ['Pending'] });
        break;
      case 'today':
        const today = new Date().toISOString().split('T')[0];
        setModuleFilterValues({ 
          date_start: today,
          date_end: today
        });
        break;
      case 'terminal':
        setModuleFilterValues({ location: ['Terminal'] });
        break;
      case 'changes':
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        setModuleFilterValues({
          modified_date_start: lastWeek.toISOString().split('T')[0]
        });
        break;
    }

    applyFilters();
    renderActiveFiltersSummaryChips();
  });

  // Add new quick filter
  addQuickFilterBtn.addEventListener('click', () => {
    const name = prompt('Enter a name for this quick filter:');
    if (!name) return;

    const currentFilters = getModuleFilterValues();
    if (Object.keys(currentFilters).length === 0) {
      alert('Please set up some filters first before saving as a quick filter.');
      return;
    }

    saveQuickFilter(name);
    renderSavedFilters();
  });

  // Render saved filters
  function renderSavedFilters() {
    const quickFilters = loadQuickFilters();
    savedFiltersList.innerHTML = '';

    Object.entries(quickFilters).forEach(([name, filter]) => {
      const item = document.createElement('div');
      item.className = 'saved-filter-item';
      item.innerHTML = `
        <span>${name}</span>
        <button class="delete-btn" title="Delete filter">×</button>
      `;

      // Apply filter
      item.addEventListener('click', (e) => {
        if (!e.target.classList.contains('delete-btn')) {
          applyQuickFilter(name);
        }
      });

      // Delete filter
      const deleteBtn = item.querySelector('.delete-btn');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Delete quick filter "${name}"?`)) {
          deleteQuickFilter(name);
          renderSavedFilters();
        }
      });

      savedFiltersList.appendChild(item);
    });
  }

  // Initial render
  renderSavedFilters();
}

// Initialize quick actions when dashboard is opened
document.getElementById('dashboardToggleBtn')?.addEventListener('click', () => {
  setTimeout(setupQuickActions, 100);
}); 

// --- BARRA DE TARJETAS DE FILTROS ACUMULATIVOS EN OPS HUB ---
function renderOpsHubFilterChips() {
  const dashboardPanel = document.getElementById('dashboardPanel');
  if (!dashboardPanel) return;
  let chipsBar = document.getElementById('opsHubFilterChipsBar');
  if (!chipsBar) {
    chipsBar = document.createElement('div');
    chipsBar.id = 'opsHubFilterChipsBar';
    chipsBar.style.display = 'flex';
    chipsBar.style.gap = '0.7rem';
    chipsBar.style.margin = '0.7rem 0 1.2rem 0';
    chipsBar.style.flexWrap = 'wrap';
    const header = dashboardPanel.querySelector('.dashboard-header');
    if (header && header.nextSibling) {
      dashboardPanel.insertBefore(chipsBar, header.nextSibling);
    } else {
      dashboardPanel.appendChild(chipsBar);
    }
  }
  chipsBar.innerHTML = '';
  
  // Define tarjetas de urgencia
  const urgencyCards = [
    { label: 'Urgent', key: 'Urgente', color: '#ffcdd2' },
    { label: 'Medium', key: 'Media', color: '#fff9c4' },
    { label: 'Low', key: 'Baja', color: '#c8e6c9' }
  ];
  
  // Carga quick filters guardados
  let quickFilters = {};
  try {
    quickFilters = JSON.parse(localStorage.getItem('quickFilters')) || {};
  } catch { quickFilters = {}; }

  // Estado global de tarjetas activas
  if (!window.activeUrgencyCards) window.activeUrgencyCards = [];

  // Helper para calcular el número de registros si se añade una card
  function getPreviewCount(cardKey) {
    const data = getOriginalData();
    console.log('DEBUG - getPreviewCount for card:', cardKey);
    console.log('DEBUG - Original data length:', data?.length);
    
    if (!data || !data.length) return 0;
    const quickFiltersObj = quickFilters;
    // Si la card está activa, usa solo las activas
    const isActive = window.activeUrgencyCards.includes(cardKey);
    const previewCards = isActive
      ? window.activeUrgencyCards
      : [...window.activeUrgencyCards, cardKey];
    
    console.log('DEBUG - Active cards:', window.activeUrgencyCards);
    console.log('DEBUG - Preview cards:', previewCards);
    
    let combinedFilterValues = {};
    let combinedActiveFilters = {};
    previewCards.forEach(key => {
      const entry = Object.entries(quickFiltersObj).find(([name, obj]) => obj.linkedUrgencyCard === key);
      console.log('DEBUG - Found filter entry for card', key, ':', entry);
      
      if (entry) {
        const [, filterObj] = entry;
        console.log('DEBUG - Filter object:', filterObj);
        
        for (const k in filterObj.filterValues) {
          const value = filterObj.filterValues[k];
          if (combinedFilterValues[k]) {
            if (Array.isArray(combinedFilterValues[k]) || Array.isArray(value)) {
              const arr1 = Array.isArray(combinedFilterValues[k]) ? combinedFilterValues[k] : [combinedFilterValues[k]];
              const arr2 = Array.isArray(value) ? value : [value];
              combinedFilterValues[k] = Array.from(new Set([...arr1, ...arr2]));
              combinedActiveFilters[k] = 'categorical';
            } else {
              if (combinedFilterValues[k] !== value) {
                combinedFilterValues[k] = [combinedFilterValues[k], value];
                combinedActiveFilters[k] = 'categorical';
              }
            }
          } else {
            combinedFilterValues[k] = value;
            if (k.endsWith('_start') || k.endsWith('_end') || k.endsWith('_empty')) {
              const base = k.replace(/_(start|end|empty)$/, '');
              combinedActiveFilters[base] = 'date';
            } else if (Array.isArray(value)) {
              combinedActiveFilters[k] = 'categorical';
            } else {
              combinedActiveFilters[k] = 'text';
            }
          }
        }
      }
    });
    
    console.log('DEBUG - Combined filter values:', combinedFilterValues);
    console.log('DEBUG - Combined active filters:', combinedActiveFilters);
    
    // Filtra los datos
    const filteredData = data.filter(row => {
      return Object.entries(combinedFilterValues).every(([key, value]) => {
        // Soporte para filtros de fecha con _start y _end
        if (key.endsWith('_start') || key.endsWith('_end')) {
          const baseKey = key.replace(/_(start|end)$/, '');
          const cellValue = row[baseKey];
          // Si el filtro es empty y no hay valor, cuenta como válido
          if ((cellValue === '' || cellValue === null || cellValue === undefined) && (combinedFilterValues[`${baseKey}_empty`] || value === '__EMPTY__')) {
            return true;
          }
          // Si no hay valor y no se busca empty, no cuenta
          if (!cellValue) return false;
          // Parsear fechas (soporta __TODAY__ y formatos flexibles)
          let filterDate = value;
          let cellDate = cellValue;
          if (typeof resolveDynamicDateExpr === 'function') {
            filterDate = resolveDynamicDateExpr(value);
          }
          const filterD = typeof parseFlexibleDate === 'function' ? parseFlexibleDate(filterDate) : new Date(filterDate);
          const cellD = typeof parseFlexibleDate === 'function' ? parseFlexibleDate(cellDate) : new Date(cellDate);
          if (!filterD || !cellD || isNaN(filterD) || isNaN(cellD)) return false;
          if (key.endsWith('_start')) return cellD >= filterD;
          if (key.endsWith('_end')) return cellD <= filterD;
        }
        // Soporte para vacíos en fechas
        if (key.endsWith('_empty')) {
          const baseKey = key.replace(/_empty$/, '');
          if (value) {
            return row[baseKey] === '' || row[baseKey] === null || row[baseKey] === undefined;
          }
        }
        if (Array.isArray(value)) {
          // Si incluye __EMPTY__, cuenta también vacíos/null/undefined
          if (value.includes('__EMPTY__')) {
            return value.includes(row[key]) || row[key] === '' || row[key] === null || row[key] === undefined;
          }
          return value.includes(row[key]);
        }
        // Si el valor es __EMPTY__, cuenta vacíos/null/undefined
        if (value === '__EMPTY__') {
          return row[key] === '' || row[key] === null || row[key] === undefined;
        }
        return row[key] === value;
      });
    });
    
    console.log('DEBUG - Filtered data length:', filteredData.length);
    console.log('DEBUG - First few filtered rows:', filteredData.slice(0, 3));
    
    return filteredData.length;
  }

  urgencyCards.forEach(card => {
    const btn = document.createElement('button');
    btn.textContent = card.label;
    btn.className = 'ops-hub-chip';
    const isActive = window.activeUrgencyCards.includes(card.key);
    
    // Busca filtro asociado
    const filterEntry = Object.entries(quickFilters).find(([name, obj]) => obj.linkedUrgencyCard === card.key);
    
    // Comprobar compatibilidad de columnas
    let compatible = false;
    if (filterEntry) {
      const filterObj = filterEntry[1];
      const currentHeaders = Object.keys(getOriginalData()[0] || {});
      const savedHeaders = filterObj.headers || [];
      const currentSet = new Set(currentHeaders);
      const savedSet = new Set(savedHeaders);
      compatible = currentSet.size === savedSet.size && [...currentSet].every(col => savedSet.has(col));
    }

    // Estilo visual mejorado para estado activo/inactivo
    if (isActive) {
      btn.classList.add('active');
      btn.style.background = '#0B36AD';
      btn.style.color = '#fff';
      btn.style.border = '2.5px solid #0B36AD';
      btn.style.boxShadow = '0 2px 12px #0B36AD33';
      // Solo deja el label, sin check
      btn.innerHTML = card.label;
    } else {
      btn.classList.remove('active');
      btn.style.background = filterEntry ? card.color : '#f5f6fa';
      btn.style.color = filterEntry ? '#222' : '#aaa';
      btn.style.border = '1.5px solid #b3c6e6';
      btn.style.boxShadow = '0 1px 4px rgba(0,36,61,0.06)';
      btn.innerHTML = card.label;
    }

    btn.style.borderRadius = '18px';
    btn.style.fontWeight = 'bold';
    btn.style.transition = 'all 0.2s ease';

    // Lógica de habilitación/deshabilitación y tooltip
    if (!filterEntry) {
      btn.disabled = true;
      btn.style.opacity = '0.5';
      btn.style.cursor = 'not-allowed';
      btn.title = 'No quick filter associated. Save one from the filters module.';
    } else if (!compatible) {
      btn.disabled = true;
      btn.style.opacity = '0.5';
      btn.style.cursor = 'not-allowed';
      btn.title = 'This quick filter cannot be applied to the current CSV.';
    } else {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
      btn.title = '';
    }

    // Mostrar número de registros
    if (filterEntry && compatible) {
      const countSpan = document.createElement('span');
      countSpan.style.display = 'none'; // Oculta el número de registros visualmente
      countSpan.style.marginLeft = '0.7em';
      countSpan.style.fontWeight = 'normal';
      countSpan.style.fontSize = '0.98em';
      countSpan.style.background = isActive ? '#fff' : '#e3e8f7';
      countSpan.style.color = isActive ? '#0B36AD' : '#222';
      countSpan.style.padding = '0.18em 0.7em';
      countSpan.style.borderRadius = '12px';
      countSpan.style.boxShadow = isActive ? '0 1px 4px #0B36AD22' : 'none';
      countSpan.textContent = getPreviewCount(card.key);
      btn.appendChild(countSpan);
    }

    // Solo permitir click si está habilitado
    btn.onclick = () => {
      if (btn.disabled) return;
      // Alterna la tarjeta en el array global
      if (isActive) {
        window.activeUrgencyCards = window.activeUrgencyCards.filter(k => k !== card.key);
      } else {
        window.activeUrgencyCards.push(card.key);
      }
      // Re-renderiza los chips y aplica los filtros acumulativos
      renderOpsHubFilterChips();
      applyOpsHubQuickFilters();
    };
    chipsBar.appendChild(btn);
  });
}

function applyOpsHubQuickFilters() {
  const data = getOriginalData();
  if (!data || !data.length) {
    displayTable([]);
    return;
  }
  const quickFiltersObj = JSON.parse(localStorage.getItem('quickFilters')) || {};
  // Obtener quick filters activos del dashboard y de urgencia
  const activeUrgencyCards = window.activeUrgencyCards || [];
  const activeDashboardQuickFilters = window.activeDashboardQuickFilters || [];
  // Unir ambos arrays de nombres de quick filters (urgency usa linkedUrgencyCard)
  let combinedFilterValues = {};
  let combinedActiveFilters = {};
  // Primero, aplicar los quick filters del dashboard
  activeDashboardQuickFilters.forEach(name => {
    const filterObj = quickFiltersObj[name];
    if (filterObj) {
      for (const key in filterObj.filterValues) {
        const value = filterObj.filterValues[key];
        if (combinedFilterValues[key]) {
          if (Array.isArray(combinedFilterValues[key]) || Array.isArray(value)) {
            const arr1 = Array.isArray(combinedFilterValues[key]) ? combinedFilterValues[key] : [combinedFilterValues[key]];
            const arr2 = Array.isArray(value) ? value : [value];
            combinedFilterValues[key] = Array.from(new Set([...arr1, ...arr2]));
            combinedActiveFilters[key] = 'categorical';
          } else {
            if (combinedFilterValues[key] !== value) {
              combinedFilterValues[key] = [combinedFilterValues[key], value];
              combinedActiveFilters[key] = 'categorical';
            }
          }
        } else {
          combinedFilterValues[key] = value;
          if (key.endsWith('_start') || key.endsWith('_end') || key.endsWith('_empty')) {
            const base = key.replace(/_(start|end|empty)$/, '');
            combinedActiveFilters[base] = 'date';
          } else if (Array.isArray(value)) {
            combinedActiveFilters[key] = 'categorical';
          } else {
            combinedActiveFilters[key] = 'text';
          }
        }
      }
    }
  });
  // Luego, aplicar los quick filters de urgencia (pueden combinarse)
  activeUrgencyCards.forEach(cardKey => {
    const entry = Object.entries(quickFiltersObj).find(([name, obj]) => obj.linkedUrgencyCard === cardKey);
    if (entry) {
      const [, filterObj] = entry;
      for (const key in filterObj.filterValues) {
        const value = filterObj.filterValues[key];
        if (combinedFilterValues[key]) {
          if (Array.isArray(combinedFilterValues[key]) || Array.isArray(value)) {
            const arr1 = Array.isArray(combinedFilterValues[key]) ? combinedFilterValues[key] : [combinedFilterValues[key]];
            const arr2 = Array.isArray(value) ? value : [value];
            combinedFilterValues[key] = Array.from(new Set([...arr1, ...arr2]));
            combinedActiveFilters[key] = 'categorical';
          } else {
            if (combinedFilterValues[key] !== value) {
              combinedFilterValues[key] = [combinedFilterValues[key], value];
              combinedActiveFilters[key] = 'categorical';
            }
          }
        } else {
          combinedFilterValues[key] = value;
          if (key.endsWith('_start') || key.endsWith('_end') || key.endsWith('_empty')) {
            const base = key.replace(/_(start|end|empty)$/, '');
            combinedActiveFilters[base] = 'date';
          } else if (Array.isArray(value)) {
            combinedActiveFilters[key] = 'categorical';
          } else {
            combinedActiveFilters[key] = 'text';
          }
        }
      }
    }
  });
  // Guardar el estado actual del dashboard
  const dashboardPanel = document.getElementById('dashboardPanel');
  const wasVisible = dashboardPanel && !dashboardPanel.classList.contains('hidden');
  // Aplicar los filtros
  setModuleFilterValues(combinedFilterValues);
  setModuleActiveFilters(combinedActiveFilters);
  // Aplicar filtros sin cerrar el modal
  const filteredData = getFilteredData();
  displayTable(filteredData);
  renderActiveFiltersSummaryChips();
  // Restaurar el estado del dashboard si estaba visible
  if (wasVisible && dashboardPanel) {
    dashboardPanel.classList.remove('hidden');
    dashboardPanel.classList.add('show');
  }
}

// --- COLOREADO DE FILAS EN LA TABLA PRINCIPAL SEGÚN URGENCIA ---
// (Eliminada la función local colorRowsByUrgencia, se usará la importada)
// ... existing code ...

// --- INICIALIZACIÓN EN EL OPS HUB ---
function setupOpsHubFilters() {
  // Limpiar y resetear todo el estado y DOM de filtros
  if (typeof resetFilterManager === 'function') {
    resetFilterManager();
  }
  // Regenerar el sidebar/modal de filtros limpio
  if (typeof generateFilterSidebar === 'function') {
    generateFilterSidebar(getCurrentHeaders());
  }
  // Renderizar los chips del Ops Hub
  renderOpsHubFilterChips();
  // Aplicar los filtros del Ops Hub
  applyOpsHubQuickFilters();
}

if (dashboardBtn) {
  dashboardBtn.addEventListener('click', () => {
    setTimeout(() => {
      setupOpsHubFilters();
      renderOpsHubFilterChips();
    }, 200);
  });
}

// Ensure Ops Hub button opens dashboard
const dashboardToggleBtn = document.getElementById('dashboardToggleBtn');
const dashboardOverlay = document.querySelector('.dashboard-overlay');

if (dashboardToggleBtn && dashboardPanel) {
  dashboardToggleBtn.onclick = () => {
    dashboardPanel.classList.remove('hidden');
    dashboardPanel.classList.add('show');
    setTimeout(renderDashboardQuickFilters, 100);
  };
}

// Ensure dashboard close button works
const dashboardCloseBtn = document.getElementById('dashboardCloseBtn');
if (dashboardCloseBtn && dashboardPanel) {
  dashboardCloseBtn.onclick = () => {
    dashboardPanel.classList.add('hidden');
    dashboardPanel.classList.remove('show');
  };
}

// Evento de click en overlay para cerrar
if (dashboardOverlay && dashboardPanel) {
  dashboardOverlay.onclick = () => {
    dashboardPanel.classList.add('hidden');
    dashboardPanel.classList.remove('show');
  };
}

// Hide dashboardPanel when clicking or focusing outside
function handleDashboardPanelBlur(e) {
  if (!dashboardPanel || dashboardPanel.classList.contains('hidden')) return;
  
  // No cerrar si el clic fue en un quick card o en el panel de filtros
  const isQuickCard = e.target.closest('.ops-hub-chip');
  const isFilterPanel = e.target.closest('.filter-panel');
  if (isQuickCard || isFilterPanel) return;
  
  if (!dashboardPanel.contains(e.target) && e.target.id !== 'dashboardToggleBtn') {
    dashboardPanel.classList.add('hidden');
    dashboardPanel.classList.remove('show');
  }
}

// Añadir el evento de blur al documento
document.addEventListener('mousedown', handleDashboardPanelBlur);
document.addEventListener('focusin', handleDashboardPanelBlur);

// --- Renderiza los KPIs y luego los chips de urgencia ---
function renderDashboardKpisAndChips() {
  // Renderiza los KPIs (si existe la función original)
  if (typeof renderDashboardKpis === 'function') {
    renderDashboardKpis();
  }
  // Siempre renderiza los chips de urgencia después del título
  renderOpsHubFilterChips();
}

// --- Hook para renderizar los chips después de los KPIs y al abrir el dashboard ---
if (dashboardBtn) {
  dashboardBtn.addEventListener('click', () => {
    setTimeout(() => {
      setupOpsHubFilters();
      renderDashboardKpisAndChips();
    }, 200);
  });
}

// Si hay otras funciones que renderizan los KPIs, fuerza el render de los chips después
if (typeof renderDashboardQuickFilters === 'function') {
  const originalRenderDashboardQuickFilters = renderDashboardQuickFilters;
  window.renderDashboardQuickFilters = function() {
    originalRenderDashboardQuickFilters();
    renderOpsHubFilterChips();
  };
}

// --- Asegura que resolveDynamicDateExpr está definida globalmente ---
if (typeof resolveDynamicDateExpr !== 'function') {
  function resolveDynamicDateExpr(val) {
    if (val === '__TODAY__') {
      const d = new Date();
      return d.toISOString().slice(0, 10);
    }
    // Puedes agregar más expresiones dinámicas aquí si lo necesitas
    return val;
  }
}

function applyQuickFilter(name) {
  // Añadir el quick filter al array global si no está
  if (!window.activeDashboardQuickFilters) window.activeDashboardQuickFilters = [];
  if (!window.activeDashboardQuickFilters.includes(name)) {
    window.activeDashboardQuickFilters.push(name);
  }
  // Aplicar la lógica acumulativa de ambos tipos de filtros
  applyOpsHubQuickFilters();
  // Cierra el modal de filtros si está abierto
  const filterModal = document.getElementById('filterModal');
  const filterOverlay = document.getElementById('filterModalOverlay');
  if (filterModal && filterOverlay) {
    filterModal.classList.add('hidden');
    filterOverlay.classList.add('hidden');
    filterModal.style.display = 'none';
    filterOverlay.style.display = 'none';
    filterOverlay.classList.remove('visible');
    filterOverlay.classList.remove('blur');
    filterOverlay.style.backdropFilter = 'none';
  }
}