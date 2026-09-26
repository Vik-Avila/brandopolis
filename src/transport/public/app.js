const $=s=>document.querySelector(s);
import {escape,labels,fmt,needsReview,practiceHtml,homeHtml,impactPair as impactView,historyHtml as historyView} from './product-views.js';
import {containDialogFocus,decisionTabs} from './product-interactions.js';
let activeDecisionTab='overview';
let user,brandId,context,selected=Object.hasOwn(labels,new URL(location.href).searchParams.get('module'))?new URL(location.href).searchParams.get('module'):'Primary Customer',draft=null,impactVisible=false;
let pilotMode=false,aiNotice=null;
const notice=(text,error=false,kind)=>{const n=$('#notice');n.textContent=text;n.className=error?'error':'';n.dataset.kind=kind??(error?'technical':'status');};
async function api(path,input) {
  let response,data;
  try {
    response=await fetch(path,{method:input===undefined?'GET':'POST',headers:{'Content-Type':'application/json'},body:input===undefined?undefined:JSON.stringify(input),signal:AbortSignal.timeout(15000)});
    data=await response.json();
  } catch {
    preserveDraft();throw new Error(input===undefined?(pilotMode?'No pudimos conectar con Brandopolis. Revisa tu conexión y vuelve a intentar.':'No pudimos conectar con la demo local. Comprueba que la terminal siga abierta y vuelve a intentar.'):'No recibimos confirmación. Tu borrador se conserva. Revisa el estado antes de repetir la acción para evitar duplicados.');
  }
  if(!response.ok) {
    const conflict=path.includes('/learning/')?'Este registro cambió o no permite esa acción. Vuelve a abrir Experimentos y aprendizajes para revisar su estado.':path.includes('/recommendations/')?'La propuesta ya no corresponde al contexto actual. Vuelve a abrir la decisión y compara opciones de nuevo.':'Esta decisión cambió mientras la estabas editando. Revisa la versión más reciente antes de aprobar. Si usaste una recomendación, genera otra con el contexto actual.';
    const messages={CONFLICT:conflict,UNAUTHORIZED:pilotMode?'Tu sesión venció. Vuelve a entrar al piloto.':'Tu sesión DEMO venció o no está disponible. Vuelve a entrar con la sesión local vigente.',FORBIDDEN:pilotMode?'No tienes permiso para esta acción o esta marca.':'No tienes permiso para esta acción. Revisa que hayas entrado con la sesión DEMO correcta.',UNAVAILABLE:pilotMode?'El servicio no está disponible por el momento. Tu borrador se conserva; vuelve a intentar en unos minutos.':'La demo local no está disponible. Conserva tu borrador y comprueba que la terminal siga abierta.',RATE_LIMITED:'Demasiadas solicitudes seguidas. Espera un momento y vuelve a intentar.',AI_CAP_REACHED:'Se alcanzó el límite diario de propuestas IA. Puedes continuar con tu decisión humana y volver a pedir propuestas mañana.',AI_CONSENT_REQUIRED:'Antes de pedir una propuesta, confirma el aviso sobre el uso de datos con IA.',INVALID:'Revisa los campos requeridos y el contexto disponible antes de continuar.',NOT_FOUND:'La marca o el registro ya no está disponible para esta sesión. Selecciona una marca accesible.'};
    if(data.code==='UNAUTHORIZED'){preserveDraft();document.body.classList.remove('app');$('#login').hidden=false;$('#workspace').hidden=true;$('#logout').hidden=true;$('#menu').hidden=true;}
    throw Object.assign(new Error(messages[data.code]??'No se pudo completar la operación. Conserva tus datos y revisa el estado antes de reintentar.'),{code:data.code});
  }
  return data;
}
let operationPending=false;
function focusView(target){const el=target??$('#decision h2');if(!el)return;if(!el.hasAttribute('tabindex'))el.tabIndex=-1;el.focus({preventScroll:false});}
const setTitle=text=>{document.title=text?`${text} · Brandopolis`:'Brandopolis · The Brand Operating System';if(document.body.classList.contains('app'))$('#header-context').textContent=text||'Tu espacio estratégico';};
async function run(action,button) {
  if(operationPending)return;operationPending=true;$('#workspace').setAttribute('aria-busy','true');
  const controls=[...document.querySelectorAll('button,select')].map(element=>({element,disabled:element.disabled}));
  controls.forEach(({element})=>{element.disabled=true;});if(button)button.setAttribute('aria-busy','true');
  notice('Procesando tu acción…');
  try{await action();if($('#notice').textContent==='Procesando tu acción…')notice('');}
  catch(error){const kind=error.code==='UNAUTHORIZED'?'session':['INVALID','CONFLICT'].includes(error.code)?'validation':['AI_CAP_REACHED','AI_CONSENT_REQUIRED'].includes(error.code)?'assistance':'technical';notice(error instanceof Error?error.message:'No se pudo completar la acción. Conserva tus datos e inténtalo de nuevo.',true,kind);}
  finally{operationPending=false;$('#workspace').removeAttribute('aria-busy');controls.forEach(({element,disabled})=>{if(element.isConnected)element.disabled=disabled;});button?.removeAttribute('aria-busy');
    // Disabling or re-rendering drops focus to <body>; return it to the control or to the view heading.
    if(!document.activeElement||document.activeElement===document.body){if(button?.isConnected&&!button.disabled)button.focus();else focusView();}}
}
async function loadBrands(preferred) {
  const brands=await api('/api/brands');
  $('#brands').innerHTML=brands.map(b=>`<option value="${escape(b.id)}">${escape(b.name)} · ${escape(b.dataClass)}</option>`).join('');
  brandId=brands.some(b=>b.id===preferred)?preferred:brands[0]?.id;
  if(brandId)$('#brands').value=brandId;
  activeDecisionTab='overview';draft=null;await refresh();
}
async function authenticated() {const directModule=new URL(location.href).searchParams.has('module');document.body.classList.add('app');for(const id of ['#gateway','#request-access-view'])$(id).hidden=true;$('#login').hidden=true;document.body.classList.remove('booting');user=await api('/api/me');$('#workspace').hidden=false;$('#logout').hidden=false;$('#menu').hidden=false;await loadBrands(new URL(location.href).searchParams.get('brand'));if(!directModule&&context)await showHome();}
async function refresh(){if(brandId)context=await api(`/api/context?brandId=${encodeURIComponent(brandId)}`);else context=null;render();}
function render() {
  setNavActive();$('#decision').dataset.view='decision';updateShell();
  document.querySelectorAll('[data-module]').forEach(b=>{if(b.dataset.module===selected)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  if(!context){$('#decision').innerHTML='<section class="empty-state" aria-labelledby="onboarding-title"><p class="eyebrow">Tu punto de partida</p><h2 id="onboarding-title">Construye tu primera decisión estratégica.</h2><p>Primero a quién sirves. Después, cómo quieres ser elegido. Cada decisión conservará tu criterio y su historia.</p><ol><li>Abre «Nueva marca» para crear tu espacio.</li><li>Define tu cliente principal.</li><li>Compara opciones y decide con tu criterio.</li></ol><p><strong>La IA propone. Tú decides. Brandopolis recuerda.</strong></p></section>';$('#context').innerHTML='';return;}
  history.replaceState(null,'',`/?brand=${encodeURIComponent(brandId)}&module=${encodeURIComponent(selected)}`);setTitle(labels[selected]);
  const q=context.questions.find(q=>q.module===selected),d=context.decisions.find(d=>d.questionId===q.id),v=context.versions.find(v=>v.id===d?.activeVersionId),reviews=context.reviews.filter(r=>r.downstreamDecisionId===d?.id&&r.status!=='COMPLETED');
  const pending=context.impacts.some(i=>i.status==='IMPACT_PENDING');
  const hasCustomer=context.decisions.some(d=>context.questions.find(q=>q.id===d.questionId)?.module==='Primary Customer');
  const locked=selected==='Positioning'&&!hasCustomer;
  const editButton=`<button id="edit" ${pending||locked?'disabled':''}>${reviews.length?'Iniciar revisión humana':v?'Preparar nueva versión':'Preparar decisión'}</button>`;
  // Review card: the signature flow is shown as words, never as automatic rewriting.
  const warn=reviews.length?`<section class="review" aria-labelledby="review-title"><h3 id="review-title">Tu estrategia ha evolucionado.</h3><p>Una decisión conectada cambió. Esta decisión no se modificará hasta que una persona complete la revisión.</p><ol class="impact-steps" aria-label="Recorrido de la revisión"><li>Decisión que cambió</li><li>${reviews.some(r=>r.dependencyType==='HARD')?'Dependencia estricta':'Dependencia sugerida'}</li><li>Decisión afectada</li><li>Requiere revisión</li><li>Revisión humana</li></ol>${impactVisible?reviews.map(r=>impactPair(r,q,v)+`<p class="impact-reason">${escape(impactReason(r))}</p>`).join(''):''}<div class="actions">${draft?'':editButton}<button id="show-impact" class="secondary" aria-expanded="${impactVisible}">Ver impacto</button></div></section>`:'';
  const versions=context.versions.filter(v=>v.decisionId===d?.id).sort((a,b)=>b.sequence-a.sequence);
  const why=user.learningMoments?.[q.module]?.why;
  const reviewChoices='<h3>¿Qué quieres hacer?</h3><div class="review-options" role="group" aria-label="Opciones de revisión"><button type="button" id="keep" class="option-card" aria-pressed="false" aria-label="Mantener sin cambios" aria-describedby="keep-hint"><strong>Mantener sin cambios</strong><span id="keep-hint">La decisión sigue siendo válida con el nuevo contexto.</span></button><button type="button" id="modify" class="option-card" aria-pressed="false" aria-label="Modificar" aria-describedby="modify-hint"><strong>Modificar</strong><span id="modify-hint">Ajustas la decisión a lo que cambió.</span></button></div>';
  $('#decision').innerHTML=`<p class="eyebrow">${escape(labels[selected])}</p><h2>${escape(q.text)}</h2><p class="decision-meta"><span class="badge ${reviews.length?'warn':''}">${reviews.length?'Requiere revisión':v?'Actual · v'+v.sequence:'Por decidir'}</span>${v?`<span>Última actualización: ${escape(fmt(v.approvedAt))}</span><span>Decidido por: ${v.actorUserId===user.userId?'Tú':'Persona autorizada'}</span>`:''}</p>${why?`<p class="why"><span class="label">Por qué es importante:</span> ${escape(why)}</p>`:''}${pending?'<section class="review"><h3>Impacto pendiente</h3><p>La decisión se guardó. Falta calcular su efecto antes de otro cambio.</p><button id="retry-impact">Reintentar impacto</button></section>':''}${warn}${draft?`<form id="decision-form" class="decision-form">${draft.reviewToken?reviewChoices:''}<label for="option">Decisión propuesta</label><textarea id="option" name="selectedOption" required maxlength="12000" aria-describedby="form-hint">${escape(draft.selectedOption)}</textarea><label for="rationale">¿Por qué eliges esta opción?</label><textarea id="rationale" name="rationale" required maxlength="12000">${escape(draft.rationale)}</textarea><div class="form-footer"><p class="hint" id="form-hint">${draft.reviewToken?'Nada se reescribe sin tu confirmación: «Confirmar revisión» registra una nueva versión humana y conserva las anteriores.':'Tu elección y tu criterio dan forma a la estrategia. Aprobar crea una versión humana nueva y conserva las anteriores.'}</p><div class="actions"><button id="cancel" type="button" class="secondary">Cancelar</button><button type="submit">${draft.reviewToken?'Confirmar revisión':'Aprobar decisión'}</button></div></div></form>`:`${v?`<p class="current">${escape(v.selectedOption)}</p><p class="rationale"><span class="label">Por qué:</span> ${escape(v.rationale)}</p>`:`<p class="empty">${locked?'Aprueba primero tu cliente prioritario.':'Todavía no hay una decisión aprobada. Define tu elección y explica tu criterio.'}</p>`}`}<div class="actions">${!draft&&!reviews.length?editButton:''}<button id="reload" class="tertiary">Revisar versión más reciente</button>${sessionStorage.getItem(`draft:${user.userId}:${brandId}:${selected}`)?'<button id="restore-draft" class="tertiary">Ver borrador conservado</button>':''}</div>`;
  composeDecision(q,d,v,reviews);
  mountRecommendation(q,d,v,reviews,pending||locked);
  mountLearningMoment(q);
  $('#decision').insertAdjacentHTML('beforeend',historyHtml(versions,d));
  decisionTabs($('#decision'),draft?'overview':activeDecisionTab,key=>{activeDecisionTab=key;},versions.length);
  renderContext();
  $('#edit')?.addEventListener('click',event=>run(async()=>{
    let receipt;
    if(reviews.length){impactVisible=true;await api('/api/impacts/shown',{brandId});receipt=await api('/api/reviews/start',{brandId,decisionId:d.id});}
    // Capture the version the human actually saw; never replace it automatically during save.
    activeDecisionTab='overview';draft={questionId:q.id,expectedActiveVersion:v?.id??null,selectedOption:v?.selectedOption??'',rationale:'',idempotencyKey:crypto.randomUUID(),reviewToken:receipt?.reviewToken};
    await api('/api/questions/prepare',{brandId,questionId:q.id,expectedActiveVersion:draft.expectedActiveVersion});
    await refresh();$('#option').focus();
  },event.currentTarget));
  $('#decision-form')?.addEventListener('input',()=>{draft.selectedOption=$('#option').value;draft.rationale=$('#rationale').value;});
  $('#decision-form')?.addEventListener('submit',event=>{event.preventDefault();run(async()=>{
    const command={brandId,questionId:draft.questionId,sourceRecommendationId:draft.sourceRecommendationId??null,selectedOption:draft.selectedOption,rationale:draft.rationale,expectedActiveVersion:draft.expectedActiveVersion,idempotencyKey:draft.idempotencyKey,actorUserId:user.userId};
    const result=await api('/api/decisions/commit',{command,reviewToken:draft.reviewToken});draft=null;await refresh();notice(result.impactPending?'Decisión guardada. El impacto está pendiente; reinténtalo.':'Decisión aprobada. Su versión y su historial quedaron guardados.');
  },event.submitter);});
  const choose=id=>{for(const b of ['#keep','#modify'])$(b).setAttribute('aria-pressed',String(b===id));};
  $('#keep')?.addEventListener('click',()=>{choose('#keep');draft.selectedOption=v.selectedOption;$('#option').value=v.selectedOption;$('#option').readOnly=true;$('#rationale').focus();});
  $('#modify')?.addEventListener('click',()=>{choose('#modify');$('#option').readOnly=false;$('#option').focus();});
  $('#cancel')?.addEventListener('click',()=>{draft=null;render();focusView($('#edit')??undefined);});
  $('#reload').addEventListener('click',event=>run(async()=>{if(draft)sessionStorage.setItem(`draft:${user.userId}:${brandId}:${selected}`,JSON.stringify(draft));draft=null;await refresh();notice('Borrador conservado en esta pestaña. Contexto recargado. Revisa la versión vigente antes de volver a editar.');},event.currentTarget));
  $('#restore-draft')?.addEventListener('click',()=>{const saved=JSON.parse(sessionStorage.getItem(`draft:${user.userId}:${brandId}:${selected}`));notice(`Borrador conservado: ${saved.selectedOption} — ${saved.rationale}`);});
  $('#show-impact')?.addEventListener('click',event=>run(async()=>{impactVisible=true;render();await api('/api/impacts/shown',{brandId});focusView($('.impact-pair'));},event.currentTarget));
  $('#retry-impact')?.addEventListener('click',event=>run(async()=>{const result=await api('/api/impacts/retry',{brandId});await refresh();notice(result.pending?'El impacto sigue pendiente.':'Impacto calculado.',result.pending);},event.currentTarget));
}
$('#login-form').addEventListener('submit',event=>{event.preventDefault();run(async()=>{await api('/api/session',{token:$('#token').value});$('#token').value='';await authenticated();notice('Workspace disponible.');},event.submitter);});
$('#logout').addEventListener('click',event=>run(async()=>{await api('/api/logout',{});location.reload();},event.currentTarget));
$('#create-brand').addEventListener('submit',event=>{event.preventDefault();run(async()=>{preserveDraft();const brand=await api('/api/brands',{name:$('#brand-name').value,initialContext:$('#initial-context').value.trim()||undefined});$('#brand-name').value='';$('#initial-context').value='';$('#brand-dialog').close();await loadBrands(brand.id);notice('Marca creada. Comienza con tu cliente principal.');},event.submitter);});
$('#new-brand').addEventListener('click',()=>{$('#brand-dialog').showModal();$('#brand-name').focus();});
$('#cancel-brand').addEventListener('click',()=>$('#brand-dialog').close());
$('#brand-dialog').addEventListener('close',()=>$('#new-brand').focus());
containDialogFocus($('#brand-dialog'));
$('#brands').addEventListener('change',event=>run(async()=>{preserveDraft();brandId=event.target.value;activeDecisionTab='overview';draft=null;impactVisible=false;await refresh();notice('Marca activa actualizada. Su contexto permanece separado.');}));
document.querySelectorAll('[data-module]').forEach(button=>button.addEventListener('click',()=>{preserveDraft();selected=button.dataset.module;activeDecisionTab='overview';draft=null;impactVisible=false;const fromDrawer=$('#journey').classList.contains('open');closeMenu(false);render();if(fromDrawer)focusView();}));

// History is strategic evolution: version, date, actor, rationale and the superseded relation.
function historyHtml(versions,decision){return historyView(versions,decision,user.userId);}
function impactPair(review,question,version){return impactView(context,review,question,version);}
function impactReason(review){
 const trigger=context.versions.find(v=>v.id===review.triggerVersionId),decision=context.decisions.find(d=>d.id===trigger?.decisionId),question=context.questions.find(q=>q.id===decision?.questionId);
 const label=labels[question?.module]??'Decisión conectada';
 return `${label} cambió: versión ${context.versions.find(v=>v.id===trigger?.previousVersionId)?.sequence??'anterior'} → ${trigger?.sequence??'vigente'}. ${review.dependencyType==='HARD'?'Una dependencia estricta requiere confirmar que tu decisión sigue alineada.':'Revisa si este cambio afecta tu decisión.'}`;
}
function preserveDraft(){if(draft&&brandId)sessionStorage.setItem(`draft:${user.userId}:${brandId}:${selected}`,JSON.stringify(draft));}
const narrow=matchMedia('(max-width:1279px)');
function drawerBackground(inert){for(const selector of ['header','.skip','.workspace-head','#create-brand','#decision','#context','footer'])$(selector).inert=inert;}
function closeMenu(returnFocus=true){const nav=$('#journey'),wasOpen=nav.classList.contains('open');nav.classList.remove('open');nav.removeAttribute('role');nav.removeAttribute('aria-modal');$('#nav-backdrop').hidden=true;$('#menu').setAttribute('aria-expanded','false');drawerBackground(false);nav.inert=narrow.matches;if(wasOpen&&returnFocus&&narrow.matches)$('#menu').focus();}
$('#menu').addEventListener('click',()=>{$('#journey').inert=false;$('#journey').classList.add('open');$('#journey').setAttribute('role','dialog');$('#journey').setAttribute('aria-modal','true');$('#nav-backdrop').hidden=false;$('#menu').setAttribute('aria-expanded','true');drawerBackground(true);$('#close-menu').focus();});
narrow.addEventListener('change',()=>closeMenu(false));$('#journey').inert=narrow.matches;
$('#close-menu').addEventListener('click',closeMenu);$('#nav-backdrop').addEventListener('click',closeMenu);
document.addEventListener('keydown',e=>{if(!$('#journey').classList.contains('open'))return;if(e.key==='Escape')closeMenu();if(e.key==='Tab'){const controls=[...$('#journey').querySelectorAll('button')].filter(x=>!x.disabled),first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
$('#blueprint').addEventListener('click',()=>run(showBlueprint));
$('#home').addEventListener('click',()=>run(showHome));
// Public views of the single page: gateway (/), access (/login) and request access (/request-access).
function showPublicView(){
 const path=location.pathname;
 $('#gateway').hidden=path!=='/';$('#login').hidden=path==='/request-access';$('#request-access-view').hidden=path!=='/request-access';
 // On the gateway the access card is a section of the page, not a second top-level heading.
 if(path==='/')$('#login-title').setAttribute('aria-level','2');else $('#login-title').removeAttribute('aria-level');
 setTitle(path==='/login'?'Acceder':path==='/request-access'?'Solicitar acceso':'');
}
showPublicView();
// Motion is an enhancement: the poster stays when reduced motion is requested or the video cannot play.
const flow=$('.flow-video'),still=matchMedia('(prefers-reduced-motion: reduce)'),motionToggle=$('#motion-toggle');let userPaused=false,flowVisible=false;
const syncMotion=()=>{const allowed=!still.matches&&!userPaused;motionToggle.hidden=still.matches;if(flowVisible&&allowed)flow.play().catch(()=>{});else flow.pause();};
if(flow&&'IntersectionObserver' in window)new IntersectionObserver(entries=>{flowVisible=entries.some(e=>e.isIntersecting);syncMotion();}).observe(flow);
still.addEventListener('change',syncMotion);syncMotion();
motionToggle.addEventListener('click',()=>{userPaused=!userPaused;motionToggle.setAttribute('aria-pressed',String(userPaused));motionToggle.textContent=userPaused?'Reanudar animación':'Pausar animación';syncMotion();});
Promise.all([api('/api/mode'),api('/api/session-state')]).then(async([mode,state])=>{
 pilotMode=mode.mode==='PILOT';aiNotice=mode.aiNotice??null;
 if(pilotMode){
  $('#login-form').hidden=true;$('#mode-badge').textContent='PILOT';
  const entry=document.createElement('div');entry.id='pilot-entry';entry.innerHTML='<p class="eyebrow"><span lang="en">The Brand Operating System</span> · Piloto por invitación</p><p>Construye tu primera decisión estratégica. La IA propone; tú decides. Tus marcas conservan contexto e historial dentro de tu espacio autorizado.</p><p><a class="button" href="/auth/login">Entrar al piloto</a></p><p id="request-access" class="hint">¿Aún no tienes acceso? <a href="/request-access">Solicitar acceso</a></p>';$('#login').append(entry);
  if(mode.requestAccessUrl&&/^(https:|mailto:)/.test(mode.requestAccessUrl)){const link=document.createElement('a');link.href=mode.requestAccessUrl;link.className='button';link.textContent=mode.requestAccessUrl.startsWith('mailto:')?'Escribir para solicitar acceso':'Abrir formulario de solicitud';link.rel='noopener';$('#request-destination').replaceChildren(link);}
  const login=new URL(location.href).searchParams.get('login'),reasons={denied:'Tu identidad no tiene acceso a este piloto. Solicita acceso a quien lo organiza.',expired:'El inicio de sesión tardó demasiado. Vuelve a intentarlo.',failed:'No se pudo completar el inicio de sesión. Vuelve a intentarlo.'};
  if(reasons[login]){notice(reasons[login],true);history.replaceState(null,'','/');}
  const feedback=document.createElement('button');feedback.id='pilot-feedback';feedback.className='secondary';feedback.textContent='Compartir feedback';feedback.addEventListener('click',()=>run(showFeedback));$('#journey').append(feedback);
 }
 // Booting only covers the session probe; the app shell is interactive while brands load.
 if(state.authenticated)await authenticated();else document.body.classList.remove('booting');
}).catch(error=>{if(error.code!=='UNAUTHORIZED')notice(error.message,true);}).finally(()=>document.body.classList.remove('booting'));
$('#brand-context').addEventListener('click',()=>run(showBrandContext));
async function showBrandContext(){
 setTitle('Contexto estratégico');
 setNavActive('#brand-context');
 closeMenu(false);preserveDraft();draft=null;if(!brandId)return;context=await api(`/api/context?brandId=${encodeURIComponent(brandId)}`);renderContext();
 const groups=[['Aprendizajes aceptados',context.learnings.filter(l=>l.status==='ACCEPTED')],['Aportaciones humanas',context.userInputs],['Hipótesis por validar',context.hypotheses],['Evidencia registrada',context.evidence],['Preguntas abiertas',context.openQuestions]];
 $('#decision').innerHTML=`<p class="eyebrow">Contexto estratégico</p><h2>¿Qué sabes y qué falta comprobar?</h2><ul class="kpis" aria-label="Memoria de marca"><li><strong>${context.evidence.length}</strong><span>Fuentes registradas</span></li><li><strong>${context.hypotheses.length}</strong><span>Hipótesis explícitas</span></li><li><strong>${context.userInputs.length}</strong><span>Aportaciones humanas</span></li><li><strong>${context.learnings.filter(l=>l.status==='ACCEPTED').length}</strong><span>Aprendizajes aceptados</span></li></ul>${currentStrategySummary()}<p>Tus aportaciones orientan la estrategia. Las hipótesis siguen sin validar hasta que exista una revisión respaldada.</p><form id="capture-context"><label for="context-kind">Tipo de aportación</label><select id="context-kind"><option value="user-input">Aportación humana</option><option value="hypothesis">Hipótesis por validar</option><option value="open-question">Pregunta abierta</option><option value="evidence">Evidencia</option></select><label for="context-statement">Contenido</label><textarea id="context-statement" maxlength="6000" required></textarea><fieldset id="evidence-fields" hidden><legend>Evaluación humana de la fuente</legend><label for="evidence-source">Fuente</label><input id="evidence-source" maxlength="1000"><label for="evidence-date">Fecha de la fuente</label><input id="evidence-date" type="date"><label for="evidence-provenance">Cómo se obtuvo</label><input id="evidence-provenance" maxlength="1000"><label for="evidence-quality">Calidad de la fuente</label><select id="evidence-quality"><option value="LOW">Baja</option><option value="MEDIUM">Media</option><option value="HIGH">Alta</option></select><label for="evidence-relevance">Relevancia</label><select id="evidence-relevance"><option value="INDIRECT">Indirecta</option><option value="DIRECT">Directa</option></select><label for="evidence-freshness">Vigencia</label><select id="evidence-freshness"><option value="HISTORICAL">Histórica</option><option value="AGING">Envejeciendo</option><option value="CURRENT">Actual</option></select><label for="evidence-limitations">Limitaciones</label><input id="evidence-limitations" maxlength="1000"><label><input id="evidence-external" type="checkbox" checked> Fuente externa</label><p class="hint">Tu evaluación queda registrada. El sistema no certifica la veracidad de la fuente.</p></fieldset><button type="submit">Guardar contexto</button></form>${groups.map(([title,rows],index)=>`<section class="memory-group memory-${index}"><h3>${title}</h3>${rows.length?rows.map(r=>`<p>${escape(r.statement??r.claim??r.text??r.interpretation)}</p>${r.source?`<p class="hint">${escape(r.source)} · ${escape(r.sourceDate)} · ${escape(r.provenance)}<br>Limitaciones: ${escape(r.limitations.join('; ')||'No declaradas')}</p>`:''}`).join(''):'<p class="hint">Aún no hay registros.</p>'}</section>`).join('')}`;
 $('#context-kind').addEventListener('change',()=>{const evidence=$('#context-kind').value==='evidence';$('#evidence-fields').hidden=!evidence;for(const name of ['source','date','provenance','limitations'])$(`#evidence-${name}`).required=evidence;});
 $('#capture-context').addEventListener('submit',event=>{event.preventDefault();run(async()=>{const kind=$('#context-kind').value,text=$('#context-statement').value;let entity=kind==='open-question'?{text,relatedHypothesisId:null}:{statement:text};if(kind==='evidence')entity={claim:text,source:$('#evidence-source').value,sourceDate:$('#evidence-date').value,provenance:$('#evidence-provenance').value,sourceQuality:$('#evidence-quality').value,relevance:$('#evidence-relevance').value,freshness:$('#evidence-freshness').value,limitations:[$('#evidence-limitations').value],external:$('#evidence-external').checked};await api('/api/context/capture',{brandId,kind,entity});await showBrandContext();notice('Contexto guardado. Las recomendaciones anteriores deberán actualizarse.');},event.submitter);});
}
function mountRecommendation(q,d,v,reviews,locked){
 if(draft)return;
 const facts=context.evidence,assumptions=context.hypotheses.filter(h=>h.status!=='REJECTED');
 $('#decision').insertAdjacentHTML('beforeend',`<details class="knowledge" open><summary>Lo que sabemos y lo que suponemos</summary><div class="knowledge-grid"><section class="evidence-panel"><p class="eyebrow">Fuentes y observaciones</p><h3>Evidencia registrada</h3>${facts.map(e=>`<p>${escape(e.claim)}<br><span class="hint">${escape(e.source)} · ${escape(e.sourceDate)}. Límites: ${escape(e.limitations.join('; ')||'No declarados')}</span></p>`).join('')||'<p class="hint">Sin evidencia registrada. No confundas una propuesta con un hecho.</p>'}</section><section class="hypothesis-panel"><p class="eyebrow">Supuestos por comprobar</p><h3>Hipótesis explícitas</h3>${assumptions.map(h=>`<p>${escape(h.statement)}<br><span class="badge warn">${h.status==='SUPPORTED'?'Con soporte registrado':'Por validar'}</span></p>`).join('')||'<p class="hint">Aún no declaras hipótesis para esta marca.</p>'}</section></div><p class="hint">Este contexto de marca no implica que cada fuente respalde la propuesta.</p></details>`);
 const row=context.recommendations?.find(r=>r.questionId===q.id&&r.resolution==='GENERATED'),rec=row?.payload,analysis=context.analyses?.find(a=>a.recommendationId===rec?.id);
 const list=rows=>`<ul>${rows.map(text=>`<li>${escape(text)}</li>`).join('')}</ul>`;
 $('#decision').insertAdjacentHTML('beforeend',`<section class="recommendation" aria-label="Propuesta de asistencia"><p class="eyebrow">Asistencia estratégica · ${pilotMode?'Piloto':'DEMO'}</p><p class="hint">${pilotMode?'El contexto de esta marca se comparte con el proveedor IA configurado al solicitar una propuesta. Puede no estar disponible; siempre puedes decidir con tu propio criterio. No incluyas secretos ni datos personales innecesarios.':'Opciones fijas de demostración. No son análisis de IA en vivo ni evidencia de mercado.'}</p><button id="generate-recommendation" class="secondary" ${locked?'disabled':''}>${pilotMode?'Solicitar propuesta IA':'Comparar opciones DEMO'}</button>${rec?`<h3>Compara antes de decidir</h3><span class="badge warn">Sin validar · revisión humana necesaria</span>${rec.options.map(o=>`<article class="option ${o.id===rec.recommendedOptionId?'is-proposed':''}"><h4>${escape(o.label)}${o.id===rec.recommendedOptionId?(pilotMode?' · propuesta IA':' · propuesta DEMO'):''}</h4><p>${escape(o.rationale)}</p>${list(o.tradeoffs)}</article>`).join('')}<p>${escape(rec.rationale)}</p><h4>Renuncias y condiciones de fallo</h4>${list([...rec.tradeoffs,...rec.failureConditions])}<h4>Preguntas abiertas</h4>${list(rec.openQuestions)}<p class="hint">Evidencias: ${rec.evidenceReferences.length}. Hipótesis utilizadas: ${rec.hypothesesUsed.length}. Ámbitos: ${escape(rec.affectedDomains.map(x=>labels[x]??x).join(', '))}.</p><details><summary>Evaluación y límites</summary>${list(analysis?.evaluation?.issues.map(i=>i.reason)??[])}</details><div class="actions"><button id="use-recommendation" class="secondary">Usar recomendación</button><button id="modify-recommendation" class="secondary">Modificar recomendación</button></div><form id="reject-recommendation"><label for="reject-reason">Motivo para rechazar</label><input id="reject-reason" maxlength="1000" required><button class="secondary" type="submit">Rechazar recomendación</button></form>`:''}</section>`);
 $('#generate-recommendation').addEventListener('click',event=>run(async()=>{let result;try{result=await api('/api/recommendations/generate',{brandId,questionId:q.id});}catch(error){if(error.code==='AI_CONSENT_REQUIRED'&&aiNotice){showAiNotice(q.id);return;}throw error;}if(result.error){notice('No se pudo generar una propuesta válida. Puedes continuar con tu decisión humana.',true,'assistance');return;}await refresh();notice(pilotMode?'Propuesta lista para revisión humana. Aún no cambió ninguna decisión.':'Opciones DEMO listas para revisión. Aún no cambió ninguna decisión.');},event.currentTarget));
 const prepare=async(edit)=>{let receipt;if(reviews.length)receipt=await api('/api/reviews/start',{brandId,decisionId:d.id});activeDecisionTab='overview';draft={questionId:q.id,sourceRecommendationId:rec.id,expectedActiveVersion:v?.id??null,selectedOption:rec.options.find(o=>o.id===rec.recommendedOptionId)?.label??rec.options[0].label,rationale:'',idempotencyKey:crypto.randomUUID(),reviewToken:receipt?.reviewToken};await api('/api/questions/prepare',{brandId,questionId:q.id,expectedActiveVersion:draft.expectedActiveVersion});render();$('#option').readOnly=!edit;(edit?$('#option'):$('#rationale')).focus();};
 $('#use-recommendation')?.addEventListener('click',e=>run(()=>prepare(false),e.currentTarget));$('#modify-recommendation')?.addEventListener('click',e=>run(()=>prepare(true),e.currentTarget));
 $('#reject-recommendation')?.addEventListener('submit',event=>{event.preventDefault();run(async()=>{await api('/api/recommendations/reject',{brandId,recommendationId:rec.id,rationale:$('#reject-reason').value});await refresh();notice('Recomendación rechazada. Tu estrategia permanece como la aprobaste.');},event.submitter);});
}
const statusTone=status=>['INCONCLUSIVE','CANDIDATE','REVIEWED'].includes(status)?'warn':['CANCELLED','REJECTED'].includes(status)?'muted':'';
const statusLabels={PLANNED:'Planeado',RUNNING:'En curso',COMPLETED:'Completado',INCONCLUSIVE:'No concluyente',CANCELLED:'Cancelado',CANDIDATE:'Candidato',REVIEWED:'Revisado',ACCEPTED:'Aceptado',REJECTED:'Rechazado'};
async function showBlueprint(){
 setTitle('Blueprint estratégico');
 setNavActive('#blueprint');
 closeMenu(false);preserveDraft();draft=null;if(!brandId)return;context=await api(`/api/blueprint?brandId=${encodeURIComponent(brandId)}`);renderContext();
 const name=id=>labels[context.questions.find(q=>q.id===context.decisions.find(d=>d.id===id)?.questionId)?.module]??'Decisión';
 $('#decision').innerHTML=`<p class="eyebrow">Blueprint · estrategia vigente</p><h2>Una visión conectada de tu marca.</h2><p>Esta vista reúne tus decisiones actuales. Cada cambio se realiza desde su decisión y conserva su historial.</p>${context.impacts.some(i=>i.status==='IMPACT_PENDING')?'<p class="review">Hay un cálculo de impacto pendiente. Revisa el estado antes de continuar.</p>':''}<div class="blueprint-grid">${context.questions.map(q=>{const d=context.decisions.find(d=>d.questionId===q.id),v=context.versions.find(v=>v.id===d?.activeVersionId);return `<section class="analysis-item blueprint-pillar"><p class="eyebrow">${String(context.questions.indexOf(q)+1).padStart(2,'0')} · Pilar estratégico</p><h3>${escape(labels[q.module])}</h3><span class="badge ${needsReview(context,d)?'warn':''}">${needsReview(context,d)?'Requiere revisión':v?'Actual · v'+v.sequence:'Por decidir'}</span><p class="current">${escape(v?.selectedOption??'Aún no hay una decisión aprobada.')}</p><p>${escape(v?.rationale??'')}</p><button class="secondary" data-open-module="${escape(q.module)}">Abrir decisión</button></section>`;}).join('')}</div><h3>Conexiones</h3>${context.dependencies.map(d=>`<p class="dependency-path"><span>${escape(name(d.upstreamDecisionId))}</span><span class="badge ${d.kind==='HARD'?'':'muted'}">${d.kind==='HARD'?'Dependencia estricta':d.kind==='SOFT'?'Dependencia sugerida':'Informativa'}</span><span>${escape(name(d.downstreamDecisionId))}</span></p>`).join('')||'<p class="hint">Aún no hay decisiones conectadas.</p>'}<h3>Hipótesis abiertas</h3>${context.hypotheses.filter(h=>!['SUPPORTED','REJECTED'].includes(h.status)).map(h=>`<p>${escape(h.statement)}</p>`).join('')||'<p class="hint">Sin hipótesis abiertas registradas.</p>'}<h3>Aprendizajes aceptados</h3>${context.learnings.filter(l=>l.status==='ACCEPTED').map(l=>`<p>${escape(l.interpretation)}<br><span class="hint">Límites: ${escape(l.limitations.join('; '))}</span></p>`).join('')||'<p class="hint">Aún no hay aprendizajes aceptados.</p>'}`;
 document.querySelectorAll('[data-open-module]').forEach(button=>button.addEventListener('click',()=>{selected=button.dataset.openModule;activeDecisionTab='overview';render();focusView();}));
}
function currentStrategySummary(){return `<details><summary>Lo que decidiste y lo que requiere revisión</summary>${context.questions.map(q=>{const d=context.decisions.find(d=>d.questionId===q.id),v=context.versions.find(v=>v.id===d?.activeVersionId);return `<p><strong>${escape(labels[q.module])}</strong><br>${escape(v?.selectedOption??'Pregunta estratégica abierta')}${needsReview(context,d)?'<br><span class="badge warn">Requiere revisión humana</span>':''}</p>`;}).join('')}</details>`;}
async function showHome(){
 setTitle('Tu estrategia hoy');
 setNavActive('#home');
 closeMenu(false);preserveDraft();draft=null;if(!brandId)return;context=await api(`/api/context?brandId=${encodeURIComponent(brandId)}`);renderContext();
 $('#decision').innerHTML=homeHtml(context);
 document.querySelectorAll('[data-attention-module]').forEach(b=>b.addEventListener('click',()=>{selected=b.dataset.attentionModule;activeDecisionTab='overview';render();focusView();}));
 bindStrategyLinks();
 $('#attention-learning').addEventListener('click',()=>run(showLearning));$('#attention-context').addEventListener('click',()=>run(showBrandContext));
}
function mountLearningMoment(question){const m=user.learningMoments?.[question.module];if(m)$('#decision').insertAdjacentHTML('beforeend',`<details><summary>Un momento para afinar tu criterio</summary><p class="eyebrow">${escape(m.capability)}</p><h4>Por qué importa</h4><p>${escape(m.why)}</p><h4>Qué observar</h4><p>${escape(m.observe)}</p><h4>En tu negocio</h4><p>${escape(m.apply)}</p><h4>Cuidado con</h4><p>${escape(m.caution)}</p></details>`);}
$('#learning-loop').addEventListener('click',()=>run(showLearning));
async function showLearning(){
 setTitle('Experimentos y aprendizajes');
 setNavActive('#learning-loop');
 closeMenu(false);preserveDraft();draft=null;if(!brandId)return;context=await api(`/api/context?brandId=${encodeURIComponent(brandId)}`);renderContext();
 const options=(rows,label)=>rows.map(r=>`<option value="${escape(r.id)}">${escape(label(r))}</option>`).join(''),running=context.experiments.filter(e=>e.status==='RUNNING');
 const action=(kind,row,status,label)=>`<button type="button" class="secondary" data-transition="${kind}" data-id="${escape(row.id)}" data-from="${row.status}" data-to="${status}">${label}</button>`;
 $('#decision').innerHTML=`<p class="eyebrow">Experimentos y aprendizajes</p><h2>Comprueba lo que sostiene tu estrategia.</h2><p>Una señal registra lo ocurrido. Un aprendizaje interpreta esa señal y requiere tu revisión antes de aceptarse.</p><div class="learning-cycle" aria-label="Ciclo de aprendizaje"><span>01 · Experimenta</span><span>02 · Observa</span><span>03 · Interpreta y revisa</span></div><div class="learning-steps"><details open><summary>Planear un experimento</summary><form id="experiment-form"><label for="experiment-decision">Decisión relacionada</label><select id="experiment-decision" required>${options(context.decisions,d=>context.versions.find(v=>v.id===d.activeVersionId)?.selectedOption)}</select><label for="experiment-hypothesis">Hipótesis a comprobar</label><select id="experiment-hypothesis" required>${options(context.hypotheses,h=>h.statement)}</select><label for="experiment-objective">Objetivo del experimento</label><input id="experiment-objective" maxlength="4000" required><label for="success-criteria">Criterio de éxito</label><input id="success-criteria" maxlength="4000" required><label for="intended-signal">¿Qué señal esperas observar?</label><textarea id="intended-signal" maxlength="4000" required></textarea><button ${!context.decisions.length||!context.hypotheses.length?'disabled':''}>Crear experimento</button><p class="hint">Necesitas una decisión aprobada y una hipótesis registrada en Contexto estratégico.</p></form></details><details><summary>Registrar una señal</summary><form id="signal-form"><label for="signal-experiment">Experimento en curso</label><select id="signal-experiment" required>${options(running,e=>e.intendedSignal)}</select><label for="observation">¿Qué ocurrió?</label><textarea id="observation" maxlength="4000" required></textarea><label for="signal-source">Fuente de la observación</label><input id="signal-source" maxlength="1000" required><label for="signal-date">Fecha y hora observada</label><input id="signal-date" type="datetime-local" required><button ${!running.length?'disabled':''}>Guardar señal</button></form></details><details><summary>Proponer un aprendizaje</summary><form id="learning-form"><label for="learning-signal">Señal que lo sustenta</label><select id="learning-signal" required>${options(context.signals,s=>s.observation)}</select><label for="interpretation">Interpretación</label><textarea id="interpretation" maxlength="4000" required></textarea><label for="learning-limitations">Límites de esta interpretación</label><input id="learning-limitations" maxlength="1000" required><button ${!context.signals.length?'disabled':''}>Crear aprendizaje candidato</button></form></details></div><h3>Experimentos</h3>${context.experiments.map(e=>`<article class="analysis-item"><span class="badge ${statusTone(e.status)}">${statusLabels[e.status]}</span><p>${escape(e.intendedSignal)}</p>${experimentPlan(e.id)}<div class="actions">${e.status==='PLANNED'?action('experiment',e,'RUNNING','Iniciar experimento')+action('experiment',e,'CANCELLED','Cancelar experimento'):e.status==='RUNNING'?action('experiment',e,'COMPLETED','Completar experimento')+action('experiment',e,'INCONCLUSIVE','Marcar no concluyente')+action('experiment',e,'CANCELLED','Cancelar experimento'):''}</div></article>`).join('')||'<p class="hint">Aún no hay experimentos.</p>'}<h3>Señales</h3>${context.signals.map(s=>`<article class="analysis-item"><p>${escape(s.observation)}</p><p class="hint">${escape(s.source)} · ${escape(new Date(s.observedAt).toLocaleString('es-MX'))}</p></article>`).join('')||'<p class="hint">Aún no hay observaciones.</p>'}<h3>Aprendizajes</h3>${context.learnings.map(l=>`<article class="analysis-item"><span class="badge ${statusTone(l.status)}">${statusLabels[l.status]}</span><p>${escape(l.interpretation)}</p><p class="hint">Límites: ${escape(l.limitations.join('; '))}</p><div class="actions">${l.status==='CANDIDATE'?action('learning',l,'REVIEWED','Confirmar revisión'):l.status==='REVIEWED'?action('learning',l,'ACCEPTED','Aceptar aprendizaje')+action('learning',l,'REJECTED','Rechazar aprendizaje'):''}</div></article>`).join('')||'<p class="hint">Aún no hay aprendizajes.</p>'}`;
 if(context.experiments.length||context.signals.length||context.learnings.length)$('#decision').append($('.learning-steps'));
 const submit=(selector,kind,entity,extra=()=>({}))=>$(selector).addEventListener('submit',e=>{e.preventDefault();run(async()=>{await api('/api/learning/create',{brandId,kind,entity:entity(),...extra()});await showLearning();notice('Registro guardado. Las decisiones no cambiaron.');},e.submitter);});
 submit('#experiment-form','experiment',()=>({hypothesisId:$('#experiment-hypothesis').value,intendedSignal:$('#intended-signal').value}),()=>({decisionId:$('#experiment-decision').value,plan:{objective:$('#experiment-objective').value,successCriteria:$('#success-criteria').value}}));
 submit('#signal-form','signal',()=>({experimentId:$('#signal-experiment').value,observation:$('#observation').value,source:$('#signal-source').value,observedAt:new Date($('#signal-date').value).toISOString()}));
 submit('#learning-form','learning',()=>({signalIds:[$('#learning-signal').value],interpretation:$('#interpretation').value,limitations:[$('#learning-limitations').value]}));
 document.querySelectorAll('[data-transition]').forEach(button=>button.addEventListener('click',()=>run(async()=>{await api('/api/learning/transition',{brandId,kind:button.dataset.transition,objectId:button.dataset.id,expectedStatus:button.dataset.from,status:button.dataset.to});await showLearning();notice('Revisión humana guardada. El historial estratégico permanece intacto.');},button)));
}
function experimentPlan(id){const p=context.experimentPlans.find(p=>p.experimentId===id);if(!p)return '';const dates=[['Creado',p.createdAt],['Inicio',p.startedAt],['Cierre',p.completedAt]].filter(([,v])=>v).map(([k,v])=>`${k}: ${escape(fmt(v))}`).join(' · ');return `<p><strong>Objetivo:</strong> ${escape(p.objective)}<br><strong>Criterio de éxito:</strong> ${escape(p.successCriteria)}</p>${dates?`<p class="hint">${dates}</p>`:''}`;}
$('#practice').addEventListener('click',()=>run(async()=>{
 setNavActive('#practice');setTitle('Mi práctica estratégica');closeMenu(false);preserveDraft();draft=null;
 const events=await api('/api/practice');let limit=12;
 const paint=()=>{$('#decision').innerHTML=practiceHtml(events,limit);$('#more-practice')?.addEventListener('click',()=>{limit+=12;paint();focusView($('#decision .analysis-item:nth-last-of-type(12)')??$('#more-practice'));});};paint();
}));

function renderContext(){
  updateShell();
  const versions=context.versions.filter(v=>context.decisions.some(d=>d.activeVersionId===v.id));
  const latest=versions.slice().sort((a,b)=>new Date(b.approvedAt)-new Date(a.approvedAt))[0];
  $('#context').innerHTML=`<div class="context-cover"><p class="eyebrow">Memoria estratégica</p><h3>Contexto vigente</h3><p>${escape($('#brands').selectedOptions[0]?.textContent?.replace(/ · (DEMO|PILOT)$/,''))}</p></div><details class="context-details" open><summary>Lo que ya decidiste</summary><ol class="context-lineage">${context.questions.map((q,index)=>{const d=context.decisions.find(d=>d.questionId===q.id),v=context.versions.find(v=>v.id===d?.activeVersionId);return `<li><span class="context-number">${String(index+1).padStart(2,'0')}</span><div><strong>${escape(labels[q.module]??q.module)}</strong><p>${v?escape(v.selectedOption):'Tu siguiente decisión comienza aquí.'}</p>${v?`<span class="context-version">v${v.sequence} · Decisión humana</span>`:''}${needsReview(context,d)?'<span class="badge warn">Revisión pendiente</span>':''}</div></li>`;}).join('')}</ol></details>${latest?`<p class="context-updated">Última decisión<br><strong>${escape(fmt(latest.approvedAt))}</strong></p>`:''}<p class="hint context-note">Los cambios conservan su historia.<br>Nada se reescribe sin tu criterio.</p>`;
}
function updateShell(){
 const name=$('#brands').selectedOptions[0]?.textContent?.replace(/ · (DEMO|PILOT)$/,'')??'Tu espacio estratégico';
 $('#brands').title=name;
 if(!context)return;
 document.querySelectorAll('[data-module]').forEach(button=>{const q=context.questions.find(q=>q.module===button.dataset.module),d=context.decisions.find(d=>d.questionId===q?.id);button.classList.toggle('needs-attention',needsReview(context,d));button.title=needsReview(context,d)?'Requiere revisión humana':d?'Decisión vigente':'Por decidir';button.setAttribute('aria-label',button.textContent.trim());button.setAttribute('aria-description',button.title);});
}
function composeDecision(q,d,v,reviews){
 const surface=$('#decision');
 const hero=document.createElement('div');hero.className='decision-heading';
 for(const selector of [':scope > .eyebrow',':scope > h2',':scope > .decision-meta']){const el=surface.querySelector(selector);if(el)hero.append(el);}
 surface.prepend(hero);
 const current=surface.querySelector(':scope > .current'),rationale=surface.querySelector(':scope > .rationale');
 if(current){const committed=document.createElement('section');committed.className='human-decision';committed.setAttribute('aria-label','Decisión humana vigente');committed.innerHTML='<p class="eyebrow">Decisión humana · vigente</p>';current.before(committed);committed.append(current);if(rationale)committed.append(rationale);}
 const human=surface.querySelector('.human-decision');
 if(human)hero.after(human);
 const review=surface.querySelector('.review');
 if(draft&&review){
   const disclosure=document.createElement('details');disclosure.className='review-origin';disclosure.innerHTML='<summary>Cambio que origina esta revisión</summary>';
   review.before(disclosure);disclosure.append(review);
   const form=surface.querySelector('.decision-form');
   if(form){hero.after(form);if(v)form.insertAdjacentHTML('afterbegin',`<div class="review-current"><p class="eyebrow">Tu decisión vigente · v${v.sequence}</p><p>${escape(v.selectedOption)}</p></div>`);}
 }
 const related=context.dependencies.filter(link=>link.upstreamDecisionId===d?.id||link.downstreamDecisionId===d?.id);
 if(related.length){const connections=document.createElement('div');connections.className='decision-connections';connections.innerHTML='<span class="label">Conecta con</span>'+related.map(link=>{const other=link.upstreamDecisionId===d.id?link.downstreamDecisionId:link.upstreamDecisionId;const question=context.questions.find(q=>q.id===context.decisions.find(d=>d.id===other)?.questionId);return `<span>${escape(labels[question?.module]??'Decisión')} <small>· ${link.kind==='HARD'?'estricta':link.kind==='SOFT'?'sugerida':'informativa'}</small></span>`;}).join('');surface.append(connections);}
 if(reviews.length)surface.classList.add('under-review');else surface.classList.remove('under-review');
}
function bindStrategyLinks(){document.querySelectorAll('[data-strategy-module]').forEach(button=>button.addEventListener('click',()=>{selected=button.dataset.strategyModule;activeDecisionTab='overview';render();focusView();}));}

function setNavActive(selector){$('#decision').dataset.view=selector?.slice(1)??'decision';document.querySelectorAll('#journey [aria-current]').forEach(b=>b.removeAttribute('aria-current'));if(selector)$(selector).setAttribute('aria-current','page');}

async function showFeedback(){
 closeMenu(false);setTitle('Feedback');preserveDraft();if(!brandId){notice('Selecciona una marca para compartir feedback.');return;}
 const capturedBrand=brandId;
 $('#decision').innerHTML=`<h2>Ayúdanos a mejorar tu experiencia</h2><p>Feedback del piloto; no modifica tus decisiones. No incluyas secretos ni datos personales de terceros.</p><form id="feedback-form">${[['usefulness','Utilidad'],['clarity','Claridad'],['confidence','Confianza para decidir']].map(([id,label])=>`<label for="feedback-${id}">${label} (1 baja, 5 alta)</label><select id="feedback-${id}" required><option value="">Elige</option>${[1,2,3,4,5].map(n=>`<option value="${n}">${n}</option>`).join('')}</select>`).join('')}<label for="feedback-kind">Tipo</label><select id="feedback-kind"><option value="FEEDBACK">Comentario</option><option value="ISSUE">Reportar problema</option></select><label for="feedback-comment">Comentario opcional</label><textarea id="feedback-comment" maxlength="2000"></textarea><button>Enviar feedback</button></form>`;
 $('#feedback-form').addEventListener('submit',event=>{event.preventDefault();run(async()=>{await api('/api/feedback',{brandId:capturedBrand,usefulness:Number($('#feedback-usefulness').value),clarity:Number($('#feedback-clarity').value),confidence:Number($('#feedback-confidence').value),kind:$('#feedback-kind').value,comment:$('#feedback-comment').value});await refresh();notice('Gracias. Tu feedback quedó registrado.');},event.submitter);});
}

// PILOT only: one-time acknowledgement before Brand Context is sent to the configured AI provider.
function showAiNotice(questionId){
 const section=document.createElement('section');section.className='analysis-item';section.setAttribute('aria-labelledby','ai-notice-title');
 section.innerHTML=`<h3 id="ai-notice-title">Antes de pedir una propuesta IA</h3><p>${escape(aiNotice.text)}</p><button id="ai-notice-accept">Entiendo y acepto</button> <button id="ai-notice-decline" class="secondary">Ahora no</button>`;
 ($('#decision h2')??$('#decision').firstChild).after(section);$('#ai-notice-accept').focus();
 $('#ai-notice-decline').addEventListener('click',()=>{section.remove();notice('Puedes continuar con tu decisión humana sin propuesta IA.');focusView($('#generate-recommendation'));});
 $('#ai-notice-accept').addEventListener('click',event=>run(async()=>{await api('/api/ai-notice/accept',{version:aiNotice.version});section.remove();const result=await api('/api/recommendations/generate',{brandId,questionId});if(result.error){notice('No se pudo generar una propuesta válida. Puedes continuar con tu decisión humana.',true,'assistance');return;}await refresh();notice('Propuesta lista para revisión humana. Aún no cambió ninguna decisión.');},event.currentTarget));
}
