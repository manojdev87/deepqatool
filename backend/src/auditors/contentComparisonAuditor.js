const cheerio = require('cheerio');

/**
 * Extracts all content signals from a page's HTML:
 * - All images with src + alt
 * - All headings (h1-h6) with text
 * - All paragraphs text
 * - All anchor texts
 * - Meta title / description
 * - Word count
 */
function extractPageContent(html, pageUrl) {
  const $ = cheerio.load(html);

  // Images: src (normalized to path only) + alt
  const images = [];
  $('img').each((_, el) => {
    const raw = $(el).attr('src') || '';
    let src = raw;
    try {
      const u = new URL(raw, pageUrl);
      src = u.pathname + (u.search || '');
    } catch {}
    images.push({
      src,
      rawSrc: raw,
      alt: ($(el).attr('alt') || '').trim(),
      hasAlt: $(el).attr('alt') !== undefined,
      altEmpty: ($(el).attr('alt') || '').trim() === ''
    });
  });

  // Headings
  const headings = [];
  $('h1,h2,h3,h4,h5,h6').each((_, el) => {
    headings.push({ tag: el.tagName.toLowerCase(), text: $(el).text().trim() });
  });

  // Paragraphs (non-empty, trimmed)
  const paragraphs = [];
  $('p').each((_, el) => {
    const t = $(el).text().trim();
    if (t.length > 20) paragraphs.push(t);
  });

  // Meta
  const title = $('title').text().trim();
  const metaDesc = $('meta[name="description"]').attr('content') || '';

  // Word count
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  const wordCount = bodyText.split(' ').filter(w => w.length > 0).length;

  return { images, headings, paragraphs, title, metaDesc, wordCount };
}

/**
 * Compares content extracted from UAT vs Production.
 * Returns structured diff results per category.
 */
function compareContent(uatContent, prodContent, uatUrl, prodUrl) {
  const diffs = [];

  // ── ALT TAG COMPARISON ──────────────────────────────────────────────
  const uatImgMap = new Map(uatContent.images.map(i => [i.src, i]));
  const prodImgMap = new Map(prodContent.images.map(i => [i.src, i]));
  const allSrcs = new Set([...uatImgMap.keys(), ...prodImgMap.keys()]);

  allSrcs.forEach(src => {
    const uat = uatImgMap.get(src);
    const prod = prodImgMap.get(src);

    if (uat && prod) {
      // Both have the image — compare alt text
      if (uat.alt !== prod.alt) {
        diffs.push({
          category: 'alt_tag',
          type: 'alt_mismatch',
          severity: uat.alt === '' || prod.alt === '' ? 'high' : 'medium',
          field: 'alt',
          imageSrc: src,
          uatValue: uat.alt || '(empty)',
          prodValue: prod.alt || '(empty)',
          title: `Alt text mismatch: ${truncate(src, 50)}`,
          description: `UAT alt: "${uat.alt || '(empty)'}" | Prod alt: "${prod.alt || '(empty)'}"`
        });
      }
      // Missing alt on one side
      if (!uat.hasAlt && prod.hasAlt) {
        diffs.push({
          category: 'alt_tag',
          type: 'alt_missing_uat',
          severity: 'high',
          imageSrc: src,
          uatValue: '(no alt attribute)',
          prodValue: prod.alt,
          title: `Alt attribute missing on UAT: ${truncate(src, 50)}`,
          description: 'Image has alt on Production but missing alt attribute on UAT'
        });
      }
      if (uat.hasAlt && !prod.hasAlt) {
        diffs.push({
          category: 'alt_tag',
          type: 'alt_missing_prod',
          severity: 'high',
          imageSrc: src,
          uatValue: uat.alt,
          prodValue: '(no alt attribute)',
          title: `Alt attribute missing on Production: ${truncate(src, 50)}`,
          description: 'Image has alt on UAT but missing alt attribute on Production'
        });
      }
    } else if (uat && !prod) {
      diffs.push({
        category: 'alt_tag',
        type: 'image_only_uat',
        severity: 'medium',
        imageSrc: src,
        uatValue: uat.alt || '(empty)',
        prodValue: '(image not found)',
        title: `Image only on UAT: ${truncate(src, 50)}`,
        description: 'This image exists on UAT but not on Production'
      });
    } else if (!uat && prod) {
      diffs.push({
        category: 'alt_tag',
        type: 'image_only_prod',
        severity: 'medium',
        imageSrc: src,
        uatValue: '(image not found)',
        prodValue: prod.alt || '(empty)',
        title: `Image only on Production: ${truncate(src, 50)}`,
        description: 'This image exists on Production but not on UAT'
      });
    }
  });

  // ── MISSING ALT TAGS (per environment) ──────────────────────────────
  uatContent.images.forEach(img => {
    if (!img.hasAlt || img.altEmpty) {
      diffs.push({
        category: 'alt_tag',
        type: 'missing_alt_uat',
        severity: 'high',
        imageSrc: img.src,
        uatValue: img.hasAlt ? '(empty string)' : '(no alt attribute)',
        prodValue: prodImgMap.get(img.src)?.alt || 'N/A',
        title: `Missing alt on UAT: ${truncate(img.src, 50)}`,
        description: `Image on UAT has no meaningful alt text`
      });
    }
  });

  prodContent.images.forEach(img => {
    if (!img.hasAlt || img.altEmpty) {
      diffs.push({
        category: 'alt_tag',
        type: 'missing_alt_prod',
        severity: 'high',
        imageSrc: img.src,
        uatValue: uatImgMap.get(img.src)?.alt || 'N/A',
        prodValue: img.hasAlt ? '(empty string)' : '(no alt attribute)',
        title: `Missing alt on Production: ${truncate(img.src, 50)}`,
        description: `Image on Production has no meaningful alt text`
      });
    }
  });

  // ── HEADING COMPARISON ───────────────────────────────────────────────
  const uatH1s = uatContent.headings.filter(h => h.tag === 'h1').map(h => h.text);
  const prodH1s = prodContent.headings.filter(h => h.tag === 'h1').map(h => h.text);

  if (JSON.stringify(uatH1s) !== JSON.stringify(prodH1s)) {
    diffs.push({
      category: 'content',
      type: 'h1_mismatch',
      severity: 'high',
      uatValue: uatH1s.join(' | ') || '(none)',
      prodValue: prodH1s.join(' | ') || '(none)',
      title: 'H1 heading mismatch',
      description: `UAT H1: "${uatH1s.join(', ') || 'none'}" | Prod H1: "${prodH1s.join(', ') || 'none'}"`
    });
  }

  // Heading count diff per level
  ['h2', 'h3', 'h4'].forEach(tag => {
    const uatCount = uatContent.headings.filter(h => h.tag === tag).length;
    const prodCount = prodContent.headings.filter(h => h.tag === tag).length;
    if (uatCount !== prodCount) {
      diffs.push({
        category: 'content',
        type: `${tag}_count_mismatch`,
        severity: 'low',
        uatValue: String(uatCount),
        prodValue: String(prodCount),
        title: `${tag.toUpperCase()} count differs`,
        description: `UAT has ${uatCount} ${tag} tags, Production has ${prodCount}`
      });
    }
  });

  // ── META TITLE COMPARISON ────────────────────────────────────────────
  if (uatContent.title !== prodContent.title) {
    diffs.push({
      category: 'content',
      type: 'title_mismatch',
      severity: uatContent.title === '' || prodContent.title === '' ? 'critical' : 'medium',
      uatValue: uatContent.title || '(empty)',
      prodValue: prodContent.title || '(empty)',
      title: 'Page title mismatch',
      description: `UAT: "${uatContent.title}" | Prod: "${prodContent.title}"`
    });
  }

  // ── META DESCRIPTION COMPARISON ─────────────────────────────────────
  if (uatContent.metaDesc !== prodContent.metaDesc) {
    diffs.push({
      category: 'content',
      type: 'meta_desc_mismatch',
      severity: 'medium',
      uatValue: uatContent.metaDesc || '(empty)',
      prodValue: prodContent.metaDesc || '(empty)',
      title: 'Meta description mismatch',
      description: `UAT: "${truncate(uatContent.metaDesc, 80)}" | Prod: "${truncate(prodContent.metaDesc, 80)}"`
    });
  }

  // ── WORD COUNT COMPARISON ────────────────────────────────────────────
  const wcDiff = Math.abs(uatContent.wordCount - prodContent.wordCount);
  const wcPct = prodContent.wordCount > 0 ? Math.round((wcDiff / prodContent.wordCount) * 100) : 0;
  if (wcPct > 10) {
    diffs.push({
      category: 'content',
      type: 'word_count_diff',
      severity: wcPct > 30 ? 'high' : 'medium',
      uatValue: String(uatContent.wordCount),
      prodValue: String(prodContent.wordCount),
      title: `Word count differs by ${wcPct}%`,
      description: `UAT: ${uatContent.wordCount} words | Production: ${prodContent.wordCount} words (${wcPct}% difference)`
    });
  }

  // ── SUMMARY ──────────────────────────────────────────────────────────
  const altTagDiffs = diffs.filter(d => d.category === 'alt_tag');
  const contentDiffs = diffs.filter(d => d.category === 'content');

  return {
    diffs,
    summary: {
      totalImages: { uat: uatContent.images.length, prod: prodContent.images.length },
      altTagDiffs: altTagDiffs.length,
      contentDiffs: contentDiffs.length,
      missingAltUAT: uatContent.images.filter(i => !i.hasAlt || i.altEmpty).length,
      missingAltProd: prodContent.images.filter(i => !i.hasAlt || i.altEmpty).length,
      matchedImages: [...allSrcs].filter(s => uatImgMap.has(s) && prodImgMap.has(s)).length,
      onlyOnUAT: [...allSrcs].filter(s => uatImgMap.has(s) && !prodImgMap.has(s)).length,
      onlyOnProd: [...allSrcs].filter(s => !uatImgMap.has(s) && prodImgMap.has(s)).length,
      critical: diffs.filter(d => d.severity === 'critical').length,
      high: diffs.filter(d => d.severity === 'high').length,
      medium: diffs.filter(d => d.severity === 'medium').length,
      low: diffs.filter(d => d.severity === 'low').length,
      totalDiffs: diffs.length
    },
    uatContent,
    prodContent
  };
}

function truncate(str, len) {
  return str && str.length > len ? str.substring(0, len) + '...' : str || '';
}

module.exports = { extractPageContent, compareContent };
