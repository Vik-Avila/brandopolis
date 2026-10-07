import { test,expect,type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

// ADR-0025 · Strategic Intelligence and the Focusable Intelligent Strategic Workspace (UX JTBD A–D).
async function navigate(page:Page,name:string){await page.locator('#workspace').waitFor();const menu=page.getByRole('button',{name:'Abrir navegación',exact:true});if(await menu.isVisible())await menu.click();await page.getByRole('button',{name,exact:true}).click();}
async function signIn(page:Page,brand:string,geography=true){
 const session=JSON.parse(readFileSync(process.env.BRANDOPOLIS_SESSION_FILE??'.local/demo-session.json','utf8'));
 await page.goto('/');await page.getByLabel('Token de sesión local').fill(session.token);await page.getByRole('button',{name:'Entrar al espacio estratégico'}).click();
 await page.locator('#workspace').waitFor();await page.locator('#new-brand').click();
 await page.getByLabel('Nueva marca',{exact:true}).fill(brand);
 if(geography){await page.locator('#brand-geography').selectOption('LOCAL');await page.locator('#brand-market').fill('Xalapa, Veracruz');}
 await page.getByRole('button',{name:'Crear marca',exact:true}).click();
 await expect(page.locator('#decision')).toContainText('Por decidir');
}
async function decide(page:Page,section:string,option:string,button='Preparar decisión'){
 await navigate(page,section);await page.getByRole('button',{name:button,exact:true}).click();
 await page.getByLabel('Tu decisión',{exact:true}).fill(option);await page.getByLabel('¿Por qué eliges esta opción?').fill(`Criterio para ${section}`);
 await page.getByRole('button',{name:'Aprobar decisión',exact:true}).click();await expect(page.locator('#decision .current')).toHaveText(option);
}

test('B · Market Arena shows the declared market as context, never as the decision, without querying the AI',async({page},info)=>{
 const asks:string[]=[];page.on('request',r=>{if(new URL(r.url()).pathname==='/api/brando/ask')asks.push(r.url());});
 await signIn(page,`Arena contexto ${info.project.name} ${Date.now()}`);
 await navigate(page,'02 Arena de mercado');
 const card=page.locator('#decision .declared-context');
 await expect(card).toContainText('Lo que ya sabemos de tu marca');
 await expect(card).toContainText('Local / ciudad');
 await expect(card).toContainText('Xalapa, Veracruz');
 await expect(card).toContainText('no tu Arena de mercado');
 await expect(page.locator('#decision')).toContainText('Por decidir');
 await expect(page.locator('#decision .current')).toHaveCount(0);
 expect(asks,'navigation never queries the provider').toEqual([]);
});

test('Strategic Intelligence summary explains review order and asks Brando only on click',async({page},info)=>{
 const asks:string[]=[];page.on('request',r=>{if(new URL(r.url()).pathname==='/api/brando/ask')asks.push(r.url());});
 await signIn(page,`Inteligencia ${info.project.name} ${Date.now()}`,false);
 await decide(page,'03 Cliente principal','Agencias pequeñas');
 await decide(page,'05 Posicionamiento','Continuidad estratégica');
 await decide(page,'03 Cliente principal','Equipos internos','Preparar nueva versión');
 await navigate(page,'Qué necesita atención');
 const summary=page.locator('.intelligence-summary');
 await expect(summary).toContainText('Coherencia de tu estrategia');
 await expect(summary).toContainText('sin consulta a la IA');
 await expect(summary.locator('.intelligence-step').first()).toContainText('Posicionamiento');
 await expect(summary.locator('.intelligence-step').first()).toContainText('Revisión obligatoria');
 await expect(summary.locator('.intelligence-step').first()).toContainText('Cliente principal cambió a la versión 2');
 expect(asks).toEqual([]);
 await page.locator('#intelligence-ask-brando').click();
 await expect(page.locator('#brando-conversation .brando-turn')).toHaveCount(1);
 expect(asks).toHaveLength(1);
});

test('A · disclosures are labelled next to their title and open by click or keyboard',async({page},info)=>{
 await signIn(page,`Disclosures ${info.project.name} ${Date.now()}`,false);
 await navigate(page,'03 Cliente principal');
 const details=page.locator('#decision details.learning-moment').first();
 const summary=details.locator(':scope > summary');
 await summary.scrollIntoViewIfNeeded();
 expect(await summary.evaluate(el=>getComputedStyle(el,'::after').content)).toContain('Mostrar');
 // The pill sits right after the title (fixed small gap), never pushed to the far edge like the old isolated "+".
 expect(await summary.evaluate(el=>getComputedStyle(el,'::after').marginLeft),'the indicator follows the title').toBe('4px');
 await expect(details).not.toHaveAttribute('open','');
 await summary.click();
 await expect(details).toHaveAttribute('open','');
 expect(await summary.evaluate(el=>getComputedStyle(el,'::after').content)).toContain('Ocultar');
 await summary.focus();await page.keyboard.press('Enter');
 await expect(details).not.toHaveAttribute('open','');
 expect((await summary.boundingBox())!.height).toBeGreaterThanOrEqual(40);
});

test('C · panels collapse independently into Focus Mode and keep drafts and state',async({page},info)=>{
 test.skip(['tablet','mobile'].includes(info.project.name),'Below 1001px the journey is a drawer and the rail stacks; the controls are intentionally hidden.');
 await signIn(page,`Paneles ${info.project.name} ${Date.now()}`,false);
 await navigate(page,'03 Cliente principal');
 await page.getByRole('button',{name:'Preparar decisión',exact:true}).click();
 await page.getByLabel('Tu decisión',{exact:true}).fill('Borrador que debe sobrevivir');
 const width=()=>page.locator('.primary-workspace').evaluate(el=>el.getBoundingClientRect().width);
 const before=await width();
 const right=page.locator('#toggle-rail');
 await expect(right).toHaveAttribute('aria-expanded','true');
 await right.click();
 await expect(right).toHaveAttribute('aria-expanded','false');
 await expect(page.locator('#intelligence-rail')).toBeHidden();
 expect(await width(),'the centre gains the rail width').toBeGreaterThan(before);
 const left=page.locator('#toggle-journey');
 if(await left.isVisible()){
  await left.click();
  await expect(left).toHaveAttribute('aria-expanded','false');
  await expect(page.locator('#journey')).toBeHidden();
  await expect(page.locator('.focus-mode-label')).toBeVisible();
 }
 await expect(page.getByLabel('Tu decisión',{exact:true})).toHaveValue('Borrador que debe sobrevivir');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 // Changing module does not reopen panels; reload keeps them for the session.
 await page.reload();await page.locator('#workspace').waitFor();
 await expect(right).toHaveAttribute('aria-expanded','false');
 await expect(page.locator('#intelligence-rail')).toBeHidden();
 await right.click();if(await left.isVisible()&&(await left.getAttribute('aria-expanded'))==='false')await left.click();
 await expect(page.locator('#intelligence-rail')).toBeVisible();
 await expect(page.locator('.focus-mode-label')).toBeHidden();
});

test('D · Brando uses its brighter functional emerald without recolouring the product',async({page},info)=>{
 await signIn(page,`Brando ${info.project.name} ${Date.now()}`,false);
 const colors=await page.evaluate(()=>{const css=getComputedStyle(document.documentElement);return {brando:css.getPropertyValue('--bp-brando-emerald').trim(),brand:css.getPropertyValue('--bp-brand-emerald').trim(),primary:getComputedStyle(document.querySelector('#new-brand')!).backgroundColor};});
 expect(colors.brando.toUpperCase()).toBe('#0E7A52');
 expect(colors.brand.toUpperCase(),'the brand emerald is unchanged').toBe('#0B6847');
 const card=page.locator('#brando-card');
 if(await card.isVisible())expect(await card.evaluate(el=>getComputedStyle(el).borderLeftColor)).toBe('rgb(14, 122, 82)');
 await expect(card).toHaveAttribute('data-state',/idle|attention|ready|consulting|unavailable/);
});
