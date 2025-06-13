class CSVComparison {
  constructor() {
    this.originalData = null;
    this.newData = null;
    this.keyColumns = [];
    this.compareColumns = [];
    this.comparisonResults = null;
    
    this.initializeElements();
    this.attachEventListeners();
  }

  initializeElements() {
    // Main modal elements
    this.modal = document.getElementById('csvComparisonModal');
    this.closeBtn = document.getElementById('closeCSVComparisonBtn');
    this.startComparisonBtn = document.getElementById('startComparisonBtn');
    
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
    
    // Column selects
    this.keyColumnsSelect = document.getElementById('keyColumnsSelect');
    this.compareColumnsSelect = document.getElementById('compareColumnsSelect');
    
    // Results elements
    this.resultsTable = document.getElementById('comparisonResultsTable');
    this.unchangedCount = document.getElementById('unchangedCount');
    this.changedCount = document.getElementById('changedCount');
    this.newCount = document.getElementById('newCount');
    this.deletedCount = document.getElementById('deletedCount');
  }

  attachEventListeners() {
    // Main modal controls
    this.closeBtn.addEventListener('click', () => this.hideModal());
    this.startComparisonBtn.addEventListener('click', () => this.compareFiles());
    
    // Results modal controls
    this.closeResultsBtn.addEventListener('click', () => this.hideResultsModal());
    this.exportToExcelBtn.addEventListener('click', () => this.exportToExcel());
    this.exportToPdfBtn.addEventListener('click', () => this.exportToPdf());
    this.copyResultsBtn.addEventListener('click', () => this.copyResults());
    this.backToConfigBtn.addEventListener('click', () => {
      this.hideResultsModal();
      this.showModal();
    });
    
    // File inputs
    this.originalCSVInput.addEventListener('change', (e) => this.handleFileUpload(e, 'original'));
    this.newCSVInput.addEventListener('change', (e) => this.handleFileUpload(e, 'new'));
    
    // Column selects
    this.keyColumnsSelect.addEventListener('change', () => this.updateCompareButton());
    this.compareColumnsSelect.addEventListener('change', () => this.updateCompareButton());

    // Close modals when clicking outside
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.hideModal();
      }
    });
    
    this.resultsModal.addEventListener('click', (e) => {
      if (e.target === this.resultsModal) {
        this.hideResultsModal();
      }
    });

    // Botones seleccionar/deseleccionar todo para claves
    document.getElementById('selectAllKeyBtn').addEventListener('click', () => {
      if (this.keyChoices) {
        this.keyChoices.setChoiceByValue(Array.from(this.keyColumnsSelect.options).map(opt => opt.value));
      }
      this.updateCompareButton();
    });
    document.getElementById('deselectAllKeyBtn').addEventListener('click', () => {
      if (this.keyChoices) {
        this.keyChoices.removeActiveItems();
      }
      this.updateCompareButton();
    });
    // Botones seleccionar/deseleccionar todo para comparación
    document.getElementById('selectAllCompareBtn').addEventListener('click', () => {
      if (this.compareChoices) {
        this.compareChoices.setChoiceByValue(Array.from(this.compareColumnsSelect.options).map(opt => opt.value));
      }
      this.updateCompareButton();
    });
    document.getElementById('deselectAllCompareBtn').addEventListener('click', () => {
      if (this.compareChoices) {
        this.compareChoices.removeActiveItems();
      }
      this.updateCompareButton();
    });
  }

  showModal() {
    this.modal.classList.remove('hidden');
    this.modal.classList.add('visible');
    document.body.style.overflow = 'hidden';
  }

  hideModal() {
    this.modal.classList.remove('visible');
    this.modal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  showResultsModal() {
    this.resultsModal.classList.remove('hidden');
    this.resultsModal.classList.add('visible');
    document.body.style.overflow = 'hidden';
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
      } else {
        this.newData = data;
      }

      this.updateColumnSelects();
      this.updateCompareButton();
    } catch (error) {
      console.error('Error reading CSV file:', error);
      alert('Error reading CSV file. Please try again.');
    }
  }

  updateColumnSelects() {
    if (!this.originalData || !this.newData) return;

    // Ordenar columnas alfabéticamente
    const columns = Object.keys(this.originalData[0] || {}).sort((a, b) => a.localeCompare(b));

    // Clear existing options
    this.keyColumnsSelect.innerHTML = '';
    this.compareColumnsSelect.innerHTML = '';

    // Add new options
    columns.forEach(column => {
      const keyOption = new Option(column, column);
      const compareOption = new Option(column, column);
      this.keyColumnsSelect.add(keyOption);
      this.compareColumnsSelect.add(compareOption);
    });

    // Activar Choices.js si no está activado
    if (!this.keyChoices) {
      this.keyChoices = new Choices(this.keyColumnsSelect, {
        removeItemButton: true,
        searchEnabled: true,
        shouldSort: false,
        placeholder: true,
        placeholderValue: 'Select key columns...'
      });
    } else {
      this.keyChoices.setChoices(columns.map(c => ({ value: c, label: c })), 'value', 'label', true);
    }
    if (!this.compareChoices) {
      this.compareChoices = new Choices(this.compareColumnsSelect, {
        removeItemButton: true,
        searchEnabled: true,
        shouldSort: false,
        placeholder: true,
        placeholderValue: 'Select columns to compare...'
      });
    } else {
      this.compareChoices.setChoices(columns.map(c => ({ value: c, label: c })), 'value', 'label', true);
    }
  }

  updateCompareButton() {
    const hasFiles = this.originalData && this.newData;
    const hasKeyColumns = this.keyColumnsSelect.selectedOptions.length > 0;
    const hasCompareColumns = this.compareColumnsSelect.selectedOptions.length > 0;
    
    this.startComparisonBtn.disabled = !(hasFiles && hasKeyColumns && hasCompareColumns);
  }

  normalize(val) {
    return (val === undefined || val === null) ? '' : String(val).trim().toLowerCase();
  }

  compareFiles() {
    this.keyColumns = Array.from(this.keyColumnsSelect.selectedOptions).map(opt => opt.value);
    this.compareColumns = Array.from(this.compareColumnsSelect.selectedOptions).map(opt => opt.value);
    
    this.comparisonResults = this.performComparison();
    this.displayResults(this.comparisonResults);
    this.showResultsModal();
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
    
    this.compareColumns.forEach(column => {
      if (this.normalize(original[column]) !== this.normalize(newRow[column])) {
        changes.push({
          column,
          old: original[column],
          new: newRow[column]
        });
      }
    });
    
    return changes;
  }

  displayResults(results) {
    // Update counts
    this.unchangedCount.textContent = results.unchanged.length;
    this.changedCount.textContent = results.changed.length;
    this.newCount.textContent = results.new.length;
    this.deletedCount.textContent = results.deleted.length;

    // Generate textual summary
    this.comparisonSummary.innerHTML = this.generateSummaryHTML(results);

    // Clear existing table
    const tbody = this.resultsTable.querySelector('tbody');
    tbody.innerHTML = '';

    // Add rows to table
    [...results.changed, ...results.new, ...results.deleted].forEach(result => {
      const tr = document.createElement('tr');
      tr.className = result.changes ? 'changed' : (result.new ? 'new' : 'deleted');

      // Status cell
      const statusCell = document.createElement('td');
      statusCell.textContent = result.changes ? 'Changed' : (result.new ? 'New' : 'Deleted');
      tr.appendChild(statusCell);

      // Key values cell
      const keyCell = document.createElement('td');
      keyCell.textContent = this.keyColumns.map(col => `${col}: ${result.row && result.row[col] !== undefined ? result.row[col] : ''}`).join(', ');
      tr.appendChild(keyCell);

      // Changes cell
      const changesCell = document.createElement('td');
      changesCell.className = 'changes-cell';
      
      if (result.changes) {
        changesCell.innerHTML = result.changes.map(change => 
          `<div>${change.column}: <span class=\"change-old\">${change.old}</span> → <span class=\"change-new\">${change.new}</span></div>`
        ).join('');
      } else if (result.new) {
        changesCell.textContent = 'New row';
      } else {
        changesCell.textContent = 'Deleted row';
      }
      
      tr.appendChild(changesCell);
      tbody.appendChild(tr);
    });
  }

  generateSummaryHTML(results) {
    let html = '';
    if (results.changed.length) {
      html += `<div style="margin-bottom:0.7em;"><span style='color:#ef6c00;font-weight:600;'>🔁 Changed (${results.changed.length}):</span><ul style='margin:0 0 0 1.2em;'>`;
      results.changed.forEach(r => {
        html += `<li>${this.keyColumns.map(col => `<b>${col}:</b> ${r.original && r.original[col] !== undefined && r.original[col] !== '' ? r.original[col] : 'BLANK'}`).join(', ')}<br>`;
        r.changes.forEach(change => {
          html += `<span style='color:#c62828;text-decoration:line-through;'>${change.old}</span> → <span style='color:#2e7d32;'>${change.new}</span> <b>(${change.column})</b><br>`;
        });
        html += '</li>';
      });
      html += '</ul></div>';
    }
    if (results.new.length) {
      html += `<div style="margin-bottom:0.7em;"><span style='color:#1565c0;font-weight:600;'>🆕 New (${results.new.length}):</span><ul style='margin:0 0 0 1.2em;'>`;
      results.new.forEach(r => {
        html += `<li>${this.keyColumns.map(col => `<b>${col}:</b> ${r.row && r.row[col] !== undefined && r.row[col] !== '' ? r.row[col] : 'BLANK'}`).join(', ')}</li>`;
      });
      html += '</ul></div>';
    }
    if (results.deleted.length) {
      html += `<div style="margin-bottom:0.7em;"><span style='color:#c62828;font-weight:600;'>❌ Deleted (${results.deleted.length}):</span><ul style='margin:0 0 0 1.2em;'>`;
      results.deleted.forEach(r => {
        html += `<li>${this.keyColumns.map(col => `<b>${col}:</b> ${r.row && r.row[col] !== undefined && r.row[col] !== '' ? r.row[col] : 'BLANK'}`).join(', ')}</li>`;
      });
      html += '</ul></div>';
    }
    if (!results.changed.length && !results.new.length && !results.deleted.length) {
      html += `<div style='color:#2e7d32;font-weight:600;'>✅ No changes found.</div>`;
    }
    return html;
  }

  exportToExcel() {
    const workbook = XLSX.utils.book_new();
    
    // Create worksheets for each type of change
    const sheets = {
      'Changed': this.resultsTable.querySelectorAll('tr.changed'),
      'New': this.resultsTable.querySelectorAll('tr.new'),
      'Deleted': this.resultsTable.querySelectorAll('tr.deleted')
    };

    for (const [sheetName, rows] of Object.entries(sheets)) {
      const data = Array.from(rows).map(row => {
        const cells = row.cells;
        return {
          Status: cells[0].textContent,
          'Key Values': cells[1].textContent,
          Changes: cells[2].textContent
        };
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
    doc.text(this.comparisonSummary.innerText || '', 14, 45);

    // Save the PDF
    doc.save('data_comparison_results.pdf');
  }

  copyResults() {
    const text = this.comparisonSummary.innerText || '';
    navigator.clipboard.writeText(text).then(() => {
      // Show a temporary success message
      const notification = document.createElement('div');
      notification.className = 'notification success';
      notification.textContent = 'Summary copied to clipboard';
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.remove();
      }, 2000);
    });
  }
}

// Initialize the comparison functionality
document.addEventListener('DOMContentLoaded', () => {
  const compareCSVBtn = document.getElementById('compareCSVBtn');
  const csvComparison = new CSVComparison();

  compareCSVBtn.addEventListener('click', () => {
    csvComparison.showModal();
  });
}); 