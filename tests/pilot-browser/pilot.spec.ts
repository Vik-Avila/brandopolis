import { test,expect } from '@playwright/test';
import { navigate } from '../workspace-nav.js';
import { readFileSync } from 'node:fs';
// Scope access links to the actual OIDC entry and feedback assertions to the live notice.
// Other public CTAs share the same label and independent activities also expose role=status.
// Waits for the signed-in shell (the menu appears with it) before deciding whether the drawer is needed.
test('PILOT HTTPS: entry, first decision, provider outage, brand isolation, feedback and logout',async({page,browser},info)=>{
 const sessions=JSON.parse(readFileSync('.local/pilot-browser/sessions.json','utf8'))[info.project.name],errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.locator('#pilot-entry').getByRole('link',{name:'Entrar al piloto',exact:true})).toBeVisible();await expect(page.getByLabel('Token de sesión local')).toBeHidden();
 await page.context().addCookies([{name:'__Host-brandopolis_session',value:sessions.a.token,url:'https://127.0.0.1:3002',httpOnly:true,secure:true,sameSite:'Strict'}]);await page.reload();
 await page.locator('#new-brand').click();await expect(page.locator('#brand-dialog')).toBeVisible();await page.getByLabel('Nueva marca',{exact:true}).fill(`Pilot A ${info.project.name} ${Date.now()}`);
 await page.getByRole('button',{name:'Crear marca',exact:true}).click();await expect(page.locator('#notice')).toContainText('Marca creada');const a=await page.getByLabel('Marca activa').inputValue();
 await page.getByRole('tab',{name:'Opciones',exact:true}).click();await page.getByRole('button',{name:'Ayúdame a generar posibilidades',exact:true}).click();await expect(page.getByRole('heading',{name:'Antes de pedir una propuesta IA'})).toBeVisible();await expect(page.getByRole('button',{name:'Entiendo y acepto',exact:true})).toBeFocused();await expect(page.locator('#decision')).toContainText('proveedor de IA');// Observe the real fixture outage and prove it did not approve or version strategy.
 const beforeOutageResponse=await page.request.get(`/api/context?brandId=${a}`);expect(beforeOutageResponse.ok()).toBe(true);
 const beforeOutage=await beforeOutageResponse.json();
 const generationResponse=page.waitForResponse(response=>response.url().endsWith('/api/recommendations/generate')&&response.request().method()==='POST');
 await page.keyboard.press('Enter');
 const outage=await generationResponse;expect(outage.status()).toBe(200);
 expect(await outage.json()).toMatchObject({error:'UNAVAILABLE',recommendation:null,provider:'PILOT_UNCONFIGURED'});
 await expect(page.locator('#notice')).toHaveText('No pudimos generar posibilidades en este momento. Puedes continuar con tu propia respuesta o intentarlo nuevamente.');
 const afterOutageResponse=await page.request.get(`/api/context?brandId=${a}`);expect(afterOutageResponse.ok()).toBe(true);
 const afterOutage=await afterOutageResponse.json();
 expect(afterOutage.decisions).toEqual(beforeOutage.decisions);expect(afterOutage.versions).toEqual(beforeOutage.versions);
 await expect(page.getByRole('heading',{name:'Antes de pedir una propuesta IA'})).toHaveCount(0);
  await page.getByRole('tab',{name:'Decisión',exact:true}).click();await page.getByRole('button',{name:'Preparar decisión',exact:true}).click();await page.getByLabel('Tu decisión',{exact:true}).fill('Decisión exclusiva tester A');await page.getByLabel('¿Por qué eliges esta opción?').fill('Criterio humano del piloto');await page.getByRole('button',{name:'Aprobar decisión',exact:true}).click();await expect(page.locator('#decision .current')).toHaveText('Decisión exclusiva tester A');
 await page.locator('#new-brand').click();await expect(page.locator('#brand-dialog')).toBeVisible();await page.getByLabel('Nueva marca',{exact:true}).fill(`Pilot second ${info.project.name} ${Date.now()}`);await page.getByRole('button',{name:'Crear marca',exact:true}).click();await expect(page.locator('#notice')).toContainText('Marca creada');await expect(page.locator('#decision')).not.toContainText('Decisión exclusiva tester A');await page.getByLabel('Marca activa').selectOption(a);await expect(page.locator('#decision .current')).toHaveText('Decisión exclusiva tester A');
 await navigate(page,'Compartir feedback');for(const id of ['usefulness','clarity','confidence'])await page.locator('#feedback-'+id).selectOption('4');await page.getByLabel('Comentario opcional').fill('Fixture de prueba, sin usuarios reales.');await page.getByRole('button',{name:'Enviar feedback',exact:true}).click();await expect(page.locator('#notice')).toContainText('feedback quedó registrado');
 const other=await browser.newContext({ignoreHTTPSErrors:true});await other.addCookies([{name:'__Host-brandopolis_session',value:sessions.b.token,url:'https://127.0.0.1:3002',httpOnly:true,secure:true,sameSite:'Strict'}]);const denial=await other.request.get(`https://127.0.0.1:3002/api/context?brandId=${a}`);expect(denial.status()).toBe(404);await other.close();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);await page.screenshot({path:`test-results/pilot-${info.project.name}.png`,fullPage:true});
 await page.getByRole('button',{name:'Salir',exact:true}).click();await expect(page.locator('#pilot-entry').getByRole('link',{name:'Entrar al piloto',exact:true})).toBeVisible();
});
test('PILOT OIDC: denied identity, real login, onboarding by keyboard, revocation',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const subject=(value:string)=>page.context().addCookies([{name:'fixture_subject',value,url:'https://127.0.0.1:3002'}]);
 await subject('never-provisioned');await page.goto('/auth/login');
 await expect(page).toHaveURL('https://127.0.0.1:3002/');await expect(page.locator('#notice')).toContainText('no tiene acceso');
 await subject('fresh-'+info.project.name);await page.goto('/login');
 // The access view is the keyboard entry point; public gateway CTAs share its label.
 const entry=page.locator('#pilot-entry').getByRole('link',{name:'Entrar al piloto',exact:true});
 await expect(entry).toHaveCount(1);await expect(entry).toHaveAttribute('href','/auth/login');
 for(let i=0;i<30&&!(await entry.evaluate(e=>e===document.activeElement));i++)await page.keyboard.press('Tab');
 await expect(entry).toBeFocused();await page.keyboard.press('Enter');
 await expect(page.getByRole('heading',{name:'Construye tu primera decisión estratégica.'})).toBeVisible();
 const cookies=await page.context().cookies('https://127.0.0.1:3002');const session=cookies.find(c=>c.name==='__Host-brandopolis_session');
 expect(session).toMatchObject({secure:true,httpOnly:true,sameSite:'Strict'});expect(cookies.some(c=>c.name==='__Host-brandopolis_flow')).toBe(false);
 const openBrand=page.locator('#new-brand');
 for(let i=0;i<40&&!(await openBrand.evaluate(e=>e===document.activeElement));i++)await page.keyboard.press('Tab');
 await expect(openBrand).toBeFocused();await page.keyboard.press('Enter');await expect(page.locator('#brand-dialog')).toBeVisible();
 const name=page.getByLabel('Nueva marca',{exact:true});
 for(let i=0;i<40&&!(await name.evaluate(e=>e===document.activeElement));i++)await page.keyboard.press('Tab');
 await expect(name).toBeFocused();await page.keyboard.type(`Keyboard ${info.project.name}`);
 const create=page.getByRole('button',{name:'Crear marca',exact:true});
 for(let i=0;i<10&&!(await create.evaluate(e=>e===document.activeElement));i++)await page.keyboard.press('Tab');
 await expect(create).toBeFocused();expect(await create.evaluate(e=>getComputedStyle(e).outlineStyle)).not.toBe('none');await page.keyboard.press('Enter');
 await expect(page.locator('#notice')).toContainText('Marca creada');
 expect((await page.request.get('/fixture-admin/revoke?subject=fresh-'+info.project.name)).ok()).toBe(true);
 await page.reload();await expect(page.locator('#pilot-entry').getByRole('link',{name:'Entrar al piloto',exact:true})).toBeVisible();
 expect((await page.request.get('/api/brands')).status()).toBe(401);
 expect(errors).toEqual([]);
});
