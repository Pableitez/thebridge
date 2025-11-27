// Singleton instance for data type detection
class DataDetector {
  static #instance = null;
  
  // Private properties for configuration
  #dateFormats = [
    'DD/MM/YYYY',
    'MM/DD/YYYY',
    'YYYY-MM-DD',
    'DD-MM-YYYY',
    'YYYY/MM/DD',
    'DD.MM.YY'
  ];

  #typePatterns = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    url: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
    phone: /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
    currency: /^[-+]?\d*\.?\d+([eE][-+]?\d+)?$/,
    date: [
      /^\d{2}\/\d{2}\/\d{4}$/,           // 25/04/2025
      /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/, // 25/04/2025 00:00
      /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/, // 25/04/2025 00:00:00
      /^\d{4}-\d{2}-\d{2}$/,             // 2025-04-25
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/, // 2025-04-25 00:00:00
      /^\d{2}-\d{2}-\d{4}$/,             // 25-04-2025
      /^\d{2}-\d{2}-\d{4} \d{2}:\d{2}$/, // 25-04-2025 00:00
      /^\d{2}-\d{2}-\d{4} \d{2}:\d{2}:\d{2}$/,  // 25-04-2025 00:00:00
      /^\d{2}\.\d{2}\.\d{2}$/,           // 07.09.25
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/, // 2024-11-09T00:00:00Z
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z$/ // 2024-11-09T00:00:00.000Z
    ],
    reference: [
      /^[A-Z]{4}\d{7}$/,                 // MSCU1234567
      /^[A-Z]{3}U\d{7}$/,                // MSCU1234567
      /^[A-Z]{2}\d{7}$/,                 // MS1234567
      /^[A-Z]{3}\d{7}$/,                 // MSC1234567
      /^[A-Z]{4}\d{7}[A-Z]$/,            // MSCU1234567A
      /^[A-Z]{3}U\d{7}[A-Z]$/,           // MSCU1234567A
      /^[A-Z]{2}\d{7}[A-Z]$/,            // MS1234567A
      /^[A-Z]{3}\d{7}[A-Z]$/             // MSC1234567A
    ],
  };

  constructor() {
    if (DataDetector.#instance) {
      throw new Error('Use DataDetector.getInstance() instead of new operator');
    }
    DataDetector.#instance = this;
  }

  static getInstance() {
    if (!DataDetector.#instance) {
      DataDetector.#instance = new DataDetector();
    }
    return DataDetector.#instance;
  }

  /**
   * Detects the types of all columns in a dataset
   * @param {Array} data - Array of objects representing the dataset
   * @returns {Object} - Map of column names to their detected types
   */
  detectColumnTypes(data) {
    if (!data || !data.length) return {};

    const columnTypes = {};
    const headers = Object.keys(data[0]);

    headers.forEach(column => {
      const values = data.map(row => row[column]).filter(Boolean);
      columnTypes[column] = this.#detectColumnType(values, column);
    });

    return columnTypes;
  }

  /**
   * Detects the type of a single column
   * @private
   */
  #detectColumnType(values, columnName) {
    if (!values.length) return 'text';

    // --- Forzar que 'Number of containers' siempre sea number ---
    if (columnName.trim().toLowerCase() === 'number of containers') {
      return 'number';
    }

    const sample = values.slice(0, 100);

    // 1. Si los valores son fechas, prioriza fecha
    if (this.isDateColumn(values)) {
      return 'date';
    }

    // 2. Si el nombre sugiere fecha, prioriza fecha
    if (this.#isLikelyDateColumnByName(columnName, sample) && this.isDateColumn(values)) {
      return 'date';
    }

    // 3. Forzar fecha si el nombre contiene 'UTC'
    if (columnName.toLowerCase().includes('utc')) {
      if (this.isDateColumn(values) || sample.some(v => String(v).trim() !== '')) {
        return 'date';
      }
    }

    // 4. Si el nombre sugiere referencia o los valores lo parecen, referencia
    if (this.#isReferenceColumn(columnName, sample)) {
      return 'reference';
    }

    // 5. Check other specific types
    if (this.#allMatch(sample, this.#typePatterns.email)) return 'email';
    if (this.#allMatch(sample, this.#typePatterns.url)) return 'url';
    if (this.#allMatch(sample, this.#typePatterns.phone)) return 'phone';
    if (this.#allMatch(sample, this.#typePatterns.currency)) return 'currency';

    // 6. Check if all values are numbers
    if (this.#allNumeric(sample)) {
      // Si todos los valores son números de 4 dígitos, NO lo consideres fecha
      // Solo es fecha si hay separadores (guiones, barras, etc)
      const allFourDigits = sample.every(v => String(v).match(/^\d{4}$/));
      if (allFourDigits) {
        return 'number';
      }
      return 'number';
    }

    // 7. Check if all values are booleans
    if (this.#allBoolean(sample)) return 'boolean';

    // Default to text if no other type matches
    return 'text';
  }

  /**
   * Checks if a column name suggests it's a reference/ID column
   * @private
   */
  #isReferenceColumn(columnName, values) {
    const refKeywords = [
      'container', 'number', 'reference', 'id', 'code',
      'booking', 'bl', 'bill', 'lading', 'voyage', 'vessel'
    ];
    
    // Primero verificar si el nombre de la columna sugiere que es una referencia
    const isRefByName = refKeywords.some(keyword => 
      columnName.toLowerCase().includes(keyword)
    );

    if (isRefByName) return true;

    // Luego verificar si los valores coinciden con patrones de referencia
    const sample = values.slice(0, 100);
    return this.#allMatch(sample, this.#typePatterns.reference);
  }

  /**
   * Checks if a column contains date values
   * @private
   */
  isDateColumn(values) {
    if (!values.length) return false;
    
    // Sample the first 100 non-null values for performance
    const sample = values.slice(0, 100);
    
    // Verificar si todos los valores coinciden con algún patrón de fecha
    return this.#allMatch(sample, this.#typePatterns.date);
  }

  /**
   * Parses a date string in various formats
   */
  parseDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value !== 'string') return null;

    // Handle special dynamic date values
    if (value === '__TODAY__') {
      return new Date();
    }

    // Try parsing ISO format first
    const isoDate = new Date(value);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }

    // Try parsing custom formats
    for (const format of this.#dateFormats) {
      const date = this.#parseDateWithFormat(value, format);
      if (date) return date;
    }

    return null;
  }

  /**
   * Formats a date in the standard Bridge format
   */
  formatBridgeDate(date) {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  }

  /**
   * Gets a date range based on a preset
   */
  getDateRange(preset) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (preset.toLowerCase()) {
      case 'today':
        return {
          start: today,
          end: new Date(today.getTime() + 86399999) // End of day
        };
      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return {
          start: yesterday,
          end: new Date(yesterday.getTime() + 86399999)
        };
      }
      case 'week': {
        const startWeek = new Date(today);
        startWeek.setDate(today.getDate() - today.getDay());
        const endWeek = new Date(startWeek);
        endWeek.setDate(startWeek.getDate() + 6);
        endWeek.setHours(23, 59, 59, 999);
        return { start: startWeek, end: endWeek };
      }
      // Add more presets as needed
      default:
        return null;
    }
  }

  /**
   * Helper method to parse date with specific format
   * @private
   */
  #parseDateWithFormat(value, format) {
    // Implementation of custom date parsing logic
    // This is a simplified version - you might want to use a library like moment.js
    // or date-fns for more robust date parsing
    try {
      const parts = value.split(/[-/.]/);
      const formatParts = format.split(/[-/.]/);
      const dateObj = {};

      formatParts.forEach((part, index) => {
        switch (part.toUpperCase()) {
          case 'DD':
            dateObj.day = parseInt(parts[index]);
            break;
          case 'MM':
            dateObj.month = parseInt(parts[index]) - 1;
            break;
          case 'YYYY':
            dateObj.year = parseInt(parts[index]);
            break;
          case 'YY':
            const year = parseInt(parts[index]);
            // Asumir que años 00-29 son 2000-2029, años 30-99 son 1930-1999
            dateObj.year = year < 30 ? 2000 + year : 1900 + year;
            break;
        }
      });

      const date = new Date(dateObj.year, dateObj.month, dateObj.day);
      return !isNaN(date.getTime()) ? date : null;
    } catch {
      return null;
    }
  }

  /**
   * Checks if all values match a pattern or at least one in an array of patterns
   * @private
   */
  #allMatch(values, patternOrPatterns) {
    if (Array.isArray(patternOrPatterns)) {
      return values.every(value =>
        patternOrPatterns.some(pat => pat.test(String(value)))
      );
    } else {
      return values.every(value => patternOrPatterns.test(String(value)));
    }
  }

  /**
   * Checks if all values are numeric
   * @private
   */
  #allNumeric(values) {
    return values.every(value => !isNaN(value) && !isNaN(parseFloat(value)));
  }

  /**
   * Checks if all values are boolean
   * @private
   */
  #allBoolean(values) {
    const booleanValues = ['true', 'false', '1', '0', 'yes', 'no'];
    return values.every(value => 
      typeof value === 'boolean' || 
      booleanValues.includes(String(value).toLowerCase())
    );
  }

  /**
   * Checks if a column name suggests it's a date column (reforzado)
   * @private
   */
  #isLikelyDateColumnByName(columnName, values) {
    const dateKeywords = [
      'date', 'utc', 'etd', 'eta', 'atd', 'ata', 'estimated', 'crd',
      'cut off', 'submission', 'confirm', 'release', 'dispatch',
      'actual', 'creation', 'ready', 'deadline'
    ];
    const name = columnName.toLowerCase();
    // Forzar que UTC siempre sea fecha
    if (name.includes('utc')) return true;
    return dateKeywords.some(k => name.includes(k));
  }
}

// Export the class
export { DataDetector }; 