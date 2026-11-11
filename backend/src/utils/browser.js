const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = path.join(__dirname, '../../screenshots');

const VIEWPORTS = {
  desktop: { width: 1920, height: 1080 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 812 }
};

// Common Chrome paths on Windows
const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.CHROME_PATH
].filter(Boolean);

function findChrome() {
  const fs = require('fs');
  return CHROME_PATHS.find(p => fs.existsSync(p)) || null;
}

async function createBrowser() {
  const executablePath = findChrome();
  const opts = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  };
  if (executablePath) opts.executablePath = executablePath;
  return await chromium.launch(opts);
}

async function takeScreenshots(page, urlSlug, scanId) {
  const shots = {};
  for (const [device, viewport] of Object.entries(VIEWPORTS)) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(500);
    const filename = `${scanId}_${urlSlug}_${device}.png`;
    const filepath = path.join(SCREENSHOTS_DIR, filename);
    await page.screenshot({ path: filepath, fullPage: true });
    shots[device] = `/screenshots/${filename}`;
  }
  return shots;
}

function urlToSlug(url) {
  return url.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
}

async function getPageWithConsoleErrors(browser, url) {
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
  const page = await context.newPage();

  const consoleErrors = [];
  const networkErrors = [];
  const jsExceptions = [];

  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => jsExceptions.push(err.message));
  page.on('requestfailed', req => networkErrors.push({
    url: req.url(),
    failure: req.failure()?.errorText
  }));

  let response;
  try {
    response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  } catch (e) {
    response = null;
  }

  return { page, context, response, consoleErrors, networkErrors, jsExceptions };
}

module.exports = { createBrowser, takeScreenshots, urlToSlug, getPageWithConsoleErrors, VIEWPORTS };
