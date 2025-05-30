import { 
    getOriginalData, 
    setModuleActiveFilters, 
    setModuleFilterValues, 
    getModuleActiveFilters, 
    getModuleFilterValues,
    getTableActiveFilters,
    getTableFilterValues,
    getSortConfig
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

// Initialize data
function initializeData(data) {
  if (!data || !data.length) {
    console.warn('No data provided for filter initialization');
    return false;
  }
  try {
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

function generateFilterSidebar(headers) {
  if (!getOriginalData() || !getOriginalData().length) {
    console.warn('No data available for generating filters');
    return;
  }

  const genericContainer = document.getElementById("genericFilterPanel");
  const myFiltersPanel = document.getElementById("myfiltersFilterPanel");
  const referenceContainer = document.getElementById("referenceFilterPanel");
  const dateContainer = document.getElementById("dateFilterPanel");
  const filterTabs = document.querySelector('.filter-tabs');
  const filterPanels = document.querySelector('.filter-panels');

  if (!genericContainer || !referenceContainer || !dateContainer || !filterTabs || !filterPanels || !myFiltersPanel) {
    console.warn('Filter containers or tabs not found');
    return;
  }

  try {
    // Limpiar contenido de cada panel antes de añadir el suyo
    genericContainer.innerHTML = "";
    myFiltersPanel.innerHTML = "";
    referenceContainer.innerHTML = "";
    dateContainer.innerHTML = "";

    // Después de crear las tabs y antes de los paneles, inserta el resumen global:
    let globalSummary = document.getElementById('globalActiveFiltersSummary');
    if (!globalSummary) {
      globalSummary = document.createElement('div');
      globalSummary.id = 'globalActiveFiltersSummary';
      globalSummary.className = 'active-filters-summary';
      filterTabs.parentNode.insertBefore(globalSummary, filterPanels);
    }

    // --- Add Active Filters Tab and Panel ---
    // Check if already exists
    let activeTab = filterTabs.querySelector('.filter-tab[data-target="active"]');
    let activePanel = document.getElementById('activeFilterPanel');
    if (!activeTab) {
      // Create tab
      activeTab = document.createElement('button');
      activeTab.className = 'filter-tab';
      activeTab.dataset.target = 'active';
      activeTab.textContent = 'Active Filters';
      filterTabs.appendChild(activeTab);
    }
    if (!activePanel) {
      // Create panel
      activePanel = document.createElement('div');
      activePanel.className = 'filter-panel';
      activePanel.id = 'activeFilterPanel';
      filterPanels.appendChild(activePanel);
    }
    // Clear panel content
    activePanel.innerHTML = '';

    // Create summary inside the panel
    const summaryContainer = document.createElement("div");
    summaryContainer.className = "active-filters-summary";
    summaryContainer.innerHTML = `
      <div class="active-filters-list"></div>
      <button class="clear-all-filters-btn">Clear All</button>
    `;
    activePanel.appendChild(summaryContainer);

    // --- Botón Save Filter SOLO en Active Filters ---
    let saveBtn = document.getElementById('saveMyFilterBtn');
    if (!saveBtn) {
      saveBtn = document.createElement('button');
      saveBtn.id = 'saveMyFilterBtn';
      saveBtn.className = 'save-my-filter-btn btn-primary filter-save-btn';
      saveBtn.textContent = 'Save Filter';
      saveBtn.addEventListener('click', () => {
        const name = prompt('Enter a name for this filter:');
        if (name) saveMyFilter(name);
      });
    }
    // --- Botón Guardar como filtro rápido ---
    let saveQuickBtn = document.getElementById('saveQuickFilterBtn');
    if (!saveQuickBtn) {
      saveQuickBtn = document.createElement('button');
      saveQuickBtn.id = 'saveQuickFilterBtn';
      saveQuickBtn.className = 'save-my-filter-btn btn-primary filter-save-btn';
      saveQuickBtn.textContent = 'Save as quick filter';
      saveQuickBtn.addEventListener('click', () => {
        const name = prompt('Name for the quick filter:');
        if (name) saveQuickFilter(name);
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
      setModuleFilterValues({});
      document.querySelectorAll('.filter-input').forEach(input => { input.value = ''; });
      document.querySelectorAll('.filter-input[type="date"]').forEach(input => { input.value = ''; });
      document.querySelectorAll('.filter-checkbox').forEach(checkbox => { checkbox.checked = false; });
      document.querySelectorAll('.filter-item').forEach(item => { item.remove(); });
      document.querySelectorAll('.column-selector').forEach(select => { select.value = ''; });
      updateActiveFiltersSummary();
      applyFilters();
    });

    // --- END Active Filters Tab/Panel ---

    // Group headers by type
    const columnTypes = detectColumnTypes(getOriginalData());
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

    // Create filter sections
    Object.entries(groupedHeaders).forEach(([type, cols]) => {
      const container = type === 'date' ? dateContainer : genericContainer;

      // Create column selector
      const selectorDiv = document.createElement("div");
      selectorDiv.className = "column-selector-container";
      
      // Define filterContainer antes de cualquier uso
      const filterContainer = document.createElement("div");
      filterContainer.className = "active-filters-container";
      
      // Crear input en lugar de select
      const input = document.createElement("input");
      input.type = "text";
      input.className = "column-selector";
      input.placeholder = "Select a column to filter...";
      input.autocomplete = "off";
      // No datalist

      // Dropdown personalizado
      const dropdown = document.createElement('div');
      dropdown.className = 'column-dropdown hidden';
      dropdown.style.position = 'absolute';
      dropdown.style.top = '100%';
      dropdown.style.left = '0';
      dropdown.style.width = '100%';
      dropdown.style.background = '#fff';
      dropdown.style.border = '1px solid var(--border-color)';
      dropdown.style.borderRadius = '0 0 6px 6px';
      dropdown.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
      dropdown.style.zIndex = '100';
      dropdown.style.maxHeight = '220px';
      dropdown.style.overflowY = 'auto';
      dropdown.style.fontSize = '0.95rem';
      dropdown.style.padding = '0';
      selectorDiv.style.position = 'relative';

      // Renderiza las opciones filtradas
      function renderDropdownOptions(term = '') {
        dropdown.innerHTML = '';
        const filtered = cols.filter(col => col.toLowerCase().includes(term.toLowerCase()));
        if (filtered.length === 0) {
          const noOpt = document.createElement('div');
          noOpt.textContent = 'No columns found';
          noOpt.style.padding = '0.6rem 1rem';
          noOpt.style.color = '#888';
          dropdown.appendChild(noOpt);
          return;
        }
        filtered.forEach((col, idx) => {
          const opt = document.createElement('div');
          opt.className = 'column-dropdown-option';
          opt.textContent = col;
          opt.style.padding = '0.6rem 1rem';
          opt.style.cursor = 'pointer';
          opt.tabIndex = 0;
          opt.addEventListener('mousedown', e => {
            e.preventDefault();
            input.value = col;
            dropdown.classList.add('hidden');
            input.dispatchEvent(new Event('change'));
          });
          dropdown.appendChild(opt);
        });
      }

      // Mostrar/ocultar y filtrar
      input.addEventListener('input', () => {
        renderDropdownOptions(input.value);
        dropdown.classList.remove('hidden');
      });
      input.addEventListener('focus', () => {
        renderDropdownOptions(input.value);
        dropdown.classList.remove('hidden');
      });
      input.addEventListener('blur', () => {
        setTimeout(() => dropdown.classList.add('hidden'), 150);
      });

      // Navegación con teclado
      input.addEventListener('keydown', e => {
        const opts = dropdown.querySelectorAll('.column-dropdown-option');
        if (!opts.length) return;
        let idx = Array.from(opts).findIndex(opt => opt === document.activeElement);
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (idx < opts.length - 1) opts[idx + 1].focus();
          else opts[0].focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (idx > 0) opts[idx - 1].focus();
          else opts[opts.length - 1].focus();
        } else if (e.key === 'Enter' && idx >= 0) {
          opts[idx].dispatchEvent(new Event('mousedown'));
        }
      });

      // Validación y feedback visual
      input.addEventListener("input", () => {
        const value = input.value.trim();
        if (value && !cols.includes(value)) {
          input.classList.add("invalid");
        } else {
          input.classList.remove("invalid");
        }
      });

      // Handle column selection
      input.addEventListener("change", () => {
        const selectedColumn = input.value.trim();
        if (!selectedColumn || !cols.includes(selectedColumn)) {
          input.value = ""; // Reset si no es válido
          return;
        }

        // Check if filter already exists
        if (filterContainer.querySelector(`[data-column="${selectedColumn}"]`)) {
          input.value = ""; // Reset selector
          return;
        }

        // --- ACTUALIZAR activeFilters al añadir filtro ---
        setModuleActiveFilters({ ...getModuleActiveFilters(), [selectedColumn]: type });

        const filterDiv = document.createElement("div");
        filterDiv.className = "filter-item";
        filterDiv.dataset.column = selectedColumn;

        // Create header with column name and remove button
        const headerDiv = document.createElement("div");
        headerDiv.className = "filter-header";
        headerDiv.innerHTML = `
          <label>${selectedColumn}</label>
          <button class="remove-filter-btn" title="Remove filter">×</button>
        `;

        // Create filter input based on type
        if (type === 'date') {
          const inputWrapper = document.createElement("div");
          inputWrapper.className = "filter-input-wrapper";

          // Start date
          const startInput = document.createElement("input");
          startInput.type = "date";
          startInput.className = "filter-input";
          startInput.placeholder = "Start date";
          startInput.dataset.column = selectedColumn;
          startInput.dataset.type = "start";

          // Botón Today para start
          const todayBtnStart = document.createElement('button');
          todayBtnStart.type = 'button';
          todayBtnStart.className = 'date-today-btn';
          todayBtnStart.textContent = 'Today';
          todayBtnStart.style.marginLeft = '0.5rem';
          todayBtnStart.addEventListener('click', () => {
            // Guardar como __TODAY__ para que sea dinámico
            startInput.value = new Date().toISOString().split('T')[0];
            startInput.dataset.dynamic = '__TODAY__';
            const key = `${selectedColumn}_start`;
            setModuleFilterValues({ ...getModuleFilterValues(), [key]: '__TODAY__' });
            setTodayBtnActive(todayBtnStart, true);
            filterDiv.classList.add("active");
            updateActiveFiltersSummary();
            applyFilters();
          });

          // Input para días personalizados (para startInput)
          const daysInputStart = document.createElement('input');
          daysInputStart.type = 'number';
          daysInputStart.value = 7;
          daysInputStart.min = 1;
          daysInputStart.max = 365;
          daysInputStart.style.width = '48px';
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
            setTodayBtnActive(todayBtnStart, true);
            filterDiv.classList.add("active");
            updateActiveFiltersSummary();
            applyFilters();
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
            setTodayBtnActive(todayBtnStart, true);
            filterDiv.classList.add("active");
            updateActiveFiltersSummary();
            applyFilters();
          });

          // End date
          const endInput = document.createElement("input");
          endInput.type = "date";
          endInput.className = "filter-input";
          endInput.placeholder = "End date";
          endInput.dataset.column = selectedColumn;
          endInput.dataset.type = "end";

          // Botón Today para end
          const todayBtnEnd = document.createElement('button');
          todayBtnEnd.type = 'button';
          todayBtnEnd.className = 'date-today-btn';
          todayBtnEnd.textContent = 'Today';
          todayBtnEnd.style.marginLeft = '0.5rem';
          todayBtnEnd.addEventListener('click', () => {
            // Guardar como __TODAY__ para que sea dinámico
            endInput.value = new Date().toISOString().split('T')[0];
            endInput.dataset.dynamic = '__TODAY__';
            const key = `${selectedColumn}_end`;
            setModuleFilterValues({ ...getModuleFilterValues(), [key]: '__TODAY__' });
            setTodayBtnActive(todayBtnEnd, true);
            filterDiv.classList.add("active");
            updateActiveFiltersSummary();
            applyFilters();
          });

          // Input para días personalizados (para endInput)
          const daysInputEnd = document.createElement('input');
          daysInputEnd.type = 'number';
          daysInputEnd.value = 7;
          daysInputEnd.min = 1;
          daysInputEnd.max = 365;
          daysInputEnd.style.width = '48px';
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
            setTodayBtnActive(todayBtnEnd, true);
            filterDiv.classList.add("active");
            updateActiveFiltersSummary();
            applyFilters();
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
            setTodayBtnActive(todayBtnEnd, true);
            filterDiv.classList.add("active");
            updateActiveFiltersSummary();
            applyFilters();
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
              if (!getModuleFilterValues()[`${selectedColumn}_start`] && !getModuleFilterValues()[`${selectedColumn}_end`]) {
                filterDiv.classList.remove('active');
              }
            } else {
              setModuleFilterValues({ ...getModuleFilterValues(), [key]: true });
              emptyBtn.classList.add('active');
              filterDiv.classList.add('active');
            }
            updateActiveFiltersSummary();
            applyFilters();
          });

          // Add event listeners
          [startInput, endInput].forEach(input => {
            input.addEventListener("change", debounce(() => {
              const key = `${selectedColumn}_${input.dataset.type}`;
              if (input.value) {
                // Si el valor es la fecha de hoy, guarda __TODAY__ internamente
                const todayStr = new Date().toISOString().slice(0, 10);
                if (input.value === todayStr) {
                  setModuleFilterValues({ ...getModuleFilterValues(), [key]: '__TODAY__' });
                } else {
                  setModuleFilterValues({ ...getModuleFilterValues(), [key]: input.value });
                }
                filterDiv.classList.add("active");
              } else {
                const updated = { ...getModuleFilterValues() };
                delete updated[key];
                setModuleFilterValues(updated);
                if (!getModuleFilterValues()[`${selectedColumn}_start`] && 
                    !getModuleFilterValues()[`${selectedColumn}_end`] && 
                    !getModuleFilterValues()[`${selectedColumn}_empty`]) {
                  filterDiv.classList.remove("active");
                }
              }
              updateActiveFiltersSummary();
              applyFilters();
            }, 300));
          });

          // Solo un botón Today, y se colorea cuando está activo
          function setTodayBtnActive(btn, isActive) {
            if (isActive) {
              btn.classList.add('active');
            } else {
              btn.classList.remove('active');
            }
          }

          // Al cargar el filtro, colorea Today si corresponde
          if (type === 'date') {
            if (getModuleFilterValues()[`${selectedColumn}_start`]) {
              const val = getModuleFilterValues()[`${selectedColumn}_start`];
              if (typeof val === 'string' && val.startsWith('__TODAY__')) {
                startInput.value = new Date().toISOString().split('T')[0];
                startInput.dataset.dynamic = val;
                setTodayBtnActive(todayBtnStart, true);
              } else {
                startInput.value = val;
                startInput.dataset.dynamic = '';
                setTodayBtnActive(todayBtnStart, false);
              }
            }
            if (getModuleFilterValues()[`${selectedColumn}_end`]) {
              const val = getModuleFilterValues()[`${selectedColumn}_end`];
              if (typeof val === 'string' && val.startsWith('__TODAY__')) {
                endInput.value = new Date().toISOString().split('T')[0];
                endInput.dataset.dynamic = val;
                setTodayBtnActive(todayBtnEnd, true);
              } else {
                endInput.value = val;
                endInput.dataset.dynamic = '';
                setTodayBtnActive(todayBtnEnd, false);
              }
            }
          }

          // --- Agrupar cada input de fecha y sus controles debajo de cada input ---
          // Crear grupo para startInput
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

          // Crear grupo para endInput
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

          // Limpiar y añadir los grupos al inputWrapper
          inputWrapper.innerHTML = '';
          inputWrapper.appendChild(startGroup);
          inputWrapper.appendChild(endGroup);
          inputWrapper.appendChild(emptyBtn);

          filterDiv.appendChild(inputWrapper);
        } else {
          // Filtro tipo Excel para todos los campos que no sean fecha
          let uniqueValues = [...new Set(getOriginalData().map(row => row[selectedColumn] || '').map(String))];
          // Si la columna es de tipo fecha, formatea a YYYY-MM-DD
          if (type === 'date') {
            uniqueValues = uniqueValues.map(val => toISODateString(val));
          }
          // Dropdown tipo Excel
          const dropdownWrapper = document.createElement('div');
          dropdownWrapper.className = 'excel-dropdown-wrapper';
          dropdownWrapper.style.position = 'relative';

          // Input editable para búsqueda y resumen
          const input = document.createElement('input');
          input.type = 'text';
          input.className = 'filter-input';
          input.placeholder = `Search or select...`;
          input.autocomplete = 'off';
          // Limpiar el input al hacer focus si ya tiene valor
          input.addEventListener('focus', () => {
            if (input.value) input.value = '';
          });
          dropdownWrapper.appendChild(input);

          // --- AUTOCOMPLETADO SUGERENCIAS ---
          // createAutocomplete(input, uniqueValues); // Eliminado para evitar duplicidad de sugerencias en filtros tipo Excel

          // Dropdown personalizado
          const dropdown = document.createElement('div');
          dropdown.className = 'excel-dropdown hidden';
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
          dropdownWrapper.appendChild(dropdown);

          // Botones seleccionar todo/borrar
          const selectAllBtn = document.createElement('button');
          selectAllBtn.textContent = 'Select all';
          selectAllBtn.type = 'button';
          selectAllBtn.className = 'excel-dropdown-btn';
          selectAllBtn.style.margin = '0.3rem 0.5rem 0.3rem 0';
          const clearAllBtn = document.createElement('button');
          clearAllBtn.textContent = 'Clear selection';
          clearAllBtn.type = 'button';
          clearAllBtn.className = 'excel-dropdown-btn';
          clearAllBtn.style.margin = '0.3rem 0 0.3rem 0.5rem';
          const btnsDiv = document.createElement('div');
          btnsDiv.style.display = 'flex';
          btnsDiv.style.justifyContent = 'space-between';
          btnsDiv.appendChild(selectAllBtn);
          btnsDiv.appendChild(clearAllBtn);
          dropdown.appendChild(btnsDiv);

          // Debounce para el input de búsqueda
          function debounce(func, wait) {
            let timeout;
            return function(...args) {
              clearTimeout(timeout);
              timeout = setTimeout(() => func.apply(this, args), wait);
            };
          }

          // Lista de checkboxes
          let selectedSet = new Set();
          let lastFilterTerm = '';
          function renderCheckboxList(filterTerm = '') {
            // Sincroniza el set con el estado real
            selectedSet = new Set(getModuleFilterValues()[selectedColumn] || []);
            dropdown.querySelectorAll('.excel-checkbox-list').forEach(e => e.remove());
            const list = document.createElement('div');
            list.className = 'excel-checkbox-list';
            // Opción (Empty) siempre al principio
            const emptyBtn2 = document.createElement('button');
            emptyBtn2.type = 'button';
            emptyBtn2.className = 'empty-toggle-btn';
            emptyBtn2.textContent = '(Empty)';
            if (selectedSet.has('__EMPTY__')) emptyBtn2.classList.add('active');
            emptyBtn2.addEventListener('click', () => {
              if (selectedSet.has('__EMPTY__')) {
                selectedSet.delete('__EMPTY__');
                emptyBtn2.classList.remove('active');
              } else {
                selectedSet.add('__EMPTY__');
                emptyBtn2.classList.add('active');
              }
              setModuleFilterValues({ ...getModuleFilterValues(), [selectedColumn]: Array.from(selectedSet) });
              // Forzar tipo 'date' en activeFilters si la columna es de fecha
              if (type === 'date') {
                setModuleActiveFilters({ ...getModuleActiveFilters(), [selectedColumn]: 'date' });
              }
              filterDiv.classList.toggle('active', selectedSet.size > 0);
              updateActiveFiltersSummary();
              applyFilters();
              updateInputSummary();
            });
            list.appendChild(emptyBtn2);
            // Resto de valores (limitados y filtrados)
            const MAX_OPTIONS = 200;
            let filteredValues = uniqueValues;
            if (filterTerm) {
              const lowerTerm = filterTerm.toLowerCase();
              filteredValues = uniqueValues.filter(val => val.toLowerCase().includes(lowerTerm));
            }
            filteredValues.slice(0, MAX_OPTIONS).forEach(val => {
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
                setModuleFilterValues({ ...getModuleFilterValues(), [selectedColumn]: Array.from(selectedSet) });
                // Forzar tipo 'date' en activeFilters si la columna es de fecha
                if (type === 'date') {
                  setModuleActiveFilters({ ...getModuleActiveFilters(), [selectedColumn]: 'date' });
                }
                filterDiv.classList.toggle('active', selectedSet.size > 0);
                updateActiveFiltersSummary();
                applyFilters();
                updateInputSummary();
              });
              label.appendChild(checkbox);
              label.appendChild(document.createTextNode(val));
              list.appendChild(label);
            });
            dropdown.appendChild(list);
          }

          // Buscar y mostrar dropdown (con debounce)
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
          });
          input.addEventListener('blur', () => {
            setTimeout(() => dropdown.classList.add('hidden'), 200);
          });

          // Seleccionar todo
          selectAllBtn.addEventListener('click', () => {
            selectedSet = new Set(filteredValues);
            setModuleFilterValues({ ...getModuleFilterValues(), [selectedColumn]: Array.from(selectedSet) });
            filterDiv.classList.add('active');
            renderCheckboxList();
            updateActiveFiltersSummary();
            applyFilters();
            updateInputSummary();
            input.value = ''; // Limpiar el input de búsqueda tras aplicar
          });
          // Borrar selección
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
            input.value = ''; // Limpiar el input de búsqueda tras aplicar
          });

          // Mostrar resumen en el input
          function updateInputSummary() {
            const selected = Array.from(selectedSet).filter(v => v !== '__EMPTY__');
            if (selectedSet.has('__EMPTY__')) {
              input.value = '(Empty)';
            } else if (selected.length === 0) {
              input.value = '';
            } else if (selected.length <= 2) {
              input.value = selected.join(', ');
            } else {
              input.value = `${selected.length} selected`;
            }
          }

          // Inicializar resumen si ya hay valores
          if (Array.isArray(getModuleFilterValues()[selectedColumn])) {
            selectedSet = new Set(getModuleFilterValues()[selectedColumn]);
            updateInputSummary();
          }

          filterDiv.appendChild(dropdownWrapper);
        }

        // Add remove filter functionality
        headerDiv.querySelector('.remove-filter-btn').addEventListener('click', () => {
          // Remove filter values
          if (type === 'date') {
            const updated = { ...getModuleFilterValues() };
            delete updated[`${selectedColumn}_start`];
            delete updated[`${selectedColumn}_end`];
            delete updated[`${selectedColumn}_empty`];
            setModuleFilterValues(updated);
          } else {
            const updated = { ...getModuleFilterValues() };
            delete updated[selectedColumn];
            setModuleFilterValues(updated);
          }
          // --- ACTUALIZAR activeFilters al eliminar filtro ---
          const updatedFilters = { ...getModuleActiveFilters() };
          delete updatedFilters[selectedColumn];
          setModuleActiveFilters(updatedFilters);
          filterDiv.remove();
          updateActiveFiltersSummary();
          applyFilters();
        });

        filterDiv.insertBefore(headerDiv, filterDiv.firstChild);
        filterContainer.appendChild(filterDiv);
        input.value = ""; // Limpiar el input tras añadir el filtro
        input.classList.remove("invalid");
      });

      // Limpiar el input al perder el foco si no es válido
      input.addEventListener("blur", () => {
        const value = input.value.trim();
        if (value && !cols.includes(value)) {
          input.value = "";
          input.classList.remove("invalid");
        }
      });

      selectorDiv.appendChild(input);
      selectorDiv.appendChild(dropdown);
      container.appendChild(selectorDiv);
      container.appendChild(filterContainer);
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
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'no-filters-message';
        emptyMessage.textContent = 'No active filters';
        list.appendChild(emptyMessage);
        return;
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
          const tag = document.createElement('div');
          tag.className = 'filter-tag';
          let text = `${column}: `;
          if (filter.start) text += `from ${filter.start}`;
          if (filter.end) text += ` to ${filter.end}`;
          if (filter.empty) text += ' (including empty)';
          tag.innerHTML = `
            <span>${text}</span>
            <button class="remove-filter-tag" data-column="${column}">×</button>
          `;
          list.appendChild(tag);
        }
      });
      // Add other filters
      Object.entries(otherFilters).forEach(([column, values]) => {
        if (Array.isArray(values) && values.length > 0) {
          const tag = document.createElement('div');
          tag.className = 'filter-tag';
          tag.innerHTML = `
            <span>${column}: ${values.join(', ')}</span>
            <button class="remove-filter-tag" data-column="${column}">×</button>
          `;
          list.appendChild(tag);
        }
      });
      // Add remove functionality to tags
      list.querySelectorAll('.remove-filter-tag').forEach(btn => {
        btn.addEventListener('click', () => {
          const column = btn.dataset.column;
          if (column in dateFilters) {
            const updated = { ...getModuleFilterValues() };
            delete updated[`${column}_start`];
            delete updated[`${column}_end`];
            delete updated[`${column}_empty`];
            setModuleFilterValues(updated);
            const filterItem = document.querySelector(`.filter-item[data-column="${column}"]`);
            if (filterItem) {
              filterItem.querySelectorAll('input[type="date"]').forEach(input => input.value = '');
              filterItem.querySelectorAll('.filter-checkbox').forEach(checkbox => checkbox.checked = false);
            }
          } else {
            const updated = { ...getModuleFilterValues() };
            delete updated[column];
            setModuleFilterValues(updated);
            const filterItem = document.querySelector(`.filter-item[data-column="${column}"]`);
            if (filterItem) {
              const input = filterItem.querySelector('.filter-input');
              if (input) input.value = '';
            }
          }
          const filterItem = document.querySelector(`.filter-item[data-column="${column}"]`);
          if (filterItem) filterItem.remove();
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
    function saveMyFilter(name) {
      const headers = Object.keys(getOriginalData()[0] || {});
      const headerHash = getHeaderHash(headers);
      const filters = loadMyFilters();
      filters[name] = { filterValues: { ...getModuleFilterValues() }, headerHash, headers };
      localStorage.setItem('myFilters', JSON.stringify(filters));
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
    }
    function applyMyFilter(name) {
      const filters = loadMyFilters();
      const headers = Object.keys(getOriginalData()[0] || {});
      const headerHash = getHeaderHash(headers);
      const filterObj = filters[name];
      if (filterObj) {
        // Check if current headers match the saved filter's headers (not just hash)
        const savedHeaders = filterObj.headers || [];
        const sameColumns = headers.length === savedHeaders.length && headers.every((col, i) => col === savedHeaders[i]);
        if (!sameColumns) {
          alert('This filter does not match the current CSV columns.');
          return;
        }
        if (filterObj.headerHash === headerHash) {
          setModuleFilterValues({ ...filterObj.filterValues });
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
        } else {
          alert('This filter does not match the current CSV columns.');
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
      const headers = Object.keys(getOriginalData()[0] || {});
      const headerHash = getHeaderHash(headers);
      const list = document.createElement('div');
      list.className = 'my-filters-list';
      let hasAny = false;
      Object.entries(filters).forEach(([name, obj]) => {
        if (obj.headerHash !== headerHash) return;
        hasAny = true;
        const item = document.createElement('div');
        item.className = 'my-filter-item';
        const label = document.createElement('span');
        label.textContent = name;
        label.className = 'my-filter-name';
        const applyBtn = document.createElement('button');
        applyBtn.textContent = 'Apply';
        applyBtn.className = 'my-filter-apply-btn';
        applyBtn.addEventListener('click', () => applyMyFilter(name));
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.className = 'my-filter-delete-btn';
        deleteBtn.addEventListener('click', () => deleteMyFilter(name));
        item.appendChild(label);
        item.appendChild(applyBtn);
        item.appendChild(deleteBtn);
        list.appendChild(item);
      });
      if (!hasAny) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'my-filters-empty';
        emptyMsg.textContent = 'No saved filters for this CSV.';
        list.appendChild(emptyMsg);
      }
      section.appendChild(list);
    }

    // Cambia el nombre de la pestaña 'Generic' por 'By Ref/Status'
    const genericTab = document.querySelector('.filter-tab[data-target="generic"]');
    if (genericTab) genericTab.textContent = 'By Ref/Status';
  } catch (error) {
    console.error('Error generating filter sidebar:', error);
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
    
    if (!data || !data.length) {
        console.warn('No data available for filtering');
        return [];
    }

    let filteredData = [...data];

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
                    if (empty && value === "") return true;
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
            filteredData = filteredData.filter(row => {
                const cellValue = row[column];
                if (cellValue === null || cellValue === undefined) return false;
                if (Array.isArray(value)) {
                    if (value.includes('__EMPTY__') && (cellValue === '' || cellValue === null || cellValue === undefined)) {
                        return true;
                    }
                    return value.includes(cellValue?.toString());
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
        filteredData = filteredData.filter(row => {
            const cellValue = row[column];
            if (cellValue === null || cellValue === undefined) return false;
            if (Array.isArray(value)) {
                if (value.includes('__EMPTY__') && (cellValue === '' || cellValue === null || cellValue === undefined)) {
                    return true;
                }
                return value.includes(cellValue?.toString());
            }
            return true;
        });
    });

    // --- FILTRO GLOBAL ---
    const globalSearch = moduleFilterValues['__globalSearch'];
    if (globalSearch && typeof globalSearch === 'string' && globalSearch.trim()) {
        const term = globalSearch.trim().toLowerCase();
        filteredData = filteredData.filter(row =>
            Object.values(row).some(val => (val || '').toString().toLowerCase().includes(term))
        );
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
    const headers = Object.keys(initialData[0] || {});
    generateFilterSidebar(headers);
    setupFilterTabs();
    applyFilters();
  }

  return instance;
}

export function resetFilterManager() {
  setModuleActiveFilters({});
  setModuleFilterValues({});
  document.querySelectorAll('.filter-input').forEach(input => { input.value = ''; });
  document.querySelectorAll('.filter-input[type="date"]').forEach(input => { input.value = ''; });
  document.querySelectorAll('.filter-checkbox').forEach(checkbox => { checkbox.checked = false; });
  document.querySelectorAll('.filter-item').forEach(item => { item.remove(); });
  document.querySelectorAll('.column-selector').forEach(select => { select.value = ''; });
  
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
}

// --- Render active filter chips above the table ---
export function renderActiveFiltersSummaryChips() {
  const summary = document.getElementById('activeFiltersSummary');
  if (!summary) return;
  summary.innerHTML = '';
  const filterValues = getModuleFilterValues();
  if (Object.keys(filterValues).length === 0) {
    summary.style.display = 'none';
    updateFilterButtonBadge(0);
    return;
  }
  summary.style.display = '';

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
      const tag = document.createElement('div');
      tag.className = 'filter-tag';
      let text = `${column}: `;
      if (filter.start) text += `from ${filter.start}`;
      if (filter.end) text += ` to ${filter.end}`;
      if (filter.empty) text += ' (empty)';
      tag.innerHTML = `
        <span>${text}</span>
        <button class="filter-tag-remove" data-column="${column}">×</button>
      `;
      summary.appendChild(tag);
    }
  });
  // Other filters
  Object.entries(otherFilters).forEach(([column, values]) => {
    if (Array.isArray(values) && values.length > 0) {
      count++;
      const tag = document.createElement('div');
      tag.className = 'filter-tag';
      tag.innerHTML = `
        <span>${column}: ${values.join(', ')}</span>
        <button class="filter-tag-remove" data-column="${column}">×</button>
      `;
      summary.appendChild(tag);
    }
  });
  updateFilterButtonBadge(count);

  // Remove filter on chip click
  summary.querySelectorAll('.filter-tag-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const column = btn.dataset.column;
      if (column in dateFilters) {
        const updated = { ...getModuleFilterValues() };
        delete updated[`${column}_start`];
        delete updated[`${column}_end`];
        delete updated[`${column}_empty`];
        setModuleFilterValues(updated);
        const filterItem = document.querySelector(`.filter-item[data-column="${column}"]`);
        if (filterItem) {
          filterItem.querySelectorAll('input[type="date"]').forEach(input => input.value = '');
          filterItem.querySelectorAll('.filter-checkbox').forEach(checkbox => checkbox.checked = false);
        }
      } else {
        const updated = { ...getModuleFilterValues() };
        delete updated[column];
        setModuleFilterValues(updated);
        const filterItem = document.querySelector(`.filter-item[data-column="${column}"]`);
        if (filterItem) {
          const input = filterItem.querySelector('.filter-input');
          if (input) input.value = '';
        }
      }
      const filterItem = document.querySelector(`.filter-item[data-column="${column}"]`);
      if (filterItem) filterItem.remove();
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
function saveQuickFilter(name) {
  const headers = Object.keys(getOriginalData()[0] || {});
  const filterValues = { ...getModuleFilterValues() };
  const quickFilters = loadQuickFilters();
  quickFilters[name] = { filterValues, headers };
  localStorage.setItem('quickFilters', JSON.stringify(quickFilters));
}
function applyQuickFilter(name) {
  const quickFilters = loadQuickFilters();
  const filterObj = quickFilters[name];
  if (filterObj) {
    // Robust check: compare columns as sets, not just by order
    const currentHeaders = Object.keys(getOriginalData()[0] || {});
    const savedHeaders = filterObj.headers || [];
    const currentSet = new Set(currentHeaders);
    const savedSet = new Set(savedHeaders);
    const sameColumns = currentSet.size === savedSet.size && [...currentSet].every(col => savedSet.has(col));
    if (!sameColumns) {
      alert('This quick filter does not match the current CSV columns.');
      return;
    }
    setModuleFilterValues({ ...filterObj.filterValues });
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
    generateFilterSidebar(filterObj.headers);
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
    }
    // Cierra el dashboard si está abierto
    const dashboardPanel = document.getElementById('dashboardPanel');
    if (dashboardPanel) {
      dashboardPanel.classList.add('hidden');
    }
  }
}
function deleteQuickFilter(name) {
  const quickFilters = loadQuickFilters();
  delete quickFilters[name];
  localStorage.setItem('quickFilters', JSON.stringify(quickFilters));
}
function getFilteredData() {
  const data = getOriginalData();
  const activeFilters = getModuleActiveFilters();
  const filterValues = getModuleFilterValues();
  if (!data || !data.length) return [];
  let filteredData = [...data];
  Object.entries(activeFilters).forEach(([column, filterType]) => {
    if (filterType === 'date') {
      const start = resolveDynamicValue(filterValues[`${column}_start`]);
      const end = resolveDynamicValue(filterValues[`${column}_end`]);
      const empty = filterValues[`${column}_empty`];
      filteredData = filteredData.filter(row => {
        const value = row[column] ? row[column].trim() : "";
        if (empty && value === "") return true;
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
        if (value.includes('__EMPTY__') && (cellValue === '' || cellValue === null || cellValue === undefined)) {
          return true;
        }
        return value.includes(cellValue?.toString());
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

export { getFilteredData, loadQuickFilters, saveQuickFilter, applyQuickFilter, deleteQuickFilter, applyFilters, generateFilterSidebar, detectColumnTypes, parseFlexibleDate }; 