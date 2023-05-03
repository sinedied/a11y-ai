// @ts-check
import { test } from '@playwright/test';
import { injectAxe, getViolations} from 'axe-playwright';

test.describe('Accessibility', () => { 
  test('get issues', async ({ page }) => {
    await page.goto(process.env.A11Y_AI_URL || '');
    await injectAxe(page);
    const violations = await getViolations(page, {});
    console.log('===ISSUES_BEGIN===');
    console.log(JSON.stringify(violations));
    console.log('===ISSUES_END===');
  });
});
