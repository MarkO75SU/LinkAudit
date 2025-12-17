// js/history.js

const HISTORY_STORAGE_KEY = 'linkAuditHistory';

/**
 * Loads the analysis history from localStorage.
 * @returns {Array} An array of stored analysis results.
 */
export function loadHistory() {
  const historyJson = localStorage.getItem(HISTORY_STORAGE_KEY);
  return historyJson ? JSON.parse(historyJson) : [];
}

/**
 * Saves a new analysis result to localStorage.
 * @param {Object} analysisData - The full analysis data object to save.
 */
export function saveAnalysis(analysisData) {
  const history = loadHistory();
  const newEntry = {
    id: Date.now(), // Unique ID for the history item
    timestamp: new Date().toISOString(),
    url: analysisData.url,
    data: analysisData,
  };
  history.unshift(newEntry); // Add to the beginning
  // Limit history size to prevent excessive storage
  const MAX_HISTORY_ITEMS = 20;
  if (history.length > MAX_HISTORY_ITEMS) {
    history.splice(MAX_HISTORY_ITEMS);
  }
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
}

/**
 * Deletes a specific history item by its ID.
 * @param {number} id - The ID of the history item to delete.
 */
export function deleteHistoryItem(id) {
  let history = loadHistory();
  history = history.filter(item => item.id !== id);
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
}

/**
 * Clears all analysis history from localStorage.
 */
export function clearHistory() {
  localStorage.removeItem(HISTORY_STORAGE_KEY);
}
