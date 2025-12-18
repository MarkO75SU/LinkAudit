# LinkAudit – Transparenz für digitale Links

## Projektbeschreibung
LinkAudit ist ein Mockup für eine Webanwendung zur Analyse und Bewertung von Weblinks hinsichtlich ihrer Vertrauenswürdigkeit. Die Anwendung bietet eine heuristische Einschätzung von Emotion, Framing, Bias, Reputation und Tracking-Parametern eines Links. Sie kann sowohl statische als auch JavaScript-gerenderte Webseiten analysieren, um ein umfassendes Bild des Inhalts zu erhalten.

## Features

### Kernanalyse
*   **Heuristische Link-Bewertung**: Analysiert Links anhand verschiedener Dimensionen (Herkunft, Emotion, Framing, Bias, Reputation, Tracking).
*   **Impact-Radar**: Visuelle Darstellung der Bewertungsdimensionen.
*   **Detaillierte Erklärungen**: Bietet detaillierte Hinweise zu den einzelnen Bewertungskriterien.

### Inhaltsbasierte Bewertung (Full Mode)
*   **Backend-Proxy für Content Fetching**: Eine Node.js-Backend-Anwendung fungiert als Proxy, um Inhalte von externen URLs abzurufen und CORS-Beschränkungen zu umgehen.
*   **Unterstützung für JavaScript-gerenderte Seiten**: Nutzt Puppeteer im Backend, um dynamische Inhalte von modernen Webseiten zu laden und zu extrahieren.
*   **Textextraktion**: Extrahiert reinen, lesbaren Text aus HTML-Inhalten (mittels Cheerio im Backend) für eine tiefergehende Inhaltsanalyse.
*   **Verbesserte Inhaltsheuristiken**: `Emotion`, `Framing` und `Bias` werden nun anhand der Keyword-Dichte im gesamten Seiteninhalt (im "Full"-Modus) bewertet, nicht nur anhand des Titels.

### Verlaufsverwaltung
*   **Vollständige Analysehistorie**: Speichert alle durchgeführten Analysen im Browser (LocalStorage), ohne Duplikate.
*   **CRUD-Operationen für Einträge**: Ermöglicht das Ansehen, erneute Analysieren und Löschen einzelner sowie aller Historie-Einträge.

### Exportoptionen
*   **JSON-Export**: Export der Analyseergebnisse im JSON-Format.
*   **PDF-Bericht**: Generierung eines PDF-Berichts der Analyse.

### Technischer Stack
*   **Frontend**: HTML, CSS, JavaScript (ES Modules), Chart.js (für den Radar-Chart), jsPDF (für PDF-Export).
*   **Backend (Proxy)**: Node.js (Express.js), Axios (für HTTP-Anfragen), Puppeteer (für Headless-Browser-Rendering), Cheerio (für serverseitiges HTML-Parsing).

---

## Setup und Ausführung

### 1. Projekt klonen
```bash
git clone https://github.com/MarkO75SU/LinkAudit.git
cd LinkAudit
```

### 2. Backend einrichten und starten
Das Backend dient als Proxy für externe Webseiten-Anfragen, um CORS-Beschränkungen und JavaScript-Rendering zu handhaben.

```bash
cd server
npm install
node index.js
```
Lassen Sie dieses Terminal-Fenster geöffnet und den Server laufen.

### 3. Frontend starten
Das Frontend kann einfach über einen lokalen Webserver (z.B. Live Server in VS Code) oder direkt durch Öffnen der `index.html` im Browser aufgerufen werden.

Navigieren Sie zu:
`http://127.0.0.1:5500/index.html` (oder die entsprechende URL Ihres lokalen Servers)

---

## Weitere Informationen
*   **[Detaillierte Feature-Liste](features.md)**: Eine vollständige Aufstellung aller implementierten Funktionen.
*   **[Backlog](backlog.md)**: Aktueller Stand der zukünftigen Entwicklungsaufgaben.
