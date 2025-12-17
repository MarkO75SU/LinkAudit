// js/api.js
import { notify } from './dom.js';

// API Keys - No longer directly used due to proxy limitations for custom headers.
// These are kept as placeholders for future backend integration.
const APILAYER_WHOIS_API_KEY = "YOUR_APILAYER_API_KEY";
const OPENPAGERANK_API_KEY = "YOUR_OPENPAGERANK_API_KEY";

// Removed CORS_PROXY_URL and proxy logic.
// External APIs are reverted to heuristic/simulated within heuristics.js
// or if a function can provide local data (like fetchPageTitle from local content).

export function fetchPageTitle(urlStr) {
  // Original heuristic implementation as direct external fetch often blocked by CORS for HTML content.
  // This function is still named fetchPageTitle but will act as a heuristicTitle.
  try {
    const urlObj = new URL(urlStr); // Use URL object for parsing
    const parts = urlObj.pathname.split("/").filter(Boolean);
    let title = parts.slice(-2).join(" ").replace(/[-_]/g, " ");
    const q = urlObj.searchParams.get("utm_campaign") || urlObj.searchParams.get("utm_term") || "";
    const base = `${urlObj.hostname} – ${title || "Inhalt"}`.trim();
    return (q ? `${base} (${q})` : base).trim();
  } catch (error) {
    console.error("Error creating heuristic page title:", error);
    return "Titel konnte nicht abgerufen werden";
  }
}

// Removed fetchPageRank, fetchWhoisData, checkUrlhausReputation
// Their functionality will be reverted to heuristic/simulated in js/heuristics.js
// or directly simulated in js/ui.js if needed.