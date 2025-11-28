import { 
    getOriginalData, 
    setModuleActiveFilters, 
    setModuleFilterValues, 
    getModuleActiveFilters, 
    getModuleFilterValues,
    getTableActiveFilters,
    getTableFilterValues,
    getSortConfig,
    getActiveFilters,
    setActiveFilters,
    getModuleFilterExclude,
    setModuleFilterExclude,
    getTableFilterExclude,
    getModuleFieldComparisons,
    setModuleFieldComparisons,
    getModuleFieldComparison,
    setModuleFieldComparison
} from '../../store/index.js';
import { displayTable } from '../table/Table.js';
import { sortData } from '../../utils/general.js';
import { DataDetector } from '../../utils/DataDetector.js';

// Get singleton instance
const dataDetector = DataDetector.getInstance();

// Singleton instance
let instance = null;

// Cache for unique values
const uniqueValuesCache = new Map();

// Función para actualizar valores de filtros existentes sin regenerar
function updateExistingFilterValues() {
  try {
    console.log('🔄 Updating existing filter values...');
    
    // Actualizar valores únicos en dropdowns existentes
    const filterItems = document.querySelectorAll('.filter-item');
    filterItems.forEach(item => {
      const column = item.dataset.column;
      if (!column) return;
      
      // Actualizar dropdowns de valores únicos
      const dropdown = item.querySelector('.filter-select');
      if (dropdown) {
        const currentValue = dropdown.value;
        const uniqueValues = getUniqueValues(column);
        
        // Solo actualizar si los valores han cambiado
        const currentOptions = Array.from(dropdown.options).map(opt => opt.value);
        const newOptions = uniqueValues.map(val => val.toString());
        
        if (JSON.stringify(currentOptions) !== JSON.stringify(newOptions)) {
          dropdown.innerHTML = '<option value="">All</option>';
          uniqueValues.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            dropdown.appendChild(option);
          });
          
          // Restaurar valor seleccionado si aún existe
          if (currentValue && newOptions.includes(currentValue)) {
            dropdown.value = currentValue;
          }
        }
      }
    });
    
    console.log('✅ Existing filter values updated');
  } catch (error) {
    console.error('❌ Error updating existing filter values:', error);
  }
}

// Función para obtener valores únicos de una columna
function getUniqueValues(column) {
  try {
    const data = getOriginalData();
    if (!data || !data.length) return [];
    
    // Usar caché si está disponible
    if (uniqueValuesCache.has(column)) {
      return uniqueValuesCache.get(column);
    }
    
    const uniqueSet = new Set();
    data.forEach(row => {
      const value = row[column];
      if (value !== null && value !== undefined && value.toString().trim() !== '') {
        uniqueSet.add(value.toString());
      }
    });
    
    const uniqueValues = Array.from(uniqueSet).sort();
    
    // Guardar en caché
    uniqueValuesCache.set(column, uniqueValues);
    
    return uniqueValues;
  } catch (error) {
    console.error('❌ Error getting unique values for column:', column, error);
    return [];
  }
}

// Initialize data
function initializeData(data) {
  if (!data || !data.length) {
    console.warn('No data provided for filter initialization');
    return false;
  }
  try {
    // Limpiar el caché de valores únicos al cargar nuevos datos
    if (uniqueValuesCache && typeof uniqueValuesCache.clear === 'function') {
      uniqueValuesCache.clear();
    }
    return true;
  } catch (error) {
    console.error('Error initializing filter data:', error);
    return false;
  }
}

// Detect column types based on data sample
function detectColumnTypes(data) {
  if (!data || !data.length) {
    console.warn('No data provided for column type detection');
    return {};
  }
  try {
    return dataDetector.detectColumnTypes(data);
  } catch (error) {
    console.error('Error detecting column types:', error);
    return {};
  }
}

// Get most frequent values for a column
function getFrequentValues(column, minCount = 5, maxItems = 10) {
  const freqMap = new Map();
  const data = getOriginalData();
  data.forEach(row => {
    const value = row[column];
    if (value !== null && value !== undefined && value.toString().trim() !== '') {
      const key = value.toString();
      freqMap.set(key, (freqMap.get(key) || 0) + 1);
    }
  });
  // Ordenar por frecuencia descendente
  const sorted = Array.from(freqMap.entries())
    .filter(([_, count]) => count >= minCount)
    .sort((a, b) => b[1] - a[1]);
  // Si no hay suficientes, muestra el top N aunque sean menos frecuentes
  const result = sorted.length > 0
    ? sorted.slice(0, maxItems).map(([val]) => val)
    : Array.from(freqMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, maxItems).map(([val]) => val);
  return result;
}

// FUNCIÓN PARA FORZAR ESTILOS INLINE EN DROPDOWNS - DESHABILITADA
// Los estilos ahora se manejan completamente mediante CSS unificado
// sin necesidad de forzar estilos inline
function forceDropdownStyles(dropdown) {
  // Función deshabilitada - los estilos se manejan mediante CSS
  return;
}

// Debounced search function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Detect if a column is categorical (has a value repeated more than threshold)
function isCategoricalColumn(column, threshold = 30) {
  // Usar los datos filtrados (visibles) en vez de todos los originales
  const dataToCheck = (typeof getFilteredData() !== 'undefined' && getFilteredData().length) ? getFilteredData() : getOriginalData();
  const freqMap = new Map();
  let maxCount = 0;
  let maxValue = null;
  for (const row of dataToCheck) {
    const value = row[column];
    if (value !== null && value !== undefined && value.toString().trim() !== '') {
      const key = value.toString();
      const count = (freqMap.get(key) || 0) + 1;
      freqMap.set(key, count);
      if (count > maxCount) {
        maxCount = count;
        maxValue = key;
      }
      if (count > threshold) {
        console.log(`[Filtro] Columna '${column}': valor más repetido '${maxValue}' (${maxCount} repeticiones, umbral ${threshold}, filas analizadas: ${dataToCheck.length})`);
        return true;
      }
    }
  }
  console.log(`[Filtro] Columna '${column}': valor más repetido '${maxValue}' (${maxCount} repeticiones, umbral ${threshold}, filas analizadas: ${dataToCheck.length})`);
  return false;
}

function createAutocomplete(input, uniqueValues) {
  let suggestionBox = input.nextSibling;
  if (!suggestionBox || !suggestionBox.classList || !suggestionBox.classList.contains('autocomplete-list')) {
    suggestionBox = document.createElement('ul');
    suggestionBox.className = 'autocomplete-list hidden';
    if (input.parentNode) {
      input.parentNode.insertBefore(suggestionBox, input.nextSibling);
    }
  }

  // Función para filtrar y mostrar sugerencias
  function showSuggestions(searchTerm) {
    const raw = input.value;
    // Obtener el último término después de la última coma
    const lastTerm = raw.split(',').pop().trim();
    const term = normalizeText(searchTerm || lastTerm);
    
    suggestionBox.innerHTML = '';
    if (!term) {
      suggestionBox.classList.add('hidden');
      return;
    }

    // Filtrar valores que ya están seleccionados
    const selectedValues = raw.split(',').map(v => v.trim()).filter(v => v);
    const matches = uniqueValues
      .filter(val => {
        const normalizedVal = normalizeText(val);
        return normalizedVal.includes(term) && !selectedValues.includes(val);
      })
      .slice(0, 10);

    if (matches.length === 0) {
      suggestionBox.classList.add('hidden');
      return;
    }

    matches.forEach(val => {
      const li = document.createElement('li');
      li.textContent = val;
      li.className = 'autocomplete-item';
      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        // Reemplazar el último término con el valor seleccionado
        const parts = raw.split(',');
        parts[parts.length - 1] = val;
        input.value = parts.join(',') + ', ';
        
        // Actualizar el estado del filtro
        const selectedColumn = input.closest('.filter-block').querySelector('.column-selector').value;
        const selectedValues = input.value.split(',').map(v => v.trim()).filter(v => v);
        setModuleFilterValues({ ...getModuleFilterValues(), [selectedColumn]: selectedValues });
        setModuleActiveFilters({ ...getModuleActiveFilters(), [selectedColumn]: 'categorical' });
        
        // Actualizar la UI
        const filterDiv = input.closest('.filter-block');
        filterDiv.classList.toggle('active', selectedValues.length > 0);
        
        // Actualizar el checkbox correspondiente en el dropdown
        const dropdown = filterDiv.querySelector('.excel-dropdown');
        if (dropdown) {
          const checkbox = dropdown.querySelector(`input[type="checkbox"][value="${val}"]`);
          if (checkbox) {
            checkbox.checked = true;
            // Disparar el evento change para asegurar que se actualice el estado
            checkbox.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
        
        updateActiveFiltersSummary();
        applyFilters();
        
        input.dispatchEvent(new Event('input'));
        suggestionBox.classList.add('hidden');
      });
      suggestionBox.appendChild(li);
    });
    suggestionBox.classList.remove('hidden');
  }

  // Mostrar sugerencias al escribir
  input.addEventListener('input', () => {
    showSuggestions();
  });

  // Mostrar sugerencias al hacer focus
  input.addEventListener('focus', () => {
    showSuggestions();
  });

  // Ocultar sugerencias al hacer blur
  input.addEventListener('blur', () => {
    setTimeout(() => suggestionBox.classList.add('hidden'), 150);
  });

  // Manejar navegación con teclado
  input.addEventListener('keydown', (e) => {
    const items = suggestionBox.querySelectorAll('.autocomplete-item');
    const activeItem = suggestionBox.querySelector('.autocomplete-item.active');
    let index = Array.from(items).indexOf(activeItem);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (index < items.length - 1) {
          index++;
        } else {
          index = 0;
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (index > 0) {
          index--;
        } else {
          index = items.length - 1;
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (activeItem) {
          activeItem.click();
        }
        return;
      case 'Escape':
        suggestionBox.classList.add('hidden');
        return;
      default:
        return;
    }

    items.forEach(item => item.classList.remove('active'));
    items[index]?.classList.add('active');
  });
}

// Variable para evitar llamadas duplicadas
let lastGeneratedHeaders = null;
let isGenerating = false;

function generateFilterSidebar(headers) {
  console.log('🔍 generateFilterSidebar called with headers:', headers);
  const originalData = getOriginalData();
  console.log('📊 Original data available:', originalData?.length || 0, 'rows');
  
  if (!originalData || !originalData.length) {
    console.warn('No data available for generating filters');
    return;
  }
  
  if (!headers || !headers.length) {
    console.warn('No headers provided for generating filters');
    return;
  }
  
  // Evitar llamadas duplicadas con los mismos headers
  const headersString = JSON.stringify(headers?.sort());
  if (isGenerating || headersString === lastGeneratedHeaders) {
    console.log('Skipping duplicate generateFilterSidebar call');
    return;
  }
  
  isGenerating = true;
  lastGeneratedHeaders = headersString;
  
  // Timeout de seguridad para resetear la bandera
  setTimeout(() => {
    isGenerating = false;
  }, 5000);

  const genericContainer = document.getElementById("genericFilterPanel");
  const myFiltersPanel = document.getElementById("myfiltersFilterPanel");
  const referenceContainer = document.getElementById("referenceFilterPanel");
  const dateContainer = document.getElementById("dateFilterPanel");
  const filterTabs = document.querySelector('.filter-tabs');
  const filterPanels = document.querySelector('.filter-panels');

  console.log('🔍 Filter containers found:', {
    genericContainer: !!genericContainer,
    myFiltersPanel: !!myFiltersPanel,
    referenceContainer: !!referenceContainer,
    dateContainer: !!dateContainer,
    filterTabs: !!filterTabs,
    filterPanels: !!filterPanels
  });

  if (!genericContainer || !referenceContainer || !dateContainer || !filterTabs || !filterPanels || !myFiltersPanel) {
    console.warn('Filter containers or tabs not found, retrying in 100ms...');
    // Retry after a short delay in case DOM is not ready
    setTimeout(() => {
      generateFilterSidebar(headers);
    }, 100);
    return;
  }

  try {
    // Verificar si ya existen filtros generados para estos headers
    const existingFilters = genericContainer.querySelectorAll('.filter-item');
    const hasExistingFilters = existingFilters.length > 0;
    
    // Siempre limpiar y regenerar para nuevos datos
    console.log('🔧 Generating filters for new data...');
    
    // Limpiar contenido de cada panel antes de añadir el suyo
    genericContainer.innerHTML = "";
    myFiltersPanel.innerHTML = "";
    referenceContainer.innerHTML = "";
    dateContainer.innerHTML = "";
    
    // Limpiar cualquier filtro duplicado existente
    document.querySelectorAll('.filter-item').forEach(item => {
      if (item.parentNode === genericContainer || item.parentNode === dateContainer) {
        item.remove();
      }
    });

    // Remove any existing global summary and create a new one
    document.querySelectorAll('#globalActiveFiltersSummary').forEach(summary => summary.remove());
    
    // Create new global summary
    const globalSummary = document.createElement('div');
    globalSummary.id = 'globalActiveFiltersSummary';
    globalSummary.className = 'active-filters-summary';
    filterTabs.parentNode.insertBefore(globalSummary, filterPanels);

    // --- Add Active Filters Tab and Panel ---
    // Remove any existing active filters tabs and panels first
    document.querySelectorAll('.filter-tab[data-target="active"]').forEach(tab => tab.remove());
    document.querySelectorAll('#activeFilterPanel').forEach(panel => panel.remove());
    
    // Create new active filters tab
    const activeTab = document.createElement('button');
    activeTab.className = 'filter-tab';
    activeTab.dataset.target = 'active';
    activeTab.textContent = 'Active Filters';
    filterTabs.appendChild(activeTab);
    
    // Create new active filters panel
    const activePanel = document.createElement('div');
    activePanel.className = 'filter-panel';
    activePanel.id = 'activeFilterPanel';
    filterPanels.appendChild(activePanel);

    // Create summary inside the panel
    const summaryContainer = document.createElement("div");
    summaryContainer.className = "active-filters-summary";
    summaryContainer.innerHTML = `
      <div class="active-filters-list"></div>
      <button class="clear-all-filters-btn">Clear All</button>
    `;
    activePanel.appendChild(summaryContainer);

    // Render chips de filtros activos (incluyendo Today/dinámicos)
    function renderActiveFiltersList() {
      const list = summaryContainer.querySelector('.active-filters-list');
      if (!list) return;
      list.innerHTML = '';
      const filterValues = getModuleFilterValues();
      // Si no hay filtros activos, oculta completamente la sección
      if (Object.keys(filterValues).length === 0) {
        summaryContainer.style.display = 'none';
        summaryContainer.style.padding = '0';
        summaryContainer.style.margin = '0';
        summaryContainer.style.height = '0';
        summaryContainer.style.minHeight = '0';
      } else {
        summaryContainer.style.display = '';
        summaryContainer.style.padding = '';
        summaryContainer.style.margin = '';
        summaryContainer.style.height = '';
        summaryContainer.style.minHeight = '';
      }
      // Agrupa fechas
      const dateFilters = {};
      Object.entries(filterValues).forEach(([key, value]) => {
        if (key.endsWith('_start') || key.endsWith('_end') || key.endsWith('_empty')) {
          const baseKey = key.replace(/_(start|end|empty)$/, '');
          if (!dateFilters[baseKey]) {
            dateFilters[baseKey] = { start: '', end: '', empty: false };
          }
          if (key.endsWith('_start')) dateFilters[baseKey].start = value;
          if (key.endsWith('_end')) dateFilters[baseKey].end = value;
          if (key.endsWith('_empty')) dateFilters[baseKey].empty = value;
        }
      });
      // Chips de fechas
      Object.entries(dateFilters).forEach(([column, filter]) => {
        if (filter.start || filter.end || filter.empty) {
          let text = `${column}: `;
          if (filter.empty && !filter.start && !filter.end) {
            text += '(empty)';
          } else {
            if (filter.start) text += `from ${prettyDynamicDate(filter.start)}`;
            if (filter.end) text += ` to ${prettyDynamicDate(filter.end)}`;
            if (filter.empty) text += ' (including empty)';
          }
          const tag = document.createElement('div');
          tag.className = 'modal-filter-tag';
          tag.innerHTML = `<span>${text}</span><button class="modal-filter-tag-remove" data-column="${column}">×</button>`;
          list.appendChild(tag);
        }
      });
      // Chips de otros filtros
      const filterExclude = getModuleFilterExclude();
      Object.entries(filterValues).forEach(([key, value]) => {
        if (!key.endsWith('_start') && !key.endsWith('_end') && !key.endsWith('_empty') && Array.isArray(value) && value.length > 0) {
          const tag = document.createElement('div');
          tag.className = 'modal-filter-tag';
          
          // Si está en modo exclusión, agregar estilo rojo
          const isExcludeMode = filterExclude[key] || false;
          
          // Formatear valores para display (remover __EMPTY__ y __NO_EMPTY__)
          const displayValues = value.filter(v => v !== '__EMPTY__' && v !== '__NO_EMPTY__');
          const hasEmpty = value.includes('__EMPTY__');
          const hasNoEmpty = value.includes('__NO_EMPTY__');
          
          let displayText = '';
          if (isExcludeMode) {
            displayText = '<strong style="font-weight: 600;">Exclude</strong> ';
          }
          
          displayText += `${key}: `;
          
          // Construir la lista de valores
          const valueParts = [];
          if (hasEmpty) valueParts.push('(Empty)');
          if (hasNoEmpty) valueParts.push('(No Empty)');
          if (displayValues.length > 0) {
            if (displayValues.length <= 3) {
              valueParts.push(...displayValues);
            } else {
              valueParts.push(`${displayValues.length} values`);
            }
          }
          
          displayText += valueParts.join(', ');
          
          tag.innerHTML = `<span>${displayText}</span><button class="modal-filter-tag-remove" data-column="${key}">×</button>`;
          list.appendChild(tag);
        }
      });
      // Listeners para eliminar chips
      // Declarar activeFilters fuera del bucle para evitar duplicidad
      let activeFilters;
      list.querySelectorAll('.modal-filter-tag-remove').forEach(btn => {
        btn.addEventListener('click', () => {
          const column = btn.dataset.column;
          const updated = { ...getModuleFilterValues() };
          // Eliminar todos los valores posibles del filtro
          delete updated[`${column}_start`];
          delete updated[`${column}_end`];
          delete updated[`${column}_empty`];
          delete updated[column];
          setModuleFilterValues(updated);
          // Eliminar de activeFilters SIEMPRE
          activeFilters = { ...getModuleActiveFilters() };
          delete activeFilters[column];
          setModuleActiveFilters(activeFilters);
          // Limpiar inputs visuales
          const filterItem = document.querySelector(`.filter-item[data-column="${column}"]`);
          if (filterItem) {
            filterItem.querySelectorAll('input[type="date"]').forEach(input => input.value = '');
            filterItem.querySelectorAll('.filter-checkbox').forEach(checkbox => checkbox.checked = false);
            filterItem.classList.remove('active');
          }
          // Refuerzo: renderizar chips y lista tras limpiar el estado
          renderActiveFiltersList();
          renderActiveFiltersSummaryChips();
          updateActiveFiltersSummary();
          applyFilters();
        });
      });
    }
    // Llama al render de chips activos al crear el panel
    renderActiveFiltersList();

    // --- Botón Save Filter SOLO en Active Filters ---
    let saveBtn = document.getElementById('saveMyFilterBtn');
    if (!saveBtn) {
      saveBtn = document.createElement('button');
      saveBtn.id = 'saveMyFilterBtn';
      saveBtn.className = 'btn btn-secondary';
      saveBtn.textContent = 'Save Filter';
      // Mensaje visual de confirmación/error
      let saveMsg = document.getElementById('saveFilterMsg');
      if (!saveMsg) {
        saveMsg = document.createElement('div');
        saveMsg.id = 'saveFilterMsg';
        saveMsg.style.display = 'none';
        saveMsg.style.marginTop = '0.5rem';
        saveMsg.style.fontWeight = 'bold';
        saveMsg.style.fontSize = '1rem';
        saveBtn.parentNode?.insertBefore?.(saveMsg, saveBtn.nextSibling);
      }
      function showSaveMsg(text, color) {
        saveMsg.textContent = text;
        saveMsg.style.color = color;
        saveMsg.style.display = 'block';
        setTimeout(() => { saveMsg.style.display = 'none'; }, 2500);
      }
      saveBtn.addEventListener('click', () => {
        // Check if user can modify data (admin only)
        if (typeof canUserModifyData === 'function' && !canUserModifyData()) {
          showSaveMsg('Only administrators can save filters', 'red');
          return;
        }
        
        const name = prompt('Enter a name for this filter:');
        if (name) {
          // Dropdown para asociar a tarjeta de urgencia
          let urgency = prompt('¿Asociar a tarjeta de urgencia? (Ninguna, Urgente, Media, Baja)', 'Ninguna');
          if (!urgency) urgency = 'Ninguna';
          try {
            saveMyFilter(name, urgency);
            // Forzar creación y renderizado de la sección My Filters
            let myFiltersPanel = document.getElementById('myfiltersFilterPanel');
            if (!myFiltersPanel) {
              myFiltersPanel = document.createElement('div');
              myFiltersPanel.id = 'myfiltersFilterPanel';
              myFiltersPanel.className = 'filter-panel';
              const filterPanels = document.querySelector('.filter-panels');
              if (filterPanels) filterPanels.appendChild(myFiltersPanel);
            }
            renderMyFiltersSection();
            showSaveMsg('Filter saved!', 'green');
          } catch (e) {
            showSaveMsg('Error saving filter', 'red');
          }
        }
      });
    }
    // --- Botón Guardar como filtro rápido ---
    let saveQuickBtn = document.getElementById('saveQuickFilterBtn');
    if (!saveQuickBtn) {
      saveQuickBtn = document.createElement('button');
      saveQuickBtn.id = 'saveQuickFilterBtn';
      saveQuickBtn.className = 'btn btn-secondary';
      saveQuickBtn.textContent = 'Save as quick filter';
      
      // Función para actualizar el estado del botón según exclude y comparaciones
      const updateSaveQuickButtonState = () => {
        const excludeState = getModuleFilterExclude();
        const hasExclude = Object.keys(excludeState).length > 0;
        const comparisons = getModuleFieldComparisons();
        const hasComparisons = Object.keys(comparisons).length > 0;
        
        if (hasExclude || hasComparisons) {
          saveQuickBtn.disabled = true;
          saveQuickBtn.style.opacity = '0.5';
          saveQuickBtn.style.cursor = 'not-allowed';
          if (hasComparisons) {
            saveQuickBtn.title = 'Cannot save as quick filter when Field Comparison is active. Use "Save Filter" instead.';
          } else {
            saveQuickBtn.title = 'Cannot save as quick filter when Exclude mode is active. Use "Save Filter" instead.';
          }
        } else {
          saveQuickBtn.disabled = false;
          saveQuickBtn.style.opacity = '1';
          saveQuickBtn.style.cursor = 'pointer';
          saveQuickBtn.title = '';
        }
      };
      
      // Actualizar estado inicial
      updateSaveQuickButtonState();
      
      // Guardar referencia global para poder actualizar desde otros lugares
      window.updateSaveQuickButtonState = updateSaveQuickButtonState;
      
      saveQuickBtn.addEventListener('click', () => {
        // Check if exclude is active
        const excludeState = getModuleFilterExclude();
        const hasExclude = Object.keys(excludeState).length > 0;
        const comparisons = getModuleFieldComparisons();
        const hasComparisons = Object.keys(comparisons).length > 0;
        
        if (hasExclude) {
          showSaveMsg('Cannot save as quick filter when Exclude mode is active. Use "Save Filter" instead.', 'red');
          return;
        }
        
        if (hasComparisons) {
          showSaveMsg('Cannot save as quick filter when Field Comparison is active. Use "Save Filter" instead.', 'red');
          return;
        }
        
        // Check if user can modify data (admin only)
        if (typeof canUserModifyData === 'function' && !canUserModifyData()) {
          showSaveMsg('Only administrators can save quick filters', 'red');
          return;
        }
        
        // Crear modal para guardar quick filter
        let modal = document.getElementById('saveQuickFilterModal');
        if (!modal) {
          modal = document.createElement('div');
          modal.id = 'saveQuickFilterModal';
          modal.className = 'modal-overlay hidden';
          modal.style.zIndex = '10001';
          modal.innerHTML = `
            <div class="modal-panel" style="max-width:600px;">
              <div class="modal-header">
                <div class="header-left">
                  <img src="LOGOTAB_rounded.png" alt="Logo" class="modal-logo">
                  <h3 class="panel-header-title">Save Quick Filter</h3>
                </div>
                <button id="closeSaveQuickFilterBtn" class="close-btn">×</button>
              </div>
              <div class="modal-content">
                <div style='margin-bottom:1.5em;'>
                  <label style='font-weight:600;color:#000000;font-family:Inter,Segoe UI,Arial,sans-serif;margin-bottom:0.5rem;display:block;'>Name:</label>
                  <input id='quickFilterNameInput' type='text' class="input" placeholder="Enter filter name" style='width:100%;margin-bottom:1rem;'>
                  <label style='font-weight:600;color:#000000;font-family:Inter,Segoe UI,Arial,sans-serif;margin-bottom:0.5rem;display:block;'>Associate to urgency card:</label>
                  <select id='quickFilterUrgencySelect' class="input filter-select" style='width:100%;margin-bottom:1rem;'>
                    <option value='Ninguna'>None</option>
                    <option value='Urgente'>Urgent</option>
                    <option value='Media'>Medium</option>
                    <option value='Baja'>Low</option>
                  </select>
                  <label style='font-weight:600;color:#000000;font-family:Inter,Segoe UI,Arial,sans-serif;margin-bottom:0.5rem;display:block;'>Save to container:</label>
                  <select id='quickFilterContainerSelect' class="input filter-select" style='width:100%;margin-bottom:1rem;'>
                    <option value=''>None</option>
                    <option value='default'>General Zone</option>
                    <option value='container1'>Order Management</option>
                    <option value='container2'>Booking Management</option>
                    <option value='container3'>Closing Operations</option>
                    <option value='container4'>Cargo Status</option>
                  </select>
                  <label style='font-weight:600;color:#000000;font-family:Inter,Segoe UI,Arial,sans-serif;margin-bottom:0.5rem;display:block;'>Container title (optional):</label>
                  <input id='quickFilterContainerTitleInput' type='text' class="input" placeholder='Enter custom container title' style='width:100%;margin-bottom:1rem;'>
                  <label style='font-weight:600;color:#000000;font-family:Inter,Segoe UI,Arial,sans-serif;margin-bottom:0.5rem;display:block;'>Save to Hub:</label>
                  <select id='quickFilterHubSelect' class="input filter-select" style='width:100%;'></select>
                </div>
              </div>
              <div class="modal-footer">
                <button id='quickFilterCancelBtn' class="modal-btn secondary">Cancel</button>
                <button id='quickFilterSaveBtn' class="modal-btn primary">Save</button>
              </div>
            </div>
          `;
          document.body.appendChild(modal);
        } else {
          modal.classList.remove('hidden');
        }
        
        // Cambiar contenedores según el hub seleccionado
        const hubSelect = modal.querySelector('#quickFilterHubSelect');
        const containerSelect = modal.querySelector('#quickFilterContainerSelect');
        
        // Inicializar con los contenedores según el hub
        const initializeContainers = (hubType) => {
          containerSelect.innerHTML = '<option value="">None</option>';
          
          if (hubType === 'ops') {
            // Contenedores del Ops Hub
            containerSelect.innerHTML += `
              <option value="default">General Zone</option>
              <option value="container1">Order Management</option>
              <option value="container2">Booking Management</option>
              <option value="container3">Closing Operations</option>
              <option value="container4">Cargo Status</option>
            `;
          } else if (hubType === 'dq') {
            // Contenedores del DQ Hub
            containerSelect.innerHTML += `
              <option value="dq-default">Data Quality Zone</option>
              <option value="dq-container1">Duplicate Analysis</option>
              <option value="dq-container2">Null Values</option>
              <option value="dq-container3">Format Issues</option>
              <option value="dq-container4">Completeness</option>
            `;
          } else if (hubType === 'orders') {
            // Contenedores del Orders Hub
            containerSelect.innerHTML += `
              <option value="orders-default">Orders Zone</option>
              <option value="orders-container1">Pending Orders</option>
              <option value="orders-container2">Completed Orders</option>
              <option value="orders-container3">Cancelled Orders</option>
              <option value="orders-container4">Processing Orders</option>
            `;
          } else if (hubType === 'booking') {
            // Contenedores del Booking Hub
            containerSelect.innerHTML += `
              <option value="booking-default">Booking Zone</option>
              <option value="booking-container1">Pending Bookings</option>
              <option value="booking-container2">Confirmed Bookings</option>
              <option value="booking-container3">Cancelled Bookings</option>
              <option value="booking-container4">Processing Bookings</option>
            `;
          } else if (hubType === 'closings') {
            // Contenedores del Closings Hub
            containerSelect.innerHTML += `
              <option value="closings-default">Closings Zone</option>
              <option value="closings-container1">Pending Closings</option>
              <option value="closings-container2">Completed Closings</option>
              <option value="closings-container3">Cancelled Closings</option>
              <option value="closings-container4">Processing Closings</option>
            `;
          }
        };
        
        // Detectar el hub actual y establecerlo por defecto
        const currentHubType = typeof window.getCurrentHubType === 'function' ? window.getCurrentHubType() : 'orders';
        
        // Poblar el desplegable de hubs - Solo mostrar Orders, Bookings y Data Quality
        hubSelect.innerHTML = '';
        
        // Definir solo los 3 hubs permitidos
        const availableHubs = [
          { value: 'orders', label: 'Orders' },
          { value: 'booking', label: 'Bookings' },
          { value: 'dq', label: 'Data Quality' }
        ];
        
        // Agregar las 3 opciones al desplegable
        availableHubs.forEach(hub => {
          const option = document.createElement('option');
          option.value = hub.value;
          option.textContent = hub.label;
          hubSelect.appendChild(option);
        });
        
        // Limpiar campos
        modal.querySelector('#quickFilterNameInput').value = '';
        modal.querySelector('#quickFilterUrgencySelect').value = 'Ninguna';
        modal.querySelector('#quickFilterContainerSelect').value = 'default';
        modal.querySelector('#quickFilterContainerTitleInput').value = '';
        
        // Establecer el valor por defecto (si el hub actual no está en la lista, usar 'orders')
        const validHubTypes = ['orders', 'booking', 'dq'];
        hubSelect.value = validHubTypes.includes(currentHubType) ? currentHubType : 'orders';
        
        // Inicializar contenedores según el hub actual
        initializeContainers(currentHubType);
        
        // Cancelar
        modal.querySelector('#quickFilterCancelBtn').onclick = () => {
          modal.classList.add('hidden');
        };
        
        // Cerrar con el botón X
        modal.querySelector('#closeSaveQuickFilterBtn').onclick = () => {
          modal.classList.add('hidden');
        };
        
        // Cerrar al hacer click fuera del panel
        modal.onclick = (e) => {
          if (e.target === modal) {
            modal.classList.add('hidden');
          }
        };
        
        hubSelect.addEventListener('change', () => {
          const selectedHub = hubSelect.value;
          initializeContainers(selectedHub);
        });
        
        // Guardar
        modal.querySelector('#quickFilterSaveBtn').onclick = () => {
          // Check if user can modify data (admin only)
          if (typeof canUserModifyData === 'function' && !canUserModifyData()) {
            alert('Only administrators can save quick filters');
            return;
          }
          
          const name = modal.querySelector('#quickFilterNameInput').value.trim();
          const urgency = modal.querySelector('#quickFilterUrgencySelect').value;
          const container = modal.querySelector('#quickFilterContainerSelect').value;
          const containerTitle = modal.querySelector('#quickFilterContainerTitleInput').value.trim();
          const hubType = modal.querySelector('#quickFilterHubSelect').value;
          if (!name) {
            alert('Please enter a name for the quick filter.');
            return;
          }
          saveQuickFilter(name, urgency, container, containerTitle, hubType);
          modal.classList.add('hidden');
          showSaveMsg(`Quick filter saved to ${hubType.toUpperCase()} Hub!`, 'green');
        };
      });
    }
    // Contenedor flex para los dos botones
    const saveBtnsRow = document.createElement('div');
    saveBtnsRow.className = 'save-filter-btns-row';
    saveBtn.classList.add('filter-save-btn');
    saveQuickBtn.classList.add('filter-save-btn');
    saveBtnsRow.appendChild(saveBtn);
    saveBtnsRow.appendChild(saveQuickBtn);
    activePanel.appendChild(saveBtnsRow);

    // Add clear all functionality
    summaryContainer.querySelector('.clear-all-filters-btn').addEventListener('click', () => {
      try {
        // Clear all filter values
        setModuleFilterValues({});
        setModuleActiveFilters({});
        // Clear exclude state
        setModuleFilterExclude({});
        
        // Cerrar todos los dropdowns abiertos
        document.querySelectorAll('.modal-filter-dropdown').forEach(dropdown => {
          dropdown.classList.add('hidden');
        });
        
        // Clear all input fields
        document.querySelectorAll('.filter-input').forEach(input => { 
          // Primero remover el prefijo "Exclude: " si existe
          if (input.value && input.value.startsWith('Exclude: ')) {
            input.value = input.value.replace('Exclude: ', '');
          }
          // Luego limpiar el input
          input.value = ''; 
          input.removeAttribute('data-dynamic');
        });
        document.querySelectorAll('.filter-input[type="date"]').forEach(input => { 
          input.value = ''; 
          input.removeAttribute('data-dynamic');
        });
        document.querySelectorAll('.filter-checkbox').forEach(checkbox => { checkbox.checked = false; });
        document.querySelectorAll('.column-selector').forEach(select => { select.value = ''; });
        
        // Remove active class from all filter items (don't remove the items themselves)
        document.querySelectorAll('.filter-item').forEach(item => { 
          item.classList.remove('active'); 
        });
        
        // Reset all exclude toggle buttons in dropdowns
        document.querySelectorAll('.exclude-toggle-btn, .empty-toggle-btn').forEach(btn => {
          btn.classList.remove('active');
        });
        
        // Clear active filters summary
        const activeFiltersList = summaryContainer.querySelector('.active-filters-list');
        if (activeFiltersList) {
          activeFiltersList.innerHTML = '';
        }
        
        // Update UI and apply filters
        updateActiveFiltersSummary();
        renderActiveFiltersSummaryChips();
        applyFilters();
        
        if (typeof window.showUnifiedNotification === 'function') {
          window.showUnifiedNotification('All filters have been cleared!', 'info');
        }
      } catch (error) {
        console.error('Error clearing all filters:', error);
        if (typeof window.showUnifiedNotification === 'function') {
          window.showUnifiedNotification('Error clearing filters. Please try again.', 'error');
        }
      }
    });

    // --- END Active Filters Tab/Panel ---

    // Group headers by type
    const columnTypes = detectColumnTypes(originalData);
    const groupedHeaders = {
      date: [],
      categorized: []
    };

    headers.forEach(col => {
      const type = columnTypes[col] || 'generic';
      if (type === 'date') {
        groupedHeaders.date.push(col);
      } else {
        groupedHeaders.categorized.push(col);
      }
    });
    
    console.log('📋 Column types detected:', columnTypes);
    console.log('📂 Grouped headers:', groupedHeaders);

    // Create filter sections
    Object.entries(groupedHeaders).forEach(([type, cols]) => {
      const container = type === 'date' ? dateContainer : genericContainer;

      // Grid para los filtros
      const filterGrid = document.createElement('div');
      filterGrid.className = 'filter-grid';
      filterGrid.style.display = 'grid';
      filterGrid.style.gridTemplateColumns = 'repeat(4, 1fr)';
      filterGrid.style.gap = '10px';

      // Buscador arriba
      const selectorDiv = document.createElement("div");
      selectorDiv.className = "column-selector-container";
      const input = document.createElement("input");
      input.type = "text";
      input.className = "column-selector";
      input.placeholder = "Search column...";
      input.autocomplete = "off";
      // Limpiar el texto al hacer focus y mostrar todas las columnas
      input.addEventListener('focus', () => {
        input.value = '';
        // Mostrar todas las columnas al hacer focus
        filterGrid.querySelectorAll('.filter-item').forEach(div => {
          div.style.display = '';
        });
      });
      selectorDiv.appendChild(input);
      container.appendChild(selectorDiv);
      container.appendChild(filterGrid);

      // Crear todos los filtros visibles
      console.log(`🎯 Creating ${type} filters for columns:`, cols);
      cols.forEach(selectedColumn => {
        console.log(`📝 Creating filter for column: ${selectedColumn}`);
        setModuleActiveFilters({ ...getModuleActiveFilters(), [selectedColumn]: type });
        
        // Remove any existing filter for this column to prevent duplicates
        const existingFilter = filterGrid.querySelector(`[data-column="${selectedColumn}"]`);
        if (existingFilter) {
          console.log(`⚠️ Removing existing filter for ${selectedColumn} to prevent duplicates`);
          existingFilter.remove();
        }
        const filterDiv = document.createElement("div");
        filterDiv.className = "filter-item";
        filterDiv.dataset.column = selectedColumn;
        filterDiv.style.display = 'flex';
        filterDiv.style.flexDirection = 'column';
        filterDiv.style.alignItems = 'stretch';
        const headerRow = document.createElement('div');
        headerRow.style.display = 'flex';
        headerRow.style.justifyContent = 'space-between';
        headerRow.style.alignItems = 'center';
        headerRow.style.marginBottom = '0.5rem';
        
        const label = document.createElement('label');
        label.textContent = selectedColumn;
        
        const resetBtn = document.createElement('button');
        resetBtn.className = 'filter-reset-btn';
        resetBtn.textContent = '✕';
        resetBtn.title = 'Clear this filter';
        resetBtn.addEventListener('click', () => {
          // Limpiar valores del filtro
          const updated = { ...getModuleFilterValues() };
          delete updated[`${selectedColumn}_start`];
          delete updated[`${selectedColumn}_end`];
          delete updated[`${selectedColumn}_empty`];
          delete updated[selectedColumn];
          setModuleFilterValues(updated);
          
          // Eliminar de activeFilters
          const activeFilters = { ...getModuleActiveFilters() };
          delete activeFilters[selectedColumn];
          setModuleActiveFilters(activeFilters);
          
          // Limpiar estado de exclude
          const excludeState = { ...getModuleFilterExclude() };
          delete excludeState[selectedColumn];
          setModuleFilterExclude(excludeState);
          
          // Limpiar comparación de campos
          setModuleFieldComparison(selectedColumn, null);
          
          // Ocultar sección de comparación
          const compareSection = filterDiv.querySelector('.filter-compare-section');
          if (compareSection) {
            compareSection.style.display = 'none';
            const toggleBtn = compareSection.querySelector('button');
            if (toggleBtn) {
              toggleBtn.textContent = 'Compare';
              toggleBtn.style.background = 'rgba(71, 178, 229, 0.1)';
              toggleBtn.style.borderColor = 'rgba(71, 178, 229, 0.3)';
              toggleBtn.style.color = '#47B2E5';
            }
            const compareFieldSelect = compareSection.querySelector('select:first-of-type');
            const operatorSelect = compareSection.querySelector('select:last-of-type');
            if (compareFieldSelect) compareFieldSelect.value = '';
            if (operatorSelect) operatorSelect.value = '';
          }
          
          // Limpiar inputs visuales y atributos
          filterDiv.querySelectorAll('input[type="date"]').forEach(input => {
            input.value = '';
            input.removeAttribute('data-dynamic');
          });
          filterDiv.querySelectorAll('.filter-checkbox').forEach(checkbox => checkbox.checked = false);
          filterDiv.classList.remove('active');
          
          // Refrescar chips, resumen y tabla
          renderActiveFiltersList && renderActiveFiltersList();
          renderActiveFiltersSummaryChips && renderActiveFiltersSummaryChips();
          updateActiveFiltersSummary && updateActiveFiltersSummary();
          applyFilters && applyFilters();
        });
        
        // Botón de comparación - siempre visible en el header
        const toggleCompareBtn = document.createElement('button');
        toggleCompareBtn.type = 'button';
        toggleCompareBtn.textContent = 'Compare';
        toggleCompareBtn.className = 'filter-compare-toggle-btn';
        toggleCompareBtn.style.padding = '0.25rem 0.6rem';
        toggleCompareBtn.style.fontSize = '0.75rem';
        toggleCompareBtn.style.borderRadius = '4px';
        toggleCompareBtn.style.border = '1px solid rgba(71, 178, 229, 0.3)';
        toggleCompareBtn.style.background = 'rgba(71, 178, 229, 0.1)';
        toggleCompareBtn.style.color = '#47B2E5';
        toggleCompareBtn.style.cursor = 'pointer';
        toggleCompareBtn.style.fontWeight = '500';
        toggleCompareBtn.style.transition = 'all 0.2s';
        toggleCompareBtn.style.marginRight = '0.5rem';
        toggleCompareBtn.title = 'Compare this field with another field';
        
        // Verificar si ya hay una comparación activa
        const currentComparison = getModuleFieldComparison(selectedColumn);
        if (currentComparison) {
          toggleCompareBtn.textContent = 'Compare ✓';
          toggleCompareBtn.style.background = 'rgba(239, 68, 68, 0.1)';
          toggleCompareBtn.style.borderColor = 'rgba(239, 68, 68, 0.3)';
          toggleCompareBtn.style.color = '#ef4444';
        }
        
        headerRow.appendChild(label);
        headerRow.appendChild(toggleCompareBtn);
        headerRow.appendChild(resetBtn);
        filterDiv.appendChild(headerRow);
        
        // Sección de comparación de campos - oculta por defecto
        const compareSection = document.createElement('div');
        compareSection.className = 'filter-compare-section';
        compareSection.style.marginTop = '0.5rem';
        compareSection.style.marginBottom = '0.75rem';
        compareSection.style.padding = '0.75rem';
        compareSection.style.background = 'rgba(71, 178, 229, 0.05)';
        compareSection.style.border = '1px solid rgba(71, 178, 229, 0.2)';
        compareSection.style.borderRadius = '6px';
        compareSection.style.display = currentComparison ? 'block' : 'none';
        
        const compareLabel = document.createElement('div');
        compareLabel.textContent = 'Compare with field:';
        compareLabel.style.fontSize = '0.85rem';
        compareLabel.style.fontWeight = '600';
        compareLabel.style.color = '#1a202c';
        compareLabel.style.marginBottom = '0.5rem';
        
        toggleCompareBtn.addEventListener('click', () => {
          const isVisible = compareSection.style.display !== 'none';
          if (isVisible) {
            compareSection.style.display = 'none';
            toggleCompareBtn.textContent = 'Compare';
            toggleCompareBtn.style.background = 'rgba(71, 178, 229, 0.1)';
            toggleCompareBtn.style.borderColor = 'rgba(71, 178, 229, 0.3)';
            toggleCompareBtn.style.color = '#47B2E5';
          } else {
            compareSection.style.display = 'block';
            toggleCompareBtn.textContent = 'Compare ✓';
            toggleCompareBtn.style.background = 'rgba(71, 178, 229, 0.2)';
            toggleCompareBtn.style.borderColor = 'rgba(71, 178, 229, 0.4)';
            toggleCompareBtn.style.color = '#1976d2';
          }
        });
        
        compareSection.appendChild(compareLabel);
        
        // Controles de comparación
        const compareControls = document.createElement('div');
        compareControls.style.display = 'flex';
        compareControls.style.flexDirection = 'column';
        compareControls.style.gap = '0.5rem';
        
        // Selector de campo a comparar
        const compareFieldSelect = document.createElement('select');
        compareFieldSelect.className = 'input filter-select filter-compare-select';
        compareFieldSelect.style.setProperty('width', '100%', 'important');
        compareFieldSelect.style.setProperty('font-size', '0.85rem', 'important');
        compareFieldSelect.style.setProperty('padding', '0.5rem 0.75rem', 'important');
        compareFieldSelect.style.setProperty('background', '#ffffff', 'important');
        compareFieldSelect.style.setProperty('background-color', '#ffffff', 'important');
        compareFieldSelect.style.setProperty('border', '1px solid rgba(0, 0, 0, 0.15)', 'important');
        compareFieldSelect.style.setProperty('border-radius', '6px', 'important');
        compareFieldSelect.style.setProperty('color', '#1a202c', 'important');
        compareFieldSelect.style.setProperty('cursor', 'pointer', 'important');
        compareFieldSelect.style.setProperty('min-width', '100%', 'important');
        compareFieldSelect.style.setProperty('box-sizing', 'border-box', 'important');
        compareFieldSelect.innerHTML = '<option value="">Select field to compare...</option>';
        headers.forEach(header => {
          if (header !== selectedColumn) {
            const option = document.createElement('option');
            option.value = header;
            option.textContent = header;
            option.style.setProperty('background', '#ffffff', 'important');
            option.style.setProperty('color', '#1a202c', 'important');
            option.style.setProperty('white-space', 'normal', 'important');
            option.style.setProperty('word-wrap', 'break-word', 'important');
            if (currentComparison && currentComparison.compareColumn === header) {
              option.selected = true;
              option.style.setProperty('background', '#47B2E5', 'important');
              option.style.setProperty('color', '#ffffff', 'important');
            }
            compareFieldSelect.appendChild(option);
          }
        });
        
        // Selector de operador
        const operatorSelect = document.createElement('select');
        operatorSelect.className = 'input filter-select filter-compare-select';
        operatorSelect.style.setProperty('width', '100%', 'important');
        operatorSelect.style.setProperty('font-size', '0.85rem', 'important');
        operatorSelect.style.setProperty('padding', '0.5rem 0.75rem', 'important');
        operatorSelect.style.setProperty('background', '#ffffff', 'important');
        operatorSelect.style.setProperty('background-color', '#ffffff', 'important');
        operatorSelect.style.setProperty('border', '1px solid rgba(0, 0, 0, 0.15)', 'important');
        operatorSelect.style.setProperty('border-radius', '6px', 'important');
        operatorSelect.style.setProperty('color', '#1a202c', 'important');
        operatorSelect.style.setProperty('cursor', 'pointer', 'important');
        operatorSelect.style.setProperty('min-width', '100%', 'important');
        operatorSelect.style.setProperty('box-sizing', 'border-box', 'important');
        const operators = [
          { value: '', text: 'Select operator...' },
          { value: 'equals', text: 'Equals (=)' },
          { value: 'not_equals', text: 'Different (≠)' },
          { value: 'contains', text: 'Contains' },
          { value: 'not_contains', text: 'Not Contains' },
          { value: 'starts_with', text: 'Starts With' },
          { value: 'ends_with', text: 'Ends With' },
          { value: 'greater_than', text: 'Greater Than (>)' },
          { value: 'less_than', text: 'Less Than (<)' },
          { value: 'greater_equal', text: 'Greater or Equal (≥)' },
          { value: 'less_equal', text: 'Less or Equal (≤)' }
        ];
        
        operators.forEach(op => {
          const option = document.createElement('option');
          option.value = op.value;
          option.textContent = op.text;
          option.style.setProperty('background', '#ffffff', 'important');
          option.style.setProperty('color', '#1a202c', 'important');
          option.style.setProperty('white-space', 'normal', 'important');
          option.style.setProperty('word-wrap', 'break-word', 'important');
          if (currentComparison && currentComparison.operator === op.value) {
            option.selected = true;
            option.style.setProperty('background', '#47B2E5', 'important');
            option.style.setProperty('color', '#ffffff', 'important');
          }
          operatorSelect.appendChild(option);
        });
        
        // Aplicar automáticamente cuando se selecciona campo y operador
        const applyComparison = () => {
          const compareColumn = compareFieldSelect.value;
          const operator = operatorSelect.value;
          
          if (!compareColumn || !operator) {
            // Si se deselecciona, limpiar la comparación
            if (!compareColumn && !operator) {
              setModuleFieldComparison(selectedColumn, null);
              toggleCompareBtn.textContent = 'Compare';
              toggleCompareBtn.style.background = 'rgba(71, 178, 229, 0.1)';
              toggleCompareBtn.style.borderColor = 'rgba(71, 178, 229, 0.3)';
              toggleCompareBtn.style.color = '#47B2E5';
              
              if (typeof window.updateSaveQuickButtonState === 'function') {
                window.updateSaveQuickButtonState();
              }
              
              applyFilters();
              updateActiveFiltersSummary();
            }
            return;
          }
          
          if (compareColumn === selectedColumn) {
            if (typeof window.showUnifiedNotification === 'function') {
              window.showUnifiedNotification('Cannot compare a field with itself', 'error');
            }
            return;
          }
          
          setModuleFieldComparison(selectedColumn, { compareColumn, operator });
          
          // Actualizar estado del botón
          toggleCompareBtn.textContent = 'Compare ✓';
          toggleCompareBtn.style.background = 'rgba(239, 68, 68, 0.1)';
          toggleCompareBtn.style.borderColor = 'rgba(239, 68, 68, 0.3)';
          toggleCompareBtn.style.color = '#ef4444';
          
          // Actualizar estado del botón "Save as quick filter"
          if (typeof window.updateSaveQuickButtonState === 'function') {
            window.updateSaveQuickButtonState();
          }
          
          applyFilters();
          updateActiveFiltersSummary();
        };
        
        // Función para actualizar estilos de opciones seleccionadas
        const updateSelectedOptionStyles = (select) => {
          Array.from(select.options).forEach(opt => {
            if (opt.selected && opt.value !== '') {
              opt.style.setProperty('background', '#47B2E5', 'important');
              opt.style.setProperty('color', '#ffffff', 'important');
            } else {
              opt.style.setProperty('background', '#ffffff', 'important');
              opt.style.setProperty('color', '#1a202c', 'important');
            }
          });
        };
        
        // Aplicar automáticamente al cambiar los selects
        compareFieldSelect.addEventListener('change', () => {
          updateSelectedOptionStyles(compareFieldSelect);
          applyComparison();
        });
        operatorSelect.addEventListener('change', () => {
          updateSelectedOptionStyles(operatorSelect);
          applyComparison();
        });
        
        // Actualizar estilos iniciales
        updateSelectedOptionStyles(compareFieldSelect);
        updateSelectedOptionStyles(operatorSelect);
        
        compareControls.appendChild(compareFieldSelect);
        compareControls.appendChild(operatorSelect);
        compareSection.appendChild(compareControls);
        
        filterDiv.appendChild(compareSection);
        
        // Input según tipo
        if (type === 'date') {
          // Copio la lógica de creación de filtros de fecha
          const inputWrapper = document.createElement("div");
          inputWrapper.className = "filter-input-wrapper";
          // Start date
          const startInput = document.createElement("input");
          startInput.type = "date";
          startInput.className = "filter-input";
          startInput.placeholder = "Start date";
          startInput.dataset.column = selectedColumn;
          startInput.dataset.type = "start";
          const startKey = `${selectedColumn}_start`;
          const startVal = getModuleFilterValues()[startKey];
          if (typeof startVal === 'string' && startVal.startsWith('__TODAY__')) {
            startInput.value = resolveDynamicDateExpr(startVal);
            startInput.dataset.dynamic = startVal;
            filterDiv.classList.add('active');
            setModuleActiveFilters({ ...getModuleActiveFilters(), [selectedColumn]: 'date' });
          } else if (startVal) {
            startInput.value = startVal;
            filterDiv.classList.add('active');
            setModuleActiveFilters({ ...getModuleActiveFilters(), [selectedColumn]: 'date' });
          }
          // Botón Today para start
          const todayBtnStart = document.createElement('button');
          todayBtnStart.type = 'button';
          todayBtnStart.className = 'date-today-btn';
          todayBtnStart.textContent = 'Today';
          todayBtnStart.style.marginLeft = '0.5rem';
          todayBtnStart.addEventListener('click', () => {
            // Force clear any existing dynamic value
            startInput.removeAttribute('data-dynamic');
            startInput.value = '';
            
            // Set new dynamic value
            const today = new Date().toISOString().split('T')[0];
            startInput.value = today;
            startInput.dataset.dynamic = '__TODAY__';
            
            // Force update store with new value
            const key = `${selectedColumn}_start`;
            setModuleFilterValues({ ...getModuleFilterValues(), [key]: '__TODAY__' });
            setModuleActiveFilters({ ...getModuleActiveFilters(), [selectedColumn]: 'date' });
            filterDiv.classList.add("active");
            
            // Update UI and apply filters
            updateActiveFiltersSummary();
            applyFilters();
            renderActiveFiltersSummaryChips();
          });
          // Input para días personalizados (para startInput)
          const daysInputStart = document.createElement('input');
          daysInputStart.type = 'number';
          daysInputStart.value = 7;
          daysInputStart.min = 1;
          daysInputStart.max = 365;
          // daysInputStart.style.width = '48px'; // Eliminado para que el CSS lo controle
          daysInputStart.className = 'days-offset-input';
          daysInputStart.title = 'Days to add/subtract';
          // Botón + días para startInput
          const plusBtnStart = document.createElement('button');
          plusBtnStart.type = 'button';
          plusBtnStart.textContent = '+ days';
          plusBtnStart.className = 'date-offset-btn';
          plusBtnStart.addEventListener('click', () => {
            let baseExpr = startInput.dataset.dynamic || '__TODAY__';
            let offset = 0;
            const match = baseExpr.match(/__TODAY__(?:([+-])(\d+))?/);
            if (match && match[1] && match[2]) {
              offset = parseInt(match[2], 10) * (match[1] === '-' ? -1 : 1);
            }
            offset += parseInt(daysInputStart.value, 10);
            const expr = `__TODAY__${offset >= 0 ? '+' : ''}${offset}`;
            startInput.value = resolveDynamicDateExpr(expr);
            startInput.dataset.dynamic = expr;
            const key = `${selectedColumn}_start`;
            setModuleFilterValues({ ...getModuleFilterValues(), [key]: expr });
            filterDiv.classList.add("active");
            updateActiveFiltersSummary();
            applyFilters();
            renderActiveFiltersSummaryChips();
          });
          // Botón - días para startInput
          const minusBtnStart = document.createElement('button');
          minusBtnStart.type = 'button';
          minusBtnStart.textContent = '- days';
          minusBtnStart.className = 'date-offset-btn';
          minusBtnStart.addEventListener('click', () => {
            let baseExpr = startInput.dataset.dynamic || '__TODAY__';
            let offset = 0;
            const match = baseExpr.match(/__TODAY__(?:([+-])(\d+))?/);
            if (match && match[1] && match[2]) {
              offset = parseInt(match[2], 10) * (match[1] === '-' ? -1 : 1);
            }
            offset -= parseInt(daysInputStart.value, 10);
            const expr = `__TODAY__${offset >= 0 ? '+' : ''}${offset}`;
            startInput.value = resolveDynamicDateExpr(expr);
            startInput.dataset.dynamic = expr;
            const key = `${selectedColumn}_start`;
            setModuleFilterValues({ ...getModuleFilterValues(), [key]: expr });
            filterDiv.classList.add("active");
            updateActiveFiltersSummary();
            applyFilters();
            renderActiveFiltersSummaryChips();
          });
          // End date
          const endInput = document.createElement("input");
          endInput.type = "date";
          endInput.className = "filter-input";
          endInput.placeholder = "End date";
          endInput.dataset.column = selectedColumn;
          endInput.dataset.type = "end";
          const endKey = `${selectedColumn}_end`;
          const endVal = getModuleFilterValues()[endKey];
          if (typeof endVal === 'string' && endVal.startsWith('__TODAY__')) {
            endInput.value = resolveDynamicDateExpr(endVal);
            endInput.dataset.dynamic = endVal;
            filterDiv.classList.add('active');
            setModuleActiveFilters({ ...getModuleActiveFilters(), [selectedColumn]: 'date' });
          } else if (endVal) {
            endInput.value = endVal;
            filterDiv.classList.add('active');
            setModuleActiveFilters({ ...getModuleActiveFilters(), [selectedColumn]: 'date' });
          }
          // Botón Today para end
          const todayBtnEnd = document.createElement('button');
          todayBtnEnd.type = 'button';
          todayBtnEnd.className = 'date-today-btn';
          todayBtnEnd.textContent = 'Today';
          todayBtnEnd.style.marginLeft = '0.5rem';
          todayBtnEnd.addEventListener('click', () => {
            // Force clear any existing dynamic value
            endInput.removeAttribute('data-dynamic');
            endInput.value = '';
            
            // Set new dynamic value
            const today = new Date().toISOString().split('T')[0];
            endInput.value = today;
            endInput.dataset.dynamic = '__TODAY__';
            
            // Force update store with new value
            const key = `${selectedColumn}_end`;
            setModuleFilterValues({ ...getModuleFilterValues(), [key]: '__TODAY__' });
            setModuleActiveFilters({ ...getModuleActiveFilters(), [selectedColumn]: 'date' });
            filterDiv.classList.add("active");
            
            // Update UI and apply filters
            updateActiveFiltersSummary();
            applyFilters();
            renderActiveFiltersSummaryChips();
          });
          // Input para días personalizados (para endInput)
          const daysInputEnd = document.createElement('input');
          daysInputEnd.type = 'number';
          daysInputEnd.value = 7;
          daysInputEnd.min = 1;
          daysInputEnd.max = 365;
          // daysInputEnd.style.width = '48px'; // Eliminado para que el CSS lo controle
          daysInputEnd.className = 'days-offset-input';
          daysInputEnd.title = 'Days to add/subtract';
          // Botón + días para endInput
          const plusBtnEnd = document.createElement('button');
          plusBtnEnd.type = 'button';
          plusBtnEnd.textContent = '+ days';
          plusBtnEnd.className = 'date-offset-btn';
          plusBtnEnd.addEventListener('click', () => {
            let baseExpr = endInput.dataset.dynamic || '__TODAY__';
            let offset = 0;
            const match = baseExpr.match(/__TODAY__(?:([+-])(\d+))?/);
            if (match && match[1] && match[2]) {
              offset = parseInt(match[2], 10) * (match[1] === '-' ? -1 : 1);
            }
            offset += parseInt(daysInputEnd.value, 10);
            const expr = `__TODAY__${offset >= 0 ? '+' : ''}${offset}`;
            endInput.value = resolveDynamicDateExpr(expr);
            endInput.dataset.dynamic = expr;
            const key = `${selectedColumn}_end`;
            setModuleFilterValues({ ...getModuleFilterValues(), [key]: expr });
            filterDiv.classList.add("active");
            updateActiveFiltersSummary();
            applyFilters();
            renderActiveFiltersSummaryChips();
          });
          // Botón - días para endInput
          const minusBtnEnd = document.createElement('button');
          minusBtnEnd.type = 'button';
          minusBtnEnd.textContent = '- days';
          minusBtnEnd.className = 'date-offset-btn';
          minusBtnEnd.addEventListener('click', () => {
            let baseExpr = endInput.dataset.dynamic || '__TODAY__';
            let offset = 0;
            const match = baseExpr.match(/__TODAY__(?:([+-])(\d+))?/);
            if (match && match[1] && match[2]) {
              offset = parseInt(match[2], 10) * (match[1] === '-' ? -1 : 1);
            }
            offset -= parseInt(daysInputEnd.value, 10);
            const expr = `__TODAY__${offset >= 0 ? '+' : ''}${offset}`;
            endInput.value = resolveDynamicDateExpr(expr);
            endInput.dataset.dynamic = expr;
            const key = `${selectedColumn}_end`;
            setModuleFilterValues({ ...getModuleFilterValues(), [key]: expr });
            filterDiv.classList.add("active");
            updateActiveFiltersSummary();
            applyFilters();
            renderActiveFiltersSummaryChips();
          });
          // Empty button
          const emptyBtn = document.createElement('button');
          emptyBtn.type = 'button';
          emptyBtn.className = 'empty-toggle-btn';
          emptyBtn.textContent = 'Empty';
          if (getModuleFilterValues()[`${selectedColumn}_empty`]) emptyBtn.classList.add('active');
          emptyBtn.addEventListener('click', () => {
            const key = `${selectedColumn}_empty`;
            if (getModuleFilterValues()[key]) {
              const updated = { ...getModuleFilterValues() };
              delete updated[key];
              setModuleFilterValues(updated);
              emptyBtn.classList.remove('active');
              // Si no hay ningún filtro de fecha activo, eliminar de activeFilters
              if (!getModuleFilterValues()[`${selectedColumn}_start`] && 
                  !getModuleFilterValues()[`${selectedColumn}_end`]) {
                const activeFilters = { ...getModuleActiveFilters() };
                delete activeFilters[selectedColumn];
                setModuleActiveFilters(activeFilters);
                filterDiv.classList.remove('active');
              }
            } else {
              setModuleFilterValues({ ...getModuleFilterValues(), [key]: true });
              // Asegurar que el tipo 'date' está en activeFilters
              setModuleActiveFilters({ ...getModuleActiveFilters(), [selectedColumn]: 'date' });
              emptyBtn.classList.add('active');
              filterDiv.classList.add('active');
            }
            updateActiveFiltersSummary();
            applyFilters();
            renderActiveFiltersSummaryChips();
          });
          // Listeners para los inputs de fecha
          [startInput, endInput].forEach(inputEl => {
            inputEl.addEventListener("change", debounce(() => {
              const key = `${selectedColumn}_${inputEl.dataset.type}`;
              if (inputEl.value) {
                const todayStr = new Date().toISOString().slice(0, 10);
                if (inputEl.value === todayStr) {
                  setModuleFilterValues({ ...getModuleFilterValues(), [key]: '__TODAY__' });
                } else {
                  setModuleFilterValues({ ...getModuleFilterValues(), [key]: inputEl.value });
                }
                // Asegurar que el tipo 'date' está en activeFilters
                setModuleActiveFilters({ ...getModuleActiveFilters(), [selectedColumn]: 'date' });
                filterDiv.classList.add("active");
              } else {
                const updated = { ...getModuleFilterValues() };
                delete updated[key];
                setModuleFilterValues(updated);
                // Si no hay ningún filtro de fecha activo, eliminar de activeFilters
                if (!getModuleFilterValues()[`${selectedColumn}_start`] && 
                    !getModuleFilterValues()[`${selectedColumn}_end`] && 
                    !getModuleFilterValues()[`${selectedColumn}_empty`]) {
                  const activeFilters = { ...getModuleActiveFilters() };
                  delete activeFilters[selectedColumn];
                  setModuleActiveFilters(activeFilters);
                  filterDiv.classList.remove("active");
                }
              }
              updateActiveFiltersSummary();
              applyFilters();
              renderActiveFiltersSummaryChips();
            }, 300));
          });
          // Agrupar inputs y controles
          const startGroup = document.createElement('div');
          startGroup.className = 'date-input-group';
          const startLabel = document.createElement('label');
          startLabel.textContent = 'From';
          startGroup.appendChild(startLabel);
          startGroup.appendChild(startInput);
          const startControls = document.createElement('div');
          startControls.className = 'date-input-controls';
          startControls.appendChild(todayBtnStart);
          startControls.appendChild(daysInputStart);
          startControls.appendChild(plusBtnStart);
          startControls.appendChild(minusBtnStart);
          startGroup.appendChild(startControls);
          const endGroup = document.createElement('div');
          endGroup.className = 'date-input-group';
          const endLabel = document.createElement('label');
          endLabel.textContent = 'To';
          endGroup.appendChild(endLabel);
          endGroup.appendChild(endInput);
          const endControls = document.createElement('div');
          endControls.className = 'date-input-controls';
          endControls.appendChild(todayBtnEnd);
          endControls.appendChild(daysInputEnd);
          endControls.appendChild(plusBtnEnd);
          endControls.appendChild(minusBtnEnd);
          endGroup.appendChild(endControls);
          inputWrapper.innerHTML = '';
          inputWrapper.appendChild(startGroup);
          inputWrapper.appendChild(endGroup);
          inputWrapper.appendChild(emptyBtn);
          filterDiv.appendChild(inputWrapper);
        } else {
          // Filtro tipo Excel para todos los campos que no sean fecha
          let uniqueValues = [...new Set(getOriginalData()
            .map(row => row[selectedColumn] || '')
            .map(String)
            .map(val => val.trim()) // Eliminar espacios en blanco
            .filter(val => val !== '') // Eliminar valores vacíos
          )];
          
          // Eliminar duplicados adicionales considerando normalización
          const normalizedSet = new Set();
          uniqueValues = uniqueValues.filter(val => {
            const normalized = val.toLowerCase().replace(/\s+/g, ' ').trim();
            if (normalizedSet.has(normalized)) {
              return false;
            }
            normalizedSet.add(normalized);
            return true;
          });
          
          // Ordenar alfabéticamente para mejor UX
          uniqueValues.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
          
          if (type === 'date') {
            uniqueValues = uniqueValues.map(val => toISODateString(val));
          }
          const dropdownWrapper = document.createElement('div');
          dropdownWrapper.className = 'modal-filter-dropdown-wrapper';
          dropdownWrapper.style.position = 'relative';
          const input = document.createElement('input');
          input.type = 'text';
          input.className = 'modal-filter-input';
          input.placeholder = `Search or select...`;
          input.autocomplete = 'off';
          input.addEventListener('focus', () => {
            if (input.value) input.value = '';
          });
          dropdownWrapper.appendChild(input);
          
          // Campo para agregar valores personalizados
          const customValueContainer = document.createElement('div');
          customValueContainer.style.display = 'flex';
          customValueContainer.style.gap = '0.5rem';
          customValueContainer.style.marginTop = '0.5rem';
          customValueContainer.style.alignItems = 'center';
          
          const customInput = document.createElement('input');
          customInput.type = 'text';
          customInput.className = 'modal-filter-custom-input';
          customInput.placeholder = 'Add custom value...';
          customInput.autocomplete = 'off';
          customInput.style.flex = '1';
          customInput.style.padding = '0.5rem';
          customInput.style.border = '1px solid rgba(0, 0, 0, 0.2)';
          customInput.style.borderRadius = '6px';
          customInput.style.background = '#E3F2FD';
          customInput.style.backgroundColor = '#E3F2FD';
          customInput.style.color = '#000000';
          customInput.style.fontSize = '0.9rem';
          
          const addCustomBtn = document.createElement('button');
          addCustomBtn.type = 'button';
          addCustomBtn.textContent = 'Add';
          addCustomBtn.className = 'modal-filter-add-custom-btn';
          addCustomBtn.style.padding = '0.5rem 1.2rem';
          addCustomBtn.style.background = '#47B2E5';
          addCustomBtn.style.backgroundColor = '#47B2E5';
          addCustomBtn.style.border = '1px solid #47B2E5';
          addCustomBtn.style.borderRadius = '6px';
          addCustomBtn.style.color = '#FFFFFF';
          addCustomBtn.style.cursor = 'pointer';
          addCustomBtn.style.fontSize = '0.9rem';
          addCustomBtn.style.fontWeight = '600';
          addCustomBtn.style.transition = 'all 0.3s ease';
          addCustomBtn.style.boxShadow = '0 2px 4px rgba(71, 178, 229, 0.3)';
          
          addCustomBtn.addEventListener('mouseenter', () => {
            addCustomBtn.style.background = '#3A9BD4';
            addCustomBtn.style.backgroundColor = '#3A9BD4';
            addCustomBtn.style.borderColor = '#3A9BD4';
            addCustomBtn.style.color = '#FFFFFF';
            addCustomBtn.style.boxShadow = '0 3px 6px rgba(71, 178, 229, 0.4)';
            addCustomBtn.style.transform = 'translateY(-1px)';
          });
          
          addCustomBtn.addEventListener('mouseleave', () => {
            addCustomBtn.style.background = '#47B2E5';
            addCustomBtn.style.backgroundColor = '#47B2E5';
            addCustomBtn.style.borderColor = '#47B2E5';
            addCustomBtn.style.color = '#FFFFFF';
            addCustomBtn.style.boxShadow = '0 2px 4px rgba(71, 178, 229, 0.3)';
            addCustomBtn.style.transform = 'translateY(0)';
          });
          
          addCustomBtn.addEventListener('click', () => {
            const customValue = customInput.value.trim();
            if (customValue && customValue !== '') {
              selectedSet = new Set(getModuleFilterValues()[selectedColumn] || []);
              selectedSet.add(customValue);
              setModuleFilterValues({ ...getModuleFilterValues(), [selectedColumn]: Array.from(selectedSet) });
              setModuleActiveFilters({ ...getModuleActiveFilters(), [selectedColumn]: type });
              filterDiv.classList.add('active');
              customInput.value = '';
              renderCheckboxList(lastFilterTerm);
              updateActiveFiltersSummary();
              applyFilters();
              updateInputSummary();
            }
          });
          
          customInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
              addCustomBtn.click();
            }
          });
          
          customValueContainer.appendChild(customInput);
          customValueContainer.appendChild(addCustomBtn);
          dropdownWrapper.appendChild(customValueContainer);
          const dropdown = document.createElement('div');
          dropdown.className = 'modal-filter-dropdown hidden';
          dropdown.style.position = 'absolute';
          dropdown.style.top = '100%';
          dropdown.style.left = '0';
          dropdown.style.width = '100%';
          dropdown.style.background = '#fff';
          dropdown.style.border = '1px solid var(--border-color)';
          dropdown.style.borderRadius = '0 0 6px 6px';
          dropdown.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
          dropdown.style.zIndex = '100';
          dropdown.style.maxHeight = '260px';
          dropdown.style.overflowY = 'auto';
          dropdown.style.fontSize = '0.95rem';
          dropdown.style.padding = '0';
          dropdown.style.setProperty('color', '#000000', 'important');
          dropdown.style.setProperty('background', '#E3F2FD', 'important');
          dropdown.style.setProperty('border', '2px solid rgba(0, 0, 0, 0.2)', 'important');
          dropdown.style.setProperty('box-shadow', '0 12px 40px rgba(0, 0, 0, 0.2)', 'important');
          dropdown.setAttribute('style', dropdown.getAttribute('style') + '; color: #000000 !important; background: #E3F2FD !important; border: 2px solid rgba(0, 0, 0, 0.2) !important; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2) !important;');
          dropdownWrapper.appendChild(dropdown);
          // Añadir event listener global para cerrar el dropdown si se hace clic fuera
          document.addEventListener('mousedown', (e) => {
            if (!dropdownWrapper.contains(e.target)) {
              dropdown.classList.add('hidden');
            }
          });
          
          // MUTATION OBSERVER PARA FORZAR ESTILOS EN ELEMENTOS DINÁMICOS
          const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                  if (node.nodeType === Node.ELEMENT_NODE) {
                    // Forzar estilos en labels
                    const labels = node.querySelectorAll ? node.querySelectorAll('label') : [];
                    labels.forEach(label => {
                      label.style.setProperty('color', '#000000', 'important');
                      label.style.setProperty('background', 'transparent', 'important');
                      label.style.setProperty('text-shadow', 'none', 'important');
                    });
                    
                    // Forzar estilos en spans
                    const spans = node.querySelectorAll ? node.querySelectorAll('span') : [];
                    spans.forEach(span => {
                      span.style.setProperty('color', '#000000', 'important');
                      span.style.setProperty('background', 'transparent', 'important');
                      span.style.setProperty('text-shadow', 'none', 'important');
                    });
                    
                    // Si el nodo mismo es un label o span
                    if (node.tagName === 'LABEL') {
                      node.style.setProperty('color', '#000000', 'important');
                      node.style.setProperty('background', 'transparent', 'important');
                      node.style.setProperty('text-shadow', 'none', 'important');
                    }
                    if (node.tagName === 'SPAN') {
                      node.style.setProperty('color', '#000000', 'important');
                      node.style.setProperty('background', 'transparent', 'important');
                      node.style.setProperty('text-shadow', 'none', 'important');
                    }
                  }
                });
              }
            });
          });
          
          observer.observe(dropdown, {
            childList: true,
            subtree: true
          });
          
          const selectAllBtn = document.createElement('button');
          selectAllBtn.textContent = 'Select all';
          selectAllBtn.type = 'button';
          selectAllBtn.className = 'modal-filter-dropdown-btn';
          selectAllBtn.style.margin = '0.3rem 0.5rem 0.3rem 0';
          selectAllBtn.style.color = '#47B2E5';
          selectAllBtn.style.background = 'rgba(71, 178, 229, 0.2)';
          selectAllBtn.style.border = '1px solid rgba(71, 178, 229, 0.3)';
          selectAllBtn.style.borderRadius = '8px';
          const clearAllBtn = document.createElement('button');
          clearAllBtn.textContent = 'Clear selection';
          clearAllBtn.type = 'button';
          clearAllBtn.className = 'modal-filter-dropdown-btn';
          clearAllBtn.style.margin = '0.3rem 0 0.3rem 0.5rem';
          clearAllBtn.style.color = '#47B2E5';
          clearAllBtn.style.background = 'rgba(71, 178, 229, 0.2)';
          clearAllBtn.style.border = '1px solid rgba(71, 178, 229, 0.3)';
          clearAllBtn.style.borderRadius = '8px';
          const btnsDiv = document.createElement('div');
          btnsDiv.style.display = 'flex';
          btnsDiv.style.justifyContent = 'space-between';
          btnsDiv.appendChild(selectAllBtn);
          btnsDiv.appendChild(clearAllBtn);
          dropdown.appendChild(btnsDiv);
          function debounce(func, wait) {
            let timeout;
            return function(...args) {
              clearTimeout(timeout);
              timeout = setTimeout(() => func.apply(this, args), wait);
            };
          }
          let selectedSet = new Set();
          let lastFilterTerm = '';
          let filteredValues = uniqueValues;
          function renderCheckboxList(filterTerm = '') {
            selectedSet = new Set(getModuleFilterValues()[selectedColumn] || []);
            
            // LIMPIEZA COMPLETA Y ROBUSTA
            dropdown.innerHTML = '';
            
            // Recrear botones de control
            const btnsDiv = document.createElement('div');
            btnsDiv.style.display = 'flex';
            btnsDiv.style.justifyContent = 'space-between';
            btnsDiv.appendChild(selectAllBtn.cloneNode(true));
            btnsDiv.appendChild(clearAllBtn.cloneNode(true));
            dropdown.appendChild(btnsDiv);
            
            // Recrear event listeners para los botones clonados
            const newSelectAllBtn = btnsDiv.children[0];
            const newClearAllBtn = btnsDiv.children[1];
            
            newSelectAllBtn.addEventListener('click', () => {
              filteredValues.forEach(val => {
                if (val !== '') selectedSet.add(val);
              });
              setModuleFilterValues({ ...getModuleFilterValues(), [selectedColumn]: Array.from(selectedSet) });
              filterDiv.classList.add('active');
              renderCheckboxList();
              updateActiveFiltersSummary();
              applyFilters();
              updateInputSummary();
            });
            
            newClearAllBtn.addEventListener('click', () => {
              selectedSet.clear();
              const updated = { ...getModuleFilterValues() };
              delete updated[selectedColumn];
              setModuleFilterValues(updated);
              filterDiv.classList.remove('active');
              renderCheckboxList();
              updateActiveFiltersSummary();
              applyFilters();
              updateInputSummary();
            });
            
            const list = document.createElement('div');
            list.className = 'modal-filter-checkbox-list';
            list.style.setProperty('color', '#000000', 'important');
            list.style.setProperty('background', 'transparent', 'important');
            list.setAttribute('style', 'color: #000000 !important; background: transparent !important; padding: 0.5rem !important;');
            const emptyBtn2 = document.createElement('button');
            emptyBtn2.type = 'button';
            emptyBtn2.className = 'empty-toggle-btn';
            emptyBtn2.innerHTML = '<span class="check-indicator"></span>(Empty)';
            emptyBtn2.style.color = '#47B2E5';
            emptyBtn2.style.background = 'rgba(71, 178, 229, 0.2)';
            emptyBtn2.style.border = '1px solid rgba(71, 178, 229, 0.3)';
            emptyBtn2.style.borderRadius = '6px';
            emptyBtn2.style.fontWeight = '500';
            emptyBtn2.style.transition = 'all 0.2s ease';
            emptyBtn2.style.display = 'flex';
            emptyBtn2.style.alignItems = 'center';
            emptyBtn2.style.gap = '0.4rem';
            
            // Crear el indicador de check
            const emptyCheckIndicator = emptyBtn2.querySelector('.check-indicator');
            if (emptyCheckIndicator) {
              emptyCheckIndicator.style.width = '16px';
              emptyCheckIndicator.style.height = '16px';
              emptyCheckIndicator.style.border = '2px solid rgba(71, 178, 229, 0.3)';
              emptyCheckIndicator.style.borderRadius = '3px';
              emptyCheckIndicator.style.background = 'transparent';
              emptyCheckIndicator.style.display = 'inline-flex';
              emptyCheckIndicator.style.alignItems = 'center';
              emptyCheckIndicator.style.justifyContent = 'center';
              emptyCheckIndicator.style.flexShrink = '0';
            }
            
            // Función para actualizar el estado visual
            const updateEmptyBtnState = () => {
              const checkIndicator = emptyBtn2.querySelector('.check-indicator');
              if (selectedSet.has('__EMPTY__')) {
                emptyBtn2.classList.add('active');
                emptyBtn2.style.background = 'rgba(71, 178, 229, 0.4)';
                emptyBtn2.style.border = '2px solid #47B2E5';
                emptyBtn2.style.color = '#1976d2';
                emptyBtn2.style.fontWeight = '700';
                emptyBtn2.style.boxShadow = '0 2px 6px rgba(71, 178, 229, 0.3)';
                if (checkIndicator) {
                  checkIndicator.style.background = '#47B2E5';
                  checkIndicator.style.borderColor = '#47B2E5';
                  checkIndicator.innerHTML = '✓';
                  checkIndicator.style.color = '#ffffff';
                  checkIndicator.style.fontSize = '12px';
                  checkIndicator.style.fontWeight = 'bold';
                }
              } else {
                emptyBtn2.classList.remove('active');
                emptyBtn2.style.background = 'rgba(71, 178, 229, 0.2)';
                emptyBtn2.style.border = '1px solid rgba(71, 178, 229, 0.3)';
                emptyBtn2.style.color = '#47B2E5';
                emptyBtn2.style.fontWeight = '500';
                emptyBtn2.style.boxShadow = 'none';
                if (checkIndicator) {
                  checkIndicator.style.background = 'transparent';
                  checkIndicator.style.borderColor = 'rgba(71, 178, 229, 0.3)';
                  checkIndicator.innerHTML = '';
                }
              }
            };
            
            // Estado inicial
            updateEmptyBtnState();
            
            emptyBtn2.addEventListener('click', () => {
              if (selectedSet.has('__EMPTY__')) {
                selectedSet.delete('__EMPTY__');
              } else {
                selectedSet.add('__EMPTY__');
              }
              updateEmptyBtnState();
              setModuleFilterValues({ ...getModuleFilterValues(), [selectedColumn]: Array.from(selectedSet) });
              setModuleActiveFilters({ ...getModuleActiveFilters(), [selectedColumn]: type });
              filterDiv.classList.toggle('active', selectedSet.size > 0);
              updateActiveFiltersSummary();
              updateInputSummary();
            });
            list.appendChild(emptyBtn2);
            // Botón (No Empty)
            const noEmptyBtn2 = document.createElement('button');
            noEmptyBtn2.type = 'button';
            noEmptyBtn2.className = 'empty-toggle-btn';
            noEmptyBtn2.innerHTML = '<span class="check-indicator"></span>(No Empty)';
            noEmptyBtn2.style.color = '#47B2E5';
            noEmptyBtn2.style.background = 'rgba(71, 178, 229, 0.2)';
            noEmptyBtn2.style.border = '1px solid rgba(71, 178, 229, 0.3)';
            noEmptyBtn2.style.borderRadius = '6px';
            noEmptyBtn2.style.marginLeft = '0.5rem';
            noEmptyBtn2.style.fontWeight = '500';
            noEmptyBtn2.style.transition = 'all 0.2s ease';
            noEmptyBtn2.style.display = 'flex';
            noEmptyBtn2.style.alignItems = 'center';
            noEmptyBtn2.style.gap = '0.4rem';
            
            // Crear el indicador de check
            const noEmptyCheckIndicator = noEmptyBtn2.querySelector('.check-indicator');
            if (noEmptyCheckIndicator) {
              noEmptyCheckIndicator.style.width = '16px';
              noEmptyCheckIndicator.style.height = '16px';
              noEmptyCheckIndicator.style.border = '2px solid rgba(71, 178, 229, 0.3)';
              noEmptyCheckIndicator.style.borderRadius = '3px';
              noEmptyCheckIndicator.style.background = 'transparent';
              noEmptyCheckIndicator.style.display = 'inline-flex';
              noEmptyCheckIndicator.style.alignItems = 'center';
              noEmptyCheckIndicator.style.justifyContent = 'center';
              noEmptyCheckIndicator.style.flexShrink = '0';
            }
            
            // Función para actualizar el estado visual
            const updateNoEmptyBtnState = () => {
              const checkIndicator = noEmptyBtn2.querySelector('.check-indicator');
              if (selectedSet.has('__NO_EMPTY__')) {
                noEmptyBtn2.classList.add('active');
                noEmptyBtn2.style.background = 'rgba(71, 178, 229, 0.4)';
                noEmptyBtn2.style.border = '2px solid #47B2E5';
                noEmptyBtn2.style.color = '#1976d2';
                noEmptyBtn2.style.fontWeight = '700';
                noEmptyBtn2.style.boxShadow = '0 2px 6px rgba(71, 178, 229, 0.3)';
                if (checkIndicator) {
                  checkIndicator.style.background = '#47B2E5';
                  checkIndicator.style.borderColor = '#47B2E5';
                  checkIndicator.innerHTML = '✓';
                  checkIndicator.style.color = '#ffffff';
                  checkIndicator.style.fontSize = '12px';
                  checkIndicator.style.fontWeight = 'bold';
                }
              } else {
                noEmptyBtn2.classList.remove('active');
                noEmptyBtn2.style.background = 'rgba(71, 178, 229, 0.2)';
                noEmptyBtn2.style.border = '1px solid rgba(71, 178, 229, 0.3)';
                noEmptyBtn2.style.color = '#47B2E5';
                noEmptyBtn2.style.fontWeight = '500';
                noEmptyBtn2.style.boxShadow = 'none';
                if (checkIndicator) {
                  checkIndicator.style.background = 'transparent';
                  checkIndicator.style.borderColor = 'rgba(71, 178, 229, 0.3)';
                  checkIndicator.innerHTML = '';
                }
              }
            };
            
            // Estado inicial
            updateNoEmptyBtnState();
            
            noEmptyBtn2.addEventListener('click', () => {
              if (selectedSet.has('__NO_EMPTY__')) {
                selectedSet.delete('__NO_EMPTY__');
              } else {
                selectedSet.add('__NO_EMPTY__');
              }
              updateNoEmptyBtnState();
              setModuleFilterValues({ ...getModuleFilterValues(), [selectedColumn]: Array.from(selectedSet) });
              setModuleActiveFilters({ ...getModuleActiveFilters(), [selectedColumn]: type });
              filterDiv.classList.toggle('active', selectedSet.size > 0);
              updateActiveFiltersSummary();
              updateInputSummary();
            });
            list.appendChild(noEmptyBtn2);
            
            // Botón Exclude - mismo estilo que Empty y No Empty
            const excludeBtn2 = document.createElement('button');
            excludeBtn2.type = 'button';
            excludeBtn2.className = 'empty-toggle-btn';
            excludeBtn2.innerHTML = '<span class="check-indicator"></span>Exclude';
            excludeBtn2.style.color = '#47B2E5';
            excludeBtn2.style.background = 'rgba(71, 178, 229, 0.2)';
            excludeBtn2.style.border = '1px solid rgba(71, 178, 229, 0.3)';
            excludeBtn2.style.borderRadius = '6px';
            excludeBtn2.style.marginLeft = '0.5rem';
            excludeBtn2.style.fontWeight = '500';
            excludeBtn2.style.transition = 'all 0.2s ease';
            excludeBtn2.style.display = 'flex';
            excludeBtn2.style.alignItems = 'center';
            excludeBtn2.style.gap = '0.4rem';
            
            // Crear el indicador de check
            const excludeCheckIndicator = excludeBtn2.querySelector('.check-indicator');
            if (excludeCheckIndicator) {
              excludeCheckIndicator.style.width = '16px';
              excludeCheckIndicator.style.height = '16px';
              excludeCheckIndicator.style.border = '2px solid rgba(71, 178, 229, 0.3)';
              excludeCheckIndicator.style.borderRadius = '3px';
              excludeCheckIndicator.style.background = 'transparent';
              excludeCheckIndicator.style.display = 'inline-flex';
              excludeCheckIndicator.style.alignItems = 'center';
              excludeCheckIndicator.style.justifyContent = 'center';
              excludeCheckIndicator.style.flexShrink = '0';
            }
            
            // Verificar si está en modo exclude
            const currentExclude = getModuleFilterExclude();
            const isExcludeMode = currentExclude[selectedColumn] || false;
            
            // Función para actualizar el estado visual
            const updateExcludeBtnState = () => {
              const excludeState = getModuleFilterExclude();
              const isActive = excludeState[selectedColumn] || false;
              const checkIndicator = excludeBtn2.querySelector('.check-indicator');
              
              if (isActive) {
                excludeBtn2.classList.add('active');
                excludeBtn2.style.background = 'rgba(239, 68, 68, 0.3)';
                excludeBtn2.style.border = '2px solid #ef4444';
                excludeBtn2.style.color = '#dc2626';
                excludeBtn2.style.fontWeight = '700';
                excludeBtn2.style.boxShadow = '0 2px 6px rgba(239, 68, 68, 0.3)';
                if (checkIndicator) {
                  checkIndicator.style.background = '#ef4444';
                  checkIndicator.style.borderColor = '#ef4444';
                  checkIndicator.innerHTML = '✓';
                  checkIndicator.style.color = '#ffffff';
                  checkIndicator.style.fontSize = '12px';
                  checkIndicator.style.fontWeight = 'bold';
                }
              } else {
                excludeBtn2.classList.remove('active');
                excludeBtn2.style.background = 'rgba(71, 178, 229, 0.2)';
                excludeBtn2.style.border = '1px solid rgba(71, 178, 229, 0.3)';
                excludeBtn2.style.color = '#47B2E5';
                excludeBtn2.style.fontWeight = '500';
                excludeBtn2.style.boxShadow = 'none';
                if (checkIndicator) {
                  checkIndicator.style.background = 'transparent';
                  checkIndicator.style.borderColor = 'rgba(71, 178, 229, 0.3)';
                  checkIndicator.innerHTML = '';
                }
              }
            };
            
            // Estado inicial
            updateExcludeBtnState();
            
            excludeBtn2.addEventListener('click', () => {
              const excludeState = { ...getModuleFilterExclude() };
              const newExcludeMode = !excludeState[selectedColumn];
              
              if (newExcludeMode) {
                excludeState[selectedColumn] = true;
              } else {
                delete excludeState[selectedColumn];
              }
              
              setModuleFilterExclude(excludeState);
              updateExcludeBtnState();
              
              // Actualizar estado del botón "Save as quick filter"
              const saveQuickBtn = document.getElementById('saveQuickFilterBtn');
              if (saveQuickBtn) {
                const hasExclude = Object.keys(excludeState).length > 0;
                if (hasExclude) {
                  saveQuickBtn.disabled = true;
                  saveQuickBtn.style.opacity = '0.5';
                  saveQuickBtn.style.cursor = 'not-allowed';
                  saveQuickBtn.title = 'Cannot save as quick filter when Exclude mode is active. Use "Save Filter" instead.';
                } else {
                  saveQuickBtn.disabled = false;
                  saveQuickBtn.style.opacity = '1';
                  saveQuickBtn.style.cursor = 'pointer';
                  saveQuickBtn.title = '';
                }
              }
              
              updateActiveFiltersSummary();
              updateInputSummary();
              applyFilters();
            });
            list.appendChild(excludeBtn2);
            
            const MAX_OPTIONS = 200;
            filteredValues = uniqueValues;
            if (filterTerm) {
              const lowerTerm = filterTerm.toLowerCase();
              filteredValues = uniqueValues.filter(val => val.toLowerCase().includes(lowerTerm));
            }
            // Agregar valores personalizados que no están en uniqueValues pero están seleccionados
            const selectedValues = Array.from(selectedSet).filter(v => v !== '__EMPTY__' && v !== '__NO_EMPTY__');
            selectedValues.forEach(customVal => {
              if (!uniqueValues.includes(customVal) && !filteredValues.includes(customVal)) {
                // Si el término de búsqueda coincide o está vacío, agregar el valor personalizado
                if (!filterTerm || customVal.toLowerCase().includes(filterTerm.toLowerCase())) {
                  filteredValues.push(customVal);
                }
              }
            });
            
            // VERIFICAR QUE NO HAYA DUPLICADOS EN TIEMPO REAL
            const processedValues = new Set();
            filteredValues.slice(0, MAX_OPTIONS).forEach(val => {
              if (val === '' || processedValues.has(val)) return;
              processedValues.add(val);
              
              // CREAR ELEMENTO USANDO createElement Y FORZAR TEXTO
              const label = document.createElement('label');
              label.setAttribute('style', 'display: flex !important; align-items: center !important; gap: 0.5rem !important; padding: 0.15rem 0.5rem !important; color: #000000 !important; text-shadow: none !important; background: transparent !important; cursor: pointer !important; opacity: 1 !important; visibility: visible !important; border-bottom: 1px solid rgba(0, 0, 0, 0.1) !important;');
              label.setAttribute('data-text', val); // Para el pseudo-elemento
              
              const checkbox = document.createElement('input');
              checkbox.type = 'checkbox';
              checkbox.value = val;
              checkbox.checked = selectedSet.has(val);
              checkbox.setAttribute('style', 'accent-color: #6b7280 !important;');
              
              const span = document.createElement('span');
              span.textContent = val; // USAR textContent DIRECTAMENTE
              span.setAttribute('style', 'color: #000000 !important; text-shadow: none !important; background: transparent !important; font-size: 0.9rem !important; opacity: 1 !important; visibility: visible !important; display: inline !important;');
              
              label.appendChild(checkbox);
              label.appendChild(span);
              checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                  selectedSet.add(val);
                } else {
                  selectedSet.delete(val);
                }
                setModuleFilterValues({ ...getModuleFilterValues(), [selectedColumn]: Array.from(selectedSet) });
                setModuleActiveFilters({ ...getModuleActiveFilters(), [selectedColumn]: type });
                filterDiv.classList.toggle('active', selectedSet.size > 0);
                updateActiveFiltersSummary();
                updateInputSummary();
              });
              

              
              list.appendChild(label);
            });
            dropdown.appendChild(list);
            
            // Los estilos se aplican automáticamente via CSS
          }
          
          // FORZAR ESTILOS SOLO CUANDO SEA NECESARIO (eliminado setInterval problemático)
          
          const handleInput = debounce(() => {
            const term = input.value.trim().toLowerCase();
            lastFilterTerm = term;
            renderCheckboxList(term);
            dropdown.classList.remove('hidden');
          }, 200);
          input.addEventListener('input', handleInput);
          input.addEventListener('focus', () => {
            renderCheckboxList(lastFilterTerm);
            dropdown.classList.remove('hidden');
            
            // Los estilos del modal se manejan via CSS
          });
          // Evita que el dropdown se cierre al marcar checkboxes
          // input.addEventListener('blur', () => {
          //   setTimeout(() => dropdown.classList.add('hidden'), 200);
          // });
          // Nueva lógica: solo cerrar si el foco realmente sale del dropdown
          input.addEventListener('blur', (e) => {
            setTimeout(() => {
              // Si el foco está dentro del dropdown, no cerrar
              if (!dropdown.contains(document.activeElement)) {
                dropdown.classList.add('hidden');
              }
            }, 200);
          });
          selectAllBtn.addEventListener('click', () => {
            filteredValues.forEach(val => {
              if (val !== '') selectedSet.add(val);
            });
            setModuleFilterValues({ ...getModuleFilterValues(), [selectedColumn]: Array.from(selectedSet) });
            filterDiv.classList.add('active');
            renderCheckboxList();
            updateActiveFiltersSummary();
            applyFilters();
            updateInputSummary();
          });
          clearAllBtn.addEventListener('click', () => {
            selectedSet.clear();
            const updated = { ...getModuleFilterValues() };
            delete updated[selectedColumn];
            setModuleFilterValues(updated);
            filterDiv.classList.remove('active');
            renderCheckboxList();
            updateActiveFiltersSummary();
            applyFilters();
            updateInputSummary();
          });
          function updateInputSummary() {
            const selected = Array.from(selectedSet).filter(v => v !== '__EMPTY__' && v !== '__NO_EMPTY__');
            const isExcludeMode = getModuleFilterExclude()[selectedColumn] || false;
            let summary = '';
            
            if (selectedSet.has('__EMPTY__') && selectedSet.has('__NO_EMPTY__')) {
              summary = '(Empty), (No Empty)';
            } else if (selectedSet.has('__EMPTY__')) {
              summary = '(Empty)';
            } else if (selectedSet.has('__NO_EMPTY__')) {
              summary = '(No Empty)';
            } else if (selected.length === 0) {
              summary = '';
            } else if (selected.length <= 2) {
              summary = selected.join(', ');
            } else {
              summary = `${selected.length} selected`;
            }
            
            // Agregar indicador de modo exclusión
            if (isExcludeMode && summary) {
              input.value = `Exclude: ${summary}`;
            } else {
              input.value = summary;
            }
          }
          if (Array.isArray(getModuleFilterValues()[selectedColumn])) {
            selectedSet = new Set(getModuleFilterValues()[selectedColumn]);
            updateInputSummary();
          }
          filterDiv.appendChild(dropdownWrapper);
        }
        filterGrid.appendChild(filterDiv);
      });

      // Filtrado visual de los bloques según el buscador
      input.addEventListener('input', () => {
        const term = input.value.trim().toLowerCase();
        filterGrid.querySelectorAll('.filter-item').forEach(div => {
          const col = div.dataset.column.toLowerCase();
          div.style.display = col.includes(term) ? '' : 'none';
        });
      });
    });

    // Setup tabs after generating content
    function setupUnifiedTabs() {
      const tabs = document.querySelectorAll('.filter-tab');
      const panels = document.querySelectorAll('.filter-panel');
      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          tabs.forEach(t => t.classList.remove('active'));
          panels.forEach(p => p.classList.remove('active'));
          tab.classList.add('active');
          const targetPanel = document.getElementById(tab.dataset.target + 'FilterPanel');
          if (targetPanel) {
            targetPanel.classList.add('active');
            // Renderiza solo el contenido del panel activo
            if (targetPanel.id === 'myfiltersFilterPanel') {
              renderMyFiltersSection();
            }
          }
        });
      });
      // Activa solo la primera pestaña y panel por defecto
      const firstTab = tabs[0];
      const firstPanel = panels[0];
      if (firstTab && firstPanel) {
        tabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));
        firstTab.classList.add('active');
        firstPanel.classList.add('active');
        if (firstPanel.id === 'myfiltersFilterPanel') {
          renderMyFiltersSection();
        }
      }
    }
    setupUnifiedTabs();

    // Elimina la pestaña y panel de Reference si existen
    if (referenceContainer) referenceContainer.remove();
    const referenceTab = document.querySelector('.filter-tab[data-target="reference"]');
    if (referenceTab) referenceTab.remove();

    // --- Update summary function ---
    function updateActiveFiltersSummary() {
      const list = document.getElementById('globalActiveFiltersSummary');
      if (!list) return;
      list.innerHTML = '';
      const filterValues = getModuleFilterValues();
      if (Object.keys(filterValues).length === 0) {
        // Hide the container completely when empty
        list.style.display = 'none';
        list.style.padding = '0';
        list.style.margin = '0';
        list.style.height = '0';
        list.style.minHeight = '0';
        return;
      } else {
        // Show the container when there are filters
        list.style.display = '';
        list.style.padding = '';
        list.style.margin = '';
        list.style.height = '';
        list.style.minHeight = '';
      }
      // Group filters by type
      const dateFilters = {};
      const otherFilters = {};
      Object.entries(filterValues).forEach(([key, value]) => {
        if (key.endsWith('_start') || key.endsWith('_end') || key.endsWith('_empty')) {
          const baseKey = key.replace(/_(start|end|empty)$/, '');
          if (!dateFilters[baseKey]) {
            dateFilters[baseKey] = { start: '', end: '', empty: false };
          }
          if (key.endsWith('_start')) dateFilters[baseKey].start = value;
          if (key.endsWith('_end')) dateFilters[baseKey].end = value;
          if (key.endsWith('_empty')) dateFilters[baseKey].empty = value;
        } else {
          otherFilters[key] = value;
        }
      });
      // Add date filters
      Object.entries(dateFilters).forEach(([column, filter]) => {
        if (filter.start || filter.end || filter.empty) {
          const chip = document.createElement('div');
          chip.className = 'filter-chip-new';
          let text = `${column}: `;
          if (filter.empty && !filter.start && !filter.end) {
            text += '(empty)';
          } else {
            if (filter.start) text += `from ${prettyDynamicDate(filter.start)}`;
            if (filter.end) text += ` to ${prettyDynamicDate(filter.end)}`;
            if (filter.empty) text += ' (including empty)';
          }
          chip.innerHTML = `
            <div class="filter-chip-content">
              <span class="filter-chip-label">${column}</span>
              <span class="filter-chip-value">${text.replace(`${column}: `, '')}</span>
            </div>
            <svg class="filter-chip-close" data-column="${column}" aria-label="Remove filter" width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7.5 2.5L2.5 7.5M2.5 2.5L7.5 7.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          `;
          list.appendChild(chip);
        }
      });
      // Add other filters
      const filterExclude = getModuleFilterExclude();
      Object.entries(otherFilters).forEach(([column, values]) => {
        if (Array.isArray(values) && values.length > 0) {
          const chip = document.createElement('div');
          const isExcludeMode = filterExclude[column] || false;
          chip.className = isExcludeMode ? 'filter-chip-new filter-chip-exclude' : 'filter-chip-new';
          
          // Formatear valores para display (remover __EMPTY__ y __NO_EMPTY__)
          const displayValues = values.filter(v => v !== '__EMPTY__' && v !== '__NO_EMPTY__');
          const hasEmpty = values.includes('__EMPTY__');
          const hasNoEmpty = values.includes('__NO_EMPTY__');
          
          // Construir la lista de valores para display
          const valueParts = [];
          if (hasEmpty) valueParts.push('(Empty)');
          if (hasNoEmpty) valueParts.push('(No Empty)');
          if (displayValues.length > 0) {
            if (displayValues.length <= 3) {
              valueParts.push(...displayValues);
            } else {
              valueParts.push(`${displayValues.length} values`);
            }
          }
          
          const valueText = valueParts.join(', ');
          
          // Construir tooltip con todos los valores
          const tooltipParts = [];
          if (hasEmpty) tooltipParts.push('(Empty)');
          if (hasNoEmpty) tooltipParts.push('(No Empty)');
          if (displayValues.length > 0) {
            tooltipParts.push(...displayValues);
          }
          const tooltipText = tooltipParts.length > 0 ? `${column}: ${tooltipParts.join(', ')}` : column;
          
          // Agregar tooltip solo si hay múltiples valores o si el texto es diferente
          if (displayValues.length > 3 || valueText !== tooltipParts.join(', ')) {
            chip.setAttribute('title', tooltipText);
          }
          
          // Agregar "NO" al label si está en modo exclusión
          const labelText = isExcludeMode ? `NO ${column}` : column;
          
          chip.innerHTML = `
            <div class="filter-chip-content">
              <span class="filter-chip-label">${labelText}</span>
              <span class="filter-chip-value">${valueText}</span>
            </div>
            <svg class="filter-chip-close" data-column="${column}" aria-label="Remove filter" width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7.5 2.5L2.5 7.5M2.5 2.5L7.5 7.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          `;
          list.appendChild(chip);
        }
      });
      // Add remove functionality to chips
      list.querySelectorAll('.filter-chip-close').forEach(btn => {
        btn.addEventListener('click', () => {
          const column = btn.dataset.column;
            const updated = { ...getModuleFilterValues() };
          // Eliminar todos los valores posibles del filtro
            delete updated[`${column}_start`];
            delete updated[`${column}_end`];
            delete updated[`${column}_empty`];
          delete updated[column];
            setModuleFilterValues(updated);
          // Eliminar de activeFilters SIEMPRE
          const activeFilters = { ...getModuleActiveFilters() };
          delete activeFilters[column];
          setModuleActiveFilters(activeFilters);
          // Limpiar inputs visuales
            const filterItem = document.querySelector(`.filter-item[data-column="${column}"]`);
            if (filterItem) {
              filterItem.querySelectorAll('input[type="date"]').forEach(input => input.value = '');
              filterItem.querySelectorAll('.filter-checkbox').forEach(checkbox => checkbox.checked = false);
            filterItem.classList.remove('active');
          }
          // Refuerzo: renderizar chips y lista tras limpiar el estado
          renderActiveFiltersList();
          renderActiveFiltersSummaryChips();
          updateActiveFiltersSummary();
          applyFilters();
        });
      });
    }

    // Call updateActiveFiltersSummary after each filter change
    window.updateActiveFiltersSummary = updateActiveFiltersSummary;
    updateActiveFiltersSummary();

    // --- Hash simple para cabeceras (igual que en ColumnManager) ---
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

    // --- Guardar y cargar filtros ---
    function saveMyFilter(name, urgencyCard) {
  const headers = Object.keys(getOriginalData()[0] || {});
  const headerHash = getHeaderHash(headers);
  const filters = loadMyFilters();
  
  // Guardar todos los estados: valores, exclude y comparaciones
  const filterExclude = { ...getModuleFilterExclude() };
  const fieldComparisons = { ...getModuleFieldComparisons() };
  
  // Asegurar que se guardan correctamente (crear copias profundas)
  const savedExclude = {};
  Object.keys(filterExclude).forEach(key => {
    savedExclude[key] = filterExclude[key];
  });
  
  const savedComparisons = {};
  Object.keys(fieldComparisons).forEach(key => {
    savedComparisons[key] = { ...fieldComparisons[key] };
  });
  
  // Detectar el hub actual
  const hubType = typeof window.getCurrentHubType === 'function' ? window.getCurrentHubType() : 'ops';
  
  filters[name] = { 
    filterValues: { ...getModuleFilterValues() }, 
    filterExclude: savedExclude,
    fieldComparisons: savedComparisons,
    headerHash, 
    headers, 
    linkedUrgencyCard: urgencyCard,
    hubType: hubType
  };
  
  console.log('💾 Saving filter:', name);
  console.log('📋 Filter values:', filters[name].filterValues);
  console.log('🚫 Filter exclude:', filters[name].filterExclude);
  console.log('🔄 Field comparisons:', filters[name].fieldComparisons);
  
  localStorage.setItem('myFilters', JSON.stringify(filters));
  
  // Trigger auto-save
  if (typeof window.triggerAutoSave === 'function') {
    window.triggerAutoSave();
  }
  
  // Show notification
  if (typeof window.showUnifiedNotification === 'function') {
    window.showUnifiedNotification(`Filter "${name}" saved successfully!`, 'success');
  }
}
    function loadMyFilters() {
      try {
        const saved = localStorage.getItem('myFilters');
        return saved ? JSON.parse(saved) : {};
      } catch {
        return {};
      }
    }
    function deleteMyFilter(name) {
  const filters = loadMyFilters();
  delete filters[name];
  localStorage.setItem('myFilters', JSON.stringify(filters));
  
  // Trigger auto-save
  if (typeof window.triggerAutoSave === 'function') {
    window.triggerAutoSave();
  }
  
  // Show notification
  if (typeof window.showUnifiedNotification === 'function') {
    window.showUnifiedNotification(`Filter "${name}" deleted successfully!`, 'success');
  }
}
    function applyMyFilter(name) {
      const filters = loadMyFilters();
      const headers = Object.keys(getOriginalData()[0] || {});
      const headerHash = getHeaderHash(headers);
      const filterObj = filters[name];
      if (!filterObj) {
        if (typeof window.showUnifiedNotification === 'function') {
          window.showUnifiedNotification(`Filter "${name}" not found!`, 'error');
        }
        return;
      }
      // Check if current headers match the saved filter's headers (not just hash)
      const savedHeaders = filterObj.headers || [];
      const sameColumns = headers.length === savedHeaders.length && headers.every((col, i) => col === savedHeaders[i]);
      if (!sameColumns) {
        if (typeof window.showUnifiedNotification === 'function') {
          window.showUnifiedNotification(`This filter "${name}" cannot be applied to the current CSV.`, 'error');
        }
        return;
      }
      if (filterObj.headerHash === headerHash) {
        setModuleFilterValues({ ...filterObj.filterValues });
        // Restaurar estado de exclusión si existe
        if (filterObj.filterExclude) {
          setModuleFilterExclude({ ...filterObj.filterExclude });
        } else {
          setModuleFilterExclude({});
        }
        // Restaurar comparaciones de campos si existen
        if (filterObj.fieldComparisons) {
          setModuleFieldComparisons({ ...filterObj.fieldComparisons });
        } else {
          setModuleFieldComparisons({});
        }
        // Reconstruct activeFilters from filterValues
        const newActiveFilters = {};
        for (const key of Object.keys(filterObj.filterValues)) {
          if (key.endsWith('_start') || key.endsWith('_end') || key.endsWith('_empty')) {
            const base = key.replace(/_(start|end|empty)$/, '');
            newActiveFilters[base] = 'date';
          } else if (Array.isArray(filterObj.filterValues[key])) {
            newActiveFilters[key] = 'categorical';
          } else {
            newActiveFilters[key] = 'text';
          }
        }
        setModuleActiveFilters(newActiveFilters);
        generateFilterSidebar(headers);
        
        // Restaurar estados visuales después de regenerar el sidebar
        setTimeout(() => {
          // Restaurar comparaciones de campos
          if (filterObj.fieldComparisons) {
            Object.entries(filterObj.fieldComparisons).forEach(([column, comparison]) => {
              const filterDiv = document.querySelector(`[data-column="${column}"]`);
              if (filterDiv) {
                const compareSection = filterDiv.querySelector('.filter-compare-section');
                const toggleBtn = compareSection?.querySelector('button');
                const compareFieldSelect = compareSection?.querySelector('select:first-of-type');
                const operatorSelect = compareSection?.querySelector('select:last-of-type');
                
                if (compareSection && toggleBtn) {
                  compareSection.style.display = 'block';
                  toggleBtn.textContent = 'Hide';
                  toggleBtn.style.background = 'rgba(239, 68, 68, 0.1)';
                  toggleBtn.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                  toggleBtn.style.color = '#ef4444';
                  
                  if (compareFieldSelect) compareFieldSelect.value = comparison.compareColumn || '';
                  if (operatorSelect) operatorSelect.value = comparison.operator || '';
                }
              }
            });
          }
          
          // Restaurar estados visuales de exclude y empty/no empty
          if (filterObj.filterExclude) {
            Object.entries(filterObj.filterExclude).forEach(([column, isExcluded]) => {
              if (isExcluded) {
                const filterDiv = document.querySelector(`[data-column="${column}"]`);
                if (filterDiv) {
                  // Restaurar botón de exclude
                  const excludeBtn = filterDiv.querySelector('.exclude-toggle-btn');
                  if (excludeBtn) {
                    excludeBtn.classList.add('active');
                    const checkIndicator = excludeBtn.querySelector('.check-indicator');
                    if (checkIndicator) {
                      checkIndicator.style.display = 'inline-block';
                      checkIndicator.style.background = '#47B2E5';
                      checkIndicator.style.borderColor = '#47B2E5';
                    }
                    excludeBtn.style.background = 'rgba(71, 178, 229, 0.3)';
                    excludeBtn.style.borderColor = 'rgba(71, 178, 229, 0.5)';
                    excludeBtn.style.color = '#1a202c';
                  }
                  
                  // Actualizar el input con el prefijo "Exclude: " si es un filtro categórico
                  const input = filterDiv.querySelector('.filter-input');
                  if (input) {
                    const filterValues = getModuleFilterValues();
                    const columnValue = filterValues[column];
                    if (Array.isArray(columnValue)) {
                      const selected = columnValue.filter(v => v !== '__EMPTY__' && v !== '__NO_EMPTY__');
                      let summary = '';
                      if (columnValue.includes('__EMPTY__') && columnValue.includes('__NO_EMPTY__')) {
                        summary = '(Empty), (No Empty)';
                      } else if (columnValue.includes('__EMPTY__')) {
                        summary = '(Empty)';
                      } else if (columnValue.includes('__NO_EMPTY__')) {
                        summary = '(No Empty)';
                      } else if (selected.length === 0) {
                        summary = '';
                      } else if (selected.length <= 2) {
                        summary = selected.join(', ');
                      } else {
                        summary = `${selected.length} selected`;
                      }
                      input.value = summary ? `Exclude: ${summary}` : '';
                    } else if (columnValue && !input.value.startsWith('Exclude: ')) {
                      input.value = 'Exclude: ' + (input.value || columnValue);
                    }
                  }
                }
              }
            });
          }
          
          // Restaurar estados de Empty/No Empty
          Object.entries(filterObj.filterValues).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              const column = key;
              const filterDiv = document.querySelector(`[data-column="${column}"]`);
              if (filterDiv) {
                const hasEmpty = value.includes('__EMPTY__');
                const hasNoEmpty = value.includes('__NO_EMPTY__');
                
                if (hasEmpty) {
                  const emptyBtn = filterDiv.querySelector('.empty-toggle-btn');
                  if (emptyBtn && emptyBtn.textContent.includes('Empty')) {
                    emptyBtn.classList.add('active');
                    const checkIndicator = emptyBtn.querySelector('.check-indicator');
                    if (checkIndicator) {
                      checkIndicator.style.display = 'inline-block';
                      checkIndicator.style.background = '#47B2E5';
                      checkIndicator.style.borderColor = '#47B2E5';
                    }
                    emptyBtn.style.background = 'rgba(71, 178, 229, 0.3)';
                    emptyBtn.style.borderColor = 'rgba(71, 178, 229, 0.5)';
                    emptyBtn.style.color = '#1a202c';
                  }
                }
                
                if (hasNoEmpty) {
                  const noEmptyBtn = filterDiv.querySelector('.empty-toggle-btn');
                  if (noEmptyBtn && noEmptyBtn.textContent.includes('No Empty')) {
                    noEmptyBtn.classList.add('active');
                    const checkIndicator = noEmptyBtn.querySelector('.check-indicator');
                    if (checkIndicator) {
                      checkIndicator.style.display = 'inline-block';
                      checkIndicator.style.background = '#47B2E5';
                      checkIndicator.style.borderColor = '#47B2E5';
                    }
                    noEmptyBtn.style.background = 'rgba(71, 178, 229, 0.3)';
                    noEmptyBtn.style.borderColor = 'rgba(71, 178, 229, 0.5)';
                    noEmptyBtn.style.color = '#1a202c';
                  }
                }
              }
            }
          });
        }, 150);
        
        // Forzar que la pestaña y panel de My Filters estén activos
        const myFiltersTab = document.querySelector('.filter-tab[data-target="myfilters"]');
        const myFiltersPanel = document.getElementById('myfiltersFilterPanel');
        if (myFiltersTab && myFiltersPanel) {
          document.querySelectorAll('.filter-panel').forEach(p => p.classList.remove('active'));
          document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
          myFiltersTab.classList.add('active');
          myFiltersPanel.classList.add('active');
        }
        applyFilters();
        renderActiveFiltersSummaryChips();
        
        // Show notification
        if (typeof window.showUnifiedNotification === 'function') {
          window.showUnifiedNotification(`Filter "${name}" applied successfully!`, 'success');
        }
      } else {
        if (typeof window.showUnifiedNotification === 'function') {
          window.showUnifiedNotification(`This filter "${name}" cannot be applied to the current CSV.`, 'error');
        }
      }
    }

    // --- Renderiza la sección My Filters en el panel de filtros ---
    function renderMyFiltersSection() {
      let section = document.getElementById('myFiltersSection');
      if (!section) {
        section = document.createElement('div');
        section.id = 'myFiltersSection';
        section.className = 'my-filters-section';
        // SOLO insertar en el panel correcto
        const myFiltersPanel = document.getElementById('myfiltersFilterPanel');
        if (myFiltersPanel) myFiltersPanel.appendChild(section);
      }
      section.innerHTML = '<div class="my-filters-title">My Filters</div>';
      const filters = loadMyFilters();
      console.log('🎨 Rendering My Filters with new design. Total filters:', Object.keys(filters).length);
      const headers = Object.keys(getOriginalData()[0] || {});
      const headerHash = getHeaderHash(headers);
      
      // Definir colores de hubs y orden (sin Operations)
      const hubConfig = {
        'dq': { 
          color: '139, 92, 246', 
          name: 'Data Quality', 
          order: 1,
          bgColor: 'rgba(139, 92, 246, 0.15)',
          borderColor: 'rgba(139, 92, 246, 0.5)',
          textColor: 'rgb(139, 92, 246)'
        },
        'orders': { 
          color: '16, 185, 129', 
          name: 'Orders', 
          order: 2,
          bgColor: 'rgba(16, 185, 129, 0.15)',
          borderColor: 'rgba(16, 185, 129, 0.5)',
          textColor: 'rgb(16, 185, 129)'
        },
        'booking': { 
          color: '245, 158, 11', 
          name: 'Booking', 
          order: 3,
          bgColor: 'rgba(245, 158, 11, 0.15)',
          borderColor: 'rgba(245, 158, 11, 0.5)',
          textColor: 'rgb(245, 158, 11)'
        }
      };
      
      // Separar filtros por hub y generales (ops)
      const hubFilters = Object.entries(filters).filter(([name, obj]) => {
        const hubType = obj.hubType || 'ops';
        return hubType !== 'ops' && hubConfig[hubType];
      });
      
      const generalFilters = Object.entries(filters).filter(([name, obj]) => {
        const hubType = obj.hubType || 'ops';
        return hubType === 'ops' || !hubConfig[hubType];
      });
      
      // Ordenar filtros de hubs
      const sortedHubFilters = hubFilters.sort(([nameA, objA], [nameB, objB]) => {
        const hubA = objA.hubType || 'ops';
        const hubB = objB.hubType || 'ops';
        const orderA = hubConfig[hubA]?.order || 99;
        const orderB = hubConfig[hubB]?.order || 99;
        if (orderA !== orderB) return orderA - orderB;
        return nameA.localeCompare(nameB);
      });
      
      // Ordenar filtros generales
      const sortedGeneralFilters = generalFilters.sort(([nameA], [nameB]) => {
        return nameA.localeCompare(nameB);
      });
      
      // Combinar: primero los de hubs, luego los generales
      const sortedFilters = [...sortedHubFilters, ...sortedGeneralFilters];
      
      const list = document.createElement('div');
      list.className = 'my-filters-list';
      let hasAny = false;
      let currentHub = null;
      
      sortedFilters.forEach(([name, obj]) => {
        hasAny = true;
        const hubType = obj.hubType || 'ops';
        const isGeneral = hubType === 'ops' || !hubConfig[hubType];
        const hub = isGeneral ? null : (hubConfig[hubType] || null);
        console.log(`🎨 Rendering filter "${name}" with hubType: ${hubType}, isGeneral: ${isGeneral}`);
        
        // Añadir separador de hub si cambió (o separador General si es el primero general)
        const needsSeparator = isGeneral 
          ? (currentHub !== 'general' && generalFilters.length > 0 && sortedHubFilters.length > 0)
          : (currentHub !== hubType);
          
        if (needsSeparator) {
          currentHub = isGeneral ? 'general' : hubType;
          const hubSeparator = document.createElement('div');
          hubSeparator.style.marginTop = list.children.length === 0 ? '0' : '2rem';
          hubSeparator.style.marginBottom = '1rem';
          hubSeparator.style.padding = '0.75rem 1rem';
          
          if (isGeneral) {
            // Separador para filtros generales
            hubSeparator.style.background = 'rgba(100, 116, 139, 0.12)';
            hubSeparator.style.border = '2px solid rgba(100, 116, 139, 0.3)';
            hubSeparator.style.color = 'rgb(100, 116, 139)';
            hubSeparator.textContent = 'General';
          } else {
            hubSeparator.style.background = hub.bgColor;
            hubSeparator.style.border = `2px solid ${hub.borderColor}`;
            hubSeparator.style.color = hub.textColor;
            hubSeparator.textContent = hub.name;
          }
          
          hubSeparator.style.borderRadius = '8px';
          hubSeparator.style.fontSize = '0.8rem';
          hubSeparator.style.fontWeight = '700';
          hubSeparator.style.textTransform = 'uppercase';
          hubSeparator.style.letterSpacing = '1px';
          if (!isGeneral) {
            hubSeparator.style.boxShadow = `0 2px 4px rgba(${hub.color}, 0.2)`;
          }
          list.appendChild(hubSeparator);
        }
        
        const item = document.createElement('div');
        item.className = 'my-filter-item';
        
        // Verificar si tiene exclude activo
        const hasExclude = obj.filterExclude && Object.keys(obj.filterExclude).length > 0;
        // Verificar si tiene comparación activa
        const hasComparison = obj.fieldComparisons && Object.keys(obj.fieldComparisons).length > 0;
        
        // Determinar colores según tipo de filtro (más distintivos)
        let borderColor, bgColor, hoverBorderColor, labelColor;
        if (hasExclude) {
          // Rojo para exclude - más intenso
          borderColor = 'rgba(239, 68, 68, 0.6)';
          bgColor = 'rgba(239, 68, 68, 0.12)';
          hoverBorderColor = 'rgba(239, 68, 68, 0.8)';
          labelColor = '#dc2626';
        } else if (hasComparison) {
          // Azul para compare - más intenso
          borderColor = 'rgba(37, 99, 235, 0.6)';
          bgColor = 'rgba(37, 99, 235, 0.12)';
          hoverBorderColor = 'rgba(37, 99, 235, 0.8)';
          labelColor = '#2563eb';
        } else if (isGeneral) {
          // Gris para filtros generales
          borderColor = 'rgba(100, 116, 139, 0.3)';
          bgColor = 'rgba(100, 116, 139, 0.08)';
          hoverBorderColor = 'rgba(100, 116, 139, 0.5)';
          labelColor = '#64748b';
        } else {
          // Color del hub - más intenso y distintivo
          borderColor = hub.borderColor;
          bgColor = hub.bgColor;
          hoverBorderColor = `rgba(${hub.color}, 0.7)`;
          labelColor = hub.textColor;
        }
        
        // Estilos mejorados para las cards con colores más distintivos
        item.style.padding = '1.15rem 1.35rem';
        item.style.background = bgColor;
        item.style.border = `3px solid ${borderColor}`;
        item.style.borderRadius = '12px';
        item.style.marginBottom = '1rem';
        item.style.boxShadow = `0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.1)`;
        item.style.transition = 'all 0.25s ease';
        item.style.cursor = 'default';
        
        // Efecto hover sutil
        item.addEventListener('mouseenter', () => {
          item.style.boxShadow = `0 3px 10px rgba(0, 0, 0, 0.1), 0 1px 4px rgba(0, 0, 0, 0.12)`;
        });
        item.addEventListener('mouseleave', () => {
          item.style.boxShadow = `0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.1)`;
        });
        
        if (hasExclude) {
          item.classList.add('has-exclude');
        }
        if (hasComparison) {
          item.classList.add('has-comparison');
        }
        
        // Contenedor principal con mejor estructura
        const contentWrapper = document.createElement('div');
        contentWrapper.style.display = 'flex';
        contentWrapper.style.alignItems = 'center';
        contentWrapper.style.justifyContent = 'space-between';
        contentWrapper.style.width = '100%';
        contentWrapper.style.gap = '1rem';
        
        const leftSection = document.createElement('div');
        leftSection.style.display = 'flex';
        leftSection.style.alignItems = 'center';
        leftSection.style.gap = '0.75rem';
        leftSection.style.flex = '1';
        leftSection.style.minWidth = '0';
        leftSection.style.flexWrap = 'wrap';
        
        const label = document.createElement('span');
        label.textContent = name;
        label.className = 'my-filter-name';
        label.style.fontWeight = '600';
        label.style.color = labelColor || '#1a202c';
        label.style.fontSize = '0.95rem';
        label.style.letterSpacing = '0.2px';
        leftSection.appendChild(label);
        
        // Badge del hub (si no es exclude ni compare) - más visible
        if (!hasExclude && !hasComparison && !isGeneral) {
          const hubBadge = document.createElement('span');
          hubBadge.textContent = hub.name.toUpperCase();
          hubBadge.style.fontSize = '0.7rem';
          hubBadge.style.color = hub.textColor;
          hubBadge.style.background = `rgba(${hub.color}, 0.2)`;
          hubBadge.style.padding = '0.4rem 0.75rem';
          hubBadge.style.borderRadius = '6px';
          hubBadge.style.fontWeight = '700';
          hubBadge.style.textTransform = 'uppercase';
          hubBadge.style.letterSpacing = '0.8px';
          hubBadge.style.border = `2px solid ${hub.borderColor}`;
          hubBadge.style.boxShadow = `0 1px 3px rgba(${hub.color}, 0.3)`;
          hubBadge.title = `Saved in ${hub.name} hub`;
          leftSection.appendChild(hubBadge);
        }
        
        // Indicador de exclude mejorado
        if (hasExclude) {
          const excludeBadge = document.createElement('span');
          excludeBadge.textContent = 'EXCLUDE';
          excludeBadge.style.fontSize = '0.65rem';
          excludeBadge.style.color = '#dc2626';
          excludeBadge.style.background = 'rgba(239, 68, 68, 0.12)';
          excludeBadge.style.padding = '0.3rem 0.65rem';
          excludeBadge.style.borderRadius = '4px';
          excludeBadge.style.fontWeight = '700';
          excludeBadge.style.textTransform = 'uppercase';
          excludeBadge.style.letterSpacing = '0.8px';
          excludeBadge.style.border = '1px solid rgba(239, 68, 68, 0.2)';
          excludeBadge.title = 'This filter uses Exclude mode. Use Reset Filters after applying to see other filters.';
          leftSection.appendChild(excludeBadge);
        }
        
        // Indicador de comparación
        if (hasComparison) {
          const comparisonBadge = document.createElement('span');
          comparisonBadge.textContent = 'COMPARE';
          comparisonBadge.style.fontSize = '0.65rem';
          comparisonBadge.style.color = '#2563eb';
          comparisonBadge.style.background = 'rgba(37, 99, 235, 0.12)';
          comparisonBadge.style.padding = '0.3rem 0.65rem';
          comparisonBadge.style.borderRadius = '4px';
          comparisonBadge.style.fontWeight = '700';
          comparisonBadge.style.textTransform = 'uppercase';
          comparisonBadge.style.letterSpacing = '0.8px';
          comparisonBadge.style.border = '1px solid rgba(37, 99, 235, 0.2)';
          comparisonBadge.title = 'This filter uses Compare mode. Use Reset Filters after applying to see other filters.';
          
          leftSection.appendChild(comparisonBadge);
        }
        
        const rightSection = document.createElement('div');
        rightSection.style.display = 'flex';
        rightSection.style.alignItems = 'center';
        rightSection.style.gap = '0.5rem';
        rightSection.style.flexShrink = '0';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.className = 'my-filter-delete-btn';
        deleteBtn.style.padding = '0.5rem 1rem';
        deleteBtn.style.fontSize = '0.85rem';
        deleteBtn.style.borderRadius = '6px';
        deleteBtn.style.border = '1px solid rgba(0, 0, 0, 0.15)';
        deleteBtn.style.background = 'transparent';
        deleteBtn.style.color = '#64748b';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.style.transition = 'all 0.2s';
        deleteBtn.addEventListener('mouseenter', () => {
          deleteBtn.style.background = 'rgba(239, 68, 68, 0.1)';
          deleteBtn.style.borderColor = 'rgba(239, 68, 68, 0.3)';
          deleteBtn.style.color = '#dc2626';
        });
        deleteBtn.addEventListener('mouseleave', () => {
          deleteBtn.style.background = 'transparent';
          deleteBtn.style.borderColor = 'rgba(0, 0, 0, 0.15)';
          deleteBtn.style.color = '#64748b';
        });
        deleteBtn.addEventListener('click', () => {
          const tooltip = document.getElementById('myFilterTooltip');
          if (tooltip) tooltip.remove();
          deleteMyFilter(name);
          renderMyFiltersSection();
        });
        
        const applyBtn = document.createElement('button');
        applyBtn.textContent = 'Apply';
        applyBtn.className = 'my-filter-apply-btn';
        applyBtn.style.padding = '0.5rem 1.25rem';
        applyBtn.style.fontSize = '0.85rem';
        applyBtn.style.borderRadius = '6px';
        applyBtn.style.border = '1px solid rgba(71, 178, 229, 0.3)';
        applyBtn.style.background = 'rgba(71, 178, 229, 0.1)';
        applyBtn.style.color = '#47B2E5';
        applyBtn.style.cursor = 'pointer';
        applyBtn.style.fontWeight = '600';
        applyBtn.style.transition = 'all 0.2s';
        applyBtn.addEventListener('mouseenter', () => {
          applyBtn.style.background = 'rgba(71, 178, 229, 0.2)';
          applyBtn.style.borderColor = 'rgba(71, 178, 229, 0.5)';
        });
        applyBtn.addEventListener('mouseleave', () => {
          applyBtn.style.background = 'rgba(71, 178, 229, 0.1)';
          applyBtn.style.borderColor = 'rgba(71, 178, 229, 0.3)';
        });
        applyBtn.addEventListener('click', () => applyMyFilter(name));
        
        rightSection.appendChild(deleteBtn);
        rightSection.appendChild(applyBtn);
        
        contentWrapper.appendChild(leftSection);
        contentWrapper.appendChild(rightSection);
        item.appendChild(contentWrapper);
        list.appendChild(item);
      });
      
      // Agregar mensajes informativos si hay filtros con exclude o compare
      const hasExcludeFilters = Object.values(filters).some(obj => 
        obj.filterExclude && Object.keys(obj.filterExclude).length > 0
      );
      const hasCompareFilters = Object.values(filters).some(obj => 
        obj.fieldComparisons && Object.keys(obj.fieldComparisons).length > 0
      );
      
      if (hasExcludeFilters) {
        const infoMsg = document.createElement('div');
        infoMsg.className = 'exclude-info-message';
        infoMsg.style.marginTop = '1rem';
        infoMsg.style.padding = '0.875rem 1rem';
        infoMsg.style.background = 'rgba(239, 68, 68, 0.08)';
        infoMsg.style.border = '1px solid rgba(239, 68, 68, 0.25)';
        infoMsg.style.borderRadius = '8px';
        infoMsg.style.fontSize = '0.875rem';
        infoMsg.style.color = '#dc2626';
        infoMsg.style.lineHeight = '1.5';
        infoMsg.innerHTML = '<strong style="font-weight: 600; display: block; margin-bottom: 0.35rem; color: #991b1b;">Important:</strong><span style="display: block;">After applying a filter with Exclude mode, use "Reset Filters" in the modal to clear it and view other filters.</span>';
        section.appendChild(infoMsg);
      }
      
      if (hasCompareFilters) {
        const infoMsg = document.createElement('div');
        infoMsg.className = 'compare-info-message';
        infoMsg.style.marginTop = hasExcludeFilters ? '0.75rem' : '1rem';
        infoMsg.style.padding = '0.875rem 1rem';
        infoMsg.style.background = 'rgba(37, 99, 235, 0.08)';
        infoMsg.style.border = '1px solid rgba(37, 99, 235, 0.25)';
        infoMsg.style.borderRadius = '8px';
        infoMsg.style.fontSize = '0.875rem';
        infoMsg.style.color = '#2563eb';
        infoMsg.style.lineHeight = '1.5';
        infoMsg.innerHTML = '<strong style="font-weight: 600; display: block; margin-bottom: 0.35rem; color: #1e40af;">Important:</strong><span style="display: block;">After applying a filter with Compare mode, use "Reset Filters" in the modal to clear it and view other filters.</span>';
        section.appendChild(infoMsg);
      }
      if (!hasAny) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'my-filters-empty';
        emptyMsg.textContent = 'No saved filters.';
        list.appendChild(emptyMsg);
      }
      section.appendChild(list);
      
      // Exponer renderMyFiltersSection globalmente para que pueda ser llamada desde otros lugares
      window.renderMyFiltersSection = renderMyFiltersSection;

      // --- Quick Filters Section ---
      const quickFiltersTitle = document.createElement('div');
      quickFiltersTitle.className = 'my-filters-title';
      quickFiltersTitle.style.marginTop = '2rem';
      quickFiltersTitle.textContent = 'Quick Filters';
      section.appendChild(quickFiltersTitle);
      const quickList = document.createElement('div');
      quickList.className = 'my-filters-list';
      const quickFilters = loadQuickFilters();
      console.log('🎨 Rendering Quick Filters with new design. Total filters:', Object.keys(quickFilters).length);
      
      // Separar quick filters por hub y generales (mismo sistema que My Filters)
      const hubQuickFilters = Object.entries(quickFilters).filter(([name, obj]) => {
        const hubType = obj.hubType || 'ops';
        return hubType !== 'ops' && hubConfig[hubType];
      });
      
      const generalQuickFilters = Object.entries(quickFilters).filter(([name, obj]) => {
        const hubType = obj.hubType || 'ops';
        return hubType === 'ops' || !hubConfig[hubType];
      });
      
      const sortedHubQuickFilters = hubQuickFilters.sort(([nameA, objA], [nameB, objB]) => {
        const hubA = objA.hubType || 'ops';
        const hubB = objB.hubType || 'ops';
        const orderA = hubConfig[hubA]?.order || 99;
        const orderB = hubConfig[hubB]?.order || 99;
        if (orderA !== orderB) return orderA - orderB;
        return nameA.localeCompare(nameB);
      });
      
      const sortedGeneralQuickFilters = generalQuickFilters.sort(([nameA], [nameB]) => {
        return nameA.localeCompare(nameB);
      });
      
      const sortedQuickFilters = [...sortedHubQuickFilters, ...sortedGeneralQuickFilters];
      
      let hasQuick = false;
      let currentQuickHub = null;
      
      sortedQuickFilters.forEach(([name, obj]) => {
        hasQuick = true;
        const hubType = obj.hubType || 'ops';
        const isGeneral = hubType === 'ops' || !hubConfig[hubType];
        const hub = isGeneral ? null : (hubConfig[hubType] || null);
        console.log(`🎨 Rendering quick filter "${name}" with hubType: ${hubType}, isGeneral: ${isGeneral}`);
        
        // Añadir separador de hub si cambió (o separador General si es el primero general)
        const needsSeparator = isGeneral 
          ? (currentQuickHub !== 'general' && generalQuickFilters.length > 0 && sortedHubQuickFilters.length > 0)
          : (currentQuickHub !== hubType);
          
        if (needsSeparator) {
          currentQuickHub = isGeneral ? 'general' : hubType;
          const hubSeparator = document.createElement('div');
          hubSeparator.style.marginTop = quickList.children.length === 0 ? '0' : '2rem';
          hubSeparator.style.marginBottom = '1rem';
          hubSeparator.style.padding = '0.75rem 1rem';
          
          if (isGeneral) {
            // Separador para filtros generales
            hubSeparator.style.background = 'rgba(100, 116, 139, 0.12)';
            hubSeparator.style.border = '2px solid rgba(100, 116, 139, 0.3)';
            hubSeparator.style.color = 'rgb(100, 116, 139)';
            hubSeparator.textContent = 'General';
          } else {
            hubSeparator.style.background = hub.bgColor;
            hubSeparator.style.border = `2px solid ${hub.borderColor}`;
            hubSeparator.style.color = hub.textColor;
            hubSeparator.textContent = hub.name;
          }
          
          hubSeparator.style.borderRadius = '8px';
          hubSeparator.style.fontSize = '0.8rem';
          hubSeparator.style.fontWeight = '700';
          hubSeparator.style.textTransform = 'uppercase';
          hubSeparator.style.letterSpacing = '1px';
          if (!isGeneral) {
            hubSeparator.style.boxShadow = `0 2px 4px rgba(${hub.color}, 0.2)`;
          }
          quickList.appendChild(hubSeparator);
        }
        
        const item = document.createElement('div');
        item.className = 'my-filter-item';
        
        // Determinar colores según hub (más intensos y distintivos)
        let borderColor, bgColor, hoverBorderColor, labelColor;
        if (isGeneral) {
          // Gris para filtros generales
          borderColor = 'rgba(100, 116, 139, 0.3)';
          bgColor = 'rgba(100, 116, 139, 0.08)';
          hoverBorderColor = 'rgba(100, 116, 139, 0.5)';
          labelColor = '#64748b';
        } else {
          borderColor = hub.borderColor;
          bgColor = hub.bgColor;
          hoverBorderColor = `rgba(${hub.color}, 0.7)`;
          labelColor = hub.textColor;
        }
        
        // Estilos mejorados para las cards con colores más distintivos
        item.style.padding = '1.15rem 1.35rem';
        item.style.background = bgColor;
        item.style.border = `3px solid ${borderColor}`;
        item.style.borderRadius = '12px';
        item.style.marginBottom = '1rem';
        item.style.boxShadow = `0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.1)`;
        item.style.transition = 'all 0.25s ease';
        item.style.cursor = 'default';
        
        // Efecto hover sutil
        item.addEventListener('mouseenter', () => {
          item.style.boxShadow = `0 3px 10px rgba(0, 0, 0, 0.1), 0 1px 4px rgba(0, 0, 0, 0.12)`;
        });
        item.addEventListener('mouseleave', () => {
          item.style.boxShadow = `0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.1)`;
        });
        
        // Contenedor principal con mejor estructura
        const contentWrapper = document.createElement('div');
        contentWrapper.style.display = 'flex';
        contentWrapper.style.alignItems = 'center';
        contentWrapper.style.justifyContent = 'space-between';
        contentWrapper.style.width = '100%';
        contentWrapper.style.gap = '1rem';
        
        const leftSection = document.createElement('div');
        leftSection.style.display = 'flex';
        leftSection.style.alignItems = 'center';
        leftSection.style.gap = '0.75rem';
        leftSection.style.flex = '1';
        leftSection.style.minWidth = '0';
        leftSection.style.flexWrap = 'wrap';
        
        const label = document.createElement('span');
        label.textContent = name;
        label.className = 'my-filter-name';
        label.style.fontWeight = '600';
        label.style.color = labelColor;
        label.style.fontSize = '0.95rem';
        label.style.letterSpacing = '0.2px';
        leftSection.appendChild(label);
        
        // Badge del hub (solo si no es general) - más visible
        if (!isGeneral) {
          const hubBadge = document.createElement('span');
          hubBadge.textContent = hub.name.toUpperCase();
          hubBadge.style.fontSize = '0.7rem';
          hubBadge.style.color = hub.textColor;
          hubBadge.style.background = `rgba(${hub.color}, 0.2)`;
          hubBadge.style.padding = '0.4rem 0.75rem';
          hubBadge.style.borderRadius = '6px';
          hubBadge.style.fontWeight = '700';
          hubBadge.style.textTransform = 'uppercase';
          hubBadge.style.letterSpacing = '0.8px';
          hubBadge.style.border = `2px solid ${hub.borderColor}`;
          hubBadge.style.boxShadow = `0 1px 3px rgba(${hub.color}, 0.3)`;
          hubBadge.title = `Saved in ${hub.name} hub`;
          leftSection.appendChild(hubBadge);
        }
        
        const rightSection = document.createElement('div');
        rightSection.style.display = 'flex';
        rightSection.style.alignItems = 'center';
        rightSection.style.gap = '0.5rem';
        rightSection.style.flexShrink = '0';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.className = 'my-filter-delete-btn';
        deleteBtn.style.padding = '0.5rem 1rem';
        deleteBtn.style.fontSize = '0.85rem';
        deleteBtn.style.borderRadius = '6px';
        deleteBtn.style.border = '1px solid rgba(0, 0, 0, 0.15)';
        deleteBtn.style.background = 'transparent';
        deleteBtn.style.color = '#64748b';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.style.transition = 'all 0.2s';
        deleteBtn.addEventListener('mouseenter', () => {
          deleteBtn.style.background = 'rgba(239, 68, 68, 0.1)';
          deleteBtn.style.borderColor = 'rgba(239, 68, 68, 0.3)';
          deleteBtn.style.color = '#dc2626';
        });
        deleteBtn.addEventListener('mouseleave', () => {
          deleteBtn.style.background = 'transparent';
          deleteBtn.style.borderColor = 'rgba(0, 0, 0, 0.15)';
          deleteBtn.style.color = '#64748b';
        });
        deleteBtn.addEventListener('click', () => {
          deleteQuickFilter(name);
          renderMyFiltersSection();
        });
        
        const applyBtn = document.createElement('button');
        applyBtn.textContent = 'Apply';
        applyBtn.className = 'my-filter-apply-btn';
        applyBtn.style.padding = '0.5rem 1.25rem';
        applyBtn.style.fontSize = '0.85rem';
        applyBtn.style.borderRadius = '6px';
        applyBtn.style.border = '1px solid rgba(71, 178, 229, 0.3)';
        applyBtn.style.background = 'rgba(71, 178, 229, 0.1)';
        applyBtn.style.color = '#47B2E5';
        applyBtn.style.cursor = 'pointer';
        applyBtn.style.fontWeight = '600';
        applyBtn.style.transition = 'all 0.2s';
        applyBtn.addEventListener('mouseenter', () => {
          applyBtn.style.background = 'rgba(71, 178, 229, 0.2)';
          applyBtn.style.borderColor = 'rgba(71, 178, 229, 0.5)';
        });
        applyBtn.addEventListener('mouseleave', () => {
          applyBtn.style.background = 'rgba(71, 178, 229, 0.1)';
          applyBtn.style.borderColor = 'rgba(71, 178, 229, 0.3)';
        });
        applyBtn.addEventListener('click', () => {
          // Aplica el quick filter directamente
          const quickFilters = loadQuickFilters();
          const filterObj = quickFilters[name];
          if (filterObj) {
            const headers = Object.keys(getOriginalData()[0] || {});
            setModuleFilterValues({ ...filterObj.filterValues });
            // Restaurar estado de exclusión si existe (aunque no debería haber exclude en quick filters)
            if (filterObj.filterExclude) {
              setModuleFilterExclude({ ...filterObj.filterExclude });
            } else {
              setModuleFilterExclude({});
            }
            // Limpiar comparaciones de campos (quick filters no deberían tener comparaciones)
            setModuleFieldComparisons({});
            
            // Reconstruir activeFilters
            const newActiveFilters = {};
            for (const key of Object.keys(filterObj.filterValues)) {
              if (key.endsWith('_start') || key.endsWith('_end') || key.endsWith('_empty')) {
                const base = key.replace(/_(start|end|empty)$/, '');
                newActiveFilters[base] = 'date';
              } else if (Array.isArray(filterObj.filterValues[key])) {
                newActiveFilters[key] = 'categorical';
              } else {
                newActiveFilters[key] = 'text';
              }
            }
            setModuleActiveFilters(newActiveFilters);
            generateFilterSidebar(headers);
            
            // Restaurar estados visuales después de regenerar el sidebar
            setTimeout(() => {
              // Restaurar estados visuales de exclude y empty/no empty si existen
              if (filterObj.filterExclude) {
                Object.entries(filterObj.filterExclude).forEach(([column, isExcluded]) => {
                  if (isExcluded) {
                    const filterDiv = document.querySelector(`[data-column="${column}"]`);
                    if (filterDiv) {
                      const excludeBtn = filterDiv.querySelector('.exclude-toggle-btn');
                      if (excludeBtn) {
                        excludeBtn.classList.add('active');
                        const checkIndicator = excludeBtn.querySelector('.check-indicator');
                        if (checkIndicator) {
                          checkIndicator.style.display = 'inline-block';
                          checkIndicator.style.background = '#47B2E5';
                          checkIndicator.style.borderColor = '#47B2E5';
                        }
                        excludeBtn.style.background = 'rgba(71, 178, 229, 0.3)';
                        excludeBtn.style.borderColor = 'rgba(71, 178, 229, 0.5)';
                        excludeBtn.style.color = '#1a202c';
                      }
                      
                      // Actualizar el input con el prefijo "Exclude: " si es un filtro categórico
                      const input = filterDiv.querySelector('.filter-input');
                      if (input) {
                        const filterValues = getModuleFilterValues();
                        const columnValue = filterValues[column];
                        if (Array.isArray(columnValue)) {
                          const selected = columnValue.filter(v => v !== '__EMPTY__' && v !== '__NO_EMPTY__');
                          let summary = '';
                          if (columnValue.includes('__EMPTY__') && columnValue.includes('__NO_EMPTY__')) {
                            summary = '(Empty), (No Empty)';
                          } else if (columnValue.includes('__EMPTY__')) {
                            summary = '(Empty)';
                          } else if (columnValue.includes('__NO_EMPTY__')) {
                            summary = '(No Empty)';
                          } else if (selected.length === 0) {
                            summary = '';
                          } else if (selected.length <= 2) {
                            summary = selected.join(', ');
                          } else {
                            summary = `${selected.length} selected`;
                          }
                          input.value = summary ? `Exclude: ${summary}` : '';
                        } else if (columnValue && !input.value.startsWith('Exclude: ')) {
                          input.value = 'Exclude: ' + (input.value || columnValue);
                        }
                      }
                    }
                  }
                });
              }
              
              // Restaurar estados de Empty/No Empty
              Object.entries(filterObj.filterValues).forEach(([key, value]) => {
                if (Array.isArray(value)) {
                  const column = key;
                  const filterDiv = document.querySelector(`[data-column="${column}"]`);
                  if (filterDiv) {
                    const hasEmpty = value.includes('__EMPTY__');
                    const hasNoEmpty = value.includes('__NO_EMPTY__');
                    
                    if (hasEmpty) {
                      const emptyBtn = filterDiv.querySelector('.empty-toggle-btn');
                      if (emptyBtn && emptyBtn.textContent.includes('Empty')) {
                        emptyBtn.classList.add('active');
                        const checkIndicator = emptyBtn.querySelector('.check-indicator');
                        if (checkIndicator) {
                          checkIndicator.style.display = 'inline-block';
                          checkIndicator.style.background = '#47B2E5';
                          checkIndicator.style.borderColor = '#47B2E5';
                        }
                        emptyBtn.style.background = 'rgba(71, 178, 229, 0.3)';
                        emptyBtn.style.borderColor = 'rgba(71, 178, 229, 0.5)';
                        emptyBtn.style.color = '#1a202c';
                      }
                    }
                    
                    if (hasNoEmpty) {
                      const noEmptyBtn = filterDiv.querySelector('.empty-toggle-btn');
                      if (noEmptyBtn && noEmptyBtn.textContent.includes('No Empty')) {
                        noEmptyBtn.classList.add('active');
                        const checkIndicator = noEmptyBtn.querySelector('.check-indicator');
                        if (checkIndicator) {
                          checkIndicator.style.display = 'inline-block';
                          checkIndicator.style.background = '#47B2E5';
                          checkIndicator.style.borderColor = '#47B2E5';
                        }
                        noEmptyBtn.style.background = 'rgba(71, 178, 229, 0.3)';
                        noEmptyBtn.style.borderColor = 'rgba(71, 178, 229, 0.5)';
                        noEmptyBtn.style.color = '#1a202c';
                      }
                    }
                  }
                }
              });
            }, 150);
            
            applyFilters();
            renderActiveFiltersSummaryChips();
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
        });
        
        rightSection.appendChild(deleteBtn);
        rightSection.appendChild(applyBtn);
        
        contentWrapper.appendChild(leftSection);
        contentWrapper.appendChild(rightSection);
        item.appendChild(contentWrapper);
        quickList.appendChild(item);
      });
      if (!hasQuick) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'my-filters-empty';
        emptyMsg.textContent = 'No quick filters saved.';
        quickList.appendChild(emptyMsg);
      }
      section.appendChild(quickList);
    }

    // Cambia el nombre de la pestaña 'Generic' por 'By Ref/Status'
    const genericTab = document.querySelector('.filter-tab[data-target="generic"]');
    if (genericTab) genericTab.textContent = 'By Ref/Status';

    // --- Al final de generateFilterSidebar, fuerza el render de chips ---
    renderActiveFiltersSummaryChips();

    // OCULTAR lista de filtros de abajo si ya se muestran arriba
    try {
      const summaryChips = document.getElementById('activeFiltersSummary');
      const bottomLists = document.querySelectorAll('.active-filters-list');
      if (summaryChips && bottomLists.length > 1) {
        // El primero es el de arriba, el segundo el de abajo
        if (summaryChips.style.display !== 'none') {
          bottomLists[1].style.display = 'none';
        } else {
          bottomLists[1].style.display = '';
        }
      }
    } catch (e) { /* ignore */ }
  } catch (error) {
    console.error('Error generating filter sidebar:', error);
  } finally {
    // Verificar que los filtros se generaron correctamente
    const genericContainer = document.getElementById("genericFilterPanel");
    const dateContainer = document.getElementById("dateFilterPanel");
    const filterItems = document.querySelectorAll('.filter-item');
    
    console.log('🔍 Filter generation verification:', {
      genericContainer: !!genericContainer,
      dateContainer: !!dateContainer,
      filterItemsCount: filterItems.length,
      genericItems: genericContainer ? genericContainer.querySelectorAll('.filter-item').length : 0,
      dateItems: dateContainer ? dateContainer.querySelectorAll('.filter-item').length : 0
    });
    
    // Resetear la bandera al finalizar
    isGenerating = false;
  }
}

// Función robusta para parsear fechas en múltiples formatos
function parseFlexibleDate(value) {
  if (!value || typeof value !== "string") return null;

  // Si es un número puro de 1 a 3 dígitos, nunca es fecha
  if (/^\d{1,3}$/.test(value.trim())) return null;

  // Año completo (YYYY)
  const yearOnly = value.match(/^(\d{4})$/);
  if (yearOnly) {
    return new Date(`${yearOnly[1]}-01-01T00:00:00`);
  }
  // Año y mes (YYYY-MM)
  const yearMonth = value.match(/^(\d{4})-(\d{2})$/);
  if (yearMonth) {
    return new Date(`${yearMonth[1]}-${yearMonth[2]}-01T00:00:00`);
  }
  // dd.mm.yy (formato corto con puntos)
  const shortDateWithDots = value.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
  if (shortDateWithDots) {
    const [, day, month, year] = shortDateWithDots;
    // Asumir que años 00-29 son 2000-2029, años 30-99 son 1930-1999
    const fullYear = parseInt(year) < 30 ? `20${year}` : `19${year}`;
    return new Date(`${fullYear}-${month}-${day}T00:00:00`);
  }
  // dd/mm/yyyy hh:mm:ss o dd-mm-yyyy hh:mm:ss (hora opcional)
  const match = value.match(
    /^(\d{2})[\/-](\d{2})[\/-](\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (match) {
    const [, day, month, year, hours = "00", minutes = "00", seconds = "00"] = match;
    return new Date(`${year}-${month}-${day}T${hours}:${minutes}:${seconds}`);
  }
  // yyyy-mm-dd o yyyy/mm/dd
  const iso = value.match(/^(\d{4})[\/-](\d{2})[\/-](\d{2})$/);
  if (iso) {
    const [, year, month, day] = iso;
    return new Date(`${year}-${month}-${day}T00:00:00`);
  }
  // ISO 8601 fallback
  const parsed = Date.parse(value);
  return isNaN(parsed) ? null : new Date(parsed);
}

function normalizeDate(date) {
  if (!date) return null;
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return d;
}

function normalizeText(val) {
  return (val || "").toString().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").trim();
}

function applyFilters() {
    const data = getOriginalData();
    const moduleActiveFilters = getModuleActiveFilters();
    const moduleFilterValues = getModuleFilterValues();
    const tableActiveFilters = getTableActiveFilters();
    const tableFilterValues = getTableFilterValues();
    const activeFilters = getActiveFilters();
    
    if (!data || !data.length) {
        console.warn('No data available for filtering');
        return [];
    }

    let filteredData = [...data];
    
    // Aplicar comparaciones de campos primero
    const fieldComparisons = getModuleFieldComparisons();
    Object.entries(fieldComparisons).forEach(([column, comparison]) => {
      if (comparison && comparison.compareColumn && comparison.operator) {
        filteredData = filteredData.filter(row => {
          const val1 = row[column];
          const val2 = row[comparison.compareColumn];
          
          // Convertir a string para comparación
          const str1 = val1 != null ? String(val1).toLowerCase().trim() : '';
          const str2 = val2 != null ? String(val2).toLowerCase().trim() : '';
          
          // Intentar convertir a número si ambos son numéricos
          const num1 = !isNaN(val1) && val1 !== '' ? parseFloat(val1) : null;
          const num2 = !isNaN(val2) && val2 !== '' ? parseFloat(val2) : null;
          const bothNumeric = num1 !== null && num2 !== null;
          
          switch (comparison.operator) {
            case 'equals':
              return str1 === str2;
            case 'not_equals':
              return str1 !== str2;
            case 'contains':
              return str1.includes(str2) || str2.includes(str1);
            case 'not_contains':
              return !str1.includes(str2) && !str2.includes(str1);
            case 'starts_with':
              return str1.startsWith(str2) || str2.startsWith(str1);
            case 'ends_with':
              return str1.endsWith(str2) || str2.endsWith(str1);
            case 'greater_than':
              if (bothNumeric) return num1 > num2;
              return str1 > str2;
            case 'less_than':
              if (bothNumeric) return num1 < num2;
              return str1 < str2;
            case 'greater_equal':
              if (bothNumeric) return num1 >= num2;
              return str1 >= str2;
            case 'less_equal':
              if (bothNumeric) return num1 <= num2;
              return str1 <= str2;
            default:
              return true;
          }
        });
      }
    });

    // Aplicar filtros del módulo
    Object.entries(moduleActiveFilters).forEach(([column, filterType]) => {
        if (filterType === 'date') {
            const arr = Array.isArray(moduleFilterValues[column]) ? moduleFilterValues[column] : null;
            const hasRange = moduleFilterValues[`${column}_start`] || moduleFilterValues[`${column}_end`] || moduleFilterValues[`${column}_empty`];
            if (arr && arr.length > 0) {
                // Filtro Excel: solo los valores seleccionados
                filteredData = filteredData.filter(row => arr.includes(row[column]));
                return;
            } else if (hasRange) {
                // Filtro por rango
                let start = resolveDynamicValue(moduleFilterValues[`${column}_start`]);
                let end = resolveDynamicValue(moduleFilterValues[`${column}_end`]);
                if (start && /^\d{4}$/.test(start)) {
                    start = `${start}-01-01`;
                    end = `${moduleFilterValues[`${column}_end`] || start.slice(0,4)}-12-31`;
                } else if (start && /^\d{4}-\d{2}$/.test(start)) {
                    const [y, m] = start.split('-');
                    start = `${y}-${m}-01`;
                    const lastDay = new Date(y, parseInt(m,10), 0).getDate();
                    end = `${y}-${m}-${lastDay}`;
                }
                if (end && /^\d{4}$/.test(end)) {
                    end = `${end}-12-31`;
                } else if (end && /^\d{4}-\d{2}$/.test(end)) {
                    const [y, m] = end.split('-');
                    const lastDay = new Date(y, parseInt(m,10), 0).getDate();
                    end = `${y}-${m}-${lastDay}`;
                }
                const empty = moduleFilterValues[`${column}_empty`];
                filteredData = filteredData.filter(row => {
                    const value = row[column] ? row[column].trim() : "";
                    // Si solo está el filtro empty, mostrar SOLO vacíos
                    if (empty && !start && !end) {
                        return value === "" || value === null || value === undefined;
                    }
                    // Si está empty + rango, mostrar vacíos o los que cumplen el rango
                    if (empty && (value === "" || value === null || value === undefined)) return true;
                    if (!value) return false;
                    const cellDate = parseFlexibleDate(value);
                    if (!cellDate) return false;
                    if (start) {
                        const startDate = parseFlexibleDate(start);
                        if (!startDate || cellDate < startDate) return false;
                    }
                    if (end) {
                        const endDate = parseFlexibleDate(end);
                        if (!endDate || cellDate > endDate) return false;
                    }
                    return true;
                });
                return;
            }
            // Si no hay ni array ni rango, no filtrar
            return;
        } else {
            const value = moduleFilterValues[column];
            if (!value || (Array.isArray(value) && value.length === 0)) return;
            const isExcludeMode = getModuleFilterExclude()[column] || false;
            filteredData = filteredData.filter(row => {
                const cellValue = row[column];
                if (cellValue === null || cellValue === undefined) return false;
                if (Array.isArray(value)) {
                    const isEmpty = (cellValue === '' || cellValue === null || cellValue === undefined);
                    const hasEmpty = value.includes('__EMPTY__');
                    const hasNoEmpty = value.includes('__NO_EMPTY__');
                    const otherValues = value.filter(v => v !== '__EMPTY__' && v !== '__NO_EMPTY__');
                    
                    let shouldInclude = false;
                    
                    // Si hay otros valores específicos seleccionados
                    if (otherValues.length > 0) {
                        const matchesValue = value.includes(cellValue?.toString());
                        // Si coincide con un valor específico, incluirlo
                        if (matchesValue) shouldInclude = true;
                        // Si no coincide pero está vacío y __EMPTY__ está seleccionado, incluirlo
                        if (isEmpty && hasEmpty) shouldInclude = true;
                        // Si no coincide pero no está vacío y __NO_EMPTY__ está seleccionado, incluirlo
                        if (!isEmpty && hasNoEmpty) shouldInclude = true;
                    } else {
                        // Si solo hay __EMPTY__ y/o __NO_EMPTY__
                        if (hasEmpty && hasNoEmpty) {
                            // Ambos seleccionados: mostrar todos
                            shouldInclude = true;
                        } else if (hasEmpty) {
                            // Solo __EMPTY__: mostrar solo vacíos
                            shouldInclude = isEmpty;
                        } else if (hasNoEmpty) {
                            // Solo __NO_EMPTY__: mostrar solo no vacíos
                            shouldInclude = !isEmpty;
                        }
                    }
                    
                    // Si está en modo exclusión, invertir la lógica
                    if (isExcludeMode) {
                        return !shouldInclude;
                    }
                    
                    return shouldInclude;
                }
                switch (filterType) {
                    case 'text':
                        return normalizeText(cellValue.toString()).includes(normalizeText(value));
                    case 'number':
                        const numValue = parseFloat(value);
                        const cellNum = parseFloat(cellValue);
                        return !isNaN(numValue) && !isNaN(cellNum) && cellNum === numValue;
                    case 'categorical':
                        const selectedValues = value.split(',').map(v => v.trim());
                        return selectedValues.includes(cellValue.toString());
                    default:
                        return true;
                }
            });
        }
    });

    // Aplicar filtros de la tabla
    Object.entries(tableActiveFilters).forEach(([column, filterType]) => {
        const value = tableFilterValues[column];
        if (!value || (Array.isArray(value) && value.length === 0)) return;
        const isExcludeMode = getTableFilterExclude()[column] || false;
        filteredData = filteredData.filter(row => {
            const cellValue = row[column];
            if (cellValue === null || cellValue === undefined) return false;
            if (Array.isArray(value)) {
                const isEmpty = (cellValue === '' || cellValue === null || cellValue === undefined);
                const hasEmpty = value.includes('__EMPTY__');
                const hasNoEmpty = value.includes('__NO_EMPTY__');
                const otherValues = value.filter(v => v !== '__EMPTY__' && v !== '__NO_EMPTY__');
                
                let shouldInclude = false;
                
                // Si hay otros valores específicos seleccionados
                if (otherValues.length > 0) {
                    const matchesValue = value.includes(cellValue?.toString());
                    // Si coincide con un valor específico, incluirlo
                    if (matchesValue) shouldInclude = true;
                    // Si no coincide pero está vacío y __EMPTY__ está seleccionado, incluirlo
                    if (isEmpty && hasEmpty) shouldInclude = true;
                    // Si no coincide pero no está vacío y __NO_EMPTY__ está seleccionado, incluirlo
                    if (!isEmpty && hasNoEmpty) shouldInclude = true;
                } else {
                    // Si solo hay __EMPTY__ y/o __NO_EMPTY__
                    if (hasEmpty && hasNoEmpty) {
                        // Ambos seleccionados: mostrar todos
                        shouldInclude = true;
                    } else if (hasEmpty) {
                        // Solo __EMPTY__: mostrar solo vacíos
                        shouldInclude = isEmpty;
                    } else if (hasNoEmpty) {
                        // Solo __NO_EMPTY__: mostrar solo no vacíos
                        shouldInclude = !isEmpty;
                    }
                }
                
                // Si está en modo exclusión, invertir la lógica
                if (isExcludeMode) {
                    return !shouldInclude;
                }
                
                return shouldInclude;
            }
            return true;
        });
    });

    // Aplicar filtros de duplicados (usando variable global)
    if (window.activeDuplicateFilter && window.activeDuplicateFilter.duplicateKeys) {
        console.log('🔍 Applying global duplicate filter:', window.activeDuplicateFilter.name, 'with', window.activeDuplicateFilter.duplicateKeys.size, 'duplicate keys');
        console.log('🔍 Before duplicate filter, filteredData length:', filteredData.length);
        
        // Filter the current data using the duplicate keys
        const duplicateKeys = window.activeDuplicateFilter.duplicateKeys;
        const duplicateColumns = window.activeDuplicateFilter.duplicateColumns || [];
        
        if (duplicateColumns.length > 0) {
            filteredData = filteredData.filter(row => {
                const rowKey = duplicateColumns.map(col => row[col] || '').join('|');
                return duplicateKeys.has(rowKey);
            });
        }
        
        console.log('🔍 After duplicate filter, filteredData length:', filteredData.length);
    }

    // --- FILTRO GLOBAL ---
    const globalSearch = moduleFilterValues['__globalSearch'];
    if (globalSearch && typeof globalSearch === 'string' && globalSearch.trim()) {
        // Split by comma, trim, lowercase, ignore empty terms
        const terms = globalSearch
            .split(',')
            .map(t => t.trim().toLowerCase())
            .filter(Boolean);
        
        if (terms.length > 0) {
            filteredData = filteredData.filter(row =>
                Object.values(row).some(val =>
                    terms.some(term =>
                        (val || '').toString().toLowerCase().includes(term)
                    )
                )
            );
        }
    }

    const sortConfig = getSortConfig();
    if (sortConfig && sortConfig.column) {
        filteredData = sortData(filteredData, sortConfig.column, sortConfig.direction);
    }

    displayTable(filteredData);
    return filteredData;
}

function resolveDynamicValue(value) {
  if (typeof value === 'string' && value.startsWith('__TODAY__')) {
    return resolveDynamicDateExpr(value);
  }
  if (value === "__TODAY__") {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }
  return value;
}

// Setup filter tabs
function setupFilterTabs() {
  try {
    const tabs = document.querySelectorAll('.filter-tab');
    const panels = document.querySelectorAll('.filter-panel');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        try {
          // Remove active class from all tabs and panels
          tabs.forEach(t => t.classList.remove('active'));
          panels.forEach(p => p.classList.remove('active'));

          // Add active class to clicked tab and corresponding panel
          tab.classList.add('active');
          const targetPanel = document.getElementById(tab.dataset.target + 'FilterPanel');
          if (targetPanel) {
            targetPanel.classList.add('active');
          }
        } catch (error) {
          console.error('Error switching filter tab:', error);
        }
      });
    });

    // Ensure Generic tab is active by default if no other tab is active
    if (!Array.from(tabs).some(tab => tab.classList.contains('active'))) {
      const genericTab = Array.from(tabs).find(tab => tab.dataset.target === 'generic');
      const genericPanel = document.getElementById('genericFilterPanel');
      if (genericTab && genericPanel) {
        genericTab.classList.add('active');
        genericPanel.classList.add('active');
      }
    }
  } catch (error) {
    console.error('Error setting up filter tabs:', error);
  }
}

// Initialize the filter manager
export function initializeFilterManager(initialData) {
  if (!instance) {
    instance = {
      initializeData,
      applyFilters,
      // ... other exported functions ...
    };
  }

  if (initializeData(initialData)) {
    // Forzar reset y regeneración de filtros tras un pequeño delay
    setTimeout(() => {
      resetFilterManager();
      const headers = Object.keys(initialData[0] || {});
      generateFilterSidebar(headers);
      setupFilterTabs();
      applyFilters();
    }, 30); // 30 ms de retraso
  }

  return instance;
}

export function resetFilterManager() {
  setModuleActiveFilters({});
  setModuleFilterValues({});
  // Clear exclude state
  setModuleFilterExclude({});
  // Clear field comparisons
  setModuleFieldComparisons({});
  
  // Ocultar y limpiar todas las secciones de comparación
  document.querySelectorAll('.filter-compare-section').forEach(compareSection => {
    compareSection.style.display = 'none';
    const toggleBtn = compareSection.querySelector('button');
    if (toggleBtn) {
      toggleBtn.textContent = 'Compare';
      toggleBtn.style.background = 'rgba(71, 178, 229, 0.1)';
      toggleBtn.style.borderColor = 'rgba(71, 178, 229, 0.3)';
      toggleBtn.style.color = '#47B2E5';
    }
    const selects = compareSection.querySelectorAll('select');
    selects.forEach(select => select.value = '');
  });
  
  // Cerrar todos los dropdowns abiertos
  document.querySelectorAll('.modal-filter-dropdown').forEach(dropdown => {
    dropdown.classList.add('hidden');
  });
  
  // Limpiar todos los inputs y remover prefijo "Exclude: " si existe
  document.querySelectorAll('.filter-input').forEach(input => { 
    // Remover el prefijo "Exclude: " si existe
    if (input.value && input.value.startsWith('Exclude: ')) {
      input.value = input.value.replace('Exclude: ', '');
    }
    // Limpiar el input completamente
    input.value = ''; 
  });
  document.querySelectorAll('.filter-input[type="date"]').forEach(input => { input.value = ''; });
  document.querySelectorAll('.filter-checkbox').forEach(checkbox => { checkbox.checked = false; });
  document.querySelectorAll('.column-selector').forEach(select => { select.value = ''; });
  // Quitar resaltado de todos los filtros
  document.querySelectorAll('.filter-item').forEach(item => { item.classList.remove('active'); });
  // Reset all exclude toggle buttons in dropdowns
  document.querySelectorAll('.exclude-toggle-btn, .empty-toggle-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Limpiar los chips de filtros activos
  const summary = document.getElementById('activeFiltersSummary');
  if (summary) {
    summary.innerHTML = '';
    summary.style.display = 'none';
  }
  // Limpiar el resumen global de filtros
  const globalSummary = document.getElementById('globalActiveFiltersSummary');
  if (globalSummary) {
    globalSummary.innerHTML = '';
  }
  updateActiveFiltersSummary();
  applyFilters();
  renderActiveFiltersSummaryChips();
  
  // Actualizar estado del botón "Save as quick filter"
  if (typeof window.updateSaveQuickButtonState === 'function') {
    window.updateSaveQuickButtonState();
  }
}

// --- Render active filter chips above the table ---
export function renderActiveFiltersSummaryChips() {
  const summary = document.getElementById('activeFiltersSummary');
  if (!summary) return;
  summary.innerHTML = '';
  const filterValues = getModuleFilterValues();
  if (Object.keys(filterValues).length === 0) {
    summary.style.display = 'flex';
    return;
  }
  summary.style.display = 'flex';

  // Group filters for display
  const dateFilters = {};
  const otherFilters = {};
  Object.entries(filterValues).forEach(([key, value]) => {
    if (key.endsWith('_start') || key.endsWith('_end') || key.endsWith('_empty')) {
      const baseKey = key.replace(/_(start|end|empty)$/, '');
      if (!dateFilters[baseKey]) {
        dateFilters[baseKey] = { start: '', end: '', empty: false };
      }
      if (key.endsWith('_start')) dateFilters[baseKey].start = value;
      if (key.endsWith('_end')) dateFilters[baseKey].end = value;
      if (key.endsWith('_empty')) dateFilters[baseKey].empty = value;
    } else {
      otherFilters[key] = value;
    }
  });

  let count = 0;
  // Date filters
  Object.entries(dateFilters).forEach(([column, filter]) => {
    if (filter.start || filter.end || filter.empty) {
      count++;
      const chip = document.createElement('div');
      chip.className = 'filter-chip-new';
      let text = `${column}: `;
      if (filter.empty && !filter.start && !filter.end) {
        text += '(empty)';
      } else {
        if (filter.start) text += `from ${prettyDynamicDate(filter.start)}`;
        if (filter.end) text += ` to ${prettyDynamicDate(filter.end)}`;
        if (filter.empty) text += ' (including empty)';
      }
      chip.innerHTML = `
        <div class="filter-chip-content">
          <span class="filter-chip-label">${column}</span>
          <span class="filter-chip-value">${text.replace(`${column}: `, '')}</span>
        </div>
        <svg class="filter-chip-close" data-column="${column}" aria-label="Remove filter" width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7.5 2.5L2.5 7.5M2.5 2.5L7.5 7.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
      summary.appendChild(chip);
    }
  });
  // Other filters
  const filterExclude = getModuleFilterExclude();
  Object.entries(otherFilters).forEach(([column, values]) => {
    if (Array.isArray(values) && values.length > 0) {
      count++;
      const chip = document.createElement('div');
      const isExcludeMode = filterExclude[column] || false;
      chip.className = isExcludeMode ? 'filter-chip-new filter-chip-exclude' : 'filter-chip-new';
      
      // Formatear valores para display (remover __EMPTY__ y __NO_EMPTY__)
      const displayValues = values.filter(v => v !== '__EMPTY__' && v !== '__NO_EMPTY__');
      const hasEmpty = values.includes('__EMPTY__');
      const hasNoEmpty = values.includes('__NO_EMPTY__');
      
      // Construir la lista de valores para display
      const valueParts = [];
      if (hasEmpty) valueParts.push('(Empty)');
      if (hasNoEmpty) valueParts.push('(No Empty)');
      if (displayValues.length > 0) {
        if (displayValues.length <= 3) {
          valueParts.push(...displayValues);
        } else {
          valueParts.push(`${displayValues.length} values`);
        }
      }
      
      const valueText = valueParts.join(', ');
      
      // Construir tooltip con todos los valores
      const tooltipParts = [];
      if (hasEmpty) tooltipParts.push('(Empty)');
      if (hasNoEmpty) tooltipParts.push('(No Empty)');
      if (displayValues.length > 0) {
        tooltipParts.push(...displayValues);
      }
      const tooltipText = tooltipParts.length > 0 ? `${column}: ${tooltipParts.join(', ')}` : column;
      
      // Agregar tooltip solo si hay múltiples valores o si el texto es diferente
      if (displayValues.length > 3 || valueText !== tooltipParts.join(', ')) {
        chip.setAttribute('title', tooltipText);
      }
      
      // Agregar "NO" al label si está en modo exclusión
      const labelText = isExcludeMode ? `NO ${column}` : column;
      
      chip.innerHTML = `
        <div class="filter-chip-content">
          <span class="filter-chip-label">${labelText}</span>
          <span class="filter-chip-value">${valueText}</span>
        </div>
        <svg class="filter-chip-close" data-column="${column}" aria-label="Remove filter" width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7.5 2.5L2.5 7.5M2.5 2.5L7.5 7.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
      summary.appendChild(chip);
    }
  });

  // Remove filter on chip click
  summary.querySelectorAll('.filter-chip-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const column = btn.dataset.column;
        const updated = { ...getModuleFilterValues() };
      // Eliminar todos los valores posibles del filtro
        delete updated[`${column}_start`];
        delete updated[`${column}_end`];
        delete updated[`${column}_empty`];
      delete updated[column];
        setModuleFilterValues(updated);
      // Quitar resaltado si ya no hay nada filtrado
        const filterItem = document.querySelector(`.filter-item[data-column="${column}"]`);
        if (filterItem) {
        filterItem.querySelectorAll('input[type="date"]').forEach(input => {
          input.value = '';
          input.removeAttribute('data-dynamic');
        });
          filterItem.querySelectorAll('.filter-checkbox').forEach(checkbox => checkbox.checked = false);
        if (!getModuleFilterValues()[`${column}_start`] && !getModuleFilterValues()[`${column}_end`] && !getModuleFilterValues()[`${column}_empty`]) {
          filterItem.classList.remove('active');
        }
      }
      // Quitar el tipo de filtro si ya no hay nada filtrado
      const activeFilters = { ...getModuleActiveFilters() };
      if (!updated[`${column}_start`] && !updated[`${column}_end`] && !updated[`${column}_empty`]) {
        delete activeFilters[column];
        setModuleActiveFilters(activeFilters);
      }
      renderActiveFiltersSummaryChips();
      updateActiveFiltersSummary();
      applyFilters();
    });
  });
}

// --- Badge on filter button ---
function updateFilterButtonBadge(count) {
  // Use the main filter toggle button
  let btn = document.querySelector('#toggleFiltersBtn');
  if (!btn) {
    // Fallback: Try to find by text content
    btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim().toLowerCase().includes('filter'));
  }
  if (!btn) return;
  let badge = btn.querySelector('.filter-badge');
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'filter-badge';
    btn.appendChild(badge);
    btn.style.position = 'relative';
  }
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = '';
  } else {
    badge.textContent = '';
    badge.style.display = 'none';
  }
  
  // Update reset button state
  updateResetButtonState(count);
}

// --- Update reset button appearance based on active filters ---
function updateResetButtonState(count) {
  // Find all reset filter buttons
  const resetButtons = document.querySelectorAll('.reset-filters-btn, #resetFiltersBtn, #resetAllFiltersBtn');
  
  resetButtons.forEach(btn => {
    if (count > 0) {
      btn.classList.add('has-active-filters');
    } else {
      btn.classList.remove('has-active-filters');
    }
  });
}

// --- Hook into filter changes ---
// Call renderActiveFiltersSummaryChips whenever filters change
const oldUpdateActiveFiltersSummary = window.updateActiveFiltersSummary;
window.updateActiveFiltersSummary = function() {
  if (oldUpdateActiveFiltersSummary) oldUpdateActiveFiltersSummary();
  renderActiveFiltersSummaryChips();
};
// Initial render
renderActiveFiltersSummaryChips();

// --- Utilidad para parsear expresiones tipo __TODAY__+N o __TODAY__-N ---
function resolveDynamicDateExpr(expr) {
  if (typeof expr !== 'string') return expr;
  const today = new Date();
  if (expr.startsWith('__TODAY__')) {
    let offset = 0;
    const match = expr.match(/__TODAY__(?:([+-])(\d+))?/);
    if (match && match[1] && match[2]) {
      offset = parseInt(match[2], 10) * (match[1] === '-' ? -1 : 1);
    }
    today.setDate(today.getDate() + offset);
    return today.toISOString().slice(0, 10);
  }
  return expr;
}

// --- Quick Filters API for Dashboard ---
function loadQuickFilters() {
  try {
    const saved = localStorage.getItem('quickFilters');
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}
function saveQuickFilter(name, urgencyCard, container, containerTitle, hubType = 'ops') {
  const headers = Object.keys(getOriginalData()[0] || {});
  const filterValues = { ...getModuleFilterValues() };
  const activeFilters = { ...getModuleActiveFilters() };
  
  // Quick filters NO deben guardar exclude ni comparaciones
  // Limpiar cualquier estado de exclude o comparación antes de guardar
  const filterExclude = {}; // Siempre vacío para quick filters
  
  // Debug: Verificar que se están guardando todos los valores, incluyendo __NO_EMPTY__ y valores personalizados
  console.log('💾 Saving quick filter:', name);
  console.log('📋 Filter values:', filterValues);
  console.log('🔍 Active filters:', activeFilters);
  console.log('⚠️ Exclude and comparisons cleared for quick filter');
  
  // Asegurar que se guardan arrays vacíos y valores especiales correctamente
  // No filtrar ningún valor, guardar todo tal cual está
  const quickFilters = loadQuickFilters();
  const filterObj = { filterValues, activeFilters, filterExclude, headers, hubType };
  if (urgencyCard && urgencyCard !== 'Ninguna') filterObj.linkedUrgencyCard = urgencyCard;
  if (container) filterObj.container = container;
  if (containerTitle) filterObj.containerTitle = containerTitle;
  quickFilters[name] = filterObj;
  
  // Debug: Verificar qué se está guardando en localStorage
  console.log('💾 Quick filter object to save:', filterObj);
  localStorage.setItem('quickFilters', JSON.stringify(quickFilters));
  
  // Debug: Verificar que se guardó correctamente
  const saved = JSON.parse(localStorage.getItem('quickFilters') || '{}');
  console.log('✅ Saved quick filter:', saved[name]);
  
  // Invalidar cache de quick filters para forzar recarga
  window._cachedQuickFilters = null;
  
  // Trigger auto-save
  if (typeof window.triggerAutoSave === 'function') {
    window.triggerAutoSave();
  }
  
  // Show notification
  if (typeof window.showUnifiedNotification === 'function') {
    window.showUnifiedNotification(`Quick filter "${name}" saved successfully!`, 'success');
  }
}
function deleteQuickFilter(name) {
  const quickFilters = loadQuickFilters();
  
  // Invalidar cache de quick filters para forzar recarga
  window._cachedQuickFilters = null;
  delete quickFilters[name];
  localStorage.setItem('quickFilters', JSON.stringify(quickFilters));
  
  // Trigger auto-save
  if (typeof window.triggerAutoSave === 'function') {
    window.triggerAutoSave();
  }
  
  // Show notification
  if (typeof window.showUnifiedNotification === 'function') {
    window.showUnifiedNotification(`Quick filter "${name}" deleted successfully!`, 'success');
  }
}
function getFilteredData() {
  const data = getOriginalData();
  const activeFilters = getModuleActiveFilters();
  const filterValues = getModuleFilterValues();
  const filterExclude = getModuleFilterExclude();
  if (!data || !data.length) return [];
  let filteredData = [...data];

  // --- BÚSQUEDA GLOBAL MULTITÉRMINO (OR, coma como separador) ---
  const globalSearch = filterValues['__globalSearch'];
  if (globalSearch && globalSearch.trim()) {
    const terms = globalSearch.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    if (terms.length > 0) {
      filteredData = filteredData.filter(row =>
        terms.some(term =>
          Object.values(row).some(
            value => value && value.toString().toLowerCase().includes(term)
          )
        )
      );
    }
    // Si no hay términos válidos, no filtra (muestra todo)
  }

  // --- RESTO DE FILTROS POR COLUMNA ---
  Object.entries(activeFilters).forEach(([column, filterType]) => {
    if (filterType === 'date') {
      const start = resolveDynamicValue(filterValues[`${column}_start`]);
      const end = resolveDynamicValue(filterValues[`${column}_end`]);
      const empty = filterValues[`${column}_empty`];
      filteredData = filteredData.filter(row => {
        const value = row[column] ? row[column].trim() : "";
        if (empty && !start && !end) {
            return value === "" || value === null || value === undefined;
        }
        if (empty && (value === "" || value === null || value === undefined)) return true;
        if (!value) return false;
        const cellDate = parseFlexibleDate(value);
        if (!cellDate) return false;
        if (start) {
          const startDate = parseFlexibleDate(start);
          if (!startDate || cellDate < startDate) return false;
        }
        if (end) {
          const endDate = parseFlexibleDate(end);
          if (!endDate || cellDate > endDate) return false;
        }
        return true;
      });
      return;
    }
    const value = filterValues[column];
    if (!value || (Array.isArray(value) && value.length === 0)) return;
    filteredData = filteredData.filter(row => {
      const cellValue = row[column];
      if (cellValue === null || cellValue === undefined) return false;
      if (Array.isArray(value)) {
        const isEmpty = (cellValue === '' || cellValue === null || cellValue === undefined);
        const hasEmpty = value.includes('__EMPTY__');
        const hasNoEmpty = value.includes('__NO_EMPTY__');
        const otherValues = value.filter(v => v !== '__EMPTY__' && v !== '__NO_EMPTY__');
        
        // Verificar si está en modo exclusión
        const isExcludeMode = filterExclude[column] || false;
        
        let shouldInclude = false;
        
        // Si hay otros valores específicos seleccionados
        if (otherValues.length > 0) {
          const matchesValue = value.includes(cellValue?.toString());
          if (matchesValue) shouldInclude = true;
          if (isEmpty && hasEmpty) shouldInclude = true;
          if (!isEmpty && hasNoEmpty) shouldInclude = true;
        } else {
          // Si solo hay __EMPTY__ y/o __NO_EMPTY__
          if (hasEmpty && hasNoEmpty) {
            shouldInclude = true; // Ambos: mostrar todos
          } else if (hasEmpty) {
            shouldInclude = isEmpty; // Solo __EMPTY__: mostrar solo vacíos
          } else if (hasNoEmpty) {
            shouldInclude = !isEmpty; // Solo __NO_EMPTY__: mostrar solo no vacíos
          }
        }
        
        // Si está en modo exclusión, invertir la lógica
        if (isExcludeMode) {
          return !shouldInclude;
        }
        
        return shouldInclude;
      }
      switch (filterType) {
        case 'text':
          return normalizeText(cellValue.toString()).includes(normalizeText(value));
        case 'number':
          const numValue = parseFloat(value);
          const cellNum = parseFloat(cellValue);
          return !isNaN(numValue) && !isNaN(cellNum) && cellNum === numValue;
        case 'categorical':
          const selectedValues = value.split(',').map(v => v.trim());
          return selectedValues.includes(cellValue.toString());
        default:
          return true;
      }
    });
  });
  const sortConfig = getSortConfig();
  if (sortConfig && sortConfig.column) {
    filteredData = sortData(filteredData, sortConfig.column, sortConfig.direction);
  }
  return filteredData;
}

// Utilidad robusta para convertir fechas a YYYY-MM-DD
function toISODateString(val) {
  if (!val) return val;
  // Si es un número puro de 1 a 3 dígitos, nunca es fecha
  if (/^\d{1,3}$/.test(val.trim())) return val;
  
  // Intenta parsear como DD.MM.YY (formato corto con puntos)
  const shortDateWithDots = val.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
  if (shortDateWithDots) {
    const [, day, month, year] = shortDateWithDots;
    // Asumir que años 00-29 son 2000-2029, años 30-99 son 1930-1999
    const fullYear = parseInt(year) < 30 ? `20${year}` : `19${year}`;
    const date = new Date(`${fullYear}-${month}-${day}`);
    if (!isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  }
  
  // Intenta parsear como DD-MM-YYYY o DD/MM/YYYY
  const match = val.match(/^([0-3]?\d)[-/]([0-1]?\d)[-/](\d{4})$/);
  if (match) {
    const [, d, m, y] = match;
    const date = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
    if (!isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  }
  // Intenta parsear como YYYY-MM-DD
  const iso = val.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
  if (iso) return val.replace(/\//g, '-');
  // Intenta parsear como fecha JS
  const d = new Date(val);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return val;
}

// Utilidad para mostrar fechas dinámicas de forma legible
function prettyDynamicDate(val) {
  if (typeof val !== 'string') return val;
  if (val === '__TODAY__') return 'Today';
  const match = val.match(/^__TODAY__(\+|-)(\d+)$/);
  if (match) {
    const sign = match[1] === '+' ? '+ ' : '- ';
    return `Today ${sign}${match[2]} days`;
  }
  return val;
}

// Function to set column filter and validate column compatibility
function setColumnFilter(column, filterValues) {
  try {
    console.log(`🔍 Setting filter for column: ${column}`, filterValues);
    
    // Check if the column exists in current data
    const currentHeaders = getCurrentHeaders ? getCurrentHeaders() : [];
    const columnExists = currentHeaders.includes(column);
    
    if (!columnExists) {
      console.warn(`⚠️ Column "${column}" not found in current data. Available columns:`, currentHeaders);
      
      // Find the filter element and mark it as incompatible
      const filterElement = document.querySelector(`[data-column="${column}"]`);
      if (filterElement) {
        filterElement.classList.add('filter-incompatible');
        filterElement.style.opacity = '0.5';
        filterElement.style.pointerEvents = 'none';
        
        // Add warning tooltip
        const warningTooltip = document.createElement('div');
        warningTooltip.className = 'filter-warning-tooltip';
        warningTooltip.textContent = `Column "${column}" not available in current data`;
        warningTooltip.style.cssText = `
          position: absolute;
          background: #ff6b6b;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          z-index: 1000;
          pointer-events: none;
          white-space: nowrap;
          top: -30px;
          left: 50%;
          transform: translateX(-50%);
          opacity: 0;
          transition: opacity 0.3s;
        `;
        
        filterElement.appendChild(warningTooltip);
        
        // Show tooltip on hover
        filterElement.addEventListener('mouseenter', () => {
          warningTooltip.style.opacity = '1';
        });
        
        filterElement.addEventListener('mouseleave', () => {
          warningTooltip.style.opacity = '0';
        });
      }
      
      return false; // Indicate that filter couldn't be applied
    }
    
    // Column exists, apply the filter normally
    setModuleFilterValues({ ...getModuleFilterValues(), [column]: filterValues });
    setModuleActiveFilters({ ...getModuleActiveFilters(), [column]: 'categorical' });
    
    // Update the filter element to show it's active
    const filterElement = document.querySelector(`[data-column="${column}"]`);
    if (filterElement) {
      filterElement.classList.remove('filter-incompatible');
      filterElement.style.opacity = '1';
      filterElement.style.pointerEvents = 'auto';
      
      // Remove warning tooltip if it exists
      const warningTooltip = filterElement.querySelector('.filter-warning-tooltip');
      if (warningTooltip) {
        warningTooltip.remove();
      }
      
      // Mark as active
      filterElement.classList.add('active');
    }
    
    console.log(`✅ Filter applied successfully for column: ${column}`);
    return true; // Indicate success
    
  } catch (error) {
    console.error(`❌ Error setting filter for column ${column}:`, error);
    return false;
  }
}

// Function to validate and update filter compatibility
function validateFilterCompatibility() {
  try {
    console.log('🔍 Validating filter compatibility...');
    
    const currentHeaders = getCurrentHeaders ? getCurrentHeaders() : [];
    const activeFilters = getModuleActiveFilters ? getModuleActiveFilters() : {};
    const filterValues = getModuleFilterValues ? getModuleFilterValues() : {};
    
    let incompatibleCount = 0;
    const incompatibleColumns = [];
    
    // Check each active filter
    Object.keys(activeFilters).forEach(column => {
      const columnExists = currentHeaders.includes(column);
      const filterElement = document.querySelector(`[data-column="${column}"]`);
      
      if (!columnExists && filterElement) {
        // Mark as incompatible
        filterElement.classList.add('filter-incompatible');
        filterElement.style.opacity = '0.5';
        filterElement.style.pointerEvents = 'none';
        incompatibleCount++;
        incompatibleColumns.push(column);
        
        console.log(`⚠️ Filter for column "${column}" is incompatible with current data`);
      } else if (columnExists && filterElement) {
        // Mark as compatible
        filterElement.classList.remove('filter-incompatible');
        filterElement.style.opacity = '1';
        filterElement.style.pointerEvents = 'auto';
      }
    });
    
    // Clean up incompatible filters from state
    if (incompatibleColumns.length > 0) {
      const updatedActiveFilters = { ...activeFilters };
      const updatedFilterValues = { ...filterValues };
      
      incompatibleColumns.forEach(column => {
        delete updatedActiveFilters[column];
        delete updatedFilterValues[column];
      });
      
      // Update state
      if (typeof setModuleActiveFilters === 'function') {
        setModuleActiveFilters(updatedActiveFilters);
      }
      if (typeof setModuleFilterValues === 'function') {
        setModuleFilterValues(updatedFilterValues);
      }
      
      console.log(`🧹 Cleaned up ${incompatibleColumns.length} incompatible filters from state`);
    }
    
    // Show notification if there are incompatible filters
    if (incompatibleCount > 0) {
      if (typeof window.showUnifiedNotification === 'function') {
        window.showUnifiedNotification(
          `${incompatibleCount} filter(s) were incompatible with the new CSV and have been removed.`,
          'warning'
        );
      }
    }
    
    console.log(`✅ Filter compatibility validation complete. ${incompatibleCount} incompatible filters found and cleaned up.`);
    return incompatibleCount;
    
  } catch (error) {
    console.error('❌ Error validating filter compatibility:', error);
    return 0;
  }
}

export { 
  getFilteredData, 
  loadQuickFilters, 
  saveQuickFilter, 
  deleteQuickFilter, 
  applyFilters, 
  generateFilterSidebar, 
  detectColumnTypes, 
  parseFlexibleDate,
  setColumnFilter,
  validateFilterCompatibility
}; 