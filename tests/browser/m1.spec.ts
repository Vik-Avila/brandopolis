import type { Page } from '@playwright/test';
// Waits for the signed-in shell (the menu appears with it) before deciding whether the drawer is needed.
async function navigate(page:Page,name:string){await page.locator('#workspace').waitFor();if(await page.getByRole('button',{name:'Abrir navegación',exact:true}).isVisible())await page.getByRole('button',{name:'Abrir navegación',exact:true}).click();await page.getByRole('button',{name,exact:true}).click();}
import { test,expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
test('human connected proof survives reload without console errors or overflow',async({page},testInfo)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const session=JSON.parse(readFileSync('.local/demo-session.json','utf8'));
  await page.goto('/');
  await page.getByLabel('Token de sesión local').fill(session.token);
  await page.getByRole('button',{name:'Entrar al espacio estratégico'}).click();
  await expect(page.getByRole('heading',{name:'Una decisión conecta con la siguiente.'})).toBeVisible();
  if(await page.getByRole('button',{name:'Abrir navegación',exact:true}).isVisible()) {
    const menu=page.locator('#menu');
    await menu.click();await expect(menu).toHaveAttribute('aria-expanded','true');
    await page.keyboard.press('Shift+Tab');await expect(page.locator('#blueprint')).toBeFocused();await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Cerrar navegación',exact:true})).toBeFocused();
    await page.keyboard.press('Escape');await expect(menu).toBeFocused();await expect(menu).toHaveAttribute('aria-expanded','false');
    await menu.click();await page.locator('#nav-backdrop').click({position:{x:(page.viewportSize()?.width??390)-10,y:150}});await expect(menu).toHaveAttribute('aria-expanded','false');
  }
  await page.getByLabel('Nueva marca',{exact:true}).fill(`Browser DEMO ${testInfo.project.name} ${Date.now()}`);
  await page.getByRole('button',{name:'Crear marca',exact:true}).click();
  await expect(page.locator('#decision')).toContainText('Por decidir');
  await navigate(page,'Contexto estratégico');
  await page.getByLabel('Contenido',{exact:true}).fill('Ayudamos a agencias a conservar decisiones');
  await page.getByRole('button',{name:'Guardar contexto',exact:true}).click();
  await expect(page.locator('#decision')).toContainText('Ayudamos a agencias a conservar decisiones');
  await page.reload();await navigate(page,'Contexto estratégico');
  await expect(page.locator('#decision')).toContainText('Ayudamos a agencias a conservar decisiones');
  await navigate(page,'01 Cliente principal');
  async function approve(option:string,rationale:string,button='Preparar decisión') {
    await page.getByRole('button',{name:button,exact:true}).click();
    await page.getByLabel('Decisión propuesta').fill(option);
    await page.getByLabel('¿Por qué eliges esta opción?').fill(rationale);
    await page.getByRole('button',{name:button==='Iniciar revisión humana'?'Confirmar revisión':'Aprobar decisión',exact:true}).click();
    await expect(page.locator('#decision .current')).toHaveText(option);
  }
  await approve('Agencies','Servicio recurrente para múltiples marcas');
  await navigate(page,'02 Modelo de valor');
  await approve('Suscripción por marca activa','Ingresos por continuidad estratégica');
  await navigate(page,'03 Posicionamiento');
  await approve('Strategic OS for Agencies','Continuidad del criterio estratégico');
  await navigate(page,'04 Mensaje principal');
  await approve('Decisiones conectadas, criterio compartido','Una idea principal recordable');
  await navigate(page,'01 Cliente principal');
  await approve('Internal Marketing Teams','Cambio humano de cliente prioritario','Preparar nueva versión');
  await page.getByText('Historial · 2 versiones',{exact:true}).click();
  await expect(page.locator('.history-item').filter({hasText:'Sustituida'})).toContainText('Agencies');
  await navigate(page,'03 Posicionamiento');
  await expect(page.locator('#decision')).toContainText('Requiere revisión');
  await expect(page.locator('#decision .current')).toHaveText('Strategic OS for Agencies');
  await page.getByRole('button',{name:'Ver impacto',exact:true}).click();
  await expect(page.locator('#decision')).toContainText('versión 1 → 2');
  await page.screenshot({path:`test-results/m1-impact-${testInfo.project.name}.png`,fullPage:true});
  await page.reload();
  await expect(page.locator('#decision')).toContainText('Requiere revisión');
  await approve('Strategic OS for Internal Marketing Teams','Revisión humana tras el cambio de cliente','Iniciar revisión humana');
  await page.reload();
  await expect(page.locator('#decision')).toContainText('Actual · v2');
  await expect(page.locator('#decision')).not.toContainText('Requiere revisión');
  await page.getByText('Historial · 2 versiones',{exact:true}).click();
  await expect(page.locator('.history-item')).toHaveCount(2);
  await expect(page.locator('.history-item').filter({hasText:'Sustituida'})).toContainText('Strategic OS for Agencies');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.emulateMedia({reducedMotion:'reduce'});expect(await page.locator('#journey').evaluate(e=>getComputedStyle(e).transitionDuration)).toBe('0s');
  await page.screenshot({path:`test-results/m1-completed-${testInfo.project.name}.png`,fullPage:true});
  if(await page.getByRole('button',{name:'Abrir navegación',exact:true}).isVisible())await page.getByRole('button',{name:'Abrir navegación',exact:true}).click();
  await page.getByRole('button',{name:'Blueprint estratégico',exact:true}).click();
  await expect(page.locator('#decision')).toContainText('Suscripción por marca activa');
  await expect(page.locator('#decision')).toContainText('Decisiones conectadas, criterio compartido');
  await expect(page.locator('#decision')).toContainText('Requiere revisión');
  expect(errors).toEqual([]);
  await page.getByRole('button',{name:'Salir',exact:true}).click();
  await expect(page.getByLabel('Token de sesión local')).toBeVisible();
});
test('two human tabs cannot silently overwrite a newer version',async({page,context})=>{
  const session=JSON.parse(readFileSync('.local/demo-session.json','utf8'));
  await page.goto('/');await page.getByLabel('Token de sesión local').fill(session.token);await page.getByRole('button',{name:'Entrar al espacio estratégico'}).click();
  await page.getByLabel('Nueva marca',{exact:true}).fill(`Concurrency DEMO ${Date.now()}`);await page.getByRole('button',{name:'Crear marca',exact:true}).click();await expect(page.locator('#decision')).toContainText('Por decidir');
  await page.getByRole('button',{name:'Preparar decisión',exact:true}).click();await page.getByLabel('Decisión propuesta').fill('Original');await page.getByLabel('¿Por qué eliges esta opción?').fill('Original rationale');await page.getByRole('button',{name:'Aprobar decisión',exact:true}).click();await expect(page.locator('#decision .current')).toHaveText('Original');
  const second=await context.newPage();await second.goto(page.url());await expect(second.locator('#decision .current')).toHaveText('Original');
  await page.getByRole('button',{name:'Preparar nueva versión',exact:true}).click();await second.getByRole('button',{name:'Preparar nueva versión',exact:true}).click();
  await page.getByLabel('Decisión propuesta').fill('Newer');await page.getByLabel('¿Por qué eliges esta opción?').fill('Newer rationale');await page.getByRole('button',{name:'Aprobar decisión',exact:true}).click();await expect(page.locator('#decision .current')).toHaveText('Newer');
  await second.getByLabel('Decisión propuesta').fill('Stale');await second.getByLabel('¿Por qué eliges esta opción?').fill('Stale rationale');await second.getByRole('button',{name:'Aprobar decisión',exact:true}).click();
  await expect(second.getByRole('status')).toContainText('Esta decisión cambió');await expect(second.getByLabel('Decisión propuesta')).toHaveValue('Stale');
  await second.getByRole('button',{name:'Revisar versión más reciente',exact:true}).click();await expect(second.locator('#decision .current')).toHaveText('Newer');
  await second.getByText('Historial · 2 versiones',{exact:true}).focus();await second.keyboard.press('Enter');await expect(second.locator('.history-item')).toHaveCount(2);await expect(second.locator('.history-item').first()).toBeVisible();
  await second.close();
});
test('DEMO recommendation can be rejected and then explicitly approved',async({page},info)=>{
 const session=JSON.parse(readFileSync('.local/demo-session.json','utf8'));
 await page.goto('/');await page.getByLabel('Token de sesión local').fill(session.token);await page.getByRole('button',{name:'Entrar al espacio estratégico'}).click();
 await page.getByLabel('Nueva marca',{exact:true}).fill(`Analysis DEMO ${info.project.name} ${Date.now()}`);await page.getByRole('button',{name:'Crear marca',exact:true}).click();await expect(page.locator('#decision')).toContainText('Por decidir');
 await page.getByRole('button',{name:'Comparar opciones DEMO',exact:true}).click();await expect(page.getByRole('heading',{name:'Compara antes de decidir'})).toBeVisible();
 await page.getByLabel('Motivo para rechazar').fill('Necesito otro enfoque');await page.getByRole('button',{name:'Rechazar recomendación',exact:true}).click();await expect(page.getByRole('status')).toContainText('Recomendación rechazada');await expect(page.locator('#decision')).toContainText('Por decidir');
 await page.getByRole('button',{name:'Comparar opciones DEMO',exact:true}).click();await page.getByRole('button',{name:'Usar recomendación',exact:true}).click();await page.getByLabel('¿Por qué eliges esta opción?').fill('Elección humana para probar la demostración');await page.getByRole('button',{name:'Aprobar decisión',exact:true}).click();
 await expect(page.locator('#decision .current')).toHaveText('Agencias con varias marcas');await page.reload();await expect(page.locator('#decision .current')).toHaveText('Agencias con varias marcas');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 for(const [module,choice] of [['02 Modelo de valor','Suscripción por marca activa'],['03 Posicionamiento','Continuidad para agencias'],['04 Mensaje principal','Decisiones conectadas']]) {
   await navigate(page,module);await page.getByRole('button',{name:'Preparar decisión',exact:true}).click();await page.getByLabel('Decisión propuesta').fill(choice);await page.getByLabel('¿Por qué eliges esta opción?').fill('Criterio humano DEMO');await page.getByRole('button',{name:'Aprobar decisión',exact:true}).click();await expect(page.locator('#decision .current')).toHaveText(choice);
 }
 await navigate(page,'01 Cliente principal');await page.getByRole('button',{name:'Comparar opciones DEMO',exact:true}).click();await page.getByRole('button',{name:'Modificar recomendación',exact:true}).click();await page.getByLabel('Decisión propuesta').fill('Equipos internos');await page.getByLabel('¿Por qué eliges esta opción?').fill('Nueva prioridad humana DEMO');await page.getByRole('button',{name:'Aprobar decisión',exact:true}).click();await expect(page.locator('#decision .current')).toHaveText('Equipos internos');
 await navigate(page,'Qué necesita atención');await expect(page.locator('#decision')).toContainText('Tu estrategia hoy');await page.getByRole('button',{name:'Abrir posicionamiento',exact:true}).click();await expect(page.locator('#decision')).toContainText('Requiere revisión');await expect(page.locator('#decision .current')).toHaveText('Continuidad para agencias');
 await page.getByRole('button',{name:'Iniciar revisión humana',exact:true}).click();await page.getByRole('button',{name:'Modificar',exact:true}).click();await page.getByLabel('Decisión propuesta').fill('Continuidad para equipos internos');await page.getByLabel('¿Por qué eliges esta opción?').fill('Alineación humana con cliente');await page.getByRole('button',{name:'Confirmar revisión',exact:true}).click();await expect(page.locator('#decision .current')).toHaveText('Continuidad para equipos internos');
 await navigate(page,'Contexto estratégico');await page.getByLabel('Tipo de aportación').selectOption('hypothesis');await page.getByLabel('Contenido',{exact:true}).fill('Las agencias volverán a revisar sus decisiones');await page.getByRole('button',{name:'Guardar contexto',exact:true}).click();await expect(page.locator('#decision')).toContainText('Las agencias volverán a revisar sus decisiones');
 await navigate(page,'Experimentos y aprendizajes');await page.getByLabel('Objetivo del experimento').fill('Validar recurrencia');await page.getByLabel('Criterio de éxito').fill('Una segunda visita voluntaria en siete días');await page.getByLabel('¿Qué señal esperas observar?').fill('Segunda sesión voluntaria');await page.getByRole('button',{name:'Crear experimento',exact:true}).click();await page.getByRole('button',{name:'Iniciar experimento',exact:true}).click();await expect(page.locator('#decision')).toContainText('En curso');
 await page.getByText('Registrar una señal',{exact:true}).click();await page.getByLabel('¿Qué ocurrió?').fill('Una agencia regresó');await page.getByLabel('Fuente de la observación').fill('Registro consentido DEMO');await page.getByLabel('Fecha y hora observada').fill('2026-09-23T12:00');await page.getByRole('button',{name:'Guardar señal',exact:true}).click();await expect(page.locator('#decision')).toContainText('Una agencia regresó');
 await page.getByRole('button',{name:'Completar experimento',exact:true}).click();await expect(page.locator('#decision')).toContainText('Completado');await page.getByText('Proponer un aprendizaje',{exact:true}).click();await page.getByLabel('Interpretación',{exact:true}).fill('Posible interés recurrente');await page.getByLabel('Límites de esta interpretación').fill('Un caso de demostración');await page.getByRole('button',{name:'Crear aprendizaje candidato',exact:true}).click();await expect(page.locator('#decision')).toContainText('Candidato');
 await page.getByRole('button',{name:'Confirmar revisión',exact:true}).click();await page.getByRole('button',{name:'Aceptar aprendizaje',exact:true}).click();await expect(page.locator('#decision')).toContainText('Aceptado');await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`test-results/learning-${info.project.name}.png`,fullPage:true});
 await navigate(page,'Blueprint estratégico');await expect(page.locator('#decision')).toContainText('Posible interés recurrente');await navigate(page,'Mi práctica estratégica');await expect(page.locator('#decision')).toContainText('Customer Understanding');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await navigate(page,'Contexto estratégico');await expect(page.locator('#decision')).toContainText('Posible interés recurrente');await navigate(page,'Qué necesita atención');await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`test-results/home-${info.project.name}.png`,fullPage:true});
});
test('intake and brand switch preserve isolated context and human draft',async({page},info)=>{
 const session=JSON.parse(readFileSync('.local/demo-session.json','utf8'));
 await page.goto('/');await page.getByLabel('Token de sesión local').fill(session.token);await page.getByRole('button',{name:'Entrar al espacio estratégico'}).click();
 await page.getByLabel('Nueva marca',{exact:true}).fill(`Intake A ${info.project.name} ${Date.now()}`);await page.getByText('¿Qué estás construyendo?',{exact:true}).click();await page.getByLabel('Cuéntanos tu idea inicial (opcional)').fill('Contexto exclusivo A');await page.getByRole('button',{name:'Crear marca',exact:true}).click();await expect(page.getByRole('status')).toContainText('Marca creada');const a=await page.getByLabel('Marca activa').inputValue();
 await navigate(page,'Contexto estratégico');await expect(page.locator('#decision')).toContainText('Contexto exclusivo A');
 await page.getByLabel('Nueva marca',{exact:true}).fill(`Intake B ${info.project.name} ${Date.now()}`);await page.getByRole('button',{name:'Crear marca',exact:true}).click();await expect(page.getByRole('status')).toContainText('Marca creada');await expect(page.getByLabel('Marca activa')).not.toHaveValue(a);const b=await page.getByLabel('Marca activa').inputValue();
 await navigate(page,'Contexto estratégico');await expect(page.locator('#decision')).not.toContainText('Contexto exclusivo A');await page.getByLabel('Marca activa').selectOption(a);await page.getByRole('button',{name:'Preparar decisión',exact:true}).click();await page.getByLabel('Decisión propuesta').fill('Borrador exclusivo A');await page.getByLabel('Marca activa').selectOption(b);await expect(page.locator('#decision')).not.toContainText('Borrador exclusivo A');await page.getByLabel('Marca activa').selectOption(a);await page.getByRole('button',{name:'Ver borrador conservado',exact:true}).click();await expect(page.getByRole('status')).toContainText('Borrador exclusivo A');
});
test('RC handles double submit, offline mutation and expired session without raw errors',async({page},info)=>{
 const session=JSON.parse(readFileSync('.local/demo-session.json','utf8'));
 await page.goto('/');await page.getByLabel('Token de sesión local').fill(session.token);await page.getByRole('button',{name:'Entrar al espacio estratégico'}).click();await expect(page.getByLabel('Nueva marca',{exact:true})).toBeVisible();
 let requests=0,release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/api/brands',async route=>{if(route.request().method()==='POST'){requests++;await gate;}await route.continue();});
 await page.getByLabel('Nueva marca',{exact:true}).fill(`RC double ${info.project.name} ${Date.now()}`);
 await page.locator('#create-brand').evaluate((form:HTMLFormElement)=>{form.requestSubmit();form.requestSubmit();});
 await expect.poll(()=>requests).toBe(1);await expect(page.getByRole('button',{name:'Crear marca',exact:true})).toBeDisabled();await expect(page.getByRole('status')).toContainText('Procesando');release();await expect(page.getByRole('status')).toContainText('Marca creada');expect(requests).toBe(1);await page.unroute('**/api/brands');
 await page.getByRole('button',{name:'Preparar decisión',exact:true}).click();await page.getByLabel('Decisión propuesta').fill('Borrador ante desconexión');await page.getByLabel('¿Por qué eliges esta opción?').fill('Conservar criterio humano');
 await page.route('**/api/decisions/commit',route=>route.abort('failed'));await page.getByRole('button',{name:'Aprobar decisión',exact:true}).click();await expect(page.getByRole('status')).toContainText('No recibimos confirmación');await expect(page.getByLabel('Decisión propuesta')).toHaveValue('Borrador ante desconexión');await expect(page.getByRole('button',{name:'Aprobar decisión',exact:true})).toBeEnabled();await page.unroute('**/api/decisions/commit');
 await page.getByRole('button',{name:'Aprobar decisión',exact:true}).click();await expect(page.locator('#decision .current')).toHaveText('Borrador ante desconexión');
 await page.route('**/api/recommendations/generate',route=>route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({code:'UNAUTHORIZED',message:'technical private details'})}));await page.getByRole('button',{name:'Comparar opciones DEMO',exact:true}).click();await expect(page.getByLabel('Token de sesión local')).toBeVisible();await expect(page.getByRole('status')).toContainText('Tu sesión DEMO');await expect(page.locator('body')).not.toContainText('technical private details');
});
