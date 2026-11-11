const express = require('express');
const router = express.Router();
const { getDB } = require('../utils/database');

router.get('/', (req, res) => {
  const db = getDB();
  const scans = db.prepare(`
    SELECT id, urls, scan_mode, status, created_at, completed_at, summary
    FROM scans ORDER BY created_at DESC LIMIT 50
  `).all();

  res.json(scans.map(s => ({
    ...s,
    urls: JSON.parse(s.urls),
    summary: s.summary ? JSON.parse(s.summary) : null
  })));
});

router.get('/trends', (req, res) => {
  const db = getDB();
  const scans = db.prepare(`
    SELECT id, created_at, summary FROM scans
    WHERE status = 'completed' ORDER BY created_at DESC LIMIT 10
  `).all();

  const trends = scans.map(s => ({
    date: s.created_at,
    scanId: s.id,
    ...( s.summary ? JSON.parse(s.summary) : {})
  }));

  res.json(trends);
});

router.delete('/:scanId', (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM issues WHERE scan_id = ?').run(req.params.scanId);
  db.prepare('DELETE FROM scan_results WHERE scan_id = ?').run(req.params.scanId);
  db.prepare('DELETE FROM scans WHERE id = ?').run(req.params.scanId);
  res.json({ success: true });
});

module.exports = router;
