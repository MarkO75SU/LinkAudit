// js/heuristics.js
import { SHORT_HOSTS, TRACK_PARAMS, CLICKBAIT_WORDS, POLARIZERS, FRAMING_PATTERNS } from './config.js';
// Removed checkUrlhausReputation and fetchPageRank imports as they are no longer in api.js or used here.

export function parseUrl(u) {
  try { return new URL(u); } catch { return null; }
}

export function extractParams(urlObj) {
  const params = [];
  for (const [k, v] of urlObj.searchParams.entries()) {
    params.push({ key: k, value: v });
  }
  return params;
}

export function detectShortlink(host) {
  return SHORT_HOSTS.includes(host.toLowerCase());
}

export function httpsStatus(urlObj) {
  return urlObj.protocol === "https:";
}

export function scoreEmotion(title) {
  const t = title.toLowerCase();
  let e = 50; // baseline neutral

  // More sensitive scoring for emotion
  CLICKBAIT_WORDS.forEach(w => { if (t.includes(w)) e += 15; }); // Slightly less aggressive
  POLARIZERS.forEach(w => { if (t.includes(w)) e += 10; });

  // Penalize based on excessive caps or exclamation marks (heuristic)
  if (t.match(/[A-Z]{3,}/) || t.includes('!!!') || t.includes('!!!')) e += 10; 

  e = Math.min(100, Math.max(0, e));
  let cls = "Neutral";
  if (e >= 85) cls = "Extrem reißerisch"; // New category
  else if (e >= 70) cls = "Alarmierend/reißerisch";
  else if (e >= 55) cls = "Euphorisch/aufgeladen";
  else if (e <= 25) cls = "Sehr nüchtern/unterkühlt"; // New category
  else if (e <= 40) cls = "Nüchtern/unterkühlt";
  return { value: e, label: cls };
}

export function scoreFraming(title) {
  const t = title.toLowerCase();
  let value = 40; // baseline neutral
  let label = "Sachlich";

  // More sensitive scoring for framing
  if (t.includes("gegen") || t.includes("vs") || t.includes("kampf") || t.includes("schlacht")) {
    value = 80; label = "Wir vs. Die";
  } else if (t.includes("enthüllt") || t.includes("geheimnis") || t.includes("beweist")) {
    value = 75; label = "Autoritätsargument";
  } else if (t.includes("schock") || t.includes("alarm") || t.includes("gefahr") || t.includes("warnung")) {
    value = 90; label = "Angst-Dringlichkeit"; // More aggressive
  } else if (t.includes("rettet") || t.includes("lösung") || t.includes("zukunft")) {
    value = 70; label = "Heilsversprechen";
  } else if (t.includes("experten") || t.includes("studie") || t.includes("wissenschaft")) {
      value = 30; label = "Faktisch/Studiengestützt"; // New category
  }
  
  // Penalize if title contains more than one framing pattern indicator
  let detectedFrames = 0;
  if (t.includes("gegen") || t.includes("vs")) detectedFrames++;
  if (t.includes("enthüllt") || t.includes("geheimnis")) detectedFrames++;
  if (t.includes("schock") || t.includes("alarm")) detectedFrames++;
  if (t.includes("rettet") || t.includes("lösung")) detectedFrames++;
  if (detectedFrames > 1) value += 10;


  value = Math.min(100, Math.max(0, value));
  return { value, label };
}

export function scoreBias(title) {
  const t = title.toLowerCase();
  let b = 40; // baseline neutral
  POLARIZERS.forEach(w => { if (t.includes(w)) b += 15; }); // More aggressive penalty
  CLICKBAIT_WORDS.forEach(w => { if (t.includes(w)) b += 5; });

  // Penalize use of strong adjectives/adverbs (heuristic)
  if (t.includes('nur') || t.includes('immer') || t.includes('nie') || t.includes('absolut')) b += 10;

  b = Math.min(100, Math.max(0, b));
  let label = "Gering";
  if (b >= 85) label = "Sehr Stark"; // New category
  else if (b >= 70) label = "Stark";
  else if (b >= 50) label = "Mittel";
  return { value: b, label };
}

export function scoreTracking(params) {
  const keys = params.map(p => p.key.toLowerCase());
  const tracked = keys.filter(k => TRACK_PARAMS.includes(k));
  let s = 80; // Base score

  // Penalize for each tracking parameter found
  s -= tracked.length * 15; // More aggressive penalty

  // Add bonus/penalty based on specific common parameters or combinations
  if (tracked.includes('utm_campaign') && tracked.includes('utm_source') && tracked.includes('utm_medium')) {
    s -= 10; // Standard marketing parameters, slight penalty if all present aggressively
  }
  if (tracked.some(p => ['utm_campaign', 'utm_term', 'utm_content'].some(t => p.includes(t)))) {
      s -= 5; // Penalty for parameters that are often used for specific campaign targeting
  }
  // Consider rewarding if no tracking parameters are present or only minimal ones
  if (tracked.length === 0) {
    s += 15; // Bonus for no tracking
  } else if (tracked.length === 1) {
    s += 5; // Bonus for minimal tracking
  }
  
  s = Math.max(0, Math.min(100, s)); // Clamp score between 0 and 100

  let label = "Minimal";
  if (s >= 80) label = "Minimal";
  else if (s >= 60) label = "Moderat"; // Adjust threshold
  else if (s >= 30) label = "Aggressiv"; // Adjust threshold
  else label = "Sehr aggressiv"; // New category

  return { value: s, label, tracked };
}

export function buildRedirectChain(urlObj) {
  const host = urlObj.hostname.toLowerCase();
  const chain = [urlObj.href];

  // More varied simulated chains
  if (detectShortlink(host)) {
    // Simulate shortlink expansion
    chain.push(`https://redirector.${host}/expand?id=${Math.random().toString(36).substring(7)}`);
    chain.push(`https://intermediate.example.com/tracking?url=${encodeURIComponent(urlObj.href)}`);
    chain.push(`https://final-destination.${host.split('.').slice(-2).join('.')}/article`);
  } else if (urlObj.searchParams.has("ref") || urlObj.searchParams.has("ref_src") || urlObj.searchParams.has("campaign")) {
    // Simulate affiliate/campaign redirects
    chain.push(`${urlObj.origin}${urlObj.pathname}?_ref_id=${Math.random().toString(36).substring(7)}`);
    chain.push(`${urlObj.origin}${urlObj.pathname.split('/').slice(0,-1).join('/')}/canonical`);
  } else if (host.split('.').length > 3 && !SHORT_HOSTS.includes(host)) {
      // Simulate multiple sub-redirects for complex hostnames
      chain.push(`http://${host.split('.').slice(1).join('.')}/path`);
      chain.push(`https://www.${host.split('.').slice(-2).join('.')}/final`);
  }

  // Ensure unique elements and a maximum length for simulation
  const uniqueChain = [...new Set(chain)];
  return uniqueChain.slice(0, 5); // Max 5 steps for simulated chain
}

export function detectPatterns(urlObj) {
  const href = urlObj.href.toLowerCase();
  const host = urlObj.hostname.toLowerCase();
  const suspicious = [];

  if (href.startsWith("http://")) suspicious.push("Nicht-HTTPS");
  if (href.includes("promo") || href.includes("aff_id")) suspicious.push("Affiliates/Promo");
  if (href.includes("tracking=")) suspicious.push("Tracking-Param");
  if (href.includes("crash") || href.includes("panic") || href.includes("katastrophe")) suspicious.push("Angst/Crash-Rhetorik");
  if (href.includes("scandal") || href.includes("skandal")) suspicious.push("Skandal-Rhetorik"); // New pattern

  // Expanded checks for suspicious patterns
  const urlParts = urlObj.pathname.split('/').filter(Boolean);
  if (urlParts.length > 5) { // Too many path segments can indicate obfuscation
    suspicious.push("Tiefe Pfadstruktur");
  }
  // Check for excessive subdomains (excluding known shorteners)
  const subdomainParts = host.split('.').slice(0, -2); // Exclude TLD and second-level domain
  if (subdomainParts.length > 1 && !SHORT_HOSTS.includes(host)) { 
      suspicious.push("Exzessive Subdomains");
  }
  // Add checks for common phishing keywords in path segments
  const phishingKeywords = ["login", "verify", "account", "update", "secure-", "secure.","credentials", "password", "bank", "paypal", "appleid"]; // More keywords
  if (urlParts.some(part => phishingKeywords.some(kw => part.includes(kw)))) {
      suspicious.push("Phishing-verdächtige Pfade");
  }
  // Check for unusual TLDs (this is a heuristic and might need a more robust list)
  const unusualTlds = ["xyz", "top", "link", "click", "vip", "work", "cf", "ga", "ml", "gq", "tk"]; // Expanded list
  const tld = host.split('.').pop();
  if (tld && unusualTlds.includes(tld)) {
      suspicious.push(`Ungewöhnliche TLD: .${tld}`); // Show actual TLD
  }

  // Check for suspicious characters or encoding in hostname/pathname (heuristic)
  if (decodeURIComponent(href) !== href) {
      suspicious.push("Unübliche URL-Kodierung");
  }
  if (host.includes('-') && host.split('-').length > 4) { // Excessive hyphens in hostname
      suspicious.push("Exzessive Bindestriche in Domain");
  }


  return suspicious;
}

// Re-introducing heuristic scoreReputation
export function scoreReputation(host, isHttps, isShort) {
  // simulate PageRank via host length & common TLDs (reverted to heuristic)
  const tld = host.split(".").slice(-1)[0];
  const trustedTLD = ["org","edu","gov","de","com","net","io","app"].includes(tld); // Expanded trusted TLDs
  
  // Base score
  let pr = 60; 

  // Adjustments
  pr += (trustedTLD ? 15 : -20); // More impact for trusted/untrusted TLDs
  pr += (isHttps ? 10 : -30); // Higher penalty for non-HTTPS
  pr += (isShort ? -25 : 0); // Higher penalty for shortlinks

  // Domain complexity and structure
  if (host.split('.').length > 3) pr -= 10; // Penalty for complex subdomains
  if (host.includes('-') && host.split('-').length > 3) pr -= 5; // Penalty for many hyphens
  if (host.length > 25) pr -= 5; // Penalty for very long hostnames

  // Presence of suspicious patterns also lowers reputation
  const tempUrlObj = new URL(`https://${host}`); // Create temp URL object for detectPatterns
  const detectedSuspicious = detectPatterns(tempUrlObj);
  if (detectedSuspicious.length > 0) {
      pr -= detectedSuspicious.length * 5; // Small penalty for each detected pattern
  }

  pr = Math.min(100, Math.max(0, pr)); // Clamp score between 0 and 100
  let label = pr >= 80 ? "Hoch" : pr >= 55 ? "Solide" : pr >= 35 ? "Niedrig" : "Sehr niedrig";
  return { value: pr, label };
}