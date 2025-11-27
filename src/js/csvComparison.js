class CSVComparison {
  constructor() {
    console.log('CSVComparison constructor called');
    this.originalData = null;
    this.newData = null;
    this.keyColumns = [];
    this.compareColumns = [];
    this.comparisonResults = null;
    
    this.initializeElements();
    this.attachEventListeners();
    // Nuevo: botón para enviar a la tabla principal
    const sendBtn = document.getElementById('sendComparisonToMainTableBtn');
    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        // Prepara los datos planos para la tabla principal
        const flatData = this.getFlatComparisonData();
        window.comparisonResultsData = flatData;
        // Dispara un evento global para que main.js lo recoja
        window.dispatchEvent(new CustomEvent('comparisonResultsReady', { detail: { data: flatData } }));
        // Cierra el modal de comparación
        this.hideResultsModal();
      });
    }
    console.log('CSVComparison constructor completed');
  }

  initializeElements() {
    console.log('CSVComparison: Initializing elements...');
    // Main modal elements
    this.modal = document.getElementById('csvComparisonModal');
    if (!this.modal) {
      console.error('CSVComparison: Modal element not found!');
      throw new Error('CSVComparison modal element not found');
    }
    console.log('CSVComparison: Modal found:', this.modal);
    
    this.closeBtn = document.getElementById('closeCSVComparisonBtn');
    if (!this.closeBtn) {
      console.error('CSVComparison: Close button not found!');
    }
    
    this.startComparisonBtn = document.getElementById('startComparisonBtn');
    if (!this.startComparisonBtn) {
      console.error('CSVComparison: Start comparison button not found!');
    }
    
    // Results modal elements
    this.resultsModal = document.getElementById('comparisonResultsModal');
    this.closeResultsBtn = document.getElementById('closeResultsModalBtn');
    this.exportToExcelBtn = document.getElementById('exportToExcelBtn');
    this.exportToPdfBtn = document.getElementById('exportToPdfBtn');
    this.copyResultsBtn = document.getElementById('copyResultsBtn');
    this.backToConfigBtn = document.getElementById('backToConfigBtn');
    this.comparisonSummary = document.getElementById('comparisonSummary');
    
    // File inputs
    this.originalCSVInput = document.getElementById('originalCSVInput');
    this.newCSVInput = document.getElementById('newCSVInput');
    
    // Version selects and buttons
    this.originalVersionSelect = document.getElementById('originalVersionSelect');
    this.newVersionSelect = document.getElementById('newVersionSelect');
    this.loadOriginalVersionBtn = document.getElementById('loadOriginalVersionBtn');
    this.loadNewVersionBtn = document.getElementById('loadNewVersionBtn');
    
    // Source tabs
    this.sourceTabs = document.querySelectorAll('.source-tab');

    
    // Column selects
    this.keyColumnsSelect = document.getElementById('keyColumnsSelect');
    this.compareColumnsSelect = document.getElementById('compareColumnsSelect');
    
    // Results elements
    this.resultsTable = document.getElementById('comparisonResultsTable');
    this.unchangedCount = document.getElementById('unchangedCount');
    this.changedCount = document.getElementById('changedCount');
    this.newCount = document.getElementById('newCount');
    this.deletedCount = document.getElementById('deletedCount');
    
    console.log('Elements initialized:');
    console.log('- Modal:', this.modal);
    console.log('- Results Modal:', this.resultsModal);
    console.log('- Results Table:', this.resultsTable);
    console.log('- Comparison Summary:', this.comparisonSummary);
  }

  attachEventListeners() {
    console.log('CSVComparison: Attaching event listeners...');
    
    // Main modal controls
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.hideModal());
    } else {
      console.warn('CSVComparison: closeBtn not found');
    }
    
    if (this.startComparisonBtn) {
      this.startComparisonBtn.addEventListener('click', () => this.compareFiles());
    } else {
      console.warn('CSVComparison: startComparisonBtn not found');
    }
    
    // Results modal controls
    if (this.closeResultsBtn) {
      this.closeResultsBtn.addEventListener('click', () => this.hideResultsModal());
    } else {
      console.warn('CSVComparison: closeResultsBtn not found');
    }
    
    if (this.exportToExcelBtn) {
      this.exportToExcelBtn.addEventListener('click', () => this.exportToExcel());
    } else {
      console.warn('CSVComparison: exportToExcelBtn not found');
    }
    
    if (this.exportToPdfBtn) {
      this.exportToPdfBtn.addEventListener('click', () => this.exportToPdf());
    } else {
      console.warn('CSVComparison: exportToPdfBtn not found');
    }
    
    if (this.copyResultsBtn) {
      this.copyResultsBtn.addEventListener('click', () => this.copyResults());
    } else {
      console.warn('CSVComparison: copyResultsBtn not found');
    }
    
    if (this.backToConfigBtn) {
      this.backToConfigBtn.addEventListener('click', () => {
        this.hideResultsModal();
        this.showModal();
      });
    } else {
      console.warn('CSVComparison: backToConfigBtn not found');
    }
    
    // File inputs
    if (this.originalCSVInput) {
      this.originalCSVInput.addEventListener('change', (e) => this.handleFileUpload(e, 'original'));
    } else {
      console.warn('CSVComparison: originalCSVInput not found');
    }
    
    if (this.newCSVInput) {
      this.newCSVInput.addEventListener('change', (e) => this.handleFileUpload(e, 'new'));
    } else {
      console.warn('CSVComparison: newCSVInput not found');
    }
    
    // Version controls
    if (this.originalVersionSelect && this.loadOriginalVersionBtn) {
      this.originalVersionSelect.addEventListener('change', () => {
        this.loadOriginalVersionBtn.disabled = !this.originalVersionSelect.value;
      });
      this.loadOriginalVersionBtn.addEventListener('click', () => this.loadSavedVersion('original'));
    } else {
      console.warn('CSVComparison: originalVersionSelect or loadOriginalVersionBtn not found');
    }
    
    if (this.newVersionSelect && this.loadNewVersionBtn) {
      this.newVersionSelect.addEventListener('change', () => {
        this.loadNewVersionBtn.disabled = !this.newVersionSelect.value;
      });
      this.loadNewVersionBtn.addEventListener('click', () => this.loadSavedVersion('new'));
    } else {
      console.warn('CSVComparison: newVersionSelect or loadNewVersionBtn not found');
    }
    
    // Source tabs - hacer que el botón Upload File active el input de archivo
    if (this.sourceTabs && this.sourceTabs.length > 0) {
      this.sourceTabs.forEach(tab => {
        // Si es un botón de upload file, hacer que active el input
        if (tab.classList.contains('upload-file-btn')) {
          const inputId = tab.getAttribute('data-input');
          const fileInput = document.getElementById(inputId);
          if (fileInput) {
            tab.addEventListener('click', (e) => {
              e.preventDefault();
              fileInput.click();
            });
          }
        } else {
          // Para otros tabs, usar el comportamiento original
          tab.addEventListener('click', (e) => this.switchSourceTab(e));
        }
      });
    } else {
      console.warn('CSVComparison: sourceTabs not found');
    }

    
    // Column selects
    if (this.keyColumnsSelect) {
      this.keyColumnsSelect.addEventListener('change', () => this.updateCompareButton());
    } else {
      console.warn('CSVComparison: keyColumnsSelect not found');
    }
    
    if (this.compareColumnsSelect) {
      this.compareColumnsSelect.addEventListener('change', () => this.updateCompareButton());
    } else {
      console.warn('CSVComparison: compareColumnsSelect not found');
    }

    // Close modals when clicking outside
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) {
          this.hideModal();
        }
      });
    }
    
    if (this.resultsModal) {
      this.resultsModal.addEventListener('click', (e) => {
        if (e.target === this.resultsModal) {
          this.hideResultsModal();
        }
      });
    }

    // Botones seleccionar/deseleccionar todo para claves
    const selectAllKeyBtn = document.getElementById('selectAllKeyBtn');
    if (selectAllKeyBtn) {
      selectAllKeyBtn.addEventListener('click', () => {
        if (this.keyChoices) {
          this.keyChoices.setChoiceByValue(Array.from(this.keyColumnsSelect.options).map(opt => opt.value));
        }
        this.updateCompareButton();
      });
    }
    
    const deselectAllKeyBtn = document.getElementById('deselectAllKeyBtn');
    if (deselectAllKeyBtn) {
      deselectAllKeyBtn.addEventListener('click', () => {
        if (this.keyChoices) {
          this.keyChoices.removeActiveItems();
        }
        this.updateCompareButton();
      });
    }
    
    // Botones seleccionar/deseleccionar todo para comparación
    const selectAllCompareBtn = document.getElementById('selectAllCompareBtn');
    if (selectAllCompareBtn) {
      selectAllCompareBtn.addEventListener('click', () => {
        if (this.compareChoices) {
          this.compareChoices.setChoiceByValue(Array.from(this.compareColumnsSelect.options).map(opt => opt.value));
        }
        this.updateCompareButton();
      });
    }
    
    const deselectAllCompareBtn = document.getElementById('deselectAllCompareBtn');
    if (deselectAllCompareBtn) {
      deselectAllCompareBtn.addEventListener('click', () => {
        if (this.compareChoices) {
          this.compareChoices.removeActiveItems();
        }
        this.updateCompareButton();
      });
    }
    
    // Botón "View result in main table"
    const sendToMainTableBtn = document.getElementById('sendComparisonToMainTableBtn');
    if (sendToMainTableBtn) {
      sendToMainTableBtn.addEventListener('click', () => {
        console.log('Send to main table clicked');
        this.sendComparisonToMainTable();
        // Cerrar tanto el modal de resultados como el modal principal
        this.hideResultsModal();
        this.hideModal();
      });
    } else {
      console.warn('CSVComparison: sendComparisonToMainTableBtn not found');
    }

    const resetBtn = document.getElementById('resetComparisonBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetAll());
    } else {
      console.warn('CSVComparison: resetComparisonBtn not found');
    }
    
    console.log('CSVComparison: Event listeners attached successfully');
  }

  async showModal() {
    console.log('CSVComparison: showModal() called');
    if (!this.modal) {
      console.error('CSVComparison: Modal is null!');
      return;
    }
    
    console.log('CSVComparison: Removing hidden class, adding visible class');
    this.modal.classList.remove('hidden');
    this.modal.classList.add('visible');
    document.body.style.overflow = 'hidden';
    
    console.log('CSVComparison: Modal classes:', this.modal.className);
    console.log('CSVComparison: Modal display:', window.getComputedStyle(this.modal).display);
    
    // Cargar versiones guardadas al abrir el modal
    try {
      await this.loadSavedVersions();
    } catch (error) {
      console.error('CSVComparison: Error loading saved versions:', error);
    }
    
    console.log('CSVComparison: Modal should be visible now');
  }

  hideModal() {
    this.modal.classList.remove('visible');
    this.modal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  showResultsModal() {
    console.log('showResultsModal called');
    console.log('Results modal element:', this.resultsModal);
    this.resultsModal.classList.remove('hidden');
    this.resultsModal.classList.add('visible');
    document.body.style.overflow = 'hidden';
    console.log('Modal should be visible now');
  }

  hideResultsModal() {
    this.resultsModal.classList.remove('visible');
    this.resultsModal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  async handleFileUpload(event, type) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      // Filter out empty rows
      const data = Papa.parse(text, { header: true }).data.filter(row => row && Object.values(row).some(v => v !== undefined && v !== ''));
      
      if (type === 'original') {
        this.originalData = data;
        // Mostrar información del archivo cargado
        const fileInfo = document.getElementById('originalFileInfo');
        if (fileInfo) {
          const fileName = fileInfo.querySelector('.file-name');
          if (fileName) {
            fileName.textContent = `✓ Loaded: ${file.name} (${data.length} rows)`;
          }
          fileInfo.style.display = 'block';
        }
      } else {
        this.newData = data;
        // Mostrar información del archivo cargado
        const fileInfo = document.getElementById('newFileInfo');
        if (fileInfo) {
          const fileName = fileInfo.querySelector('.file-name');
          if (fileName) {
            fileName.textContent = `✓ Loaded: ${file.name} (${data.length} rows)`;
          }
          fileInfo.style.display = 'block';
        }
      }

      this.updateColumnSelects();
      this.updateCompareButton();
    } catch (error) {
      console.error('Error reading CSV file:', error);
      if (typeof window.showNotification === 'function') {
        window.showNotification('Error reading CSV file. Please try again.', 'error');
      } else {
        alert('Error reading CSV file. Please try again.');
      }
    }
  }

  updateColumnSelects() {
    console.log('updateColumnSelects called');
    console.log('originalData:', this.originalData ? `${this.originalData.length} rows` : 'null');
    console.log('newData:', this.newData ? `${this.newData.length} rows` : 'null');
    
    // Verificar que los elementos existan
    if (!this.keyColumnsSelect || !this.compareColumnsSelect) {
      console.error('Column select elements not found!');
      console.log('keyColumnsSelect:', this.keyColumnsSelect);
      console.log('compareColumnsSelect:', this.compareColumnsSelect);
      return;
    }
    
    // Obtener columnas del archivo disponible (original o new, o ambos si están disponibles)
    let columns = [];
    
    if (this.originalData && this.originalData.length > 0) {
      columns = Object.keys(this.originalData[0] || {});
      console.log('Using columns from originalData:', columns.length);
    } else if (this.newData && this.newData.length > 0) {
      columns = Object.keys(this.newData[0] || {});
      console.log('Using columns from newData:', columns.length);
    }
    
    // Si ambos archivos están cargados, usar las columnas del original (o combinar si son diferentes)
    if (this.originalData && this.originalData.length > 0 && this.newData && this.newData.length > 0) {
      const originalColumns = Object.keys(this.originalData[0] || {});
      const newColumns = Object.keys(this.newData[0] || {});
      // Combinar columnas de ambos archivos y eliminar duplicados
      const allColumns = [...new Set([...originalColumns, ...newColumns])];
      columns = allColumns;
      console.log('Both files loaded, combined columns:', columns.length);
    }
    
    if (columns.length === 0) {
      console.log('No columns found, returning');
      return;
    }

    // Ordenar columnas alfabéticamente
    columns = columns.sort((a, b) => a.localeCompare(b));
    console.log('Columns to display:', columns);

    // Clear existing options
    this.keyColumnsSelect.innerHTML = '';
    this.compareColumnsSelect.innerHTML = '';

    // Destruir Choices anteriores si existen
    if (this.keyChoices) {
      this.keyChoices.destroy();
      this.keyChoices = null;
    }
    if (this.compareChoices) {
      this.compareChoices.destroy();
      this.compareChoices = null;
    }

    // Add new options
    columns.forEach(column => {
      const keyOption = new Option(column, column);
      const compareOption = new Option(column, column);
      this.keyColumnsSelect.add(keyOption);
      this.compareColumnsSelect.add(compareOption);
    });

    // Activar Choices.js
    this.keyChoices = new Choices(this.keyColumnsSelect, {
      removeItemButton: true,
      searchEnabled: true,
      shouldSort: false,
      placeholder: true,
      placeholderValue: 'Select key columns...'
    });
    this.compareChoices = new Choices(this.compareColumnsSelect, {
      removeItemButton: true,
      searchEnabled: true,
      shouldSort: false,
      placeholder: true,
      placeholderValue: 'Select columns to compare...'
    });
  }

  updateCompareButton() {
    const hasFiles = this.originalData && this.newData;
    const hasKeyColumns = this.keyColumnsSelect.selectedOptions.length > 0;
    const hasCompareColumns = this.compareColumnsSelect.selectedOptions.length > 0;
    
    // Mostrar/ocultar aviso de clave obligatoria
    const warning = document.getElementById('keyColumnsWarning');
    if (!hasKeyColumns) {
      warning.style.display = 'block';
    } else {
      warning.style.display = 'none';
    }
    
    this.startComparisonBtn.disabled = !(hasFiles && hasKeyColumns && hasCompareColumns);
  }

  normalize(val) {
    return (val === undefined || val === null) ? '' : String(val).trim().toLowerCase();
  }

  compareFiles() {
    console.log('compareFiles called');
    this.keyColumns = Array.from(this.keyColumnsSelect.selectedOptions).map(opt => opt.value);
    this.compareColumns = Array.from(this.compareColumnsSelect.selectedOptions).map(opt => opt.value);
    
    console.log('Key columns:', this.keyColumns);
    console.log('Compare columns:', this.compareColumns);
    
    this.comparisonResults = this.performComparison();
    console.log('Comparison results:', this.comparisonResults);
    
    // Mostrar popup de resumen elegante
    const changed = this.comparisonResults.changed.length;
    const added = this.comparisonResults.new.length;
    const deleted = this.comparisonResults.deleted.length;
    const unchanged = this.comparisonResults.unchanged.length;
    
    this.showComparisonSummaryPopup({ changed, added, deleted, unchanged });
    
    // Toast eliminado por solicitud del usuario
    // showComparisonToast({ changed, added, deleted, unchanged });
    
    // Habilitar el botón de enviar a la tabla principal si hay cambios
    const sendBtn = document.getElementById('sendComparisonToMainTableBtn');
    if (sendBtn) sendBtn.disabled = (changed + added + deleted === 0);
    
    // Ya no abrimos el modal de resultados automáticamente
    // this.displayResults(this.comparisonResults);
    // this.showResultsModal();
  }

  performComparison() {
    const results = {
      unchanged: [],
      changed: [],
      new: [],
      deleted: []
    };

    // Create maps for faster lookup
    const originalMap = new Map();
    const newMap = new Map();

    // Index original data
    this.originalData.forEach(row => {
      const key = this.getKeyValue(row);
      originalMap.set(key, row);
    });

    // Index new data
    this.newData.forEach(row => {
      const key = this.getKeyValue(row);
      newMap.set(key, row);
    });

    // Compare rows
    for (const [key, originalRow] of originalMap) {
      const newRow = newMap.get(key);
      
      if (!newRow) {
        results.deleted.push({ key, row: originalRow });
      } else {
        const changes = this.findChanges(originalRow, newRow);
        if (changes.length === 0) {
          results.unchanged.push({ key, row: originalRow });
        } else {
          results.changed.push({ key, original: originalRow, new: newRow, changes });
        }
      }
    }

    // Find new rows
    for (const [key, newRow] of newMap) {
      if (!originalMap.has(key)) {
        results.new.push({ key, row: newRow });
      }
    }

    return results;
  }

  getKeyValue(row) {
    return this.keyColumns.map(col => (row && row[col] !== undefined ? this.normalize(row[col]) : '')).join('|');
  }

  findChanges(original, newRow) {
    const changes = [];
    
    console.log('Comparing rows:');
    console.log('Original:', original);
    console.log('New:', newRow);
    console.log('Compare columns:', this.compareColumns);
    
    this.compareColumns.forEach(column => {
      const originalValue = this.normalize(original[column]);
      const newValue = this.normalize(newRow[column]);
      
      console.log(`Column ${column}: "${originalValue}" vs "${newValue}"`);
      
      if (originalValue !== newValue) {
        console.log(`Change detected in column ${column}`);
        changes.push({
          column,
          old: original[column],
          new: newRow[column]
        });
      }
    });
    
    console.log('Total changes found:', changes.length);
    return changes;
  }

  displayResults(results) {
    // Limpia el contenedor de la tabla y crea la estructura desde cero
    const table = this.resultsTable;
    table.innerHTML = '';
    table.removeAttribute('style');

    // Detecta todas las columnas presentes en los datos
    let allColumns = [];
    if (results.changed.length > 0) {
      allColumns = Object.keys(results.changed[0].original || {});
    } else if (results.new.length > 0) {
      allColumns = Object.keys(results.new[0].row || {});
    } else if (results.deleted.length > 0) {
      allColumns = Object.keys(results.deleted[0].row || {});
    }

    // Crea thead
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    headRow.innerHTML = `
      <th>Status</th>
      <th>Key Values</th>
      ${allColumns.map(col => `<th>${col}</th>`).join('')}
    `;
    thead.appendChild(headRow);
    table.appendChild(thead);

    // Crea tbody
    const tbody = document.createElement('tbody');
    let totalRows = 0;
    
    const createDataCell = (column, result, type) => {
      const td = document.createElement('td');
      if (type === 'changed') {
        const change = result.changes.find(c => c.column === column);
        if (change) {
          td.className = 'changed-column';
          td.innerHTML = `<div class="old-value">${change.old ?? ''}</div><div class="new-value">${change.new ?? ''}</div>`;
        } else {
          td.textContent = result.original[column] ?? '';
        }
      } else if (type === 'new') {
        td.textContent = result.row[column] ?? '';
      } else if (type === 'deleted') {
        td.textContent = result.row[column] ?? '';
      }
      return td;
    };

    results.changed.forEach(result => {
      const tr = document.createElement('tr');
      tr.className = 'changed';
      tr.appendChild(Object.assign(document.createElement('td'), {textContent: 'Changed'}));
      tr.appendChild(Object.assign(document.createElement('td'), {textContent: this.keyColumns.map(col => `${col}: ${result.original[col] ?? ''}`).join(', ')}));
      allColumns.forEach(col => tr.appendChild(createDataCell(col, result, 'changed')));
      tbody.appendChild(tr);
      totalRows++;
    });
    results.new.forEach(result => {
      const tr = document.createElement('tr');
      tr.className = 'new';
      tr.appendChild(Object.assign(document.createElement('td'), {textContent: 'New'}));
      tr.appendChild(Object.assign(document.createElement('td'), {textContent: this.keyColumns.map(col => `${col}: ${result.row[col] ?? ''}`).join(', ')}));
      allColumns.forEach(col => tr.appendChild(createDataCell(col, result, 'new')));
      tbody.appendChild(tr);
      totalRows++;
    });
    results.deleted.forEach(result => {
      const tr = document.createElement('tr');
      tr.className = 'deleted';
      tr.appendChild(Object.assign(document.createElement('td'), {textContent: 'Deleted'}));
      tr.appendChild(Object.assign(document.createElement('td'), {textContent: this.keyColumns.map(col => `${col}: ${result.row[col] ?? ''}`).join(', ')}));
      allColumns.forEach(col => tr.appendChild(createDataCell(col, result, 'deleted')));
      tbody.appendChild(tr);
      totalRows++;
    });

    if (totalRows === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = allColumns.length + 2;
      td.style.textAlign = 'center';
      td.textContent = 'No changes found.';
      tr.appendChild(td);
      tbody.appendChild(tr);
    }

    table.appendChild(tbody);

    this.unchangedCount.textContent = results.unchanged.length;
    this.changedCount.textContent = results.changed.length;
    this.newCount.textContent = results.new.length;
    this.deletedCount.textContent = results.deleted.length;

    this.comparisonSummary.innerHTML = this.generateSummaryHTML(results);
  }

  generateSummaryHTML(results) {
    // No mostrar ningún resumen tipo lista, solo devolver string vacío
    return '';
  }

  exportToExcel() {
    const workbook = XLSX.utils.book_new();
    
    // Get all columns from the data
    const allColumns = this.originalData && this.originalData.length > 0 
      ? Object.keys(this.originalData[0]) 
      : (this.newData && this.newData.length > 0 ? Object.keys(this.newData[0]) : []);
    
    // Create worksheets for each type of change
    const sheets = {
      'Changed': this.resultsTable.querySelectorAll('tr.changed'),
      'New': this.resultsTable.querySelectorAll('tr.new'),
      'Deleted': this.resultsTable.querySelectorAll('tr.deleted')
    };

    for (const [sheetName, rows] of Object.entries(sheets)) {
      if (rows.length === 0) continue;
      
      const data = Array.from(rows).map(row => {
        const cells = row.cells;
        const rowData = {
          Status: cells[0].textContent,
          'Key Values': cells[1].textContent
        };
        
        // Add all data columns
        allColumns.forEach((column, index) => {
          const cell = cells[index + 2]; // +2 because of Status and Key Values columns
          if (cell) {
            if (cell.classList.contains('changed-column')) {
              // For changed columns, show both old and new values
              const oldValue = cell.querySelector('.old-value')?.textContent || '';
              const newValue = cell.querySelector('.new-value')?.textContent || '';
              rowData[`${column} (Old)`] = oldValue;
              rowData[`${column} (New)`] = newValue;
            } else {
              rowData[column] = cell.textContent || '';
            }
          }
        });
        
        return rowData;
      });

      const worksheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    }

    // Save the file
    XLSX.writeFile(workbook, 'data_comparison_results.xlsx');
  }

  exportToPdf() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text('Data Comparison Results', 14, 15);
    
    // Add summary
    doc.setFontSize(12);
    doc.text([
      `Unchanged: ${this.unchangedCount.textContent}`,
      `Changed: ${this.changedCount.textContent}`,
      `New: ${this.newCount.textContent}`,
      `Deleted: ${this.deletedCount.textContent}`
    ], 14, 30);

    // Add textual summary
    doc.setFontSize(10);
    const summaryText = this.comparisonSummary.innerText || '';
    const summaryLines = doc.splitTextToSize(summaryText, 180);
    doc.text(summaryLines, 14, 45);

    // Add detailed results table
    let yPosition = 45 + (summaryLines.length * 5) + 10;
    
    const rows = this.resultsTable.querySelectorAll('tbody tr');
    if (rows.length > 0) {
      doc.setFontSize(12);
      doc.text('Detailed Results:', 14, yPosition);
      yPosition += 10;
      
      rows.forEach((row, index) => {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
        
        const cells = row.cells;
        const status = cells[0].textContent;
        const keyValues = cells[1].textContent;
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text(`${status}: ${keyValues}`, 14, yPosition);
        yPosition += 5;
        
        // Add data for each column
        for (let i = 2; i < cells.length; i++) {
          const cell = cells[i];
          const columnName = this.resultsTable.querySelector(`thead th:nth-child(${i + 1})`).textContent;
          
          if (cell.classList.contains('changed-column')) {
            const oldValue = cell.querySelector('.old-value')?.textContent || '';
            const newValue = cell.querySelector('.new-value')?.textContent || '';
            doc.setFont(undefined, 'normal');
            doc.text(`  ${columnName}: ${oldValue} → ${newValue}`, 14, yPosition);
          } else {
            doc.setFont(undefined, 'normal');
            doc.text(`  ${columnName}: ${cell.textContent}`, 14, yPosition);
          }
          yPosition += 4;
        }
        
        yPosition += 5;
      });
    }

    // Save the PDF
    doc.save('data_comparison_results.pdf');
  }

  copyResults() {
    let text = '';
    
    // Add summary
    text += this.comparisonSummary.innerText || '';
    text += '\n\n';
    
    // Add detailed results
    const rows = this.resultsTable.querySelectorAll('tbody tr');
    if (rows.length > 0) {
      text += 'DETAILED RESULTS:\n';
      text += '='.repeat(50) + '\n\n';
      
      rows.forEach((row, index) => {
        const cells = row.cells;
        const status = cells[0].textContent;
        const keyValues = cells[1].textContent;
        
        text += `${status}: ${keyValues}\n`;
        
        // Add data for each column
        for (let i = 2; i < cells.length; i++) {
          const cell = cells[i];
          const columnName = this.resultsTable.querySelector(`thead th:nth-child(${i + 1})`).textContent;
          
          if (cell.classList.contains('changed-column')) {
            const oldValue = cell.querySelector('.old-value')?.textContent || '';
            const newValue = cell.querySelector('.new-value')?.textContent || '';
            text += `  ${columnName}: ${oldValue} → ${newValue}\n`;
          } else {
            text += `  ${columnName}: ${cell.textContent}\n`;
          }
        }
        
        text += '\n';
      });
    }
    
    navigator.clipboard.writeText(text).then(() => {
      // Show a temporary success message
      const notification = document.createElement('div');
      notification.className = 'notification success';
      notification.textContent = 'Detailed results copied to clipboard';
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4caf50;
        color: white;
        padding: 12px 20px;
        border-radius: 4px;
        z-index: 10000;
        font-weight: 600;
      `;
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.remove();
      }, 3000);
    });
  }

  // Convierte los resultados de comparación a un array plano para la tabla principal
  getFlatComparisonData() {
    if (!this.comparisonResults) return [];
    // Unifica todas las columnas posibles
    const allColumnsSet = new Set();
    const addCols = obj => Object.keys(obj || {}).forEach(k => allColumnsSet.add(k));
    this.comparisonResults.changed.forEach(r => { addCols(r.original); addCols(r.new); });
    this.comparisonResults.new.forEach(r => addCols(r.row));
    this.comparisonResults.deleted.forEach(r => addCols(r.row));
    const allColumns = Array.from(allColumnsSet);
    const rows = [];
    // Changed
    this.comparisonResults.changed.forEach(r => {
      const row = { 'Change Type': 'Changed' };
      allColumns.forEach(col => {
        const change = r.changes.find(c => c.column === col);
        if (change) {
          row[col + ' (Old)'] = change.old;
          row[col + ' (New)'] = change.new;
        } else {
          row[col] = r.original[col] ?? r.new[col] ?? '';
        }
      });
      rows.push(row);
    });
    // New
    this.comparisonResults.new.forEach(r => {
      const row = { 'Change Type': 'New' };
      allColumns.forEach(col => {
        row[col] = r.row[col] ?? '';
      });
      rows.push(row);
    });
    // Deleted
    this.comparisonResults.deleted.forEach(r => {
      const row = { 'Change Type': 'Deleted' };
      allColumns.forEach(col => {
        row[col] = r.row[col] ?? '';
      });
      rows.push(row);
    });
    return rows;
  }

  // CARGAR VERSIONES GUARDADAS
  async loadSavedVersions() {
    try {
      console.log('CSVComparison: Loading saved versions into selects...');
      const versions = await this.getSavedVersions();
      console.log('CSVComparison: Got versions:', versions);
      
      // Limpiar selects
      this.originalVersionSelect.innerHTML = '<option value="">Select a saved version...</option>';
      this.newVersionSelect.innerHTML = '<option value="">Select a saved version...</option>';
      
      // Añadir versiones a ambos selects
      versions.forEach(version => {
        const displayName = version.displayName || version.fileName || version.name;
        console.log('CSVComparison: Adding version to selects:', { 
          displayName, 
          id: version.id, 
          originalData: version.displayName, 
          fileName: version.fileName, 
          name: version.name 
        });
        
        const originalOption = new Option(displayName, version.id);
        const newOption = new Option(displayName, version.id);
        
        this.originalVersionSelect.add(originalOption);
        this.newVersionSelect.add(newOption);
      });
      
      console.log(`CSVComparison: Successfully loaded ${versions.length} saved versions into selects`);
      console.log('CSVComparison: Original select options:', this.originalVersionSelect.options.length);
      console.log('CSVComparison: New select options:', this.newVersionSelect.options.length);
    } catch (error) {
      console.error('CSVComparison: Error loading saved versions:', error);
    }
  }

  // OBTENER VERSIONES GUARDADAS DE INDEXEDDB (usando la función global de main.js)
  async getSavedVersions() {
    try {
      console.log('CSVComparison: Getting saved versions...');
      
      // Usar la función global getDataVersions() de main.js si está disponible
      if (typeof window.getDataVersions === 'function') {
        console.log('CSVComparison: Using global getDataVersions function');
        const versions = await window.getDataVersions();
        console.log('CSVComparison: Got versions from global function:', versions);
        return versions;
      }
      
      // Fallback: usar la función loadFromIndexedDB global si está disponible
      if (typeof window.loadFromIndexedDB === 'function') {
        console.log('CSVComparison: Using global loadFromIndexedDB function');
        const all = await window.loadFromIndexedDB('dataVersions');
        console.log('CSVComparison: Raw data from IndexedDB:', all);
        
        if (!all) {
          console.log('CSVComparison: No data found in IndexedDB');
          return [];
        }
        
        // Si es un array (compatibilidad antigua)
        if (Array.isArray(all)) {
          console.log('CSVComparison: Data is array format:', all.length, 'versions');
          return all.sort((a, b) => b.name.localeCompare(a.name));
        }
        
        // Si es un objeto tipo {id: version, ...}, conviértelo a array y ordena
        const versions = Object.values(all).sort((a, b) => b.name.localeCompare(a.name));
        console.log('CSVComparison: Data is object format, converted to array:', versions.length, 'versions');
        return versions;
      }
      
      // Si no hay funciones globales disponibles, usar implementación local
      console.log('CSVComparison: Using local IndexedDB implementation');
      const all = await this.loadFromIndexedDB('dataVersions');
      console.log('CSVComparison: Raw data from IndexedDB:', all);
      
      if (!all) {
        console.log('CSVComparison: No data found in IndexedDB');
        return [];
      }
      
      // Si es un array (compatibilidad antigua)
      if (Array.isArray(all)) {
        console.log('CSVComparison: Data is array format:', all.length, 'versions');
        return all.sort((a, b) => b.name.localeCompare(a.name));
      }
      
      // Si es un objeto tipo {id: version, ...}, conviértelo a array y ordena
      const versions = Object.values(all).sort((a, b) => b.name.localeCompare(a.name));
      console.log('CSVComparison: Data is object format, converted to array:', versions.length, 'versions');
      return versions;
    } catch (error) {
      console.error('CSVComparison: Error getting saved versions:', error);
      return [];
    }
  }

  // FUNCIONES DE INDEXEDDB (copiadas de main.js)
  async loadFromIndexedDB(key) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('TheBridgeDB', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['data'], 'readonly');
        const store = transaction.objectStore('data');
        const getRequest = store.get(key);
        
        getRequest.onsuccess = () => {
          resolve(getRequest.result ? getRequest.result.value : null);
        };
        
        getRequest.onerror = () => reject(getRequest.error);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('data')) {
          db.createObjectStore('data', { keyPath: 'key' });
        }
      };
    });
  }

  // CAMBIAR PESTAÑA DE FUENTE
  switchSourceTab(event) {
    const tab = event.target;
    const source = tab.dataset.source;
    const target = tab.dataset.target;
    
    // Actualizar pestañas activas
    const targetTabs = document.querySelectorAll(`.source-tab[data-target="${target}"]`);
    targetTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    // Mostrar/ocultar contenido apropiado
    const targetGroup = tab.closest('.file-input-group');
    const fileInput = targetGroup.querySelector('.source-file');
    const versionInput = targetGroup.querySelector('.source-version');
    
    if (source === 'file') {
      fileInput.classList.remove('hidden');
      fileInput.classList.add('active');
      versionInput.classList.add('hidden');
    } else {
      fileInput.classList.add('hidden');
      fileInput.classList.remove('active');
      versionInput.classList.remove('hidden');
    }
  }

  // CARGAR VERSIÓN GUARDADA
  async loadSavedVersion(target) {
    try {
      const select = target === 'original' ? this.originalVersionSelect : this.newVersionSelect;
      const versionId = select.value;
      
      if (!versionId) {
        if (typeof window.showNotification === 'function') {
          window.showNotification('Please select a version to load.', 'warning');
        } else {
          alert('Please select a version to load.');
        }
        return;
      }
      
      // Obtener todas las versiones de IndexedDB usando la función global
      let allVersions;
      if (typeof window.loadFromIndexedDB === 'function') {
        allVersions = await window.loadFromIndexedDB('dataVersions');
      } else {
        allVersions = await this.loadFromIndexedDB('dataVersions');
      }
      
      if (!allVersions || !allVersions[versionId]) {
        if (typeof window.showNotification === 'function') {
          window.showNotification('Version data not found.', 'error');
        } else {
          alert('Version data not found.');
        }
        return;
      }
      
      const version = allVersions[versionId];
      const data = version.data;
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        if (typeof window.showNotification === 'function') {
          window.showNotification('Invalid or empty version data.', 'error');
        } else {
          alert('Invalid or empty version data.');
        }
        return;
      }
      
      // Asignar datos
      if (target === 'original') {
        this.originalData = data;
      } else {
        this.newData = data;
      }
      
      // Mostrar indicador de éxito
      const displayName = version.displayName || version.fileName || version.name;
      this.showVersionStatus(target, `Loaded: ${displayName}`, 'success');
      
      // Actualizar selects de columnas y botón de comparación
      this.updateColumnSelects();
      this.updateCompareButton();
      
      console.log(`Loaded ${target} version:`, displayName, `(${data.length} rows)`);
      
    } catch (error) {
      console.error('Error loading saved version:', error);
      this.showVersionStatus(target, 'Error loading version', 'error');
    }
  }

  // MOSTRAR STATUS DE CARGA DE VERSIÓN
  showVersionStatus(target, message, type) {
    const targetGroup = document.querySelector(`.file-input-group:has(#${target}VersionSelect)`);
    if (!targetGroup) return;
    
    // Buscar o crear elemento de status
    let statusEl = targetGroup.querySelector('.version-status');
    if (!statusEl) {
      statusEl = document.createElement('div');
      statusEl.className = 'version-status';
      targetGroup.querySelector('.source-version').appendChild(statusEl);
    }
    
    statusEl.textContent = message;
    statusEl.className = `version-status ${type}`;
    
    // Auto-ocultar después de 3 segundos si es éxito
    if (type === 'success') {
      setTimeout(() => {
        statusEl.style.display = 'none';
      }, 3000);
    }
  }

  // ENVIAR RESULTADOS DE COMPARACIÓN A LA TABLA PRINCIPAL
  sendComparisonToMainTable() {
    if (!this.comparisonResults) {
      console.error('No comparison results available');
      return;
    }

    try {
      // Crear datos planos para la tabla principal
      const flatData = this.getFlatComparisonData();
      
      if (flatData.length === 0) {
        if (typeof window.showNotification === 'function') {
          window.showNotification('No data to send to main table.', 'warning');
        } else {
          alert('No data to send to main table.');
        }
        return;
      }

      // Usar las funciones globales para cargar los datos en la tabla principal
      if (typeof window.setOriginalData === 'function') {
        window.setOriginalData(flatData);
      }
      
      if (typeof window.setCurrentHeaders === 'function') {
        window.setCurrentHeaders(Object.keys(flatData[0]));
      }
      
      if (typeof window.setVisibleColumns === 'function') {
        window.setVisibleColumns(Object.keys(flatData[0]));
      }

      // Reinicializar filtros y mostrar tabla
      if (typeof window.resetFilterManager === 'function') {
        window.resetFilterManager();
      }
      
      if (typeof window.initializeFilterManager === 'function') {
        window.filterManager = window.initializeFilterManager(flatData);
      }
      
      if (typeof window.initializeReportService === 'function') {
        window.initializeReportService();
      }
      
      if (typeof window.displayTable === 'function') {
        window.displayTable(flatData);
      }
      
      // Mostrar contenedor de tabla
      if (typeof window.toggleElements === 'function') {
        window.toggleElements('#tableContainer', 'show');
      }

      // Actualizar selector de vistas si existe
      if (typeof window.updateViewSelect === 'function') {
        window.updateViewSelect();
      }
      
      // Renderizar filtros del dashboard si existe
      if (typeof window.renderDashboardQuickFilters === 'function') {
        window.renderDashboardQuickFilters();
      }

      // Mostrar notificación de éxito
      if (typeof window.showNotification === 'function') {
        window.showNotification('Comparison results loaded into main table.', 'success');
      }

      console.log('Comparison results sent to main table successfully');
      
    } catch (error) {
      console.error('Error sending comparison results to main table:', error);
      if (typeof window.showNotification === 'function') {
        window.showNotification('Error loading data into main table. Please try again.', 'error');
      } else {
        alert('Error loading data into main table. Please try again.');
      }
    }
  }

  // MOSTRAR POPUP DE RESUMEN DE COMPARACIÓN
  showComparisonSummaryPopup({ changed, added, deleted, unchanged }) {
    // Eliminar popup anterior si existe
    const existingPopup = document.getElementById('comparisonSummaryPopup');
    if (existingPopup) {
      existingPopup.remove();
    }

    // Crear el popup
    const popup = document.createElement('div');
    popup.id = 'comparisonSummaryPopup';
    popup.className = 'comparison-summary-popup';
    
    const total = changed + added + deleted + unchanged;
    const hasChanges = changed + added + deleted > 0;
    
    popup.innerHTML = `
      <div class="popup-overlay" style="background:transparent;backdrop-filter:none;">
        <div class="popup-content" style="background:#E3F2FD !important; border-radius:20px; box-shadow:0 20px 60px rgba(0,0,0,0.15); border:1px solid rgba(0,0,0,0.1); max-width:700px; width:100%; color:#000000;">
          <div class="modal-header" style="background:#E3F2FD; border-radius:20px 20px 0 0; display:flex; align-items:center; justify-content:space-between; padding:1.2rem 2rem 1.2rem 2rem; border-bottom:1px solid rgba(0,0,0,0.1);">
            <div class="header-left" style="display:flex;align-items:center;gap:1rem;">
              <img src="LOGOTAB_rounded.png" alt="Logo" class="modal-logo" style="width:48px;height:48px;border-radius:50%;box-shadow:0 4px 12px rgba(71,178,229,0.3);">
              <h3 class="panel-header-title" style="color:#000000;font-family:'Roboto','Segoe UI',Arial,sans-serif;font-weight:600;font-size:1.5rem;margin:0;letter-spacing:0.02em;">Comparison Results</h3>
            </div>
            <button class="close-btn" id="closeSummaryPopup" style="color:rgba(0,0,0,0.7);background:rgba(0,0,0,0.1);border:1px solid rgba(0,0,0,0.2);border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;transition:all 0.3s ease;cursor:pointer;">×</button>
          </div>
          <div class="popup-body" style="padding:1.2rem 2rem 1rem 2rem;">
            <div class="summary-stats" style="text-align:center;margin-bottom:1.2rem;">
              <div class="stat-item total" style="background:rgba(71,178,229,0.1);border:1px solid rgba(71,178,229,0.3);border-radius:16px;padding:1.2rem;display:inline-block;">
                <div class="stat-number" style="font-size:2.2rem;font-weight:700;color:#47B2E5;margin-bottom:0.5rem;font-family:'Roboto','Segoe UI',Arial,sans-serif;">${total}</div>
                <div class="stat-label" style="color:#000000;font-size:1.1rem;font-weight:500;">Total Records</div>
              </div>
            </div>
            <div class="summary-breakdown" style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.2rem;">
              <div class="breakdown-item unchanged ${unchanged > 0 ? 'has-data' : ''}" style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:12px;padding:1rem;display:flex;align-items:center;gap:1rem;${unchanged > 0 ? '' : 'opacity:0.6;'}">
                <div class="breakdown-content" style="flex:1;">
                  <div class="breakdown-number" style="font-size:1.3rem;font-weight:700;color:#000000;margin-bottom:0.25rem;">${unchanged}</div>
                  <div class="breakdown-label" style="color:#666666;font-size:0.9rem;font-weight:500;">Unchanged</div>
                </div>
                <div class="breakdown-percentage" style="color:#000000;font-size:1rem;font-weight:600;flex-shrink:0;">${total > 0 ? Math.round((unchanged / total) * 100) : 0}%</div>
              </div>
              <div class="breakdown-item changed ${changed > 0 ? 'has-data' : ''}" style="background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.3);border-radius:12px;padding:1rem;display:flex;align-items:center;gap:1rem;${changed > 0 ? '' : 'opacity:0.6;'}">
                <div class="breakdown-content" style="flex:1;">
                  <div class="breakdown-number" style="font-size:1.3rem;font-weight:700;color:#000000;margin-bottom:0.25rem;">${changed}</div>
                  <div class="breakdown-label" style="color:#666666;font-size:0.9rem;font-weight:500;">Modified</div>
                </div>
                <div class="breakdown-percentage" style="color:#000000;font-size:1rem;font-weight:600;flex-shrink:0;">${total > 0 ? Math.round((changed / total) * 100) : 0}%</div>
              </div>
              <div class="breakdown-item new ${added > 0 ? 'has-data' : ''}" style="background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.3);border-radius:12px;padding:1rem;display:flex;align-items:center;gap:1rem;${added > 0 ? '' : 'opacity:0.6;'}">
                <div class="breakdown-content" style="flex:1;">
                  <div class="breakdown-number" style="font-size:1.3rem;font-weight:700;color:#000000;margin-bottom:0.25rem;">${added}</div>
                  <div class="breakdown-label" style="color:#666666;font-size:0.9rem;font-weight:500;">Added</div>
                </div>
                <div class="breakdown-percentage" style="color:#000000;font-size:1rem;font-weight:600;flex-shrink:0;">${total > 0 ? Math.round((added / total) * 100) : 0}%</div>
              </div>
              <div class="breakdown-item deleted ${deleted > 0 ? 'has-data' : ''}" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:12px;padding:1rem;display:flex;align-items:center;gap:1rem;${deleted > 0 ? '' : 'opacity:0.6;'}">
                <div class="breakdown-content" style="flex:1;">
                  <div class="breakdown-number" style="font-size:1.3rem;font-weight:700;color:#000000;margin-bottom:0.25rem;">${deleted}</div>
                  <div class="breakdown-label" style="color:#666666;font-size:0.9rem;font-weight:500;">Removed</div>
                </div>
                <div class="breakdown-percentage" style="color:#000000;font-size:1rem;font-weight:600;flex-shrink:0;">${total > 0 ? Math.round((deleted / total) * 100) : 0}%</div>
              </div>
            </div>
            <div class="summary-message" style="text-align:center;background:rgba(71,178,229,0.1);border:1px solid rgba(71,178,229,0.2);border-radius:12px;padding:1rem;margin-top:1rem;">
              ${hasChanges 
                ? `<p style='color:#000000;margin:0;font-size:1.05rem;line-height:1.5;'><strong>${changed + added + deleted}</strong> changes detected across your data.</p>`
                : '<p style="color:#000000;margin:0;font-size:1.05rem;line-height:1.5;">No changes found. Both datasets are identical.</p>'
              }
            </div>
          </div>
          ${hasChanges 
            ? `<div class="modal-footer" style="padding:1rem 2rem 1.2rem 2rem;display:flex;gap:1rem;justify-content:flex-end;border-top:1px solid rgba(0,0,0,0.1);background:rgba(0,0,0,0.02);">
                <button class="modal-btn secondary" id="sendToMainTable">Send to Main Table</button>
              </div>`
            : ''
          }
        </div>
      </div>
    `;

    // Añadir al DOM
    document.body.appendChild(popup);

    // Event listeners
    const closeBtn = popup.querySelector('#closeSummaryPopup');
    const sendToTableBtn = popup.querySelector('#sendToMainTable');

    const closePopup = () => {
      popup.classList.add('fade-out');
      setTimeout(() => popup.remove(), 300);
    };

    closeBtn?.addEventListener('click', closePopup);
    
    // Cerrar al hacer clic en el overlay
    popup.querySelector('.popup-overlay').addEventListener('click', (e) => {
      if (e.target.classList.contains('popup-overlay')) {
        closePopup();
      }
    });

    if (sendToTableBtn) {
      sendToTableBtn.addEventListener('click', () => {
        closePopup();
        // Trigger the send to main table functionality
        const sendBtn = document.getElementById('sendComparisonToMainTableBtn');
        if (sendBtn) {
          sendBtn.click();
        }
      });
    }

    // Animación de entrada
    setTimeout(() => {
      popup.classList.add('show');
    }, 10);

    // Auto-cerrar después de 15 segundos si no hay cambios
    if (!hasChanges) {
      setTimeout(() => {
        if (document.getElementById('comparisonSummaryPopup')) {
          closePopup();
        }
      }, 15000);
    }
  }

  resetAll() {
    console.log('CSVComparison: Resetting all data...');
    
    // Reset data
    this.originalData = null;
    this.newData = null;
    this.keyColumns = [];
    this.compareColumns = [];
    this.comparisonResults = null;
    
    // Destruir Choices.js si existen
    if (this.keyChoices) {
      try {
        this.keyChoices.destroy();
        this.keyChoices = null;
      } catch (error) {
        console.warn('Error destroying keyChoices:', error);
      }
    }
    
    if (this.compareChoices) {
      try {
        this.compareChoices.destroy();
        this.compareChoices = null;
      } catch (error) {
        console.warn('Error destroying compareChoices:', error);
      }
    }
    
    // Limpiar selects de columnas
    if (this.keyColumnsSelect) {
      this.keyColumnsSelect.innerHTML = '';
    }
    
    if (this.compareColumnsSelect) {
      this.compareColumnsSelect.innerHTML = '';
    }
    
    // Limpiar file inputs
    if (this.originalCSVInput) {
      this.originalCSVInput.value = '';
    }
    
    if (this.newCSVInput) {
      this.newCSVInput.value = '';
    }
    
    // Ocultar información de archivos cargados
    const originalFileInfo = document.getElementById('originalFileInfo');
    if (originalFileInfo) {
      originalFileInfo.style.display = 'none';
    }
    
    const newFileInfo = document.getElementById('newFileInfo');
    if (newFileInfo) {
      newFileInfo.style.display = 'none';
    }
    
    // Limpiar version selects
    if (this.originalVersionSelect) {
      this.originalVersionSelect.value = '';
      // Resetear al primer option si existe
      if (this.originalVersionSelect.options.length > 0) {
        this.originalVersionSelect.selectedIndex = 0;
      }
      if (this.loadOriginalVersionBtn) {
        this.loadOriginalVersionBtn.disabled = true;
      }
    }
    
    if (this.newVersionSelect) {
      this.newVersionSelect.value = '';
      // Resetear al primer option si existe
      if (this.newVersionSelect.options.length > 0) {
        this.newVersionSelect.selectedIndex = 0;
      }
      if (this.loadNewVersionBtn) {
        this.loadNewVersionBtn.disabled = true;
      }
    }
    
    // Resetear tabs de fuente a "Upload File"
    if (this.sourceTabs && this.sourceTabs.length > 0) {
      this.sourceTabs.forEach(tab => {
        const source = tab.dataset.source;
        const target = tab.dataset.target;
        if (source === 'file') {
          tab.classList.add('active');
        } else {
          tab.classList.remove('active');
        }
        
        // Mostrar/ocultar contenido apropiado
        const targetGroup = tab.closest('.file-input-group');
        if (targetGroup) {
          const fileInput = targetGroup.querySelector('.source-file');
          const versionInput = targetGroup.querySelector('.source-version');
          
          if (source === 'file') {
            if (fileInput) {
              fileInput.classList.remove('hidden');
              fileInput.classList.add('active');
            }
            if (versionInput) {
              versionInput.classList.add('hidden');
            }
          } else {
            if (fileInput) {
              fileInput.classList.add('hidden');
              fileInput.classList.remove('active');
            }
            if (versionInput) {
              versionInput.classList.remove('hidden');
            }
          }
        }
      });
    }
    
    // Limpiar tabla de resultados
    if (this.resultsTable) {
      this.resultsTable.innerHTML = '';
    }
    
    // Resetear contadores
    if (this.unchangedCount) this.unchangedCount.textContent = '0';
    if (this.changedCount) this.changedCount.textContent = '0';
    if (this.newCount) this.newCount.textContent = '0';
    if (this.deletedCount) this.deletedCount.textContent = '0';
    
    // Ocultar warning de key columns
    const keyColumnsWarning = document.getElementById('keyColumnsWarning');
    if (keyColumnsWarning) {
      keyColumnsWarning.style.display = 'none';
    }
    
    // Deshabilitar botón de comparación
    if (this.startComparisonBtn) {
      this.startComparisonBtn.disabled = true;
    }
    
    // Cerrar modales
    this.hideResultsModal();
    
    // Limpiar cualquier popup de resumen
    const summaryPopup = document.getElementById('comparisonSummaryPopup');
    if (summaryPopup) {
      summaryPopup.remove();
    }
    
    // Limpiar summary
    if (this.comparisonSummary) {
      this.comparisonSummary.innerHTML = '';
    }
    
    console.log('CSVComparison: Reset completed');
    
    // Mostrar notificación
    if (typeof window.showNotification === 'function') {
      window.showNotification('Data Comparison has been reset', 'success');
    }
  }
}

// Exportar CSVComparison al scope global para que esté disponible
window.CSVComparison = CSVComparison;
console.log('CSVComparison class exported to window object');

// Initialize the comparison functionality - moved to index.html to avoid conflicts
// The initialization is now handled in index.html to ensure proper timing 
// Toast profesional para resumen de comparación
function showComparisonToast({ changed, added, deleted, unchanged }) {
  // Elimina cualquier toast anterior
  document.querySelectorAll('.comparison-toast').forEach(e => e.remove());
  const toast = document.createElement('div');
  toast.className = 'comparison-toast';
  toast.style.position = 'fixed';
  toast.style.top = '38px';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%)';
  toast.style.background = 'rgba(10,25,41,0.97)';
  toast.style.border = '1.5px solid #22334a';
  toast.style.borderRadius = '13px';
  toast.style.boxShadow = '0 6px 32px rgba(25, 118, 210, 0.13)';
  toast.style.padding = '1.1em 2.2em 1.1em 2em';
  toast.style.zIndex = '9999';
  toast.style.fontSize = '1.08em';
  toast.style.color = '#e3f2fd';
  toast.style.fontWeight = '500';
  toast.style.letterSpacing = '0.01em';
  toast.style.display = 'flex';
  toast.style.alignItems = 'center';
  toast.style.gap = '2.2em';
  toast.style.opacity = '0';
  toast.style.transition = 'opacity 0.3s';
  setTimeout(() => { toast.style.opacity = '1'; }, 10);
  toast.innerHTML = `
    <span style='color:#47B2E5;font-weight:700;font-size:1.13em;'>Comparison completed</span>
    <span style='color:#ef6c00;background:#fff3e0;padding:0.2em 0.7em;border-radius:6px;'>Changed: <b>${changed}</b></span>
    <span style='color:#1565c0;background:#e3f2fd;padding:0.2em 0.7em;border-radius:6px;'>New: <b>${added}</b></span>
    <span style='color:#c62828;background:#ffebee;padding:0.2em 0.7em;border-radius:6px;'>Deleted: <b>${deleted}</b></span>
    <span style='color:#2e7d32;background:#e8f5e8;padding:0.2em 0.7em;border-radius:6px;'>Unchanged: <b>${unchanged}</b></span>
  `;
  document.body.appendChild(toast);
  setTimeout(() => { if (toast.parentNode) toast.style.opacity = '0'; }, 7000);
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 7500);
}
