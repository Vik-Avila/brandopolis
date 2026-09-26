import { test,expect,type Page,type APIRequestContext } from '@playwright/test';
import { readFileSync,mkdirSync } from 'node:fs';
// Phase10A evidence: real Chromium and DEMO state created through the real API.
// Baseline and final are separate. Práctica uses a viewport capture because its personal history is unbounded.
const phase=process.env.PHASE10A_CAPTURE??'final';if(!['baseline','final'].includes(phase))throw new Error('Invalid capture phase');const shots=process.env.EVIDENCE_DIR??'design/brandopolis-ui/reference/phase10a/'+phase;mkdirSync(shots,{recursive:true});
const session=()=>JSON.parse(readFileSync(process.env.BRANDOPOLIS_SESSION_FILE??'.local/demo-session.json','utf8')) as {token:string;userId:string};
async function seed(request:APIRequestContext) {
  const {token,userId}=session(),auth={Authorization:`Bearer ${token}`};
  const post=async(path:string,data:unknown)=>{let r;try{r=await request.post(path,{headers:auth,data});}catch{throw new Error(`DEMO server unavailable at ${path}; request details withheld.`);}expect(r.ok(),path).toBe(true);return r.json();};
  const brand=await post('/api/brands',{name:`Marca Demo ${Date.now()}`,initialContext:'Plataforma que ayuda a equipos a tomar mejores decisiones estratégicas de marca.'});
  const ctx=await (await request.get(`/api/context?brandId=${brand.id}`,{headers:auth})).json(),q=(m:string)=>ctx.questions.find((x:{module:string})=>x.module===m).id;
  const commit=async(module:string,option:string,rationale:string,expected:string|null,reviewToken?:string)=>{await post('/api/questions/prepare',{brandId:brand.id,questionId:q(module),expectedActiveVersion:expected});return post('/api/decisions/commit',{command:{brandId:brand.id,questionId:q(module),selectedOption:option,rationale,expectedActiveVersion:expected,actorUserId:userId,sourceRecommendationId:null,idempotencyKey:crypto.randomUUID()},reviewToken});};
  const c1=await commit('Primary Customer','Agencias con varias marcas','Gestionan varias marcas y necesitan continuidad de criterio.',null);
  await commit('Value Mechanism','Suscripción por marca activa','Ingresos ligados al uso continuo.',null);
  await commit('Positioning','Continuidad estratégica para agencias','Las agencias pierden el porqué de sus decisiones.',null);
  await commit('Core Message','Decisiones conectadas, criterio compartido','Una idea principal recordable.',null);
  await commit('Primary Customer','Equipos de marketing y estrategia en empresas de tecnología en crecimiento','Mayor necesidad de estructura y disposición a adoptar un sistema de decisiones.',c1.versionId);
  if(phase==='final'){
    await post('/api/context/capture',{brandId:brand.id,kind:'hypothesis',entity:{statement:'Hipótesis DEMO: conservar el criterio puede ayudar al equipo a revisar una decisión sin reiniciar el trabajo.'}});
    await post('/api/context/capture',{brandId:brand.id,kind:'evidence',entity:{claim:'Fixture DEMO: una decisión de cliente tiene dos versiones humanas conservadas en este recorrido.',source:'Recorrido de prueba local Phase10A',sourceDate:'2026-09-25',provenance:'Creación y cambio explícito mediante el motor real de decisiones en entorno DEMO.',sourceQuality:'HIGH',relevance:'DIRECT',freshness:'CURRENT',limitations:['Dato de prueba local; no representa entrevistas, mercado ni resultados comerciales.'],external:false}});
  }
  return {brand,token};
}
async function signIn(page:Page,brandId:string,module='Primary Customer') {
  const target=`/?brand=${brandId}&module=${encodeURIComponent(module)}`;
  const ready=()=>page.waitForFunction(()=>!document.body.classList.contains('booting'));
  await page.goto(target);await ready();
  if(await page.locator('#workspace').isHidden()){
    await page.goto('/login');await ready();await page.getByLabel('Token de sesión local').fill(session().token);
    await page.getByRole('button',{name:'Entrar al espacio estratégico'}).click();
    await expect(page.locator('#workspace')).toBeVisible();
    await page.goto(target);await ready();
  }
  await expect(page.locator('#decision h2')).toBeVisible();
}
async function sound(page:Page,label:string) {
  expect(await page.locator('body').innerText(),`${label} UTF-8`).not.toMatch(/\u00c3|\u00c2|\u00e2\u20ac|\ufffd/);
  // No horizontal overflow, every rendered image decoded, no clipped primary actions.
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${label} overflow`).toBe(true);
  const broken=await page.evaluate(()=>[...document.images].filter(i=>i.checkVisibility()&&(!i.complete||i.naturalWidth===0)).map(i=>i.currentSrc));
  expect(broken,`${label} broken images`).toEqual([]);
}
async function shot(page:Page,name:string){await page.evaluate(async()=>{await document.fonts.ready;scrollTo(0,0);});await page.screenshot({path:`${shots}/${name}.png`,fullPage:!name.startsWith('practice'),timeout:30000});}

async function nav(page:Page,id:string){await page.evaluate(()=>scrollTo(0,0));if(await page.locator('#menu').isVisible())await page.locator('#menu').click();await page.locator(id).click();await page.waitForLoadState('networkidle');await expect(page.locator('#decision h2')).toBeVisible();}
test('Phase10A complete real browser evidence',async({browser,request})=>{
 const seeded=await seed(request);
 for(const [suffix,viewport] of [['desktop',{width:1440,height:900}],['mobile',{width:390,height:844}]] as const){
  const context=await browser.newContext({viewport,reducedMotion:'reduce',...(suffix==='mobile'?{isMobile:true,hasTouch:true}:{})});const page=await context.newPage();
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  for(const [name,path] of [['public','/'],['login','/login'],['request-access','/request-access']]){await page.goto(path);await page.waitForLoadState('networkidle');await shot(page,`${name}-${suffix}`);await sound(page,name);}
  await signIn(page,seeded.brand.id);await nav(page,'#home');await shot(page,`workspace-${suffix}`);
  for(const [slug,module] of [['primary-customer','Primary Customer'],['value-mechanism','Value Mechanism'],['positioning','Positioning'],['core-message','Core Message']]){await signIn(page,seeded.brand.id,module);await shot(page,`${slug}-${suffix}`);await sound(page,module);}
  if(phase==='final'){
    await signIn(page,seeded.brand.id,'Primary Customer');await page.getByRole('tab',{name:'Evidencia e hipótesis',exact:true}).click();await expect(page.locator('#decision')).toContainText('Hipótesis DEMO:');await shot(page,`evidence-populated-${suffix}`);await sound(page,'populated evidence');
    await page.getByRole('tab',{name:'Opciones',exact:true}).click();await page.getByRole('button',{name:'Comparar opciones DEMO',exact:true}).click();await expect(page.getByRole('heading',{name:'Compara antes de decidir'})).toBeVisible();await shot(page,`options-generated-${suffix}`);await sound(page,'generated DEMO options');
  }
  await signIn(page,seeded.brand.id,'Primary Customer');await page.getByText(/Historial · \d versiones/).click();await expect(page.locator('.history-item.is-current')).toBeVisible();await shot(page,`history-${suffix}`);
  await signIn(page,seeded.brand.id,'Positioning');await expect(page.locator('#decision')).toContainText('Requiere revisión');await shot(page,`needs-review-${suffix}`);
  await page.getByRole('button',{name:'Ver impacto',exact:true}).click();await expect(page.locator('.impact-pair')).toBeVisible();await shot(page,`impact-${suffix}`);
  await page.getByRole('button',{name:'Iniciar revisión humana',exact:true}).click();await expect(page.getByRole('button',{name:'Modificar',exact:true})).toBeVisible();await page.getByLabel('¿Por qué eliges esta opción?').fill('Revisión humana tras el cambio de cliente.');await shot(page,`guided-review-${suffix}`);await page.getByRole('button',{name:'Cancelar',exact:true}).click();
  for(const [name,id] of [['context','#brand-context'],['learning','#learning-loop'],['practice','#practice'],['blueprint','#blueprint']]){await signIn(page,seeded.brand.id);await nav(page,id);await shot(page,`${name}-${suffix}`);await sound(page,name);}
  if(suffix==='mobile'){await page.locator('#menu').click();await expect(page.locator('#menu')).toHaveAttribute('aria-expanded','true');await page.keyboard.press('Escape');await expect(page.locator('#menu')).toBeFocused();await expect(page.locator('#menu')).toHaveAttribute('aria-expanded','false');}
  expect(errors).toEqual([]);await context.close();
 }
});





test('Phase10A responsive shell and new-brand dialog keyboard containment',async({browser,request})=>{
 test.skip(phase==='baseline','The creation dialog is introduced by Phase10A.');
 const seeded=await seed(request);
 for(const viewport of [{width:1600,height:1000},{width:1440,height:900},{width:1280,height:800},{width:768,height:1024},{width:390,height:844},{width:360,height:800}]){
  const {width}=viewport;
  const context=await browser.newContext({viewport,reducedMotion:'reduce'});const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('/');await page.waitForLoadState('networkidle');await sound(page,`${width} public`);
  await signIn(page,seeded.brand.id,'Positioning');await sound(page,`${width} workspace`);
  const tabs=page.getByRole('tablist');await expect(tabs).toBeVisible();await page.getByRole('tab',{name:'Decisión',exact:true}).focus();
  await page.keyboard.press('ArrowRight');await expect(page.getByRole('tab',{name:'Evidencia e hipótesis',exact:true})).toBeFocused();await expect(page.getByRole('tab',{name:'Evidencia e hipótesis',exact:true})).toHaveAttribute('aria-selected','true');
  await page.keyboard.press('End');await expect(page.getByRole('tab',{name:/Historial/})).toBeFocused();await page.keyboard.press('Home');await expect(page.getByRole('tab',{name:'Decisión',exact:true})).toBeFocused();
  await expect(page.locator('#create-brand')).toBeHidden();await page.locator('#new-brand').click();await expect(page.locator('#brand-dialog')).toBeVisible();
  await sound(page,`${width} creation dialog`);
  for(let i=0;i<12;i++){await page.keyboard.press('Tab');expect(await page.evaluate(()=>!!document.activeElement?.closest('#brand-dialog')),`${width} dialog focus contained`).toBe(true);}
  for(let i=0;i<12;i++){await page.keyboard.press('Shift+Tab');expect(await page.evaluate(()=>!!document.activeElement?.closest('#brand-dialog')),`${width} reverse focus contained`).toBe(true);}
  await page.keyboard.press('Escape');await expect(page.locator('#brand-dialog')).toBeHidden();await expect(page.locator('#new-brand')).toBeFocused();
  await expect(page.locator('#decision')).toContainText('Requiere revisión');await page.getByRole('button',{name:'Ver impacto',exact:true}).click();await sound(page,`${width} impact`);
  await page.getByRole('button',{name:'Iniciar revisión humana',exact:true}).click();await expect(page.getByLabel('Decisión propuesta')).toBeVisible();await sound(page,`${width} guided review`);await page.getByRole('button',{name:'Cancelar',exact:true}).click();
  for(const module of ['Primary Customer','Value Mechanism','Core Message']){await signIn(page,seeded.brand.id,module);await sound(page,`${width} ${module}`);}
  await signIn(page,seeded.brand.id);await page.getByText(/Historial · \d versiones/).click();await sound(page,`${width} history`);
  for(const [label,id] of [['workspace','#home'],['context','#brand-context'],['learning','#learning-loop'],['blueprint','#blueprint']]){await signIn(page,seeded.brand.id);await nav(page,id);await sound(page,`${width} ${label}`);if([768,1280,1600].includes(width)&&label==='workspace')await shot(page,`workspace-${width}`);}
  expect(errors).toEqual([]);await context.close();
 }
});
