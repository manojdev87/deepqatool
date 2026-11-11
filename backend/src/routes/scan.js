const express = require('express');
const router = express.Router();
const { startScan, getProgress } = require('../utils/scanOrchestrator');
const { crawlInternalLinks } = require('../auditors/linkAuditor');
const { getDB } = require('../utils/database');

router.post('/start', async (req, res) => {
  try {
    const { urls, scanMode = 'quick', isSitemap = false } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'urls array is required' });
    }

    const validUrls = urls.filter(u => {
      try { new URL(u); return true; } catch { return false; }
    });

    if (validUrls.length === 0) {
      return res.status(400).json({ error: 'No valid URLs provided' });
    }

    const result = await startScan({ urls: validUrls, scanMode, isSitemap });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/progress/:scanId', (req, res) => {
  const progress = getProgress(req.params.scanId);
  if (!progress) {
    const db = getDB();
    const scan = db.prepare('SELECT status, summary FROM scans WHERE id = ?').get(req.params.scanId);
    if (scan) return res.json({ status: scan.status, summary: scan.summary ? JSON.parse(scan.summary) : null });
    return res.status(404).json({ error: 'Scan not found' });
  }
  res.json(progress);
});

router.get('/results/:scanId', (req, res) => {
  const db = getDB();
  const scan = db.prepare('SELECT * FROM scans WHERE id = ?').get(req.params.scanId);
  if (!scan) return res.status(404).json({ error: 'Scan not found' });

  const results = db.prepare('SELECT * FROM scan_results WHERE scan_id = ?').all(req.params.scanId);
  const issues = db.prepare('SELECT * FROM issues WHERE scan_id = ?').all(req.params.scanId);

  res.json({
    scan: { ...scan, urls: JSON.parse(scan.urls), summary: scan.summary ? JSON.parse(scan.summary) : null },
    results: results.map(r => ({
      ...r,
      issues: JSON.parse(r.issues || '[]'),
      lighthouseScores: JSON.parse(r.lighthouse_scores || 'null'),
      screenshots: JSON.parse(r.screenshots || '{}')
    })),
    issues
  });
});

router.post('/crawl', async (req, res) => {
  try {
    const { url, maxPages = 20 } = req.body;
    if (!url) return res.status(400).json({ error: 'url is required' });
    const links = await crawlInternalLinks(url, maxPages);
    res.json({ links, count: links.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
