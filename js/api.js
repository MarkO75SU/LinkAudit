// js/api.js
import { notify } from './dom.js';

// API Schlüssel - Werden aufgrund von Proxy-Einschränkungen für benutzerdefinierte Header nicht mehr direkt verwendet.
// Diese sind als Platzhalter für zukünftige Backend-Integrationen beibehalten.
const APILAYER_WHOIS_API_KEY = "YOUR_APILAYER_API_KEY";
const OPENPAGERANK_API_KEY = "YOUR_OPENPAGERANK_API_KEY";

// CORS-Proxy-URL entfernt. Externe API-Aufrufe werden jetzt über den Backend-Proxy behandelt.
// Die Funktionalität wird auf Heuristiken in js/heuristics.js zurückgeführt
// oder direkt simuliert, falls die Daten lokal verfügbar sind (z.B. für fetchPageTitle).

export function fetchPageTitle(urlStr) {
  // Heuristische Implementierung, da direkter externer Abruf oft durch CORS für HTML-Inhalte blockiert wird.
  // Diese Funktion fungiert als heuristische Titelermittlung.
  try {
    const urlObj = new URL(urlStr); // URL-Objekt zur Analyse verwenden
    const parts = urlObj.pathname.split("/").filter(Boolean);
    let title = parts.slice(-2).join(" ").replace(/[-_]/g, " "); // Letzte zwei Pfadsegmente nehmen, Bindestriche ersetzen
    const q = urlObj.searchParams.get("utm_campaign") || urlObj.searchParams.get("utm_term") || ""; // Beispiel für Abfrageparameter-Extraktion
    const base = `${urlObj.hostname} – ${title || "Inhalt"}`.trim(); // Basistitel erstellen
    return (q ? `${base} (${q})` : base).trim(); // Abfrageparameter hinzufügen, falls vorhanden
  } catch (error) {
    console.error("Fehler beim Erstellen des heuristischen Seitentitels:", error);
    notify("Fehler beim Abrufen des Titels.", true);
    return "Titel konnte nicht abgerufen werden"; // Standardwert bei Fehler
  }
}
