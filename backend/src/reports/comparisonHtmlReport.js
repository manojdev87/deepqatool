const SEVERITY_COLORS = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#d97706',
  low: '#65a30d'
};

function generateComparisonHTMLReport(comparison, results) {
  const summary = comparison.summary || {};

  const pairSections = results.map((r, idx) => {
    const altDiffs = r.diffs.filter(d => d.category === 'alt_tag');
    const contentDiffs = r.diffs.filter(d => d.category === 'content');

    const altRows = altDiffs.map(d => `
      <tr>
        <td><span class="badge" style="background:${SEVERITY_COLORS[d.severity]}">${d.severity}</span></td>
        <td>${escapeHtml(d.type.replace(/_/g, ' '))}</td>
        <td style="font-size:0.8rem;word-break:break-all">${escapeHtml(d.imageSrc || '')}</td>
        <td style="color:#dc2626">${escapeHtml(d.uatValue || '')}</td>
        <td style="color:#16a34a">${escapeHtml(d.prodValue || '')}</td>
        <td>${escapeHtml(d.description || '')}</td>
      </tr>
    `).join('');

    const contentRows = contentDiffs.map(d => `
      <tr>
        <td><span class="badge" style="background:${SEVERITY_COLORS[d.severity]}">${d.severity}</span></td>
        <td>${escapeHtml(d.type.replace(/_/g, ' '))}</td>
        <td style="color:#dc2626">${escapeHtml(d.uatValue || '')}</td>
        <td style="color:#16a34a">${escapeHtml(d.prodValue || '')}</td>
        <td>${escapeHtml(d.description || '')}</td>
      </tr>
    `).join('');

    const uatShots = r.uatScreenshots || {};
    const prodShots = r.prodScreenshots || {};

    const screenshotPairs = Object.keys({ ...uatShots, ...prodShots }).map(device => `
      <div class="shot-pair">
        <div class="shot-label">UAT — ${device}</div>
        ${uatShots[device] ? `<img src="http://localhost:3001${uatShots[device]}" loading="lazy"/>` : '<div class="no-shot">No screenshot</div>'}
        <div class="shot-label" style="margin-top:8px">Production — ${device}</div>
        ${prodShots[device] ? `<img src="http://localhost:3001${prodShots[device]}" loading="lazy"/>` : '<div class="no-shot">No screenshot</div>'}
      </div>
    `).join('');

    return `
      <div class="pair-section">
        <div class="pair-header">
          <span class="pair-num">#${idx + 1}</span>
          <div>
            <div><strong>UAT:</strong> <a href="${r.uat_url}" target="_blank">${r.uat_url}</a></div>
            <div><strong>Prod:</strong> <a href="${r.prod_url}" target="_blank">${r.prod_url}</a></div>
          </div>
          <div class="pair-stats">
            <span style="color:#dc2626">🔴 ${r.summary.critical || 0}</span>
            <span style="color:#ea580c">🟠 ${r.summary.high || 0}</span>
            <span style="color:#d97706">🟡 ${r.summary.medium || 0}</span>
            <span style="color:#65a30d">🟢 ${r.summary.low || 0}</span>
            <span>${r.summary.totalDiffs || 0} diffs</span>
          </div>
        </div>

        <div class="meta-compare">
          <table>
            <thead><tr><th>Field</th><th style="color:#dc2626">UAT</th><th style="color:#16a34a">Production</th></tr></thead>
            <tbody>
              <tr><td>Title</td><td>${escapeHtml(r.uatContent?.title || '')}</td><td>${escapeHtml(r.prodContent?.title || '')}</td></tr>
              <tr><td>Meta Description</td><td>${escapeHtml(truncate(r.uatContent?.metaDesc || '', 80))}</td><td>${escapeHtml(truncate(r.prodContent?.metaDesc || '', 80))}</td></tr>
              <tr><td>Word Count</td><td>${r.uatContent?.wordCount || 0}</td><td>${r.prodContent?.wordCount || 0}</td></tr>
              <tr><td>Images</td><td>${r.uatContent?.imageCount || 0}</td><td>${r.prodContent?.imageCount || 0}</td></tr>
              <tr><td>Missing Alt (UAT)</td><td style="color:#dc2626">${r.summary.missingAltUAT || 0}</td><td>—</td></tr>
              <tr><td>Missing Alt (Prod)</td><td>—</td><td style="color:#dc2626">${r.summary.missingAltProd || 0}</td></tr>
            </tbody>
          </table>
        </div>

        ${altDiffs.length > 0 ? `
          <h3 style="margin:20px 0 10px">🖼️ Alt Tag Differences (${altDiffs.length})</h3>
          <table>
            <thead><tr><th>Severity</th><th>Type</th><th>Image</th><th style="color:#dc2626">UAT Alt</th><th style="color:#16a34a">Prod Alt</th><th>Description</th></tr></thead>
            <tbody>${altRows}</tbody>
          </table>
        ` : '<p class="no-issues">✅ No alt tag differences found</p>'}

        ${contentDiffs.length > 0 ? `
          <h3 style="margin:20px 0 10px">📝 Content Differences (${contentDiffs.length})</h3>
          <table>
            <thead><tr><th>Severity</th><th>Type</th><th style="color:#dc2626">UAT Value</th><th style="color:#16a34a">Prod Value</th><th>Description</th></tr></thead>
            <tbody>${contentRows}</tbody>
          </table>
        ` : '<p class="no-issues">✅ No content differences found</p>'}

        <h3 style="margin:20px 0 10px">📸 Screenshots</h3>
        <div class="screenshots-row">${screenshotPairs}</div>
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>UAT vs Production Comparison Report — ${new Date().toLocaleDateString()}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; color: #1e293b; }
  .header { background: linear-gradient(135deg, #7c3aed, #1e40af); color: white; padding: 40px; }
  .header h1 { font-size: 2rem; margin-bottom: 8px; }
  .header p { opacity: 0.8; font-size: 0.9rem; }
  .container { max-width: 1400px; margin: 0 auto; padding: 32px; }
  .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 16px; margin: 24px 0; }
  .summary-card { background: white; border-radius: 12px; padding: 20px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .summary-card .number { font-size: 2.2rem; font-weight: 700; }
  .summary-card .label { color: #64748b; font-size: 0.8rem; margin-top: 4px; }
  .pair-section { background: white; border-radius: 12px; padding: 24px; margin: 24px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .pair-header { display: flex; align-items: flex-start; gap: 16px; padding-bottom: 16px; border-bottom: 2px solid #e2e8f0; margin-bottom: 16px; }
  .pair-num { background: #7c3aed; color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; }
  .pair-stats { margin-left: auto; display: flex; gap: 12px; font-size: 0.875rem; align-items: center; flex-wrap: wrap; }
  .meta-compare { margin: 16px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-bottom: 8px; }
  th { background: #f1f5f9; padding: 8px 12px; text-align: left; font-weight: 600; font-size: 0.8rem; }
  td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top; word-break: break-word; }
  tr:hover td { background: #f8fafc; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; color: white; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; }
  .no-issues { color: #16a34a; padding: 12px; background: #f0fdf4; border-radius: 8px; margin: 8px 0; }
  .screenshots-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-top: 12px; }
  .shot-pair { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
  .shot-label { padding: 6px 10px; background: #f1f5f9; font-size: 0.75rem; font-weight: 600; color: #475569; }
  .shot-pair img { width: 100%; height: 160px; object-fit: cover; object-position: top; display: block; }
  .no-shot { height: 80px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 0.8rem; }
  .footer { text-align: center; padding: 32px; color: #94a3b8; font-size: 0.875rem; }
  a { color: #3b82f6; text-decoration: none; }
  a:hover { text-decoration: underline; }
  h3 { font-size: 1rem; color: #1e293b; }
</style>
</head>
<body>
<div class="header">
  <h1>🔄 UAT vs Production Comparison Report</h1>
  <p>Generated: ${new Date().toLocaleString()} | Comparison ID: ${comparison.id}</p>
  <p>${summary.totalPairs || 0} URL pair(s) compared</p>
</div>
<div class="container">
  <div class="summary-grid">
    <div class="summary-card"><div class="number">${summary.totalPairs || 0}</div><div class="label">Pairs Compared</div></div>
    <div class="summary-card"><div class="number" style="color:#dc2626">${summary.critical || 0}</div><div class="label">Critical</div></div>
    <div class="summary-card"><div class="number" style="color:#ea580c">${summary.high || 0}</div><div class="label">High</div></div>
    <div class="summary-card"><div class="number" style="color:#d97706">${summary.medium || 0}</div><div class="label">Medium</div></div>
    <div class="summary-card"><div class="number" style="color:#65a30d">${summary.low || 0}</div><div class="label">Low</div></div>
    <div class="summary-card"><div class="number" style="color:#7c3aed">${summary.totalAltTagDiffs || 0}</div><div class="label">Alt Tag Diffs</div></div>
    <div class="summary-card"><div class="number">${summary.totalContentDiffs || 0}</div><div class="label">Content Diffs</div></div>
    <div class="summary-card"><div class="number">${summary.totalDiffs || 0}</div><div class="label">Total Diffs</div></div>
  </div>
  ${pairSections}
</div>
<div class="footer">QA Auditor — UAT vs Production Comparison | ${new Date().getFullYear()}</div>
</body>
</html>`;
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function truncate(str, len) {
  return str && str.length > len ? str.substring(0, len) + '...' : str || '';
}

module.exports = { generateComparisonHTMLReport };
