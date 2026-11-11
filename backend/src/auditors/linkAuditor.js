const axios = require('axios');
const cheerio = require('cheerio');
const xml2js = require('xml2js');

async function crawlSitemap(sitemapUrl) {
  const urls = [];
  try {
    const { data } = await axios.get(sitemapUrl, { timeout: 10000 });
    const parsed = await xml2js.parseStringPromise(data);

    if (parsed.sitemapindex) {
      const sitemaps = parsed.sitemapindex.sitemap || [];
      for (const s of sitemaps) {
        const subUrls = await crawlSitemap(s.loc[0]);
        urls.push(...subUrls);
      }
    } else if (parsed.urlset) {
      const urlEntries = parsed.urlset.url || [];
      urlEntries.forEach(u => urls.push(u.loc[0]));
    }
  } catch (e) {
    console.error('Sitemap crawl error:', e.message);
  }
  return urls;
}

async function crawlInternalLinks(startUrl, maxPages = 50) {
  const visited = new Set();
  const toVisit = [startUrl];
  const baseUrl = new URL(startUrl).origin;
  const allLinks = [];

  while (toVisit.length > 0 && visited.size < maxPages) {
    const url = toVisit.shift();
    if (visited.has(url)) continue;
    visited.add(url);

    try {
      const { data, status } = await axios.get(url, {
        timeout: 10000,
        maxRedirects: 5,
        validateStatus: () => true
      });

      allLinks.push({ url, status });

      if (status === 200 && typeof data === 'string') {
        const $ = cheerio.load(data);
        $('a[href]').each((_, el) => {
          const href = $(el).attr('href');
          if (!href) return;
          try {
            const absolute = new URL(href, url).href;
            if (absolute.startsWith(baseUrl) && !visited.has(absolute) && !toVisit.includes(absolute)) {
              toVisit.push(absolute);
            }
          } catch {}
        });
      }
    } catch (e) {
      allLinks.push({ url, status: 0, error: e.message });
    }
  }

  return allLinks;
}

async function checkLinks(page, baseUrl) {
  const links = await page.$$eval('a[href]', els =>
    els.map(el => ({ href: el.href, text: el.textContent.trim(), anchor: el.hash }))
  );

  const images = await page.$$eval('img', els =>
    els.map(el => ({ src: el.src, alt: el.alt }))
  );

  const issues = [];
  const checked = new Set();

  for (const link of links.slice(0, 100)) {
    if (!link.href || checked.has(link.href)) continue;
    checked.add(link.href);

    try {
      const res = await axios.get(link.href, {
        timeout: 8000,
        maxRedirects: 10,
        validateStatus: () => true
      });

      if (res.status === 404) {
        issues.push({ type: 'broken_link', severity: 'high', url: link.href, text: link.text, status: 404 });
      } else if (res.status >= 500) {
        issues.push({ type: 'server_error', severity: 'critical', url: link.href, status: res.status });
      }

      const redirectCount = res.request?._redirectable?._redirectCount || 0;
      if (redirectCount > 3) {
        issues.push({ type: 'redirect_chain', severity: 'medium', url: link.href, redirects: redirectCount });
      }
    } catch (e) {
      if (e.code === 'ERR_FR_TOO_MANY_REDIRECTS') {
        issues.push({ type: 'infinite_redirect', severity: 'high', url: link.href });
      }
    }
  }

  for (const img of images) {
    if (!img.src) continue;
    try {
      const res = await axios.head(img.src, { timeout: 5000, validateStatus: () => true });
      if (res.status === 404) {
        issues.push({ type: 'broken_image', severity: 'high', url: img.src, alt: img.alt });
      }
      if (!img.alt) {
        issues.push({ type: 'missing_alt', severity: 'medium', url: img.src });
      }
    } catch {}
  }

  return issues;
}

module.exports = { crawlSitemap, crawlInternalLinks, checkLinks };
