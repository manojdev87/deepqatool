const cheerio = require('cheerio');

function auditSEO(html, url) {
  const $ = cheerio.load(html);
  const issues = [];

  const title = $('title').text().trim();
  if (!title) {
    issues.push({ type: 'missing_title', severity: 'critical', title: 'Missing Title Tag', description: 'Page has no <title> tag', suggestion: 'Add a descriptive title tag between 50-60 characters' });
  } else if (title.length < 30) {
    issues.push({ type: 'short_title', severity: 'medium', title: 'Title Too Short', description: `Title "${title}" is only ${title.length} chars`, suggestion: 'Expand title to 50-60 characters' });
  } else if (title.length > 60) {
    issues.push({ type: 'long_title', severity: 'low', title: 'Title Too Long', description: `Title is ${title.length} chars (max 60)`, suggestion: 'Shorten title to under 60 characters' });
  }

  const metaDesc = $('meta[name="description"]').attr('content') || '';
  if (!metaDesc) {
    issues.push({ type: 'missing_meta_desc', severity: 'high', title: 'Missing Meta Description', description: 'No meta description found', suggestion: 'Add meta description between 150-160 characters' });
  } else if (metaDesc.length > 160) {
    issues.push({ type: 'long_meta_desc', severity: 'low', title: 'Meta Description Too Long', description: `Meta description is ${metaDesc.length} chars`, suggestion: 'Shorten to under 160 characters' });
  }

  const h1s = $('h1');
  if (h1s.length === 0) {
    issues.push({ type: 'missing_h1', severity: 'high', title: 'Missing H1 Tag', description: 'No H1 tag found on page', suggestion: 'Add exactly one H1 tag with primary keyword' });
  } else if (h1s.length > 1) {
    issues.push({ type: 'multiple_h1', severity: 'medium', title: 'Multiple H1 Tags', description: `Found ${h1s.length} H1 tags`, suggestion: 'Use only one H1 tag per page' });
  }

  const canonical = $('link[rel="canonical"]').attr('href');
  if (!canonical) {
    issues.push({ type: 'missing_canonical', severity: 'medium', title: 'Missing Canonical Tag', description: 'No canonical URL specified', suggestion: 'Add <link rel="canonical" href="..."> to prevent duplicate content' });
  }

  const robots = $('meta[name="robots"]').attr('content') || '';
  if (robots.includes('noindex')) {
    issues.push({ type: 'noindex', severity: 'critical', title: 'Page Set to NoIndex', description: `Robots meta: "${robots}"`, suggestion: 'Remove noindex if page should be indexed' });
  }

  const ogTitle = $('meta[property="og:title"]').attr('content');
  const ogDesc = $('meta[property="og:description"]').attr('content');
  const ogImage = $('meta[property="og:image"]').attr('content');
  if (!ogTitle) issues.push({ type: 'missing_og_title', severity: 'low', title: 'Missing OG Title', description: 'No og:title meta tag', suggestion: 'Add Open Graph title for social sharing' });
  if (!ogDesc) issues.push({ type: 'missing_og_desc', severity: 'low', title: 'Missing OG Description', description: 'No og:description meta tag', suggestion: 'Add Open Graph description' });
  if (!ogImage) issues.push({ type: 'missing_og_image', severity: 'low', title: 'Missing OG Image', description: 'No og:image meta tag', suggestion: 'Add Open Graph image (1200x630px recommended)' });

  const twitterCard = $('meta[name="twitter:card"]').attr('content');
  if (!twitterCard) issues.push({ type: 'missing_twitter_card', severity: 'low', title: 'Missing Twitter Card', description: 'No twitter:card meta tag', suggestion: 'Add Twitter Card meta tags' });

  return {
    issues,
    data: {
      title,
      metaDescription: metaDesc,
      h1Count: h1s.length,
      canonical,
      robots,
      hasOG: !!(ogTitle && ogDesc && ogImage),
      hasTwitterCard: !!twitterCard
    }
  };
}

function auditSchema(html) {
  const $ = cheerio.load(html);
  const issues = [];
  const schemas = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html());
      schemas.push(data['@type'] || 'Unknown');
    } catch (e) {
      issues.push({ type: 'invalid_schema', severity: 'high', title: 'Invalid JSON-LD Schema', description: 'Schema markup contains invalid JSON', suggestion: 'Validate schema at schema.org/validator' });
    }
  });

  if (schemas.length === 0) {
    issues.push({ type: 'missing_schema', severity: 'medium', title: 'No Schema Markup', description: 'No structured data found', suggestion: 'Add relevant schema markup (Organization, Article, etc.)' });
  }

  return { issues, schemas };
}

function auditContent(html) {
  const $ = cheerio.load(html);
  const issues = [];

  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  const wordCount = bodyText.split(' ').filter(w => w.length > 0).length;

  if (wordCount < 300) {
    issues.push({ type: 'thin_content', severity: 'medium', title: 'Thin Content', description: `Page has only ${wordCount} words`, suggestion: 'Add more meaningful content (minimum 300 words)' });
  }

  if (bodyText.toLowerCase().includes('lorem ipsum')) {
    issues.push({ type: 'placeholder_text', severity: 'critical', title: 'Lorem Ipsum Placeholder Text', description: 'Page contains Lorem Ipsum placeholder text', suggestion: 'Replace all placeholder text with real content' });
  }

  const emptyDivs = $('div:empty, section:empty, article:empty').length;
  if (emptyDivs > 0) {
    issues.push({ type: 'empty_sections', severity: 'low', title: 'Empty Content Sections', description: `Found ${emptyDivs} empty content blocks`, suggestion: 'Remove or fill empty sections' });
  }

  const images = $('img');
  if (images.length === 0) {
    issues.push({ type: 'no_images', severity: 'low', title: 'No Images Found', description: 'Page has no images', suggestion: 'Add relevant images to improve engagement' });
  }

  return { issues, wordCount };
}

module.exports = { auditSEO, auditSchema, auditContent };
