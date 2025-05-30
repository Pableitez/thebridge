import './components/custom/CustomColumnManager.js';
import { 
  initializeState, 
  setOriginalData, 
  setCurrentHeaders, 
  setVisibleColumns,
  getOriginalData,
  setRowsPerPage,
  getModuleFilterValues,
  setModuleFilterValues
} from './store/index.js';
import { validateCSVFile, parseCSVFile } from './services/csvService.js';
import { displayTable } from './components/table/Table.js';
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
import { initializeFilterManager, resetFilterManager, generateFilterSidebar, renderActiveFiltersSummaryChips, loadQuickFilters, applyQuickFilter, deleteQuickFilter, getFilteredData, applyFilters } from './components/filters/FilterManager.js';
import { initializeReportService, copyTableToClipboard } from './services/reportService.js';
import { showNotification } from './components/notifications/NotificationManager.js';
import { customColumnManager } from './components/custom/CustomColumnManager.js';
import { openSummaryModal, setupSummaryModalEvents } from './components/reports/CustomSummary.js';

let filterManager;

// Variable global para el nombre del archivo CSV actual
let currentCSVFileName = '';

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
      document.getElementById('logoutBtn').style.display = 'none';
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

    // Reset and reinitialize filter manager
    resetFilterManager();
    filterManager = initializeFilterManager(result.data);
    
    // Initialize report service with new data
    initializeReportService();
    
    // Update UI
    displayTable(result.data);
    toggleElements('#tableContainer', 'show');
    
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
  const searchTerm = event.target.value.trim();
  // Usar los filtros del módulo
  let filters = getModuleFilterValues();
  if (!searchTerm) {
    // Eliminar solo el filtro global
    if ('__globalSearch' in filters) {
      delete filters['__globalSearch'];
      setModuleFilterValues(filters);
      applyFilters();
    } else {
      applyFilters();
    }
    return;
  }
  // Si hay texto, añadir/actualizar el filtro global
  filters['__globalSearch'] = searchTerm;
  setModuleFilterValues(filters);
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
  const quickFiltersDiv = document.querySelector('.dashboard-quickfilters');
  if (!quickFiltersDiv) return;
  // Limpia los filtros rápidos previos
  quickFiltersDiv.innerHTML = '';
  // Botón para crear filtro rápido (opcional)
  // ...
  // Carga los filtros rápidos guardados
  const quickFilters = loadQuickFilters();
  const names = Object.keys(quickFilters);
  if (names.length === 0) {
    const empty = document.createElement('span');
    empty.textContent = 'No hay filtros rápidos guardados.';
    empty.style.color = '#888';
    quickFiltersDiv.appendChild(empty);
    return;
  }
  names.forEach(name => {
    const btn = document.createElement('button');
    btn.className = 'quickfilter-btn';
    btn.textContent = name;
    btn.title = resumenFiltro(quickFilters[name].filterValues);
    btn.addEventListener('click', () => applyQuickFilter(name));
    // Botón eliminar
    const del = document.createElement('span');
    del.textContent = '🗑️';
    del.title = 'Eliminar filtro rápido';
    del.style.marginLeft = '0.5rem';
    del.style.cursor = 'pointer';
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('¿Eliminar este filtro rápido?')) {
        deleteQuickFilter(name);
        renderDashboardQuickFilters();
      }
    });
    btn.appendChild(del);
    quickFiltersDiv.appendChild(btn);
  });
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
  const dateLike = headers.filter(h => /date|etd|eta|pickup|delivery|fecha|fch/i.test(h));
  // Por contenido: si más del 80% de los valores son fechas válidas
  const byContent = headers.filter(h => {
    if (h.trim().toLowerCase() === 'number of containers') return false;
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

  // Mostrar panel de login por defecto
  function showLogin() {
    loginPanel.style.display = '';
    registerPanel.style.display = 'none';
    showLoginBtn.disabled = true;
    showRegisterBtn.disabled = false;
  }
  function showRegister() {
    loginPanel.style.display = 'none';
    registerPanel.style.display = '';
    showLoginBtn.disabled = false;
    showRegisterBtn.disabled = true;
  }
  showLoginBtn.onclick = showLogin;
  showRegisterBtn.onclick = showRegister;
  showLogin();

  // Login
  const loginEmail = document.getElementById('loginEmailInput');
  const loginPassword = document.getElementById('loginPasswordInput');
  const loginBtn = document.getElementById('loginBtn');
  const loginError = document.getElementById('loginError');
  loginBtn.onclick = () => {
    const email = loginEmail.value.trim().toLowerCase();
    const password = loginPassword.value;
    if (!isValidEmail(email)) {
      loginError.textContent = 'Enter a valid email.';
      return;
    }
    const user = getUserCredentials(email);
    if (!user || user.password !== password) {
      loginError.textContent = 'Incorrect email or password.';
      return;
    }
    setCurrentUserEmail(email);
    modal.classList.add('hidden');
    setTimeout(() => { modal.style.display = 'none'; }, 300);
    document.getElementById('logoutBtn').style.display = '';
    location.reload();
  };

  // Registration
  const registerEmail = document.getElementById('registerEmailInput');
  const registerPassword = document.getElementById('registerPasswordInput');
  const registerPasswordRepeat = document.getElementById('registerPasswordRepeatInput');
  const registerBtn = document.getElementById('registerBtn');
  const registerError = document.getElementById('registerError');
  registerBtn.onclick = () => {
    const email = registerEmail.value.trim().toLowerCase();
    const password = registerPassword.value;
    const passwordRepeat = registerPasswordRepeat.value;
    if (!isValidEmail(email)) {
      registerError.textContent = 'Enter a valid email.';
      return;
    }
    // Strong password validation
    if (!password || password.length < 6 ||
        !/[A-Z]/.test(password) ||
        !/[a-z]/.test(password) ||
        !/[0-9]/.test(password)) {
      registerError.textContent = 'Password must be at least 6 characters, contain an uppercase letter, a lowercase letter, and a number.';
      return;
    }
    if (password !== passwordRepeat) {
      registerError.textContent = 'Passwords do not match.';
      return;
    }
    if (getUserCredentials(email)) {
      registerError.textContent = 'This email is already registered.';
      return;
    }
    saveUserCredentials(email, password);
    registerError.style.color = '#10B981';
    registerError.textContent = 'User registered successfully. You can now sign in.';
    setTimeout(() => {
      registerError.style.color = '#d32f2f';
      showLogin();
    }, 1800);
  };

  modal.style.display = 'flex';
  modal.classList.remove('hidden');
  loginEmail.value = '';
  loginPassword.value = '';
  registerEmail.value = '';
  registerPassword.value = '';
  registerPasswordRepeat.value = '';
  loginError.textContent = '';
  registerError.textContent = '';
  loginEmail.focus();
}

// --- Mostrar login/registro modal si no hay usuario ---
document.addEventListener('DOMContentLoaded', function () {
  if (!getCurrentUserEmail()) {
    showLoginRegisterModal();
    document.getElementById('logoutBtn').style.display = 'none';
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
  const fileName = currentCSVFileName || 'Sin nombre';
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
          showNotification('Data version loaded.', 'success');
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
  }
}

// --- User Set Up Modal (gestión de filtros, vistas, quick filters, dashboard config) ---
function setupUserSetUpModal() {
  const userSetUpBtn = getElement('#userSetUpBtn');
  const userSetUpModal = getElement('#userSetUpModal');
  const closeUserSetUpBtn = getElement('#closeUserSetUpModalBtn');
  // Botones de gestión de filtros, vistas, quick filters, dashboard config
  const saveFilterBtn = getElement('#saveFilterBtn');
  const saveViewBtn = getElement('#saveViewBtn');
  const saveQuickFilterBtn = getElement('#saveQuickFilterBtn');
  const manageFiltersBtn = getElement('#manageFiltersBtn');
  const manageViewsBtn = getElement('#manageViewsBtn');
  const manageQuickFiltersBtn = getElement('#manageQuickFiltersBtn');
  const manageDashboardConfigBtn = getElement('#manageDashboardConfigBtn');
  const saveDashboardConfigBtn = getElement('#saveDashboardConfigBtn');
  const userSetUpStatus = getElement('#userSetUpStatus');
  const modalContent = userSetUpModal ? userSetUpModal.querySelector('.modal-content') : null;

  if (!userSetUpBtn || !userSetUpModal || !closeUserSetUpBtn) return;

  // Abrir modal
  userSetUpBtn.addEventListener('click', () => {
    userSetUpModal.style.display = 'flex';
    userSetUpModal.classList.remove('hidden');
    if (userSetUpStatus) userSetUpStatus.textContent = '';
    showMainSections();
  });
  // Cerrar modal
  closeUserSetUpBtn.addEventListener('click', () => {
    userSetUpModal.classList.add('hidden');
    setTimeout(() => { userSetUpModal.style.display = 'none'; }, 300);
  });

  // Mostrar secciones principales
  function showMainSections() {
    if (!modalContent) return;
    // Restaurar el contenido original del modal
    modalContent.innerHTML = `
      <div class="backup-section">
        <h4>Filters & Views</h4>
        <div class="backup-actions">
          <button id="saveFilterBtn" class="modal-btn primary">Save Filter</button>
          <button id="manageFiltersBtn" class="modal-btn secondary">Manage Filters</button>
          <button id="saveViewBtn" class="modal-btn primary">Save View</button>
          <button id="manageViewsBtn" class="modal-btn secondary">Manage Views</button>
        </div>
      </div>
      <div class="backup-section">
        <h4>Quick Filters</h4>
        <div class="backup-actions">
          <button id="saveQuickFilterBtn" class="modal-btn primary">Save Quick Filter</button>
          <button id="manageQuickFiltersBtn" class="modal-btn secondary">Manage Quick Filters</button>
        </div>
      </div>
      <div class="backup-section">
        <h4>Dashboard Configuration</h4>
        <div class="backup-actions">
          <button id="saveDashboardConfigBtn" class="modal-btn primary">Save Dashboard Config</button>
          <button id="manageDashboardConfigBtn" class="modal-btn secondary">Manage Dashboard Config</button>
        </div>
      </div>
      <div id="userSetUpStatus" style="margin-top:1rem; font-size:0.95em; color:#1976d2;"></div>
    `;
    // Reasignar listeners a los nuevos botones
    setupUserSetUpModal();
  }

  // Guardar filtro
  if (saveFilterBtn) {
    saveFilterBtn.addEventListener('click', () => {
      const name = prompt('Enter a name for this filter:');
      if (name) {
        saveMyFilter(name);
        if (userSetUpStatus) {
          userSetUpStatus.textContent = '✅ Filter saved.';
          userSetUpStatus.className = 'success';
        }
      }
    });
  }
  // Guardar vista
  if (saveViewBtn) {
    saveViewBtn.addEventListener('click', () => {
      const name = prompt('Enter a name for this view:');
      if (name) {
        saveView(name, getVisibleColumns());
        if (userSetUpStatus) {
          userSetUpStatus.textContent = '✅ View saved.';
          userSetUpStatus.className = 'success';
        }
      }
    });
  }
  // Guardar quick filter
  if (saveQuickFilterBtn) {
    saveQuickFilterBtn.addEventListener('click', () => {
      const name = prompt('Name for the quick filter:');
      if (name) {
        saveQuickFilter(name);
        if (userSetUpStatus) {
          userSetUpStatus.textContent = '✅ Quick filter saved.';
          userSetUpStatus.className = 'success';
        }
      }
    });
  }
  // Guardar dashboard config
  if (saveDashboardConfigBtn) {
    saveDashboardConfigBtn.addEventListener('click', () => {
      const config = getDashboardConfig();
      saveDashboardConfig(config);
      if (userSetUpStatus) {
        userSetUpStatus.textContent = '✅ Dashboard config saved.';
        userSetUpStatus.className = 'success';
      }
    });
  }

  // --- GESTIÓN DE FILTROS ---
  if (manageFiltersBtn) {
    manageFiltersBtn.addEventListener('click', () => {
      if (!modalContent) return;
      // Mostrar panel de gestión de filtros
      const filters = loadMyFilters();
      const names = Object.keys(filters);
      modalContent.innerHTML = `
        <h4>Manage Filters</h4>
        <div style="margin-bottom:1rem;">
          <button id="backToMainSections" class="modal-btn secondary">Back</button>
        </div>
        <div id="filtersList">
          ${names.length === 0 ? '<div style=\'color:#888;\'>No filters saved.</div>' : names.map(name => `
            <div style='display:flex;align-items:center;gap:0.5rem;margin-bottom:0.25rem;'>
              <span style='font-family:monospace;'>${name}</span>
              <button class='modal-btn danger' data-delete-filter='${name}' style='padding:0.2em 0.7em;font-size:0.95em;'>Delete</button>
            </div>
          `).join('')}
        </div>
      `;
      // Botón volver
      modalContent.querySelector('#backToMainSections').addEventListener('click', showMainSections);
      // Borrar filtros
      modalContent.querySelectorAll('[data-delete-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
          const name = btn.dataset.deleteFilter;
          if (confirm(`Delete filter '${name}'?`)) {
            delete filters[name];
            localStorage.setItem('myFilters', JSON.stringify(filters));
            btn.closest('div').remove();
          }
        });
      });
    });
  }
  // --- Estructura lista para los demás 'Manage' ---
  // Puedes replicar la lógica de arriba para manageViewsBtn, manageQuickFiltersBtn, manageDashboardConfigBtn
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
        if (backup.vistas) localStorage.setItem('tableViews', JSON.stringify(backup.vistas));
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