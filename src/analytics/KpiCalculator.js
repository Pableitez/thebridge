// KPI Calculator - Cálculo de métricas clave para Analytics Dashboard

export class KpiCalculator {
  constructor() {
    this.previousData = this.loadPreviousSnapshot();
  }

  // 🎯 CÁLCULO PRINCIPAL DE KPIs
  calculate(filteredData, originalData) {
    const kpis = {
      // Métricas básicas
      totalRecords: filteredData.length,
      originalTotalRecords: originalData.length,
      filteredPercentage: originalData.length > 0 
        ? Math.round((filteredData.length / originalData.length) * 100) 
        : 100,

      // Métricas de urgencia
      urgentCount: this.calculateUrgentCount(filteredData),
      urgencyDistribution: this.calculateUrgencyDistribution(filteredData),

      // Métricas de completado
      completionRate: this.calculateCompletionRate(filteredData),
      completedCount: this.calculateCompletedCount(filteredData),

      // Métricas de distribución
      statusDistribution: this.calculateStatusDistribution(filteredData),
      zoneDistribution: this.calculateZoneDistribution(filteredData),

      // Cambios vs día anterior
      totalChange: this.calculateChange('total', filteredData.length),
      urgentChange: this.calculateChange('urgent', this.calculateUrgentCount(filteredData)),
      completionChange: this.calculateChange('completion', this.calculateCompletionRate(filteredData)),

      // Métricas adicionales
      averageAge: this.calculateAverageAge(filteredData),
      trendsData: this.calculateTrends(filteredData)
    };

    return kpis;
  }

  // 🚨 MÉTRICAS DE URGENCIA
  calculateUrgentCount(data) {
    if (!data.length) return 0;

    const headers = Object.keys(data[0]);
    const urgencyColumn = this.findColumn(headers, ['urgency', 'urgencia', 'priority', 'prioridad']);
    
    if (!urgencyColumn) return 0;

    return data.filter(row => {
      const urgency = (row[urgencyColumn] || '').toString().toLowerCase();
      return urgency.includes('urgent') || 
             urgency.includes('alta') || 
             urgency.includes('high') ||
             urgency.includes('critical');
    }).length;
  }

  calculateUrgencyDistribution(data) {
    if (!data.length) return {};

    const headers = Object.keys(data[0]);
    const urgencyColumn = this.findColumn(headers, ['urgency', 'urgencia', 'priority', 'prioridad']);
    
    if (!urgencyColumn) return {};

    const distribution = {};
    data.forEach(row => {
      const urgency = row[urgencyColumn];
      if (urgency) {
        distribution[urgency] = (distribution[urgency] || 0) + 1;
      }
    });

    return distribution;
  }

  // ✅ MÉTRICAS DE COMPLETADO
  calculateCompletionRate(data) {
    if (!data.length) return 0;

    const headers = Object.keys(data[0]);
    const statusColumn = this.findColumn(headers, ['status', 'estado', 'state']);
    
    if (!statusColumn) return 0;

    const completedCount = data.filter(row => {
      const status = (row[statusColumn] || '').toString().toLowerCase();
      return status.includes('complete') || 
             status.includes('done') || 
             status.includes('finish') || 
             status.includes('closed') ||
             status.includes('delivered');
    }).length;

    return Math.round((completedCount / data.length) * 100);
  }

  calculateCompletedCount(data) {
    if (!data.length) return 0;

    const headers = Object.keys(data[0]);
    const statusColumn = this.findColumn(headers, ['status', 'estado', 'state']);
    
    if (!statusColumn) return 0;

    return data.filter(row => {
      const status = (row[statusColumn] || '').toString().toLowerCase();
      return status.includes('complete') || 
             status.includes('done') || 
             status.includes('finish') || 
             status.includes('closed') ||
             status.includes('delivered');
    }).length;
  }

  // 📊 DISTRIBUCIONES
  calculateStatusDistribution(data) {
    if (!data.length) return {};

    const headers = Object.keys(data[0]);
    const statusColumn = this.findColumn(headers, ['status', 'estado', 'state']);
    
    if (!statusColumn) return {};

    const distribution = {};
    data.forEach(row => {
      const status = row[statusColumn];
      if (status) {
        distribution[status] = (distribution[status] || 0) + 1;
      }
    });

    return distribution;
  }

  calculateZoneDistribution(data) {
    if (!data.length) return {};

    const headers = Object.keys(data[0]);
    const zoneColumn = this.findColumn(headers, ['zone', 'zona', 'region', 'area', 'location']);
    
    if (!zoneColumn) return {};

    const distribution = {};
    data.forEach(row => {
      const zone = row[zoneColumn];
      if (zone) {
        distribution[zone] = (distribution[zone] || 0) + 1;
      }
    });

    return distribution;
  }

  // ⏰ MÉTRICAS TEMPORALES
  calculateAverageAge(data) {
    if (!data.length) return 0;

    const headers = Object.keys(data[0]);
    const dateColumns = headers.filter(h => this.isDateColumn(h));
    
    if (!dateColumns.length) return 0;

    // Usar la primera columna de fecha encontrada
    const dateColumn = dateColumns[0];
    const now = new Date();
    let totalAge = 0;
    let validDates = 0;

    data.forEach(row => {
      const dateValue = row[dateColumn];
      if (dateValue) {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          const ageInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
          totalAge += ageInDays;
          validDates++;
        }
      }
    });

    return validDates > 0 ? Math.round(totalAge / validDates) : 0;
  }

  // 📈 CAMBIOS Y TENDENCIAS
  calculateChange(metric, currentValue) {
    if (!this.previousData) return 0;

    let previousValue = 0;
    
    switch (metric) {
      case 'total':
        previousValue = this.previousData.totalRecords || 0;
        break;
      case 'urgent':
        previousValue = this.extractUrgentFromSnapshot(this.previousData);
        break;
      case 'completion':
        previousValue = this.extractCompletionFromSnapshot(this.previousData);
        break;
      default:
        return 0;
    }

    if (previousValue === 0) return 0;
    
    return Math.round(((currentValue - previousValue) / previousValue) * 100);
  }

  calculateTrends(data) {
    const snapshots = this.getRecentSnapshots(30);
    
    if (snapshots.length < 2) return { direction: 'stable', percentage: 0 };

    const recent = snapshots.slice(-7); // Últimos 7 días
    const previous = snapshots.slice(-14, -7); // 7 días anteriores

    const recentAvg = recent.reduce((sum, s) => sum + s.totalRecords, 0) / recent.length;
    const previousAvg = previous.reduce((sum, s) => sum + s.totalRecords, 0) / previous.length;

    if (previousAvg === 0) return { direction: 'stable', percentage: 0 };

    const change = ((recentAvg - previousAvg) / previousAvg) * 100;
    
    return {
      direction: change > 5 ? 'up' : change < -5 ? 'down' : 'stable',
      percentage: Math.round(Math.abs(change))
    };
  }

  // 🔍 UTILIDADES
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

  loadPreviousSnapshot() {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayKey = yesterday.toISOString().split('T')[0];
      
      const key = `snapshot_${yesterdayKey}`;
      const data = localStorage.getItem(key);
      
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  getRecentSnapshots(days = 30) {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('snapshot_'));
      const snapshots = keys.map(key => {
        try {
          return JSON.parse(localStorage.getItem(key));
        } catch {
          return null;
        }
      }).filter(Boolean);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      return snapshots
        .filter(s => new Date(s.date) >= cutoffDate)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    } catch {
      return [];
    }
  }

  extractUrgentFromSnapshot(snapshot) {
    try {
      const urgencyMetrics = snapshot.metrics?.byUrgency || {};
      return Object.entries(urgencyMetrics)
        .filter(([key]) => {
          const k = key.toLowerCase();
          return k.includes('urgent') || k.includes('alta') || k.includes('high');
        })
        .reduce((sum, [, value]) => sum + value, 0);
    } catch {
      return 0;
    }
  }

  extractCompletionFromSnapshot(snapshot) {
    try {
      const statusMetrics = snapshot.metrics?.byStatus || {};
      const totalInSnapshot = snapshot.totalRecords || 0;
      
      const completedCount = Object.entries(statusMetrics)
        .filter(([key]) => {
          const k = key.toLowerCase();
          return k.includes('complete') || k.includes('done') || k.includes('finish');
        })
        .reduce((sum, [, value]) => sum + value, 0);
      
      return totalInSnapshot > 0 ? Math.round((completedCount / totalInSnapshot) * 100) : 0;
    } catch {
      return 0;
    }
  }

  // 📊 MÉTRICAS AVANZADAS
  calculateEfficiencyScore(data) {
    const completion = this.calculateCompletionRate(data);
    const urgent = this.calculateUrgentCount(data);
    const total = data.length;
    
    // Score basado en alta completitud y bajas urgencias
    const completionScore = completion;
    const urgencyScore = total > 0 ? Math.max(0, 100 - ((urgent / total) * 100)) : 100;
    
    return Math.round((completionScore + urgencyScore) / 2);
  }

  calculateHealthScore(data) {
    const trends = this.calculateTrends(data);
    const efficiency = this.calculateEfficiencyScore(data);
    
    let trendScore = 50; // Neutral
    if (trends.direction === 'up') trendScore = 70;
    if (trends.direction === 'down') trendScore = 30;
    
    return Math.round((efficiency + trendScore) / 2);
  }

  // 📈 PREDICCIONES SIMPLES
  predictNextWeek(data) {
    const snapshots = this.getRecentSnapshots(14);
    if (snapshots.length < 7) return null;

    const recent = snapshots.slice(-7);
    const average = recent.reduce((sum, s) => sum + s.totalRecords, 0) / recent.length;
    const trend = this.calculateTrends(data);
    
    let prediction = average;
    if (trend.direction === 'up') {
      prediction = average * (1 + (trend.percentage / 100));
    } else if (trend.direction === 'down') {
      prediction = average * (1 - (trend.percentage / 100));
    }
    
    return Math.round(prediction);
  }
} 