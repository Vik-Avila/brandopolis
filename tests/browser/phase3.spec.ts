import { test,expect,type Page } from '@playwright/test';
import { navigate } from '../workspace-nav.js';
import { readFileSync } from 'node:fs';

// ADR-0026 · Validation & Learning Engine: Hipótesis → Experimento → Señales → Aprendizaje → Impacto.
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
async function hypothesis(page:Page,text:string){
 await navigate(page,'Contexto estratégico');await page.getByLabel('Tipo de aportación').selectOption('hypothesis');await page.getByLabel('Contenido',{exact:true}).fill(text);
 await page.getByRole('button',{name:'Guardar contexto',exact:true}).click();await expect(page.locator('#decision')).toContainText(text);
}
async function plan(page:Page,signal:string,disconfirming=true,open=true){
 if(open)await navigate(page,'Validación');
 await page.getByRole('tab',{name:'Experimentos',exact:true}).click();
 if(!(await page.getByLabel('Objetivo del experimento').isVisible()))await page.getByText('Planear un experimento',{exact:true}).click();
 await page.getByLabel('Objetivo del experimento').fill('Comprobar el regreso semanal');await page.getByLabel('Criterio de éxito').fill('Tres de cinco agencias regresan');
 await page.getByLabel('¿Qué señal esperas observar?').fill(signal);
 if(disconfirming){await page.getByLabel(/no se sostiene/).fill('Menos de dos agencias regresan');await page.getByLabel(/Método para observarlo/).fill('Seguimiento de uso consentido');}
 await page.getByRole('button',{name:'Crear experimento',exact:true}).click();
}
async function runToAcceptedLearning(page:Page,direction:'EXPECTED'|'CONTRARY'){
 await page.getByRole('button',{name:'Iniciar experimento',exact:true}).click();await expect(page.locator('#decision')).toContainText('En curso');
 await page.getByText('Registrar una señal',{exact:true}).click();await page.getByLabel('¿Qué ocurrió?').fill('Una de cinco agencias regresó');await page.getByLabel('Fuente de la observación').fill('Registro consentido DEMO');
 await page.getByLabel('Fecha y hora observada').fill('2026-10-05T12:00');await page.getByLabel('Dirección de la señal (opcional)').selectOption(direction);
 await page.getByRole('button',{name:'Guardar señal',exact:true}).click();await expect(page.locator('#decision')).toContainText('Una de cinco agencias regresó');
 await learningsTab(page);await page.getByText('Proponer un aprendizaje',{exact:true}).click();await page.getByLabel('Hipótesis a la que responde (opcional)').selectOption({index:1});
 await page.getByLabel('Interpretación',{exact:true}).fill('El regreso semanal no se sostiene todavía');await page.getByLabel('Límites de esta interpretación').fill('Muestra pequeña');
 await page.getByRole('button',{name:'Crear aprendizaje candidato',exact:true}).click();await expect(page.locator('#decision')).toContainText('Candidato');
 await page.getByRole('button',{name:'Confirmar revisión',exact:true}).click();await page.getByRole('button',{name:'Aceptar aprendizaje',exact:true}).click();await expect(page.locator('#decision')).toContainText('Aceptado');
}
async function learningsTab(page:Page){await page.getByRole('tab',{name:/^Aprendizajes/}).click();}
async function pendingTab(page:Page){await page.getByRole('tab',{name:'Por validar',exact:true}).click();}
async function reviewHypothesis(page:Page,status:'TESTING'|'SUPPORTED'|'WEAKENED'|'REJECTED',retest=false){
 await pendingTab(page);
 const card=page.locator('.hypothesis-card').first();
 await card.locator('details.hypothesis-review > summary').click();
 if(retest)await expect(card.locator('details.hypothesis-review > summary')).toContainText('Volver a probar');
 await card.getByLabel('Nuevo estado').selectOption(status);
 // Owner defect 2026-10-09: the learning is chosen explicitly (no silent preselection).
 const learning=card.locator('select.learning-choice');
 if(status!=='TESTING'&&await learning.count()){await learning.selectOption({index:1});await expect(card.locator('.learning-choice-detail')).toContainText('Aprendizaje elegido:');}
 await card.getByLabel('Tu criterio sobre esta hipótesis').fill(`Criterio humano: ${status}`);
 await card.getByRole('button',{name:'Guardar revisión de hipótesis',exact:true}).click();
 await expect(page.locator('#notice')).toContainText('Hipótesis revisada');
}

test('1 · Priority Experiment becomes a plan with plan quality and the next validation, without querying the AI',async({page},info)=>{
 test.slow();
 const asks:string[]=[];page.on('request',r=>{if(new URL(r.url()).pathname==='/api/brando/ask')asks.push(r.url());});
 await signIn(page,`Validación plan ${info.project.name} ${Date.now()}`);
 await hypothesis(page,'Las agencias vuelven cada semana');
 await decide(page,'09 Experimento prioritario','Validar primero el regreso semanal');
 await navigate(page,'Validación');
 await expect(page.locator('.validation-next')).toContainText('Planea tu experimento prioritario');
 await page.getByRole('tab',{name:'Experimentos',exact:true}).click();
 await expect(page.locator('#experiment-decision option').first()).toContainText('Experimento prioritario');
 await plan(page,'Creemos que les gusta',false,false);
 await expect(page.locator('.plan-quality')).toContainText('Listo con cautela');
 await expect(page.locator('.plan-quality')).toContainText('no se sostiene');
 expect(asks,'navigation and planning never query the provider').toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('2 · contrary signal → accepted learning → weakened hypothesis raises attention and never rewrites the decision',async({page},info)=>{
 test.slow();
 await signIn(page,`Validación debilitada ${info.project.name} ${Date.now()}`);
 await hypothesis(page,'Las agencias vuelven cada semana');
 await decide(page,'09 Experimento prioritario','Validar primero el regreso semanal');
 await plan(page,'Agencias que consultan su historial cada semana');
 await expect(page.locator('.plan-quality')).toContainText('Plan listo');
 await runToAcceptedLearning(page,'CONTRARY');
 await expect(page.locator('#decision')).toContainText('Contraria');
 await reviewHypothesis(page,'TESTING');
 await expect(page.locator('.hypothesis-card').first()).toContainText('En prueba');
 await expect(page.locator('.validation-next')).toContainText('Revisa la hipótesis');
 await reviewHypothesis(page,'WEAKENED');
 await expect(page.locator('.hypothesis-card').first()).toContainText('Debilitada');
 await expect(page.locator('.validation-next')).toContainText('Revisa Experimento prioritario');
 await navigate(page,'Inicio');
 // Inicio says it as a decision for the person; the full intelligence remains in the rail (Atención).
 await expect(page.locator('.home-attention')).toContainText('Experimento prioritario se apoya en una hipótesis que cambió');
 await navigate(page,'09 Experimento prioritario');
 await expect(page.locator('#decision .current'),'the decision is never rewritten').toHaveText('Validar primero el regreso semanal');
 // Retest: a weakened hypothesis opens a new cycle; the previous learning cannot resolve it.
 await navigate(page,'Validación');
 await reviewHypothesis(page,'TESTING',true);
 const card=page.locator('.hypothesis-card').first();
 await expect(card).toContainText('En prueba');
 // No eligible learning in the new cycle: a clear explanation and a next step, never an empty, disabled selector.
 await expect(card.locator('details.hypothesis-review')).toHaveCount(0);
 await expect(card.locator('select.learning-choice')).toHaveCount(0);
 await expect(card.locator('.learning-missing')).toContainText('Todavía no hay un aprendizaje aceptado que puedas utilizar aquí.');
 await expect(card.locator('.learning-missing')).toContainText('nuevo ciclo');
 await card.getByRole('button',{name:'Proponer un aprendizaje sobre esta hipótesis',exact:true}).click();
 await expect(page.getByRole('tab',{name:/^Aprendizajes/})).toHaveAttribute('aria-selected','true');
 await expect(page.getByLabel('Interpretación',{exact:true})).toBeVisible();
});

test('3 · rejecting a learning needs a reason; a supported hypothesis creates no tension',async({page},info)=>{
 test.slow();
 await signIn(page,`Validación respaldada ${info.project.name} ${Date.now()}`);
 await hypothesis(page,'Las agencias vuelven cada semana');
 await decide(page,'09 Experimento prioritario','Validar primero el regreso semanal');
 await plan(page,'Agencias que consultan su historial cada semana');
 await runToAcceptedLearning(page,'EXPECTED');
 await reviewHypothesis(page,'TESTING');
 await reviewHypothesis(page,'SUPPORTED');
 await expect(page.locator('.hypothesis-card').first()).toContainText('Respaldada');
 await navigate(page,'Inicio');
 await expect(page.locator('.home-attention')).not.toContainText('se apoya en una hipótesis que cambió');
 // A second learning, rejected only with a reason.
 await navigate(page,'Validación');
 await learningsTab(page);
 await page.getByText('Proponer un aprendizaje',{exact:true}).click();
 await page.getByLabel('Interpretación',{exact:true}).fill('Interpretación descartable');await page.getByLabel('Límites de esta interpretación').fill('Ninguno');
 await page.getByRole('button',{name:'Crear aprendizaje candidato',exact:true}).click();
 // Editing while pending keeps it a candidate (and would reopen a review).
 const pending=page.locator('.analysis-item',{hasText:'Interpretación descartable'});
 await pending.locator('details.learning-edit > summary').click();
 await pending.getByLabel('Interpretación revisada').fill('Interpretación descartable, revisada');
 await pending.getByRole('button',{name:'Guardar cambios',exact:true}).click();
 await expect(page.locator('#notice')).toContainText('Vuelve a quedar como candidato');
 await expect(page.locator('#decision')).toContainText('Interpretación descartable, revisada');
 await page.getByRole('button',{name:'Confirmar revisión',exact:true}).click();
 await page.getByRole('button',{name:'Rechazar aprendizaje',exact:true}).click();
 await expect(page.locator('#notice')).toContainText('Explica por qué');
 await page.getByLabel('Tu criterio (obligatorio para rechazar)').fill('No se sostiene con lo observado');
 await page.getByRole('button',{name:'Rechazar aprendizaje',exact:true}).click();
 await expect(page.locator('#decision')).toContainText('Rechazado');
});

test('4 · Brando helps interpret only on click; the draft stays a candidate',async({page},info)=>{
 test.slow();
 const asks:string[]=[];page.on('request',r=>{if(new URL(r.url()).pathname==='/api/brando/ask')asks.push(r.url());});
 await signIn(page,`Validación Brando ${info.project.name} ${Date.now()}`);
 await hypothesis(page,'Las agencias vuelven cada semana');
 await decide(page,'09 Experimento prioritario','Validar primero el regreso semanal');
 await plan(page,'Agencias que consultan su historial cada semana');
 await page.getByRole('button',{name:'Iniciar experimento',exact:true}).click();await expect(page.locator('#decision')).toContainText('En curso');
 await page.getByText('Registrar una señal',{exact:true}).click();await page.getByLabel('¿Qué ocurrió?').fill('Dos agencias regresaron');await page.getByLabel('Fuente de la observación').fill('Registro consentido DEMO');
 await page.getByLabel('Fecha y hora observada').fill('2026-10-05T12:00');await page.getByRole('button',{name:'Guardar señal',exact:true}).click();
 await expect(page.locator('#decision')).toContainText('Dos agencias regresaron');
 expect(asks).toEqual([]);
 await learningsTab(page);
 await page.getByText('Proponer un aprendizaje',{exact:true}).click();
 await page.getByRole('button',{name:'Ayúdame a interpretar',exact:true}).click();
 await expect(page.locator('#brando-conversation .brando-turn')).toHaveCount(1);
 expect(asks).toHaveLength(1);
 await expect(page.locator('#brando-status')).toContainText('asistido por Brando');
 await page.keyboard.press('Escape');
 await expect(page.locator('#brando-dialog')).toBeHidden();
 if(!(await page.getByLabel('Interpretación',{exact:true}).isVisible()))await page.getByText('Proponer un aprendizaje',{exact:true}).click();
 await page.getByLabel('Interpretación',{exact:true}).fill('Interpretación revisada con ayuda de Brando');await page.getByLabel('Límites de esta interpretación').fill('Muestra pequeña');
 await page.getByRole('button',{name:'Crear aprendizaje candidato',exact:true}).click();
 await expect(page.locator('#decision')).toContainText('Interpretación asistida por Brando, revisada por ti');
 await expect(page.locator('#decision')).toContainText('Candidato');
 await expect(page.locator('#decision')).not.toContainText('Aceptado');
});
