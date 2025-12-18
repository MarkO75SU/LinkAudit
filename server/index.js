const express = require('express');
const axios = require('axios');
const cors = require('cors');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio'); // Import cheerio

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Function to fetch content using Puppeteer and return extracted text
async function fetchContentWithPuppeteer(url) {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    page.setDefaultNavigationTimeout(30000); 

    // Wait until the DOM is loaded, then wait a bit longer for JS to execute
    await page.goto(url, { waitUntil: 'domcontentloaded' }); 
    await page.waitForTimeout(5000); // Wait 5 seconds to ensure JS has rendered content
    
    // Get the fully rendered text content of the body
    const textContent = await page.evaluate(() => document.body.innerText);
    return textContent;
  } catch (error) {
    console.error(`Puppeteer failed to fetch content from ${url}:`, error.message);
    throw new Error(`Failed to fetch content with Puppeteer: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Basic root endpoint
app.get('/', (req, res) => {
  res.send('LinkAudit Backend Proxy is running!');
});

// New endpoint to fetch page content
app.post('/api/fetch-content', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required.' });
  }

  try {
    new URL(url); // Validate URL format
  } catch (e) {
    return res.status(400).json({ error: 'Invalid URL provided.' });
  }

  let extractedText = ''; 
  let fetchedWithPuppeteer = false;

  try {
    // 1. Try fetching with axios first (faster for static sites)
    const axiosResponse = await axios.get(url, {
      headers: {
        'User-Agent': 'LinkAudit-Bot/1.0 (+https://yourdomain.com/botinfo)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      },
      timeout: 10000,
      maxContentLength: 10 * 1024 * 1024
    });
    const preliminaryHtml = axiosResponse.data;
    
    // Use cheerio to extract text from the axios-fetched HTML
    const $ = cheerio.load(preliminaryHtml);
    const textFromAxios = $('body').text();

    // Check if axios content seems to indicate a JS-rendered page or is too short after extraction
    if (textFromAxios.length < 500 && (textFromAxios.toLowerCase().includes('javascript') || textFromAxios.toLowerCase().includes('please enable js') || textFromAxios.toLowerCase().includes('loading...'))) {
      console.log(`URL ${url} appears to be JS-rendered (axios content too short or hints JS). Falling back to Puppeteer.`);
      fetchedWithPuppeteer = true;
      extractedText = await fetchContentWithPuppeteer(url); // Puppeteer directly extracts text
    } else {
      extractedText = textFromAxios; // Use text extracted by cheerio from axios HTML
    }

  } catch (axiosError) {
    // If axios fails (e.g., timeout, network error, 404/500), try with Puppeteer as a fallback
    console.warn(`Axios failed to fetch ${url} (${axiosError.message}). Attempting with Puppeteer.`);
    fetchedWithPuppeteer = true;
    try {
      extractedText = await fetchContentWithPuppeteer(url); // Puppeteer directly extracts text
    } catch (puppeteerError) {
      console.error(`Both Axios and Puppeteer failed for ${url}:`, puppeteerError.message);
      return res.status(500).json({ error: `Failed to fetch content from target URL: ${puppeteerError.message}` });
    }
  }

  // Clean up multiple spaces, newlines, and trim for consistency
  extractedText = extractedText.replace(/\s+/g, ' ').trim();

  res.status(200).send(extractedText); // Always send clean extracted text
});

// Start the server
app.listen(port, () => {
  console.log(`LinkAudit Backend Proxy listening at http://localhost:${port}`);
});
