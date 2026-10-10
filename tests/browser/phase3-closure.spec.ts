import { test,expect,type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { navigate } from '../workspace-nav.js';

// Phase 3 closing pass (owner decisions 2026-10-09): clickable progress, review brief before the choices, Brando's
// alternative first, validation as an optional path, the «no eligible learning» state, white Mapa cards and the
// brand settings danger zone. Deterministic DEMO provider; synthetic brands only.
async function signIn(page:Page,brand:string){
 const session=JSON.parse(readFileSync(process.env.BRANDOPOLIS_SESSION_FILE??'.local/demo-session.json','utf8'));
 await page.goto('/');await page.getByLabel('Token de sesión local').fill(session.token);await page.getByRole('button',{name:'Entrar al espacio estratégico'}).click();
 await page.locator('#workspace').waitFor();await page.locator('#new-brand').click();
 await page.getByLabel('Nueva marca',{exact:true}).fill(brand);
 await page.getByRole('button',{name:'Crear marca',exact:true}).click();
 await expect(page.locator('#decision')).toContainText('Por decidir');
}
async function decide(page:Page,section:string,option:string,button='Preparar decisión'){
 await navigate(page,section);await page.getByRole('button',{name:button,exact:true}).click();
 await page.getByLabel('Tu decisión',{exact:true}).fill(option);await page.getByLabel('¿Por qué eliges esta opción?').fill(`Criterio para ${section}`);
 await page.getByRole('button',{name:'Aprobar decisión',exact:true}).click();await expect(page.locator('#decision .current')).toHaveText(option);
}
const noOverflow=(page:Page)=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
const aiCalls=(page:Page)=>{const calls:string[]=[];page.on('request',r=>{const p=new URL(r.url()).pathname;if(p==='/api/brando/ask'||p==='/api/recommendations/generate')calls.push(p);});return calls;};

test('A+B · a new person builds decisions without experiments and opens any decision from the progress bar',async({page},info)=>{
 test.slow();
 const calls=aiCalls(page);
 await signIn(page,`Progreso ${info.project.name} ${Date.now()}`);
 await decide(page,'01 Objetivo estratégico','Ser la referencia local');
 await decide(page,'02 Mercado objetivo','Cafeterías del centro');
 await navigate(page,'Inicio');
 await expect(page.locator('.next-step')).toContainText('Siguiente decisión');
 const segments=page.locator('.progress-segments button.segment');
 await expect(segments).toHaveCount(9);
 await expect(segments.nth(0)).toHaveAttribute('aria-label','01 · Objetivo estratégico — Definida');
 await expect(segments.nth(3)).toHaveAttribute('aria-label','04 · Modelo de valor — Pendiente');
 // Mouse (or touch on mobile).
 await segments.nth(3).click();
 await expect(page.locator('#decision .decision-title')).toHaveText('Modelo de valor');
 // Keyboard.
 await navigate(page,'Inicio');
 await page.locator('.progress-segments button.segment').nth(1).focus();
 await page.keyboard.press('Enter');
 await expect(page.locator('#decision .decision-title')).toHaveText('Mercado objetivo');
 expect(calls,'the progress bar never asks the AI').toEqual([]);
 expect(await noOverflow(page)).toBe(true);
});

test('C+D · a review first shows the decision under review, why, and which change caused it; then the choices',async({page},info)=>{
 test.slow();
 await signIn(page,`Revisión ${info.project.name} ${Date.now()}`);
 await decide(page,'02 Mercado objetivo','Agencias en LATAM');
 await decide(page,'03 Cliente principal','Agencias');
 await decide(page,'05 Posicionamiento','Strategic OS para agencias');
 await decide(page,'03 Cliente principal','Equipos internos de marketing','Preparar nueva versión');
 await navigate(page,'05 Posicionamiento');
 await page.getByRole('button',{name:'Iniciar revisión',exact:true}).click();
 const title=page.locator('#review-brief-title');
 await expect(title).toHaveText('Estás revisando Posicionamiento porque cambiaste Cliente principal.');
 await expect(title).toBeFocused();
 const brief=page.locator('.review-brief');
 await expect(brief).toContainText('Esta decisión necesita tu revisión.');
 await expect(brief.locator('.review-brief-current .current')).toHaveText('Strategic OS para agencias');
 await expect(brief).toContainText('Cliente principal cambió: versión 1 → 2.');
 await expect(brief.locator('.review-origin-item')).toContainText('Antes · v1');
 await expect(brief.locator('.review-origin-item')).toContainText('Agencias');
 await expect(brief.locator('.review-origin-item')).toContainText('Ahora · v2');
 await expect(brief.locator('.review-origin-item')).toContainText('Equipos internos de marketing');
 // The choices come after the explanation, in reading order.
 const order=await page.evaluate(()=>{const a=document.querySelector('#review-brief-title'),b=document.querySelector('#review-choice-title');return !!(a&&b&&(a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING));});
 expect(order).toBe(true);
 // Keep without changes: the decision is confirmed, not rewritten.
 await page.getByRole('button',{name:'Mantener sin cambios',exact:true}).click();
 await page.getByLabel('¿Por qué eliges esta opción?').fill('Sigue siendo válida para equipos internos');
 await page.getByRole('button',{name:'Confirmar revisión',exact:true}).click();
 await expect(page.locator('#decision .current')).toHaveText('Strategic OS para agencias');
 await expect(page.locator('#decision')).not.toContainText('Requiere revisión');
 expect(await noOverflow(page)).toBe(true);
});

test('E · Brando shows the proposed alternative first, in bold and unapproved',async({page},info)=>{
 test.skip(['tablet','mobile'].includes(info.project.name),'Desktop rail; the mobile drawer is covered by the Brando suite.');
 await signIn(page,`Brando alternativa ${info.project.name} ${Date.now()}`);
 await decide(page,'01 Objetivo estratégico','Ser la referencia local');
 const versions=await page.evaluate(async()=>{const brand=new URL(location.href).searchParams.get('brand');const c=await (await fetch(`/api/context?brandId=${brand}`)).json();return c.versions.length;});
 await page.locator('.rail-tools [data-rail-tool="brando"]').click();
 await page.locator('#brando-message').fill('¿Qué alternativa me propones?');await page.locator('#brando-submit').click();
 const turn=page.locator('#brando-conversation .brando-turn').first();
 await expect(turn.locator('.brando-proposal').first()).toBeVisible();
 await expect(turn.locator('.brando-proposal-label').first()).toContainText('Alternativa propuesta');
 await expect(turn.locator('.brando-proposal-label').first()).toContainText('Sin aprobar');
 await expect(turn.locator('.brando-proposal-text strong').first()).not.toBeEmpty();
 const first=await turn.evaluate(el=>{const p=el.querySelector('.brando-proposal'),w=el.querySelector('.brando-why');return !!(p&&w&&(p.compareDocumentPosition(w)&Node.DOCUMENT_POSITION_FOLLOWING));});
 expect(first,'the alternative comes before the explanation').toBe(true);
 await expect(turn.locator('.brando-more')).not.toHaveAttribute('open','');
 const after=await page.evaluate(async()=>{const brand=new URL(location.href).searchParams.get('brand');const c=await (await fetch(`/api/context?brandId=${brand}`)).json();return c.versions.length;});
 expect(after,'asking Brando never creates a version').toBe(versions);
});

test('F · validation is an optional path in four plain steps',async({page},info)=>{
 await signIn(page,`Validación opcional ${info.project.name} ${Date.now()}`);
 await navigate(page,'Validación');
 await expect(page.locator('#decision h2').first()).toHaveText('Pon tus ideas a prueba');
 await expect(page.locator('#decision')).toContainText('No necesitas hacerlo todo ahora.');
 const steps=page.locator('.validation-path-step');
 await expect(steps).toHaveText([/¿Qué quieres comprobar\?/,/¿Cómo lo probarás\?/,/¿Qué ocurrió\?/,/¿Qué aprendiste\?/]);
 await steps.nth(3).click();
 await expect(page.getByRole('tab',{name:/^Aprendizajes/})).toHaveAttribute('aria-selected','true');
 await steps.nth(1).click();
 await expect(page.getByRole('tab',{name:'Experimentos',exact:true})).toHaveAttribute('aria-selected','true');
 // The strategy keeps moving without any experiment.
 await decide(page,'01 Objetivo estratégico','Avanzar sin experimentos');
 expect(await noOverflow(page)).toBe(true);
});

test('I · the nine Mapa cards are white and each opens its decision',async({page},info)=>{
 await signIn(page,`Mapa blanco ${info.project.name} ${Date.now()}`);
 await navigate(page,'Mapa estratégico');
 const cells=page.locator('.map-cell');
 await expect(cells).toHaveCount(9);
 expect(await cells.first().evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(255, 255, 255)');
 expect(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor)).not.toBe('rgb(255, 255, 255)');
 await cells.nth(2).getByRole('button',{name:/Abrir|Definir|Revisar/}).first().click();
 await expect(page.locator('#decision .decision-title')).toHaveText('Cliente principal');
});

test('H · brand settings: the danger zone deletes only the confirmed synthetic brand',async({page},info)=>{
 test.slow();
 const keep=`Conservar ${info.project.name} ${Date.now()}`;
 await signIn(page,keep);
 await decide(page,'01 Objetivo estratégico','Objetivo que debe sobrevivir');
 const doomed=`Eliminar ${info.project.name} ${Date.now()}`;
 await page.locator('#new-brand').click();await page.getByLabel('Nueva marca',{exact:true}).fill(doomed);await page.getByRole('button',{name:'Crear marca',exact:true}).click();
 await expect(page.locator('#brands option:checked')).toHaveText(doomed);
 await navigate(page,'Configuración de marca');
 await expect(page.locator('#decision h2').first()).toHaveText(doomed);
 await page.locator('#delete-brand-details > summary').click();
 const confirm=page.getByLabel('Escribe el nombre exacto de la marca para confirmar');
 const submit=page.getByRole('button',{name:'Eliminar marca definitivamente',exact:true});
 await expect(submit).toBeDisabled();
 await confirm.fill(doomed.toLowerCase());
 await expect(submit,'a different name never enables deletion').toBeDisabled();
 await page.getByRole('button',{name:'Cancelar',exact:true}).click();
 await expect(page.locator('#delete-brand-details')).not.toHaveAttribute('open','');
 await page.locator('#delete-brand-details > summary').click();
 await confirm.fill(doomed);
 await expect(submit).toBeEnabled();
 await submit.click();
 await expect(page.locator('#notice')).toContainText(`Eliminaste ${doomed}`);
 await expect(page.locator('#brands option',{hasText:doomed})).toHaveCount(0);
 await expect(page.locator('#workspace')).toBeVisible();
 // The other brand is intact.
 const other=await page.locator('#brands option',{hasText:keep}).first().getAttribute('value');
 await page.selectOption('#brands',other!);
 await navigate(page,'01 Objetivo estratégico');
 await expect(page.locator('#decision .current')).toHaveText('Objetivo que debe sobrevivir');
 expect(await noOverflow(page)).toBe(true);
});
