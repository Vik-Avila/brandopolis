import { test,expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
test('isolated one-command boot exposes a usable persistent competition demo',async({page,request})=>{
  const session=JSON.parse(readFileSync('.local/rc1-smoke/demo-session.json','utf8')),demo=JSON.parse(readFileSync('.local/rc1-smoke/competition-demo.json','utf8'));
  const health=await request.get('/health');expect(health.status()).toBe(200);expect(await health.json()).toEqual({application:'brandopolis-competition',protocol:'rc1',status:'ready'});
  await page.goto(demo.url);await page.getByLabel('Token de sesión local').fill(session.token);await page.getByRole('button',{name:'Entrar al espacio estratégico'}).click();await expect(page.locator('#decision .current')).toHaveText('Equipos internos de marketing');
  await page.getByRole('button',{name:'Abrir navegación',exact:true}).click();await page.getByRole('button',{name:'Blueprint estratégico',exact:true}).click();
  await expect(page.locator('#decision')).toContainText('La recurrencia es una hipótesis');await expect(page.locator('#decision')).toContainText('Continuidad estratégica para equipos internos');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/rc1-fresh-boot-mobile.png',fullPage:true});await page.reload();await expect(page.locator('#decision .current')).toHaveText('Equipos internos de marketing');
});
