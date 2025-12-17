// js/ui.js
import { domElements, notify } from './dom.js'; // Import domElements directly
import { fetchPageTitle } from './api.js';
import { TRACK_PARAMS } from './config.js';

let radarChart; // Will be initialized in initUI

export function initUI() {
  radarChart = new Chart(domElements.radarCanvas, { // Use domElements.radarCanvas directly
    type: "radar",
    data: {
      labels: ["Herkunft", "Emotion", "Framing", "Bias", "Reputation", "Tracking"],
      datasets: [{
        label: "Impact",
        data: [0,0,0,0,0,0],
        fill: true,
        backgroundColor: "rgba(124,58,237,0.25)",
        borderColor: "#7c3aed",
        pointBackgroundColor: "#60a5fa",
        pointBorderColor: "#1f2937",
        pointRadius: 5, // Increased point radius
        borderWidth: 3 // Increased border width
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false }, tooltip: { enabled: true } },
      scales: {
        r: {
          beginAtZero: true,
          suggestedMax: 100,
          grid: { color: "#2a313d" },
          angleLines: { color: "#2a313d" },
          pointLabels: { color: "#cbd5e1", font: { size: 12 } }
        }
      }
    }
  });
}

export function renderDimensions(data) {
  const dims = [
    { key: "Herkunft", val: data.scores.origin, desc: "Redirects, Shortlinks" },
    { key: "Emotion", val: data.scores.emotion, desc: data.labels.emotion },
    { key: "Framing", val: data.scores.framing, desc: data.labels.framing },
    { key: "Bias", val: data.labels.bias, desc: data.labels.bias },
    { key: "Reputation", val: data.scores.reputation, desc: data.labels.reputation },
    { key: "Tracking", val: data.scores.tracking, desc: data.labels.tracking }
  ];
  domElements.dimensionsGrid.innerHTML = ""; // Use domElements
  dims.forEach(d => {
    const el = document.createElement("div");
    el.className = "item";
    const badgeCls = d.key === "Emotion" || d.key === "Framing" || d.key === "Bias"
      ? (d.val >= 70 ? "danger" : d.val >= 55 ? "warn" : "ok")
      : (d.val >= 70 ? "ok" : d.val >= 55 ? "warn" : "danger");
    el.innerHTML = `
      <div class="k">${d.key}</div>
      <div class="v flex">
        <span class="badge ${badgeCls}">${d.val}</span>
        <span class="small">${d.desc}</span>
      </div>
    `;
    domElements.dimensionsGrid.appendChild(el); // Use domElements
  });
}

export function renderRedirects(data) {
  domElements.redirectList.innerHTML = ""; // Use domElements
  if (data.chain.length === 0) {
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `<div class="k">Redirects</div><div class="v small">Keine</div>`;
    domElements.redirectList.appendChild(el); // Use domElements
    return;
  }
  data.chain.forEach((href, idx) => {
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div class="k">Schritt ${idx+1}</div>
      <div class="v mono small">${href}</div>
    `;
    domElements.redirectList.appendChild(el); // Use domElements
  });
}

export function renderParams(data) {
  domElements.paramList.innerHTML = ""; // Use domElements
  if (data.parsed.params.length === 0) {
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `<div class="k">Parameter</div><div class="v small">Keine</div>`;
    domElements.paramList.appendChild(el); // Use domElements
    return;
  }
  data.parsed.params.forEach(p => {
    const isTrack = TRACK_PARAMS.includes(p.key.toLowerCase());
    const cls = isTrack ? "warn" : "ok";
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div class="k">${p.key}</div>
      <div class="v flex">
        <span class="badge ${cls} mono">${p.value || "–"}</span>
        <span class="small">${isTrack ? "Tracking-Param" : "Allg. Param"}</span>
      </div>
    `;
    domElements.paramList.appendChild(el); // Use domElements
  });
}

export function renderSemantics(data) {
  // fetchPageTitle is now heuristic, so no await needed.
  const title = fetchPageTitle(data.url); // Call heuristic fetchPageTitle
  domElements.titleGuess.textContent = title; // Use domElements

  domElements.emotionVal.textContent = `${data.labels.emotion} (${data.scores.emotion})`; // Use domElements
  domElements.framingVal.textContent = `${data.labels.framing} (${data.scores.framing})`; // Use domElements
  domElements.biasVal.textContent = `${data.labels.bias} (${data.scores.bias})`; // Use domElements
}

export function renderReputation(data) {
  // fetchWhoisData is no longer an async API call, it's simulated.
  const whoisData = {
    registrar: "Heuristisch simuliert",
    creationDate: "N/A",
    expirationDate: "N/A"
  };
  domElements.whoisVal.textContent = `Registrar: ${whoisData.registrar} | Created: ${whoisData.creationDate} | Expires: ${whoisData.expirationDate}`; // Use domElements
  
  domElements.pagerankVal.textContent = `${data.labels.reputation} (${data.scores.reputation})`; // Use domElements
  domElements.httpsVal.textContent = data.parsed.https ? "Aktiv" : "Nein"; // Use domElements
  domElements.shortVal.textContent = data.parsed.shortlink ? "Ja" : "Nein"; // Use domElements
  domElements.patternVal.textContent = data.suspicious.length ? data.suspicious.join(", ") : "Keine"; // Use domElements
}

export function renderRadar(data) {
  console.log("ui.js: renderRadar called with data.scores:", data.scores); // Debugging line
  // Ensure radarChart is initialized before trying to update it
  if (!radarChart) {
    console.error("Radar chart not initialized!");
    return;
  }
  radarChart.data.datasets[0].data = [
    data.scores.origin,
    data.scores.emotion,
    data.scores.framing,
    data.scores.bias,
    data.scores.reputation,
    data.scores.tracking
  ];
  radarChart.update();
  console.log("ui.js: radarChart data after update:", radarChart.data.datasets[0].data); // Debugging line
  domElements.scoreVal.textContent = data.scores.overall; // Use domElements
  domElements.verdictBadge.textContent = data.labels.verdict; // Use domElements
  domElements.verdictBadge.className = `badge ${data.scores.overall >= 55 ? "ok" : data.scores.overall >= 35 ? "warn" : "danger"}`; // Use domElements
}

export function exportJSON(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "linkaudit.json"; a.click();
  URL.revokeObjectURL(url);
}

// Export generatePdfReport and renderExplanations functions
export function generatePdfReport(data) { // Ensure this function is exported
  // eslint-disable-next-line no-undef
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  let yOffset = 10;
  const margin = 10;
  const lineHeight = 7;
  const maxWidth = doc.internal.pageSize.getWidth() - 2 * margin;

  // Title
  doc.setFontSize(18);
  doc.text("LinkAudit Analysebericht", margin, yOffset);
  yOffset += lineHeight * 2;

  // URL
  doc.setFontSize(12);
  doc.text(`Analysierte URL: ${data.url}`, margin, yOffset);
  yOffset += lineHeight;

  // Overall Score and Verdict
  doc.text(`Gesamtscore: ${data.scores.overall} - ${data.labels.verdict}`, margin, yOffset);
  yOffset += lineHeight * 2;

  // Add Radar Chart
  const radarCanvas = domElements.radarCanvas;
  if (radarCanvas) {
    const imgData = radarCanvas.toDataURL('image/png');
    const imgWidth = 100; // Adjust as needed
    const imgHeight = (radarCanvas.height * imgWidth) / radarCanvas.width;
    doc.addImage(imgData, 'PNG', margin, yOffset, imgWidth, imgHeight);
    yOffset += imgHeight + lineHeight;
  }

  // Detailed Explanations
  doc.setFontSize(14);
  doc.text("Detaillierte Erklärungen:", margin, yOffset);
  yOffset += lineHeight * 1.5;

  // Re-generate text for PDF to avoid parsing complex HTML from DOM
  const explanations = [];

  explanations.push(`Zusammenfassung des Vertrauenswerts: Der Gesamtscore von ${data.scores.overall} stuft diesen Link als ${data.labels.verdict} ein.`);
  explanations.push(`Herkunft (${data.scores.origin}): Dieser Link wurde in ${data.chain.length} Schritten umgeleitet. ${data.parsed.shortlink ? 'Es wurde ein Kurzlink erkannt, der die direkte Herkunft verschleiern kann.' : 'Es wurde kein Kurzlink erkannt.'}`);
  explanations.push(`Emotionale Tonalität (${data.scores.emotion}): Die Analyse zeigt eine Tonalität als ${data.labels.emotion}. Ein hoher emotionaler Wert kann auf reißerische Inhalte oder Clickbait hinweisen.`);
  explanations.push(`Framing & Perspektive (${data.scores.framing}): Der Link nutzt eine ${data.labels.framing}-Perspektive. Dies beschreibt die Art und Weise, wie ein Thema dargestellt wird.`);
  explanations.push(`Bias-Indikatoren (${data.scores.bias}): Es wurden ${data.labels.bias} Hinweise auf Voreingenommenheit gefunden. Dies sind oft stark polarisierende Begriffe.`);
  explanations.push(`Domain-Reputation (${data.scores.reputation}): Die Reputation der Domain wird als ${data.labels.reputation} eingeschätzt. Die URL verwendet ${data.parsed.https ? 'HTTPS (sicher)' : 'kein HTTPS (unsicher)'}. WHOIS-Informationen sind heuristisch simuliert.`);
  explanations.push(`Tracking-Aktivität (${data.scores.tracking}): Die Tracking-Aktivität wird als ${data.labels.tracking} eingestuft. Es wurden ${data.trackedKeys.length > 0 ? `die Parameter ${data.trackedKeys.join(', ')}` : 'keine bekannten Tracking-Parameter'} erkannt.`);

  if (data.suspicious.length > 0) {
    explanations.push(`Verdächtige Muster: ${data.suspicious.join(', ')}. Diese Muster können auf potenzielle Risiken wie Phishing oder schädliche Inhalte hindeuten.`);
  }

  doc.setFontSize(10);
  explanations.forEach(exp => {
    const splitText = doc.splitTextToSize(exp, maxWidth);
    doc.text(splitText, margin, yOffset);
    yOffset += splitText.length * lineHeight;
  });

  yOffset += lineHeight;

  // Raw Data (JSON)
  doc.setFontSize(14);
  doc.text("Rohdaten (JSON):", margin, yOffset);
  yOffset += lineHeight * 1.5;

  doc.setFontSize(8);
  const rawJson = JSON.stringify(data, null, 2);
  const rawJsonSplit = doc.splitTextToSize(rawJson, maxWidth);
  doc.text(rawJsonSplit, margin, yOffset);
  // No need to adjust yOffset here, just let it overflow if it's too long.
  // For a real report, you'd add pages for overflow.

  doc.save(`linkaudit-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  notify("PDF-Bericht generiert!");
}
