// Global state management
let state = {
  originalData: [],
  currentHeaders: [],
  visibleColumns: [],
  currentPage: 1,
  rowsPerPage: 50,
  sortConfig: null,
  activeFilters: {},
  filterValues: {}
};

// Table filters state
let tableFilterValues = {};
let tableActiveFilters = {};

// Module filters state
let moduleFilterValues = {};
let moduleActiveFilters = {};

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
    activeFilters: {},
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
  state.visibleColumns = columns;
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
  state.activeFilters = filters;
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
  return state.activeFilters;
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