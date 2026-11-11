const PDFDocument = require('pdfkit');
const fs = require('fs');

const SEVERITY_COLORS = {
  critical: [220, 38, 38],
  high: [234, 88, 12],
  medium: [217, 119, 6],
  low: [101, 163, 13]
};

function generateComparisonPDFReport(comparison, results, outputPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    const summary = comparison.summary || {};

    // Header
    doc.rect(0, 0, doc.page.width, 130).fill('#7c3aed');
    doc.fillColor('white').fontSize(22).text('UAT vs Production Comparison Report', 50, 30);
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, 50, 62);
    doc.text(`Comparison ID: ${comparison.id}`, 50, 76);
    doc.text(`URL Pairs Compared: ${summary.totalPairs || 0}`, 50, 90);
    doc.text(`Total Differences Found: ${summary.totalDiffs || 0}`, 50, 104);
    doc.moveDown(4);

    // Executive Summary
    doc.fillColor('#1e293b').fontSize(15).text('Executive Summary', { underline: true });
    doc.moveDown(0.5);

    const summaryItems = [
      ['URL Pairs Compared', summary.totalPairs || 0],
      ['Alt Tag Differences', summary.totalAltTagDiffs || 0],
      ['Content Differences', summary.totalContentDiffs || 0],
      ['Critical', summary.critical || 0],
      ['High', summary.high || 0],
      ['Medium', summary.medium || 0],
      ['Low', summary.low || 0],
      ['Total Differences', summary.totalDiffs || 0]
    ];

    summaryItems.forEach(([label, value]) => {
      doc.fontSize(10).fillColor('#475569').text(`${label}: `, { continued: true });
      doc.fillColor('#1e293b').text(String(value));
    });

    // Per-pair details
    results.forEach((r, idx) => {
      doc.addPage();
      doc.fontSize(14).fillColor('#7c3aed').text(`Pair #${idx + 1}`, { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#1e293b').text(`UAT:  ${r.uat_url}`);
      doc.text(`Prod: ${r.prod_url}`);
      doc.moveDown(0.5);

      // Content overview table
      doc.fontSize(12).fillColor('#1e293b').text('Content Overview', { underline: true });
      doc.moveDown(0.3);
      const uat = r.uatContent || {};
      const prod = r.prodContent || {};
      [
        ['Title', uat.title, prod.title],
        ['Word Count', uat.wordCount, prod.wordCount],
        ['Images', uat.imageCount, prod.imageCount],
        ['Missing Alt (UAT)', r.summary?.missingAltUAT, '—'],
        ['Missing Alt (Prod)', '—', r.summary?.missingAltProd]
      ].forEach(([field, uatVal, prodVal]) => {
        doc.fontSize(9)
          .fillColor('#475569').text(`${field}: `, { continued: true })
          .fillColor([220, 38, 38]).text(`UAT: ${uatVal ?? ''}  `, { continued: true })
          .fillColor([22, 163, 74]).text(`Prod: ${prodVal ?? ''}`);
      });

      doc.moveDown(0.5);

      // Alt tag diffs
      const altDiffs = r.diffs.filter(d => d.category === 'alt_tag');
      if (altDiffs.length > 0) {
        doc.fontSize(12).fillColor('#1e293b').text(`Alt Tag Differences (${altDiffs.length})`, { underline: true });
        doc.moveDown(0.3);
        altDiffs.forEach((d, i) => {
          if (doc.y > doc.page.height - 120) doc.addPage();
          const color = SEVERITY_COLORS[d.severity] || [107, 114, 128];
          doc.fontSize(9).fillColor(color).text(`[${d.severity.toUpperCase()}] `, { continued: true });
          doc.fillColor('#1e293b').text(d.title);
          if (d.imageSrc) doc.fontSize(8).fillColor('#64748b').text(`  Image: ${d.imageSrc}`);
          doc.fontSize(8)
            .fillColor([220, 38, 38]).text(`  UAT:  ${d.uatValue || ''}`, { continued: true })
            .fillColor([22, 163, 74]).text(`   Prod: ${d.prodValue || ''}`);
          doc.moveDown(0.3);
        });
      } else {
        doc.fontSize(10).fillColor([22, 163, 74]).text('✓ No alt tag differences found');
        doc.moveDown(0.3);
      }

      // Content diffs
      const contentDiffs = r.diffs.filter(d => d.category === 'content');
      if (contentDiffs.length > 0) {
        doc.moveDown(0.3);
        doc.fontSize(12).fillColor('#1e293b').text(`Content Differences (${contentDiffs.length})`, { underline: true });
        doc.moveDown(0.3);
        contentDiffs.forEach(d => {
          if (doc.y > doc.page.height - 100) doc.addPage();
          const color = SEVERITY_COLORS[d.severity] || [107, 114, 128];
          doc.fontSize(9).fillColor(color).text(`[${d.severity.toUpperCase()}] `, { continued: true });
          doc.fillColor('#1e293b').text(d.title);
          doc.fontSize(8).fillColor('#64748b').text(`  ${d.description || ''}`);
          doc.moveDown(0.3);
        });
      }
    });

    // Page footers
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(pages.start + i);
      doc.fontSize(8).fillColor('#94a3b8')
        .text(`QA Auditor — UAT vs Production Comparison | Page ${i + 1} of ${pages.count}`,
          50, doc.page.height - 30, { align: 'center' });
    }

    doc.end();
    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
}

module.exports = { generateComparisonPDFReport };
