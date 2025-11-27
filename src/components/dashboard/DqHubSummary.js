/**
 * Data Quality Hub Summary Manager
 * Replica exactamente la lógica y experiencia del Operations Hub Summary
 */

import { getFilteredData } from '../filters/FilterManager.js';
import { loadQuickFilters } from '../filters/FilterManager.js';

export class DqHubSummary {
    constructor() {
    this.selectedCards = new Set();
    this.quickCardsData = {};
    this.currentPriority = '';
    this.cardConfigs = {}; // Store individual card configurations
    this.reportConfig = {
      includeTableData: true,
      viewType: 'both',
      removeDuplicates: false,
      duplicateColumns: [],
      tableDataLimit: 50,
      tableView: 'current',
      separateTablesPerCard: false
    };
    
    // Performance optimizations
    this.previewUpdateTimeout = null;
    this.cachedData = new Map();
    this.lastConfigHash = '';
    this.isGeneratingPreview = false;
    this.duplicateAnalysisTimeout = null;
        this.init();
    }

    init() {
    this.bindEvents();
    this.setupModalHandlers();
    
    // Expose global function for HTML event handlers
    window.dqFilterDuplicateColumns = () => {
      if (window.dqHubSummaryInstance) {
        window.dqHubSummaryInstance.filterDuplicateColumns();
      }
    };
  }

  bindEvents() {
    // Generate summary button in dashboard
    const generateBtn = document.getElementById('generateDqSummaryBtn');
    if (generateBtn) {
      generateBtn.addEventListener('click', () => this.openSummaryModal());
    }

    // Modal close button
    const closeBtn = document.getElementById('closeDqSummaryBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeSummaryModal());
    }

    // Action buttons
    const copyBtn = document.getElementById('dqCopySummaryBtn');
    const pdfBtn = document.getElementById('dqExportSummaryPdfBtn');
    const excelBtn = document.getElementById('dqExportSummaryExcelBtn');

    if (copyBtn) copyBtn.addEventListener('click', () => this.copyToClipboard());
    if (pdfBtn) pdfBtn.addEventListener('click', () => this.exportToPdf());
    if (excelBtn) excelBtn.addEventListener('click', () => this.exportToExcel());
  }

  setupModalHandlers() {
    const modal = document.getElementById('dqSummaryModal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeSummaryModal();
        }
      });
    }
  }

  openSummaryModal() {
    console.log('DQ Opening summary modal...');
    
    // Expose instance globally for HTML event handlers
    window.dqHubSummaryInstance = this;
    
    // Restore current state before opening
    this.restoreCurrentState();
    
    // Force refresh of quick filters data before collecting
    if (typeof window.renderDqDashboardQuickFilters === 'function') {
      console.log('DQ Refreshing quick filters...');
      window.renderDqDashboardQuickFilters();
    }
    
    // Wait a bit for the DOM to update, then collect data
    setTimeout(() => {
      console.log('DQ Setting up modal content...');
      this.collectQuickCardsData();
      this.updateSummaryInfo();
      this.renderCardsSelection();
      this.renderSummaryPreview();
      
      // Setup modal event listeners after DOM is ready
      console.log('DQ Setting up event listeners...');
      this.setupModalEventListeners();
      
      // FORCE POPULATE COLUMNS IMMEDIATELY
      console.log('DQ FORCING populateDuplicateColumns...');
      this.populateDuplicateColumns();
      
      const modal = document.getElementById('dqSummaryModal');
      if (modal) {
        modal.classList.remove('hidden');
        console.log('DQ Modal opened successfully');
      } else {
        console.log('DQ Modal element not found');
      }
    }, 100);
  }

  setupModalEventListeners() {
    console.log('Setting up DQ modal event listeners...');
    
    // Report options
        const includeTableDataCheckbox = document.getElementById('dqIncludeTableDataCheckbox');
        if (includeTableDataCheckbox) {
      console.log('Found includeTableDataCheckbox');
      includeTableDataCheckbox.addEventListener('change', () => {
        console.log('Table data checkbox changed:', includeTableDataCheckbox.checked);
        this.renderSummaryPreview();
      });
    } else {
      console.log('NOT FOUND: includeTableDataCheckbox');
    }
    
        const includeTechnicalInfoCheckbox = document.getElementById('dqIncludeTechnicalInfoCheckbox');
        if (includeTechnicalInfoCheckbox) {
      console.log('Found includeTechnicalInfoCheckbox');
      includeTechnicalInfoCheckbox.addEventListener('change', () => {
        console.log('Technical info checkbox changed:', includeTechnicalInfoCheckbox.checked);
        this.renderSummaryPreview();
      });
    } else {
      console.log('NOT FOUND: includeTechnicalInfoCheckbox');
    }

    // Duplicate removal
        const removeDuplicatesCheckbox = document.getElementById('dqRemoveDuplicatesCheckbox');
        if (removeDuplicatesCheckbox) {
      console.log('DQ Found removeDuplicatesCheckbox, setting up event listener');
            removeDuplicatesCheckbox.addEventListener('change', () => {
        console.log('DQ Checkbox change event triggered');
        this.handleDuplicateRemovalChange();
      });
    } else {
      console.log('DQ ERROR: removeDuplicatesCheckbox not found');
    }

    // Duplicate columns controls
    const selectAllColumnsBtn = document.getElementById('dqSelectAllDuplicateColumnsBtn');
    const deselectAllColumnsBtn = document.getElementById('dqDeselectAllDuplicateColumnsBtn');
    const selectCommonFieldsBtn = document.getElementById('dqSelectCommonFieldsBtn');

    if (selectAllColumnsBtn) {
      selectAllColumnsBtn.addEventListener('click', () => this.selectAllDuplicateColumns());
    }
    if (deselectAllColumnsBtn) {
      deselectAllColumnsBtn.addEventListener('click', () => this.deselectAllDuplicateColumns());
    }
  }

  closeSummaryModal() {
    const modal = document.getElementById('dqSummaryModal');
    if (modal) {
      modal.classList.add('hidden');
    }
    
    // Save current state to localStorage before clearing
    this.saveCurrentState();
    
    // Cleanup timeouts to prevent memory leaks
    this.cleanup();
  }
  
  saveCurrentState() {
    try {
      const currentState = {
        selectedCards: Array.from(this.selectedCards),
        cardConfigs: this.cardConfigs,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('dqSummaryCurrentState', JSON.stringify(currentState));
      console.log('DQ Current state saved:', currentState);
    } catch (error) {
      console.error('DQ Error saving current state:', error);
    }
  }
  
  restoreCurrentState() {
    try {
      const savedState = localStorage.getItem('dqSummaryCurrentState');
      if (savedState) {
        const state = JSON.parse(savedState);
        
        // Restore selected cards
        if (state.selectedCards && state.selectedCards.length > 0) {
          this.selectedCards.clear();
          state.selectedCards.forEach(cardId => {
            this.selectedCards.add(cardId);
          });
        }
        
        // Restore card configurations
        if (state.cardConfigs) {
          this.cardConfigs = { ...this.cardConfigs, ...state.cardConfigs };
        }
        
        console.log('DQ Current state restored:', state);
        return true;
      }
    } catch (error) {
      console.error('DQ Error restoring current state:', error);
    }
    return false;
  }

  cleanup() {
    // Clear all timeouts
    if (this.previewUpdateTimeout) {
      clearTimeout(this.previewUpdateTimeout);
      this.previewUpdateTimeout = null;
    }
    
    if (this.duplicateAnalysisTimeout) {
      clearTimeout(this.duplicateAnalysisTimeout);
      this.duplicateAnalysisTimeout = null;
    }
    
    // Reset flags
    this.isGeneratingPreview = false;
    
    // Clear cache to free memory
    this.cachedData.clear();
  }

  collectQuickCardsData() {
    console.log('Collecting DQ quick cards data...');
    this.quickCardsData = {};
    this.currentPriority = '';

    // Get current priority filter
    const activeChip = document.querySelector('#dqDashboardModal .dq-hub-chip.active');
    if (activeChip) {
      this.currentPriority = activeChip.getAttribute('data-urgency');
      console.log('Current DQ priority filter:', this.currentPriority);
    } else {
      console.log('No active DQ priority filter found');
    }

    // Collect data from quick cards - look for kpi-card elements in quickfilter containers
    let quickCards = document.querySelectorAll('#dqDashboardModal .quickfilter-cards-container .kpi-card');
    
    // If no cards found, try alternative selectors
    if (quickCards.length === 0) {
      quickCards = document.querySelectorAll('#dqDashboardModal .quickfilters-grid .kpi-card');
    }
    
    // If still no cards, try any kpi-card in the DQ dashboard
    if (quickCards.length === 0) {
      quickCards = document.querySelectorAll('#dqDashboardModal .kpi-card');
    }

    quickCards.forEach(card => {
      const cardId = card.getAttribute('data-card-id') || this.generateCardId(card);
      
      // Get card name from kpi-title
      let cardName = card.querySelector('.kpi-title')?.textContent;
      if (!cardName) {
        cardName = card.querySelector('[class*="title"]')?.textContent;
      }
      if (!cardName) {
        cardName = card.querySelector('h4, h5, h6')?.textContent;
      }
      if (!cardName) {
        cardName = 'DQ Quick Filter Card';
      }

      // Get count from kpi-value
      let countElement = card.querySelector('.kpi-value');
      if (!countElement) {
        countElement = card.querySelector('[class*="value"]');
      }
      if (!countElement) {
        countElement = card.querySelector('.count, [data-count]');
      }
      
      let count = 0;
      if (countElement) {
        const countText = countElement.textContent.trim();
        // Handle cases where count might be "-" or other non-numeric values
        if (countText !== '-' && countText !== '') {
          count = parseInt(countText.replace(/,/g, '')) || 0;
        }
      }
      
      const isActive = card.classList.contains('active');

      this.quickCardsData[cardId] = {
        id: cardId,
        name: cardName,
        count: count,
        active: isActive,
        element: card
      };
    });

    // If no cards found, create a default message
    if (Object.keys(this.quickCardsData).length === 0) {
      this.quickCardsData['no_cards'] = {
        id: 'no_cards',
        name: 'No DQ Quick Cards Available',
        count: 0,
        active: false,
        element: null
      };
    }
    
    console.log('Collected DQ quick cards data:', this.quickCardsData);
    console.log('Total DQ cards found:', Object.keys(this.quickCardsData).length);
  }

  generateCardId(card) {
    const title = card.querySelector('.kpi-title')?.textContent || '';
    return `dq_card_${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
  }

  getDqQuickFilterPreviewCount(filterName) {
    // Get preview count for DQ quick filter
    if (typeof window.getDqQuickFilterPreviewCount === 'function') {
      return window.getDqQuickFilterPreviewCount(filterName);
    }
    return '0';
  }

  updateSummaryInfo() {
    const totalCards = Object.keys(this.quickCardsData).length;
    const activeCards = Object.values(this.quickCardsData).filter(card => card.isActive).length;
    
    console.log(`DQ Summary Info: ${activeCards}/${totalCards} cards active`);
  }

  renderCardsSelection() {
    const cardsContainer = document.getElementById('dqQuickCardsSelection');
    if (!cardsContainer) return;

    cardsContainer.innerHTML = '';

    Object.values(this.quickCardsData).forEach(cardData => {
      const cardElement = this.createCardSelectionItem(cardData);
      cardsContainer.appendChild(cardElement);
    });
  }

  createCardSelectionItem(cardData) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card-selection-item';
    cardDiv.dataset.cardId = cardData.id;
    
    // Set base styles
    cardDiv.style.background = 'white';
    cardDiv.style.border = '1px solid #e0e0e0';
    cardDiv.style.borderRadius = '8px';
    cardDiv.style.padding = '1.2rem';
    cardDiv.style.marginBottom = '0.8rem';
    cardDiv.style.transition = 'all 0.3s ease';
    cardDiv.style.cursor = 'pointer';

    const isSelected = this.selectedCards.has(cardData.id);
    if (isSelected) {
      cardDiv.style.borderColor = '#47B2E5';
      cardDiv.style.backgroundColor = 'rgba(71, 178, 229, 0.1)';
      cardDiv.style.boxShadow = '0 2px 8px rgba(71, 178, 229, 0.2)';
    }

    const cardConfig = this.getCardConfig(cardData.id);
    const savedViews = this.loadSavedViews();
    const viewOptions = Object.keys(savedViews).map(name => 
      `<option value="${name}">${name}</option>`
    ).join('');

    cardDiv.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
        <div style="display: flex; align-items: center; gap: 0.8rem;">
          <input type="checkbox" class="card-checkbox-input" ${isSelected ? 'checked' : ''} style="
            transform: scale(1.1);
            margin: 0;
          ">
          <h4 style="margin: 0; color: #000000; font-size: 1.1rem; font-weight: 600;">${cardData.name}</h4>
        </div>
        
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span class="card-count-display" style="color: #47B2E5; font-weight: 600; font-size: 0.9rem;">${cardData.count.toLocaleString()} records</span>
        </div>
        
        <div class="card-options" style="
          display: flex;
          gap: 0.8rem;
          align-items: center;
          flex-wrap: wrap;
        ">
          <div class="view-type-selector" style="display: flex; align-items: center; gap: 0.5rem;">
            <label style="font-size: 0.8rem; color: #666; white-space: nowrap;">Display:</label>
            <select class="filter-select card-view-type" data-card-id="${cardData.id}" style="
              padding: 0.4rem 0.6rem;
              border: 1px solid #ddd;
              border-radius: 4px;
              font-size: 0.8rem;
              min-width: 100px;
            ">
              <option value="summary" ${this.getCardConfig(cardData.id).viewType === 'summary' ? 'selected' : ''}>Summary</option>
              <option value="table" ${this.getCardConfig(cardData.id).viewType === 'table' ? 'selected' : ''}>Table</option>
              <option value="both" ${this.getCardConfig(cardData.id).viewType === 'both' ? 'selected' : ''}>Both</option>
              <option value="charts" ${this.getCardConfig(cardData.id).viewType === 'charts' ? 'selected' : ''}>Charts</option>
            </select>
          </div>
          
          <div class="saved-view-selector" style="display: flex; align-items: center; gap: 0.5rem;">
            <label style="font-size: 0.8rem; color: #666; white-space: nowrap;">Saved View:</label>
            <select class="filter-select card-saved-view" data-card-id="${cardData.id}" style="
              padding: 0.4rem 0.6rem;
              border: 1px solid #ddd;
              border-radius: 4px;
              font-size: 0.8rem;
              min-width: 120px;
            ">
              <option value="current" ${this.getCardConfig(cardData.id).savedView === 'current' ? 'selected' : ''}>Current view</option>
              ${viewOptions}
            </select>
          </div>
          

        </div>
                </div>
            `;

    // Bind events
    const checkbox = cardDiv.querySelector('.card-checkbox-input');
    const viewTypeSelect = cardDiv.querySelector('.card-view-type');
    const savedViewSelect = cardDiv.querySelector('.card-saved-view');

    checkbox.addEventListener('change', (e) => {
      e.stopPropagation();
      console.log('DQ Checkbox changed for card:', cardData.id, 'checked:', checkbox.checked);
      this.toggleCardSelection(cardData.id, cardDiv);
    });
    
    // También agregar evento click en toda la card para facilitar la selección
    cardDiv.addEventListener('click', (e) => {
      // No hacer nada si se hace click en el checkbox o en los selects
      if (e.target.closest('.card-checkbox-input') || e.target.closest('select')) {
        return;
      }
      e.preventDefault();
      checkbox.checked = !checkbox.checked;
      this.toggleCardSelection(cardData.id, cardDiv);
    });

    viewTypeSelect.addEventListener('change', () => {
      console.log(`View type changed for card ${cardData.id} to: ${viewTypeSelect.value}`);
      this.updateCardConfig(cardData.id, 'viewType', viewTypeSelect.value);
      
      // Force immediate preview update
      this.renderSummaryPreview();
    });

    savedViewSelect.addEventListener('change', () => {
      this.updateCardConfig(cardData.id, 'savedView', savedViewSelect.value);
      this.renderSummaryPreview();
    });

    // Set initial state AFTER HTML is set
    setTimeout(() => {
      if (this.selectedCards.has(cardData.id)) {
        checkbox.checked = true;
        cardDiv.style.setProperty('border-color', '#47B2E5', 'important');
        cardDiv.style.setProperty('background-color', 'rgba(71, 178, 229, 0.1)', 'important');
        cardDiv.style.setProperty('box-shadow', '0 2px 8px rgba(71, 178, 229, 0.2)', 'important');
      }
    }, 0);

    return cardDiv;
  }

  toggleCardSelection(cardId, element) {
    console.log('DQ toggleCardSelection called for:', cardId);
    
    if (this.selectedCards.has(cardId)) {
      this.selectedCards.delete(cardId);
      element.style.setProperty('border-color', '#e0e0e0', 'important');
      element.style.setProperty('background-color', 'white', 'important');
      element.style.setProperty('box-shadow', 'none', 'important');
      const checkbox = element.querySelector('.card-checkbox-input');
      if (checkbox) checkbox.checked = false;
      console.log('DQ Card deselected:', cardId);
    } else {
      this.selectedCards.add(cardId);
      element.style.setProperty('border-color', '#47B2E5', 'important');
      element.style.setProperty('background-color', 'rgba(71, 178, 229, 0.1)', 'important');
      element.style.setProperty('box-shadow', '0 2px 8px rgba(71, 178, 229, 0.2)', 'important');
      const checkbox = element.querySelector('.card-checkbox-input');
      if (checkbox) checkbox.checked = true;
      console.log('DQ Card selected:', cardId);
    }
    
    // Forzar re-renderizado visual inmediato
    element.style.setProperty('transition', 'all 0.2s ease', 'important');
    
    // Forzar actualización del DOM
    element.offsetHeight; // Trigger reflow
    
    // Actualizar números de registros en cascada
    this.updateAllCardCounts();
    
    this.renderSummaryPreview();
  }
  
  updateAllCardCounts() {
    // Recalcular y actualizar los números de registros de todas las cards
    const cardsContainer = document.getElementById('dqQuickCardsSelection');
    if (!cardsContainer) {
      return;
    }
    
    const selectedCardsData = Object.values(this.quickCardsData)
      .filter(card => this.selectedCards.has(card.id));
    
    // Recalcular números para cada card visible
    Object.values(this.quickCardsData).forEach(cardData => {
      const cardElement = cardsContainer.querySelector(`[data-card-id="${cardData.id}"]`);
      if (!cardElement) {
        return;
      }
      
      // Buscar el elemento que muestra el número de registros de múltiples formas
      let countElement = cardElement.querySelector('.card-count-display');
      if (!countElement) {
        countElement = cardElement.querySelector('span[style*="color: #47B2E5"]');
      }
      if (!countElement) {
        // Intentar buscar por texto que contiene "records"
        const spans = cardElement.querySelectorAll('span');
        countElement = Array.from(spans).find(span => span.textContent.includes('records'));
      }
      if (!countElement) {
        // Intentar buscar por clase o estructura
        const countDiv = cardElement.querySelector('div[style*="display: flex"]');
        if (countDiv) {
          countElement = countDiv.querySelector('span');
        }
      }
      
      if (!countElement) {
        return;
      }
      
      // Calcular el nuevo número de registros considerando los filtros combinados
      let newCount = cardData.count;
      
      // Si hay cards seleccionadas, recalcular el número considerando los filtros combinados
      if (selectedCardsData.length > 0) {
        try {
          const cardConfig = this.getCardConfig(cardData.id);
          const cardDataWithConfig = this.getDataForQuickCardWithConfig(cardData, cardConfig);
          
          if (cardDataWithConfig && Array.isArray(cardDataWithConfig)) {
            newCount = cardDataWithConfig.length;
          }
        } catch (error) {
          // Silently handle errors
        }
      }
      
      // Actualizar el número en el DOM
      if (countElement) {
        countElement.textContent = `${newCount.toLocaleString()} records`;
        // Forzar actualización visual con animación
        countElement.style.setProperty('transition', 'color 0.2s ease', 'important');
        countElement.style.setProperty('color', '#47B2E5', 'important');
        // Trigger reflow para forzar actualización
        countElement.offsetHeight;
      }
      
      // Actualizar también en los datos
      cardData.count = newCount;
    });
  }

  renderSummaryPreview() {
    // Debounce preview updates for performance
    if (this.previewUpdateTimeout) {
      clearTimeout(this.previewUpdateTimeout);
    }
    
    this.previewUpdateTimeout = setTimeout(() => {
      this._renderSummaryPreviewInternal();
    }, 300);
  }

  _renderSummaryPreviewInternal() {
    const preview = document.getElementById('dqSummaryPreview');
    if (!preview || this.isGeneratingPreview) {
      return;
    }

    this.isGeneratingPreview = true;
    
    try {
      const selectedCardsData = Object.values(this.quickCardsData)
        .filter(card => this.selectedCards.has(card.id));
      
      // Show loading indicator for large datasets
      if (selectedCardsData.length > 5) {
        preview.innerHTML = '<div style="text-align:center; padding:2rem; color:#666;">Generating preview...</div>';
      }
      
      // Use requestAnimationFrame to prevent blocking
      requestAnimationFrame(() => {
        const html = this.generatePreviewHTML(selectedCardsData);
        preview.innerHTML = html;
        this.isGeneratingPreview = false;
      });
    } catch (error) {
      preview.innerHTML = '<div style="text-align:center; padding:2rem; color:#f44336;">Error generating preview</div>';
      this.isGeneratingPreview = false;
    }
  }

  generatePreviewHTML(selectedCards) {
    const config = this.getReportConfig();
    
    // Always generate separate tables for each selected card with their individual configurations
    if (selectedCards.length > 0) {
      return this.generateSeparateTablesForCards(selectedCards, config);
    }
    
    // If no cards selected, show empty state
    return '<div style="color:#888; text-align:center; padding:2rem;">No cards selected. Please select quick cards to see the preview.</div>';
  }

  generateSeparateTablesForCards(selectedCards, config) {
    if (!selectedCards || selectedCards.length === 0) {
      return '<div style="color:#888; text-align:center; padding:2rem;">No cards selected for separate tables.</div>';
    }

    let tablesHtml = '';
    let totalRecords = 0;
    let totalOriginalRecords = 0;
    let totalRemovedDuplicates = 0;
    
    // Generate summary section first
    const summarySection = this.generateSummarySection(selectedCards, config);
    tablesHtml += summarySection;
    
    // Process each selected card with its individual configuration
    selectedCards.forEach((card, index) => {
      console.log(`DQ Processing card ${index + 1}/${selectedCards.length}: "${card.name}"`);
      
      const cardConfig = this.getCardConfig(card.id);
      console.log(`DQ Card config:`, cardConfig);
      
      const cardData = this.getDataForQuickCardWithConfig(card, cardConfig);
      console.log(`DQ Card data received:`, cardData?.length || 0, 'records');
      console.log(`DQ Card data type:`, typeof cardData);
      console.log(`DQ Card data is array:`, Array.isArray(cardData));
      if (cardData && cardData.length > 0) {
        console.log(`DQ First record sample:`, cardData[0]);
      }
      
      if (cardData && cardData.length > 0) {
        totalOriginalRecords += cardData.length;
        
        // Apply duplicate removal if enabled
        const originalCount = cardData.length;
        console.log(`DQ Processing card "${card.name}": ${originalCount} original records`);
        
        const processedData = this.removeDuplicatesFromData(cardData, config);
        const removedCount = originalCount - processedData.length;
        totalRemovedDuplicates += removedCount;
        
        console.log(`DQ Card "${card.name}" after duplicate removal: ${processedData.length} records (removed ${removedCount})`);
        
        // Use card's individual view type setting
        const cardViewConfig = {
          ...config,
          viewType: cardConfig.viewType || 'both'
        };
        
        // Generate appropriate content based on card's view type
        let cardContent = '';
        
        if (cardConfig.viewType === 'summary') {
          // Only show summary info for this card
          let duplicateInfo = '';
          if (config.removeDuplicates && config.duplicateColumns.length > 0 && removedCount > 0) {
            duplicateInfo = `<div style="color:#1976d2; font-size:10px; margin-top:0.2rem;">Removed ${removedCount} duplicates</div>`;
          }
          
          cardContent = `
            <div style="margin-bottom:2rem; padding:0.8rem; background:#f8f9fa; border-radius:6px; border-left:3px solid #47B2E5;">
              <h4 style="margin:0 0 0.3rem 0; color:#000000; font-size:12px;">${card.name}</h4>
              <div style="color:#47B2E5; font-weight:600; font-size:11px;">${processedData.length.toLocaleString()} records</div>
              <div style="color:#666; font-size:10px; margin-top:0.2rem;">View type: Summary only</div>
              ${duplicateInfo}
                    </div>
          `;
        } else if (cardConfig.viewType === 'charts') {
          // Show charts placeholder for this card
          cardContent = `
            <div style="margin-bottom:2rem;">
              <h3 style="font-size:1.1rem; color:#15364A; margin-bottom:0.5rem; border-bottom:1px solid #e3f2fd; padding-bottom:0.3rem;">
                ${card.name} - Charts
              </h3>
              <div style="color:#888; text-align:center; padding:1rem; background:#f8f9fa; border-radius:6px; font-size:10px;">
                Charts functionality will be available in future updates
              </div>
            </div>
          `;
        } else {
          // Show table data (for 'table' or 'both' view types) - ONLY if includeTableData is enabled
          if (config.includeTableData) {
            console.log(`DQ Generating table for card "${card.name}" with ${processedData.length} records`);
            const tableConfig = {
              ...cardViewConfig,
              savedView: cardConfig.savedView // Pass the saved view to the table generation
            };
            const tableHtml = this.generateTableDataSection(processedData, tableConfig, `${card.name}`);
            cardContent = tableHtml;
          } else {
            // Show summary only when table data is disabled
            cardContent = `
              <div style="margin-bottom:2rem; padding:0.8rem; background:#f8f9fa; border-radius:6px; border-left:3px solid #47B2E5;">
                <h4 style="margin:0 0 0.3rem 0; color:#000000; font-size:12px;">${card.name}</h4>
                <div style="color:#47B2E5; font-weight:600; font-size:11px;">${processedData.length.toLocaleString()} records</div>
                <div style="color:#666; font-size:10px; margin-top:0.2rem;">Table data disabled in report options</div>
              </div>
            `;
          }
        }
        
        tablesHtml += cardContent;
        totalRecords += processedData.length;
        
        // Add card configuration info with duplicate removal info - ONLY if enabled
        if (config.includeCardConfig) {
          let duplicateInfo = '';
          if (config.removeDuplicates && config.duplicateColumns.length > 0) {
            if (removedCount > 0) {
              duplicateInfo = ` | Duplicates removed: ${removedCount}`;
            } else {
              duplicateInfo = ` | No duplicates found`;
            }
          }
          
          const configInfo = `
            <div style="margin-bottom:2rem; padding:1rem; background:#e3f2fd; border-radius:6px; font-size:9px; color:#1976d2; line-height:1.5;">
              <strong>Card Configuration:</strong><br>
              View: ${cardConfig.viewType} | 
              Saved View: ${cardConfig.savedView} | 
              Active: ${cardConfig.active ? 'Yes' : 'No'} | 
              Records: ${processedData.length.toLocaleString()}${duplicateInfo}
                    </div>
          `;
          tablesHtml += configInfo;
        }
      } else {
        // No data for this card
        console.log(`DQ No data available for card "${card.name}"`);
        tablesHtml += `
          <div style="margin-bottom:2rem;">
            <h3 style="font-size:1.1rem; color:#15364A; margin-bottom:0.5rem; border-bottom:1px solid #e3f2fd; padding-bottom:0.3rem;">
              ${card.name}
            </h3>
            <div style="color:#888; text-align:center; padding:1rem; background:#f8f9fa; border-radius:6px; font-size:10px;">
              No data available for this card
            </div>
          </div>
        `;
      }
    });

    // Add overall duplicate removal summary if enabled
    let duplicateSummary = '';
    if (config.removeDuplicates && config.duplicateColumns.length > 0 && totalRemovedDuplicates > 0 && config.includeDuplicateSummary) {
      duplicateSummary = `
        <div style="margin-bottom:0.8rem; padding:0.8rem; background:#e8f5e8; border-radius:6px; border-left:3px solid #4caf50;">
          <div style="color:#2e7d32; font-weight:600; margin-bottom:0.3rem; font-size:11px;">✓ Duplicate Removal Summary</div>
          <div style="color:#388e3c; font-size:10px;">
            Removed ${totalRemovedDuplicates.toLocaleString()} duplicate records across all cards<br>
            Based on columns: ${config.duplicateColumns.join(', ')}
                    </div>
        </div>
      `;
    }

    // Generate title section only if summary info is enabled
    let titleSection = '';
    if (config.includeSummaryInfo) {
      titleSection = `
        <h2 style="font-size:1.1rem; color:#15364A; margin-bottom:1.5rem; border-bottom:1px solid #e3f2fd; padding-bottom:0.5rem;">
          Quick Cards Data (${selectedCards.length} cards, ${totalRecords.toLocaleString()} total records)
        </h2>
      `;
    }

    console.log(`DQ generateSeparateTablesForCards completed: ${totalRecords} total records from ${selectedCards.length} cards`);

    return `
      <div style="margin-bottom:3rem;">
        ${titleSection}
        ${duplicateSummary}
        ${tablesHtml}
                    </div>
    `;
  }

  generateSummarySection(selectedCards, config) {
    const tableRows = selectedCards.length > 0 ? selectedCards.map(card => `
      <tr>
        <td style="padding:6px 10px; border:1px solid #ddd; color:#222; font-size:9px;">${card.name}</td>
        <td style="padding:6px 10px; border:1px solid #ddd; color:#1976d2; text-align:right; font-size:9px; font-weight:600;">${card.count}</td>
      </tr>
    `).join('') : `<tr><td colspan="2" style="padding:8px 10px; color:#888; text-align:center; font-size:9px;">No cards selected.</td></tr>`;
    
    return `
      <div style="margin-bottom:2.5rem;">
        <h2 style="font-size:1.1rem; color:#15364A; margin-bottom:1.5rem; border-bottom:1px solid #e3f2fd; padding-bottom:0.5rem;">Quick Cards Summary</h2>
        <table style="width:100%; border-collapse:collapse; margin:1.5rem 0; font-size:9px; max-width:350px;">
          <thead>
            <tr style="background:#f5f5f5;">
              <th style="padding:6px 10px; color:#1976d2; text-align:left; border:1px solid #ddd; font-weight:600;">Card</th>
              <th style="padding:6px 10px; color:#1976d2; text-align:right; border:1px solid #ddd; font-weight:600;">Records</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
                    </div>
    `;
  }

  generateTableDataSection(tableData, config, customTitle = 'Table Data') {
    console.log(`DQ generateTableDataSection called for "${customTitle}":`, {
      dataLength: tableData?.length || 0,
      config: config
    });
    
    if (!tableData || tableData.length === 0) {
      return `
        <div style="margin-bottom:2rem;">
          <h2 style="font-size:1.5rem; color:#15364A; margin-bottom:1rem; border-bottom:2px solid #e3f2fd; padding-bottom:0.5rem;">${customTitle}</h2>
          <div style="color:#888; text-align:center; padding:2rem; background:#f8f9fa; border-radius:8px;">No table data available</div>
            </div>
        `;
    }

    // Get column headers from the first row
    let headers = Object.keys(tableData[0]);
    
    // Apply saved view columns if specified
    if (config.savedView && config.savedView !== 'current') {
      const savedViews = this.loadSavedViews();
      const selectedView = savedViews[config.savedView];
      
      if (selectedView && selectedView.columns) {
        console.log(`DQ Applying saved view columns "${config.savedView}" to table:`, selectedView.columns);
        // Filter headers to only include columns from the saved view
        headers = headers.filter(header => selectedView.columns.includes(header));
        console.log(`DQ Filtered headers for saved view:`, headers);
      }
    }
    
    // Limit rows to prevent collapse - show max 50 rows in preview
    const maxRows = 50;
    const displayData = tableData.slice(0, maxRows);
    const totalRows = tableData.length;
    const shownRows = Math.min(totalRows, maxRows);
    
    // Generate table rows with compact email-friendly styling - NO WRAP
    const dataRows = displayData.map(row => {
      const cells = headers.map(header => {
        const value = row[header] || '';
        // Truncate very long values to prevent layout issues and make it email-friendly
        const displayValue = value.length > 25 ? value.substring(0, 25) + '...' : value;
        return `<td style="padding:4px 6px; border:1px solid #ddd; color:#333; font-size:9px; max-width:60px; overflow:hidden; text-overflow:ellipsis; text-align:left; white-space:nowrap;">${displayValue}</td>`;
      }).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    // Generate header row with compact styling - NO WRAP
    const headerRow = headers.map(header => {
      // Truncate header text if too long
      const displayHeader = header.length > 15 ? header.substring(0, 15) + '...' : header;
      return `<th style="padding:6px 8px; color:#1976d2; text-align:left; border:1px solid #ddd; background:#f5f5f5; font-weight:600; font-size:9px; white-space:nowrap; max-width:60px; overflow:hidden; text-overflow:ellipsis;">${displayHeader}</th>`;
    }).join('');

    const rowsInfo = `Showing ${shownRows} of ${totalRows} records`;

    // Add performance warning for large datasets
    let performanceWarning = '';
    if (totalRows > 1000) {
      performanceWarning = `<div style="margin-bottom:0.5rem; color:#ff9800; font-size:0.9em; font-style:italic;">⚠ Large dataset detected (${totalRows.toLocaleString()} records). Consider using filters or reducing the scope.</div>`;
    }

    // Note: Duplicate removal info is now handled in generateSeparateTablesForCards
    // The data passed to this method is already processed for duplicates

    return `
      <div style="margin-bottom:2.5rem;">
        <h2 style="font-size:1.1rem; color:#15364A; margin-bottom:1.5rem; border-bottom:1px solid #e3f2fd; padding-bottom:0.5rem;">${customTitle}</h2>
        ${performanceWarning}
        <div style="margin-bottom:1.5rem; color:#666; font-size:9px; font-style:italic;">${rowsInfo}</div>
        <div style="max-width:100%; overflow-x:auto;">
          <table style="width:100%; border-collapse:collapse; font-size:9px; background:#fff; text-align:left; table-layout:fixed; max-width:500px;">
                        <thead>
              <tr>${headerRow}</tr>
            </thead>
            <tbody>
              ${dataRows}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  getDataForCurrentConfiguration(config) {
    // Create a hash of the configuration for caching
    const configHash = JSON.stringify({
      selectedCards: Array.from(this.selectedCards).sort(),
      cardConfigs: this.cardConfigs
    });
    
    // Check cache first
    if (this.cachedData.has(configHash)) {
      return this.cachedData.get(configHash);
    }
    
    let result;
    
    // If separate tables per card is enabled, get data for all selected cards
    if (config.separateTablesPerCard) {
      const selectedCards = Object.values(this.quickCardsData).filter(card => this.selectedCards.has(card.id));
      let allData = [];
      
      // Process ALL selected cards (no limit)
      selectedCards.forEach(card => {
        const cardConfig = this.getCardConfig(card.id);
        const cardData = this.getDataForQuickCardWithConfig(card, cardConfig);
        if (cardData && cardData.length > 0) {
          allData = allData.concat(cardData);
        }
      });
      
      result = allData;
    }
    // If using a saved view, apply that view to the data
    else if (config.tableView && config.tableView !== 'current') {
      const savedViews = this.loadSavedViews();
      const selectedView = savedViews[config.tableView];
      
      if (selectedView && selectedView.columns) {
        console.log(`DQ Applying saved view "${config.tableView}" to current configuration:`, selectedView);
        let data = this.getOriginalData(); // Start with original data

        // Filter data to only include the columns specified in the saved view
        data = data.map(row => {
          const filteredRow = {};
          selectedView.columns.forEach(col => {
            if (row.hasOwnProperty(col)) {
              filteredRow[col] = row[col];
            }
          });
          return filteredRow;
        });
        console.log(`DQ Data after applying saved view "${config.tableView}":`, data.length, 'records');
        result = data;
      } else {
        console.warn(`DQ Saved view "${config.tableView}" not found or invalid.`);
        result = this.getOriginalData(); // Use original data, not filtered
      }
    }
    // Default: use original data for DQ Hub (PRUEBA)
    else {
      result = this.getOriginalData(); // Usar los datos originales para DQ Hub
    }
    
    // Apply duplicate removal if enabled
    if (config.removeDuplicates && config.duplicateColumns.length > 0) {
      console.log('DQ Applying duplicate removal to current configuration data');
      result = this.removeDuplicatesFromData(result, config);
    }
    
    // Cache the result (limit cache size to prevent memory issues)
    if (this.cachedData.size > 10) {
      const firstKey = this.cachedData.keys().next().value;
      this.cachedData.delete(firstKey);
    }
    
    this.cachedData.set(configHash, result);
    return result;
  }



  getDataForQuickCardWithConfig(cardData, cardConfig) {
    // PRUEBA: Usar datos originales en lugar de filtrados para DQ Hub
    console.log('DQ getDataForQuickCardWithConfig called for:', cardData.name);
    console.log('DQ window.getFilteredData available:', !!window.getFilteredData);
    console.log('DQ window.getOriginalData available:', !!window.getOriginalData);
    
    // PRUEBA: Usar datos originales para DQ Hub
    let filteredData = this.getOriginalData();
    console.log(`DQ Initial filteredData length: ${filteredData.length}`);
    
    // Apply saved view if specified and not "current"
    if (cardConfig && cardConfig.savedView && cardConfig.savedView !== 'current') {
      console.log(`DQ Applying saved view "${cardConfig.savedView}" to card "${cardData.name}"`);
      
      const savedViews = this.loadSavedViews();
      const selectedView = savedViews[cardConfig.savedView];
      
      if (selectedView && selectedView.columns) {
        console.log(`DQ Found saved view "${cardConfig.savedView}":`, selectedView);
        
        // Saved views are column configurations, not data filters
        // We need to filter the data to only include the columns specified in the saved view
        const viewColumns = selectedView.columns;
        
        // Filter the data to only include rows that have values in the specified columns
        // This is a basic implementation - you might want to enhance this based on your needs
        filteredData = filteredData.filter(row => {
          // Check if the row has values in all the specified columns
          return viewColumns.every(colName => {
            const value = row[colName];
            return value !== undefined && value !== null && value !== '';
          });
        });
        
        console.log(`DQ Applied saved view "${cardConfig.savedView}": ${filteredData.length} records have values in all specified columns`);
            } else {
        console.warn(`DQ Saved view "${cardConfig.savedView}" not found or invalid`);
      }
    }
    
    console.log(`DQ Looking for quick filter for card: "${cardData.name}" (ID: ${cardData.id})`);
    
    // Use DQ-specific quick filters instead of general quick filters
    console.log('DQ window.dqHubManager available:', !!window.dqHubManager);
    const dqQuickFilters = window.dqHubManager ? window.dqHubManager.loadDqQuickFilters() : {};
    console.log('DQ Available DQ quick filters:', Object.keys(dqQuickFilters));
    console.log('DQ DQ quick filters content:', dqQuickFilters);
    
    // Find the quick filter that corresponds to this card
    const filterEntry = Object.entries(dqQuickFilters).find(([name, obj]) => {
      console.log(`DQ Checking filter "${name}":`, obj);
      
      // Priority 1: Match by linkedUrgencyCard (most reliable for urgency cards)
      if (obj.linkedUrgencyCard && obj.linkedUrgencyCard === cardData.id) {
        console.log(`DQ ✓ Matched by linkedUrgencyCard: ${obj.linkedUrgencyCard} === ${cardData.id}`);
        return true;
      }
      
      // Priority 2: Match by exact name
      if (obj.name && obj.name === cardData.name) {
        console.log(`DQ ✓ Matched by exact name: "${obj.name}" === "${cardData.name}"`);
        return true;
      }
      
      // Priority 3: Match by filter name containing card name
      if (name.toLowerCase().includes(cardData.name.toLowerCase())) {
        console.log(`DQ ✓ Matched by filter name contains card name: "${name}" contains "${cardData.name}"`);
        return true;
      }
      
      // Priority 4: Match by obj.name containing card name
      if (obj.name && obj.name.toLowerCase().includes(cardData.name.toLowerCase())) {
        console.log(`DQ ✓ Matched by obj.name contains card name: "${obj.name}" contains "${cardData.name}"`);
        return true;
      }
      
      // Priority 5: For urgency cards, try to match by urgency level
      const urgencyLevels = {
        'Urgente': ['urgent', 'alta', 'high', 'critical'],
        'Media': ['medium', 'media', 'normal', 'moderate'],
        'Baja': ['low', 'baja', 'bajo', 'minor']
      };
      
      const cardUrgency = urgencyLevels[cardData.name];
      if (cardUrgency) {
        const nameLower = name.toLowerCase();
        const objNameLower = obj.name ? obj.name.toLowerCase() : '';
        const matchesUrgency = cardUrgency.some(level => 
          nameLower.includes(level) || objNameLower.includes(level)
        );
        if (matchesUrgency) {
          console.log(`DQ ✓ Matched by urgency level: "${cardData.name}" matches "${name}" or "${obj.name}"`);
          return true;
        }
      }
      
      return false;
    });

    if (filterEntry) {
      const [filterName, filterObj] = filterEntry;
      console.log(`DQ ✓ Found matching quick filter: "${filterName}" for card "${cardData.name}"`);
      console.log('DQ Filter object:', filterObj);
      
      // Step 1: Test with system logic
      const systemFilteredData = this.applyQuickFilterWithSystemLogic(filterName, filterObj, filteredData);
      // Step 2: Test with direct filter
      const directFilteredData = this.applyQuickFilterToData(filterName, filterObj, filteredData);
      // Step 3: Test with fallback method
      const fallbackFilteredData = this.applyQuickFilterToData(filterName, filterObj, filteredData);
      
      // Elige el mejor resultado como antes
      const bestResult = systemFilteredData || directFilteredData || fallbackFilteredData;
      
      // Verify the count matches what's shown in the card
      console.log(`DQ Card shows ${cardData.count} records, filter returned ${bestResult.length} records`);
      if (cardData.count !== bestResult.length) {
        console.warn(`DQ ⚠️ Count mismatch: Card shows ${cardData.count} but filter returned ${bestResult.length}`);
      }
      
      console.log(`DQ Returning bestResult with ${bestResult.length} records for card "${cardData.name}"`);
      return bestResult;
    }

    // Fallback to filtered data (not original) - EXACTAMENTE como Ops Hub
    console.log(`DQ ❌ No quick filter found for card "${cardData.name}", using filtered data`);
    console.log(`DQ Returning filteredData with ${filteredData.length} records for card "${cardData.name}"`);
    return filteredData;
  }

  applyQuickFilterWithSystemLogic(filterName, filterObj, baseData) {
    // Soporta quick filters de duplicados para el preview del DQ Summary
    const data = baseData;
    if (!data || !data.length) return [];
    if (!filterObj) return data;

    // --- NUEVO: Soporte para filtros de duplicados ---
    if (filterObj.duplicateDetection || filterObj.type === 'duplicate_detection') {
      const duplicateColumns = filterObj.duplicateColumns || [];
      if (duplicateColumns.length > 0 && typeof window.findDuplicateRecords === 'function') {
        const duplicates = window.findDuplicateRecords(data, duplicateColumns);
        return duplicates;
      }
      // Si no hay columnas, devolver vacío
      return [];
    }
    // --- FIN NUEVO ---

    // Check if the system filter functions are available
    if (!window.getModuleActiveFilters || !window.setModuleActiveFilters || 
        !window.getModuleFilterValues || !window.setModuleFilterValues || 
        !window.getFilteredData) {
      console.warn('DQ System filter functions not available, using fallback method');
      return this.applyQuickFilterToData(filterName, filterObj, data);
    }
    
    // Guardar el estado actual de filtros
    const currentActiveFilters = { ...window.getModuleActiveFilters() };
    const currentFilterValues = { ...window.getModuleFilterValues() };
    
    // APLICAR SOLO EL QUICK FILTER SIN COMBINAR CON FILTROS ACTUALES
    const quickFilterActiveFilters = {};
    const quickFilterValues = {};
    
    // Añadir los filtros del quick filter
    const filterValues = filterObj.filterValues;
    
    Object.entries(filterValues).forEach(([key, value]) => {
      if (key.endsWith('_start') || key.endsWith('_end') || key.endsWith('_empty')) {
        const base = key.replace(/_(start|end|empty)$/, '');
        quickFilterActiveFilters[base] = 'date';
      } else if (Array.isArray(value)) {
        quickFilterActiveFilters[key] = 'categorical';
      } else {
        quickFilterActiveFilters[key] = 'text';
      }
      
      // Aplicar directamente el valor del quick filter
      quickFilterValues[key] = value;
    });
    
    // Aplicar SOLO el quick filter
    window.setModuleActiveFilters(quickFilterActiveFilters);
    window.setModuleFilterValues(quickFilterValues);
    // Restaurar estado de exclusión si existe
    if (window.setModuleFilterExclude && filterObj.filterExclude) {
        window.setModuleFilterExclude(filterObj.filterExclude);
    }
    
    // Obtener el número de filas filtradas usando la función estándar
    const filteredData = window.getFilteredData();
    const count = filteredData.length;
    
    console.log(`DQ Quick filter "${filterName}" applied with system logic: ${data.length} -> ${count} records`);
    
    // Restaurar el estado original de filtros
    window.setModuleActiveFilters(currentActiveFilters);
    window.setModuleFilterValues(currentFilterValues);
    // Restaurar estado de exclusión original si existe
    if (window.getModuleFilterExclude) {
        const currentExclude = window.getModuleFilterExclude();
        if (window.setModuleFilterExclude) {
            window.setModuleFilterExclude(currentExclude);
        }
    }
    
    return filteredData;
  }

  applyQuickFilterToData(filterName, filterObj, baseData) {
    // Fallback method when system filter functions are not available
    const originalData = baseData;
    
    if (!filterObj || !filterObj.filterValues) {
      console.log(`DQ No filterValues in filterObj for "${filterName}"`, filterObj);
      return originalData;
    }

    // Apply the specific filter
    let filteredData = originalData;
    
    Object.entries(filterObj.filterValues).forEach(([column, filterValue]) => {
      if (filterValue && filterValue !== '') {
        const beforeCount = filteredData.length;
        filteredData = filteredData.filter(row => {
          const cellValue = String(row[column] || '').toLowerCase();
          if (Array.isArray(filterValue)) {
            return filterValue.some(val => cellValue.includes(String(val).toLowerCase()));
          } else {
            return cellValue.includes(String(filterValue).toLowerCase());
          }
        });
        const afterCount = filteredData.length;
        console.log(`DQ Filter "${column} = ${filterValue}": ${beforeCount} -> ${afterCount} records`);
      }
    });
    
    console.log(`DQ Quick filter "${filterName}" applied (fallback): ${originalData.length} -> ${filteredData.length} records`);
    return filteredData;
  }

  getOriginalData() {
    console.log('DQ Getting original data...');
    
    // Get original data without any current filters
    if (window.getOriginalData && typeof window.getOriginalData === 'function') {
      const data = window.getOriginalData();
      console.log(`DQ Got original data from window.getOriginalData(): ${data.length} records`);
      return data;
    }
    
    // Fallback: try to get data from table
    const table = document.querySelector('#dataTable tbody');
    if (table) {
      const rows = Array.from(table.querySelectorAll('tr'));
      if (rows.length > 0) {
        const headers = Array.from(table.querySelector('thead tr').querySelectorAll('th')).map(th => th.textContent.trim());
        const data = rows.map(row => {
          const cells = Array.from(row.querySelectorAll('td'));
          const rowData = {};
          headers.forEach((header, index) => {
            rowData[header] = cells[index] ? cells[index].textContent.trim() : '';
          });
          return rowData;
        });
        console.log(`DQ Got original data from table: ${data.length} records`);
        return data;
      }
    }
    
    // Last fallback: try to get from global variable
    if (window.tableData && Array.isArray(window.tableData)) {
      console.log(`DQ Got original data from window.tableData: ${window.tableData.length} records`);
      return window.tableData;
    }
    
    // Try to get from CSV data if available
    if (window.csvData && Array.isArray(window.csvData)) {
      console.log(`DQ Got original data from window.csvData: ${window.csvData.length} records`);
      return window.csvData;
    }
    
    console.warn('DQ Could not get original data, using empty array');
    return [];
  }

  getCardConfig(cardId) {
    return this.cardConfigs[cardId] || {
      viewType: 'both',
      savedView: 'current'
    };
  }

  updateCardConfig(cardId, key, value) {
    if (!this.cardConfigs[cardId]) {
      this.cardConfigs[cardId] = {
        viewType: 'both',
        savedView: 'current'
      };
    }
    
    this.cardConfigs[cardId][key] = value;
    console.log(`DQ Updated card config for ${cardId}:`, this.cardConfigs[cardId]);
  }

  loadSavedViews() {
    try {
      const saved = localStorage.getItem('tableViews');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('DQ Error loading saved views:', error);
      return {};
    }
  }

  getReportConfig() {
    const includeTableDataCheckbox = document.getElementById('dqIncludeTableDataCheckbox');
    const includeTechnicalInfoCheckbox = document.getElementById('dqIncludeTechnicalInfoCheckbox');
    const removeDuplicatesCheckbox = document.getElementById('dqRemoveDuplicatesCheckbox');

    const includeTechnicalInfo = includeTechnicalInfoCheckbox?.checked !== false;

    return {
      includeTableData: includeTableDataCheckbox?.checked !== false,
      includeCardConfig: includeTechnicalInfo,
      includeSummaryInfo: includeTechnicalInfo,
      includeDuplicateSummary: includeTechnicalInfo,
      removeDuplicates: removeDuplicatesCheckbox?.checked || false,
      duplicateColumns: this.reportConfig.duplicateColumns || [],
      tableDataLimit: 50,
      separateTablesPerCard: false
    };
  }



  async copyToClipboard() {
    try {
      const selectedCards = Array.from(this.selectedCards);
      if (selectedCards.length === 0) {
        this.showNotification('Please select at least one quick card to copy.', 'warning');
        return;
      }

      // Generate full HTML with ALL data (not limited to 50 rows like preview)
      const config = this.getReportConfig();
      const selectedCardsData = Object.values(this.quickCardsData)
        .filter(card => this.selectedCards.has(card.id));
      
      if (selectedCardsData.length === 0) {
        this.showNotification('No cards selected to copy.', 'warning');
        return;
      }

      // Generate full HTML content with all data
      const fullHtml = this.generateFullHTMLForCopy(selectedCardsData, config);
      
      if (!fullHtml || fullHtml.trim() === '') {
        this.showNotification('No content available to copy. Please wait for the preview to load.', 'warning');
        return;
      }
      
      // Create a temporary element to clean up the HTML for email compatibility
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = fullHtml;
      
      // Remove any script tags and clean up styling for email compatibility
      const scripts = tempDiv.querySelectorAll('script');
      scripts.forEach(script => script.remove());
      
      // Convert to email-friendly HTML with inline styles
      const emailHtml = this.convertToEmailFormat(tempDiv.innerHTML);
      
      // Try to copy as HTML first (for rich text applications)
      if (navigator.clipboard && navigator.clipboard.write) {
        try {
          // Create a clipboard item with both HTML and text formats
          const clipboardItem = new ClipboardItem({
            'text/html': new Blob([emailHtml], { type: 'text/html' }),
            'text/plain': new Blob([tempDiv.textContent || tempDiv.innerText], { type: 'text/plain' })
          });
          
          await navigator.clipboard.write([clipboardItem]);
          this.showNotification('Data Quality summary copied to clipboard with formatting!', 'success');
          return;
        } catch (htmlError) {
          console.log('HTML copy failed, falling back to text copy:', htmlError);
        }
      }
      
      // Fallback to text content if HTML copy fails
      const textContent = tempDiv.textContent || tempDiv.innerText;
      
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(textContent);
        this.showNotification('Data Quality summary copied to clipboard!', 'success');
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = textContent;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        this.showNotification('Data Quality summary copied to clipboard!', 'success');
      }
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      this.showNotification('Error copying to clipboard. Please try again.', 'error');
    }
  }

  generateFullHTMLForCopy(selectedCards, config) {
    // Similar to generateSeparateTablesForCards but without the 50-row limit
    if (!selectedCards || selectedCards.length === 0) {
      return '<div style="color:#888; text-align:center; padding:2rem;">No cards selected.</div>';
    }

    let tablesHtml = '';
    let totalRecords = 0;
    let totalOriginalRecords = 0;
    let totalRemovedDuplicates = 0;
    
    // Generate summary section first
    const summarySection = this.generateSummarySection(selectedCards, config);
    tablesHtml += summarySection;
    
    // Process each selected card with its individual configuration
    selectedCards.forEach((card, index) => {
      const cardConfig = this.getCardConfig(card.id);
      const cardData = this.getDataForQuickCardWithConfig(card, cardConfig);
      
      if (cardData && cardData.length > 0) {
        totalOriginalRecords += cardData.length;
        
        // Apply duplicate removal if enabled
        const originalCount = cardData.length;
        const processedData = this.removeDuplicatesFromData(cardData, config);
        const removedCount = originalCount - processedData.length;
        totalRemovedDuplicates += removedCount;
        
        // Use card's individual view type setting
        const cardViewConfig = {
          ...config,
          viewType: cardConfig.viewType || 'both'
        };
        
        // Generate appropriate content based on card's view type
        let cardContent = '';
        
        if (cardConfig.viewType === 'summary') {
          let duplicateInfo = '';
          if (config.removeDuplicates && config.duplicateColumns.length > 0 && removedCount > 0) {
            duplicateInfo = `<div style="color:#1976d2; font-size:10px; margin-top:0.2rem;">Removed ${removedCount} duplicates</div>`;
          }
          
          cardContent = `
            <div style="margin-bottom:2rem; padding:0.8rem; background:#f8f9fa; border-radius:6px; border-left:3px solid #47B2E5;">
              <h4 style="margin:0 0 0.3rem 0; color:#000000; font-size:12px;">${card.name}</h4>
              <div style="color:#47B2E5; font-weight:600; font-size:11px;">${processedData.length.toLocaleString()} records</div>
              <div style="color:#666; font-size:10px; margin-top:0.2rem;">View type: Summary only</div>
              ${duplicateInfo}
            </div>
          `;
        } else if (cardConfig.viewType === 'charts') {
          cardContent = `
            <div style="margin-bottom:2rem;">
              <h3 style="font-size:1.1rem; color:#15364A; margin-bottom:0.5rem; border-bottom:1px solid #e3f2fd; padding-bottom:0.3rem;">
                ${card.name} - Charts
              </h3>
              <div style="color:#888; text-align:center; padding:1rem; background:#f8f9fa; border-radius:6px; font-size:10px;">
                Charts functionality will be available in future updates
              </div>
            </div>
          `;
        } else {
          // Show table data (for 'table' or 'both' view types) - ONLY if includeTableData is enabled
          if (config.includeTableData) {
            const tableConfig = {
              ...cardViewConfig,
              savedView: cardConfig.savedView
            };
            // Use generateTableDataSectionFull to get ALL rows (no 50 limit)
            const tableHtml = this.generateTableDataSectionFull(processedData, tableConfig, `${card.name}`);
            cardContent = tableHtml;
          } else {
            cardContent = `
              <div style="margin-bottom:2rem; padding:0.8rem; background:#f8f9fa; border-radius:6px; border-left:3px solid #47B2E5;">
                <h4 style="margin:0 0 0.3rem 0; color:#000000; font-size:12px;">${card.name}</h4>
                <div style="color:#47B2E5; font-weight:600; font-size:11px;">${processedData.length.toLocaleString()} records</div>
                <div style="color:#666; font-size:10px; margin-top:0.2rem;">Table data disabled in report options</div>
              </div>
            `;
          }
        }
        
        tablesHtml += cardContent;
        totalRecords += processedData.length;
        
        // Add card configuration info if enabled
        if (config.includeCardConfig) {
          let duplicateInfo = '';
          if (config.removeDuplicates && config.duplicateColumns.length > 0) {
            if (removedCount > 0) {
              duplicateInfo = ` | Duplicates removed: ${removedCount}`;
            } else {
              duplicateInfo = ` | No duplicates found`;
            }
          }
          
          const configInfo = `
            <div style="margin-bottom:2rem; padding:1rem; background:#e3f2fd; border-radius:6px; font-size:9px; color:#1976d2; line-height:1.5;">
              <strong>Card Configuration:</strong><br>
              View: ${cardConfig.viewType} | 
              Saved View: ${cardConfig.savedView} | 
              Active: ${cardConfig.active ? 'Yes' : 'No'} | 
              Records: ${processedData.length.toLocaleString()}${duplicateInfo}
            </div>
          `;
          tablesHtml += configInfo;
        }
      } else {
        tablesHtml += `
          <div style="margin-bottom:2rem;">
            <h3 style="font-size:1.1rem; color:#15364A; margin-bottom:0.5rem; border-bottom:1px solid #e3f2fd; padding-bottom:0.3rem;">
              ${card.name}
            </h3>
            <div style="color:#888; text-align:center; padding:1rem; background:#f8f9fa; border-radius:6px; font-size:10px;">
              No data available for this card
            </div>
          </div>
        `;
      }
    });

    // Add overall duplicate removal summary if enabled
    let duplicateSummary = '';
    if (config.removeDuplicates && config.duplicateColumns.length > 0 && totalRemovedDuplicates > 0 && config.includeDuplicateSummary) {
      duplicateSummary = `
        <div style="margin-bottom:0.8rem; padding:0.8rem; background:#e8f5e8; border-radius:6px; border-left:3px solid #4caf50;">
          <div style="color:#2e7d32; font-weight:600; margin-bottom:0.3rem; font-size:11px;">✓ Duplicate Removal Summary</div>
          <div style="color:#388e3c; font-size:10px;">
            Removed ${totalRemovedDuplicates.toLocaleString()} duplicate records across all cards<br>
            Based on columns: ${config.duplicateColumns.join(', ')}
          </div>
        </div>
      `;
    }

    // Generate title section only if summary info is enabled
    let titleSection = '';
    if (config.includeSummaryInfo) {
      titleSection = `
        <h2 style="font-size:1.1rem; color:#15364A; margin-bottom:1.5rem; border-bottom:1px solid #e3f2fd; padding-bottom:0.5rem;">
          Quick Cards Data (${selectedCards.length} cards, ${totalRecords.toLocaleString()} total records)
        </h2>
      `;
    }

    return `
      <div style="margin-bottom:3rem;">
        ${titleSection}
        ${duplicateSummary}
        ${tablesHtml}
      </div>
    `;
  }

  generateTableDataSectionFull(tableData, config, customTitle = 'Table Data') {
    // Same as generateTableDataSection but WITHOUT the 50-row limit - includes ALL data
    if (!tableData || tableData.length === 0) {
      return `
        <div style="margin-bottom:2rem;">
          <h2 style="font-size:1.5rem; color:#15364A; margin-bottom:1rem; border-bottom:2px solid #e3f2fd; padding-bottom:0.5rem;">${customTitle}</h2>
          <div style="color:#888; text-align:center; padding:2rem; background:#f8f9fa; border-radius:8px;">No table data available</div>
        </div>
      `;
    }

    // Get column headers from the first row
    let headers = Object.keys(tableData[0]);
    
    // Apply saved view columns if specified
    if (config.savedView && config.savedView !== 'current') {
      const savedViews = this.loadSavedViews();
      const selectedView = savedViews[config.savedView];
      
      if (selectedView && selectedView.columns) {
        headers = headers.filter(header => selectedView.columns.includes(header));
      }
    }
    
    // NO LIMIT - use ALL data for copy to clipboard
    const displayData = tableData; // All data, not limited
    const totalRows = tableData.length;
    
    // Generate table rows with compact email-friendly styling - NO WRAP
    const dataRows = displayData.map(row => {
      const cells = headers.map(header => {
        const value = row[header] || '';
        // Truncate very long values to prevent layout issues and make it email-friendly
        const displayValue = value.length > 25 ? value.substring(0, 25) + '...' : value;
        return `<td style="padding:4px 6px; border:1px solid #ddd; color:#333; font-size:9px; max-width:60px; overflow:hidden; text-overflow:ellipsis; text-align:left; white-space:nowrap;">${displayValue}</td>`;
      }).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    // Generate header row with compact styling - NO WRAP
    const headerRow = headers.map(header => {
      // Truncate header text if too long
      const displayHeader = header.length > 15 ? header.substring(0, 15) + '...' : header;
      return `<th style="padding:6px 8px; color:#1976d2; text-align:left; border:1px solid #ddd; background:#f5f5f5; font-weight:600; font-size:9px; white-space:nowrap; max-width:60px; overflow:hidden; text-overflow:ellipsis;">${displayHeader}</th>`;
    }).join('');

    const rowsInfo = `Total records: ${totalRows.toLocaleString()}`;

    // Add performance warning for large datasets
    let performanceWarning = '';
    if (totalRows > 1000) {
      performanceWarning = `<div style="margin-bottom:0.5rem; color:#ff9800; font-size:0.9em; font-style:italic;">⚠ Large dataset detected (${totalRows.toLocaleString()} records). Consider using filters or reducing the scope.</div>`;
    }

    return `
      <div style="margin-bottom:2.5rem;">
        <h2 style="font-size:1.1rem; color:#15364A; margin-bottom:1.5rem; border-bottom:1px solid #e3f2fd; padding-bottom:0.5rem;">${customTitle}</h2>
        ${performanceWarning}
        <div style="margin-bottom:1.5rem; color:#666; font-size:9px; font-style:italic;">${rowsInfo}</div>
        <div style="max-width:100%; overflow-x:auto;">
          <table style="width:100%; border-collapse:collapse; font-size:9px; background:#fff; text-align:left; table-layout:fixed; max-width:500px;">
            <thead>
              <tr>${headerRow}</tr>
            </thead>
            <tbody>
              ${dataRows}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  convertToEmailFormat(html) {
    // Convert CSS classes to inline styles for email compatibility
    let emailHtml = html;
    
    // Replace common CSS classes with inline styles
    const styleReplacements = {
      'class="card-section"': 'style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #47B2E5;"',
      'class="card-title"': 'style="font-weight: bold; color: #000000; margin-bottom: 10px;"',
      'class="card-count"': 'style="color: #47B2E5; font-weight: bold; font-size: 1.2em;"',
      'class="table-container"': 'style="margin: 20px 0; overflow-x: auto;"',
      'class="data-table"': 'style="width: 100%; border-collapse: collapse; margin: 10px 0; font-family: Arial, sans-serif;"',
      'class="table-header"': 'style="background: #E3F2FD; color: #000000; padding: 12px; text-align: left; border: 1px solid rgba(0,0,0,0.1);"',
      'class="table-cell"': 'style="padding: 8px 12px; border: 1px solid #ddd; text-align: left;"',
      'class="summary-section"': 'style="margin: 20px 0; padding: 15px; background: #e8f4f8; border-radius: 8px;"',
      'class="duplicate-summary"': 'style="margin: 15px 0; padding: 12px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; color: #856404;"'
    };
    
    Object.entries(styleReplacements).forEach(([className, inlineStyle]) => {
      emailHtml = emailHtml.replace(new RegExp(className, 'g'), inlineStyle);
    });
    
    // Add email-friendly wrapper
    emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #000000; border-bottom: 2px solid #47B2E5; padding-bottom: 10px;">
          Data Quality Summary Report
        </h2>
        ${emailHtml}
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
          Generated: ${new Date().toLocaleString()}
        </div>
      </div>
    `;
    
    return emailHtml;
  }

  async exportToPdf() {
    try {
      const selectedCards = Array.from(this.selectedCards);
      if (selectedCards.length === 0) {
        this.showNotification('Please select at least one quick card to export.', 'warning');
        return;
      }

      const content = this.generateCleanTextContent();
      
      // Create a new window with the content
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>Data Quality Summary Report</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h1 { color: #000000; border-bottom: 2px solid #47B2E5; }
              .card-section { margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; }
              .card-title { font-weight: bold; color: #000000; }
              .card-count { color: #47B2E5; font-weight: bold; }
            </style>
          </head>
          <body>
            <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${content}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      
      // Wait for content to load then print
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
      
      this.showNotification('PDF export window opened. Please use browser print function.', 'success');
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      this.showNotification('Error exporting to PDF. Please try again.', 'error');
    }
  }

  exportToExcel() {
    try {
      const selectedCards = Array.from(this.selectedCards);
      if (selectedCards.length === 0) {
        this.showNotification('Please select at least one quick card to export.', 'warning');
        return;
      }

      const config = this.getReportConfig();
      
      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Add summary sheet with actual data counts
      const summaryData = selectedCards.map(cardId => {
        const cardData = this.quickCardsData[cardId];
        const cardConfig = this.getCardConfig(cardId);
        const cardDataResult = this.getDataForQuickCardWithConfig(cardData, cardConfig);
        
        return {
          'Card Name': cardData?.name || 'Unknown',
          'Record Count': cardDataResult.length || 0,
          'Active': cardData?.active ? 'Yes' : 'No',
          'Display Type': cardConfig?.viewType || 'both',
          'Saved View': cardConfig?.savedView || 'current'
        };
      });
      
      const summaryWs = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
      
      // Add report configuration sheet
      const configData = [
        { 'Setting': 'Report Type', 'Value': 'Data Quality Summary Report' },
        { 'Setting': 'Generated Date', 'Value': new Date().toLocaleString() },
        { 'Setting': 'Selected Cards', 'Value': selectedCards.length },
        { 'Setting': 'Include Table Data', 'Value': config.includeTableData ? 'Yes' : 'No' },
        { 'Setting': 'Include Technical Info', 'Value': config.includeCardConfig ? 'Yes' : 'No' },
        { 'Setting': 'Remove Duplicates', 'Value': config.removeDuplicates ? 'Yes' : 'No' },
        { 'Setting': 'Duplicate Fields', 'Value': config.duplicateColumns.length > 0 ? config.duplicateColumns.join(', ') : 'None' }
      ];
      
      const configWs = XLSX.utils.json_to_sheet(configData);
      XLSX.utils.book_append_sheet(wb, configWs, 'Configuration');
      
      // Add separate data sheets for each selected card if table data is enabled
      if (config.includeTableData) {
        selectedCards.forEach((cardId, index) => {
          const cardData = this.quickCardsData[cardId];
          const cardConfig = this.getCardConfig(cardId);
          
          if (cardData && cardConfig) {
            let tableData = this.getDataForQuickCardWithConfig(cardData, cardConfig);
            
            // Apply duplicate removal if enabled
            if (config.removeDuplicates && config.duplicateColumns.length > 0 && tableData.length > 0) {
              const originalCount = tableData.length;
              tableData = this.removeDuplicatesFromData(tableData, config);
              console.log(`🔄 Removed duplicates: ${originalCount} → ${tableData.length} records`);
            }
            
            if (tableData && tableData.length > 0) {
              // Create a clean sheet name (Excel has a 31 character limit)
              let sheetName = cardData.name || `Card_${index + 1}`;
              sheetName = sheetName.replace(/[\\\/\?\*\[\]]/g, '_').substring(0, 28);
              
              // Add saved view info to sheet name if not current
              if (cardConfig.savedView && cardConfig.savedView !== 'current') {
                const viewSuffix = `_${cardConfig.savedView}`.substring(0, 3);
                sheetName = sheetName.substring(0, 25) + viewSuffix;
              }
              
              // Ensure unique sheet names
              let finalSheetName = sheetName;
              let counter = 1;
              while (wb.SheetNames.includes(finalSheetName)) {
                finalSheetName = `${sheetName.substring(0, 20)}_${counter}`;
                counter++;
              }
              
              const dataWs = XLSX.utils.json_to_sheet(tableData);
              XLSX.utils.book_append_sheet(wb, dataWs, finalSheetName);
              
              console.log(`✅ Added sheet "${finalSheetName}" with ${tableData.length} records`);
            }
          }
        });
      }
      
      // Save the file
      const fileName = `DQ_Summary_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      this.showNotification(`Excel file exported successfully with ${wb.SheetNames.length} sheets!`, 'success');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      this.showNotification('Error exporting to Excel. Please try again.', 'error');
    }
  }

  generateCleanTextContent() {
    const selectedCards = Array.from(this.selectedCards);
    if (selectedCards.length === 0) {
      return 'No cards selected for Data Quality summary report.';
    }

    const config = this.getReportConfig();
    const dateStr = new Date().toLocaleString();
    
    let content = `Data Quality Summary Report\n`;
    content += `Generated: ${dateStr}\n`;
    content += `Selected Cards: ${selectedCards.length}\n\n`;
    
    // Add card summaries
    selectedCards.forEach(cardId => {
      const cardData = this.quickCardsData[cardId];
      const cardConfig = this.getCardConfig(cardId);
      
      if (cardData) {
        const cardDataResult = this.getDataForQuickCardWithConfig(cardData, cardConfig);
        const recordCount = cardDataResult ? cardDataResult.length : 0;
        
        content += `${cardData.name}:\n`;
        content += `  Records: ${recordCount.toLocaleString()}\n`;
        content += `  View: ${cardConfig?.viewType || 'both'}\n`;
        content += `  Saved View: ${cardConfig?.savedView || 'current'}\n\n`;
      }
    });
    
    // Add duplicate removal info if enabled
    if (config.removeDuplicates && config.duplicateColumns.length > 0) {
      content += `Duplicate Removal:\n`;
      content += `  Fields used: ${config.duplicateColumns.join(', ')}\n`;
      content += `  Enabled: Yes\n\n`;
    }
    
    content += `Report Configuration:\n`;
    content += `  Include Table Data: ${config.includeTableData ? 'Yes' : 'No'}\n`;
    content += `  Include Technical Info: ${config.includeCardConfig ? 'Yes' : 'No'}\n`;
    content += `  Table Data Limit: ${config.tableDataLimit}\n\n`;
    
    return content;
  }

  showNotification(message, type = 'info') {
    if (typeof window.showUnifiedNotification === 'function') {
      window.showUnifiedNotification(message, type);
    } else {
      console.log(`${type.toUpperCase()}: ${message}`);
    }
  }

  removeDuplicatesFromData(data, config = null) {
    // Get config from parameter or current report config
    const reportConfig = config || this.getReportConfig();
    
    console.log('DQ removeDuplicatesFromData called with:', {
      dataLength: data.length,
      removeDuplicates: reportConfig.removeDuplicates,
      duplicateColumns: reportConfig.duplicateColumns
    });
    
    if (!reportConfig.removeDuplicates || reportConfig.duplicateColumns.length === 0) {
      console.log('DQ Duplicate removal not enabled or no columns selected, returning original data');
      return data;
    }

        const seen = new Set();
    const filteredData = data.filter(row => {
      const key = reportConfig.duplicateColumns.map(col => row[col] || '').join('|');
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    
    console.log(`DQ Duplicate removal applied: ${data.length} -> ${filteredData.length} records (removed ${data.length - filteredData.length})`);
    return filteredData;
  }

  handleDuplicateRemovalChange() {
    const removeDuplicatesCheckbox = document.getElementById('dqRemoveDuplicatesCheckbox');
    const duplicateColumnsSection = document.getElementById('dqDuplicateColumnsSection');
    
    if (removeDuplicatesCheckbox && duplicateColumnsSection) {
      if (removeDuplicatesCheckbox.checked) {
        duplicateColumnsSection.style.display = 'block';
      } else {
        duplicateColumnsSection.style.display = 'none';
      }
    }
    
    this.renderSummaryPreview();
  }

  populateDuplicateColumns() {
    const duplicateColumnsList = document.getElementById('dqDuplicateColumnsList');
    
    if (!duplicateColumnsList) {
      console.log('DQ ERROR: duplicateColumnsList element not found!');
      return;
    }

    console.log('DQ populateDuplicateColumns called - starting...');

    // Get data from selected cards or use original data as fallback
    const selectedCards = Object.values(this.quickCardsData).filter(card => this.selectedCards.has(card.id));
    console.log('DQ Selected cards:', selectedCards.length);
    
    let allData = [];
    
    if (selectedCards.length > 0) {
      console.log('DQ Using data from selected cards');
      // Combine data from all selected cards
      selectedCards.forEach(card => {
        const cardConfig = this.getCardConfig(card.id);
        const cardData = this.getDataForQuickCardWithConfig(card, cardConfig);
        if (cardData && cardData.length > 0) {
          allData = allData.concat(cardData);
          console.log(`DQ Added ${cardData.length} records from card "${card.name}"`);
        }
      });
    } else {
      console.log('DQ No cards selected, using original data');
      // Use original data as fallback when no cards are selected
      allData = this.getOriginalData();
    }

    console.log('DQ Total data records:', allData.length);

    if (allData.length === 0) {
      console.log('DQ ERROR: No data available!');
      duplicateColumnsList.innerHTML = '<div style="color:#888; text-align:center; padding:1rem;">No data available. Please load data first.</div>';
      return;
    }

    const headers = Object.keys(allData[0]);
    console.log('DQ Available headers:', headers);
    
    duplicateColumnsList.innerHTML = '';
    console.log('DQ Cleared duplicateColumnsList');

    // Calculate unique values for each column to help user choose
    const columnStats = headers.map(header => {
      const uniqueValues = new Set(allData.map(row => row[header] || '').filter(val => val !== ''));
      const totalValues = allData.length;
      const uniqueCount = uniqueValues.size;
      const duplicateRate = totalValues > 0 ? ((totalValues - uniqueCount) / totalValues * 100).toFixed(1) : 0;
      
      return {
        header,
        uniqueCount,
        totalValues,
        duplicateRate,
        isCommon: this.isCommonField(header)
      };
    });

    console.log('DQ Column stats calculated:', columnStats.length, 'columns');

    // Sort by duplicate rate (highest first) and then by common fields
    columnStats.sort((a, b) => {
      if (a.isCommon && !b.isCommon) return -1;
      if (!a.isCommon && b.isCommon) return 1;
      return parseFloat(b.duplicateRate) - parseFloat(a.duplicateRate);
    });

    console.log('DQ Starting to create column items...');

    columnStats.forEach((stat, index) => {
      const item = document.createElement('div');
      item.className = 'column-checkbox-item';
      item.setAttribute('data-field', stat.header);
      
      const commonBadge = stat.isCommon ? '<span style="color:#47B2E5; font-size:0.8em; margin-left:0.5rem;">(common)</span>' : '';
      const duplicateInfo = stat.totalValues > 0 ? 
        `<span style="color:rgba(232,244,248,0.7); font-size:0.8em; margin-left:0.5rem;">${stat.uniqueCount}/${stat.totalValues} unique (${stat.duplicateRate}% dupes)</span>` : '';
      
      item.innerHTML = `
        <label class="checkbox-label">
          <input type="checkbox" value="${stat.header}" class="duplicate-column-checkbox">
          <span class="checkmark"></span>
          ${stat.header}${commonBadge}${duplicateInfo}
        </label>
      `;
      
      const checkbox = item.querySelector('.duplicate-column-checkbox');
      checkbox.addEventListener('change', () => this.updateDuplicateColumns());
      
      duplicateColumnsList.appendChild(item);
      
      if (index < 5) { // Log first 5 items for debugging
        console.log(`DQ Created item ${index + 1}: "${stat.header}"`);
      }
    });

    console.log(`DQ Created ${columnStats.length} column items total`);
    console.log('DQ Final duplicateColumnsList children count:', duplicateColumnsList.children.length);

    // Setup search functionality for duplicate columns
    this.setupDuplicateColumnsSearch();

    this.updateDuplicateColumns();
  }



  setupDuplicateColumnsSearch() {
    const searchInput = document.getElementById('dqDuplicateColumnsSearch');
    if (searchInput) {
      // Remove existing event listeners
      searchInput.removeEventListener('input', this.handleDuplicateColumnsSearch);
      
      // Add new event listener
      this.handleDuplicateColumnsSearch = (e) => {
        const searchTerm = e.target.value.trim().toLowerCase();
        console.log('🔍 DQ Search term:', searchTerm);
        
        const duplicateColumnsList = document.getElementById('dqDuplicateColumnsList');
        if (!duplicateColumnsList) return;
        
        const columnItems = Array.from(duplicateColumnsList.querySelectorAll('.column-checkbox-item'));
        let visibleCount = 0;
        
        // Filter and sort items
        const filteredItems = columnItems.map(item => {
          const checkbox = item.querySelector('.duplicate-column-checkbox');
          const fieldName = (checkbox?.value || item.getAttribute('data-field') || '').toLowerCase();
          const matches = searchTerm === '' || fieldName.includes(searchTerm);
          
          return { item, fieldName, matches };
        });
        
        // Sort: matching items first, then alphabetically
        filteredItems.sort((a, b) => {
          if (a.matches && !b.matches) return -1;
          if (!a.matches && b.matches) return 1;
          return a.fieldName.localeCompare(b.fieldName);
        });
        
        // Reorder DOM elements and show/hide
        filteredItems.forEach(({ item, matches }) => {
          if (matches) {
            item.style.display = 'block';
            visibleCount++;
          } else {
            item.style.display = 'none';
          }
          duplicateColumnsList.appendChild(item);
        });
        
        console.log(`✅ DQ Filtered ${columnItems.length} checkboxes, ${visibleCount} visible`);
      };
      
      searchInput.addEventListener('input', this.handleDuplicateColumnsSearch);
      console.log('✅ DQ Duplicate columns search event listener added');
    } else {
      console.log('⚠️ DQ Duplicate columns search input not found');
    }
  }

  isCommonField(fieldName) {
    const commonFields = [
      'id', 'ID', 'Id', 'booking', 'Booking', 'reference', 'Reference', 'ref', 'Ref',
      'order', 'Order', 'number', 'Number', 'code', 'Code', 'tracking', 'Tracking',
      'email', 'Email', 'phone', 'Phone', 'customer', 'Customer', 'client', 'Client',
      'name', 'Name', 'title', 'Title', 'description', 'Description'
    ];
    
    return commonFields.some(common => 
      fieldName.toLowerCase().includes(common.toLowerCase())
    );
  }

  selectAllDuplicateColumns() {
    const checkboxes = document.querySelectorAll('.duplicate-column-checkbox');
        checkboxes.forEach(checkbox => {
      checkbox.checked = true;
    });
    this.updateDuplicateColumns();
  }

  deselectAllDuplicateColumns() {
    const checkboxes = document.querySelectorAll('.duplicate-column-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.checked = false;
    });
    this.updateDuplicateColumns();
  }

  selectCommonFields() {
    const checkboxes = document.querySelectorAll('.duplicate-column-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.checked = this.isCommonField(checkbox.value);
    });
    this.updateDuplicateColumns();
  }



  updateDuplicateColumns() {
    const checkboxes = document.querySelectorAll('.duplicate-column-checkbox:checked');
    this.reportConfig.duplicateColumns = Array.from(checkboxes).map(cb => cb.value);
    
    // Update selected fields count
    const selectedFieldsCount = document.getElementById('dqSelectedFieldsCount');
    if (selectedFieldsCount) {
      selectedFieldsCount.textContent = this.reportConfig.duplicateColumns.length;
    }
    
    // Show duplicate summary if fields are selected
    this.showDuplicateSummary();
    
    this.renderSummaryPreview();
  }

  showDuplicateSummary() {
    const duplicateSummary = document.getElementById('dqDuplicateSummary');
    if (!duplicateSummary) return;

    if (this.reportConfig.duplicateColumns.length === 0) {
      duplicateSummary.style.display = 'none';
      return;
    }

    // Prevent excessive calls
    if (this.duplicateAnalysisTimeout) {
      clearTimeout(this.duplicateAnalysisTimeout);
    }
    
    this.duplicateAnalysisTimeout = setTimeout(() => {
      this._showDuplicateSummaryInternal(duplicateSummary);
    }, 200); // 200ms debounce
  }

  _showDuplicateSummaryInternal(duplicateSummary) {
    try {
      // Get the correct data based on current configuration
      const config = this.getReportConfig();
      let tableData = this.getDataForCurrentConfiguration(config);
      
      if (!tableData || tableData.length === 0) {
        duplicateSummary.style.display = 'none';
        return;
      }

      // Calculate potential duplicates
      const seen = new Set();
      let duplicateCount = 0;
      
      tableData.forEach(row => {
        const key = config.duplicateColumns.map(col => row[col] || '').join('|');
        if (seen.has(key)) {
          duplicateCount++;
        } else {
          seen.add(key);
        }
      });

      const totalRecords = tableData.length;
      const uniqueRecords = totalRecords - duplicateCount;
      const duplicatePercentage = totalRecords > 0 ? ((duplicateCount / totalRecords) * 100).toFixed(1) : 0;

      // Add configuration info to the summary
      let configInfo = '';
      const selectedCards = Object.values(this.quickCardsData).filter(card => this.selectedCards.has(card.id));
      if (selectedCards.length > 0) {
        configInfo = `<br><strong>Configuration:</strong> ${selectedCards.length} selected cards`;
      }

      duplicateSummary.innerHTML = `
        <strong>Duplicate Analysis:</strong>${configInfo}<br>
        • Total records: ${totalRecords.toLocaleString()}<br>
        • Unique records: ${uniqueRecords.toLocaleString()}<br>
        • Duplicate records: ${duplicateCount.toLocaleString()} (${duplicatePercentage}%)<br>
        • Fields used: ${config.duplicateColumns.join(', ')}
      `;

      duplicateSummary.className = duplicateCount > 0 ? 'duplicate-summary' : 'duplicate-summary warning';
      duplicateSummary.style.display = 'block';
    } catch (error) {
      console.error('DQ Error in duplicate analysis:', error);
      duplicateSummary.innerHTML = '<strong>Error:</strong> Could not analyze duplicates';
      duplicateSummary.style.display = 'block';
    }
  }


}