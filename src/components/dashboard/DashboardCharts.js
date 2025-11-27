// Dashboard Charts - Gráficas dinámicas ligadas a Quick Filters
// Chart.js se carga como script global en el HTML
// No se necesita registrar nada, Chart.js UMD ya incluye todo

class DashboardCharts {
  constructor() {
    this.charts = new Map();
    this.snapshots = new Map();
    this.autoSnapshotEnabled = true;
    this.init();
  }

  async init() {
    // Cargar snapshots existentes
    await this.loadSnapshots();
    
    // Configurar snapshot automático diario
    if (this.autoSnapshotEnabled) {
      this.setupDailySnapshot();
    }
  }

  // 📸 SNAPSHOTS DIARIOS
  async setupDailySnapshot() {
    const lastSnapshot = localStorage.getItem('lastSnapshotDate');
    const today = new Date().toDateString();
    
    // Si no hay snapshot de hoy, crear uno
    if (lastSnapshot !== today) {
      setTimeout(() => this.createDailySnapshot(), 2000); // Esperar a que carguen datos
    }
    
    // Programar próximo snapshot (cada 24h)
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0); // Medianoche
    
    const msUntilTomorrow = tomorrow.getTime() - now.getTime();
    setTimeout(() => {
      this.createDailySnapshot();
      setInterval(() => this.createDailySnapshot(), 24 * 60 * 60 * 1000); // Cada 24h
    }, msUntilTomorrow);
  }

  async createDailySnapshot() {
    try {
      const data = window.getOriginalData?.() || [];
      if (!data.length) return;

      const snapshot = {
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        timestamp: Date.now(),
        totalRecords: data.length,
        metrics: this.calculateMetrics(data),
        quickFiltersSnapshot: this.captureQuickFiltersState(),
        weekNumber: this.getWeekNumber(new Date())
      };

      // Guardar snapshot
      const snapshotKey = `snapshot_${snapshot.date}`;
      localStorage.setItem(snapshotKey, JSON.stringify(snapshot));
      localStorage.setItem('lastSnapshotDate', new Date().toDateString());
      
      // Actualizar cache
      this.snapshots.set(snapshot.date, snapshot);
      
      console.log(`📸 Daily snapshot created for ${snapshot.date}`, snapshot);
      
      // Actualizar gráficas si están visibles
      this.updateCharts();
      
    } catch (error) {
      console.error('Error creating daily snapshot:', error);
    }
  }

  calculateMetrics(data) {
    if (!data.length) return {};

    const metrics = {
      total: data.length,
      byStatus: {},
      byUrgency: {},
      byZone: {},
      byMonth: {},
      trends: {}
    };

    // Detectar columnas importantes
    const headers = Object.keys(data[0]);
    const statusCol = headers.find(h => 
      h.toLowerCase().includes('status') || 
      h.toLowerCase().includes('estado')
    );
    const urgencyCol = headers.find(h => 
      h.toLowerCase().includes('urgenc') || 
      h.toLowerCase().includes('priority')
    );
    const zoneCol = headers.find(h => 
      h.toLowerCase().includes('zone') || 
      h.toLowerCase().includes('zona')
    );

    // Calcular métricas por categorías
    data.forEach(row => {
      // Por Status
      if (statusCol && row[statusCol]) {
        const status = row[statusCol];
        metrics.byStatus[status] = (metrics.byStatus[status] || 0) + 1;
      }

      // Por Urgencia
      if (urgencyCol && row[urgencyCol]) {
        const urgency = row[urgencyCol];
        metrics.byUrgency[urgency] = (metrics.byUrgency[urgency] || 0) + 1;
      }

      // Por Zona
      if (zoneCol && row[zoneCol]) {
        const zone = row[zoneCol];
        metrics.byZone[zone] = (metrics.byZone[zone] || 0) + 1;
      }

      // Por mes (buscar columnas de fecha)
      headers.forEach(header => {
        if (this.isDateColumn(header) && row[header]) {
          const date = new Date(row[header]);
          if (!isNaN(date.getTime())) {
            const month = date.toISOString().slice(0, 7); // YYYY-MM
            metrics.byMonth[month] = (metrics.byMonth[month] || 0) + 1;
          }
        }
      });
    });

    return metrics;
  }

  captureQuickFiltersState() {
    const activeFilters = window.activeDashboardQuickFilters || [];
    const quickFilters = window.loadQuickFilters?.() || {};
    
    return {
      active: activeFilters,
      count: activeFilters.length,
      filters: activeFilters.map(name => ({
        name,
        config: quickFilters[name] || null
      }))
    };
  }

  // 📊 GRÁFICAS DINÁMICAS
  async renderCharts(containerId = 'dashboardChartsContainer') {
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn('Dashboard charts container not found');
      return;
    }

    // Limpiar gráficas existentes
    this.destroyAllCharts();
    container.innerHTML = '';

    // Crear grid de gráficas usando Chart.js
    container.innerHTML = `
      <div class="dashboard-charts-grid">
        <div class="chart-card">
          <h4>📈 Tendencia Diaria</h4>
          <canvas id="trendChart"></canvas>
        </div>
        <div class="chart-card">
          <h4>📊 Status Actual</h4>
          <canvas id="statusChart"></canvas>
        </div>
        <div class="chart-card">
          <h4>🚨 Urgencias</h4>
          <canvas id="urgencyChart"></canvas>
        </div>
        <div class="chart-card">
          <h4>🌍 Distribución por Zona</h4>
          <canvas id="zoneChart"></canvas>
        </div>
      </div>
    `;

    // Renderizar cada gráfica
    await this.renderTrendChart();
    await this.renderStatusChart();
    await this.renderUrgencyChart();
    await this.renderZoneChart();
  }

  async renderTrendChart() {
    const ctx = document.getElementById('trendChart');
    if (!ctx || !window.Chart) return;

    const snapshots = Array.from(this.snapshots.values())
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-30); // Últimos 30 días

    const data = {
      labels: snapshots.map(s => s.date),
      datasets: [{
        label: 'Total Records',
        data: snapshots.map(s => s.totalRecords),
        borderColor: '#47B2E5',
        backgroundColor: 'rgba(71, 178, 229, 0.1)',
        tension: 0.4,
        fill: true
      }]
    };

    this.charts.set('trend', new window.Chart(ctx, {
      type: 'line',
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    }));
  }

  async renderStatusChart() {
    const ctx = document.getElementById('statusChart');
    if (!ctx || !window.Chart) return;

    const currentData = window.getFilteredData?.() || window.getOriginalData?.() || [];
    const metrics = this.calculateMetrics(currentData);

    const statusData = metrics.byStatus || {};
    const labels = Object.keys(statusData);
    const values = Object.values(statusData);

    if (!labels.length) return;

    this.charts.set('status', new window.Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: [
            '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    }));
  }

  async renderUrgencyChart() {
    const ctx = document.getElementById('urgencyChart');
    if (!ctx || !window.Chart) return;

    const currentData = window.getFilteredData?.() || window.getOriginalData?.() || [];
    const metrics = this.calculateMetrics(currentData);

    const urgencyData = metrics.byUrgency || {};
    const labels = Object.keys(urgencyData);
    const values = Object.values(urgencyData);

    if (!labels.length) return;

    this.charts.set('urgency', new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: labels.map(label => {
            const l = label.toLowerCase();
    if (l.includes('critical') || l.includes('urgent') || l.includes('alta')) return '#EF4444';
    if (l.includes('warning') || l.includes('medium') || l.includes('media')) return '#F59E0B';
            return '#10B981';
          })
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    }));
  }

  async renderZoneChart() {
    const ctx = document.getElementById('zoneChart');
    if (!ctx || !window.Chart) return;

    const currentData = window.getFilteredData?.() || window.getOriginalData?.() || [];
    const metrics = this.calculateMetrics(currentData);

    const zoneData = metrics.byZone || {};
    const labels = Object.keys(zoneData);
    const values = Object.values(zoneData);

    if (!labels.length) return;

    this.charts.set('zone', new window.Chart(ctx, {
      type: 'polarArea',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: [
            'rgba(71, 178, 229, 0.8)',
            'rgba(16, 185, 129, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(139, 92, 246, 0.8)'
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    }));
  }

  // 🔄 ACTUALIZACIÓN EN TIEMPO REAL
  updateCharts() {
    // Actualizar gráficas cuando cambien los filtros
    if (this.charts.has('status')) {
      this.renderStatusChart();
    }
    if (this.charts.has('urgency')) {
      this.renderUrgencyChart();
    }
    if (this.charts.has('zone')) {
      this.renderZoneChart();
    }
  }

  // 🗑️ GESTIÓN DE MEMORIA
  destroyAllCharts() {
    this.charts.forEach(chart => {
      if (chart && typeof chart.destroy === 'function') {
        chart.destroy();
      }
    });
    this.charts.clear();
  }

  // 📈 UTILIDADES
  async loadSnapshots() {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('snapshot_'));
    keys.forEach(key => {
      try {
        const snapshot = JSON.parse(localStorage.getItem(key));
        this.snapshots.set(snapshot.date, snapshot);
      } catch (e) {
        console.warn('Error loading snapshot:', key, e);
      }
    });
  }

  getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  isDateColumn(header) {
    const dateKeywords = ['date', 'fecha', 'time', 'created', 'updated', 'eta', 'etd'];
    return dateKeywords.some(keyword => 
      header.toLowerCase().includes(keyword)
    );
  }

  // 🎛️ API PÚBLICA
  enableAutoSnapshot() {
    this.autoSnapshotEnabled = true;
    this.setupDailySnapshot();
  }

  disableAutoSnapshot() {
    this.autoSnapshotEnabled = false;
  }

  async forceSnapshot() {
    return this.createDailySnapshot();
  }

  getSnapshots() {
    return Array.from(this.snapshots.values());
  }

  clearOldSnapshots(daysToKeep = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    this.snapshots.forEach((snapshot, date) => {
      if (new Date(date) < cutoffDate) {
        this.snapshots.delete(date);
        localStorage.removeItem(`snapshot_${date}`);
      }
    });
  }
}

// Instancia global
export const dashboardCharts = new DashboardCharts();

// Funciones de conveniencia para usar desde main.js
export function renderDashboardCharts(containerId) {
  return dashboardCharts.renderCharts(containerId);
}

export function updateDashboardCharts() {
  dashboardCharts.updateCharts();
}

export function createManualSnapshot() {
  return dashboardCharts.forceSnapshot();
}

export function getDashboardSnapshots() {
  return dashboardCharts.getSnapshots();
} 