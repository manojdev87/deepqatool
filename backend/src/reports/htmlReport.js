const fs = require('fs');
const path = require('path');

const SEVERITY_COLORS = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#d97706',
  low: '#65a30d'
};

function generateHTMLReport(scan, results, issues) {
  const summary = scan.summary || {};
  const issuesByCategory = {};
  issues.forEach(issue => {
    if (!issuesByCategory[issue.category]) issuesByCategory[issue.category] = [];
    issuesByCategory[issue.category].push(issue);
  });

  const issueRows = issues.map(issue => `
    <tr>
      <td><span class="badge" style="background:${SEVERITY_COLORS[issue.severity] || '#6b7280'}">${issue.severity}</span></td>
      <td>${issue.category}</td>
      <td>${escapeHtml(issue.title)}</td>
      <td>${escapeHtml(issue.description || '')}</td>
      <td>${escapeHtml(issue.suggestion || '')}</td>
      <td><a href="${issue.url}" target="_blank">${truncate(issue.url, 40)}</a></td>
    </tr>
  `).join('');

  const screenshotCards = results.flatMap(r => {
    const shots = r.screenshots ? JSON.parse(r.screenshots) : {};
    return Object.entries(shots).map(([device, src]) => `
      <div class="screenshot-card">
        <h4>${truncate(r.url, 40)} - ${device}</h4>
        <img src="http://localhost:3001${src}" alt="${device} screenshot" loading="lazy"/>
      </div>
    `);
  }).join('');

  const lighthouseCards = results.filter(r => r.lighthouse_scores).map(r => {
    const scores = JSON.parse(r.lighthouse_scores);
    return `
      <div class="lh-card">
        <h4>${truncate(r.url, 50)}</h4>
        <div class="scores">
          ${Object.entries(scores).map(([k, v]) => `
            <div class="score-circle" style="--score-color:${v >= 90 ? '#22c55e' : v >= 50 ? '#f59e0b' : '#ef4444'}">
              <span>${v}</span>
              <label>${k}</label>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>QA Audit Report - ${new Date().toLocaleDateString()}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; color: #1e293b; }
  .header { background: linear-gradient(135deg, #1e40af, #7c3aed); color: white; padding: 40px; }
  .header h1 { font-size: 2rem; margin-bottom: 8px; }
  .header p { opacity: 0.8; }
  .container { max-width: 1400px; margin: 0 auto; padding: 32px; }
  .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin: 24px 0; }
  .summary-card { background: white; border-radius: 12px; padding: 20px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .summary-card .number { font-size: 2.5rem; font-weight: 700; }
  .summary-card .label { color: #64748b; font-size: 0.875rem; margin-top: 4px; }
  .critical .number { color: #dc2626; }
  .high .number { color: #ea580c; }
  .medium .number { color: #d97706; }
  .low .number { color: #65a30d; }
  .section { background: white; border-radius: 12px; padding: 24px; margin: 24px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .section h2 { font-size: 1.25rem; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #e2e8f0; }
  table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-weight: 600; }
  td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  tr:hover td { background: #f8fafc; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; color: white; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
  .screenshots-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
  .screenshot-card { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
  .screenshot-card h4 { padding: 8px 12px; background: #f1f5f9; font-size: 0.8rem; }
  .screenshot-card img { width: 100%; height: 200px; object-fit: cover; }
  .scores { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 12px; }
  .score-circle { text-align: center; }
  .score-circle span { display: block; font-size: 1.5rem; font-weight: 700; color: var(--score-color); }
  .score-circle label { font-size: 0.75rem; color: #64748b; text-transform: capitalize; }
  .lh-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
  .lh-card h4 { font-size: 0.875rem; color: #475569; margin-bottom: 8px; }
  .footer { text-align: center; padding: 32px; color: #94a3b8; font-size: 0.875rem; }
  a { color: #3b82f6; text-decoration: none; }
  a:hover { text-decoration: underline; }
</style>
</head>
<body>
<div class="header">
  <h1>🔍 Website QA Audit Report</h1>
  <p>Generated: ${new Date().toLocaleString()} | Scan ID: ${scan.id}</p>
  <p>URLs Scanned: ${scan.urls?.join(', ')}</p>
</div>
<div class="container">
  <div class="summary-grid">
    <div class="summary-card"><div class="number">${summary.totalPages || 0}</div><div class="label">Pages Scanned</div></div>
    <div class="summary-card critical"><div class="number">${summary.critical || 0}</div><div class="label">Critical</div></div>
    <div class="summary-card high"><div class="number">${summary.high || 0}</div><div class="label">High</div></div>
    <div class="summary-card medium"><div class="number">${summary.medium || 0}</div><div class="label">Medium</div></div>
    <div class="summary-card low"><div class="number">${summary.low || 0}</div><div class="label">Low</div></div>
    <div class="summary-card"><div class="number">${summary.totalIssues || 0}</div><div class="label">Total Issues</div></div>
  </div>

  <div class="section">
    <h2>📊 Lighthouse Performance Scores</h2>
    ${lighthouseCards || '<p style="color:#94a3b8">No Lighthouse data available</p>'}
  </div>

  <div class="section">
    <h2>🐛 All Issues (${issues.length})</h2>
    <table>
      <thead><tr><th>Severity</th><th>Category</th><th>Issue</th><th>Description</th><th>Suggestion</th><th>URL</th></tr></thead>
      <tbody>${issueRows}</tbody>
    </table>
  </div>

  <div class="section">
    <h2>📸 Screenshots</h2>
    <div class="screenshots-grid">${screenshotCards}</div>
  </div>
</div>
<div class="footer">QA Auditor Tool | ${new Date().getFullYear()}</div>
</body>
</html>`;
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function truncate(str, len) {
  return str && str.length > len ? str.substring(0, len) + '...' : str || '';
}

module.exports = { generateHTMLReport };
