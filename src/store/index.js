// Global state management
let state = {
  originalData: [],
  currentHeaders: [],
  visibleColumns: [],
  currentPage: 1,
  rowsPerPage: 50,
  sortConfig: null,
  activeFilters: [],
  filterValues: {}
};

// Table filters state
let tableFilterValues = {};
let tableActiveFilters = {};
let tableFilterExclude = {}; // Track which columns are in exclude mode for table filters

// Module filters state
let moduleFilterValues = {};
let moduleActiveFilters = {};
let moduleFilterExclude = {}; // Track which columns are in exclude mode
let moduleFieldComparisons = {}; // Track field comparisons: { column: { compareColumn, operator } }

import { getCurrentCustomColumns } from '../components/custom/CustomColumnManager.js';

export function initializeState() {
  console.log("🔄 Initializing application state");
  state = {
    originalData: [],
    currentHeaders: [],
    visibleColumns: [],
    currentPage: 1,
    rowsPerPage: 50,
    sortConfig: null,
    activeFilters: [],
    filterValues: {}
  };
}

// Data setters
export function setOriginalData(data) {
  state.originalData = data;
}

export function setCurrentHeaders(headers) {
  state.currentHeaders = headers;
}

export function setVisibleColumns(columns) {
  state.visibleColumns = Array.isArray(columns) ? [...columns] : [];
}

export function setCurrentPage(page) {
  state.currentPage = page;
}

export function setRowsPerPage(rows) {
  state.rowsPerPage = rows;
}

export function setSortConfig(config) {
  state.sortConfig = config;
}

export function setActiveFilters(filters) {
  state.activeFilters = Array.isArray(filters) ? filters : [];
}

export function setFilterValues(values) {
  state.filterValues = values;
}

// Data getters
export function getOriginalData() {
  return state.originalData;
}

export function getCurrentHeaders() {
  // Devuelve los headers originales + personalizados
  const base = state.currentHeaders || [];
  const customs = getCurrentCustomColumns ? getCurrentCustomColumns().map(c => c.header) : [];
  return [...base, ...customs];
}

export function getVisibleColumns() {
  // Devuelve las columnas visibles + personalizadas si no están ocultas
  const base = state.visibleColumns || [];
  const customs = getCurrentCustomColumns ? getCurrentCustomColumns().map(c => c.header) : [];
  // Si alguna personalizada ya está en visibleColumns, no la repite
  return [...base, ...customs.filter(h => !base.includes(h))];
}

export function getCurrentPage() {
  return state.currentPage;
}

export function getRowsPerPage() {
  return state.rowsPerPage;
}

export function getSortConfig() {
  return state.sortConfig;
}

export function getActiveFilters() {
  return Array.isArray(state.activeFilters) ? state.activeFilters : [];
}

export function getFilterValues() {
  return state.filterValues;
}

// Table filter functions
export function getTableFilterValues() {
    return tableFilterValues;
}

export function setTableFilterValues(values) {
    tableFilterValues = values;
}

export function getTableActiveFilters() {
    return tableActiveFilters;
}

export function setTableActiveFilters(filters) {
    tableActiveFilters = filters;
}

export function getTableFilterExclude() {
    return tableFilterExclude;
}

export function setTableFilterExclude(exclude) {
    tableFilterExclude = exclude;
}

// Module filter functions
export function getModuleFilterValues() {
    return moduleFilterValues;
}

export function setModuleFilterValues(values) {
    moduleFilterValues = values;
}

export function getModuleActiveFilters() {
    return moduleActiveFilters;
}

export function setModuleActiveFilters(filters) {
    moduleActiveFilters = filters;
}

export function getModuleFilterExclude() {
    return moduleFilterExclude;
}

export function setModuleFilterExclude(exclude) {
    moduleFilterExclude = exclude;
}

// Module field comparison functions
export function getModuleFieldComparisons() {
    return moduleFieldComparisons;
}

export function setModuleFieldComparisons(comparisons) {
    moduleFieldComparisons = comparisons;
}

export function getModuleFieldComparison(column) {
    return moduleFieldComparisons[column] || null;
}

export function setModuleFieldComparison(column, comparison) {
    if (comparison && comparison.compareColumn && comparison.operator) {
        moduleFieldComparisons[column] = { ...comparison };
    } else {
        delete moduleFieldComparisons[column];
    }
}
