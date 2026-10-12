import type { Page, TestInfo } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/**
 * Optional screenshots of NEW screens for the owner's review (PHASE4_REVIEW_SHOTS=<folder>, e.g. .local/acceptance/screens).
 * They are not canonical references, are never compared or committed, and do nothing when the variable is not set.
 */
export async function reviewShot(page: Page, info: TestInfo, name: string) {
  const dir = process.env.PHASE4_REVIEW_SHOTS;
  if (!dir) return;
  mkdirSync(dir, { recursive: true });
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.screenshot({ path: `${dir}/${name}-${info.project.name}.png`, fullPage: true });
}
