const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDB } = require('./utils/database');

const scanRoutes = require('./routes/scan');
const reportRoutes = require('./routes/reports');
const historyRoutes = require('./routes/history');
const compareRoutes = require('./routes/compare');

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure directories exist
['../reports', '../screenshots', '../lighthouse', '../database'].forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
});

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'] }));
app.use(express.json({ limit: '50mb' }));
app.use('/screenshots', express.static(path.join(__dirname, '../screenshots')));
app.use('/reports', express.static(path.join(__dirname, '../reports')));

app.use('/api/scan', scanRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/compare', compareRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

initDB();

app.listen(PORT, () => console.log(`QA Auditor backend running on http://localhost:${PORT}`));

module.exports = app;
