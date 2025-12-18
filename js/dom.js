// js/dom.js

export const domElements = {}; // This object will hold all DOM elements

export function initDomElements() {
  domElements.urlInput = document.getElementById("url");
  domElements.analyzeBtn = document.getElementById("analyzeBtn");
  domElements.demoBtn = document.getElementById("demoBtn");
  domElements.resetBtn = document.getElementById("resetBtn");
  domElements.radarCanvas = document.getElementById("radar");
  domElements.scoreVal = document.getElementById("scoreVal");
  domElements.verdictBadge = document.getElementById("verdictBadge");
  domElements.dimensionsGrid = document.getElementById("dimensionsGrid");
  domElements.redirectList = document.getElementById("redirectList");
  domElements.paramList = document.getElementById("paramList");
  domElements.titleGuess = document.getElementById("titleGuess");
  domElements.emotionVal = document.getElementById("emotionVal");
  domElements.framingVal = document.getElementById("framingVal");
  domElements.biasVal = document.getElementById("biasVal");
  domElements.whoisVal = document.getElementById("whoisVal");
  domElements.pagerankVal = document.getElementById("pagerankVal");
  domElements.httpsVal = document.getElementById("httpsVal");
  domElements.shortVal = document.getElementById("shortVal");
  domElements.patternVal = document.getElementById("patternVal");
  domElements.llmMode = document.getElementById("llmMode");
  domElements.exportJsonBtn = document.getElementById("exportJson");
  domElements.exportPdfBtn = document.getElementById("exportPdfBtn"); // Corrected ID
  domElements.notifyContainer = null; // Initialize notifyContainer
  
  // Re-added historyList and clearHistoryBtn
  domElements.historyList = document.getElementById("historyList");
  domElements.clearHistoryBtn = document.getElementById("clearHistory");
  domElements.dynamicExplanations = document.getElementById("dynamicExplanations");

  // Basic check if elements were found, log warnings if not
  // This check is important to catch missing elements early.
  Object.keys(domElements).forEach(key => {
    if (key !== 'notifyContainer' && !domElements[key]) {
      console.warn(`[DOM] DOM Element not found for key: ${key}`);
    }
  });
}

export function notify(msg, danger = false) {
  // Ensure the element is accessed after it's initialized
  if (!domElements.notifyContainer) {
    domElements.notifyContainer = document.createElement("div");
    domElements.notifyContainer.style.position = "fixed";
    domElements.notifyContainer.style.bottom = "16px";
    domElements.notifyContainer.style.right = "16px";
    domElements.notifyContainer.style.padding = "10px 12px";
    domElements.notifyContainer.style.borderRadius = "10px";
    domElements.notifyContainer.style.border = "1px solid var(--border)";
    domElements.notifyContainer.style.zIndex = 99;
    document.body.appendChild(domElements.notifyContainer);
  }

  const n = document.createElement("div");
  n.textContent = msg;
  n.style.background = danger ? "rgba(248,113,113,0.12)" : "rgba(124,58,237,0.12)";
  n.style.color = danger ? "var(--danger)" : "var(--text)";
  domElements.notifyContainer.appendChild(n);
  
  setTimeout(() => n.remove(), 2000);
}
