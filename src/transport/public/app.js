const $=s=>document.querySelector(s);
import {escape,labels,fmt,needsReview,stateBadge,capabilityLabel,practiceHtml,homeHtml,impactPair as impactView,historyHtml as historyView} from './product-views.js';
import {trapFocus,decisionTabs} from './product-interactions.js';
import * as analytics from './analytics.js';
import {PILOT_EVENTS} from './analytics.js';
let activeDecisionTab='overview';
let user,brandId,context,selected=Object.hasOwn(labels,new URL(location.href).searchParams.get('module'))?new URL(location.href).searchParams.get('module'):'Primary Customer',draft=null,impactVisible=false;
let pilotMode=false,aiNotice=null;
let noticeTimer;
const notice=(text,error=false,kind)=>{const n=$('#notice');clearTimeout(noticeTimer);n.textContent=text;n.className=error?'error':'';n.dataset.kind=kind??(error?'technical':'status');if(text&&!error)noticeTimer=setTimeout(()=>{if(n.textContent===text)n.textContent='';},10000);};

let activityTimer;
let competitiveResearchResult=null;
let competitiveRejectedClaims=new Set();
let competitiveResearchBrandId=null;
const activityStart=(title,detail)=>{
 const box=$('#ai-activity');
 if(!box)return;
 clearTimeout(activityTimer);
 notice('');
 box.hidden=false;
 box.classList.remove('is-complete','is-error');
 box.classList.add('is-active');
 $('.ai-activity-mark').textContent='✦';
 $('#ai-activity-title').textContent=title;
 $('#ai-activity-detail').textContent=detail;
};

const activityStep=(title,detail)=>{
 const box=$('#ai-activity');
 if(!box||box.hidden)return;
 $('#ai-activity-title').textContent=title;
 $('#ai-activity-detail').textContent=detail;
};

const activityDone=(title,detail)=>{
 const box=$('#ai-activity');
 if(!box)return;
 clearTimeout(activityTimer);
 box.hidden=false;
 box.classList.remove('is-active','is-error');
 box.classList.add('is-complete');
 $('.ai-activity-mark').textContent='✓';
 $('#ai-activity-title').textContent=title;
 $('#ai-activity-detail').textContent=detail;
 activityTimer=setTimeout(()=>{box.hidden=true;box.classList.remove('is-complete');},5000);
};

const activityFail=()=>{
 const box=$('#ai-activity');
 if(!box)return;
 clearTimeout(activityTimer);
 box.hidden=true;
 box.classList.remove('is-active','is-complete','is-error');
};
async function api(path,input,timeoutOverrideMs) {
  let response,data;
  try {
    const timeoutMs=timeoutOverrideMs??(path==='/api/recommendations/generate'?45000:15000);
    response=await fetch(path,{method:input===undefined?'GET':'POST',headers:{'Content-Type':'application/json'},body:input===undefined?undefined:JSON.stringify(input),signal:AbortSignal.timeout(timeoutMs)});
    data=await response.json();
  } catch {
    preserveDraft();throw new Error(input===undefined?(pilotMode?'No pudimos conectar con Brandopolis. Revisa tu conexión y vuelve a intentar.':'No pudimos conectar con la demo local. Comprueba que la terminal siga abierta y vuelve a intentar.'):'No recibimos confirmación. Tu borrador se conserva. Revisa el estado antes de repetir la acción para evitar duplicados.');
  }
  if(!response.ok) {
    const conflict=path.includes('/learning/')?'Este registro cambió o no permite esa acción. Vuelve a abrir Experimentos y aprendizajes para revisar su estado.':path.includes('/recommendations/')?'La propuesta ya no corresponde al contexto actual. Vuelve a abrir la decisión y compara opciones de nuevo.':'Esta decisión cambió mientras la estabas editando. Revisa la versión más reciente antes de aprobar. Si usaste una recomendación, genera otra con el contexto actual.';
    const messages={CONFLICT:conflict,UNAUTHORIZED:pilotMode?'Tu sesión venció. Vuelve a entrar al piloto.':'Tu sesión DEMO venció o no está disponible. Vuelve a entrar con la sesión local vigente.',FORBIDDEN:pilotMode?'No tienes permiso para esta acción o esta marca.':'No tienes permiso para esta acción. Revisa que hayas entrado con la sesión DEMO correcta.',UNAVAILABLE:pilotMode?'El servicio no está disponible por el momento. Tu borrador se conserva; vuelve a intentar en unos minutos.':'La demo local no está disponible. Conserva tu borrador y comprueba que la terminal siga abierta.',RATE_LIMITED:'Demasiadas solicitudes seguidas. Espera un momento y vuelve a intentar.',AI_CAP_REACHED:'Se alcanzó el límite diario de propuestas IA. Puedes continuar con tu decisión humana y volver a pedir propuestas mañana.',AI_CONSENT_REQUIRED:'Antes de pedir una propuesta, confirma el aviso sobre el uso de datos con IA.',INVALID:'Revisa los campos requeridos y el contexto disponible antes de continuar.',NOT_FOUND:'La marca o el registro ya no está disponible para esta sesión. Selecciona una marca accesible.'};
    if(data.code==='UNAUTHORIZED'){preserveDraft();document.body.classList.remove('app');$('#login').hidden=false;$('#workspace').hidden=true;$('#logout').hidden=true;$('#menu').hidden=true;$('.header-brand-control').hidden=true;$('#new-brand').hidden=true;$('#mode-badge').hidden=true;}
    throw Object.assign(new Error(messages[data.code]??'No se pudo completar la operación. Conserva tus datos y revisa el estado antes de reintentar.'),{code:data.code});
  }
  return data;
}

const documentMimeByExtension={
 '.pdf':'application/pdf',
 '.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
 '.pptx':'application/vnd.openxmlformats-officedocument.presentationml.presentation',
 '.txt':'text/plain'
};

const documentAllowedTypes=new Set(Object.values(documentMimeByExtension));
const documentMaxBytes=20*1024*1024;

function documentMime(file){
 const type=(file.type||'').toLowerCase();
 if(documentAllowedTypes.has(type))return type;
 const lower=file.name.toLowerCase();
 const extension=Object.keys(documentMimeByExtension).find(ext=>lower.endsWith(ext));
 return extension?documentMimeByExtension[extension]:null;
}

function documentFileError(file){
 const mediaType=documentMime(file);
 if(!mediaType)return 'Formato no compatible. Usa PDF, DOCX, PPTX o TXT.';
 if(file.size<=0)return 'El archivo está vacío.';
 if(file.size>documentMaxBytes)return 'El archivo supera 20 MB.';
 return null;
}

function documentSize(bytes){
 if(bytes<1024)return `${bytes} B`;
 if(bytes<1024*1024)return `${(bytes/1024).toFixed(1)} KB`;
 return `${(bytes/(1024*1024)).toFixed(1)} MB`;
}

function selectedDocumentsHtml(files){
 if(!files.length)return '<p class="hint">Aún no has seleccionado documentos.</p>';

 return `
  <ul class="document-list">
   ${files.map(file=>{
    const error=documentFileError(file);
    return `<li class="${error?'has-error':''}">
      <span class="document-icon" aria-hidden="true">▤</span>
      <span>
       <strong>${escape(file.name)}</strong>
       <small>${escape(documentSize(file.size))}${error?` · ${escape(error)}`:' · listo para subir'}</small>
      </span>
     </li>`;
   }).join('')}
  </ul>
 `;
}

function storedDocumentsHtml(documents){
 if(!documents.length)
  return '<p class="hint">Todavía no hay documentos asociados a esta marca.</p>';

 return `
  <ul class="document-list stored-documents">
   ${documents.map(document=>`
    <li>
     <span class="document-icon" aria-hidden="true">▤</span>
     <span>
      <strong>${escape(document.originalName)}</strong>
      <small>${escape(documentSize(document.bytes))} · ${
       document.status==='EXTRACTED'
        ?'Procesado · listo para generar hallazgos'
        :'Guardado · pendiente de procesamiento'
      }</small>
     </span>
    </li>
   `).join('')}
  </ul>
 `;
}

function documentClaimsHtml(claims,documents){
 if(!claims.length)
  return '<p class="hint">Todavía no hay hallazgos generados a partir de los documentos.</p>';

 const label={
  FACT:'Hecho documental',
  HYPOTHESIS:'Hipótesis',
  DECISION:'Decisión declarada',
  OPEN_QUESTION:'Pregunta abierta',
  POSITIONING:'Posicionamiento',
  AUDIENCE:'Audiencia',
  OFFER:'Oferta',
  PRICING:'Precio / condición comercial',
  RISK:'Riesgo',
  PRINCIPLE:'Principio'
 };

 return `
  <div class="document-claims-list">
   ${claims.map(claim=>{
    const document=documents.find(item=>item.id===claim.documentId);
    const location=claim.location??{};
    const status=claim.reviewStatus??'CANDIDATE';
    const accepted=status==='ACCEPTED';
    const rejected=status==='REJECTED';
    const finalStatement=claim.reviewedStatement??claim.statement;
    const modified=accepted&&claim.reviewedStatement&&claim.reviewedStatement!==claim.statement;

    return `
     <article
      class="analysis-item document-claim${accepted?' is-accepted':''}${rejected?' is-rejected':''}"
      data-document-claim-id="${escape(claim.id)}"
     >
      <div class="competitive-finding-head">
       <div>
        <span class="badge ${accepted?'':'warn'}">
         ${
          accepted
           ?'Incorporado al Brand Context'
           :rejected
            ?'Descartado'
            :'Pendiente de revisión'
         }
        </span>
        <p class="eyebrow">${escape(label[claim.claimType]??claim.claimType)}</p>
       </div>
      </div>

      <p class="document-claim-statement">
       <strong>${escape(finalStatement)}</strong>
      </p>

      ${
       modified
        ?`<details class="document-claim-original">
            <summary>Ver hallazgo original</summary>
            <p>${escape(claim.statement)}</p>
          </details>`
        :''
      }

      <p class="hint">
       ${escape(document?.originalName??'Documento')}
       ${location.label?` · ${escape(location.label)}`:''}
       · Confianza de extracción: ${escape(claim.confidence)}
      </p>

      ${
       location.evidence
        ?`<p class="hint">Sustento: ${escape(location.evidence)}</p>`
        :''
      }

      ${
       status==='CANDIDATE'
        ?`
         <div class="actions document-claim-actions">
          <button
           type="button"
           data-claim-action="accept"
           data-claim-id="${escape(claim.id)}"
          >Incorporar</button>

          <button
           type="button"
           class="secondary"
           data-claim-action="modify"
           data-claim-id="${escape(claim.id)}"
          >Modificar</button>

          <button
           type="button"
           class="secondary"
           data-claim-action="reject"
           data-claim-id="${escape(claim.id)}"
          >Descartar</button>
         </div>

         <div class="document-claim-editor" hidden>
          <label for="claim-edit-${escape(claim.id)}">
           Ajusta el hallazgo antes de incorporarlo
          </label>
          <textarea
           id="claim-edit-${escape(claim.id)}"
           maxlength="16000"
          >${escape(claim.statement)}</textarea>

          <div class="actions">
           <button
            type="button"
            data-claim-action="save"
            data-claim-id="${escape(claim.id)}"
           >Guardar e incorporar</button>

           <button
            type="button"
            class="secondary"
            data-claim-action="cancel"
            data-claim-id="${escape(claim.id)}"
           >Cancelar</button>
          </div>
         </div>
        `
        :accepted
         ?`<p class="hint document-claim-review-note">
             Revisado por una persona${modified?' · texto ajustado antes de incorporarse':''}.
            </p>`
         :`<p class="hint document-claim-review-note">
             Revisado por una persona · no forma parte del Brand Context.
            </p>`
      }
     </article>
    `;
   }).join('')}
  </div>
 `;
}

function bindDocumentClaimActions(claims,documents){
 const root=$('#document-claims-results');
 if(!root)return;

 /*
  * Keep the latest state on the persistent root. The inner cards may be
  * replaced in-place after each review without rebuilding the whole view.
  */
 root._documentClaimState={claims,documents};

 if(root.dataset.claimActionsBound==='true')
  return;

 root.dataset.claimActionsBound='true';

 root.addEventListener('click',event=>{
  const button=event.target.closest('button[data-claim-action]');
  if(!button||!root.contains(button))return;

  const action=button.dataset.claimAction;
  const claimId=button.dataset.claimId;
  const article=button.closest('.document-claim');

  if(!claimId||!article)return;

  if(action==='modify'){
   const editor=article.querySelector('.document-claim-editor');
   const textarea=editor?.querySelector('textarea');

   if(editor){
    editor.hidden=false;
    article.querySelector('.document-claim-actions')?.setAttribute('hidden','');
   }

   textarea?.focus({preventScroll:true});
   return;
  }

  if(action==='cancel'){
   const editor=article.querySelector('.document-claim-editor');

   if(editor)editor.hidden=true;
   article.querySelector('.document-claim-actions')?.removeAttribute('hidden');
   button.closest('.document-claim')?.querySelector('[data-claim-action="modify"]')
    ?.focus({preventScroll:true});
   return;
  }

  if(!['accept','reject','save'].includes(action))
   return;

  run(async()=>{
   const state=root._documentClaimState;
   const currentClaims=state?.claims??[];
   const currentDocuments=state?.documents??[];
   const claim=currentClaims.find(item=>item.id===claimId);

   if(!claim)
    throw Object.assign(
     new Error('El hallazgo ya no está disponible.'),
     {code:'NOT_FOUND'}
    );

   let reviewedStatement;

   if(action==='save'){
    const textarea=article.querySelector('.document-claim-editor textarea');
    reviewedStatement=textarea?.value.trim();

    if(!reviewedStatement)
     throw Object.assign(
      new Error('El texto revisado no puede quedar vacío.'),
      {code:'INVALID'}
     );

    const originalStatement=String(claim.statement??'').trim();
    const substantialReduction=
      originalStatement.length>=80 &&
      reviewedStatement.length < originalStatement.length*.65;

    if(
      substantialReduction &&
      !window.confirm(
       'El texto revisado es considerablemente más corto que el hallazgo original. ¿Quieres incorporarlo así al Brand Context?'
      )
    ){
     textarea?.focus({preventScroll:true});
     return;
    }
   }

   const result=await api('/api/document-claims/review',{
    brandId,
    claimId,
    action:action==='reject'?'REJECT':'ACCEPT',
    ...(reviewedStatement!==undefined?{reviewedStatement}:{})
   });

   const index=currentClaims.findIndex(item=>item.id===claimId);

   if(index>=0)
    currentClaims[index]=result.claim;

   root.innerHTML=documentClaimsHtml(
    currentClaims,
    currentDocuments
   );

   /*
    * Keep focus inside this persistent region so run() does not fall back
    * to the page heading and move the viewport.
    */
   if(!root.hasAttribute('tabindex'))
    root.tabIndex=-1;

   root.focus({preventScroll:true});

   if(result.context){
    context=await api(`/api/context?brandId=${encodeURIComponent(brandId)}`);
    renderContext();
   }

   notice(
    action==='reject'
     ?'Hallazgo descartado. No se incorporó al Brand Context.'
     :action==='save'
      ?'Hallazgo modificado e incorporado al Brand Context.'
      :'Hallazgo incorporado al Brand Context.'
   );
  },button);
 });
}


async function preserveViewAnchor(selector,action){
 const before=document.querySelector(selector);
 const beforeTop=before?.getBoundingClientRect().top??null;

 const active=document.activeElement;
 const activeId=
  active instanceof HTMLElement && active.id
   ?active.id
   :null;

 await action();

 await new Promise(resolve=>requestAnimationFrame(()=>{
  requestAnimationFrame(resolve);
 }));

 if(beforeTop!==null){
  const after=document.querySelector(selector);

  if(after){
   const afterTop=after.getBoundingClientRect().top;

   window.scrollBy({
    top:afterTop-beforeTop,
    behavior:'auto'
   });
  }
 }

 /*
  * showBrandContext replaces the original control node.
  * Restore focus to its replacement without moving the viewport.
  * This also prevents run() from falling back to focusView(),
  * which would scroll back to the view heading.
  */
 if(activeId){
  const replacement=document.getElementById(activeId);

  if(
   replacement instanceof HTMLElement &&
   !replacement.hasAttribute('disabled')
  ){
   replacement.focus({preventScroll:true});
  }
 }
}

function bindDocumentSelection(inputSelector,outputSelector){
 const input=$(inputSelector),output=$(outputSelector);
 if(!input||!output)return;

 const render=()=>{
  output.innerHTML=selectedDocumentsHtml([...input.files]);
 };

 input.addEventListener('change',render);
 render();
}

async function uploadSourceDocument(targetBrandId,file){
 const mediaType=documentMime(file);
 const validation=documentFileError(file);

 if(validation)
  throw Object.assign(
   new Error(`${file.name}: ${validation}`),
   {code:'INVALID'}
  );

 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),120000);

 try{
  const response=await fetch('/api/documents',{
   method:'POST',
   credentials:'same-origin',
   headers:{
    'Content-Type':mediaType,
    'X-Brand-Id':targetBrandId,
    'X-File-Name':encodeURIComponent(file.name)
   },
   body:file,
   signal:controller.signal
  });

  let data={};

  try{
   data=await response.json();
  }catch{
   data={};
  }

  if(!response.ok){
   throw Object.assign(
    new Error(data.message??'No se pudo guardar el documento.'),
    {code:data.code}
   );
  }

  return data;
 }catch(error){
  if(error?.name==='AbortError')
   throw Object.assign(
    new Error(`La carga de ${file.name} tardó demasiado.`),
    {code:'UNAVAILABLE'}
   );

  throw error;
 }finally{
  clearTimeout(timer);
 }
}

async function uploadSourceDocuments(targetBrandId,files){
 const selected=[...files];

 for(const file of selected)
  await uploadSourceDocument(targetBrandId,file);

 return selected.length;
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
  // An empty selector says nothing: the control appears with the first brand and hides again if none remain.
  $('.header-brand-control').hidden=brands.length===0;
  $('#brands').innerHTML=brands.map(b=>`<option value="${escape(b.id)}">${escape(b.name)}</option>`).join('');
  brandId=brands.some(b=>b.id===preferred)?preferred:brands[0]?.id;
  if(brandId)$('#brands').value=brandId;
  activeDecisionTab='overview';draft=null;await refresh();
}
async function authenticated() {const directModule=new URL(location.href).searchParams.has('module');document.body.classList.add('app');for(const id of ['#gateway','#request-access-view'])$(id).hidden=true;$('#login').hidden=true;document.body.classList.remove('booting');user=await api('/api/me');$('#workspace').hidden=false;$('#logout').hidden=false;$('#menu').hidden=false;$('#new-brand').hidden=false;$('#mode-badge').hidden=false;await loadBrands(new URL(location.href).searchParams.get('brand'));if(!directModule&&context)await showHome();}
async function refresh(){if(brandId)context=await api(`/api/context?brandId=${encodeURIComponent(brandId)}`);else context=null;render();}
function render() {
  setNavActive();$('#decision').dataset.view='decision';updateShell();
  document.querySelectorAll('[data-module]').forEach(b=>{if(b.dataset.module===selected)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  if(!context){analytics.sendOnce(PILOT_EVENTS.onboardingStarted,{pilot_stage:'no_brand'});$('#decision').innerHTML='<section class="empty-state" aria-labelledby="onboarding-title"><p class="eyebrow">Tu punto de partida</p><h2 id="onboarding-title">Construye tu primera decisión estratégica.</h2><p>Primero a quién sirves. Después, cómo quieres ser elegido. Cada decisión conservará tu criterio y su historia.</p><ol><li>Abre «Nueva marca» para crear tu espacio.</li><li>Define tu cliente principal.</li><li>Compara opciones y decide con tu criterio.</li></ol><p><strong>La IA propone. Tú decides. Brandopolis recuerda.</strong></p></section>';$('#context').innerHTML='';return;}
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
  const reviewChoices='<h3 id="review-choice-title" tabindex="-1">¿Qué quieres hacer?</h3><div class="review-options" role="group" aria-label="Opciones de revisión"><button type="button" id="keep" class="option-card" aria-pressed="false" aria-label="Mantener sin cambios" aria-describedby="keep-hint"><strong>Mantener sin cambios</strong><span id="keep-hint">La decisión sigue siendo válida con el nuevo contexto.</span></button><button type="button" id="modify" class="option-card" aria-pressed="false" aria-label="Modificar" aria-describedby="modify-hint"><strong>Modificar</strong><span id="modify-hint">Ajustas la decisión a lo que cambió.</span></button></div><p class="hint" id="review-choice-hint">Elige una opción para confirmar la revisión. Editar tu decisión cuenta como «Modificar».</p>';
  $('#decision').innerHTML=`<p class="eyebrow">${escape(labels[selected])}</p><h2>${escape(q.text)}</h2><p class="decision-meta">${stateBadge(v,reviews.length>0)}${v?`<span>Última actualización: ${escape(fmt(v.approvedAt))}</span><span>Decidido por: ${v.actorUserId===user.userId?'Tú':'Persona autorizada'}</span>`:''}</p>${why?`<p class="why"><span class="label">Por qué es importante:</span> ${escape(why)}</p>`:''}${pending?'<section class="review"><h3>Impacto pendiente</h3><p>La decisión se guardó. Falta calcular su efecto antes de otro cambio.</p><button id="retry-impact">Reintentar impacto</button></section>':''}${warn}${draft?`<form id="decision-form" class="decision-form">${draft.reviewToken?reviewChoices:''}<label for="option">Tu decisión</label><textarea id="option" name="selectedOption" required maxlength="12000" aria-describedby="form-hint">${escape(draft.selectedOption)}</textarea><label for="rationale">¿Por qué eliges esta opción?</label><textarea id="rationale" name="rationale" required maxlength="12000">${escape(draft.rationale)}</textarea><div class="form-footer"><p class="hint" id="form-hint">${draft.reviewToken?'Nada se reescribe sin tu confirmación: «Confirmar revisión» registra una nueva versión humana y conserva las anteriores.':'Tu elección y tu criterio dan forma a la estrategia. Aprobar crea una versión humana nueva y conserva las anteriores.'}</p><div class="actions"><button id="cancel" type="button" class="secondary">Cancelar</button><button type="submit" id="submit-decision" ${draft.reviewToken?'disabled aria-describedby="review-choice-hint"':''}>${draft.reviewToken?'Confirmar revisión':'Aprobar decisión'}</button></div></div></form>`:`${v?`<p class="current">${escape(v.selectedOption)}</p><p class="rationale"><span class="label">Por qué:</span> ${escape(v.rationale)}</p>`:`<p class="empty">${locked?'Aprueba primero tu cliente prioritario.':'Todavía no hay una decisión aprobada. Define tu elección y explica tu criterio.'}</p>`}`}<div class="actions">${!draft&&!reviews.length?editButton:''}<button id="reload" class="tertiary">Revisar versión más reciente</button>${sessionStorage.getItem(`draft:${user.userId}:${brandId}:${selected}`)?'<button id="restore-draft" class="tertiary">Ver borrador conservado</button>':''}</div>`;
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
    await refresh();(receipt?$('#review-choice-title'):$('#option')).focus();
  },event.currentTarget));
  $('#decision-form')?.addEventListener('input',event=>{draft.selectedOption=$('#option').value;draft.rationale=$('#rationale').value;if(event.target.id==='option'&&$('#modify')&&v&&$('#option').value!==v.selectedOption)choose('#modify',false);});
  $('#decision-form')?.addEventListener('submit',event=>{event.preventDefault();run(async()=>{
    const command={brandId,questionId:draft.questionId,sourceRecommendationId:draft.sourceRecommendationId??null,selectedOption:draft.selectedOption,rationale:draft.rationale,expectedActiveVersion:draft.expectedActiveVersion,idempotencyKey:draft.idempotencyKey,actorUserId:user.userId};
    const result=await api('/api/decisions/commit',{command,reviewToken:draft.reviewToken});draft=null;await refresh();
    if((context?.versions?.length??0)===1)analytics.sendOnce(PILOT_EVENTS.firstDecision,{pilot_stage:'activated'});notice(result.impactPending?'Decisión guardada. El impacto está pendiente; reinténtalo.':'Decisión aprobada. Su versión y su historial quedaron guardados.');
  },event.submitter);});
  function choose(id,focus=true){for(const b of ['#keep','#modify'])$(b).setAttribute('aria-pressed',String(b===id));$('#submit-decision').disabled=false;if(id==='#keep'){draft.selectedOption=v.selectedOption;$('#option').value=v.selectedOption;$('#option').readOnly=true;if(focus)$('#rationale').focus();}else{$('#option').readOnly=false;if(focus)$('#option').focus();}}
  $('#keep')?.addEventListener('click',()=>choose('#keep',false));
  $('#modify')?.addEventListener('click',()=>choose('#modify',false));
  $('#cancel')?.addEventListener('click',()=>{draft=null;render();focusView($('#edit')??undefined);});
  $('#reload').addEventListener('click',event=>run(async()=>{if(draft)sessionStorage.setItem(`draft:${user.userId}:${brandId}:${selected}`,JSON.stringify(draft));draft=null;await refresh();notice('Borrador conservado en esta pestaña. Contexto recargado. Revisa la versión vigente antes de volver a editar.');},event.currentTarget));
  $('#restore-draft')?.addEventListener('click',()=>{const saved=JSON.parse(sessionStorage.getItem(`draft:${user.userId}:${brandId}:${selected}`));notice(`Borrador conservado: ${saved.selectedOption} — ${saved.rationale}`);});
  $('#show-impact')?.addEventListener('click',event=>run(async()=>{impactVisible=true;render();await api('/api/impacts/shown',{brandId});focusView($('.impact-pair'));},event.currentTarget));
  $('#retry-impact')?.addEventListener('click',event=>run(async()=>{const result=await api('/api/impacts/retry',{brandId});await refresh();notice(result.pending?'El impacto sigue pendiente.':'Impacto calculado.',result.pending);},event.currentTarget));
}
$('#login-form').addEventListener('submit',event=>{event.preventDefault();run(async()=>{await api('/api/session',{token:$('#token').value});$('#token').value='';await authenticated();notice('Workspace disponible.');},event.submitter);});
$('#logout').addEventListener('click',event=>run(async()=>{await api('/api/logout',{});location.reload();},event.currentTarget));
$('#create-brand').addEventListener('submit',event=>{event.preventDefault();run(async()=>{
 preserveDraft();

 const stage=$('#brand-stage').value;
 const initialContext=$('#initial-context').value.trim();
 const goal=$('#brand-goal').value.trim();
 const competitiveReferences=$('#competitive-references').value.trim();
 const competitiveResearch=$('#competitive-research').checked;
 const brandDocuments=[...$('#brand-documents').files];

 for(const file of brandDocuments){
  const validation=documentFileError(file);
  if(validation)
   throw Object.assign(
    new Error(`${file.name}: ${validation}`),
    {code:'INVALID'}
   );
 }

 const brand=await api('/api/brands',{
  name:$('#brand-name').value,
  initialContext:initialContext?`Qué está construyendo: ${initialContext}`:undefined
 });

 const captures=[
  {
   kind:'user-input',
   entity:{
    statement:`Punto de partida declarado: ${stage==='existing'?'Mi marca ya existe.':'Tengo una idea.'}`
   }
  },
  ...(goal?[{
   kind:'user-input',
   entity:{
    statement:`Objetivo inmediato: ${goal}`
   }
  }]:[]),
  ...(competitiveReferences?[{
   kind:'user-input',
   entity:{
    statement:`Entorno competitivo — referencias aportadas por el usuario: ${competitiveReferences}`
   }
  }]:[]),
  ...(competitiveResearch?[{
   kind:'open-question',
   entity:{
    text:'Entorno competitivo — investigación pendiente: complementar el aporte del usuario e identificar competidores, alternativas y patrones relevantes mediante fuentes públicas.',
    relatedHypothesisId:null
   }
  }]:[])
 ];

 for(const capture of captures){
  await api('/api/context/capture',{
   brandId:brand.id,
   kind:capture.kind,
   entity:capture.entity
  });
 }

 if(brandDocuments.length)
  await uploadSourceDocuments(brand.id,brandDocuments);

 $('#brand-name').value='';
 $('#brand-stage').value='idea';
 $('#initial-context').value='';
 $('#brand-goal').value='';
 $('#competitive-references').value='';
 $('#competitive-research').checked=false;
 $('#brand-documents').value='';
 $('#brand-document-selection').innerHTML=selectedDocumentsHtml([]);

 $('#brand-dialog').close();
 await loadBrands(brand.id);

 if(competitiveResearch){
  await showCompetitiveContext();
  await startCompetitiveResearch(brand.id);
 }else{
  if(brandDocuments.length){
   await showHome();
   notice(
    `Marca creada. ${brandDocuments.length} documento${brandDocuments.length===1?' quedó guardado':'s quedaron guardados'}. Revisa «Qué necesita atención» para continuar con su procesamiento.`
   );
  }else{
   analytics.send(PILOT_EVENTS.brandCreated,{pilot_stage:'brand_created'});
   notice('Marca creada. Tu contexto inicial quedó guardado. Comienza con tu cliente principal.');
  }
 }
},event.submitter);});
bindDocumentSelection('#brand-documents','#brand-document-selection');
$('#new-brand').addEventListener('click',()=>{$('#brand-dialog').showModal();$('#brand-name').focus();});
$('#cancel-brand').addEventListener('click',()=>$('#brand-dialog').close());
$('#brand-dialog').addEventListener('close',()=>$('#new-brand').focus());
trapFocus($('#brand-dialog'));
$('#brands').addEventListener('change',event=>run(async()=>{preserveDraft();brandId=event.target.value;activeDecisionTab='overview';draft=null;impactVisible=false;await refresh();notice('Marca activa actualizada. Su contexto permanece separado.');}));
// Single entry point to a Decision: keeps drafts, resets local tab and impact disclosure, then renders.
function openModule(module,focus=true){preserveDraft();selected=module;activeDecisionTab='overview';draft=null;impactVisible=false;render();if(focus)focusView();}
document.querySelectorAll('[data-module]').forEach(button=>button.addEventListener('click',()=>{const fromDrawer=$('#journey').classList.contains('open');closeMenu(false);openModule(button.dataset.module,fromDrawer);}));

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
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#journey').classList.contains('open'))closeMenu();});
trapFocus($('#journey'),()=>$('#journey').classList.contains('open'));
$('#blueprint').addEventListener('click',()=>run(showBlueprint));
$('#home').addEventListener('click',()=>run(showHome));
// Public views of the single page: gateway (/), access (/login) and request access (/request-access).
function showPublicView(){
 const path=location.pathname;
 $('#gateway').hidden=path!=='/';$('#login').hidden=path==='/request-access';$('#request-access-view').hidden=path!=='/request-access';
 // On the gateway the access card is a section of the page, not a second top-level heading.
 if(path==='/')$('#login-title').setAttribute('aria-level','2');else $('#login-title').removeAttribute('aria-level');
 setTitle(path==='/login'?'Entrar al piloto':path==='/request-access'?'Acceso al piloto':'');
}
showPublicView();
// Motion is an enhancement: the poster stays when reduced motion is requested or the video cannot play.
const flow=$('.flow-video'),still=matchMedia('(prefers-reduced-motion: reduce)'),motionToggle=$('#motion-toggle');let userPaused=false,flowVisible=false;
const build=$('.how-art');
const syncMotion=()=>{const allowed=!still.matches&&!userPaused;motionToggle.hidden=still.matches;build.classList.toggle('is-paused',!(flowVisible&&allowed));if(flowVisible&&allowed)flow.play().catch(()=>{});else flow.pause();};
if(flow&&'IntersectionObserver' in window)new IntersectionObserver(entries=>{flowVisible=entries.some(e=>e.isIntersecting);syncMotion();}).observe(flow);
still.addEventListener('change',syncMotion);syncMotion();
motionToggle.addEventListener('click',()=>{userPaused=!userPaused;motionToggle.setAttribute('aria-pressed',String(userPaused));motionToggle.textContent=userPaused?'Reanudar animación':'Pausar animación';syncMotion();});
const rail=$('.reality-list');
if(rail){
 const steps=[...rail.children];
 if(still.matches||!('IntersectionObserver' in window))rail.style.setProperty('--progress','100%');
 else {
  rail.classList.add('reveal-ready');
  const advance=()=>{const last=steps.filter(li=>li.classList.contains('is-revealed')).pop();rail.style.setProperty('--progress',last?`${last.offsetTop+last.offsetHeight}px`:'0px');};
  const watch=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){e.target.classList.add('is-revealed');watch.unobserve(e.target);}advance();},{rootMargin:'0px 0px -12% 0px'});
  for(const step of steps)watch.observe(step);
  // A late preference change must never leave a step invisible.
  still.addEventListener('change',()=>{if(still.matches){watch.disconnect();rail.classList.remove('reveal-ready');rail.style.setProperty('--progress','100%');}});
 }
}
Promise.all([api('/api/mode'),api('/api/session-state')]).then(async([mode,state])=>{
 pilotMode=mode.mode==='PILOT';aiNotice=mode.aiNotice??null;
 // GA4 stays entirely off unless the server reports a configured Measurement ID.
 analytics.init(mode.ga4MeasurementId??null);
 if(!state.authenticated&&location.pathname==='/')analytics.sendOnce(PILOT_EVENTS.landingView,{mode:mode.mode});
 // The OIDC callback returns with ?login=ok exactly once per completed sign-in, so this counts real
 // logins rather than page renders. The parameter is stripped immediately afterwards.
 if(state.authenticated&&new URL(location.href).searchParams.get('login')==='ok'){
  analytics.sendOnce(PILOT_EVENTS.loginCompleted,{auth_method:'oidc',mode:mode.mode});
  history.replaceState(null,'','/');
 }
 if(pilotMode){
  $('#login-form').hidden=true;$('#mode-badge').textContent='PILOT';
  // Fires on the real navigation to the identity provider.
  document.addEventListener('click',event=>{
   if(event.target instanceof Element&&event.target.closest('a[href="/auth/login"]'))analytics.send(PILOT_EVENTS.loginStarted,{auth_method:'oidc'});
  });
  const entry=document.createElement('div');entry.id='pilot-entry';entry.innerHTML='<p class="eyebrow">Acceso</p><p>Entra con tu cuenta para abrir tu espacio privado.</p><p><a class="button" href="/auth/login">Entrar al piloto</a></p>';$('#login').append(entry);
  if(mode.requestAccessUrl&&/^(https:|mailto:)/.test(mode.requestAccessUrl)){const link=document.createElement('a');link.href=mode.requestAccessUrl;link.className='button';link.textContent=mode.requestAccessUrl.startsWith('mailto:')?'Escribir para solicitar acceso':'Abrir formulario de solicitud';link.rel='noopener';$('#request-destination').replaceChildren(link);}
  const login=new URL(location.href).searchParams.get('login'),reasons={denied:'Tu cuenta aún no tiene acceso a este piloto.',expired:'El inicio de sesión tardó demasiado. Vuelve a intentarlo.',failed:'No se pudo completar el inicio de sesión. Vuelve a intentarlo.'};
  if(reasons[login]){notice(reasons[login],true);history.replaceState(null,'','/');}
  const feedback=document.createElement('button');feedback.id='pilot-feedback';feedback.className='secondary';feedback.textContent='Compartir feedback';feedback.addEventListener('click',()=>run(showFeedback));$('#journey').append(feedback);
 }
 // Booting only covers the session probe; the app shell is interactive while brands load.
 if(state.authenticated)await authenticated();else document.body.classList.remove('booting');
}).catch(error=>{if(error.code!=='UNAUTHORIZED')notice(error.message,true);}).finally(()=>document.body.classList.remove('booting'));
$('#brand-context').addEventListener('click',()=>run(showBrandContext));
$('#competitive-context').addEventListener('click',()=>run(showCompetitiveContext));
// Entering a non-Decision view: title, active navigation, drawer closed, draft preserved. False without a brand.
function enterView(selector,title){setTitle(title);setNavActive(selector);closeMenu(false);preserveDraft();draft=null;return !!brandId;}


function competitiveFindingClaim(finding){
 return `Entorno competitivo — ${finding.subject}: ${finding.observation}`;
}

function competitiveFindingRejected(finding){
 return competitiveRejectedClaims.has(competitiveFindingClaim(finding));
}

function competitiveFindingAccepted(finding){
 const claim=competitiveFindingClaim(finding);
 const evidence=context?.evidence??[];

 return evidence.some(item=>{
  const savedClaim=item?.claim??item?.payload?.claim;
  return savedClaim===claim;
 });
}

async function competitiveFindingIdempotencyKey(finding){
 const claim=competitiveFindingClaim(finding);
 const bytes=new TextEncoder().encode(claim);
 const digest=await crypto.subtle.digest('SHA-256',bytes);

 const hex=[...new Uint8Array(digest)]
  .map(byte=>byte.toString(16).padStart(2,'0'))
  .join('');

 return `competitive-finding:${hex}`;
}

function competitiveFindingHtml(finding,index){
 const accepted=competitiveFindingAccepted(finding);
 const sources=(finding.sources??[]).map(source=>`
  <li>
   <a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">${escape(source.title)}</a>
   ${source.pageAge?`<span class="hint"> · ${escape(source.pageAge)}</span>`:''}
  </li>
 `).join('');

 const limitations=(finding.limitations??[]).map(item=>`<li>${escape(item)}</li>`).join('');

 return `
  <article class="analysis-item competitive-finding" data-finding-index="${index}">
   <div class="competitive-finding-head">
    <div>
     <span class="badge ${accepted?'':'warn'}">${accepted?'✓ Incorporado al contexto':'Hallazgo candidato'}</span>
     <h4>${escape(finding.subject)}</h4>
    </div>
   </div>

   <div class="competitive-finding-section">
    <p class="eyebrow">Qué observamos</p>
    <p>${escape(finding.observation)}</p>
   </div>

   <div class="competitive-finding-section">
    <p class="eyebrow">Por qué podría importar</p>
    <p>${escape(finding.strategicRelevance)}</p>
   </div>

   <details class="competitive-finding-sources">
    <summary>Fuentes y límites</summary>

    <div class="competitive-source-group">
     <p class="eyebrow">Fuentes revisadas</p>
     <ul>${sources||'<li>Sin fuentes visibles.</li>'}</ul>
    </div>

    <div class="competitive-source-group">
     <p class="eyebrow">Limitaciones</p>
     <ul>${limitations||'<li>Requiere revisión humana.</li>'}</ul>
    </div>
   </details>

   ${accepted
    ?'<div class="actions"><span class="hint">Este hallazgo ya forma parte del contexto estratégico.</span></div>'
    :`<div class="actions">
       <button class="secondary" data-competitive-accept="${index}">Incorporar al contexto</button>
       <button class="tertiary" data-competitive-reject="${index}">Descartar</button>
      </div>`
   }
  </article>
 `;
}

async function startCompetitiveResearch(targetBrandId=brandId){
 if(!targetBrandId)return;

 competitiveResearchResult=null;
 competitiveResearchBrandId=targetBrandId;

 activityStart(
  'Brandopolis está investigando tu entorno competitivo…',
  pilotMode
   ?'Buscando y revisando fuentes públicas relevantes.'
   :'Preparando hallazgos DEMO para validar la experiencia.'
 );

 let result;

 try{
  result=await api('/api/competitive/research',{brandId:targetBrandId},120000);
 }catch(error){
  activityFail();

  if(error.code==='AI_CONSENT_REQUIRED'&&aiNotice){
   showCompetitiveResearchNotice(targetBrandId);
   return;
  }

  notice(
   'No se pudo completar la investigación competitiva. Tu contexto permanece guardado.',
   true,
   'assistance'
  );
  return;
 }

 competitiveResearchResult=result;
 competitiveResearchBrandId=targetBrandId;

 activityStep(
  'Investigación terminada.',
  'Preparando los hallazgos para tu revisión…'
 );

 if(brandId===targetBrandId){
  await showCompetitiveContext();
 }

 activityDone(
  'Investigación competitiva preparada',
  `${result.findings.length} hallazgo${result.findings.length===1?'':'s'} listo${result.findings.length===1?'':'s'} para revisar.`
 );
}

function showCompetitiveResearchNotice(targetBrandId){
 const section=document.createElement('section');
 section.className='analysis-item';
 section.setAttribute('aria-labelledby','competitive-ai-notice-title');

 section.innerHTML=`
  <h3 id="competitive-ai-notice-title">Antes de investigar con IA</h3>
  <p>${escape(aiNotice.text)}</p>
  <div class="actions">
   <button id="competitive-ai-notice-accept">Entiendo y acepto</button>
   <button id="competitive-ai-notice-decline" class="secondary">Ahora no</button>
  </div>
 `;

 ($('#decision h2')??$('#decision').firstChild).after(section);

 $('#competitive-ai-notice-decline').addEventListener('click',()=>{
  section.remove();
  notice('La investigación no se inició. Tu contexto permanece guardado.');
 });

 $('#competitive-ai-notice-accept').addEventListener('click',event=>run(async()=>{
  await api('/api/ai-notice/accept',{version:aiNotice.version});
  section.remove();
  await startCompetitiveResearch(targetBrandId);
 },event.currentTarget));

 $('#competitive-ai-notice-accept').focus();
}

function bindCompetitiveResearchActions(){
 document.querySelectorAll('[data-competitive-accept]').forEach(button=>{
  button.addEventListener('click',event=>run(async()=>{
   const index=Number(button.dataset.competitiveAccept);
   const finding=competitiveResearchResult?.findings?.[index];
   if(!finding||competitiveResearchBrandId!==brandId)return;

   const firstSource=finding.sources?.[0];
   const originalText=button.textContent;
   const idempotencyKey=await competitiveFindingIdempotencyKey(finding);

   button.disabled=true;
   button.textContent='Incorporando…';

   try{
    await api('/api/context/capture',{
     brandId,
     kind:'evidence',
     idempotencyKey,
     entity:{
      claim:competitiveFindingClaim(finding),
      source:firstSource?.url??'Investigación competitiva asistida por IA',
      sourceDate:new Date(competitiveResearchResult.searchedAt).toISOString().slice(0,10),
      provenance:`Entorno competitivo · ${competitiveResearchResult.provider}${pilotMode?' · investigación asistida por IA':' · DEMO'}`,
      sourceQuality:'MEDIUM',
      relevance:'DIRECT',
      freshness:'CURRENT',
      limitations:finding.limitations?.length
       ?finding.limitations
       :['Hallazgo asistido por IA; requiere revisión humana.'],
      external:true
     }
    });
   }catch(error){
    button.disabled=false;
    button.textContent=originalText;
    throw error;
   }

   button.textContent='Incorporado';
   notice('Hallazgo incorporado al contexto. No cambia automáticamente ninguna decisión.');
   await showCompetitiveContext();
  },event.currentTarget));
 });

 document.querySelectorAll('[data-competitive-reject]').forEach(button=>{
  button.addEventListener('click',event=>run(async()=>{
   const index=Number(button.dataset.competitiveReject);
   const finding=competitiveResearchResult?.findings?.[index];

   if(!finding||competitiveResearchBrandId!==brandId)return;

   const originalText=button.textContent;

   button.disabled=true;
   button.textContent='Descartando…';

   try{
    await api('/api/competitive/reject',{
     brandId,
     claim:competitiveFindingClaim(finding)
    });
   }catch(error){
    button.disabled=false;
    button.textContent=originalText;
    throw error;
   }

   notice('Hallazgo descartado. No se incorporó al contexto estratégico.');
   await showCompetitiveContext();
  },event.currentTarget));
 });

 $('#run-competitive-research')?.addEventListener('click',event=>run(
  ()=>startCompetitiveResearch(brandId),
  event.currentTarget
 ));
}

async function showCompetitiveContext(){
 if(!enterView('#competitive-context','Entorno competitivo'))return;

 context=await api(`/api/context?brandId=${encodeURIComponent(brandId)}`);

 const rejected=await api(
  `/api/competitive/rejections?brandId=${encodeURIComponent(brandId)}`
 );

 competitiveRejectedClaims=new Set(rejected.claims??[]);

 renderContext();

 const userPrefix='Entorno competitivo — referencias aportadas por el usuario:';
 const researchPrefix='Entorno competitivo — investigación pendiente:';

 const userReferences=context.userInputs
  .filter(item=>String(item.statement??'').startsWith(userPrefix))
  .map(item=>String(item.statement).slice(userPrefix.length).trim());

 const researchedEvidence=context.evidence.filter(item=>{
  const provenance=String(item.provenance??'').toLowerCase();
  const claim=String(item.claim??'').toLowerCase();

  return provenance.includes('entorno competitivo')
   || claim.startsWith('entorno competitivo —');
 });

 const pendingResearch=context.openQuestions.filter(item=>
  item.status==='OPEN'
  && String(item.text??'').startsWith(researchPrefix)
 );

 const activeResult=competitiveResearchBrandId===brandId
  ?competitiveResearchResult
  :null;

 const pendingFindings=activeResult?.findings
  ?activeResult.findings.filter(
    finding=>!competitiveFindingAccepted(finding)
      && !competitiveFindingRejected(finding)
   )
  :[];

 const incorporatedFindings=activeResult?.findings
  ?activeResult.findings.filter(competitiveFindingAccepted).length
  :0;

 const rejectedFindings=activeResult?.findings
  ?activeResult.findings.filter(competitiveFindingRejected).length
  :0;

 const userSection=userReferences.length
  ?userReferences.map(text=>`
    <article class="analysis-item">
      <span class="badge">Aporte humano</span>
      <p>${escape(text)}</p>
      <p class="hint">Declarado por ti. Forma parte del contexto de la marca, pero no constituye evidencia externa.</p>
    </article>
   `).join('')
  :'<p class="hint">Aún no has registrado competidores, alternativas o marcas de referencia.</p>';

 const evidenceSection=researchedEvidence.length
  ?researchedEvidence.map(item=>`
    <article class="analysis-item">
      <span class="badge">Incorporado al contexto</span>
      <p>${escape(item.claim)}</p>
      <p class="hint">${escape(item.source)} · ${escape(item.sourceDate)}<br>${escape(item.provenance)}<br>Límites: ${escape((item.limitations??[]).join('; ')||'No declarados')}</p>
    </article>
   `).join('')
  :'<p class="hint">Todavía no has incorporado hallazgos externos al contexto competitivo.</p>';

 const candidateSection=activeResult?.findings?.length
  ?`
    <div class="competitive-research-summary">
      <span class="badge warn">${pilotMode?'Investigación IA':'DEMO de investigación'}</span>
      <p>${pendingFindings.length} hallazgo${pendingFindings.length===1?'':'s'} por revisar.${incorporatedFindings?` ${incorporatedFindings} ya incorporado${incorporatedFindings===1?'':'s'} al contexto.`:''}${rejectedFindings?` ${rejectedFindings} descartado${rejectedFindings===1?'':'s'}.`:''}${!incorporatedFindings&&!rejectedFindings?' Ninguno forma parte de tu contexto hasta que tú lo incorpores.':''}</p>
    </div>

    <div id="competitive-candidates">
      ${activeResult.findings.map(
       (finding,index)=>competitiveFindingRejected(finding)
        ?''
        :competitiveFindingHtml(finding,index)
      ).join('')}
    </div>
   `
  :`
    <div class="clear-state">
      <span class="eyebrow">${pendingResearch.length?'Investigación solicitada':'Investigación disponible'}</span>
      <p>${pendingResearch.length
       ?'Tu solicitud está registrada. Puedes iniciar ahora la investigación para complementar lo que ya conoces.'
       :'Puedes buscar señales externas para complementar tu contexto competitivo.'}</p>
      <button id="run-competitive-research" class="secondary">
       ${pilotMode?'Investigar con IA':'Probar investigación DEMO'}
      </button>
    </div>
   `;

 $('#decision').innerHTML=`
  <div class="home-heading">
   <div>
    <p class="eyebrow">Contexto de mercado</p>
    <h2>Entorno competitivo</h2>
    <p class="view-lead">Combina lo que tú conoces con señales externas para decidir con mayor contexto.</p>
   </div>
  </div>

  <section class="memory-group">
   <p class="eyebrow">Tus referencias</p>
   <h3>Lo que ya conoces</h3>
   ${userSection}
  </section>

  <section class="memory-group">
   <p class="eyebrow">Investigación externa</p>
   <h3>Hallazgos para revisar</h3>
   ${candidateSection}
  </section>

  <section class="memory-group">
   <p class="eyebrow">Memoria estratégica</p>
   <h3>Hallazgos incorporados</h3>
   ${evidenceSection}
  </section>

  <p class="hint">La investigación no cambia automáticamente tu estrategia. Tú decides qué hallazgos forman parte del Brand Context.</p>
 `;

 bindCompetitiveResearchActions();
}
async function showBrandContext(){
 if(!enterView('#brand-context','Contexto estratégico'))return;
 const [nextContext,sourceDocuments,documentClaims]=await Promise.all([
  api(`/api/context?brandId=${encodeURIComponent(brandId)}`),
  api(`/api/documents?brandId=${encodeURIComponent(brandId)}`),
  api(`/api/document-claims?brandId=${encodeURIComponent(brandId)}`)
 ]);
 context=nextContext;
 renderContext();
 const groups=[['Aprendizajes aceptados',context.learnings.filter(l=>l.status==='ACCEPTED')],['Aportaciones humanas',context.userInputs],['Hipótesis por validar',context.hypotheses],['Evidencia registrada',context.evidence],['Preguntas abiertas',context.openQuestions.filter(q=>q.status==='OPEN')]];
 $('#decision').innerHTML=`<p class="eyebrow">Contexto estratégico</p><h2>¿Qué sabes y qué falta comprobar?</h2><ul class="kpis" aria-label="Memoria de marca"><li><strong>${context.evidence.length}</strong><span>Fuentes registradas</span></li><li><strong>${context.hypotheses.length}</strong><span>Hipótesis explícitas</span></li><li><strong>${context.userInputs.length}</strong><span>Aportaciones humanas</span></li><li><strong>${context.learnings.filter(l=>l.status==='ACCEPTED').length}</strong><span>Aprendizajes aceptados</span></li></ul><p>Tus aportaciones orientan la estrategia. Las hipótesis siguen sin validar hasta que exista una revisión respaldada.</p>${currentStrategySummary()}${groups.map(([title,rows],index)=>`<section class="memory-group memory-${index}"><h3>${title}</h3>${rows.length?rows.map(r=>`<p>${escape(r.statement??r.claim??r.text??r.interpretation)}</p>${r.source?`<p class="hint">${escape(r.source)} · ${escape(r.sourceDate)} · ${escape(r.provenance)}<br>Limitaciones: ${escape(r.limitations.join('; ')||'No declaradas')}</p>`:''}`).join(''):'<p class="hint">Aún no hay registros.</p>'}</section>`).join('')}<section class="add-context" aria-labelledby="add-context-title"><h3 id="add-context-title">Añadir contexto</h3><div class="context-documents"><p class="eyebrow">Documentos de la marca</p><h4>Agrega fuentes que Brandopolis deberá considerar</h4><p class="hint">Puedes incorporar varios documentos. Se conservarán por separado y todavía no modificarán el Brand Context.</p>${storedDocumentsHtml(sourceDocuments)}<label class="document-picker" for="context-documents"><span aria-hidden="true">＋</span><span>Agregar documentos</span></label><input id="context-documents" class="document-input" type="file" multiple accept=".pdf,.docx,.pptx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain"><div id="context-document-selection" class="document-selection" aria-live="polite"></div><div class="document-actions"><button id="upload-context-documents" type="button" class="secondary">Guardar documentos</button><button id="analyze-context-documents" type="button" class="secondary"${sourceDocuments.length?'':' disabled'}>Procesar documentos</button><button id="generate-document-claims" type="button"${sourceDocuments.some(document=>document.status==='EXTRACTED')?'':' disabled'}>Generar hallazgos</button></div><div id="document-claims-progress" class="document-progress" hidden aria-live="polite"><div class="document-progress-head"><strong id="document-progress-title">Preparando análisis…</strong><span id="document-progress-count">0%</span></div><div class="document-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span id="document-progress-fill"></span></div><p id="document-progress-detail" class="hint">Preparando documentos.</p></div><p class="hint">PDF, DOCX, PPTX o TXT · máximo 20 MB por archivo.</p><div class="document-findings"><p class="eyebrow">Hallazgos documentales</p><h4>Lo que Brandopolis detectó para tu revisión</h4><p class="hint">Estos hallazgos todavía no forman parte del Brand Context. Tú decidirás cuáles incorporar.</p><div id="document-claims-results">${documentClaimsHtml(documentClaims,sourceDocuments)}</div></div></div><div class="context-entry-divider"><span>o registra contexto manualmente</span></div><form id="capture-context"><label for="context-kind">Tipo de aportación</label><select id="context-kind"><option value="user-input">Aportación humana</option><option value="hypothesis">Hipótesis por validar</option><option value="open-question">Pregunta abierta</option><option value="evidence">Evidencia</option></select><label for="context-statement">Contenido</label><textarea id="context-statement" maxlength="6000" required></textarea><fieldset id="evidence-fields" hidden><legend>Evaluación humana de la fuente</legend><label for="evidence-source">Fuente</label><input id="evidence-source" maxlength="1000"><label for="evidence-date">Fecha de la fuente</label><input id="evidence-date" type="date"><label for="evidence-provenance">Cómo se obtuvo</label><input id="evidence-provenance" maxlength="1000"><label for="evidence-quality">Calidad de la fuente</label><select id="evidence-quality"><option value="LOW">Baja</option><option value="MEDIUM">Media</option><option value="HIGH">Alta</option></select><label for="evidence-relevance">Relevancia</label><select id="evidence-relevance"><option value="INDIRECT">Indirecta</option><option value="DIRECT">Directa</option></select><label for="evidence-freshness">Vigencia</label><select id="evidence-freshness"><option value="HISTORICAL">Histórica</option><option value="AGING">Envejeciendo</option><option value="CURRENT">Actual</option></select><label for="evidence-limitations">Limitaciones</label><input id="evidence-limitations" maxlength="1000"><label><input id="evidence-external" type="checkbox" checked> Fuente externa</label><p class="hint">Tu evaluación queda registrada. El sistema no certifica la veracidad de la fuente.</p></fieldset><button type="submit">Guardar contexto</button></form></section>`;
 bindDocumentSelection('#context-documents','#context-document-selection');
 bindDocumentClaimActions(documentClaims,sourceDocuments);

 $('#generate-document-claims')?.addEventListener('click',event=>run(async()=>{
  const processed=sourceDocuments.filter(
   document=>document.status==='EXTRACTED'
  );

  if(!processed.length)
   throw Object.assign(
    new Error('Primero procesa al menos un documento.'),
    {code:'INVALID'}
   );

  activityStart(
   'Analizando tus documentos…',
   'Brandopolis está identificando hechos, hipótesis, ofertas, riesgos y otros hallazgos para tu revisión.'
  );

  const progress=$('#document-claims-progress');
  const progressTrack=progress?.querySelector('.document-progress-track');
  const progressFill=$('#document-progress-fill');
  const progressTitle=$('#document-progress-title');
  const progressCount=$('#document-progress-count');
  const progressDetail=$('#document-progress-detail');
  const generateButton=$('#generate-document-claims');

  if(progress){
   progress.hidden=false;
   progress.classList.remove('is-complete','is-error');
  }

  if(progressFill)progressFill.style.width='0%';
  if(progressTrack)progressTrack.setAttribute('aria-valuenow','0');
  if(progressCount)progressCount.textContent='0%';
  if(progressTitle)progressTitle.textContent='Preparando análisis…';
  if(progressDetail)progressDetail.textContent=`${processed.length} documento${processed.length===1?'':'s'} listo${processed.length===1?'':'s'} para revisar.`;

  if(generateButton){
   generateButton.disabled=true;
   generateButton.textContent='Generando hallazgos…';
  }

  let created=0;
  let reused=0;
  let totalClaims=0;
  const generatedClaims=[];

  try{
   for(let index=0;index<processed.length;index++){
    const document=processed[index];
    const before=Math.round((index/processed.length)*100);

    if(progressFill)progressFill.style.width=`${before}%`;
    if(progressTrack)progressTrack.setAttribute('aria-valuenow',String(before));
    if(progressCount)progressCount.textContent=`${before}%`;
    if(progressTitle)progressTitle.textContent=`Documento ${index+1} de ${processed.length}`;
    if(progressDetail)progressDetail.textContent=document.originalName;

    activityStep(
     `Revisando documento ${index+1} de ${processed.length}…`,
     document.originalName
    );

    const result=await api(
     '/api/documents/claims',
     {
      brandId,
      documentId:document.id
     },
     120000
    );

    totalClaims+=result.claims?.length??0;
    generatedClaims.push(...(result.claims??[]));

    if(result.reused)reused++;
    else created++;

    const completed=Math.round(((index+1)/processed.length)*100);

    if(progressFill)progressFill.style.width=`${completed}%`;
    if(progressTrack)progressTrack.setAttribute('aria-valuenow',String(completed));
    if(progressCount)progressCount.textContent=`${completed}%`;
   }

   if(progress)progress.classList.add('is-complete');
   if(progressTitle)progressTitle.textContent='Hallazgos preparados';
   if(progressDetail)progressDetail.textContent=`${totalClaims} hallazgo${totalClaims===1?'':'s'} listo${totalClaims===1?'':'s'} para revisión humana.`;

   activityDone(
    'Hallazgos preparados',
    `${totalClaims} hallazgo${totalClaims===1?'':'s'} listo${totalClaims===1?'':'s'} para revisión humana.`
   );

   await new Promise(resolve=>setTimeout(resolve,450));

   const results=$('#document-claims-results');

   if(results){
    results.innerHTML=documentClaimsHtml(
     generatedClaims,
     sourceDocuments
    );

    bindDocumentClaimActions(
     generatedClaims,
     sourceDocuments
    );
   }

   /*
    * Do not rebuild Contexto estratégico here.
    * Keeping the existing DOM preserves scroll, focus and the completed
    * progress state exactly where the user initiated the operation.
    */

   if(generateButton){
    generateButton.disabled=false;
    generateButton.textContent='Generar hallazgos';
   }

   notice(
    created
     ?`Se generaron hallazgos para ${created} documento${created===1?'':'s'}${reused?` · ${reused} ya tenía${reused===1?'':'n'} hallazgos y se reutilizaron`:''}.`
     :`Los hallazgos ya existían para ${reused} documento${reused===1?'':'s'}; no se volvió a llamar a la IA.`
   );
  }catch(error){
   activityFail();

   if(progress)progress.classList.add('is-error');
   if(progressTitle)progressTitle.textContent='No se pudieron generar los hallazgos';
   if(progressDetail)progressDetail.textContent='Revisa el mensaje de Brandopolis antes de volver a intentarlo.';

   if(generateButton){
    generateButton.disabled=false;
    generateButton.textContent='Generar hallazgos';
   }

   throw error;
  }
 },event.currentTarget));

 $('#analyze-context-documents').addEventListener('click',event=>run(async()=>{
  if(!sourceDocuments.length)
    throw Object.assign(
      new Error('Esta marca todavía no tiene documentos para procesar.'),
      {code:'INVALID'}
    );

  let created=0;
  let reused=0;

  for(const document of sourceDocuments){
    const result=await api('/api/documents/extract',{
      brandId,
      documentId:document.id
    });

    if(result.reused)reused++;
    else created++;
  }

  notice(
    created
      ?`${created} documento${created===1?' quedó procesado':'s quedaron procesados'}${reused?` · ${reused} reutilizado${reused===1?'':'s'}`:''}.`
      :`Los ${reused} documento${reused===1?' ya estaba procesado':'s ya estaban procesados'}; se reutilizó la extracción existente.`
  );

  await preserveViewAnchor(
   '.context-documents',
   ()=>showBrandContext()
  );
 },event.currentTarget));

 $('#upload-context-documents').addEventListener('click',event=>run(async()=>{
  const files=[...$('#context-documents').files];

  if(!files.length)
   throw Object.assign(
    new Error('Selecciona al menos un documento.'),
    {code:'INVALID'}
   );

  const uploaded=await uploadSourceDocuments(brandId,files);
  await showBrandContext();
  notice(`${uploaded} documento${uploaded===1?' guardado':'s guardados'} como fuente${uploaded===1?'':'s'} de esta marca.`);
 },event.currentTarget));

 $('#context-kind').addEventListener('change',()=>{const evidence=$('#context-kind').value==='evidence';$('#evidence-fields').hidden=!evidence;for(const name of ['source','date','provenance','limitations'])$(`#evidence-${name}`).required=evidence;});
 $('#capture-context').addEventListener('submit',event=>{event.preventDefault();run(async()=>{const kind=$('#context-kind').value,text=$('#context-statement').value;let entity=kind==='open-question'?{text,relatedHypothesisId:null}:{statement:text};if(kind==='evidence')entity={claim:text,source:$('#evidence-source').value,sourceDate:$('#evidence-date').value,provenance:$('#evidence-provenance').value,sourceQuality:$('#evidence-quality').value,relevance:$('#evidence-relevance').value,freshness:$('#evidence-freshness').value,limitations:[$('#evidence-limitations').value],external:$('#evidence-external').checked};await api('/api/context/capture',{brandId,kind,entity});await showBrandContext();notice('Contexto guardado. Las recomendaciones anteriores deberán actualizarse.');},event.submitter);});
}
function mountRecommendation(q,d,v,reviews,locked){
 if(draft)return;
 const facts=context.evidence,assumptions=context.hypotheses.filter(h=>h.status!=='REJECTED');
 $('#decision').insertAdjacentHTML('beforeend',`<details class="knowledge" open><summary>Lo que sabemos y lo que suponemos</summary><div class="knowledge-grid"><section class="evidence-panel"><p class="eyebrow">Fuentes y observaciones</p><h3>Evidencia registrada</h3>${facts.map(e=>`<p>${escape(e.claim)}<br><span class="hint">${escape(e.source)} · ${escape(e.sourceDate)}. Límites: ${escape(e.limitations.join('; ')||'No declarados')}</span></p>`).join('')||'<p class="hint">Sin evidencia registrada. No confundas una propuesta con un hecho.</p>'}</section><section class="hypothesis-panel"><p class="eyebrow">Supuestos por comprobar</p><h3>Hipótesis explícitas</h3>${assumptions.map(h=>`<p>${escape(h.statement)}<br><span class="badge warn">${h.status==='SUPPORTED'?'Con soporte registrado':'Por validar'}</span></p>`).join('')||'<p class="hint">Aún no declaras hipótesis para esta marca.</p>'}</section></div><p class="hint">Este contexto de marca no implica que cada fuente respalde la propuesta.</p></details>`);
 const row=context.recommendations?.find(r=>r.questionId===q.id&&r.resolution==='GENERATED'),rec=row?.payload,analysis=context.analyses?.find(a=>a.recommendationId===rec?.id);
 const list=rows=>`<ul>${rows.map(text=>`<li>${escape(text)}</li>`).join('')}</ul>`;
 $('#decision').insertAdjacentHTML('beforeend',`<section class="recommendation" aria-label="Propuesta de asistencia"><p class="eyebrow">Asistencia estratégica · ${pilotMode?'Piloto':'DEMO'}</p><p class="hint">${pilotMode?'El contexto de esta marca se comparte con el proveedor IA configurado al solicitar una propuesta. Puede no estar disponible; siempre puedes decidir con tu propio criterio. No incluyas secretos ni datos personales innecesarios.':'Opciones fijas de demostración. No son análisis de IA en vivo ni evidencia de mercado.'}</p><button id="generate-recommendation" class="secondary" ${locked?'disabled':''}>${pilotMode?'Solicitar propuesta IA':'Comparar opciones DEMO'}</button>${rec?`<h3>Compara antes de decidir</h3><span class="badge warn">Sin validar · revisión humana necesaria</span>${rec.options.map(o=>`<article class="option ${o.id===rec.recommendedOptionId?'is-proposed':''}"><h4>${escape(o.label)}${o.id===rec.recommendedOptionId?(pilotMode?' · propuesta IA':' · propuesta DEMO'):''}</h4><p>${escape(o.rationale)}</p>${list(o.tradeoffs)}</article>`).join('')}<p>${escape(rec.rationale)}</p><h4>Renuncias y condiciones de fallo</h4>${list([...rec.tradeoffs,...rec.failureConditions])}<h4>Preguntas abiertas</h4>${list(rec.openQuestions)}<p class="hint">Evidencias: ${rec.evidenceReferences.length}. Hipótesis utilizadas: ${rec.hypothesesUsed.length}. Ámbitos: ${escape(rec.affectedDomains.map(x=>labels[x]??x).join(', '))}.</p><details><summary>Evaluación y límites</summary>${list(analysis?.evaluation?.issues.map(i=>i.reason)??[])}</details><div class="human-choice" role="group" aria-labelledby="human-choice-title"><p class="eyebrow" id="human-choice-title">Decisión humana</p><p class="hint">La propuesta no cambia tu estrategia. Úsala o ajústala como punto de partida, o recházala con un motivo.</p><div class="actions">${rec.recommendedOptionId?'<button id="use-recommendation" class="secondary">Usar propuesta sugerida</button>':''}<button id="modify-recommendation" class="secondary">${rec.recommendedOptionId?'Modificar propuesta':'Construir mi decisión'}</button></div><form id="reject-recommendation"><label for="reject-reason">Motivo para rechazar</label><div class="reject-row"><input id="reject-reason" maxlength="1000" required><button class="secondary" type="submit">Rechazar recomendación</button></div></form></div>`:''}</section>`);
 $('#generate-recommendation').addEventListener('click',event=>run(async()=>{
 activityStart(
  pilotMode?'Brandopolis está preparando opciones…':'Preparando opciones DEMO…',
  pilotMode?'Analizando tu contexto estratégico.':'Preparando alternativas de demostración.'
 );
 let result;
 try{
  result=await api('/api/recommendations/generate',{brandId,questionId:q.id});
 }catch(error){
  activityFail();
  if(error.code==='AI_CONSENT_REQUIRED'&&aiNotice){showAiNotice(q.id);return;}
  throw error;
 }
 if(result.error){
  activityFail();
  notice('No se pudo generar una propuesta válida. Puedes continuar con tu decisión humana.',true,'assistance');
  return;
 }
 activityStep('Opciones listas.','Actualizando tu espacio estratégico…');
 await refresh();
 activityDone(
  pilotMode?'Opciones preparadas':'Opciones DEMO preparadas',
  'Ya puedes compararlas antes de decidir.'
 );
},event.currentTarget));
 const prepare=async(edit)=>{let receipt;if(reviews.length)receipt=await api('/api/reviews/start',{brandId,decisionId:d.id});activeDecisionTab='overview';draft={questionId:q.id,sourceRecommendationId:rec.id,expectedActiveVersion:v?.id??null,selectedOption:rec.options.find(o=>o.id===rec.recommendedOptionId)?.label??'',rationale:'',idempotencyKey:crypto.randomUUID(),reviewToken:receipt?.reviewToken};await api('/api/questions/prepare',{brandId,questionId:q.id,expectedActiveVersion:draft.expectedActiveVersion});render();$('#option').readOnly=!edit;(edit?$('#option'):$('#rationale')).focus();};
 $('#use-recommendation')?.addEventListener('click',e=>run(()=>prepare(false),e.currentTarget));$('#modify-recommendation')?.addEventListener('click',e=>run(()=>prepare(true),e.currentTarget));
 $('#reject-recommendation')?.addEventListener('submit',event=>{event.preventDefault();run(async()=>{await api('/api/recommendations/reject',{brandId,recommendationId:rec.id,rationale:$('#reject-reason').value});await refresh();notice('Recomendación rechazada. Tu estrategia permanece como la aprobaste.');},event.submitter);});
}
const statusTone=status=>['INCONCLUSIVE','CANDIDATE','REVIEWED'].includes(status)?'warn':['CANCELLED','REJECTED'].includes(status)?'muted':'';
const statusLabels={PLANNED:'Planeado',RUNNING:'En curso',COMPLETED:'Completado',INCONCLUSIVE:'No concluyente',CANCELLED:'Cancelado',CANDIDATE:'Candidato',REVIEWED:'Revisado',ACCEPTED:'Aceptado',REJECTED:'Rechazado'};
async function showBlueprint(){
 if(!enterView('#blueprint','Blueprint estratégico'))return;context=await api(`/api/blueprint?brandId=${encodeURIComponent(brandId)}`);renderContext();
 const name=id=>labels[context.questions.find(q=>q.id===context.decisions.find(d=>d.id===id)?.questionId)?.module]??'Decisión';
 $('#decision').innerHTML=`<p class="eyebrow">Blueprint · estrategia vigente</p><h2>Una visión conectada de tu marca.</h2><p>Esta vista reúne tus decisiones actuales. Cada cambio se realiza desde su decisión y conserva su historial.</p>${context.impacts.some(i=>i.status==='IMPACT_PENDING')?'<p class="review">Hay un cálculo de impacto pendiente. Revisa el estado antes de continuar.</p>':''}<div class="blueprint-grid">${context.questions.map(q=>{const d=context.decisions.find(d=>d.questionId===q.id),v=context.versions.find(v=>v.id===d?.activeVersionId);return `<section class="analysis-item blueprint-pillar"><p class="eyebrow">${String(context.questions.indexOf(q)+1).padStart(2,'0')} · Pilar estratégico</p><h3>${escape(labels[q.module])}</h3>${stateBadge(v,needsReview(context,d))}<p class="current">${escape(v?.selectedOption??'Aún no hay una decisión aprobada.')}</p><p>${escape(v?.rationale??'')}</p><button class="secondary" data-open-module="${escape(q.module)}">Abrir decisión</button></section>`;}).join('')}</div><h3>Conexiones</h3>${context.dependencies.map(d=>`<p class="dependency-path"><span>${escape(name(d.upstreamDecisionId))}</span><span class="edge ${d.kind==='HARD'?'':'is-soft'}">${d.kind==='HARD'?'Dependencia estricta':d.kind==='SOFT'?'Dependencia sugerida':'Informativa'}</span><span>${escape(name(d.downstreamDecisionId))}</span>${needsReview(context,context.decisions.find(x=>x.id===d.downstreamDecisionId))?'<span class="badge warn">Requiere revisión</span>':''}</p>`).join('')||'<p class="hint">Aún no hay decisiones conectadas.</p>'}<h3>Hipótesis abiertas</h3>${context.hypotheses.filter(h=>!['SUPPORTED','REJECTED'].includes(h.status)).map(h=>`<p>${escape(h.statement)}</p>`).join('')||'<p class="hint">Sin hipótesis abiertas registradas.</p>'}<h3>Aprendizajes aceptados</h3>${context.learnings.filter(l=>l.status==='ACCEPTED').map(l=>`<p>${escape(l.interpretation)}<br><span class="hint">Límites: ${escape(l.limitations.join('; '))}</span></p>`).join('')||'<p class="hint">Aún no hay aprendizajes aceptados.</p>'}`;
 document.querySelectorAll('[data-open-module]').forEach(button=>button.addEventListener('click',()=>openModule(button.dataset.openModule)));
}
function currentStrategySummary(){return `<details><summary>Lo que decidiste y lo que requiere revisión</summary>${context.questions.map(q=>{const d=context.decisions.find(d=>d.questionId===q.id),v=context.versions.find(v=>v.id===d?.activeVersionId);return `<p><strong>${escape(labels[q.module])}</strong><br>${escape(v?.selectedOption??'Pregunta estratégica abierta')}${needsReview(context,d)?'<br><span class="badge warn">Requiere revisión humana</span>':''}</p>`;}).join('')}</details>`;}
async function showHome(){
 if(!enterView('#home','Tu estrategia hoy'))return;

 const [nextContext,sourceDocuments,documentClaims]=await Promise.all([
  api(`/api/context?brandId=${encodeURIComponent(brandId)}`),
  api(`/api/documents?brandId=${encodeURIComponent(brandId)}`),
  api(`/api/document-claims?brandId=${encodeURIComponent(brandId)}`)
 ]);

 context=nextContext;
 renderContext();

 const documentState={
  total:sourceDocuments.length,
  pending:sourceDocuments.filter(document=>document.status!=='EXTRACTED').length,
  processed:sourceDocuments.filter(document=>document.status==='EXTRACTED').length,
  candidateClaims:documentClaims.filter(claim=>claim.reviewStatus==='CANDIDATE').length
 };

 $('#decision').innerHTML=homeHtml(context,documentState);

 document.querySelectorAll('[data-attention-module]').forEach(
  button=>button.addEventListener('click',()=>openModule(button.dataset.attentionModule))
 );

 bindStrategyLinks();

 $('#attention-learning')?.addEventListener('click',()=>run(showLearning));
 $('#attention-context')?.addEventListener('click',()=>run(showBrandContext));

 $('#attention-documents')?.addEventListener('click',()=>run(async()=>{
  await showBrandContext();

  const target=$('.context-documents');

  if(target){
   target.scrollIntoView({
    behavior:'smooth',
    block:'center'
   });
  }

  $('#analyze-context-documents')?.focus();
 }));
}
function mountLearningMoment(question){const m=user.learningMoments?.[question.module];if(m)$('#decision').insertAdjacentHTML('beforeend',`<details class="learning-moment"><summary>Qué estás aprendiendo aquí</summary><div class="learning-moment-body"><p class="eyebrow">${escape(capabilityLabel(m.capability))}</p><p>${escape(m.why)}</p><p><strong>Prueba esto:</strong> ${escape(m.apply)}</p><details><summary>Ver una pista más</summary><p><strong>Observa:</strong> ${escape(m.observe)}</p><p><strong>Cuidado:</strong> ${escape(m.caution)}</p></details></div></details>`);}
$('#learning-loop').addEventListener('click',()=>run(showLearning));
async function showLearning(){
 if(!enterView('#learning-loop','Experimentos y aprendizajes'))return;context=await api(`/api/context?brandId=${encodeURIComponent(brandId)}`);renderContext();
 const options=(rows,label)=>rows.map(r=>`<option value="${escape(r.id)}">${escape(label(r))}</option>`).join(''),running=context.experiments.filter(e=>e.status==='RUNNING');
 const action=(kind,row,status,label)=>`<button type="button" class="secondary" data-transition="${kind}" data-id="${escape(row.id)}" data-from="${row.status}" data-to="${status}">${label}</button>`;
 $('#decision').innerHTML=`<p class="eyebrow">Experimentos y aprendizajes</p><h2>Comprueba lo que sostiene tu estrategia.</h2><p>Una señal registra lo ocurrido. Un aprendizaje interpreta esa señal y requiere tu revisión antes de aceptarse.</p><div class="learning-steps"><details open><summary>Planear un experimento</summary><form id="experiment-form"><label for="experiment-decision">Decisión relacionada</label><select id="experiment-decision" required>${options(context.decisions,d=>context.versions.find(v=>v.id===d.activeVersionId)?.selectedOption)}</select><label for="experiment-hypothesis">Hipótesis a comprobar</label><select id="experiment-hypothesis" required>${options(context.hypotheses,h=>h.statement)}</select><label for="experiment-objective">Objetivo del experimento</label><input id="experiment-objective" maxlength="4000" required><label for="success-criteria">Criterio de éxito</label><input id="success-criteria" maxlength="4000" required><label for="intended-signal">¿Qué señal esperas observar?</label><textarea id="intended-signal" maxlength="4000" required></textarea><button ${!context.decisions.length||!context.hypotheses.length?'disabled':''}>Crear experimento</button><p class="hint">Necesitas una decisión aprobada y una hipótesis registrada en Contexto estratégico.</p></form></details><details><summary>Registrar una señal</summary><form id="signal-form"><label for="signal-experiment">Experimento en curso</label><select id="signal-experiment" required>${options(running,e=>e.intendedSignal)}</select><label for="observation">¿Qué ocurrió?</label><textarea id="observation" maxlength="4000" required></textarea><label for="signal-source">Fuente de la observación</label><input id="signal-source" maxlength="1000" required><label for="signal-date">Fecha y hora observada</label><input id="signal-date" type="datetime-local" required><button ${!running.length?'disabled':''}>Guardar señal</button></form></details><details><summary>Proponer un aprendizaje</summary><form id="learning-form"><label for="learning-signal">Señal que lo sustenta</label><select id="learning-signal" required>${options(context.signals,s=>s.observation)}</select><label for="interpretation">Interpretación</label><textarea id="interpretation" maxlength="4000" required></textarea><label for="learning-limitations">Límites de esta interpretación</label><input id="learning-limitations" maxlength="1000" required><button ${!context.signals.length?'disabled':''}>Crear aprendizaje candidato</button></form></details></div><h3>Experimentos</h3>${context.experiments.map(e=>`<article class="analysis-item"><span class="badge ${statusTone(e.status)}">${statusLabels[e.status]}</span><p>${escape(e.intendedSignal)}</p>${experimentPlan(e.id)}<div class="actions">${e.status==='PLANNED'?action('experiment',e,'RUNNING','Iniciar experimento')+action('experiment',e,'CANCELLED','Cancelar experimento'):e.status==='RUNNING'?action('experiment',e,'COMPLETED','Completar experimento')+action('experiment',e,'INCONCLUSIVE','Marcar no concluyente')+action('experiment',e,'CANCELLED','Cancelar experimento'):''}</div></article>`).join('')||'<p class="hint">Aún no hay experimentos.</p>'}<h3>Señales</h3>${context.signals.map(s=>`<article class="analysis-item"><p>${escape(s.observation)}</p><p class="hint">${escape(s.source)} · ${escape(new Date(s.observedAt).toLocaleString('es-MX'))}</p></article>`).join('')||'<p class="hint">Aún no hay observaciones.</p>'}<h3>Aprendizajes</h3>${context.learnings.map(l=>`<article class="analysis-item"><span class="badge ${statusTone(l.status)}">${statusLabels[l.status]}</span><p>${escape(l.interpretation)}</p><p class="hint">Límites: ${escape(l.limitations.join('; '))}</p><div class="actions">${l.status==='CANDIDATE'?action('learning',l,'REVIEWED','Confirmar revisión'):l.status==='REVIEWED'?action('learning',l,'ACCEPTED','Aceptar aprendizaje')+action('learning',l,'REJECTED','Rechazar aprendizaje'):''}</div></article>`).join('')||'<p class="hint">Aún no hay aprendizajes.</p>'}`;
 if(context.experiments.length||context.signals.length||context.learnings.length)$('#decision').append($('.learning-steps'));
 const submit=(selector,kind,entity,extra=()=>({}))=>$(selector).addEventListener('submit',e=>{e.preventDefault();run(async()=>{await api('/api/learning/create',{brandId,kind,entity:entity(),...extra()});await showLearning();notice('Registro guardado. Las decisiones no cambiaron.');},e.submitter);});
 submit('#experiment-form','experiment',()=>({hypothesisId:$('#experiment-hypothesis').value,intendedSignal:$('#intended-signal').value}),()=>({decisionId:$('#experiment-decision').value,plan:{objective:$('#experiment-objective').value,successCriteria:$('#success-criteria').value}}));
 submit('#signal-form','signal',()=>({experimentId:$('#signal-experiment').value,observation:$('#observation').value,source:$('#signal-source').value,observedAt:new Date($('#signal-date').value).toISOString()}));
 submit('#learning-form','learning',()=>({signalIds:[$('#learning-signal').value],interpretation:$('#interpretation').value,limitations:[$('#learning-limitations').value]}));
 document.querySelectorAll('[data-transition]').forEach(button=>button.addEventListener('click',()=>run(async()=>{await api('/api/learning/transition',{brandId,kind:button.dataset.transition,objectId:button.dataset.id,expectedStatus:button.dataset.from,status:button.dataset.to});await showLearning();notice('Revisión humana guardada. El historial estratégico permanece intacto.');},button)));
}
function experimentPlan(id){const p=context.experimentPlans.find(p=>p.experimentId===id);if(!p)return '';const dates=[['Creado',p.createdAt],['Inicio',p.startedAt],['Cierre',p.completedAt]].filter(([,v])=>v).map(([k,v])=>`${k}: ${escape(fmt(v))}`).join(' · ');return `<p><strong>Objetivo:</strong> ${escape(p.objective)}<br><strong>Criterio de éxito:</strong> ${escape(p.successCriteria)}</p>${dates?`<p class="hint">${dates}</p>`:''}`;}
$('#practice').addEventListener('click',()=>run(async()=>{
 enterView('#practice','Mi aprendizaje');
 const events=await api('/api/practice');let limit=12;
 const paint=()=>{$('#decision').innerHTML=practiceHtml(events,limit);$('#more-practice')?.addEventListener('click',()=>{limit+=12;paint();focusView($('#decision .analysis-item:nth-last-of-type(12)')??$('#more-practice'));});};paint();
}));

function renderContext(){
  updateShell();
  const versions=context.versions.filter(v=>context.decisions.some(d=>d.activeVersionId===v.id));
  const latest=versions.slice().sort((a,b)=>new Date(b.approvedAt)-new Date(a.approvedAt))[0];
  const pendingReview=context.questions.filter(q=>needsReview(context,context.decisions.find(d=>d.questionId===q.id))).length;
  $('#context').innerHTML=`<div class="context-cover"><p class="eyebrow">Memoria estratégica</p><h3>Contexto vigente</h3><p>${escape($('#brands').selectedOptions[0]?.textContent?.replace(/ · (DEMO|PILOT)$/,''))}</p></div><details class="context-details" open><summary>Lo que ya decidiste <span class="context-count">${versions.length} de ${context.questions.length}${pendingReview?` · ${pendingReview} por revisar`:''}</span></summary><ol class="context-lineage">${context.questions.map((q,index)=>{const d=context.decisions.find(d=>d.questionId===q.id),v=context.versions.find(v=>v.id===d?.activeVersionId);return `<li${$('#decision').dataset.view==='decision'&&q.module===selected?' aria-current="step"':''}><span class="context-number">${String(index+1).padStart(2,'0')}</span><div><strong>${escape(labels[q.module]??q.module)}</strong><p>${v?escape(v.selectedOption):'Tu siguiente decisión comienza aquí.'}</p>${v?`<span class="context-version">v${v.sequence} · Decisión humana</span>`:''}${needsReview(context,d)?'<span class="badge warn">Requiere revisión</span>':''}</div></li>`;}).join('')}</ol></details>${latest?`<p class="context-updated">Última decisión<br><strong>${escape(fmt(latest.approvedAt))}</strong></p>`:''}<p class="hint context-note">Los cambios conservan su historia.<br>Nada se reescribe sin tu criterio.</p>`;
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
 if(current){const committed=document.createElement('section');committed.className=`human-decision${reviews.length?' is-under-review':''}`;committed.setAttribute('aria-label','Decisión humana vigente');committed.innerHTML=`<p class="eyebrow">Decisión humana · vigente${reviews.length?' · en revisión':''}</p>`;current.before(committed);committed.append(current);if(rationale)committed.append(rationale);}
 const human=surface.querySelector('.human-decision');
 if(human)hero.after(human);
 const review=surface.querySelector('.review');
 if(draft&&review){
   const disclosure=document.createElement('details');disclosure.className='review-origin';disclosure.innerHTML='<summary>Cambio que origina esta revisión</summary>';
   review.before(disclosure);disclosure.append(review);
   const form=surface.querySelector('.decision-form');
   if(form){hero.after(form);if(v)form.insertAdjacentHTML('afterbegin',`<p class="review-trigger"><span class="badge warn">Requiere revisión</span> ${escape(reviews.map(impactReason).join(' '))}</p><div class="review-current"><p class="eyebrow">Tu decisión vigente · v${v.sequence}</p><p>${escape(v.selectedOption)}</p></div>`);}
 }
 const related=context.dependencies.filter(link=>link.upstreamDecisionId===d?.id||link.downstreamDecisionId===d?.id);
 if(related.length){const connections=document.createElement('div');connections.className='decision-connections';const chip=link=>{const other=link.upstreamDecisionId===d.id?link.downstreamDecisionId:link.upstreamDecisionId,otherDecision=context.decisions.find(d=>d.id===other),question=context.questions.find(q=>q.id===otherDecision?.questionId),review=needsReview(context,otherDecision);return `<span class="connection${review?' is-review':''}">${escape(labels[question?.module]??'Decisión')} <small>· ${link.kind==='HARD'?'estricta':link.kind==='SOFT'?'sugerida':'informativa'}${review?' · requiere revisión':''}</small></span>`;},dependsOn=related.filter(link=>link.downstreamDecisionId===d.id),affects=related.filter(link=>link.upstreamDecisionId===d.id);
  connections.innerHTML=(dependsOn.length?`<span class="label">Depende de</span>${dependsOn.map(chip).join('')}`:'')+(affects.length?`<span class="label">Afecta a</span>${affects.map(chip).join('')}`:'');surface.append(connections);}
 if(reviews.length)surface.classList.add('under-review');else surface.classList.remove('under-review');
}
function bindStrategyLinks(){document.querySelectorAll('[data-strategy-module]').forEach(button=>button.addEventListener('click',()=>openModule(button.dataset.strategyModule)));}

function setNavActive(selector){$('#decision').dataset.view=selector?.slice(1)??'decision';document.querySelectorAll('#journey [aria-current]').forEach(b=>b.removeAttribute('aria-current'));if(selector)$(selector).setAttribute('aria-current','page');}

async function showFeedback(){
 analytics.send(PILOT_EVENTS.feedbackOpened);
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
 $('#ai-notice-accept').addEventListener('click',event=>run(async()=>{
 await api('/api/ai-notice/accept',{version:aiNotice.version});
 section.remove();
 activityStart('Brandopolis está preparando opciones…','Analizando tu contexto estratégico.');
 let result;
 try{
  result=await api('/api/recommendations/generate',{brandId,questionId});
 }catch(error){
  activityFail();
  throw error;
 }
 if(result.error){
  activityFail();
  notice('No se pudo generar una propuesta válida. Puedes continuar con tu decisión humana.',true,'assistance');
  return;
 }
 activityStep('Opciones listas.','Actualizando tu espacio estratégico…');
 await refresh();
 activityDone('Opciones preparadas','Ya puedes compararlas antes de decidir.');
},event.currentTarget));
}

/* Keep active brand context visible through long strategic views. */
{
 const shellHeader=document.querySelector('.app header')??document.querySelector('header');
 const syncStickyHeader=()=>{
  if(!shellHeader)return;
  shellHeader.classList.toggle('is-scrolled',window.scrollY>12);
 };
 window.addEventListener('scroll',syncStickyHeader,{passive:true});
 syncStickyHeader();
}
