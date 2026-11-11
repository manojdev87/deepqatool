const path = require('path');
const fs = require('fs');

const LIGHTHOUSE_DIR = path.join(__dirname, '../../lighthouse');

const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.CHROME_PATH
].filter(Boolean);

async function runLighthouse(url, scanId) {
  let chrome;
  try {
    const [{ default: lighthouse }, { launch }] = await Promise.all([
      import('lighthouse'),
      import('chrome-launcher')
    ]);
    const chromePath = CHROME_PATHS.find(p => fs.existsSync(p));
    chrome = await launch({
      chromePath,
      chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
    });

    const options = {
      logLevel: 'error',
      output: 'json',
      port: chrome.port,
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      settings: {
        throttlingMethod: 'simulate',
        formFactor: 'desktop',
        screenEmulation: { disabled: true }
      }
    };

    const runnerResult = await lighthouse(url, options);
    const report = runnerResult.lhr;

    const scores = {
      performance: Math.round((report.categories.performance?.score || 0) * 100),
      accessibility: Math.round((report.categories.accessibility?.score || 0) * 100),
      bestPractices: Math.round((report.categories['best-practices']?.score || 0) * 100),
      seo: Math.round((report.categories.seo?.score || 0) * 100)
    };

    const reportPath = path.join(LIGHTHOUSE_DIR, `${scanId}_lighthouse.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Extract key audit failures
    const auditIssues = [];
    Object.values(report.audits).forEach(audit => {
      if (audit.score !== null && audit.score < 0.5 && audit.details) {
        auditIssues.push({
          id: audit.id,
          title: audit.title,
          description: audit.description,
          score: audit.score,
          displayValue: audit.displayValue
        });
      }
    });

    return { scores, auditIssues, reportPath: `/lighthouse/${scanId}_lighthouse.json` };
  } catch (e) {
    console.error('Lighthouse error:', e.message);
    return { scores: { performance: 0, accessibility: 0, bestPractices: 0, seo: 0 }, auditIssues: [], error: e.message };
  } finally {
    if (chrome) await chrome.kill();
  }
}

module.exports = { runLighthouse };
