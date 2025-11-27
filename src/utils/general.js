// Utility function to debounce function calls
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Format date for display
export function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return date;
    return d.toLocaleDateString();
}

// Sort data by column
export function sortData(data, column, direction = 'asc') {
    return [...data].sort((a, b) => {
        let valueA = a[column];
        let valueB = b[column];

        // Handle numeric values
        if (!isNaN(valueA) && !isNaN(valueB)) {
            valueA = Number(valueA);
            valueB = Number(valueB);
        }
        // Handle dates
        else if (isValidDate(valueA) && isValidDate(valueB)) {
            valueA = new Date(valueA);
            valueB = new Date(valueB);
        }

        if (direction === 'asc') {
            return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
        } else {
            return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
        }
    });
}

// Check if a string is a valid date
function isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
}

// Get DOM element by selector
export function getElement(selector) {
    const element = document.querySelector(selector);
    if (!element) {
        console.warn(`Element not found: ${selector}`);
    }
    return element;
}

// Create DOM element with optional class
export function createElement(tag, className = '', textContent = '') {
    const element = document.createElement(tag);
    if (tag === 'table') {
        element.classList.add('data-table');
        if (className && className !== 'data-table') {
            element.classList.add(...className.split(' ').filter(c => c && c !== 'data-table'));
        }
    } else if (className) {
        element.className = className;
    }
    if (textContent) element.textContent = textContent;
    return element;
}

// Toggle visibility of elements
export function toggleElements(elements, show) {
    // Convert to array if single element or selector
    const elementArray = Array.isArray(elements) ? elements : [elements];
    
    elementArray.forEach(element => {
        // If element is a string (selector), get the DOM element
        const domElement = typeof element === 'string' ? getElement(element) : element;
        
        if (domElement) {
            if (show === 'show') {
                domElement.classList.remove('hidden');
            } else if (show === 'hide') {
                domElement.classList.add('hidden');
            } else {
                domElement.classList.toggle('hidden', !show);
            }
        }
    });
}

// Show error message
export function showError(message) {
    console.error(message);
    alert(message); // TODO: Replace with better UI notification
}

// Search data based on criteria
export function searchData(data, searchTerm) {
    const term = String(searchTerm || '').toLowerCase();
    const results = [];
    
    for (const row of data) {
        for (const value of Object.values(row)) {
            if (String(value || '').toLowerCase().includes(term)) {
                results.push(row);
                break;
            }
        }
    }
    
    return results;
} 

// === IndexedDB Utilities ===
const DB_NAME = 'thebridgeDB';
const STORE_NAME = 'backups';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = function(event) {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = function(event) {
      resolve(event.target.result);
    };
    request.onerror = function(event) {
      reject(event.target.error);
    };
  });
}

export async function saveToIndexedDB(key, data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ id: key, data });
    tx.oncomplete = () => { db.close(); resolve(true); };
    tx.onerror = (e) => { db.close(); reject(e); };
  });
}

export async function loadFromIndexedDB(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => { db.close(); resolve(req.result ? req.result.data : null); };
    req.onerror = (e) => { db.close(); reject(e); };
  });
}

export async function deleteFromIndexedDB(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(key);
    tx.oncomplete = () => { db.close(); resolve(true); };
    tx.onerror = (e) => { db.close(); reject(e); };
  });
}

export async function clearIndexedDB() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    tx.oncomplete = () => { db.close(); resolve(true); };
    tx.onerror = (e) => { db.close(); reject(e); };
  });
} 