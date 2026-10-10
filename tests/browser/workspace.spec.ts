import { test,expect,type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { navigate } from '../workspace-nav.js';

// ADR-0027 · Strategic Workspace (owner decision 2026-10-08): navigation, both collapsible sides, the unified rail,
// Focus Mode, Mercado objetivo and Mi aprendizaje. Deterministic DEMO provider; any AI request is counted.
async function signIn(page:Page,brand:string){
 const session=JSON.parse(readFileSync(process.env.BRANDOPOLIS_SESSION_FILE??'.local/demo-session.json','utf8'));
 await page.goto('/');await page.getByLabel('Token de sesión local').fill(session.token);await page.getByRole('button',{name:'Entrar al espacio estratégico'}).click();
 await page.locator('#workspace').waitFor();await page.locator('#new-brand').click();
 await page.getByLabel('Nueva marca',{exact:true}).fill(brand);
 await page.locator('#brand-geography').selectOption('NATIONAL');await page.locator('#brand-market').fill('México');
 await page.getByRole('button',{name:'Crear marca',exact:true}).click();
 await expect(page.locator('#decision')).toContainText('Por decidir');
}
async function decide(page:Page,section:string,option:string){
 await navigate(page,section);await page.getByRole('button',{name:'Preparar decisión',exact:true}).click();
 await page.getByLabel('Tu decisión',{exact:true}).fill(option);await page.getByLabel('¿Por qué eliges esta opción?').fill(`Criterio para ${section}`);
 await page.getByRole('button',{name:'Aprobar decisión',exact:true}).click();await expect(page.locator('#decision .current')).toHaveText(option);
}
const desktopOnly=(name:string)=>test.skip(['tablet','mobile'].includes(name),'Below 1001px the rail is a drawer and the navigation is a drawer; covered by the mobile test.');
const aiCalls=(page:Page)=>{const calls:string[]=[];page.on('request',r=>{const p=new URL(r.url()).pathname;if(p==='/api/brando/ask'||p==='/api/recommendations/generate')calls.push(p);});return calls;};
const noOverflow=(page:Page)=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);

test('Inicio: one next step, real 9-segment progress and decision vs observation, without asking the AI',async({page},info)=>{
 test.slow();
 const calls=aiCalls(page);
 await signIn(page,`Inicio ${info.project.name} ${Date.now()}`);
 await decide(page,'01 Objetivo estratégico','Ser la referencia de consultoría de marca');
 await navigate(page,'Inicio');
 await expect(page.locator('#home')).toHaveAttribute('aria-current','page');
 await expect(page.locator('#decision h2').first()).toHaveText('Tu siguiente paso');
 await expect(page.locator('.next-step h3')).toHaveText('Define tu mercado objetivo');
 await expect(page.locator('.strategy-progress')).toContainText('1 de 9 decisiones definidas');
 await expect(page.locator('.progress-segments li')).toHaveCount(9);
 await expect(page.locator('.progress-segments li.is-defined')).toHaveCount(1);
 await expect(page.locator('#strategy-count')).toHaveText('1/9');
 await expect(page.locator('.home-attention')).toContainText('Sin revisiones obligatorias pendientes');
 await page.locator('#next-step-action').click();
 await expect(page.locator('#decision .decision-title')).toHaveText('Mercado objetivo');
 expect(calls,'navigation never asks the AI').toEqual([]);
 expect(await noOverflow(page)).toBe(true);
});

test('Navigation: Estrategia group, Mercado objetivo, three «Próximamente» non-destinations, Mi aprendizaje, Mapa and Ayuda',async({page},info)=>{
 await signIn(page,`Menu ${info.project.name} ${Date.now()}`);
 const menu=page.getByRole('button',{name:'Abrir navegación',exact:true});
 if(await menu.isVisible())await menu.click();
 const nav=page.locator('#journey');
 await expect(nav.locator('#strategy-toggle')).toHaveAttribute('aria-expanded','true');
 await expect(nav.locator('[data-module]')).toHaveText(['01 Objetivo estratégico','02 Mercado objetivo','03 Cliente principal','04 Modelo de valor','05 Posicionamiento','06 Promesa de marca','07 Mensaje principal','08 Prioridad de lanzamiento','09 Experimento prioritario']);
 await nav.locator('#strategy-toggle').click();
 await expect(nav.locator('#strategy-list')).toBeHidden();
 await expect(nav.locator('#strategy-toggle')).toHaveAttribute('aria-expanded','false');
 await nav.locator('#strategy-toggle').click();
 await expect(nav.locator('#strategy-list')).toBeVisible();
 for(const name of ['Productos y servicios','Plan de marketing','Resultados']){
  const item=nav.locator('[data-soon]',{hasText:name});
  await expect(item).toHaveAttribute('aria-disabled','true');
  await expect(item).toContainText('Próximamente');
  const before=await page.locator('#decision').innerHTML();
  await item.click({force:true});
  expect(await page.locator('#decision').innerHTML(),`${name} never opens a screen`).toBe(before);
 }
 await nav.getByRole('button',{name:'Mi aprendizaje',exact:true}).click();
 await expect(page.locator('#practice')).toHaveAttribute('aria-current','page');
 await expect(page.locator('#learning-loop')).not.toHaveAttribute('aria-current','page');
 await navigate(page,'Ayuda');
 await expect(page.locator('#decision')).toContainText('Mercado objetivo');
 await expect(page.locator('#decision')).toContainText('ámbito geográfico');
 await navigate(page,'Mapa estratégico');
 await expect(page.locator('.map-cell')).toHaveCount(9);
 await expect(page.locator('.map-cell').nth(1)).toContainText('Mercado objetivo');
 expect(await noOverflow(page)).toBe(true);
});

test('Mercado objetivo: plain question, declared geography as context only, internal key unchanged',async({page},info)=>{
 await signIn(page,`Mercado ${info.project.name} ${Date.now()}`);
 await navigate(page,'02 Mercado objetivo');
 await expect(page.locator('#decision .decision-question')).toHaveText('¿En qué mercado quieres competir?');
 await expect(page.locator('#decision .declared-context')).toContainText('México');
 await expect(page.locator('#decision .declared-context')).toContainText('no tu Mercado objetivo');
 await expect(page.locator('#decision')).toContainText('Por decidir');
 await expect(page).toHaveURL(/module=Market%20Arena/);
 await expect(page.locator('#journey [data-module="Market Arena"]')).toHaveAttribute('aria-current','page');
 await navigate(page,'03 Cliente principal');
 await expect(page.locator('#decision .decision-question')).toHaveText('Dentro de ese mercado, ¿a qué tipo de cliente atenderás primero?');
});

test('Left navigation collapses to icons with tooltips, keeps the draft and the session state',async({page},info)=>{
 desktopOnly(info.project.name);
 test.skip(info.project.name==='compact'&&(page.viewportSize()?.width??0)<1280,'The left side is a drawer below 1280px.');
 await signIn(page,`Lateral ${info.project.name} ${Date.now()}`);
 await navigate(page,'03 Cliente principal');
 await page.getByRole('button',{name:'Preparar decisión',exact:true}).click();
 await page.getByLabel('Tu decisión',{exact:true}).fill('Borrador que sobrevive');
 const width=()=>page.locator('.primary-workspace').evaluate(el=>el.getBoundingClientRect().width);
 const before=await width();
 const toggle=page.locator('#toggle-journey');
 await toggle.click();
 await expect(toggle).toHaveAttribute('aria-expanded','false');
 await expect(toggle).toHaveAttribute('aria-label','Expandir navegación');
 await expect(page.locator('#journey')).toBeVisible();
 await expect(page.locator('#home')).toBeVisible();
 await expect(page.locator('#journey .nav-label').first()).toHaveCSS('position','absolute');
 expect(await width(),'the centre gains space').toBeGreaterThan(before);
 await expect(page.locator('#strategy-toggle')).toHaveClass(/contains-current/);
 await page.locator('#learning-loop').hover();
 await expect.poll(()=>page.locator('#learning-loop').evaluate(el=>getComputedStyle(el,'::after').content)).toContain('Validación');
 // Keyboard: Tab onto an icon-only item shows the same tooltip (focus-visible).
 await page.locator('#home').focus();await page.keyboard.press('Tab');
 await expect.poll(()=>page.evaluate(()=>getComputedStyle(document.activeElement!,'::after').content)).not.toBe('none');
 await expect(page.getByLabel('Tu decisión',{exact:true})).toHaveValue('Borrador que sobrevive');
 await page.reload();await page.locator('#workspace').waitFor();
 await expect(page.locator('#toggle-journey')).toHaveAttribute('aria-expanded','false');
 await page.locator('#toggle-journey').click();
 await expect(page.locator('#toggle-journey')).toHaveAttribute('aria-expanded','true');
});

test('Right rail: one tool at a time, Brando keeps its answer across Contexto/Atención/Historial, no automatic AI, Focus Mode',async({page},info)=>{
 desktopOnly(info.project.name);
 test.slow();
 await signIn(page,`Rail ${info.project.name} ${Date.now()}`);
 await decide(page,'01 Objetivo estratégico','Ser la referencia');
 const calls=aiCalls(page);
 const tool=(name:string)=>page.locator(`.rail-tools [data-rail-tool="${name}"]`);
 for(const name of ['brando','context','attention','history']){await expect(tool(name)).toBeVisible();await expect(tool(name)).toHaveAttribute('aria-label',/\S/);}
 await tool('context').click();
 await expect(page.locator('#rail-panel')).toBeVisible();
 await expect(page.locator('#rail-panel-title')).toHaveText('Contexto');
 await expect(page.locator('[data-rail-panel="context"]')).toBeVisible();
 await expect(page.locator('[data-rail-panel="attention"]')).toBeHidden();
 await tool('attention').click();
 await expect(page.locator('[data-rail-panel="attention"] .intelligence-summary')).toBeVisible();
 await expect(page.locator('[data-rail-panel="context"]')).toBeHidden();
 await tool('history').click();
 await expect(page.locator('#rail-history')).toContainText('Objetivo estratégico');
 expect(calls,'opening the rail and switching tools never asks the AI').toEqual([]);
 // Brando: one explicit question, then switch tools and come back: the answer is still there.
 await tool('brando').click();
 await expect(page.locator('#brando-dialog')).toBeVisible();
 await expect(page.locator('#rail-panel')).toBeHidden();
 await page.locator('#brando-message').fill('¿Qué decidimos y por qué?');await page.locator('#brando-submit').click();
 await expect(page.locator('#brando-conversation .brando-turn')).toHaveCount(1);
 expect(calls).toEqual(['/api/brando/ask']);
 await tool('context').click();
 await expect(page.locator('#brando-dialog')).toBeHidden();
 await tool('attention').click();await tool('history').click();await tool('brando').click();
 await expect(page.locator('#brando-conversation .brando-turn'),'the answer survives switching tools').toHaveCount(1);
 expect(calls,'coming back to Brando never re-asks').toEqual(['/api/brando/ask']);
 await page.keyboard.press('Escape');
 await expect(page.locator('#brando-dialog')).toBeHidden();
 await expect(page.locator('#toggle-rail')).toHaveAttribute('aria-expanded','false');
 // Focus Mode: both sides collapsed keep the same workspace, with the rail icons still available.
 if(await page.locator('#toggle-journey').isVisible()){
  await page.locator('#toggle-journey').click();
  await expect(page.locator('.focus-mode-label')).toBeVisible();
  await expect(tool('brando')).toBeVisible();
  await page.locator('#toggle-journey').click();
 }
 expect(await noOverflow(page)).toBe(true);
});

test('Mi aprendizaje: practice and private reflections; saving one changes no strategy and never asks the AI',async({page},info)=>{
 test.slow();
 const calls=aiCalls(page);
 await signIn(page,`Reflexión ${info.project.name} ${Date.now()}`);
 await decide(page,'01 Objetivo estratégico','Ser la referencia');
 const strategy=await page.evaluate(async()=>{const brand=(document.querySelector('#brands') as HTMLSelectElement).value;const c=await (await fetch(`/api/context?brandId=${brand}`)).json();return JSON.stringify([c.decisions,c.versions,c.reviews,c.hypotheses,c.learnings]);});
 await navigate(page,'Mi aprendizaje');
 await expect(page.getByRole('tab',{name:'Mi práctica'})).toHaveAttribute('aria-selected','true');
 await expect(page.locator('#lpanel-practice')).toContainText('Precisaste');
 await page.getByRole('tab',{name:'Mis reflexiones'}).click();
 // Reflections belong to the person (not the brand): earlier runs of the same DEMO user may already have some.
 const existing=await page.locator('.reflection-list li').count();
 await page.getByRole('button',{name:'Guardar reflexión'}).click();
 await expect(page.locator('#notice')).toContainText('Escribe al menos una respuesta');
 const xss='<img src=x onerror=window.__xss=1> Aprendí a delimitar el mercado';
 await page.getByLabel('¿Qué cambió en tu forma de pensar?').fill(xss);
 await page.getByLabel('¿Qué harías diferente la próxima vez?').fill('Separar lo que sé de lo que debo validar');
 await page.getByLabel('Vincular con (opcional)').selectOption({label:'Objetivo estratégico'});
 const save=page.getByRole('button',{name:'Guardar reflexión'});
 await save.dblclick();
 await expect(page.locator('#notice')).toContainText('Reflexión guardada');
 await expect(page.getByRole('tab',{name:'Mis reflexiones'})).toHaveAttribute('aria-selected','true');
 await expect(page.locator('.reflection-list li'),'double submit stores one reflection').toHaveCount(existing+1);
 const newest=page.locator('.reflection-list li').first();
 await expect(newest).toContainText('<img src=x onerror=window.__xss=1>');
 expect(await page.evaluate(()=>(window as unknown as {__xss?:number}).__xss)).toBeUndefined();
 await expect(newest).toContainText('Objetivo estratégico');
 const after=await page.evaluate(async()=>{const brand=(document.querySelector('#brands') as HTMLSelectElement).value;const c=await (await fetch(`/api/context?brandId=${brand}`)).json();return JSON.stringify([c.decisions,c.versions,c.reviews,c.hypotheses,c.learnings]);});
 expect(after,'a reflection never changes Brand Context').toBe(strategy);
 expect(calls).toEqual([]);
 expect(await noOverflow(page)).toBe(true);
});

test('Login with an unreachable server says the server is down, never «borrador»',async({page})=>{
 await page.goto('/');
 await page.route('**/api/session',route=>route.abort('connectionrefused'));
 await page.getByLabel('Token de sesión local').fill('token-de-prueba');
 await page.getByRole('button',{name:'Entrar al espacio estratégico'}).click();
 await expect(page.locator('#notice')).toContainText('el servidor no responde');
 await expect(page.locator('#notice')).not.toContainText('borrador');
 await expect(page.locator('#workspace')).toBeHidden();
});

test('Mobile: navigation and tools are drawers with focus, Escape and focus return',async({page},info)=>{
 test.skip(!['mobile','tablet'].includes(info.project.name),'Drawer behaviour below 1001px.');
 await signIn(page,`Movil ${info.project.name} ${Date.now()}`);
 const opener=page.locator('.mobile-tools [data-rail-tool="attention"]');
 await expect(opener).toBeVisible();
 await expect(page.locator('.rail-tools')).toBeHidden();
 await opener.click();
 await expect(page.locator('#rail-panel')).toBeVisible();
 await expect(page.locator('#close-rail-panel')).toBeFocused();
 await page.keyboard.press('Escape');
 await expect(page.locator('#rail-panel')).toBeHidden();
 await expect(opener).toBeFocused();
 await page.getByRole('button',{name:'Abrir navegación',exact:true}).click();
 await expect(page.locator('#journey [data-module]')).toHaveCount(9);
 await page.keyboard.press('Escape');
 expect(await noOverflow(page)).toBe(true);
});

// ADR-0028 · editorial refinement: decision first, Brando subordinate, one journey line, two documents to choose from.
const NINE=['01 Objetivo estratégico','02 Mercado objetivo','03 Cliente principal','04 Modelo de valor','05 Posicionamiento','06 Promesa de marca','07 Mensaje principal','08 Prioridad de lanzamiento','09 Experimento prioritario'];
test('Every decision reads title · question · main card · compact Brando card, without asking the AI',async({page},info)=>{
 test.slow();
 const calls=aiCalls(page);
 await signIn(page,`Jerarquía ${info.project.name} ${Date.now()}`);
 await decide(page,'01 Objetivo estratégico','Objetivo para la jerarquía');
 for(const section of NINE){
  await navigate(page,section);
  const brando=page.locator('#decision #brando-section.brando-aux');
  await expect(brando,section).toBeVisible();
  await expect(page.locator('#brando-section-explore')).toHaveText(/Explorar con Brando|Ver propuestas de esta sección/);
  const order=await page.evaluate(()=>{
   const main=document.querySelector('#panel-overview > .human-decision, #panel-overview > .decision-form, #panel-overview > .empty');
   const brando=document.querySelector('#brando-section'),title=document.querySelector('#decision .decision-title');
   const follows=(a:Element|null,b:Element|null)=>!!a&&!!b&&!!(a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING);
   return {titleBeforeMain:follows(title,main),mainBeforeBrando:follows(main,brando),titleSize:parseFloat(getComputedStyle(title!).fontSize)};
  });
  expect(order.titleBeforeMain,section).toBe(true);
  expect(order.mainBeforeBrando,`${section}: Brando comes after the main card`).toBe(true);
  expect(order.titleSize,`${section}: decision title stays in the 26–34px scale`).toBeLessThanOrEqual(34.5);
  expect(order.titleSize).toBeGreaterThanOrEqual(25.5);
  expect(await noOverflow(page),section).toBe(true);
 }
 expect(calls).toEqual([]);
});

test('The nine strategy nodes are joined by one fine vertical line with decided and current states',async({page},info)=>{
 desktopOnly(info.project.name);
 await signIn(page,`Línea ${info.project.name} ${Date.now()}`);
 await decide(page,'01 Objetivo estratégico','Objetivo para la línea');
 await navigate(page,'02 Mercado objetivo');
 const line=await page.locator('#journey .strategy-list').evaluate(list=>{const s=getComputedStyle(list,'::before');return {content:s.content,width:s.width,position:s.position};});
 expect(line.content).not.toBe('none');
 expect(line.width).toBe('1px');
 await expect(page.locator('#journey .strategy-list button[data-module]')).toHaveCount(9);
 await expect(page.locator('#journey .strategy-list button[data-module].is-decided')).toHaveCount(1);
 await expect(page.locator('#journey .strategy-list button[data-module][aria-current]')).toHaveCount(1);
});

test('Mapa estratégico offers two documents with their purpose; the Brand Book downloads as a real PDF',async({page},info)=>{
 await signIn(page,`Libro ${info.project.name} ${Date.now()}`);
 await navigate(page,'Mapa estratégico');
 const documents=page.locator('#map-documents');
 await expect(documents.locator('.map-document')).toHaveCount(2);
 await expect(documents).toContainText('Mapa estratégico ejecutivo');
 await expect(documents).toContainText('Brand Book integral');
 await expect(documents).toContainText('No incluyen propuestas de IA ni reflexiones personales');
 const [download]=await Promise.all([page.waitForEvent('download',{timeout:60000}),page.locator('#brandbook-pdf').click()]);
 expect(download.suggestedFilename()).toMatch(/^Brandopolis-Brand-Book-[a-z0-9-]+-\d{4}-\d{2}-\d{2}\.pdf$/);
 const bytes=readFileSync(await download.path());
 expect(bytes.subarray(0,5).toString('latin1')).toBe('%PDF-');
 await expect(page.locator('#brandbook-pdf')).toHaveText('Descargar PDF');
 await expect(page.locator('#notice')).toContainText('Brand Book descargado');
 expect(await noOverflow(page)).toBe(true);
});
