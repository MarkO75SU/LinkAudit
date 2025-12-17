// js/main.js
import { DEMO_LINKS } from './config.js';
import { initDomElements, domElements, notify } from './dom.js'; // Import domElements and initDomElements
import { initUI, renderRadar, renderDimensions, renderRedirects, renderParams, renderSemantics, renderReputation, exportJSON, renderHistory, renderExplanations, generatePdfReport } from './ui.js';
import {
  parseUrl, extractParams, detectShortlink, httpsStatus,
  scoreEmotion, scoreFraming, scoreBias, scoreTracking,
  buildRedirectChain, detectPatterns, scoreReputation
} from './heuristics.js';
import { fetchPageTitle } from './api.js';
import { loadHistory, saveAnalysis, clearHistory, deleteHistoryItem } from './history.js';

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

  // Fetching title is now heuristic, no await needed.
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
    saveAnalysis(data); // Save analysis to history
    renderHistoryAndSetupListeners(); // Re-render history
  } catch (e) {
    console.error("main.js: Analysis error:", e);
    notify(e.message || "Analysefehler", true);
  }
}

function renderHistoryAndSetupListeners() {
  const history = loadHistory();
  renderHistory(history, (id) => { // Callback for delete
    deleteHistoryItem(id);
    renderHistoryAndSetupListeners();
  }, (url) => { // Callback for re-analyze
    domElements.urlInput.value = url;
    domElements.analyzeBtn.click();
  });
}

function setupEventListeners() {
  domElements.analyzeBtn.addEventListener("click", async () => {
    console.log("main.js: Analyze button clicked.");
    const val = domElements.urlInput.value.trim();
    if (!val) { notify("Bitte eine URL eingeben.", true); return; }
    await analyzeAndRender(val, domElements.llmMode.value);
  });

  domElements.demoBtn.addEventListener("click", () => {
    console.log("main.js: Demo button clicked.");
    const pick = DEMO_LINKS[Math.floor(Math.random() * DEMO_LINKS.length)];
    domElements.urlInput.value = pick;
    domElements.analyzeBtn.click();
  });

  domElements.resetBtn.addEventListener("click", () => {
    console.log("main.js: Reset button clicked.");
    domElements.urlInput.value = "";
    domElements.scoreVal.textContent = "–"; domElements.verdictBadge.textContent = "–"; domElements.verdictBadge.className = "badge ok";
    domElements.dimensionsGrid.innerHTML = ""; domElements.redirectList.innerHTML = ""; domElements.paramList.innerHTML = "";
    domElements.titleGuess.textContent = "–"; domElements.emotionVal.textContent = "–"; domElements.framingVal.textContent = "–"; domElements.biasVal.textContent = "–";
    domElements.whoisVal.textContent = "–"; domElements.pagerankVal.textContent = "–"; domElements.httpsVal.textContent = "–"; domElements.shortVal.textContent = "–"; domElements.patternVal.textContent = "–";
    notify("Zurückgesetzt.");
  });

  domElements.exportJsonBtn.addEventListener("click", () => {
    console.log("main.js: Export JSON button clicked.");
    if (!lastData) { notify("Keine Daten zum Export.", true); return; }
    exportJSON(lastData);
  });

  // Removed copySummaryBtn event listener
  // domElements.copySummaryBtn.addEventListener("click", () => {
  //   console.log("main.js: Copy Summary button clicked.");
  //   if (!lastData) { notify("Keine Daten zum Kopieren.", true); return; }
  //   copySummary(lastData);
  // });

  domElements.exportPdfBtn.addEventListener("click", () => { // New PDF Export Button Event Listener
    console.log("main.js: Export PDF button clicked.");
    if (!lastData) { notify("Keine Daten zum Export.", true); return; }
    generatePdfReport(lastData);
  });

  domElements.clearHistoryBtn.addEventListener("click", () => {
    if (confirm("Möchten Sie wirklich die gesamte Analyse-Historie löschen?")) {
      clearHistory();
      renderHistoryAndSetupListeners();
      notify("Historie gelöscht.");
    }
  });
}


// Bootstrap: preload a demo
window.addEventListener("load", () => {
  console.log("main.js: Window loaded.");
  initDomElements(); // Initialize DOM elements
  setupEventListeners(); // Setup event listeners AFTER DOM elements are initialized
  initUI(); // Initialize UI components like radar chart
  domElements.urlInput.value = DEMO_LINKS[0];
  analyzeAndRender(DEMO_LINKS[0], domElements.llmMode.value); // Call analyzeAndRender
  renderHistoryAndSetupListeners(); // Render history on load
});