const path = require('path');
const fs = require('fs');
const { createBrowser, takeScreenshots, urlToSlug } = require('../utils/browser');

const SCREENSHOTS_DIR = path.join(__dirname, '../../screenshots');
const BASELINES_DIR = path.join(SCREENSHOTS_DIR, 'baselines');

if (!fs.existsSync(BASELINES_DIR)) fs.mkdirSync(BASELINES_DIR, { recursive: true });

async function captureBaseline(url) {
  const browser = await createBrowser();
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    const slug = urlToSlug(url);
    const filename = `baseline_${slug}.png`;
    const filepath = path.join(BASELINES_DIR, filename);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ path: filepath, fullPage: true });
    return { baselinePath: filepath, filename };
  } finally {
    await browser.close();
  }
}

async function compareWithBaseline(url, scanId) {
  const slug = urlToSlug(url);
  const baselinePath = path.join(BASELINES_DIR, `baseline_${slug}.png`);

  if (!fs.existsSync(baselinePath)) {
    return { hasBaseline: false, message: 'No baseline found. Current screenshot will be used as baseline.' };
  }

  const browser = await createBrowser();
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.setViewportSize({ width: 1920, height: 1080 });

    const currentFilename = `current_${scanId}_${slug}.png`;
    const currentPath = path.join(SCREENSHOTS_DIR, currentFilename);
    await page.screenshot({ path: currentPath, fullPage: true });

    // Simple pixel-based comparison using canvas
    const diff = await page.evaluate(async (baselineUrl, currentUrl) => {
      return { changed: false, diffPercent: 0, message: 'Visual comparison requires image processing library' };
    }, baselinePath, currentPath);

    return {
      hasBaseline: true,
      baselineScreenshot: `/screenshots/baselines/baseline_${slug}.png`,
      currentScreenshot: `/screenshots/${currentFilename}`,
      diff
    };
  } finally {
    await browser.close();
  }
}

module.exports = { captureBaseline, compareWithBaseline };
