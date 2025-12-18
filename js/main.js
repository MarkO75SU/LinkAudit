// js/main.js
import { DEMO_LINKS } from './config.js';
import { initDomElements, domElements, notify } from './dom.js'; // Import domElements and initDomElements
import { initUI, renderRadar, renderDimensions, renderRedirects, renderParams, renderSemantics, renderReputation, exportJSON, renderExplanations, generatePdfReport } from './ui.js'; 
import { fetchPageTitle, fetchPageContent } from './api.js'; // Corrected import for fetchPageTitle and added fetchPageContent
import {
  parseUrl, extractParams, detectShortlink, httpsStatus,
  scoreEmotion, scoreFraming, scoreBias, scoreTracking,
  buildRedirectChain, detectPatterns, scoreReputation
} from './heuristics.js';

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

  let pageText = ""; // Variable to store extracted text
  
  // Determine the primary text for semantic analysis
  let textForSemanticAnalysis = "";

  if (mode === "full") {
    try {
      pageText = await fetchPageContent(urlStr); // Backend now returns plain text directly
      console.log("main.js: Extracted page text (full mode) - first 500 chars:", pageText.substring(0, 500) + "...");
      textForSemanticAnalysis = pageText; // Use full text for semantic analysis in full mode
    } catch (e) {
      console.error("main.js: Error fetching page content in full mode:", e);
      notify("Fehler beim Abrufen des Seiteninhalts für Analyse.", true);
      // Fallback to light mode or handle as appropriate, for now use title
    }
  }

  const title = fetchPageTitle(urlStr); 

  // If pageText is not available (e.g., light mode or fetch failed), use the title for semantic analysis
  if (!textForSemanticAnalysis) {
    textForSemanticAnalysis = title;
  }

  // Use textForSemanticAnalysis for emotion, framing, and bias scoring
  const emo = scoreEmotion(textForSemanticAnalysis);
  const fra = scoreFraming(textForSemanticAnalysis);
  const bia = scoreBias(textForSemanticAnalysis);

  const rep = scoreReputation(u.hostname, isHttps, isShort); 
  const trk = scoreTracking(params);

  const origins = await buildRedirectChain(u); 
  const patt = detectPatterns(u); 

  let originScore = 80 - (origins.length - 1) * 10 - (isShort ? 15 : 0);
  originScore = Math.max(0, Math.min(100, originScore));

  const w = mode === "full"
    ? { origin: 0.18, emo: 0.18, fra: 0.16, bia: 0.16, rep: 0.18, trk: 0.14 }
    : { origin: 0.20, emo: 0.20, fra: 0.15, bia: 0.15, rep: 0.20, trk: 0.10 };

  const overall = Math.round(
    originScore * w.origin +
    (100 - emo.value) * w.emo +
    (100 - fra.value) * w.fra +
    (100 - bia.value) * w.bia +
    rep.value * w.rep + 
    trk.value * w.trk
  );

  let verdict = "Solide";
  if (overall >= 80) { verdict = "Hoch vertrauenswürdig"; }
  else if (overall >= 55) { verdict = "Solide"; }
  else if (overall >= 35) { verdict = "Vorsicht"; }
  else { verdict = "Niedrig"; }

  return {
    url: urlStr,
    parsed: { host: u.hostname, https: isHttps, shortlink: isShort, params },
    scores: { origin: originScore, emotion: emo.value, framing: fra.value, bias: bia.value, reputation: rep.value, tracking: trk.value, overall },
    labels: { emotion: emo.label, framing: fra.label, bias: bia.label, reputation: rep.label, tracking: trk.label, verdict },
    chain: origins,
    suspicious: patt,
    titleGuess: title,
    trackedKeys: trk.tracked,
    pageText: pageText // Returning extracted text
  };
}

async function analyzeAndRender(urlToAnalyze, analysisMode) {
  try {
    const data = await aggregate(urlToAnalyze, analysisMode);
    lastData = data;
    console.log("main.js: Data for rendering:", data);
    renderRadar(data);
    renderDimensions(data);
    renderRedirects(data);
    renderParams(data);
    renderSemantics(data);
    renderReputation(data);
    renderExplanations(data);
    notify("Analyse abgeschlossen.");
    saveAnalysis(data);
    renderHistoryAndSetupListeners();
  } catch (e) {
    console.error("main.js: Analysis error:", e);
    notify(e.message || "Analysefehler", true);
  }
}

function deleteHistoryItem(timestamp) {
  let history = JSON.parse(localStorage.getItem('analysisHistory')) || [];
  history = history.filter(item => item.timestamp !== timestamp);
  localStorage.setItem('analysisHistory', JSON.stringify(history));
  renderHistoryAndSetupListeners();
  notify("Eintrag gelöscht.");
}

function renderHistoryAndSetupListeners() {
  const history = JSON.parse(localStorage.getItem('analysisHistory')) || []; 
  
  if (!domElements.historyList) return;

  domElements.historyList.innerHTML = ""; 

  if (history.length === 0) {
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `<div class="k">Historie</div><div class="v small">Keine Analysen vorhanden.</div>`;
    domElements.historyList.appendChild(el);
    if(domElements.clearHistoryBtn) domElements.clearHistoryBtn.style.display = 'none';
    return;
  }

  history.forEach(historyItem => {
    const el = document.createElement("div");
    el.className = "item";
    const date = new Date(historyItem.timestamp).toLocaleString();
    el.innerHTML = `
      <div class="k">${date}</div>
      <div class="v mono small" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${historyItem.url}">${historyItem.url}</div>
      <div class="actions" style="margin-top: 5px;">
        <button class="secondary small reanalyze-btn" data-url="${historyItem.url}">Analysieren</button>
        <button class="danger small delete-btn" data-timestamp="${historyItem.timestamp}">Löschen</button>
      </div>
    `;
    domElements.historyList.appendChild(el);

    const reanalyzeBtn = el.querySelector('.reanalyze-btn');
    if(reanalyzeBtn) {
      reanalyzeBtn.addEventListener('click', (event) => {
        const url = event.target.dataset.url;
        if(domElements.urlInput) domElements.urlInput.value = url;
        analyzeAndRender(url, domElements.llmMode.value);
      });
    }

    const deleteBtn = el.querySelector('.delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (event) => {
        const timestamp = event.target.dataset.timestamp;
        deleteHistoryItem(timestamp);
      });
    }
  });

  if(domElements.clearHistoryBtn) domElements.clearHistoryBtn.style.display = 'block'; 
  if(domElements.clearHistoryBtn) domElements.clearHistoryBtn.classList.add('danger');
}

function saveAnalysis(data) {
  let history = JSON.parse(localStorage.getItem('analysisHistory')) || [];
  
  history = history.filter(item => item.url !== data.url);

  const analysisData = {
    url: data.url,
    timestamp: new Date().toISOString(),
  };

  history.unshift(analysisData);

  localStorage.setItem('analysisHistory', JSON.stringify(history));
}


function setupEventListeners() {
  if(domElements.analyzeBtn) {
    domElements.analyzeBtn.addEventListener("click", async () => {
      console.log("main.js: Analyze button clicked.");
      const val = domElements.urlInput.value.trim();
      if (!val) { notify("Bitte eine URL eingeben.", true); return; }
      await analyzeAndRender(val, domElements.llmMode.value);
    });
  }

  if(domElements.demoBtn) {
    domElements.demoBtn.addEventListener("click", () => {
      console.log("main.js: Demo button clicked.");
      const pick = DEMO_LINKS[Math.floor(Math.random() * DEMO_LINKS.length)];
      domElements.urlInput.value = pick;
      if(domElements.analyzeBtn) domElements.analyzeBtn.click();
    });
  }

  if(domElements.resetBtn) {
    domElements.resetBtn.addEventListener("click", () => {
      console.log("main.js: Reset button clicked.");
      if(domElements.urlInput) domElements.urlInput.value = "";
      if(domElements.scoreVal) domElements.scoreVal.textContent = "–"; 
      if(domElements.verdictBadge) {
        domElements.verdictBadge.textContent = "–";
        domElements.verdictBadge.className = "badge ok";
      }
      if(domElements.dimensionsGrid) domElements.dimensionsGrid.innerHTML = ""; 
      if(domElements.redirectList) domElements.redirectList.innerHTML = ""; 
      if(domElements.paramList) domElements.paramList.innerHTML = "";
      if(domElements.titleGuess) domElements.titleGuess.textContent = "–"; 
      if(domElements.emotionVal) domElements.emotionVal.textContent = "–"; 
      if(domElements.framingVal) domElements.framingVal.textContent = "–"; 
      if(domElements.biasVal) domElements.biasVal.textContent = "–";
      if(domElements.whoisVal) domElements.whoisVal.textContent = "–"; 
      if(domElements.pagerankVal) domElements.pagerankVal.textContent = "–"; 
      if(domElements.httpsVal) domElements.httpsVal.textContent = "–"; 
      if(domElements.shortVal) domElements.shortVal.textContent = "–"; 
      if(domElements.patternVal) domElements.patternVal.textContent = "–";
      notify("Zurückgesetzt.");
    });
  }

  if(domElements.exportJsonBtn) {
    domElements.exportJsonBtn.addEventListener("click", () => {
      console.log("main.js: Export JSON button clicked.");
      if (!lastData) { notify("Keine Daten zum Export.", true); return; }
      exportJSON(lastData);
    });
  }

  if(domElements.exportPdfBtn) {
    domElements.exportPdfBtn.addEventListener("click", () => {
      console.log("main.js: Export PDF button clicked.");
      if (!lastData) { notify("Keine Daten zum Export.", true); return; }
      generatePdfReport(lastData);
    });
  }

  if(domElements.clearHistoryBtn) {
    domElements.clearHistoryBtn.addEventListener("click", () => {
      localStorage.removeItem('analysisHistory');
      renderHistoryAndSetupListeners();
      notify("Historie gelöscht.");
    });
  }
}

// Bootstrap: preload a demo
window.addEventListener("load", () => {
  console.log("main.js: Window loaded.");
  initDomElements();
  setupEventListeners();
  initUI();
  
  renderHistoryAndSetupListeners(); 

  const urlToAnalyze = domElements.urlInput ? domElements.urlInput.value.trim() : "";
  if (!urlToAnalyze && domElements.urlInput) {
      domElements.urlInput.value = DEMO_LINKS[0];
      analyzeAndRender(DEMO_LINKS[0], domElements.llmMode.value);
  } else if (urlToAnalyze) {
      analyzeAndRender(urlToAnalyze, domElements.llmMode.value);
  }
});