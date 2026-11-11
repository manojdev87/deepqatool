const PDFDocument = require('pdfkit');
const fs = require('fs');

const SEVERITY_COLORS = {
  critical: [220, 38, 38],
  high: [234, 88, 12],
  medium: [217, 119, 6],
  low: [101, 163, 13]
};

function generatePDFReport(scan, results, issues, outputPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    const summary = scan.summary || {};

    // Header
    doc.rect(0, 0, doc.page.width, 120).fill('#1e40af');
    doc.fillColor('white').fontSize(24).text('Website QA Audit Report', 50, 35);
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, 50, 68);
    doc.text(`Scan ID: ${scan.id}`, 50, 82);
    doc.text(`Mode: ${scan.scan_mode?.toUpperCase()}`, 50, 96);
    doc.moveDown(4);

    // Executive Summary
    doc.fillColor('#1e293b').fontSize(16).text('Executive Summary', { underline: true });
    doc.moveDown(0.5);

    const summaryItems = [
      ['Pages Scanned', summary.totalPages || 0],
      ['Critical Issues', summary.critical || 0],
      ['High Issues', summary.high || 0],
      ['Medium Issues', summary.medium || 0],
      ['Low Issues', summary.low || 0],
      ['Total Issues', summary.totalIssues || 0]
    ];

    summaryItems.forEach(([label, value]) => {
      doc.fontSize(11).fillColor('#475569').text(`${label}: `, { continued: true });
      doc.fillColor('#1e293b').text(String(value));
    });

    doc.moveDown();

    // URLs Scanned
    doc.fontSize(16).fillColor('#1e293b').text('URLs Scanned', { underline: true });
    doc.moveDown(0.5);
    (scan.urls || []).forEach(url => {
      doc.fontSize(10).fillColor('#3b82f6').text(url, { link: url });
    });
    doc.moveDown();

    // Lighthouse Scores
    const lhResults = results.filter(r => r.lighthouse_scores);
    if (lhResults.length > 0) {
      doc.addPage();
      doc.fontSize(16).fillColor('#1e293b').text('Lighthouse Performance Scores', { underline: true });
      doc.moveDown(0.5);

      lhResults.forEach(r => {
        const scores = JSON.parse(r.lighthouse_scores);
        doc.fontSize(11).fillColor('#475569').text(r.url);
        doc.moveDown(0.3);
        Object.entries(scores).forEach(([key, val]) => {
          const color = val >= 90 ? [34, 197, 94] : val >= 50 ? [245, 158, 11] : [239, 68, 68];
          doc.fontSize(10).fillColor(color).text(`  ${key}: ${val}/100`, { continued: false });
        });
        doc.moveDown(0.5);
      });
    }

    // Issues by Severity
    doc.addPage();
    doc.fontSize(16).fillColor('#1e293b').text('Detailed Issues', { underline: true });
    doc.moveDown(0.5);

    const severities = ['critical', 'high', 'medium', 'low'];
    severities.forEach(sev => {
      const sevIssues = issues.filter(i => i.severity === sev);
      if (sevIssues.length === 0) return;

      const color = SEVERITY_COLORS[sev];
      doc.fontSize(13).fillColor(color).text(`${sev.toUpperCase()} (${sevIssues.length})`, { underline: true });
      doc.moveDown(0.3);

      sevIssues.forEach((issue, idx) => {
        if (doc.y > doc.page.height - 150) doc.addPage();

        doc.fontSize(10).fillColor('#1e293b').text(`${idx + 1}. ${issue.title}`, { bold: true });
        if (issue.description) doc.fontSize(9).fillColor('#475569').text(`   ${issue.description}`);
        if (issue.suggestion) doc.fontSize(9).fillColor('#059669').text(`   Fix: ${issue.suggestion}`);
        if (issue.url) doc.fontSize(9).fillColor('#3b82f6').text(`   URL: ${issue.url}`);
        doc.moveDown(0.3);
      });
      doc.moveDown(0.5);
    });

    // Footer on each page
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(pages.start + i);
      doc.fontSize(8).fillColor('#94a3b8')
        .text(`QA Auditor Report | Page ${i + 1} of ${pages.count}`, 50, doc.page.height - 30, { align: 'center' });
    }

    doc.end();
    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
}

module.exports = { generatePDFReport };
