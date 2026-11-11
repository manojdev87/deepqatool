const { createBrowser, urlToSlug, takeScreenshots } = require('../utils/browser');
const { extractPageContent, compareContent } = require('../auditors/contentComparisonAuditor');
const { getDB } = require('../utils/database');
const { v4: uuidv4 } = require('uuid');

const activeCompareProgress = new Map();

function updateProgress(compareId, data) {
  activeCompareProgress.set(compareId, data);
}

function getProgress(compareId) {
  return activeCompareProgress.get(compareId) || null;
}

async function fetchPageContent(browser, url, compareId, label) {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    const html = await page.content();
    const slug = urlToSlug(url);
    const screenshots = await takeScreenshots(page, `${label}_${slug}`, compareId);
    return { html, screenshots };
  } finally {
    await context.close();
  }
}

async function runComparison({ compareId, pairs }) {
  const db = getDB();
  const allResults = [];

  try {
    db.prepare('UPDATE comparisons SET status = ? WHERE id = ?').run('running', compareId);
    updateProgress(compareId, { status: 'running', current: 0, total: pairs.length, currentPair: '' });

    for (let i = 0; i < pairs.length; i++) {
      const { uatUrl, prodUrl } = pairs[i];
      updateProgress(compareId, { status: 'running', current: i + 1, total: pairs.length, currentPair: `${uatUrl} ↔ ${prodUrl}` });

      const browser = await createBrowser();
      try {
        const [uatPage, prodPage] = await Promise.all([
          fetchPageContent(browser, uatUrl, compareId, 'uat'),
          fetchPageContent(browser, prodUrl, compareId, 'prod')
        ]);

        const uatContent = extractPageContent(uatPage.html, uatUrl);
        const prodContent = extractPageContent(prodPage.html, prodUrl);
        const result = compareContent(uatContent, prodContent, uatUrl, prodUrl);

        const pairResult = {
          uatUrl,
          prodUrl,
          diffs: result.diffs,
          summary: result.summary,
          uatScreenshots: uatPage.screenshots,
          prodScreenshots: prodPage.screenshots,
          uatContent: {
            title: uatContent.title,
            metaDesc: uatContent.metaDesc,
            wordCount: uatContent.wordCount,
            imageCount: uatContent.images.length,
            headings: uatContent.headings
          },
          prodContent: {
            title: prodContent.title,
            metaDesc: prodContent.metaDesc,
            wordCount: prodContent.wordCount,
            imageCount: prodContent.images.length,
            headings: prodContent.headings
          }
        };

        db.prepare(`
          INSERT INTO comparison_results (compare_id, uat_url, prod_url, diffs, summary, uat_screenshots, prod_screenshots, uat_content, prod_content)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          compareId, uatUrl, prodUrl,
          JSON.stringify(result.diffs),
          JSON.stringify(result.summary),
          JSON.stringify(uatPage.screenshots),
          JSON.stringify(prodPage.screenshots),
          JSON.stringify(pairResult.uatContent),
          JSON.stringify(pairResult.prodContent)
        );

        allResults.push(pairResult);
      } finally {
        await browser.close();
      }
    }

    // Aggregate summary across all pairs
    const totalSummary = {
      totalPairs: pairs.length,
      totalDiffs: allResults.reduce((s, r) => s + r.summary.totalDiffs, 0),
      totalAltTagDiffs: allResults.reduce((s, r) => s + r.summary.altTagDiffs, 0),
      totalContentDiffs: allResults.reduce((s, r) => s + r.summary.contentDiffs, 0),
      critical: allResults.reduce((s, r) => s + r.summary.critical, 0),
      high: allResults.reduce((s, r) => s + r.summary.high, 0),
      medium: allResults.reduce((s, r) => s + r.summary.medium, 0),
      low: allResults.reduce((s, r) => s + r.summary.low, 0)
    };

    db.prepare('UPDATE comparisons SET status = ?, completed_at = CURRENT_TIMESTAMP, summary = ? WHERE id = ?')
      .run('completed', JSON.stringify(totalSummary), compareId);

    updateProgress(compareId, { status: 'completed', current: pairs.length, total: pairs.length, summary: totalSummary });

    return { compareId, summary: totalSummary, results: allResults };

  } catch (e) {
    db.prepare('UPDATE comparisons SET status = ? WHERE id = ?').run('failed', compareId);
    updateProgress(compareId, { status: 'failed', error: e.message });
    throw e;
  }
}

async function startComparison({ pairs }) {
  const db = getDB();
  const compareId = uuidv4();

  db.prepare('INSERT INTO comparisons (id, pairs, status) VALUES (?, ?, ?)').run(
    compareId, JSON.stringify(pairs), 'pending'
  );

  runComparison({ compareId, pairs }).catch(e => console.error('Comparison error:', e));

  return { compareId, pairCount: pairs.length };
}

module.exports = { startComparison, getProgress };
