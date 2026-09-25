const $=s=>document.querySelector(s);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let user,brandId,context,selected=new URL(location.href).searchParams.get('module')==='Positioning'?'Positioning':'Primary Customer',draft=null,impactVisible=false;
const notice=(text,error=false)=>{const n=$('#notice');n.textContent=text;n.className=error?'error':'';};
async function api(path,input) {
  const response=await fetch(path,{method:input===undefined?'GET':'POST',headers:{'Content-Type':'application/json'},body:input===undefined?undefined:JSON.stringify(input)});
  const data=await response.json();
  if(!response.ok) {
    const messages={CONFLICT:'Esta decisión cambió mientras la estabas editando. Revisa la versión más reciente antes de aprobar.',UNAUTHORIZED:'Tu sesión no está disponible. Vuelve a entrar.',FORBIDDEN:'No tienes permiso para esta acción.',UNAVAILABLE:'La operación no está disponible. Conserva tu borrador y reintenta.',INVALID:'Revisa los campos de la decisión.'};
    throw new Error(messages[data.code]??data.message??'No se pudo completar la operación.');
  }
  return data;
}
async function run(action,button) {if(button)button.disabled=true;try{await action();}catch(error){notice(error.message,true);}finally{if(button)button.disabled=false;}}
async function loadBrands(preferred) {
  const brands=await api('/api/brands');
  $('#brands').innerHTML=brands.map(b=>`<option value="${escape(b.id)}">${escape(b.name)}</option>`).join('');
  brandId=brands.some(b=>b.id===preferred)?preferred:brands[0]?.id;
  if(brandId)$('#brands').value=brandId;
  draft=null;await refresh();
}
async function authenticated() {user=await api('/api/me');$('#login').hidden=true;$('#workspace').hidden=false;$('#logout').hidden=false;$('#menu').hidden=false;await loadBrands(new URL(location.href).searchParams.get('brand'));}
async function refresh(){if(brandId)context=await api(`/api/context?brandId=${encodeURIComponent(brandId)}`);else context=null;render();}
function render() {
  document.querySelectorAll('[data-module]').forEach(b=>{if(b.dataset.module===selected)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
  if(!context){$('#decision').innerHTML='<p class="empty">Crea una marca para comenzar con tu cliente principal.</p>';$('#context').innerHTML='';return;}
  history.replaceState(null,'',`/?brand=${encodeURIComponent(brandId)}&module=${encodeURIComponent(selected)}`);
  const q=context.questions.find(q=>q.module===selected),d=context.decisions.find(d=>d.questionId===q.id),v=context.versions.find(v=>v.id===d?.activeVersionId),reviews=context.reviews.filter(r=>r.downstreamDecisionId===d?.id&&r.status!=='COMPLETED');
  const pending=context.impacts.some(i=>i.status==='IMPACT_PENDING');
  const hasCustomer=context.decisions.some(d=>context.questions.find(q=>q.id===d.questionId)?.module==='Primary Customer');
  const locked=selected==='Positioning'&&!hasCustomer;
  const warn=reviews.length?`<div class="review"><strong>Tu estrategia ha evolucionado.</strong><p>Algunas decisiones conectadas necesitan revisión.</p><p>La decisión afectada no se modificará hasta que una persona complete la revisión.</p><button id="show-impact" class="secondary">Ver impacto</button>${impactVisible?reviews.map(r=>`<p>${escape(impactReason(r))}</p>`).join(''):''}</div>`:'';
  const versions=context.versions.filter(v=>v.decisionId===d?.id).sort((a,b)=>b.sequence-a.sequence);
  $('#decision').innerHTML=`<p class="eyebrow">${selected==='Primary Customer'?'01 · Cliente principal':'02 · Posicionamiento'}</p><h2>${escape(q.text)}</h2><span class="badge ${reviews.length?'warn':''}">${reviews.length?'Requiere revisión':v?'Actual · v'+v.sequence:'Por decidir'}</span>${pending?'<div class="review"><strong>Impacto pendiente</strong><p>La decisión se guardó. Falta calcular su efecto antes de otro cambio.</p><button id="retry-impact">Reintentar impacto</button></div>':''}${warn}${draft?`<form id="decision-form">${draft.reviewToken?'<div class="actions"><button type="button" id="keep" class="secondary">Mantener sin cambios</button><button type="button" id="modify" class="secondary">Modificar</button></div>':''}<p class="hint">Tu elección y tu criterio dan forma a la estrategia.</p><label for="option">Decisión propuesta</label><textarea id="option" name="selectedOption" required maxlength="12000">${escape(draft.selectedOption)}</textarea><label for="rationale">¿Por qué eliges esta opción?</label><textarea id="rationale" name="rationale" required maxlength="12000">${escape(draft.rationale)}</textarea><p class="hint">Aprobar crea una versión humana nueva y conserva las anteriores.</p><div class="actions"><button type="submit">${draft.reviewToken?'Confirmar revisión':'Aprobar decisión'}</button><button id="cancel" type="button" class="secondary">Cancelar</button></div></form>`:`${v?`<p class="current">${escape(v.selectedOption)}</p><p>${escape(v.rationale)}</p>`:`<p class="empty">${locked?'Aprueba primero tu cliente prioritario.':'Todavía no hay una decisión aprobada. Define tu elección y explica tu criterio.'}</p>`}<div class="actions"><button id="edit" ${pending||locked?'disabled':''}>${reviews.length?'Iniciar revisión humana':v?'Preparar nueva versión':'Preparar decisión'}</button></div>`}<div class="actions"><button id="reload" class="secondary">Revisar versión más reciente</button>${sessionStorage.getItem(`draft:${brandId}:${selected}`)?'<button id="restore-draft" class="secondary">Ver borrador conservado</button>':''}</div>${versions.length?`<details><summary>Historial · ${versions.length} ${versions.length===1?'versión':'versiones'}</summary>${versions.map(h=>`<article class="history-item"><span class="badge">v${h.sequence} · ${h.versionStatus==='SUPERSEDED'?'Sustituida':'Actual'}</span><p><strong>${escape(h.selectedOption)}</strong></p><p>${escape(h.rationale)}</p><p class="hint">${escape(new Date(h.approvedAt).toLocaleString('es-MX'))} · ${h.actorUserId===user.userId?'Tú':'Persona autorizada · '+escape(h.actorUserId)}</p></article>`).join('')}</details>`:''}`;
  $('#context').innerHTML=`<section><p class="eyebrow">Contexto de marca · vigente</p><h3>Lo que ya decidiste</h3>${context.questions.map(q=>{const d=context.decisions.find(d=>d.questionId===q.id),v=context.versions.find(v=>v.id===d?.activeVersionId);return `<p><strong>${q.module==='Primary Customer'?'Cliente principal':'Posicionamiento'}</strong><br>${v?escape(v.selectedOption):'Sin decisión'}${d?.reviewStatus==='NEEDS_REVIEW'?'<br><span class="badge warn">Revisión pendiente</span>':''}</p>`;}).join('')}</section><section><p class="eyebrow">Conexión estratégica</p><p>Cliente principal → Posicionamiento</p><p class="hint">Cambiar el cliente obliga a revisar tu posicionamiento. No cambia automáticamente lo que decidiste.</p></section><p class="hint">Demostración privada · Tu criterio permanece en cada decisión.</p>`;
  $('#edit')?.addEventListener('click',event=>run(async()=>{
    let receipt;
    if(reviews.length){impactVisible=true;await api('/api/impacts/shown',{brandId});receipt=await api('/api/reviews/start',{brandId,decisionId:d.id});}
    // Capture the version the human actually saw; never replace it automatically during save.
    draft={questionId:q.id,expectedActiveVersion:v?.id??null,selectedOption:v?.selectedOption??'',rationale:'',idempotencyKey:crypto.randomUUID(),reviewToken:receipt?.reviewToken};
    await api('/api/questions/prepare',{brandId,questionId:q.id,expectedActiveVersion:draft.expectedActiveVersion});
    await refresh();$('#option').focus();
  },event.currentTarget));
  $('#decision-form')?.addEventListener('input',()=>{draft.selectedOption=$('#option').value;draft.rationale=$('#rationale').value;});
  $('#decision-form')?.addEventListener('submit',event=>{event.preventDefault();run(async()=>{
    const command={brandId,questionId:draft.questionId,sourceRecommendationId:null,selectedOption:draft.selectedOption,rationale:draft.rationale,expectedActiveVersion:draft.expectedActiveVersion,idempotencyKey:draft.idempotencyKey,actorUserId:user.userId};
    const result=await api('/api/decisions/commit',{command,reviewToken:draft.reviewToken});draft=null;await refresh();notice(result.impactPending?'Decisión guardada. El impacto está pendiente; reinténtalo.':'Decisión aprobada. Su versión y su historial quedaron guardados.');
  },event.submitter);});
  $('#keep')?.addEventListener('click',()=>{draft.selectedOption=v.selectedOption;$('#option').value=v.selectedOption;$('#option').readOnly=true;$('#rationale').focus();});
  $('#modify')?.addEventListener('click',()=>{$('#option').readOnly=false;$('#option').focus();});
  $('#cancel')?.addEventListener('click',()=>{draft=null;render();});
  $('#reload').addEventListener('click',event=>run(async()=>{if(draft)sessionStorage.setItem(`draft:${brandId}:${selected}`,JSON.stringify(draft));draft=null;await refresh();notice('Borrador conservado en esta pestaña. Contexto recargado. Revisa la versión vigente antes de volver a editar.');},event.currentTarget));
  $('#restore-draft')?.addEventListener('click',()=>{const saved=JSON.parse(sessionStorage.getItem(`draft:${brandId}:${selected}`));notice(`Borrador conservado: ${saved.selectedOption} — ${saved.rationale}`);});
  $('#show-impact')?.addEventListener('click',event=>run(async()=>{impactVisible=true;render();await api('/api/impacts/shown',{brandId});},event.currentTarget));
  $('#retry-impact')?.addEventListener('click',event=>run(async()=>{const result=await api('/api/impacts/retry',{brandId});await refresh();notice(result.pending?'El impacto sigue pendiente.':'Impacto calculado.',result.pending);},event.currentTarget));
}
$('#login-form').addEventListener('submit',event=>{event.preventDefault();run(async()=>{await api('/api/session',{token:$('#token').value});$('#token').value='';await authenticated();notice('Workspace disponible.');},event.submitter);});
$('#logout').addEventListener('click',event=>run(async()=>{await api('/api/logout',{});location.reload();},event.currentTarget));
$('#create-brand').addEventListener('submit',event=>{event.preventDefault();run(async()=>{const brand=await api('/api/brands',{name:$('#brand-name').value});$('#brand-name').value='';await loadBrands(brand.id);notice('Marca creada. Comienza con tu cliente principal.');},event.submitter);});
$('#brands').addEventListener('change',event=>run(async()=>{brandId=event.target.value;draft=null;impactVisible=false;await refresh();}));
document.querySelectorAll('[data-module]').forEach(button=>button.addEventListener('click',()=>{selected=button.dataset.module;draft=null;impactVisible=false;closeMenu();render();}));
function impactReason(review){
 const trigger=context.versions.find(v=>v.id===review.triggerVersionId),decision=context.decisions.find(d=>d.id===trigger?.decisionId),question=context.questions.find(q=>q.id===decision?.questionId);
 const label=question?.module==='Primary Customer'?'Cliente principal':question?.module==='Positioning'?'Posicionamiento':question?.module??'Decisión conectada';
 return `${label} cambió: versión ${(trigger?.sequence??2)-1} → ${trigger?.sequence??2}. ${review.dependencyType==='HARD'?'Una dependencia estricta requiere confirmar que tu decisión sigue alineada.':'Revisa si este cambio afecta tu decisión.'}`;
}
function closeMenu(){const nav=$('#journey');nav.classList.remove('open');nav.removeAttribute('role');nav.removeAttribute('aria-modal');$('#nav-backdrop').hidden=true;$('#menu').setAttribute('aria-expanded','false');$('#decision').inert=false;$('#context').inert=false;$('#menu').focus();}
$('#menu').addEventListener('click',()=>{$('#journey').classList.add('open');$('#journey').setAttribute('role','dialog');$('#journey').setAttribute('aria-modal','true');$('#nav-backdrop').hidden=false;$('#menu').setAttribute('aria-expanded','true');$('#decision').inert=true;$('#context').inert=true;$('#close-menu').focus();});
$('#close-menu').addEventListener('click',closeMenu);$('#nav-backdrop').addEventListener('click',closeMenu);
document.addEventListener('keydown',e=>{if(!$('#journey').classList.contains('open'))return;if(e.key==='Escape')closeMenu();if(e.key==='Tab'){const controls=[...$('#journey').querySelectorAll('button')].filter(x=>!x.disabled),first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
$('#home').addEventListener('click',()=>{closeMenu();draft=null;const review=context?.reviews.find(r=>r.status!=='COMPLETED');const target=review?context.decisions.find(d=>d.id===review.downstreamDecisionId):null;selected=context?.questions.find(q=>q.id===target?.questionId)?.module??context?.questions.find(q=>!context.decisions.some(d=>d.questionId===q.id))?.module??'Primary Customer';render();notice(review?'Hay decisiones conectadas que requieren tu revisión.':'Revisa tus decisiones vigentes o continúa con la siguiente pregunta.');});
api('/api/me').then(authenticated).catch(()=>{});
