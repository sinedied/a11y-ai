// @ts-check
import process from 'node:process';
import { test } from '@playwright/test';
import { injectAxe, configureAxe, getViolations } from 'axe-playwright';

test.describe('Accessibility', () => {
  test('get issues', async ({ page }) => {
    const url = process.env.A11Y_AI_URL || '';
    const disabledRules = process.env.A11Y_AI_DISABLED_RULES || '';

    await page.goto(url);
    await injectAxe(page);

    if (disabledRules) {
      const rules = disabledRules
        .split(',')
        .map((rule) => rule.trim())
        .map((rule) => ({ id: rule, enabled: false }));
      await configureAxe(page, { rules });
    }

    const violations = await getViolations(page, {});
    console.log('===ISSUES_BEGIN===');
    console.log(JSON.stringify(violations));
    console.log('===ISSUES_END===');
  });
});
