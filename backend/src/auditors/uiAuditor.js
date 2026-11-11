async function auditUI(page, screenshots) {
  const issues = [];

  // Check for overlapping elements
  const overlaps = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('button, a, input, [role="button"]'));
    const overlapping = [];
    for (let i = 0; i < Math.min(elements.length, 50); i++) {
      const r1 = elements[i].getBoundingClientRect();
      if (r1.width === 0 || r1.height === 0) continue;
      for (let j = i + 1; j < Math.min(elements.length, 50); j++) {
        const r2 = elements[j].getBoundingClientRect();
        if (r1.left < r2.right && r1.right > r2.left && r1.top < r2.bottom && r1.bottom > r2.top) {
          overlapping.push({ el1: elements[i].tagName + (elements[i].id ? '#' + elements[i].id : ''), el2: elements[j].tagName });
        }
      }
    }
    return overlapping.slice(0, 10);
  });

  if (overlaps.length > 0) {
    issues.push({
      type: 'overlapping_elements',
      severity: 'high',
      title: 'Overlapping Interactive Elements',
      description: `Found ${overlaps.length} overlapping elements`,
      suggestion: 'Fix z-index and positioning to prevent element overlap',
      details: overlaps
    });
  }

  // Check for hidden buttons
  const hiddenButtons = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, [type="submit"]'));
    return btns.filter(btn => {
      const style = window.getComputedStyle(btn);
      return style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0';
    }).map(btn => btn.textContent.trim().substring(0, 50));
  });

  if (hiddenButtons.length > 0) {
    issues.push({
      type: 'hidden_buttons',
      severity: 'medium',
      title: 'Hidden Buttons Detected',
      description: `${hiddenButtons.length} buttons are hidden`,
      suggestion: 'Verify hidden buttons are intentional',
      details: hiddenButtons
    });
  }

  // Check for truncated text
  const truncated = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('p, h1, h2, h3, span, div'));
    return els.filter(el => {
      const style = window.getComputedStyle(el);
      return style.overflow === 'hidden' && el.scrollWidth > el.clientWidth;
    }).length;
  });

  if (truncated > 0) {
    issues.push({
      type: 'truncated_text',
      severity: 'medium',
      title: 'Truncated Text Detected',
      description: `${truncated} elements have truncated text`,
      suggestion: 'Review text overflow settings and ensure content is fully visible'
    });
  }

  // Mobile responsiveness check
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(500);

  const mobileIssues = await page.evaluate(() => {
    const issues = [];
    const body = document.body;
    if (body.scrollWidth > window.innerWidth + 10) {
      issues.push('Horizontal scroll detected on mobile');
    }
    const smallText = Array.from(document.querySelectorAll('p, span, div')).filter(el => {
      const size = parseFloat(window.getComputedStyle(el).fontSize);
      return size < 12 && el.textContent.trim().length > 0;
    }).length;
    if (smallText > 0) issues.push(`${smallText} elements have font size below 12px on mobile`);
    return issues;
  });

  mobileIssues.forEach(msg => {
    issues.push({ type: 'mobile_issue', severity: 'high', title: 'Mobile Responsiveness Issue', description: msg, suggestion: 'Fix responsive design for mobile viewport' });
  });

  // Reset to desktop
  await page.setViewportSize({ width: 1920, height: 1080 });

  return { issues, screenshots };
}

module.exports = { auditUI };
