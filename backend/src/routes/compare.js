const express = require('express');
const router = express.Router();
const { startComparison, getProgress } = require('../utils/compareOrchestrator');
const { getDB } = require('../utils/database');

// POST /api/compare/start
router.post('/start', async (req, res) => {
  try {
    const { pairs } = req.body;
    if (!pairs || !Array.isArray(pairs) || pairs.length === 0)
      return res.status(400).json({ error: 'pairs array is required: [{uatUrl, prodUrl}]' });

    for (const p of pairs) {
      if (!p.uatUrl || !p.prodUrl)
        return res.status(400).json({ error: 'Each pair needs uatUrl and prodUrl' });
      try { new URL(p.uatUrl); new URL(p.prodUrl); } catch {
        return res.status(400).json({ error: `Invalid URL: ${p.uatUrl} / ${p.prodUrl}` });
      }
    }

    const result = await startComparison({ pairs });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/compare/history  ← MUST be before /:compareId wildcard
router.get('/history', (req, res) => {
  const db = getDB();
  const rows = db.prepare('SELECT * FROM comparisons ORDER BY created_at DESC LIMIT 50').all();
  res.json(rows.map(r => ({
    ...r,
    pairs: JSON.parse(r.pairs),
    summary: r.summary ? JSON.parse(r.summary) : null
  })));
});

// GET /api/compare/progress/:compareId
router.get('/progress/:compareId', (req, res) => {
  const progress = getProgress(req.params.compareId);
  if (!progress) {
    const db = getDB();
    const row = db.prepare('SELECT status, summary FROM comparisons WHERE id = ?').get(req.params.compareId);
    if (row) return res.json({ status: row.status, summary: row.summary ? JSON.parse(row.summary) : null });
    return res.status(404).json({ error: 'Comparison not found' });
  }
  res.json(progress);
});

// GET /api/compare/results/:compareId
router.get('/results/:compareId', (req, res) => {
  const db = getDB();
  const comparison = db.prepare('SELECT * FROM comparisons WHERE id = ?').get(req.params.compareId);
  if (!comparison) return res.status(404).json({ error: 'Comparison not found' });

  const results = db.prepare('SELECT * FROM comparison_results WHERE compare_id = ?').all(req.params.compareId);
  res.json({
    comparison: {
      ...comparison,
      pairs: JSON.parse(comparison.pairs),
      summary: comparison.summary ? JSON.parse(comparison.summary) : null
    },
    results: results.map(r => ({
      ...r,
      diffs: JSON.parse(r.diffs || '[]'),
      summary: JSON.parse(r.summary || '{}'),
      uatScreenshots: JSON.parse(r.uat_screenshots || '{}'),
      prodScreenshots: JSON.parse(r.prod_screenshots || '{}'),
      uatContent: JSON.parse(r.uat_content || '{}'),
      prodContent: JSON.parse(r.prod_content || '{}')
    }))
  });
});

// DELETE /api/compare/:compareId  ← wildcard last
router.delete('/:compareId', (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM comparison_results WHERE compare_id = ?').run(req.params.compareId);
  db.prepare('DELETE FROM comparisons WHERE id = ?').run(req.params.compareId);
  res.json({ success: true });
});

module.exports = router;
