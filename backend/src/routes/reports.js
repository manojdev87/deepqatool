const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { getDB } = require('../utils/database');
const { generateHTMLReport } = require('../reports/htmlReport');
const { generatePDFReport } = require('../reports/pdfReport');
const { generateComparisonHTMLReport } = require('../reports/comparisonHtmlReport');
const { generateComparisonPDFReport } = require('../reports/comparisonPdfReport');

const REPORTS_DIR = path.join(__dirname, '../../reports');

function getScanData(scanId) {
  const db = getDB();
  const scan = db.prepare('SELECT * FROM scans WHERE id = ?').get(scanId);
  if (!scan) return null;
  const results = db.prepare('SELECT * FROM scan_results WHERE scan_id = ?').all(scanId);
  const issues = db.prepare('SELECT * FROM issues WHERE scan_id = ?').all(scanId);
  return {
    scan: { ...scan, urls: JSON.parse(scan.urls), summary: scan.summary ? JSON.parse(scan.summary) : null },
    results,
    issues
  };
}

router.get('/html/:scanId', (req, res) => {
  const data = getScanData(req.params.scanId);
  if (!data) return res.status(404).json({ error: 'Scan not found' });

  const html = generateHTMLReport(data.scan, data.results, data.issues);
  const filename = `report_${req.params.scanId}.html`;
  const filepath = path.join(REPORTS_DIR, filename);
  fs.writeFileSync(filepath, html);

  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(html);
});

router.get('/pdf/:scanId', async (req, res) => {
  const data = getScanData(req.params.scanId);
  if (!data) return res.status(404).json({ error: 'Scan not found' });

  const filename = `report_${req.params.scanId}.pdf`;
  const filepath = path.join(REPORTS_DIR, filename);

  try {
    await generatePDFReport(data.scan, data.results, data.issues, filepath);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    fs.createReadStream(filepath).pipe(res);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/json/:scanId', (req, res) => {
  const data = getScanData(req.params.scanId);
  if (!data) return res.status(404).json({ error: 'Scan not found' });

  res.setHeader('Content-Disposition', `attachment; filename="report_${req.params.scanId}.json"`);
  res.json(data);
});

router.get('/csv/:scanId', (req, res) => {
  const data = getScanData(req.params.scanId);
  if (!data) return res.status(404).json({ error: 'Scan not found' });

  const headers = ['ID', 'URL', 'Category', 'Severity', 'Title', 'Description', 'Suggestion'];
  const rows = data.issues.map(i => [
    i.id, `"${i.url}"`, i.category, i.severity,
    `"${(i.title || '').replace(/"/g, '""')}"`,
    `"${(i.description || '').replace(/"/g, '""')}"`,
    `"${(i.suggestion || '').replace(/"/g, '""')}"`
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="report_${req.params.scanId}.csv"`);
  res.send(csv);
});

// ── COMPARISON REPORTS ──────────────────────────────────────────────

function getComparisonData(compareId) {
  const db = getDB();
  const comparison = db.prepare('SELECT * FROM comparisons WHERE id = ?').get(compareId);
  if (!comparison) return null;
  const results = db.prepare('SELECT * FROM comparison_results WHERE compare_id = ?').all(compareId);
  return {
    comparison: { ...comparison, pairs: JSON.parse(comparison.pairs), summary: comparison.summary ? JSON.parse(comparison.summary) : null },
    results
  };
}

router.get('/compare/html/:compareId', (req, res) => {
  const data = getComparisonData(req.params.compareId);
  if (!data) return res.status(404).json({ error: 'Comparison not found' });

  const parsedResults = data.results.map(r => ({
    ...r,
    diffs: JSON.parse(r.diffs || '[]'),
    summary: JSON.parse(r.summary || '{}'),
    uatScreenshots: JSON.parse(r.uat_screenshots || '{}'),
    prodScreenshots: JSON.parse(r.prod_screenshots || '{}'),
    uatContent: JSON.parse(r.uat_content || '{}'),
    prodContent: JSON.parse(r.prod_content || '{}')
  }));

  const html = generateComparisonHTMLReport(data.comparison, parsedResults);
  const filename = `comparison_${req.params.compareId}.html`;
  fs.writeFileSync(path.join(REPORTS_DIR, filename), html);
  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(html);
});

router.get('/compare/pdf/:compareId', async (req, res) => {
  const data = getComparisonData(req.params.compareId);
  if (!data) return res.status(404).json({ error: 'Comparison not found' });

  const filename = `comparison_${req.params.compareId}.pdf`;
  const filepath = path.join(REPORTS_DIR, filename);
  try {
    await generateComparisonPDFReport(data.comparison, data.results, filepath);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    fs.createReadStream(filepath).pipe(res);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/compare/csv/:compareId', (req, res) => {
  const data = getComparisonData(req.params.compareId);
  if (!data) return res.status(404).json({ error: 'Comparison not found' });

  const headers = ['Pair', 'UAT URL', 'Prod URL', 'Category', 'Type', 'Severity', 'Title', 'UAT Value', 'Prod Value', 'Description'];
  const rows = [];
  data.results.forEach((r, idx) => {
    const diffs = JSON.parse(r.diffs || '[]');
    diffs.forEach(d => {
      rows.push([
        idx + 1, `"${r.uat_url}"`, `"${r.prod_url}"`,
        d.category, d.type, d.severity,
        `"${(d.title || '').replace(/"/g, '""')}"`,
        `"${(d.uatValue || '').replace(/"/g, '""')}"`,
        `"${(d.prodValue || '').replace(/"/g, '""')}"`,
        `"${(d.description || '').replace(/"/g, '""')}"`
      ]);
    });
  });

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="comparison_${req.params.compareId}.csv"`);
  res.send(csv);
});

router.get('/compare/json/:compareId', (req, res) => {
  const data = getComparisonData(req.params.compareId);
  if (!data) return res.status(404).json({ error: 'Comparison not found' });
  res.setHeader('Content-Disposition', `attachment; filename="comparison_${req.params.compareId}.json"`);
  res.json(data);
});

module.exports = router;
