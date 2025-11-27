// Charts Manager - Gestión de gráficas para Analytics Dashboard

export class ChartsManager {
  constructor() {
    this.charts = new Map();
    this.containerId = 'analyticsChartsContainer';
  }

  // 📊 RENDERIZADO PRINCIPAL
  async renderCharts(data) {
    // Esperar un momento para que el contenedor esté disponible
    await this.waitForContainer();
    
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.warn('Analytics charts container not found:', this.containerId);
      return;
    }

    // Limpiar gráficas existentes
    this.destroyAll();
    
    if (!data.length) {
      container.innerHTML = `
        <div class="charts-no-data">
          <p>No data available for charts</p>
        </div>
      `;
      return;
    }

    // Crear grid de gráficas
    container.innerHTML = `
      <div class="analytics-charts-grid">
        <div class="analytics-chart-card">
          <div class="chart-header">
            <h4>📈 Data Trends</h4>
            <div class="chart-actions">
              <button class="chart-action-btn" title="Refresh">🔄</button>
            </div>
          </div>
          <div class="chart-content">
            <canvas id="analyticsTrendChart"></canvas>
          </div>
        </div>

        <div class="analytics-chart-card">
          <div class="chart-header">
            <h4>📊 Status Distribution</h4>
            <div class="chart-actions">
              <button class="chart-action-btn" title="Refresh">🔄</button>
            </div>
          </div>
          <div class="chart-content">
            <canvas id="analyticsStatusChart"></canvas>
          </div>
        </div>

        <div class="analytics-chart-card">
          <div class="chart-header">
            <h4>🚨 Priority Levels</h4>
            <div class="chart-actions">
              <button class="chart-action-btn" title="Refresh">🔄</button>
            </div>
          </div>
          <div class="chart-content">
            <canvas id="analyticsUrgencyChart"></canvas>
          </div>
        </div>

        <div class="analytics-chart-card">
          <div class="chart-header">
            <h4>🌍 Geographic Distribution</h4>
            <div class="chart-actions">
              <button class="chart-action-btn" title="Refresh">🔄</button>
            </div>
          </div>
          <div class="chart-content">
            <canvas id="analyticsZoneChart"></canvas>
          </div>
        </div>
      </div>
    `;

    // Renderizar gráficas individuales
    await this.renderTrendChart(data);
    await this.renderStatusChart(data);
    await this.renderUrgencyChart(data);
    await this.renderZoneChart(data);
  }

  // 📈 GRÁFICA DE TENDENCIAS
  async renderTrendChart(data) {
    const ctx = document.getElementById('analyticsTrendChart');
    if (!ctx || !window.Chart) return;

    // Obtener snapshots para mostrar tendencia histórica
    const snapshots = this.getSnapshotsData();
    
    if (snapshots.length === 0) {
      // Si no hay snapshots, mostrar datos actuales como punto único
      const today = new Date().toISOString().split('T')[0];
      snapshots.push({ date: today, totalRecords: data.length });
    }

    const chartData = {
      labels: snapshots.map(s => s.date),
      datasets: [{
        label: 'Total Records',
        data: snapshots.map(s => s.totalRecords),
        borderColor: '#47B2E5',
        backgroundColor: 'rgba(71, 178, 229, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#47B2E5',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 5
      }]
    };

    this.charts.set('trend', new window.Chart(ctx, {
      type: 'line',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff'
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(0, 0, 0, 0.1)' },
            ticks: { color: '#666' }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0, 0, 0, 0.1)' },
            ticks: { color: '#666' }
          }
        }
      }
    }));
  }

  // 📊 GRÁFICA DE ESTADO
  async renderStatusChart(data) {
    const ctx = document.getElementById('analyticsStatusChart');
    if (!ctx || !window.Chart) return;

    const statusData = this.analyzeByColumn(data, ['status', 'estado', 'state']);
    if (!statusData.labels.length) return;

    this.charts.set('status', new window.Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: statusData.labels,
        datasets: [{
          data: statusData.values,
          backgroundColor: [
            '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16'
          ],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { 
            position: 'bottom',
            labels: { padding: 20, usePointStyle: true }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff'
          }
        }
      }
    }));
  }

  // 🚨 GRÁFICA DE URGENCIAS
  async renderUrgencyChart(data) {
    const ctx = document.getElementById('analyticsUrgencyChart');
    if (!ctx || !window.Chart) return;

    const urgencyData = this.analyzeByColumn(data, ['urgencia', 'urgency', 'priority', 'prioridad']);
    if (!urgencyData.labels.length) return;

    const colors = urgencyData.labels.map(label => {
      const l = label.toLowerCase();
      if (l.includes('urgent') || l.includes('alta') || l.includes('high')) return '#EF4444';
      if (l.includes('medium') || l.includes('media') || l.includes('medium')) return '#F59E0B';
      if (l.includes('low') || l.includes('baja') || l.includes('bajo')) return '#10B981';
      return '#6B7280';
    });

    this.charts.set('urgency', new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels: urgencyData.labels,
        datasets: [{
          data: urgencyData.values,
          backgroundColor: colors,
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff'
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#666' }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0, 0, 0, 0.1)' },
            ticks: { color: '#666' }
          }
        }
      }
    }));
  }

  // 🌍 GRÁFICA DE ZONAS
  async renderZoneChart(data) {
    const ctx = document.getElementById('analyticsZoneChart');
    if (!ctx || !window.Chart) return;

    const zoneData = this.analyzeByColumn(data, ['zone', 'zona', 'region', 'area', 'location']);
    if (!zoneData.labels.length) return;

    this.charts.set('zone', new window.Chart(ctx, {
      type: 'polarArea',
      data: {
        labels: zoneData.labels,
        datasets: [{
          data: zoneData.values,
          backgroundColor: [
            'rgba(71, 178, 229, 0.8)',
            'rgba(16, 185, 129, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(139, 92, 246, 0.8)',
            'rgba(132, 204, 22, 0.8)'
          ],
          borderColor: '#ffffff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { 
            position: 'bottom',
            labels: { padding: 20, usePointStyle: true }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff'
          }
        },
        scales: {
          r: {
            beginAtZero: true,
            grid: { color: 'rgba(0, 0, 0, 0.1)' },
            pointLabels: { color: '#666' },
            ticks: { color: '#666' }
          }
        }
      }
    }));
  }

  // ⏳ UTILIDADES DE ESPERA
  async waitForContainer(maxAttempts = 20) {
    let attempts = 0;
    while (attempts < maxAttempts) {
      const container = document.getElementById(this.containerId);
      if (container && container.offsetParent !== null) {
        // El contenedor existe y es visible
        console.log('✅ Analytics charts container found after', attempts, 'attempts');
        return true;
      }
      // Esperar 100ms antes del siguiente intento
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    console.warn('❌ Analytics charts container not found after', maxAttempts, 'attempts');
    return false;
  }

  // 🔄 ACTUALIZACIÓN
  updateCharts(data) {
    if (!data.length) return;

    // Actualizar gráficas que dependen de datos filtrados
    this.renderStatusChart(data);
    this.renderUrgencyChart(data);
    this.renderZoneChart(data);
    // La gráfica de tendencias usa snapshots históricos, no se actualiza con filtros
  }

  // 🗑️ LIMPIEZA
  destroyAll() {
    this.charts.forEach(chart => {
      if (chart && typeof chart.destroy === 'function') {
        chart.destroy();
      }
    });
    this.charts.clear();
  }

  // 📊 UTILIDADES DE ANÁLISIS
  analyzeByColumn(data, possibleColumns) {
    if (!data.length) return { labels: [], values: [] };

    const headers = Object.keys(data[0]);
    const targetColumn = possibleColumns.find(col => 
      headers.find(h => h.toLowerCase().includes(col.toLowerCase()))
    );

    if (!targetColumn) return { labels: [], values: [] };

    const actualColumn = headers.find(h => h.toLowerCase().includes(targetColumn.toLowerCase()));
    const counts = {};

    data.forEach(row => {
      const value = row[actualColumn];
      if (value) {
        counts[value] = (counts[value] || 0) + 1;
      }
    });

    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10); // Top 10 valores

    return {
      labels: sorted.map(([label]) => label),
      values: sorted.map(([, value]) => value)
    };
  }

  getSnapshotsData() {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('snapshot_'));
      const snapshots = keys.map(key => {
        try {
          return JSON.parse(localStorage.getItem(key));
        } catch {
          return null;
        }
      }).filter(Boolean);

      return snapshots
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(-30); // Últimos 30 días
    } catch {
      return [];
    }
  }

  // 📱 RESPONSIVE
  resize() {
    this.charts.forEach(chart => {
      if (chart && typeof chart.resize === 'function') {
        chart.resize();
      }
    });
  }
} 