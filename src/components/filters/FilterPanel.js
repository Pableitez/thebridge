import FilterManager from './FilterManager.js';
import './FilterPanel.css';

class FilterPanel {
  #filterManager = FilterManager.getInstance();
  #element = null;
  #isOpen = false;
  #onFiltersChanged = null;

  constructor(onFiltersChanged) {
    this.#onFiltersChanged = onFiltersChanged;
    this.#createElements();
  }

  /**
   * Creates the filter panel DOM elements
   * @private
   */
  #createElements() {
    // Create modal overlay
    this.#element = document.createElement('div');
    this.#element.className = 'filter-panel-overlay';
    this.#element.innerHTML = `
      <div class="filter-panel-modal">
        <div class="filter-panel-header">
          <h2>Filter Data</h2>
          <button class="close-button" aria-label="Close">×</button>
        </div>
        <div class="filter-panel-content">
          <div class="filter-groups"></div>
          <div class="filter-actions">
            <button class="apply-filters">Apply Filters</button>
            <button class="clear-filters">Clear All</button>
          </div>
        </div>
      </div>
    `;

    // Add event listeners
    const modal = this.#element.querySelector('.filter-panel-modal');
    const closeBtn = this.#element.querySelector('.close-button');
    const applyBtn = this.#element.querySelector('.apply-filters');
    const clearBtn = this.#element.querySelector('.clear-filters');

    // Close when clicking overlay (but not modal)
    this.#element.addEventListener('click', (e) => {
      if (e.target === this.#element) {
        this.close();
      }
    });

    // Button handlers
    closeBtn.addEventListener('click', () => this.close());
    applyBtn.addEventListener('click', () => this.#applyFilters());
    clearBtn.addEventListener('click', () => this.#clearFilters());

    // Prevent modal click from closing
    modal.addEventListener('click', (e) => e.stopPropagation());

    // Add to document
    document.body.appendChild(this.#element);
  }

  /**
   * Updates the filter groups in the panel
   * @param {Object} columns - Column definitions
   */
  updateFilterGroups(columns) {
    const container = this.#element.querySelector('.filter-groups');
    container.innerHTML = '';

    Object.entries(columns).forEach(([name, type]) => {
      const group = document.createElement('div');
      group.className = 'filter-group';
      
      const label = document.createElement('label');
      label.textContent = name;
      
      const input = document.createElement('input');
      
      // Set input type and attributes based on column type
      switch (type) {
        case 'number':
          input.type = 'number';
          input.step = 'any'; // Allow decimals
          break;
        case 'date':
          input.type = 'text';
          this.#addDatePresets(group);
          break;
        case 'reference':
          input.type = 'text';
          input.pattern = '[A-Za-z0-9-_]*';
          input.autocomplete = 'off';
          input.spellcheck = false;
          input.classList.add('reference-input');
          break;
        default:
          input.type = 'text';
      }
      
      input.placeholder = `Filter by ${name}...`;
      
      group.appendChild(label);
      group.appendChild(input);
      container.appendChild(group);

      // Set column type in FilterManager
      this.#filterManager.setColumnType(name, type);
    });
  }

  /**
   * Adds date preset buttons to a filter group
   * @private
   */
  #addDatePresets(group) {
    const presets = document.createElement('div');
    presets.className = 'date-presets';
    
    // Common presets
    const commonPresets = [
      { key: 'today', label: 'Today' },
      { key: 'yesterday', label: 'Yesterday' },
      { key: 'week', label: 'This Week' },
      { key: 'lastWeek', label: 'Last Week' },
      { key: 'month', label: 'This Month' },
      { key: 'lastMonth', label: 'Last Month' },
      { key: 'year', label: 'This Year' },
      { key: 'lastYear', label: 'Last Year' }
    ];
    
    // Create preset buttons
    commonPresets.forEach(preset => {
      const btn = document.createElement('button');
      btn.className = 'date-preset-btn';
      btn.textContent = preset.label;
      btn.addEventListener('click', () => {
        const input = group.querySelector('input');
        input.value = preset.key;
        input.dispatchEvent(new Event('change')); // Trigger change event
      });
      presets.appendChild(btn);
    });

    group.appendChild(presets);
  }

  /**
   * Opens the filter panel
   */
  open() {
    if (!this.#isOpen) {
      this.#element.classList.add('visible');
      this.#isOpen = true;
      // Add animation class after a frame to trigger transition
      requestAnimationFrame(() => {
        this.#element.classList.add('active');
      });
    }
  }

  /**
   * Closes the filter panel
   */
  close() {
    if (this.#isOpen) {
      this.#element.classList.remove('active');
      // Wait for animation to complete
      setTimeout(() => {
        this.#element.classList.remove('visible');
        this.#isOpen = false;
      }, 300);
    }
  }

  /**
   * Applies the current filters
   * @private
   */
  #applyFilters() {
    const filterGroups = this.#element.querySelectorAll('.filter-group');
    
    filterGroups.forEach(group => {
      const label = group.querySelector('label');
      const input = group.querySelector('input');
      
      if (input.value) {
        this.#filterManager.setFilter(label.textContent, input.value);
      }
    });

    if (this.#onFiltersChanged) {
      this.#onFiltersChanged();
    }

    this.close();
  }

  /**
   * Clears all filters
   * @private
   */
  #clearFilters() {
    const inputs = this.#element.querySelectorAll('.filter-group input');
    inputs.forEach(input => input.value = '');
    this.#filterManager.clearFilters();
    
    if (this.#onFiltersChanged) {
      this.#onFiltersChanged();
    }
  }
}

export default FilterPanel; 