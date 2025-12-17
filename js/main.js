// js/main.js
import { DEMO_LINKS } from './config.js';
import { initDomElements, domElements, notify } from './dom.js'; // Import domElements and initDomElements
// Corrected import: Added generatePdfReport and renderExplanations, removed renderHistory and other history-related imports
import { initUI, renderRadar, renderDimensions, renderRedirects, renderParams, renderSemantics, renderReputation, exportJSON, renderExplanations, generatePdfReport } from './ui.js'; 
import {
  parseUrl, extractParams, detectShortlink, httpsStatus,
  scoreEmotion, scoreFraming, scoreBias, scoreTracking,
  buildRedirectChain, detectPatterns, scoreReputation
} from './heuristics.js';
// Removed import for fetchPageTitle from api.js, as it's now heuristic in heuristics.js

console.log("main.js: Script started.");

let lastData = null;

async function aggregate(urlStr, mode="light") {
  console.log("main.js: Entering aggregate function for URL:", urlStr);
  const u = parseUrl(urlStr);
  if (!u) { 
    notify("Ungültige URL", true);
    throw new Error("Ungültige URL"); 
  }
  const params = extractParams(u);
  const isShort = detectShortlink(u.hostname);
  const isHttps = httpsStatus(u);

  // fetchPageTitle is now heuristic, no await needed.
  const title = fetchPageTitle(urlStr); 
  const emo = scoreEmotion(title);
  const fra = scoreFraming(title);
  const bia = scoreBias(title);
  // scoreReputation is now heuristic, no await needed.
  const rep = scoreReputation(u.hostname, isHttps, isShort); 
  const trk = scoreTracking(params);

  // buildRedirectChain is async
  const origins = await buildRedirectChain(u); 
  // detectPatterns is now heuristic, no await needed.
  const patt = detectPatterns(u); 

  // Herkunft score: penalize redirects count & shortlink
  let originScore = 80 - (origins.length - 1) * 10 - (isShort ? 15 : 0);
  originScore = Math.max(0, Math.min(100, originScore));

  // Overall score (weights)
  const w = mode === "full"
    ? { origin: 0.18, emo: 0.18, fra: 0.16, bia: 0.16, rep: 0.18, trk: 0.14 }
    : { origin: 0.20, emo: 0.20, fra: 0.15, bia: 0.15, rep: 0.20, trk: 0.10 };

  const overall = Math.round(
    originScore * w.origin +
    (100 - emo.value) * w.emo +       // higher emotion => lower trust
    (100 - fra.value) * w.fra +       // stronger framing => lower trust
    (100 - bia.value) * w.bia +       // more bias => lower trust
    rep.value * w.rep + 
    trk.value * w.trk
  );

  let verdict = "Solide";
  let badgeClass = "ok";
  if (overall >= 80) { verdict = "Hoch vertrauenswürdig"; badgeClass = "ok"; }
  else if (overall >= 55) { verdict = "Solide"; badgeClass = "ok"; }
  else if (overall >= 35) { verdict = "Vorsicht"; badgeClass = "warn"; }
  else { verdict = "Niedrig"; badgeClass = "danger"; }

  return {
    url: urlStr,
    parsed: { host: u.hostname, https: isHttps, shortlink: isShort, params },
    scores: { origin: originScore, emotion: emo.value, framing: fra.value, bias: bia.value, reputation: rep.value, tracking: trk.value, overall },
    labels: { emotion: emo.label, framing: fra.label, bias: bia.label, reputation: rep.label, tracking: trk.label, verdict },
    chain: origins,
    suspicious: patt,
    titleGuess: title,
    trackedKeys: trk.tracked
  };
}

async function analyzeAndRender(urlToAnalyze, analysisMode) {
  try {
    const data = await aggregate(urlToAnalyze, analysisMode);
    lastData = data;
    console.log("main.js: Data for rendering:", data); // Debugging line
    renderRadar(data);
    renderDimensions(data);
    renderRedirects(data);
    renderParams(data);
    renderSemantics(data);
    renderReputation(data);
    renderExplanations(data); // Render detailed explanations
    notify("Analyse abgeschlossen.");
    saveAnalysis(data); // Save analysis to history (now single item)
    renderHistoryAndSetupListeners(); // Re-render history (to show single item or empty state)
  } catch (e) {
    console.error("main.js: Analysis error:", e);
    notify(e.message || "Analysefehler", true);
  }
}

function renderHistoryAndSetupListeners() {
  const historyItem = loadHistory(); // Load the single history item
  
  domElements.historyList.innerHTML = ""; // Clear previous history display

  if (!historyItem) { // If no history item, display empty state
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `<div class="k">Historie</div><div class="v small">Keine Analysen vorhanden.</div>`;
    domElements.historyList.appendChild(el);
    domElements.clearHistoryBtn.style.display = 'none'; // Hide clear button if no history
    return;
  }

  // If historyItem exists, render it
  const el = document.createElement("div");
  el.className = "item";
  const date = new Date(historyItem.timestamp).toLocaleString();
  el.innerHTML = `
    <div class="k">${date}</div>
    <div class="v mono small" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.url}</div>
    <div class="actions" style="margin-top: 5px;">
      <button class="secondary small reanalyze-btn" data-url="${item.url}">Analysieren</button>
      <!-- Individual delete button is not needed for single-item history -->
    </div>
  `;
  domElements.historyList.appendChild(el);

  // Attach event listener for re-analyze
  el.querySelector('.reanalyze-btn').addEventListener('click', (event) => {
    const url = event.target.dataset.url;
    analyzeAndRender(url, domElements.llmMode.value); // Use domElements
  });

  // Show clear history button if history exists
  domElements.clearHistoryBtn.style.display = 'block'; 
}

function setupEventListeners() {
  domElements.analyzeBtn.addEventListener("click", async () => { // Use domElements
    console.log("main.js: Analyze button clicked.");
    const val = domElements.urlInput.value.trim(); // Use domElements
    if (!val) { notify("Bitte eine URL eingeben.", true); return; }
    await analyzeAndRender(val, domElements.llmMode.value); // Use domElements
  });

  domElements.demoBtn.addEventListener("click", () => { // Use domElements
    console.log("main.js: Demo button clicked.");
    const pick = DEMO_LINKS[Math.floor(Math.random() * DEMO_LINKS.length)];
    domElements.urlInput.value = pick; // Use domElements
    domElements.analyzeBtn.click(); // Use domElements
  });

  domElements.resetBtn.addEventListener("click", () => { // Use domElements
    console.log("main.js: Reset button clicked.");
    domElements.urlInput.value = ""; // Use domElements
    domElements.scoreVal.textContent = "–"; domElements.verdictBadge.textContent = "–"; domElements.verdictBadge.className = "badge ok"; // Use domElements
    domElements.dimensionsGrid.innerHTML = ""; domElements.redirectList.innerHTML = ""; domElements.paramList.innerHTML = ""; // Use domElements
    domElements.titleGuess.textContent = "–"; domElements.emotionVal.textContent = "–"; domElements.framingVal.textContent = "–"; domElements.biasVal.textContent = "–"; // Use domElements
    domElements.whoisVal.textContent = "–"; domElements.pagerankVal.textContent = "–"; domElements.httpsVal.textContent = "–"; domElements.shortVal.textContent = "–"; domElements.patternVal.textContent = "–"; // Use domElements
    notify("Zurückgesetzt.");
  });

  domElements.exportJsonBtn.addEventListener("click", () => { // Use domElements
    console.log("main.js: Export JSON button clicked.");
    if (!lastData) { notify("Keine Daten zum Export.", true); return; }
    exportJSON(lastData);
  });

  domElements.exportPdfBtn.addEventListener("click", () => { // Use domElements and call generatePdfReport
    console.log("main.js: Export PDF button clicked.");
    if (!lastData) { notify("Keine Daten zum Export.", true); return; }
    generatePdfReport(lastData); // Correctly call generatePdfReport
  });

  // Clear history button listener removed as history is now single item and clearing it means removing the item
  // The display logic in renderHistory handles hiding/showing it.
  // domElements.clearHistoryBtn.addEventListener("click", () => { ... });
}


// Bootstrap: preload a demo
window.addEventListener("load", () => {
  console.log("main.js: Window loaded.");
  initDomElements(); // Initialize DOM elements
  setupEventListeners(); // Setup event listeners AFTER DOM elements are initialized
  initUI(); // Initialize UI components like radar chart
  
  // Load history on startup and render the single item or empty state
  renderHistoryAndSetupListeners(); 

  // Analyze the demo link if input is empty or pre-filled
  const urlToAnalyze = domElements.urlInput.value.trim(); // Use domElements
  if (!urlToAnalyze) { // Only pre-fill and analyze if input is empty
      domElements.urlInput.value = DEMO_LINKS[0]; // Use domElements
      analyzeAndRender(DEMO_LINKS[0], domElements.llmMode.value); // Use domElements
  } else {
      // If there's already a value (e.g. from previous session), analyze it
      analyzeAndRender(urlToAnalyze, domElements.llmMode.value); // Use domElements
  }
});
