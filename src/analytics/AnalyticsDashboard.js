// Analytics Dashboard - Sistema de análisis con gráficas y snapshots independiente
import { ChartsManager } from './ChartsManager.js';
import { SnapshotsManager } from './SnapshotsManager.js';
import { KpiCalculator } from './KpiCalculator.js';

class AnalyticsDashboard {
  constructor() {
    this.isVisible = false;
    this.chartsManager = new ChartsManager();
    this.snapshotsManager = new SnapshotsManager();
    this.kpiCalculator = new KpiCalculator();
    this.charts = new Map(); // Initialize charts Map for direct chart creation
    this.refreshInterval = null;
    
    // Configuración de métricas seleccionadas por el usuario
    this.selectedMetrics = this.loadSelectedMetrics();
    
    this.init();
  }

  // INICIALIZACIÓN
  init() {
    // Esperar a que el DOM esté cargado
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
    } else {
      this.setupEventListeners();
    }
  }

  setupEventListeners() {
    // Botón para abrir/cerrar dashboard
    const dashboardBtn = document.getElementById('analyticsBtn');
    if (dashboardBtn) {
      dashboardBtn.addEventListener('click', () => this.toggle());
    }

    // Botón de cerrar dentro del panel
    const closeBtn = document.getElementById('analyticsDashboardCloseBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }

    // Cerrar al hacer clic en el overlay
    const overlay = document.getElementById('analyticsDashboardOverlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.hide();
        }
      });
    }

    // Botón de snapshot manual
    const snapshotBtn = document.getElementById('analyticsSnapshotBtn');
    if (snapshotBtn) {
      snapshotBtn.addEventListener('click', () => this.createManualSnapshot());
    }

    // Botón de exportar análisis
    const exportBtn = document.getElementById('analyticsExportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportAnalysis());
    }

    // Botón de configuración
    const configBtn = document.getElementById('analyticsConfigBtn');
    if (configBtn) {
      configBtn.addEventListener('click', () => this.showConfiguration());
    }

    // CONECTAR CON FILTROS DEL OPS HUB
    // Escuchar cambios en filtros para actualizar gráficas
    window.addEventListener('filtersChanged', () => this.onFiltersChanged());
    window.addEventListener('dataChanged', () => this.onDataChanged());
    
    // Escuchar cambios específicos de quick filters del Ops Hub
    const observer = new MutationObserver(() => {
      if (this.isVisible) {
        this.onQuickFiltersChanged();
      }
    });
    
    // Observar cambios en el contenedor de quick filters
    const quickFiltersContainer = document.querySelector('.quickfilters-grid');
    if (quickFiltersContainer) {
      observer.observe(quickFiltersContainer, { 
        childList: true, 
        subtree: true, 
        attributes: true,
        attributeFilter: ['class', 'style']
      });
    }

    // También observar cambios en los chips de filtros activos
    const filterChipsBar = document.getElementById('opsHubFilterChipsBar');
    if (filterChipsBar) {
      observer.observe(filterChipsBar, { 
        childList: true, 
        subtree: true,
        attributes: true 
      });
    }
  }

  // CONTROL DEL PANEL
  show() {
    const overlay = document.getElementById('analyticsDashboardOverlay');
    
    if (overlay) {
      overlay.classList.remove('hidden');
      this.isVisible = true;
      
      // Asegurarse de que el panel esté completamente visible antes de inicializar
      setTimeout(() => {
        this.initializeDashboard();
        
        // Configurar refresh automático cada 30 segundos cuando está abierto
        this.refreshInterval = setInterval(() => {
          if (this.isVisible) {
            this.refreshDashboard();
          }
        }, 30000);
      }, 500);
    }
  }

  hide() {
    const overlay = document.getElementById('analyticsDashboardOverlay');
    
    if (overlay) {
      overlay.classList.add('hidden');
      this.isVisible = false;
      
      // Limpiar interval de refresh
      if (this.refreshInterval) {
        clearInterval(this.refreshInterval);
        this.refreshInterval = null;
      }
      
      // Limpiar gráficas para liberar memoria
      this.chartsManager.destroyAll();
      
      // Limpiar charts Map
      this.charts.forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
          chart.destroy();
        }
      });
      this.charts.clear();
    }
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  // INICIALIZACIÓN DEL DASHBOARD
  async initializeDashboard() {
    try {
      console.log('Starting Analytics Dashboard initialization...');
      
      // Mostrar indicador de carga
      this.showLoading();

      // Esperar a que Chart.js esté disponible
      await this.waitForChartJS();

      const originalData = window.getOriginalData?.() || [];
      console.log('Original data loaded:', originalData.length, 'records');

      if (!originalData.length) {
        console.log('No data available');
        this.showNoDataMessage();
        return;
      }

      // OBTENER TODOS LOS QUICK FILTERS GUARDADOS
      const allQuickFilters = window.loadQuickFilters?.() || {};
      const quickFilterNames = Object.keys(allQuickFilters);
      console.log('Found quick filters:', quickFilterNames.length, quickFilterNames);

      // Verificar que el contenedor de gráficas existe
      const chartsContainer = document.getElementById('analyticsChartsContainer');
      console.log('Charts container found:', !!chartsContainer, chartsContainer?.offsetParent !== null ? 'visible' : 'hidden');

      // GENERAR ANÁLISIS PARA CADA QUICK FILTER + DATOS ORIGINALES
      console.log('Rendering components...');
      await Promise.all([
        this.renderOverallKpis(originalData),
        this.renderFiltersInfo(),
        this.renderQuickFiltersAnalysis(originalData, allQuickFilters),
        this.renderSnapshotsSummary(),
        this.renderQuickActions()
      ]);

      this.hideLoading();
      console.log('Analytics Dashboard initialized successfully');

    } catch (error) {
      console.error('Error initializing Analytics Dashboard:', error);
      this.showErrorMessage(error.message);
    }
  }

  // ESPERAR A QUE CHART.JS ESTÉ DISPONIBLE
  async waitForChartJS(maxAttempts = 50) {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      
      const checkChartJS = () => {
        attempts++;
        console.log(`Checking Chart.js availability (attempt ${attempts}/${maxAttempts})`);
        
        if (window.Chart && typeof window.Chart === 'function') {
          console.log('Chart.js is available');
          resolve();
          return;
        }
        
        if (attempts >= maxAttempts) {
          reject(new Error('Chart.js failed to load after maximum attempts'));
          return;
        }
        
        setTimeout(checkChartJS, 100);
      };
      
      checkChartJS();
    });
  }

  // APLICAR QUICK FILTERS A LOS DATOS
  applyQuickFiltersToData(originalData, activeQuickFilters) {
    if (!activeQuickFilters.length || !originalData.length) return originalData;
    
    try {
      const quickFilters = window.loadQuickFilters?.() || {};
      let filteredData = [...originalData];
      
      // Combinar todos los filtros activos
      let combinedFilterValues = {};
      let combinedActiveFilters = {};
      
      activeQuickFilters.forEach(filterName => {
        const filterObj = quickFilters[filterName];
        if (filterObj && filterObj.filterValues) {
          Object.keys(filterObj.filterValues).forEach(key => {
            const value = filterObj.filterValues[key];
            if (combinedFilterValues[key]) {
              // Combinar valores si ya existe
              if (Array.isArray(combinedFilterValues[key]) || Array.isArray(value)) {
                const arr1 = Array.isArray(combinedFilterValues[key]) ? combinedFilterValues[key] : [combinedFilterValues[key]];
                const arr2 = Array.isArray(value) ? value : [value];
                combinedFilterValues[key] = Array.from(new Set([...arr1, ...arr2]));
                combinedActiveFilters[key] = 'categorical';
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
          });
        }
      });
      
      // Aplicar filtros combinados
      Object.entries(combinedActiveFilters).forEach(([column, filterType]) => {
        const value = combinedFilterValues[column];
        if (!value || (Array.isArray(value) && value.length === 0)) return;
        
        filteredData = filteredData.filter(row => {
          const cellValue = row[column];
          if (cellValue === null || cellValue === undefined) return false;
          
          if (Array.isArray(value)) {
            const isEmpty = (cellValue === '' || cellValue === null || cellValue === undefined);
            const hasEmpty = value.includes('__EMPTY__');
            const hasNoEmpty = value.includes('__NO_EMPTY__');
            const otherValues = value.filter(v => v !== '__EMPTY__' && v !== '__NO_EMPTY__');
            
            // Verificar modo exclusión (si está disponible en el contexto)
            const isExcludeMode = (combinedFilterValues._exclude && combinedFilterValues._exclude[column]) || false;
            
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
              return cellValue.toString().toLowerCase().includes(value.toLowerCase());
            case 'categorical':
              const selectedValues = value.split(',').map(v => v.trim());
              return selectedValues.includes(cellValue.toString());
            default:
              return true;
          }
        });
      });
      
      console.log('Quick filters applied:', activeQuickFilters.length, 'filters, result:', filteredData.length, 'records');
      return filteredData;
      
    } catch (error) {
      console.error('Error applying quick filters:', error);
      return originalData;
    }
  }

  // RENDERIZADO DE KPIs GENERALES
  async renderOverallKpis(originalData) {
    const container = document.getElementById('analyticsKpis');
    if (!container) return;

    const kpis = this.kpiCalculator.calculate(originalData, originalData);
    const allQuickFilters = window.loadQuickFilters?.() || {};
    const quickFilterCount = Object.keys(allQuickFilters).length;
    
    container.innerHTML = `
      <div class="analytics-kpis-grid">
        <div class="analytics-kpi-card primary">
          <div class="kpi-content">
            <div class="kpi-value">${kpis.totalRecords.toLocaleString()}</div>
            <div class="kpi-label">Total Records</div>
            <div class="kpi-change ${kpis.totalChange >= 0 ? 'positive' : 'negative'}">
              ${kpis.totalChange >= 0 ? '↗' : '↘'} ${Math.abs(kpis.totalChange)}% vs yesterday
            </div>
          </div>
        </div>

        <div class="analytics-kpi-card ${kpis.urgentCount > 0 ? 'urgent' : 'success'}">
          <div class="kpi-content">
            <div class="kpi-value">${kpis.urgentCount}</div>
            <div class="kpi-label">Urgent Items</div>
            <div class="kpi-change ${kpis.urgentChange <= 0 ? 'positive' : 'negative'}">
              ${kpis.urgentChange <= 0 ? '↘' : '↗'} ${Math.abs(kpis.urgentChange)}% vs yesterday
            </div>
          </div>
        </div>

        <div class="analytics-kpi-card success">
          <div class="kpi-content">
            <div class="kpi-value">${kpis.completionRate}%</div>
            <div class="kpi-label">Completion Rate</div>
            <div class="kpi-change ${kpis.completionChange >= 0 ? 'positive' : 'negative'}">
              ${kpis.completionChange >= 0 ? '↗' : '↘'} ${Math.abs(kpis.completionChange)}% vs yesterday
            </div>
          </div>
        </div>

        <div class="analytics-kpi-card info">
          <div class="kpi-content">
            <div class="kpi-value">${quickFilterCount}</div>
            <div class="kpi-label">Quick Filters</div>
            <div class="kpi-change">
              Ready for analysis
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ANÁLISIS AUTOMÁTICO DE QUICK FILTERS
  async renderQuickFiltersAnalysis(originalData, allQuickFilters) {
    const container = document.getElementById('analyticsChartsContainer');
    if (!container) return;

    const quickFilterNames = Object.keys(allQuickFilters);
    
    if (quickFilterNames.length === 0) {
      container.innerHTML = `
        <div class="analytics-no-filters">
          <h3>No Quick Filters Available</h3>
          <p>Create quick filters in the Ops Hub to see automated analytics here.</p>
        </div>
      `;
      return;
    }

    // Crear grid para mostrar análisis de cada quick filter + datos originales
    container.innerHTML = `
      <div class="analytics-filters-analysis">
        <div class="analysis-header">
          <h3>Quick Filters Impact Analysis</h3>
          <p>Automatic comparison of data with each quick filter applied</p>
        </div>
        <div class="analysis-grid">
          <div class="analysis-section original-data">
            <div class="section-header">
              <h4>Original Data (All Records)</h4>
              <div class="section-stats">
                <span class="stat-item">${originalData.length.toLocaleString()} records</span>
              </div>
            </div>
            <div class="section-charts" id="originalDataCharts">
              <!-- Charts for original data -->
            </div>
          </div>
          ${quickFilterNames.map(filterName => this.createFilterAnalysisSection(filterName, originalData, allQuickFilters[filterName])).join('')}
        </div>
      </div>
    `;

    // Renderizar gráficos para datos originales
    await this.renderChartsForData(originalData, 'originalDataCharts', 'Original Data');

    // Renderizar gráficos para cada quick filter
    for (const filterName of quickFilterNames) {
      const filteredData = this.applyQuickFiltersToData(originalData, [filterName]);
      await this.renderChartsForData(filteredData, `filter_${this.sanitizeId(filterName)}_charts`, filterName);
    }
  }

  // CREAR SECCIÓN DE ANÁLISIS PARA UN FILTRO
  createFilterAnalysisSection(filterName, originalData, filterConfig) {
    const filteredData = this.applyQuickFiltersToData(originalData, [filterName]);
    const reductionPercentage = originalData.length > 0 ? 
      Math.round(((originalData.length - filteredData.length) / originalData.length) * 100) : 0;
    
    const sanitizedId = this.sanitizeId(filterName);
    
    return `
      <div class="analysis-section filter-analysis">
        <div class="section-header">
          <h4>${filterName}</h4>
          <div class="section-stats">
            <span class="stat-item">${filteredData.length.toLocaleString()} records</span>
            <span class="stat-change ${reductionPercentage > 0 ? 'reduction' : 'same'}">${reductionPercentage}% filtered</span>
          </div>
        </div>
        <div class="section-charts" id="filter_${sanitizedId}_charts">
          <!-- Charts for this filter -->
        </div>
      </div>
    `;
  }

  // UTILIDAD PARA SANITIZAR IDs
  sanitizeId(str) {
    return str.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  }

  // RENDERIZAR GRÁFICOS PARA DATOS ESPECÍFICOS
  async renderChartsForData(data, containerId, title) {
    const container = document.getElementById(containerId);
    if (!container || !data.length) {
      if (container) {
        container.innerHTML = `
          <div class="charts-no-data">
            <p>No data available for analysis</p>
          </div>
        `;
      }
      return;
    }

    // Obtener quick filters para entender qué categorías usar
    const quickFilters = window.loadQuickFilters?.() || {};
    const urgencyCards = ['Critical', 'Warning', 'Good']; // Cards de urgencia del Ops Hub
    
    // Crear tarjetas de números solo para las métricas seleccionadas
    let sectionsHtml = '';
    
    if (this.selectedMetrics.status) {
      sectionsHtml += `
        <div class="records-section">
          <h4>Status Records</h4>
          <div id="${containerId}_status_cards" class="status-cards"></div>
        </div>
      `;
    }
    
    if (this.selectedMetrics.urgency) {
      sectionsHtml += `
        <div class="records-section">
          <h4>Urgency Records</h4>
          <div id="${containerId}_urgency_cards" class="urgency-cards"></div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="analytics-config-header">
        <div class="config-title">
          <h3>Data Analysis</h3>
          <span class="config-subtitle">Choose which metrics to display</span>
        </div>
        <button id="configureMetricsBtn" class="configure-metrics-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" stroke-width="2"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" stroke-width="2"/>
          </svg>
          Configure
        </button>
      </div>
      <div class="records-cards-grid">
        ${sectionsHtml}
      </div>
    `;

    // Añadir event listener para el botón de configuración
    const configBtn = document.getElementById('configureMetricsBtn');
    if (configBtn) {
      configBtn.addEventListener('click', () => this.showMetricsConfigModal());
    }

    // Renderizar solo las tarjetas seleccionadas
    if (this.selectedMetrics.status) {
      this.renderStatusCards(data, `${containerId}_status_cards`);
    }
    if (this.selectedMetrics.urgency) {
      this.renderUrgencyCards(data, `${containerId}_urgency_cards`, urgencyCards);
    }
  }

  // RENDERIZAR TARJETAS DE STATUS
  renderStatusCards(data, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Detectar columna de status
    const headers = Object.keys(data[0] || {});
    const statusCol = headers.find(h => 
      h.toLowerCase().includes('status') || 
      h.toLowerCase().includes('estado') ||
      h.toLowerCase().includes('state')
    );

    if (!statusCol) {
      container.innerHTML = '<div class="no-data-message">No status column found</div>';
      return;
    }

    // Contar registros por status
    const statusData = {};
    data.forEach(row => {
      const status = row[statusCol]?.toString().trim() || 'Unknown';
      statusData[status] = (statusData[status] || 0) + 1;
    });

    // Crear tarjetas
    let html = '';
    Object.entries(statusData)
      .sort(([,a], [,b]) => b - a)
      .forEach(([status, count]) => {
        const percentage = ((count / data.length) * 100).toFixed(1);
        const colorClass = this.getStatusColorClass(status);
        
        html += `
          <div class="record-card ${colorClass}">
            <div class="record-number">${count.toLocaleString()}</div>
            <div class="record-label">${status}</div>
            <div class="record-percentage">${percentage}% of total</div>
          </div>
        `;
      });

    container.innerHTML = html;
  }

  // RENDERIZAR TARJETAS DE URGENCIA
  renderUrgencyCards(data, containerId, urgencyCards) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Detectar columna de urgencia
    const headers = Object.keys(data[0] || {});
    const urgencyCol = headers.find(h => 
      h.toLowerCase().includes('urgenc') || 
      h.toLowerCase().includes('priority') ||
      h.toLowerCase().includes('prioridad')
    );

    if (!urgencyCol) {
      container.innerHTML = '<div class="no-data-message">No urgency column found</div>';
      return;
    }

    // Contar registros por cada card de urgencia
    const urgencyData = {};
    urgencyCards.forEach(card => {
      urgencyData[card] = 0;
    });

    data.forEach(row => {
      const urgency = (row[urgencyCol] || '').toString().toLowerCase();
      if (urgency.includes('urgent') || urgency.includes('alta') || urgency.includes('high')) {
        urgencyData['Urgente']++;
      } else if (urgency.includes('medium') || urgency.includes('media') || urgency.includes('normal')) {
        urgencyData['Media']++;
      } else if (urgency.includes('low') || urgency.includes('baja') || urgency.includes('bajo')) {
        urgencyData['Baja']++;
      }
    });

    // Crear tarjetas
    let html = '';
    urgencyCards.forEach(card => {
      const count = urgencyData[card];
      const percentage = data.length > 0 ? ((count / data.length) * 100).toFixed(1) : 0;
      const colorClass = this.getUrgencyColorClass(card);
      
      html += `
        <div class="record-card ${colorClass}">
          <div class="record-number">${count.toLocaleString()}</div>
          <div class="record-label">${card}</div>
          <div class="record-percentage">${percentage}% of total</div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  // OBTENER CLASE DE COLOR PARA STATUS
  getStatusColorClass(status) {
    const s = status.toLowerCase();
    if (s.includes('complete') || s.includes('done') || s.includes('finish')) return 'status-complete';
    if (s.includes('progress') || s.includes('working') || s.includes('active')) return 'status-progress';
    if (s.includes('pending') || s.includes('waiting') || s.includes('new')) return 'status-pending';
    if (s.includes('cancel') || s.includes('reject') || s.includes('fail')) return 'status-error';
    return 'status-default';
  }

  // OBTENER CLASE DE COLOR PARA URGENCIA
  getUrgencyColorClass(urgency) {
    if (urgency === 'Urgente') return 'urgency-high';
    if (urgency === 'Media') return 'urgency-medium';
    if (urgency === 'Baja') return 'urgency-low';
    return 'urgency-default';
  }

  // MOSTRAR INFORMACIÓN SOBRE LOS QUICK FILTERS
  async renderFiltersInfo() {
    const container = document.getElementById('analyticsFiltersInfo');
    if (!container) return;

    const allQuickFilters = window.loadQuickFilters?.() || {};
    const quickFilterNames = Object.keys(allQuickFilters);
    
    if (quickFilterNames.length === 0) {
      container.innerHTML = `
        <div class="analytics-filters-empty">
          <div class="empty-text">No quick filters available</div>
          <div class="empty-subtext">Create quick filters in the Ops Hub to see automated analytics</div>
        </div>
      `;
      return;
    }

    const filtersHtml = quickFilterNames.map(filterName => {
      const filter = allQuickFilters[filterName];
      const filterCount = filter ? Object.keys(filter.filterValues).length : 0;
      const originalData = window.getOriginalData?.() || [];
      const filteredData = this.applyQuickFiltersToData(originalData, [filterName]);
      const impact = originalData.length > 0 ? 
        Math.round(((originalData.length - filteredData.length) / originalData.length) * 100) : 0;
      
      return `
        <div class="analytics-filter-chip">
          <div class="filter-chip-name">${filterName}</div>
          <div class="filter-chip-count">${filterCount} conditions • ${impact}% reduction</div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="analytics-filters-header">
        <h3>Available Quick Filters</h3>
        <div class="filters-count">${quickFilterNames.length} filters</div>
      </div>
      <div class="analytics-filters-list">
        ${filtersHtml}
      </div>
    `;
  }

  async renderSnapshotsSummary() {
    const container = document.getElementById('analyticsSnapshotsSummary');
    if (!container) return;

    const snapshots = this.snapshotsManager.getRecentSnapshots(7);
    const lastSnapshot = snapshots[snapshots.length - 1];
    
    container.innerHTML = `
      <div class="snapshots-summary">
        <div class="snapshots-header">
          <h4>Daily Snapshots</h4>
          <div class="snapshots-status">
            <span class="status-indicator ${lastSnapshot ? 'active' : 'inactive'}"></span>
            <span>Auto-tracking: ${this.snapshotsManager.isAutoEnabled() ? 'ON' : 'OFF'}</span>
          </div>
        </div>
        <div class="snapshots-stats">
          <div class="stat-item">
            <span class="stat-value">${snapshots.length}</span>
            <span class="stat-label">Last 7 days</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${lastSnapshot ? lastSnapshot.date : 'Never'}</span>
            <span class="stat-label">Last snapshot</span>
          </div>
        </div>
      </div>
    `;
  }

  renderQuickActions() {
    const container = document.getElementById('analyticsQuickActions');
    if (!container) return;

    container.innerHTML = `
      <div class="quick-actions-grid">
        <button class="action-btn primary" onclick="window.analyticsDashboard.createManualSnapshot()">
          <span class="action-text">Create Snapshot</span>
        </button>
        <button class="action-btn secondary" onclick="window.analyticsDashboard.exportAnalysis()">
          <span class="action-text">Export Report</span>
        </button>
        <button class="action-btn tertiary" onclick="window.analyticsDashboard.showConfiguration()">
          <span class="action-text">Settings</span>
        </button>
        <button class="action-btn info" onclick="window.analyticsDashboard.showSnapshots()">
          <span class="action-text">View History</span>
        </button>
      </div>
    `;
  }

  // EVENTOS Y ACTUALIZACIONES
  onFiltersChanged() {
    if (!this.isVisible) return;
    
    console.log('Filters changed, refreshing analytics...');
    // Reinicializar completamente el dashboard para mostrar el nuevo análisis
    this.initializeDashboard();
  }

  onDataChanged() {
    if (!this.isVisible) return;
    
    console.log('Data changed, refreshing analytics...');
    // Reinicializar todo el dashboard
    this.initializeDashboard();
  }

  // EVENTO ESPECÍFICO PARA QUICK FILTERS DEL OPS HUB
  onQuickFiltersChanged() {
    console.log('Quick filters changed, refreshing analytics...');
    if (!this.isVisible) return;
    
    // Reinicializar el dashboard para mostrar el análisis actualizado
    setTimeout(() => {
      this.initializeDashboard();
    }, 300);
  }

  // GESTIÓN DE SNAPSHOTS
  async createManualSnapshot() {
    const btn = document.getElementById('analyticsSnapshotBtn');
    const originalHtml = btn?.innerHTML;
    
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>Creating...</span>';
    }

    try {
      await this.snapshotsManager.createSnapshot();
      
      if (btn) {
        btn.innerHTML = '<span>Created!</span>';
        setTimeout(() => {
          btn.innerHTML = originalHtml;
          btn.disabled = false;
        }, 2000);
      }

      // Actualizar resumen de snapshots
      this.renderSnapshotsSummary();
      
      // Mostrar notificación
      if (window.showNotification) {
        window.showNotification('Snapshot created successfully!', 'success');
      }

    } catch (error) {
      console.error('Error creating snapshot:', error);
      
      if (btn) {
        btn.innerHTML = '<span>Error</span>';
        setTimeout(() => {
          btn.innerHTML = originalHtml;
          btn.disabled = false;
        }, 2000);
      }

      if (window.showNotification) {
        window.showNotification('Error creating snapshot', 'error');
      }
    }
  }

  // EXPORTACIÓN
  async exportAnalysis() {
    try {
      const data = window.getFilteredData?.() || window.getOriginalData?.() || [];
      const kpis = this.kpiCalculator.calculate(data, window.getOriginalData?.() || []);
      const snapshots = this.snapshotsManager.getRecentSnapshots(30);

      // Crear reporte en formato JSON para posterior procesamiento
      const report = {
        timestamp: new Date().toISOString(),
        summary: {
          totalRecords: data.length,
          analysisDate: new Date().toLocaleDateString(),
          kpis: kpis
        },
        snapshots: snapshots,
        dataPreview: data.slice(0, 10) // Primeros 10 registros como muestra
      };

      // Descargar como JSON
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      if (window.showNotification) {
        window.showNotification('Analytics report exported successfully!', 'success');
      }

    } catch (error) {
      console.error('Error exporting analysis:', error);
      if (window.showNotification) {
        window.showNotification('Error exporting report', 'error');
      }
    }
  }

  // CONFIGURACIÓN
  showConfiguration() {
    alert('Analytics Configuration (Coming Soon)\n\nFeatures available:\n- Auto-snapshot settings\n- Chart customization\n- Export formats\n- Data retention');
  }

  showSnapshots() {
    const snapshots = this.snapshotsManager.getStatistics();
    alert(`Snapshots History\n\nTotal snapshots: ${snapshots.total}\nOldest: ${snapshots.oldest || 'None'}\nNewest: ${snapshots.newest || 'None'}\nAverage records: ${snapshots.averageRecords}\n\nFull history viewer coming soon!`);
  }

  // ESTADOS DE UI
  showLoading() {
    const container = document.getElementById('analyticsDashboardContent');
    console.log('showLoading - Container found:', !!container);
    if (container) {
      // No reemplazar el HTML, solo añadir una clase de loading
      container.classList.add('analytics-loading-state');
      
      // Verificar que los contenedores de componentes existen
      const kpisContainer = document.getElementById('analyticsKpis');
      const chartsContainer = document.getElementById('analyticsChartsContainer');
      const snapshotsContainer = document.getElementById('analyticsSnapshotsSummary');
      const actionsContainer = document.getElementById('analyticsQuickActions');
      
      console.log('Component containers:', {
        kpis: !!kpisContainer,
        charts: !!chartsContainer,
        snapshots: !!snapshotsContainer,
        actions: !!actionsContainer
      });
      
      // Solo añadir loading overlay si los contenedores no existen
      if (!chartsContainer) {
        container.innerHTML = `
          <div class="analytics-loading">
            <div class="loading-spinner"></div>
            <p>Loading analytics...</p>
          </div>
        `;
      }
    }
  }

  hideLoading() {
    const container = document.getElementById('analyticsDashboardContent');
    if (container) {
      container.classList.remove('analytics-loading-state');
      // Remover el loading overlay si existe
      const loadingDiv = container.querySelector('.analytics-loading');
      if (loadingDiv) {
        loadingDiv.remove();
      }
    }
    console.log('hideLoading - Loading state removed');
  }

  showNoDataMessage() {
    const container = document.getElementById('analyticsDashboardContent');
    if (container) {
      container.innerHTML = `
        <div class="analytics-no-data">
          <h3>No Data Available</h3>
          <p>Please load a CSV file to start analyzing your data.</p>
        </div>
      `;
    }
  }

  showErrorMessage(message) {
    const container = document.getElementById('analyticsDashboardContent');
    if (container) {
      container.innerHTML = `
        <div class="analytics-error">
          <h3>Error Loading Analytics</h3>
          <p>${message}</p>
          <button onclick="window.analyticsDashboard.initializeDashboard()" class="retry-btn">
            Try Again
          </button>
        </div>
      `;
    }
  }

  // API PÚBLICA
  isOpen() {
    return this.isVisible;
  }

  refresh() {
    if (this.isVisible) {
      this.initializeDashboard();
    }
  }

  destroy() {
    this.chartsManager.destroyAll();
    this.snapshotsManager.cleanup();
  }

  // CARGAR MÉTRICAS SELECCIONADAS DESDE LOCALSTORAGE
  loadSelectedMetrics() {
    try {
      const saved = localStorage.getItem('analyticsSelectedMetrics');
      return saved ? JSON.parse(saved) : {
        status: true,
        urgency: true
      };
    } catch (error) {
      console.error('Error loading selected metrics:', error);
      return {
        status: true,
        urgency: true
      };
    }
  }

  // GUARDAR MÉTRICAS SELECCIONADAS EN LOCALSTORAGE
  saveSelectedMetrics() {
    try {
      localStorage.setItem('analyticsSelectedMetrics', JSON.stringify(this.selectedMetrics));
    } catch (error) {
      console.error('Error saving selected metrics:', error);
    }
  }

  // MOSTRAR MODAL DE CONFIGURACIÓN DE MÉTRICAS
  showMetricsConfigModal() {
    // Crear modal si no existe
    let modal = document.getElementById('metricsConfigModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'metricsConfigModal';
      modal.className = 'modal-overlay hidden';
      modal.innerHTML = `
        <div class="modal-panel" style="max-width: 500px;">
          <div class="modal-header">
            <div class="header-left">
              <img src="LOGOTAB_rounded.png" alt="Logo" class="modal-logo">
              <h3 class="panel-header-title">Configure Analytics Metrics</h3>
            </div>
            <button id="closeMetricsConfigBtn" class="close-btn">×</button>
          </div>
          <div class="modal-content">
            <p style="margin-bottom: 1.5rem; color: #666;">Choose which metrics you want to display in the Analytics Dashboard:</p>
            <div class="metrics-config-list">
              <div class="metric-config-item">
                <label class="metric-checkbox">
                  <input type="checkbox" id="statusMetric" ${this.selectedMetrics.status ? 'checked' : ''}>
                  <span class="checkmark"></span>
                  <div class="metric-info">
                    <div class="metric-name">Status Records</div>
                    <div class="metric-desc">Show record counts by status (Complete, Progress, Pending, etc.)</div>
                  </div>
                </label>
              </div>
              <div class="metric-config-item">
                <label class="metric-checkbox">
                  <input type="checkbox" id="urgencyMetric" ${this.selectedMetrics.urgency ? 'checked' : ''}>
                  <span class="checkmark"></span>
                  <div class="metric-info">
                    <div class="metric-name">Urgency Records</div>
                    <div class="metric-desc">Show record counts by urgency level (Urgent, Medium, Low)</div>
                  </div>
                </label>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button id="saveMetricsConfigBtn" class="modal-btn primary">Apply Changes</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      // Event listeners para el modal
      document.getElementById('closeMetricsConfigBtn').addEventListener('click', () => {
        modal.classList.add('hidden');
      });

      document.getElementById('saveMetricsConfigBtn').addEventListener('click', () => {
        this.saveMetricsConfiguration();
        modal.classList.add('hidden');
      });

      // Cerrar al hacer click fuera
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.add('hidden');
        }
      });
    }

    modal.classList.remove('hidden');
  }

  // GUARDAR CONFIGURACIÓN DE MÉTRICAS
  saveMetricsConfiguration() {
    this.selectedMetrics = {
      status: document.getElementById('statusMetric').checked,
      urgency: document.getElementById('urgencyMetric').checked,
      zones: document.getElementById('zonesMetric').checked
    };

    this.saveSelectedMetrics();
    
    // Refrescar el dashboard con la nueva configuración
    this.refreshDashboard();
    
    // Mostrar notificación
    this.showNotification('Analytics configuration updated successfully!', 'success');
  }

  // REFRESCAR DASHBOARD CON NUEVA CONFIGURACIÓN
  refreshDashboard() {
    if (this.isOpen && window.currentData && window.currentData.length > 0) {
      this.renderChartsForData(window.currentData, 'analyticsChartsContainer', 'Current Data Analysis');
    }
  }

  // MOSTRAR NOTIFICACIÓN
  showNotification(message, type = 'info') {
    if (typeof window.showUnifiedNotification === 'function') {
      window.showUnifiedNotification(message, type);
    } else {
      // Fallback simple
      console.log(`Notification [${type}]:`, message);
    }
  }
}

// Crear instancia global cuando se importe el módulo
console.log('Initializing Analytics Dashboard...');
const analyticsDashboard = new AnalyticsDashboard();
window.analyticsDashboard = analyticsDashboard;

export default analyticsDashboard; 