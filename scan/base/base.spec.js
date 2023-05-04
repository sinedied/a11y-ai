// @ts-check
import process from 'node:process';
import { test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('get issues', async ({ page }) => {
    const url = process.env.A11Y_AI_URL || '';
    const disabledRules = process.env.A11Y_AI_DISABLED_RULES || '';
    const axeOptions = {};

    await page.goto(url);

    if (disabledRules) {
      const rules = disabledRules
        .split(',')
        .map((rule) => rule.trim())
        .map((rule) => ({ id: rule, enabled: false }));
      axeOptions.rules = rules;
    }

    const results = await new AxeBuilder({ page }).analyze();
    const { violations } = results;
    console.log('===ISSUES_BEGIN===');
    console.log(JSON.stringify(violations));
    console.log('===ISSUES_END===');
  });
});
