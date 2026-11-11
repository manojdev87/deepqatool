const { chromium } = require('playwright');
const axe = require('axe-core');
const fs = require('fs');

const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.CHROME_PATH
].filter(Boolean);

async function runAxe(url) {
  const executablePath = CHROME_PATHS.find(p => fs.existsSync(p));
  const opts = { headless: true, args: ['--no-sandbox'] };
  if (executablePath) opts.executablePath = executablePath;
  const browser = await chromium.launch(opts);
  const page = await browser.newPage();
  const issues = [];

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // Inject axe-core
    await page.addScriptTag({ content: axe.source });

    const results = await page.evaluate(async () => {
      return await window.axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'best-practice'] }
      });
    });

    results.violations.forEach(violation => {
      const severity = violation.impact === 'critical' ? 'critical'
        : violation.impact === 'serious' ? 'high'
        : violation.impact === 'moderate' ? 'medium' : 'low';

      issues.push({
        type: `axe_${violation.id}`,
        severity,
        title: violation.help,
        description: violation.description,
        suggestion: violation.helpUrl,
        affectedElements: violation.nodes.length,
        wcagCriteria: violation.tags.filter(t => t.startsWith('wcag')).join(', ')
      });
    });

    return {
      issues,
      summary: {
        violations: results.violations.length,
        passes: results.passes.length,
        incomplete: results.incomplete.length,
        inapplicable: results.inapplicable.length
      }
    };
  } catch (e) {
    console.error('Axe error:', e.message);
    return { issues: [], summary: {}, error: e.message };
  } finally {
    await browser.close();
  }
}

module.exports = { runAxe };
