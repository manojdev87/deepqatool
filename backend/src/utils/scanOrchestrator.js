const { createBrowser, takeScreenshots, urlToSlug, getPageWithConsoleErrors } = require('../utils/browser');
const { checkLinks, crawlSitemap, crawlInternalLinks } = require('../auditors/linkAuditor');
const { auditSEO, auditSchema, auditContent } = require('../auditors/seoAuditor');
const { auditForms } = require('../auditors/formAuditor');
const { auditUI } = require('../auditors/uiAuditor');
const { runLighthouse } = require('../auditors/lighthouseAuditor');
const { runAxe } = require('../auditors/accessibilityAuditor');
const { compareWithBaseline, captureBaseline } = require('../auditors/visualRegression');
const { getDB } = require('../utils/database');
const { v4: uuidv4 } = require('uuid');

const activeScanProgress = new Map();

function updateProgress(scanId, progress) {
  activeScanProgress.set(scanId, progress);
}

function getProgress(scanId) {
  return activeScanProgress.get(scanId) || null;
}

async function runScan({ urls, scanMode, scanId }) {
  const db = getDB();
  const allIssues = [];
  const pageResults = [];

  try {
    db.prepare('UPDATE scans SET status = ? WHERE id = ?').run('running', scanId);
    updateProgress(scanId, { status: 'running', current: 0, total: urls.length, currentUrl: '' });

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      updateProgress(scanId, { status: 'running', current: i + 1, total: urls.length, currentUrl: url });

      const pageResult = { url, issues: [], screenshots: {}, lighthouseScores: null, accessibilitySummary: null };

      const browser = await createBrowser();
      try {
        const { page, context, response, consoleErrors, networkErrors, jsExceptions } = await getPageWithConsoleErrors(browser, url);
        const urlSlug = urlToSlug(url);

        // Get HTML for static analysis
        const html = await page.content();

        // SEO Audit
        const seoResult = auditSEO(html, url);
        const schemaResult = auditSchema(html);
        const contentResult = auditContent(html);

        pageResult.issues.push(
          ...seoResult.issues.map(i => ({ ...i, category: 'seo' })),
          ...schemaResult.issues.map(i => ({ ...i, category: 'schema' })),
          ...contentResult.issues.map(i => ({ ...i, category: 'content' }))
        );
        pageResult.seoData = seoResult.data;
        pageResult.schemas = schemaResult.schemas;
        pageResult.wordCount = contentResult.wordCount;

        // JS Errors
        if (consoleErrors.length > 0) {
          pageResult.issues.push({
            category: 'javascript',
            type: 'console_errors',
            severity: 'medium',
            title: `${consoleErrors.length} Console Errors`,
            description: consoleErrors.slice(0, 5).join('\n'),
            suggestion: 'Fix JavaScript console errors'
          });
        }
        if (jsExceptions.length > 0) {
          pageResult.issues.push({
            category: 'javascript',
            type: 'js_exceptions',
            severity: 'high',
            title: `${jsExceptions.length} JavaScript Exceptions`,
            description: jsExceptions.slice(0, 3).join('\n'),
            suggestion: 'Fix JavaScript runtime exceptions'
          });
        }
        if (networkErrors.length > 0) {
          pageResult.issues.push({
            category: 'javascript',
            type: 'network_errors',
            severity: 'medium',
            title: `${networkErrors.length} Failed Network Requests`,
            description: networkErrors.slice(0, 3).map(e => e.url).join('\n'),
            suggestion: 'Fix failed network requests'
          });
        }

        // Screenshots (always)
        const screenshots = await takeScreenshots(page, urlSlug, scanId);
        pageResult.screenshots = screenshots;

        if (scanMode === 'full') {
          // Link Audit
          const linkIssues = await checkLinks(page, url);
          pageResult.issues.push(...linkIssues.map(i => ({ ...i, category: 'links' })));

          // Form Audit
          const formResult = await auditForms(page, scanId, urlSlug);
          pageResult.issues.push(...formResult.issues.map(i => ({ ...i, category: 'forms' })));
          pageResult.formResults = formResult.formResults;

          // UI Audit
          const uiResult = await auditUI(page, screenshots);
          pageResult.issues.push(...uiResult.issues.map(i => ({ ...i, category: 'ui' })));

          // Visual Regression
          const vrResult = await compareWithBaseline(url, scanId);
          pageResult.visualRegression = vrResult;
          if (!vrResult.hasBaseline) await captureBaseline(url);

          // Accessibility (Axe)
          await context.close();
          await browser.close();
          const axeResult = await runAxe(url);
          pageResult.issues.push(...axeResult.issues.map(i => ({ ...i, category: 'accessibility' })));
          pageResult.accessibilitySummary = axeResult.summary;

          // Lighthouse
          const lhResult = await runLighthouse(url, `${scanId}_${i}`);
          pageResult.lighthouseScores = lhResult.scores;
          pageResult.lighthouseIssues = lhResult.auditIssues;
          pageResult.issues.push(...(lhResult.auditIssues || []).map(a => ({
            category: 'performance',
            type: `lighthouse_${a.id}`,
            severity: a.score < 0.3 ? 'high' : 'medium',
            title: a.title,
            description: a.description,
            suggestion: `Score: ${Math.round(a.score * 100)}% - ${a.displayValue || ''}`
          })));
        } else {
          // Quick scan: just Lighthouse
          await context.close();
          await browser.close();
          const lhResult = await runLighthouse(url, `${scanId}_${i}`);
          pageResult.lighthouseScores = lhResult.scores;
        }

        // Save issues to DB
        const issueStmt = db.prepare(`
          INSERT INTO issues (scan_id, url, category, severity, title, description, suggestion, screenshot)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        pageResult.issues.forEach(issue => {
          issueStmt.run(scanId, url, issue.category || 'general', issue.severity, issue.title, issue.description || '', issue.suggestion || '', issue.screenshot || null);
        });

        // Save page result
        db.prepare(`
          INSERT INTO scan_results (scan_id, url, issues, lighthouse_scores, accessibility_score, screenshots)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          scanId, url,
          JSON.stringify(pageResult.issues),
          JSON.stringify(pageResult.lighthouseScores),
          pageResult.accessibilitySummary?.violations || 0,
          JSON.stringify(pageResult.screenshots)
        );

        allIssues.push(...pageResult.issues);
        pageResults.push(pageResult);

      } catch (e) {
        console.error(`Error scanning ${url}:`, e.message);
        await browser.close().catch(() => {});
        pageResult.error = e.message;
        pageResults.push(pageResult);
      }
    }

    // Build summary
    const summary = {
      totalPages: urls.length,
      critical: allIssues.filter(i => i.severity === 'critical').length,
      high: allIssues.filter(i => i.severity === 'high').length,
      medium: allIssues.filter(i => i.severity === 'medium').length,
      low: allIssues.filter(i => i.severity === 'low').length,
      totalIssues: allIssues.length
    };

    db.prepare('UPDATE scans SET status = ?, completed_at = CURRENT_TIMESTAMP, summary = ? WHERE id = ?')
      .run('completed', JSON.stringify(summary), scanId);

    updateProgress(scanId, { status: 'completed', current: urls.length, total: urls.length, summary });

    return { scanId, summary, pageResults };

  } catch (e) {
    db.prepare('UPDATE scans SET status = ? WHERE id = ?').run('failed', scanId);
    updateProgress(scanId, { status: 'failed', error: e.message });
    throw e;
  }
}

async function startScan({ urls, scanMode, isSitemap }) {
  const db = getDB();
  const scanId = uuidv4();

  let resolvedUrls = [...urls];

  if (isSitemap && urls.length === 1) {
    resolvedUrls = await crawlSitemap(urls[0]);
    if (resolvedUrls.length === 0) resolvedUrls = urls;
  }

  db.prepare('INSERT INTO scans (id, urls, scan_mode, status) VALUES (?, ?, ?, ?)').run(
    scanId, JSON.stringify(resolvedUrls), scanMode, 'pending'
  );

  // Run async
  runScan({ urls: resolvedUrls, scanMode, scanId }).catch(e => console.error('Scan error:', e));

  return { scanId, urlCount: resolvedUrls.length };
}

module.exports = { startScan, getProgress };
