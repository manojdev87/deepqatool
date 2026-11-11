async function auditForms(page, scanId, urlSlug) {
  const issues = [];
  const results = [];

  const forms = await page.$$('form');

  for (let i = 0; i < forms.length; i++) {
    const formResult = { index: i, tests: [], screenshots: [] };

    // Blank submission test
    try {
      await page.evaluate((idx) => {
        const forms = document.querySelectorAll('form');
        const btn = forms[idx]?.querySelector('[type="submit"], button');
        if (btn) btn.click();
      }, i);

      await page.waitForTimeout(1000);

      const validationMsgs = await page.$$eval('[class*="error"],[class*="invalid"],[aria-invalid="true"]',
        els => els.map(el => el.textContent.trim()).filter(Boolean)
      );

      const consoleErrs = [];
      page.once('console', msg => { if (msg.type() === 'error') consoleErrs.push(msg.text()); });

      formResult.tests.push({
        test: 'blank_submission',
        passed: validationMsgs.length > 0,
        validationMessages: validationMsgs
      });

      if (validationMsgs.length === 0) {
        issues.push({
          type: 'form_no_validation',
          severity: 'high',
          title: `Form ${i + 1}: No Blank Submission Validation`,
          description: 'Form submitted without required field validation',
          suggestion: 'Add required field validation to all form fields'
        });
      }
    } catch (e) {
      formResult.tests.push({ test: 'blank_submission', error: e.message });
    }

    // Email field test
    try {
      const emailInput = await page.$(`form:nth-of-type(${i + 1}) input[type="email"]`);
      if (emailInput) {
        await emailInput.fill('invalid-email');
        await page.evaluate((idx) => {
          const forms = document.querySelectorAll('form');
          const btn = forms[idx]?.querySelector('[type="submit"], button');
          if (btn) btn.click();
        }, i);
        await page.waitForTimeout(500);

        const isInvalid = await emailInput.evaluate(el => !el.validity.valid);
        formResult.tests.push({ test: 'email_validation', passed: isInvalid });

        if (!isInvalid) {
          issues.push({
            type: 'email_validation_missing',
            severity: 'high',
            title: `Form ${i + 1}: Email Validation Missing`,
            description: 'Invalid email accepted without error',
            suggestion: 'Add proper email format validation'
          });
        }
        await emailInput.fill('');
      }
    } catch (e) {}

    // Detect form fields
    const fields = await page.$$eval(`form`, (forms, idx) => {
      const form = forms[idx];
      if (!form) return [];
      return Array.from(form.querySelectorAll('input, select, textarea')).map(el => ({
        type: el.type || el.tagName.toLowerCase(),
        name: el.name,
        required: el.required,
        id: el.id
      }));
    }, i);

    formResult.fields = fields;
    results.push(formResult);
  }

  return { issues, formResults: results, formCount: forms.length };
}

module.exports = { auditForms };
