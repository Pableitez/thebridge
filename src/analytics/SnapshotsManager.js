// Snapshots Manager - Gestión de capturas diarias de datos

export class SnapshotsManager {
  constructor() {
    this.autoEnabled = true;
    this.setup();
  }

  // 🔧 CONFIGURACIÓN INICIAL
  setup() {
    this.scheduleNextSnapshot();
    this.createTodaySnapshotIfNeeded();
  }

  // 📸 CREACIÓN DE SNAPSHOTS
  async createSnapshot() {
    try {
      const data = window.getOriginalData?.() || [];
      if (!data.length) {
        console.warn('No data available for snapshot');
        return null;
      }

      const snapshot = {
        id: this.generateSnapshotId(),
        date: new Date().toISOString().split('T')[0],
        timestamp: Date.now(),
        totalRecords: data.length,
        metrics: this.calculateMetrics(data),
        quickFiltersState: this.captureFiltersState(),
        weekNumber: this.getWeekNumber(new Date())
      };

      // Guardar snapshot
      const key = `snapshot_${snapshot.date}`;
      localStorage.setItem(key, JSON.stringify(snapshot));
      localStorage.setItem('lastSnapshotDate', new Date().toDateString());

      console.log(`📸 Snapshot created: ${snapshot.date}`, snapshot);
      return snapshot;

    } catch (error) {
      console.error('Error creating snapshot:', error);
      throw error;
    }
  }

  async createTodaySnapshotIfNeeded() {
    const lastSnapshot = localStorage.getItem('lastSnapshotDate');
    const today = new Date().toDateString();
    
    if (lastSnapshot !== today) {
      // Esperar un poco para que los datos estén cargados
      setTimeout(() => {
        this.createSnapshot().catch(console.error);
      }, 2000);
    }
  }

  // ⏰ PROGRAMACIÓN AUTOMÁTICA
  scheduleNextSnapshot() {
    if (!this.autoEnabled) return;

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0); // Medianoche

    const msUntilTomorrow = tomorrow.getTime() - now.getTime();

    setTimeout(() => {
      this.createSnapshot().catch(console.error);
      // Programar el siguiente (cada 24h)
      setInterval(() => {
        this.createSnapshot().catch(console.error);
      }, 24 * 60 * 60 * 1000);
    }, msUntilTomorrow);
  }

  // 📊 CÁLCULO DE MÉTRICAS
  calculateMetrics(data) {
    const metrics = {
      total: data.length,
      byStatus: {},
      byUrgency: {},
      byZone: {},
      byMonth: {}
    };

    if (!data.length) return metrics;

    const headers = Object.keys(data[0]);
    
    // Detectar columnas importantes
    const statusCol = this.findColumn(headers, ['status', 'estado', 'state']);
    const urgencyCol = this.findColumn(headers, ['urgency', 'urgencia', 'priority']);
    const zoneCol = this.findColumn(headers, ['zone', 'zona', 'region', 'area']);

    data.forEach(row => {
      // Métricas por status
      if (statusCol && row[statusCol]) {
        const status = row[statusCol];
        metrics.byStatus[status] = (metrics.byStatus[status] || 0) + 1;
      }

      // Métricas por urgencia
      if (urgencyCol && row[urgencyCol]) {
        const urgency = row[urgencyCol];
        metrics.byUrgency[urgency] = (metrics.byUrgency[urgency] || 0) + 1;
      }

      // Métricas por zona
      if (zoneCol && row[zoneCol]) {
        const zone = row[zoneCol];
        metrics.byZone[zone] = (metrics.byZone[zone] || 0) + 1;
      }

      // Métricas por mes (buscar fechas)
      headers.forEach(header => {
        if (this.isDateColumn(header) && row[header]) {
          const date = new Date(row[header]);
          if (!isNaN(date.getTime())) {
            const month = date.toISOString().slice(0, 7);
            metrics.byMonth[month] = (metrics.byMonth[month] || 0) + 1;
          }
        }
      });
    });

    return metrics;
  }

  captureFiltersState() {
    return {
      activeQuickFilters: window.activeDashboardQuickFilters || [],
      quickFiltersCount: (window.activeDashboardQuickFilters || []).length,
      hasTableFilters: window.hasTableDropdownFilters || false
    };
  }

  // 📈 CONSULTAS
  getAllSnapshots() {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('snapshot_'));
      return keys.map(key => {
        try {
          return JSON.parse(localStorage.getItem(key));
        } catch {
          return null;
        }
      }).filter(Boolean).sort((a, b) => new Date(a.date) - new Date(b.date));
    } catch {
      return [];
    }
  }

  getRecentSnapshots(days = 7) {
    const all = this.getAllSnapshots();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return all.filter(snapshot => new Date(snapshot.date) >= cutoffDate);
  }

  getSnapshotByDate(date) {
    try {
      const key = `snapshot_${date}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  // 🗑️ GESTIÓN
  deleteSnapshot(date) {
    try {
      const key = `snapshot_${date}`;
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  deleteOldSnapshots(daysToKeep = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const keys = Object.keys(localStorage).filter(key => key.startsWith('snapshot_'));
    let deletedCount = 0;

    keys.forEach(key => {
      try {
        const snapshot = JSON.parse(localStorage.getItem(key));
        if (new Date(snapshot.date) < cutoffDate) {
          localStorage.removeItem(key);
          deletedCount++;
        }
      } catch {
        // Si hay error parseando, eliminar la entrada corrupta
        localStorage.removeItem(key);
        deletedCount++;
      }
    });

    console.log(`🗑️ Deleted ${deletedCount} old snapshots`);
    return deletedCount;
  }

  cleanup() {
    this.deleteOldSnapshots();
  }

  // ⚙️ CONFIGURACIÓN
  enableAutoSnapshot() {
    this.autoEnabled = true;
    this.scheduleNextSnapshot();
  }

  disableAutoSnapshot() {
    this.autoEnabled = false;
  }

  isAutoEnabled() {
    return this.autoEnabled;
  }

  // 🛠️ UTILIDADES
  generateSnapshotId() {
    return `snap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  findColumn(headers, keywords) {
    return headers.find(header => 
      keywords.some(keyword => 
        header.toLowerCase().includes(keyword.toLowerCase())
      )
    );
  }

  isDateColumn(header) {
    const dateKeywords = ['date', 'fecha', 'time', 'created', 'updated', 'eta', 'etd'];
    return dateKeywords.some(keyword => 
      header.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  // 📊 ESTADÍSTICAS
  getStatistics() {
    const snapshots = this.getAllSnapshots();
    
    if (!snapshots.length) {
      return {
        total: 0,
        oldest: null,
        newest: null,
        averageRecords: 0,
        totalDays: 0
      };
    }

    const totalRecords = snapshots.reduce((sum, s) => sum + s.totalRecords, 0);
    
    return {
      total: snapshots.length,
      oldest: snapshots[0].date,
      newest: snapshots[snapshots.length - 1].date,
      averageRecords: Math.round(totalRecords / snapshots.length),
      totalDays: snapshots.length
    };
  }
} 