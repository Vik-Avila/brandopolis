import { test,expect,type Page,type APIRequestContext } from '@playwright/test';
import { readFileSync,mkdirSync } from 'node:fs';
// Canonical post-integration evidence: real Chromium, real DEMO server, state created through the real API.
// Canonical evidence is rewritten only on purpose (UPDATE_CANONICAL_SCREENSHOTS=1); otherwise results go to test-results.
const shots=process.env.UPDATE_CANONICAL_SCREENSHOTS==='1'?'design/brandopolis-ui/reference/screenshots':'test-results/visual';mkdirSync(shots,{recursive:true});
const session=()=>JSON.parse(readFileSync('.local/demo-session.json','utf8')) as {token:string;userId:string};
async function seed(request:APIRequestContext) {
  const {token,userId}=session(),auth={Authorization:`Bearer ${token}`};
  const post=async(path:string,data:unknown)=>{const r=await request.post(path,{headers:auth,data});expect(r.ok(),path).toBe(true);return r.json();};
  const brand=await post('/api/brands',{name:`Marca Demo ${Date.now()}`,initialContext:'Plataforma que ayuda a equipos a tomar mejores decisiones estratégicas de marca.'});
  const ctx=await (await request.get(`/api/context?brandId=${brand.id}`,{headers:auth})).json(),q=(m:string)=>ctx.questions.find((x:{module:string})=>x.module===m).id;
  const commit=async(module:string,option:string,rationale:string,expected:string|null,reviewToken?:string)=>{await post('/api/questions/prepare',{brandId:brand.id,questionId:q(module),expectedActiveVersion:expected});return post('/api/decisions/commit',{command:{brandId:brand.id,questionId:q(module),selectedOption:option,rationale,expectedActiveVersion:expected,actorUserId:userId,sourceRecommendationId:null,idempotencyKey:crypto.randomUUID()},reviewToken});};
  const c1=await commit('Primary Customer','Agencias con varias marcas','Gestionan varias marcas y necesitan continuidad de criterio.',null);
  await commit('Value Mechanism','Suscripción por marca activa','Ingresos ligados al uso continuo.',null);
  await commit('Positioning','Continuidad estratégica para agencias','Las agencias pierden el porqué de sus decisiones.',null);
  await commit('Core Message','Decisiones conectadas, criterio compartido','Una idea principal recordable.',null);
  await commit('Primary Customer','Equipos de marketing y estrategia en empresas de tecnología en crecimiento','Mayor necesidad de estructura y disposición a adoptar un sistema de decisiones.',c1.versionId);
  return {brand,token};
}
async function signIn(page:Page,brandId:string,module='Primary Customer') {
  const target=`/?brand=${brandId}&module=${encodeURIComponent(module)}`;
  const ready=()=>page.waitForFunction(()=>!document.body.classList.contains('booting'));
  await page.goto(target);await ready();
  if(await page.locator('#workspace').isHidden()){
    await page.goto('/login');await ready();await page.getByLabel('Token de sesión local').fill(session().token);
    await page.getByRole('button',{name:'Entrar al espacio estratégico'}).click();
    await expect(page.getByRole('heading',{name:'Una decisión conecta con la siguiente.'})).toBeVisible();
    await page.goto(target);await ready();
  }
  await expect(page.locator('#decision h2')).toBeVisible();
}
async function sound(page:Page,label:string) {
  // No horizontal overflow, every rendered image decoded, no clipped primary actions.
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${label} overflow`).toBe(true);
  const broken=await page.evaluate(()=>[...document.images].filter(i=>i.checkVisibility()&&(!i.complete||i.naturalWidth===0)).map(i=>i.currentSrc));
  expect(broken,`${label} broken images`).toEqual([]);
}
async function shot(page:Page,name:string){await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:`${shots}/${name}.png`,fullPage:true});}
const viewports={wide:{width:1600,height:1000},desktop:{width:1440,height:900},compact:{width:1280,height:800},tablet:{width:768,height:1024},mobile:{width:390,height:844}};
test.describe.configure({mode:'serial'});
let seeded:{brand:{id:string};token:string};
test.beforeAll(async({request})=>{seeded=await seed(request);});
for(const [name,viewport] of Object.entries(viewports)){
  test(`responsive integrity ${name}`,async({browser})=>{
    const context=await browser.newContext({viewport,...(name==='mobile'?{isMobile:true,hasTouch:true}:{})}),page=await context.newPage(),errors:string[]=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    for(const path of ['/','/login','/request-access']){await page.goto(path);await expect(page.locator('main')).toBeVisible();await page.waitForLoadState('networkidle');await sound(page,`${name} ${path}`);}
    await page.goto('/');await expect(page.getByRole('heading',{name:/Estrategia que evoluciona/})).toBeVisible();
    await signIn(page,seeded.brand.id,'Positioning');await sound(page,`${name} needs review`);
    await expect(page.locator('#decision')).toContainText('Requiere revisión');
    await page.getByRole('button',{name:'Ver impacto',exact:true}).click();await expect(page.locator('.impact-pair')).toBeVisible();await sound(page,`${name} impact`);
    if(name==='mobile'){const menu=page.getByRole('button',{name:'Abrir navegación',exact:true});await menu.click();await expect(page.getByRole('button',{name:'Blueprint estratégico',exact:true})).toBeVisible();await page.keyboard.press('Escape');await expect(menu).toBeFocused();}
    expect(errors).toEqual([]);await context.close();
  });
}
test('canonical screenshots (desktop 1440×900, mobile 390×844)',async({browser})=>{
  for(const [suffix,viewport] of [['desktop',viewports.desktop],['mobile',viewports.mobile]] as const){
    const context=await browser.newContext({viewport,...(suffix==='mobile'?{isMobile:true,hasTouch:true}:{}),reducedMotion:'reduce'}),page=await context.newPage();
    await page.goto('/');await page.waitForLoadState('networkidle');await shot(page,`public-gateway-${suffix}`);
    await page.goto('/login');await page.waitForLoadState('networkidle');await shot(page,`login-${suffix}`);
    await page.goto('/request-access');await page.waitForLoadState('networkidle');await shot(page,`request-access-${suffix}`);
    await signIn(page,seeded.brand.id,'Primary Customer');
    await page.getByRole('button',{name:suffix==='mobile'?'Abrir navegación':'Qué necesita atención',exact:true}).click();
    if(suffix==='mobile')await page.getByRole('button',{name:'Qué necesita atención',exact:true}).click();
    await expect(page.locator('.kpis')).toBeVisible();await shot(page,`m1-workspace-${suffix}`);
    await signIn(page,seeded.brand.id,'Primary Customer');
    if(suffix==='desktop')await shot(page,'decision-card-desktop');
    await page.getByText(/Historial · \d versiones/).click();await expect(page.locator('.history-item.is-current')).toBeVisible();await page.locator('details:has(.history-item)').scrollIntoViewIfNeeded();await shot(page,`history-${suffix}`);
    await signIn(page,seeded.brand.id,'Positioning');await page.getByRole('button',{name:'Ver impacto',exact:true}).click();await expect(page.locator('.impact-pair')).toBeVisible();await shot(page,`m1-needs-review-${suffix}`);
    await page.getByRole('button',{name:'Iniciar revisión humana',exact:true}).click();await expect(page.getByRole('button',{name:'Modificar',exact:true})).toBeVisible();
    await page.getByLabel('¿Por qué eliges esta opción?').fill('Revisión humana tras el cambio de cliente.');await shot(page,`m1-guided-review-${suffix}`);
    await page.getByRole('button',{name:'Cancelar',exact:true}).click();
    if(suffix==='mobile')await page.getByRole('button',{name:'Abrir navegación',exact:true}).click();
    await page.getByRole('button',{name:'Blueprint estratégico',exact:true}).click();await expect(page.locator('.blueprint-grid')).toBeVisible();await shot(page,`blueprint-${suffix}`);
    await context.close();
  }
});
test('reduced motion keeps the poster; motion plays only when allowed',async({browser})=>{
  for(const reducedMotion of ['reduce','no-preference'] as const){
    const context=await browser.newContext({viewport:viewports.desktop,reducedMotion}),page=await context.newPage();
    await page.goto('/#como-funciona');await page.locator('.flow-video').scrollIntoViewIfNeeded();await page.waitForTimeout(1200);
    const state=await page.locator('.flow-video').evaluate(v=>({paused:(v as HTMLVideoElement).paused,poster:(v as HTMLVideoElement).poster}));
    expect(state.poster).toContain('/brand/web/flow-loop-poster.webp');expect(state.paused).toBe(reducedMotion==='reduce');
    await context.close();
  }
});
test('text contrast ≥ 4.5:1 (≥ 3:1 large) on public and product surfaces',async({page})=>{
  const scan=()=>page.evaluate(()=>{
    // Handles rgb()/rgba() and color(srgb r g b / a) (what color-mix() computes to, channels 0–1).
    const parse=(c:string)=>{const m=c.match(/[\d.]+/g)!.map(Number);const srgb=c.startsWith('color(');const rgb=(srgb?m.slice(0,3).map(v=>v*255):m.slice(0,3));return [...rgb,m.length>3?m[3]:1];};
    const lum=([r,g,b]:number[])=>{const f=(v:number)=>{v/=255;return v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4;};return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b);};
    const over=(t:number[],b:number[])=>[0,1,2].map(i=>t[i]*t[3]+b[i]*(1-t[3])).concat([1]);
    const bg=(el:Element)=>{const layers=[];for(let e:Element|null=el;e;e=e.parentElement){const c=parse(getComputedStyle(e).backgroundColor);if(c[3]>0)layers.push(c);if(c[3]===1)break;}let out=[247,243,234,1];for(const l of layers.reverse())out=over(l,out);return out;};
    const fails:string[]=[];let checked=0;
    for(const el of document.querySelectorAll('main *,header *')){
      if(!el.checkVisibility()||![...el.childNodes].some(n=>n.nodeType===3&&n.textContent!.trim()))continue;
      if(el.closest('.hero'))continue; // Text over photography is checked against its overlay below.
      const s=getComputedStyle(el),b=bg(el),f=over(parse(s.color),b),L=[lum(f),lum(b)].sort((x,y)=>y-x),ratio=(L[0]+.05)/(L[1]+.05);
      const size=parseFloat(s.fontSize),large=size>=24||(Number(s.fontWeight)>=700&&size>=18.66);checked++;
      if(ratio<(large?3:4.5))fails.push(`${el.tagName} "${el.textContent!.trim().slice(0,30)}" ${ratio.toFixed(2)}`);
    }
    return {checked,fails};
  });
  await page.setViewportSize(viewports.desktop);
  for(const path of ['/','/login','/request-access']){await page.goto(path);const r=await scan();expect(r.fails,path).toEqual([]);expect(r.checked).toBeGreaterThan(3);}
  // Text over photography: measure against the real rendered pixels behind each text box (text hidden),
  // taking the 5th-percentile (worst) pixel contrast, at desktop and mobile.
  for(const viewport of [viewports.desktop,viewports.mobile]){
    await page.setViewportSize(viewport);await page.goto('/');await page.waitForLoadState('networkidle');
    // CSSOM changes are allowed by the strict CSP (inline <style> is not): hide the text, keep the backdrop.
    await page.evaluate(()=>document.querySelectorAll<HTMLElement>('.hero-copy > *').forEach(el=>{el.style.opacity='0';}));
    const png=(await page.screenshot()).toString('base64');
    const worst=await page.evaluate(async data=>{
      // Decode from bytes (no URL load), so the page CSP stays untouched.
      const img=await createImageBitmap(new Blob([Uint8Array.from(atob(data),ch=>ch.charCodeAt(0))],{type:'image/png'}));
      const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const g=c.getContext('2d')!;g.drawImage(img,0,0);const scale=img.width/innerWidth;
      const lum=(r:number,gg:number,b:number)=>{const f=(v:number)=>{v/=255;return v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4;};return 0.2126*f(r)+0.7152*f(gg)+0.0722*f(b);};
      const results:{text:string;ratio:number;need:number}[]=[];
      document.querySelectorAll<HTMLElement>('.hero-copy > *').forEach(el=>{el.style.opacity='';});
      for(const el of document.querySelectorAll('.hero-copy h1,.hero-copy .lead,.hero-copy .eyebrow')){
        const r=el.getBoundingClientRect(),s=getComputedStyle(el),[fr,fg,fb]=s.color.match(/\d+/g)!.map(Number),tl=lum(fr,fg,fb);
        const px=g.getImageData(Math.floor(r.left*scale),Math.floor(r.top*scale),Math.max(1,Math.floor(r.width*scale)),Math.max(1,Math.floor(r.height*scale))).data,ratios:number[]=[];
        for(let i=0;i<px.length;i+=4*7){const bl=lum(px[i],px[i+1],px[i+2]),L=[tl,bl].sort((a,b)=>b-a);ratios.push((L[0]+.05)/(L[1]+.05));}
        ratios.sort((a,b)=>a-b);const size=parseFloat(s.fontSize);
        results.push({text:el.textContent!.trim().slice(0,24),ratio:+ratios[Math.floor(ratios.length*.05)].toFixed(2),need:size>=24?3:4.5});
      }
      return results;
    },png);
    for(const w of worst)expect(w.ratio,`${viewport.width}px hero "${w.text}"`).toBeGreaterThanOrEqual(w.need);
  }
  await page.setViewportSize(viewports.desktop);
  await signIn(page,seeded.brand.id,'Positioning');await page.getByRole('button',{name:'Ver impacto',exact:true}).click();
  const r=await scan();expect(r.fails).toEqual([]);
});
