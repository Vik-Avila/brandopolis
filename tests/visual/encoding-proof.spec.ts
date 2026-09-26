import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync, mkdirSync } from 'node:fs';

test('repaired historic DEMO questions remain canonical through API and browser reload', async ({ page, request }) => {
  const backups = readdirSync('.local').filter(file => /^encoding-backup-\d+\.json$/.test(file)).sort();
  test.skip(backups.length === 0, 'Historic repair evidence requires its local backup; never create corruption to run this test.');
  const rows = JSON.parse(readFileSync(`.local/${backups[0]}`, 'utf8')) as { id:string; workspaceId:string; brandId:string; module:string; repairedText:string }[];
  const session = JSON.parse(readFileSync(process.env.BRANDOPOLIS_SESSION_FILE??'.local/demo-session.json', 'utf8')) as { token:string; workspaceId:string };
  const candidates = rows.filter(row => row.workspaceId === session.workspaceId);
  expect(candidates.length).toBeGreaterThan(0);
  const brandId = candidates[0].brandId;
  const questions = candidates.filter(row => row.brandId === brandId);
  let response;
  try { response = await request.get(`/api/context?brandId=${brandId}`, { headers:{ Authorization:`Bearer ${session.token}` } }); }
  catch { throw new Error('DEMO API unavailable; credential details withheld.'); }
  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toContain('charset=utf-8');
  const payload = await response.json();
  for (const question of questions) expect(payload.questions.find((q:{id:string}) => q.id === question.id)?.text).toBe(question.repairedText);
  const errors:string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width:1440, height:1000 });
  await page.goto('/login');
  await page.getByLabel('Token de sesión local').fill(session.token);
  await page.getByRole('button', { name:'Entrar al espacio estratégico' }).click();
  await expect(page.locator('#workspace')).toBeVisible();
  const shots = 'design/brandopolis-ui/reference/phase10a/encoding-proof'; mkdirSync(shots, { recursive:true });
  for (const question of questions) {
    await page.goto(`/?brand=${brandId}&module=${encodeURIComponent(question.module)}`);
    await expect(page.locator('#decision')).toContainText(question.repairedText);
    await page.reload();
    await expect(page.locator('#decision')).toContainText(question.repairedText);
    expect(await page.locator('body').innerText()).not.toMatch(/\u00c3|\u00c2|\u00e2\u20ac|\u00ef\u00bf\u00bd|\ufffd/);
    await page.evaluate(async () => { await document.fonts.ready; });
    await page.screenshot({ path:`${shots}/${question.module.toLowerCase().replaceAll(' ', '-')}-1440.png`, fullPage:true });
  }
  expect(errors).toEqual([]);
});
