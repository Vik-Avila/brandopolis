import {createBrandoPresence} from './brando-presence.js';
const $=s=>document.querySelector(s);
import {escape,labels,questionText,questionHelp,railAttentionHtml,railHistoryHtml,strategyProgress,decisionGuide,strategicSectionsHtml,reviewUpdates,reviewUpdatesHtml,validationNextHtml,planQualityHtml,hypothesisWords,directionWords,declaredContextHtml,decisionIntelligenceHtml,evaluatorLabel,fmt,brandoPlainText,brandoAnswerHtml,brandoContextHtml,brandoSectionOrientation,brandoSectionHtml,brandoTicketExpired,needsReview,stateBadge,capabilityLabel,practiceHtml,homeHtml,impactPair as impactView,historyHtml as historyView} from './product-views.js';
import {trapFocus,decisionTabs,viewTabs} from './product-interactions.js';
import * as analytics from './analytics.js';
import {PILOT_EVENTS} from './analytics.js';
let activeDecisionTab='overview';
let user,brandId,context,selected=Object.hasOwn(labels,new URL(location.href).searchParams.get('module'))?new URL(location.href).searchParams.get('module'):'Primary Customer',draft=null,impactVisible=false;
let pilotMode=false,liveAi=false,aiNotice=null,demoBrandIds=new Set();
/** Options the Estratega de Marca set aside. Kept for the session so nothing is silently erased: the
 *  canonical, audited rejection remains the recommendation-level form with its reason. Keyed
 *  `<recommendationId>:<optionId>`, because option ids are positional and repeat across proposals, so
 *  a bare id would leak one discard into every other phase and brand. */
const discardedOptions=new Set();
/** True while the active brand is the CoffeePolis sandbox rather than the participant's own work. */
const activeBrandIsDemo=()=>demoBrandIds.has(brandId);
/** The next phase in canonical journey order that still has no approved version, or null when the
 *  journey is complete. Dependencies are untouched: this only navigates, it never skips a decision. */
function nextPhase(){
 if(!context)return null;
 const order=[...document.querySelectorAll('#journey [data-module]')].map(b=>b.dataset.module);
 for(const module of order){
  const q=context.questions.find(x=>x.module===module);if(!q)continue;
  const d=context.decisions.find(x=>x.questionId===q.id);
  if(!d?.activeVersionId)return module;
 }
 return null;
}
/* Strategic Workspace (ADR-0025 + ADR-0027): the navigation and the right rail collapse independently; both collapsed
   is Focus Mode. The rail shows ONE tool at a time (Brando · Contexto · Atención · Historial). Session-scoped, best
   effort; switching tools never touches drafts, Brando's conversation, the open view or strategy, and never asks AI. */
const panelKey='brandopolis:panels';
const RAIL_TOOLS={brando:'Brando',context:'Contexto',attention:'Atención',history:'Historial'};
let panels={left:false,right:true,tool:'context',strategy:true};
try{panels={...panels,...JSON.parse(sessionStorage.getItem(panelKey)??'{}')};}catch{/* private mode: defaults */}
if(!Object.hasOwn(RAIL_TOOLS,panels.tool))panels.tool='context';
const desktopRail=matchMedia('(min-width:1001px)');
let railDrawerOpen=false,railDrawerOpener=null;
function syncPanelSignal(){
 const count=(context?.attention??[]).length;
 const badge=document.querySelector('#toggle-rail .panel-toggle-count');
 if(badge){badge.hidden=!(panels.right&&count);badge.textContent=count?String(count):'';}
 const dot=document.querySelector('[data-rail-tool="attention"] .rail-dot');if(dot)dot.hidden=!count;
}
function railVisible(tool){return desktopRail.matches?!panels.right&&panels.tool===tool:railDrawerOpen&&panels.tool===tool;}
function applyPanels(){
 const body=document.body,desk=desktopRail.matches;
 body.classList.toggle('left-collapsed',panels.left);
 body.classList.toggle('right-collapsed',panels.right);
 body.classList.toggle('focus-mode',panels.left&&panels.right);
 body.classList.toggle('rail-open',desk&&!panels.right);
 body.classList.toggle('rail-drawer-open',!desk&&railDrawerOpen);
 const left=document.querySelector('#toggle-journey');
 if(left){left.setAttribute('aria-expanded',String(!panels.left));const label=panels.left?'Expandir navegación':'Contraer navegación';left.setAttribute('aria-label',label);left.dataset.tip=label;left.querySelector('.panel-toggle-label').textContent=label;left.querySelector('use')?.setAttribute('href',panels.left?'#i-expand':'#i-collapse');}
 const right=document.querySelector('#toggle-rail');
 if(right){right.setAttribute('aria-expanded',String(!panels.right));const label=panels.right?'Abrir herramientas':'Contraer herramientas';right.setAttribute('aria-label',label);right.dataset.tip=label;right.querySelector('.panel-toggle-label').textContent=label;right.querySelector('use')?.setAttribute('href',panels.right?'#i-collapse':'#i-expand');}
 const strategy=document.querySelector('#strategy-toggle');
 if(strategy){strategy.setAttribute('aria-expanded',String(panels.strategy));document.querySelector('#strategy-list').hidden=!panels.strategy;}
 const label=document.querySelector('.focus-mode-label');if(label)label.hidden=!(panels.left&&panels.right&&desk);
 // Exactly one tool panel: the docked Brando dialog, or one rail section.
 const panel=document.querySelector('#rail-panel');
 const showPanel=desk?!panels.right&&panels.tool!=='brando':railDrawerOpen;
 if(panel){panel.hidden=!showPanel;document.querySelector('#rail-panel-title').textContent=RAIL_TOOLS[panels.tool];for(const section of document.querySelectorAll('[data-rail-panel]'))section.hidden=section.dataset.railPanel!==panels.tool;}
 for(const button of document.querySelectorAll('[data-rail-tool]'))button.setAttribute('aria-pressed',String(railVisible(button.dataset.railTool)));
 if(typeof syncDockedBrando==='function')syncDockedBrando();
 if(showPanel&&typeof renderRailTool==='function')renderRailTool();
 syncPanelSignal();
 try{sessionStorage.setItem(panelKey,JSON.stringify(panels));}catch{/* best effort */}
}
function selectRailTool(tool,opener){
 if(tool==='brando'){openBrando(opener);return;}
 if(desktopRail.matches){
  if(!panels.right&&panels.tool===tool){panels.right=true;applyPanels();return;}
  panels.tool=tool;panels.right=false;applyPanels();
 }else{
  // One drawer at a time: the navigation closes before the tools open.
  if($('#journey').classList.contains('open'))closeMenu(false);
  panels.tool=tool;railDrawerOpen=true;railDrawerOpener=opener;applyPanels();
  $('#nav-backdrop').hidden=false;$('#close-rail-panel').focus();
 }
}
function closeRailDrawer(returnFocus=true){
 if(!railDrawerOpen)return;
 railDrawerOpen=false;$('#nav-backdrop').hidden=!$('#journey').classList.contains('open');applyPanels();
 if(returnFocus)railDrawerOpener?.focus();
}
document.querySelector('#toggle-journey')?.addEventListener('click',()=>{panels.left=!panels.left;applyPanels();});
document.querySelector('#toggle-rail')?.addEventListener('click',()=>{
 if(panels.right){panels.right=false;}else panels.right=true;
 applyPanels();
});
document.querySelector('#strategy-toggle')?.addEventListener('click',()=>{
 // Collapsed navigation: the group opens the navigation first so the nine decisions are reachable.
 if(panels.left&&desktopRail.matches&&matchMedia('(min-width:1280px)').matches){panels.left=false;panels.strategy=true;}
 else panels.strategy=!panels.strategy;
 applyPanels();
});
document.querySelectorAll('[data-rail-tool]').forEach(button=>button.addEventListener('click',()=>selectRailTool(button.dataset.railTool,button)));
document.querySelector('#close-rail-panel')?.addEventListener('click',()=>{if(desktopRail.matches){panels.right=true;applyPanels();$('#toggle-rail').focus();}else closeRailDrawer();});
document.querySelector('#rail-panel')?.addEventListener('keydown',event=>{if(event.key==='Escape'){event.stopPropagation();if(desktopRail.matches){panels.right=true;applyPanels();$('#toggle-rail').focus();}else closeRailDrawer();}});
desktopRail.addEventListener('change',()=>{railDrawerOpen=false;applyPanels();});
// «Próximamente»: visible and announced, never a destination. No fake screen, no request.
document.querySelectorAll('#journey [data-soon]').forEach(button=>button.addEventListener('click',event=>event.preventDefault()));
applyPanels();
let noticeTimer;
const notice=(text,error=false,kind)=>{const n=$('#notice');clearTimeout(noticeTimer);n.textContent=text;n.className=error?'error':'';n.dataset.kind=kind??(error?'technical':'status');if(text&&!error)noticeTimer=setTimeout(()=>{if(n.textContent===text)n.textContent='';},10000);};

let activityTimer;
let competitiveResearchResult=null;
let competitiveRejectedClaims=new Set();
let competitiveResearchBrandId=null;
/** Brand whose competitive review has already reported completion, so a re-render cannot re-report. */
let competitiveCompletionReported=null;
/** Brands whose evidence panel has already been recorded as opened in this page load. */
const evidenceOpenedRecorded=new Set();

/** Records the canonical Evidence Engagement signal. Never blocks the interface, never retries. */
function recordEvidenceOpened(){
 if(!brandId||evidenceOpenedRecorded.has(brandId))return;
 evidenceOpenedRecorded.add(brandId);
 api('/api/evidence/opened',{brandId}).catch(()=>evidenceOpenedRecorded.delete(brandId));
}
/** Brand whose rejected competitive claims are already loaded, so the status is canonical anywhere. */
let competitiveRejectionsBrandId=null;

const COMPETITIVE_STATUS=Object.freeze({
 NONE:'Sin investigar',
 PENDING:'Pendiente de revisión',
 REVIEWED:'Revisado'
});

/** Evidence carrying the competitive provenance, i.e. findings the participant actually incorporated. */
function competitiveEvidence(){
 return (context?.evidence??[]).filter(item=>
  String(item?.provenance??'').toLowerCase().includes('entorno competitivo')
  ||String(item?.claim??'').startsWith('Entorno competitivo —'));
}

/**
 * Competitive status from canonical state, never from what the screen happens to show.
 *
 *  - REVIEWED  research produced findings and every one is resolved: incorporated ones are evidence
 *              in the Brand Context, discarded ones are recorded rejections. Both survive a reload.
 *  - PENDING   a research round is open in this session with findings still awaiting the human.
 *  - NONE      nothing has been researched and nothing resolved.
 *
 * Unresolved candidates exist only inside the round that produced them — they are never persisted as
 * strategy, which is the point — so after a reload the honest reading of stored state is REVIEWED or
 * NONE, never a pending review that no longer has anything to review.
 */
function competitiveStatus(){
 const live=competitiveResearchBrandId===brandId?competitiveResearchResult:null;
 const findings=live?.findings??[];
 const unresolved=findings.filter(f=>!competitiveFindingAccepted(f)&&!competitiveFindingRejected(f));
 if(unresolved.length)return COMPETITIVE_STATUS.PENDING;
 if(findings.length||competitiveEvidence().length||competitiveRejectedClaims.size)return COMPETITIVE_STATUS.REVIEWED;
 return COMPETITIVE_STATUS.NONE;
}

/** Loads the recorded rejections once per brand so the status is right even before the view opens. */
async function ensureCompetitiveRejections(){
 if(!brandId||competitiveRejectionsBrandId===brandId)return false;
 try{
  const rejected=await api(`/api/competitive/rejections?brandId=${encodeURIComponent(brandId)}`);
  competitiveRejectedClaims=new Set(rejected.claims??[]);
  competitiveRejectionsBrandId=brandId;
  return true;
 }catch{/* the status falls back to what the Brand Context already proves; never block a render */}
 return false;
}
/** Element mirroring the global activity panel beside whichever control started the work. */
let activityMirror=null;

/** Points the mirror at a host element (or clears it). The caller owns the element's lifetime. */
const setActivityMirror=element=>{activityMirror=element??null;};

/** Writes the current activity state into the mirror. One state, rendered in two places. */
const paintMirror=(state,title,detail)=>{
 if(!activityMirror?.isConnected){activityMirror=null;return;}
 const wasHidden=activityMirror.hidden;activityMirror.hidden=state==='idle';
 // The running state stays on screen next to the control that started it (taller headers on tablet/phone).
 if(wasHidden&&state==='active')activityMirror.scrollIntoView({block:'nearest'});
 activityMirror.classList.toggle('is-active',state==='active');
 activityMirror.classList.toggle('is-complete',state==='complete');
 const mark=activityMirror.querySelector('.local-activity-mark');
 if(mark)mark.textContent=state==='complete'?'✓':'✦';
 const heading=activityMirror.querySelector('.local-activity-title');
 if(heading)heading.textContent=title??'';
 const body=activityMirror.querySelector('.local-activity-detail');
 if(body)body.textContent=detail??'';
};

const activityStart=(title,detail)=>{
 paintMirror('active',title,detail);
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
 // Revealing both activity panels can move the local status below the fold. Keep the feedback
 // beside the initiating control in view after layout changes, without waiting for smooth scroll.
 if(activityMirror?.isConnected){
  const bounds=activityMirror.getBoundingClientRect();
  if(bounds.top<0||bounds.bottom>window.innerHeight)activityMirror.scrollIntoView({block:'nearest',behavior:'instant'});
 }
};

const activityStep=(title,detail)=>{
 paintMirror('active',title,detail);
 const box=$('#ai-activity');
 if(!box||box.hidden)return;
 $('#ai-activity-title').textContent=title;
 $('#ai-activity-detail').textContent=detail;
};

const activityDone=(title,detail)=>{
 paintMirror('complete',title,detail);
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
 paintMirror('idle');
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
    // Signing in has no draft: an unreachable server is said as such (the DEMO process is not running).
    if(path==='/api/session')throw new Error(pilotMode?'No pudimos conectar con Brandopolis. Revisa tu conexión y vuelve a intentar.':'No pudimos conectar con la demo local: el servidor no responde. Inicia la DEMO (pnpm competition:start --isolated) y vuelve a intentar.');
    preserveDraft();throw new Error(input===undefined?(pilotMode?'No pudimos conectar con Brandopolis. Revisa tu conexión y vuelve a intentar.':'No pudimos conectar con la demo local. Comprueba que la terminal siga abierta y vuelve a intentar.'):'No recibimos confirmación. Tu borrador se conserva. Revisa el estado antes de repetir la acción para evitar duplicados.');
  }
  if(!response.ok) {
    const conflict=path.includes('/learning/')?'Este registro cambió o no permite esa acción. Vuelve a abrir Validación para revisar su estado.':path.includes('/recommendations/')?'La propuesta ya no corresponde al contexto actual. Vuelve a abrir la decisión y compara opciones de nuevo.':'Esta decisión cambió mientras la estabas editando. Revisa la versión más reciente antes de aprobar. Si usaste una recomendación, genera otra con el contexto actual.';
    const messages={CONFLICT:conflict,UNAUTHORIZED:pilotMode?'Tu sesión venció. Vuelve a entrar al piloto.':'Tu sesión DEMO venció o no está disponible. Vuelve a entrar con la sesión local vigente.',FORBIDDEN:pilotMode?'No tienes permiso para esta acción o esta marca.':'No tienes permiso para esta acción. Revisa que hayas entrado con la sesión DEMO correcta.',UNAVAILABLE:pilotMode?'El servicio no está disponible por el momento. Tu borrador se conserva; vuelve a intentar en unos minutos.':'La demo local no está disponible. Conserva tu borrador y comprueba que la terminal siga abierta.',RATE_LIMITED:'Demasiadas solicitudes seguidas. Espera un momento y vuelve a intentar.',AI_CAP_REACHED:'Se alcanzó el límite diario de propuestas IA. Puedes continuar con tu decisión y volver a pedir propuestas mañana.',AI_CONSENT_REQUIRED:'Antes de pedir una propuesta, confirma el aviso sobre el uso de datos con IA.',INVALID:'Revisa los campos requeridos y el contexto disponible antes de continuar.',NOT_FOUND:'La marca o el registro ya no está disponible para esta sesión. Selecciona una marca accesible.'};
    if(data.code==='UNAUTHORIZED'){resetBrando();$('#brando-dialog').close();preserveDraft();document.body.classList.remove('app');$('#login').hidden=false;$('#workspace').hidden=true;$('#logout').hidden=true;$('#menu').hidden=true;$('.header-brand-control').hidden=true;$('#new-brand').hidden=true;$('#mode-badge').hidden=true;}
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
  demoBrandIds=new Set(brands.filter(b=>b.isDemo).map(b=>b.id));
  $('#brands').innerHTML=brands.map(b=>`<option value="${escape(b.id)}">${escape(b.name)}${b.isDemo?' · Marca demo':''}</option>`).join('');
  resetBrando();
  brandId=brands.some(b=>b.id===preferred)?preferred:brands[0]?.id;
  if(brandId)$('#brands').value=brandId;
  activeDecisionTab='overview';draft=null;await refresh();
}
/** Routes that are public documents. Google requires them reachable, and a participant must be able
 *  to read what they are accepting BEFORE accepting it, so no gate may ever intercept them. */
const LEGAL_PATHS=['/privacidad','/terminos'];
/** Public documents: readable without a session and never intercepted by the intake gate. The legal
 *  routes are here because a participant must be able to read what they are accepting; the survey
 *  thank-you page is here because it is shown to whoever just finished the survey, signed in or not. */
const PUBLIC_DOCUMENT_PATHS=[...LEGAL_PATHS,'/gracias-encuesta'];
const currentPath=()=>location.pathname.replace(/\/$/,'')||'/';
const isPublicDocument=()=>PUBLIC_DOCUMENT_PATHS.includes(currentPath());

/** Administration. A separate surface: authorization is the server's; this renders what it returns. */
let adminView='resumen';
const adminNum=value=>value==null?'—':typeof value==='number'?value.toLocaleString('es-MX'):String(value);
const adminMins=stat=>stat?.medianSeconds==null?'—':Math.round(stat.medianSeconds/60)+' min (n='+stat.n+')';
const adminTiles=items=>'<div class="admin-tiles">'+items.map(([label,value,note])=>
 '<div class="admin-tile"><span>'+escape(label)+'</span><strong>'+escape(String(value))+'</strong>'+(note?'<em>'+escape(note)+'</em>':'')+'</div>').join('')+'</div>';
const adminDist=(title,values)=>'<div class="admin-dist"><h3>'+escape(title)+'</h3><ul>'+
 (Object.entries(values??{}).map(([k,v])=>'<li><span>'+escape(k)+'</span><strong>'+adminNum(v)+'</strong></li>').join('')||'<li class="hint">Sin datos</li>')+'</ul></div>';

const ADMIN_COLUMNS=['Nombre','Email','País','Perfil','Registro','Último acceso','Sesiones','Recurrente','Marcas reales','Intake','Activado','Decisiones','TTFI','TTFD','Evidencia','Mapa','PDF','IA','Fallos IA','Cohorte','Estado','Acción'];
/** Minutes, or an em dash. Durations are reported in minutes because the targets are stated in minutes. */
const adminDuration=seconds=>seconds==null?'—':Math.round(seconds/60)+' min';
function adminRow(p){
 const status=escape(p.accessStatus)+(p.identityActive?'':' · desactivado');
 const next=p.accessStatus==='SUSPENDED'?'APPROVED':'SUSPENDED';
 const action=p.identityActive
  ?'<button type="button" class="secondary" data-admin-status="'+escape(p.userId)+'" data-next="'+next+'">'+(next==='APPROVED'?'Reactivar':'Suspender')+'</button>'
  :'—';
 return '<tr>'+[escape(p.name??'—'),escape(p.email??'—'),escape(p.country??'—'),
  escape(p.primaryProfile??'—'),p.registeredAt?escape(fmt(p.registeredAt)):'—',
  p.lastLoginAt?escape(fmt(p.lastLoginAt)):'—',adminNum(p.sessions),p.recurrent?'Sí':'No',
  adminNum(p.realBrands),p.intakeComplete?'Sí':'No',p.activated?'Sí':'No',adminNum(p.decisionsApproved),
  adminDuration(p.timeToFirstInsightSeconds),adminDuration(p.timeToFirstDecisionSeconds),
  p.openedEvidence?'Abierta':(p.evidenceSupplied?'Aportada':'No'),p.mapaEstrategicoViewed?'Sí':'No',
  adminNum(p.mapaEstrategicoExports),adminNum(p.recommendationsRequested),adminNum(p.recommendationsFailed),
  escape(p.cohort??'—'),status,action].map(cell=>'<td>'+cell+'</td>').join('')+'</tr>';
}

async function renderAdmin(){
 const body=$('#admin-body');
 document.querySelectorAll('[data-admin-view]').forEach(b=>b.setAttribute('aria-current',b.dataset.adminView===adminView?'page':'false'));
 body.innerHTML='<p class="hint">Cargando…</p>';
 if(adminView==='configuracion'){
  body.innerHTML='<section class="admin-panel"><h2>Configuración</h2><p class="hint">Los operadores se configuran con <code>BRANDOPOLIS_ADMIN_EMAILS</code> en el entorno del servidor. Más controles llegarán en una iteración posterior.</p></section>';
  return;
 }
 if(adminView==='resumen'){
  const s=await api('/api/admin/summary');
  body.innerHTML='<section class="admin-panel"><h2>Resumen</h2>'+adminTiles([
   ['Estrategas registrados',adminNum(s.participants)],['Estrategas activos',adminNum(s.activeParticipants)],
   ['Nuevos hoy',adminNum(s.newToday)],['Últimos 7 días',adminNum(s.new7d)],['Últimos 30 días',adminNum(s.new30d)],
   ['Intake completo',adminNum(s.intakeComplete)],['Con marca real',adminNum(s.participantsWithRealBrand)],
   ['Marcas reales',adminNum(s.realBrands)],['Marcas demo',adminNum(s.demoBrands),'excluidas de la evidencia'],
   ['Con segunda marca real',adminNum(s.participantsWithSecondRealBrand)],['Recurrentes',adminNum(s.returningParticipants)],
   ['Activados',adminNum(s.activated)],['Tasa de activación',s.activationRate==null?'—':Math.round(s.activationRate*100)+'%'],
   ['Tiempo a primer insight',adminMins(s.timeToFirstInsight)],['Tiempo a primera decisión',adminMins(s.timeToFirstDecision)],
   ['Propuestas IA',adminNum(s.ai?.requested)],['Fallos IA',adminNum(s.ai?.failed)],
   ['Evidencia abierta',adminNum(s.evidence?.opened),s.evidence?.rate==null?'sin expuestos todavía':Math.round(s.evidence.rate*100)+'% de '+adminNum(s.evidence.exposed)+' expuestos'],
   ['Mapa estratégico visto',adminNum(s.mapaEstrategico?.viewed)],
   ['Mapa estratégico descargado',adminNum(s.mapaEstrategico?.exportedParticipants),adminNum(s.mapaEstrategico?.exports)+' descargas'],
   ['Estrategia lista',adminNum(s.strategyReady?.ready),s.strategyReady?.rate==null?'sin marcas elegibles':Math.round(s.strategyReady.rate*100)+'% de '+adminNum(s.strategyReady.eligibleBrands)+' marcas'],
   ['Criterio humano sobre IA',s.humanOverride?.rate==null?'—':Math.round(s.humanOverride.rate*100)+'%',s.humanOverride?'de '+adminNum(s.humanOverride.resolved)+' propuestas resueltas':undefined]
  ])+'<p class="hint">Retención D7/D14/D30 y progresión por fase, en Evidencia. No medible en esta build: '+escape((s.unavailable??[]).join(', ')||'—')+'.</p></section>';
  return;
 }
 if(adminView==='estrategas'){
  const {participants}=await api('/api/admin/users');
  body.innerHTML='<section class="admin-panel"><h2>Estrategas de Marca</h2><div class="admin-scroll"><table class="admin-table"><thead><tr>'+
   ADMIN_COLUMNS.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+
   (participants.map(adminRow).join('')||'<tr><td colspan="'+ADMIN_COLUMNS.length+'">Sin Estrategas de Marca todavía.</td></tr>')+
   '</tbody></table></div></section>';
  body.querySelectorAll('[data-admin-status]').forEach(button=>button.addEventListener('click',event=>run(async()=>{
   const suspending=button.dataset.next==='SUSPENDED';
   if(!confirm(suspending?'¿Suspender el acceso de este Estratega de Marca? Sus sesiones activas se cerrarán.':'¿Reactivar el acceso de este Estratega de Marca?'))return;
   await api('/api/admin/access-status',{userId:button.dataset.adminStatus,status:button.dataset.next});
   notice(suspending?'Acceso suspendido. Las sesiones activas se cerraron.':'Acceso reactivado.');
   await renderAdmin();
  },event.currentTarget)));
  return;
 }
 const e=await api('/api/admin/evidence');
 body.innerHTML='<section class="admin-panel"><h2>Evidencia del piloto</h2>'+adminTiles([
  ['Participantes',adminNum(e.sample.participants)],['Intake completo',adminNum(e.sample.intakeComplete)],['Activos',adminNum(e.sample.active)],
  ['Con sesiones',adminNum(e.engagement.participantsWithSessions)],['Recurrentes',adminNum(e.engagement.returningParticipants)],
  ['Marcas reales',adminNum(e.product.realBrands)],['Marcas demo',adminNum(e.product.demoBrands),'excluidas'],
  ['Activados',adminNum(e.product.activated)],['Segunda marca real',adminNum(e.product.participantsWithSecondRealBrand)],
  ['Propuestas IA',adminNum(e.product.ai.requested)],['Fallos IA',adminNum(e.product.ai.failed)],
  ['Comentarios',adminNum(e.feedback.responses)],['Incidencias',adminNum(e.feedback.issues)]
 ])+'<div class="admin-dists">'+adminDist('Perfil profesional',e.segmentation.primaryProfile)+adminDist('País',e.segmentation.country)+
 adminDist('Región',e.segmentation.region)+adminDist('Cohorte',e.segmentation.cohort)+'</div>'+
 '<p><a class="button secondary" href="/api/admin/evidence.csv">Descargar evidencia agregada (CSV)</a></p>'+
 '<p class="hint">Agregados sin datos personales. GA4 es analítica de navegación; esta evidencia interna es la fuente canónica.</p></section>';
}

async function showAdmin(){
 document.body.classList.remove('booting');
 for(const id of ['#gateway','#request-access-view','#login','#workspace','#intake','#privacidad','#terminos'])$(id).hidden=true;
 const {admin}=await api('/api/admin/session').catch(()=>({admin:false}));
 if(!admin){location.replace('/');return;}
 // Administration is its own surface: it must NOT borrow the participant workspace shell, whose
 // sticky header and brand controls belong to a strategist's session, not an operator's.
 $('#admin').hidden=false;document.body.classList.remove('app');document.body.classList.add('admin-mode');setTitle('Administración');
 document.querySelectorAll('[data-admin-view]').forEach(button=>button.addEventListener('click',event=>run(async()=>{
  adminView=button.dataset.adminView;await renderAdmin();
 },event.currentTarget)));
 await renderAdmin();
}
/** Single entry to the product: required intake first, workspace second. Used by every sign-in path. */
async function enterWorkspace(){
 const state=await api('/api/session-state');
 if(isPublicDocument())return;
 if(currentPath()==='/admin')return showAdmin();
 if(state.intakeRequired)return showIntake();
 return authenticated();
}
/** Required intake. The server enforces it; this renders it and keeps the workspace out of reach. */
async function showIntake(){
 document.body.classList.remove('booting');
 for(const id of ['#gateway','#request-access-view','#login','#workspace','#privacidad','#terminos'])$(id).hidden=true;
 $('#intake').hidden=false;setTitle('Tu perfil de Estratega de Marca');
 analytics.sendOnce(PILOT_EVENTS.intakeStarted,{pilot_stage:'intake'});
 try{const me=await api('/api/me');if(me?.email){$('#intake-email').textContent=me.email;$('#intake-identity').hidden=false;}}catch{/* identity panel is a courtesy */}
 $('#intake-form').addEventListener('submit',event=>run(async()=>{
  event.preventDefault();
  if(!$('#intake-privacy').checked||!$('#intake-terms').checked){notice('Acepta la Política de Privacidad y los Términos del piloto para continuar.',true);return;}
  const value=id=>$(id).value.trim();
  const payload={firstName:value('#intake-first'),lastName:value('#intake-last'),country:value('#intake-country'),
   region:value('#intake-region'),city:value('#intake-city'),primaryProfile:$('#intake-profile').value,
   companyOrProject:value('#intake-company')||null,sector:value('#intake-sector')||null,pilotGoal:value('#intake-goal')||null,
   privacyAccepted:true,termsAccepted:true};
  if(!payload.firstName||!payload.lastName||!payload.country||!payload.region||!payload.city||!payload.primaryProfile){
   notice('Completa los campos requeridos para continuar.',true);return;}
  await api('/api/participant',payload);
  analytics.send(PILOT_EVENTS.intakeCompleted,{pilot_stage:'intake_done'});
  $('#intake').hidden=true;await authenticated();
 },event.submitter));
}
async function authenticated() {const directModule=new URL(location.href).searchParams.has('module');document.body.classList.add('app');for(const id of ['#gateway','#request-access-view'])$(id).hidden=true;$('#login').hidden=true;document.body.classList.remove('booting');user=await api('/api/me');$('#workspace').hidden=false;$('#logout').hidden=false;$('#menu').hidden=false;$('#new-brand').hidden=false;$('#mode-badge').hidden=false;await loadBrands(new URL(location.href).searchParams.get('brand'));if(!directModule&&context)await showHome();}
/**
 * Reloads the brand context and repaints. Deliberately ONE request: this runs after every mutation,
 * so anything added here delays the whole workspace. Market status is auxiliary rail information and
 * is fetched WITHOUT blocking the render, repainting only the rail when it arrives.
 */
async function refresh(){
 if(brandId)context=await api(`/api/context?brandId=${encodeURIComponent(brandId)}`);else context=null;
 render();
 if(brandId)ensureCompetitiveRejections().then(loaded=>{if(loaded&&context)renderContext();});
}
function render() {
  $('#decision').before($('#brando-suggestion'));
  setNavActive();$('#decision').dataset.view='decision';updateShell();if(!panels.strategy){panels.strategy=true;applyPanels();}
  document.querySelectorAll('[data-module]').forEach(b=>{if(b.dataset.module===selected)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  if(!context){analytics.sendOnce(PILOT_EVENTS.onboardingStarted,{pilot_stage:'no_brand'});$('#decision').innerHTML='<section class="empty-state" aria-labelledby="onboarding-title"><p class="eyebrow">Tu punto de partida</p><h2 id="onboarding-title">Construye tu primera decisión estratégica.</h2><p>Primero qué quieres construir y dónde competirás. Después, a quién sirves y cómo quieres ser elegido. Cada decisión conservará tu criterio y su historia.</p><ol><li>Abre «Nueva marca» para crear tu espacio.</li><li>Define tu objetivo estratégico.</li><li>Compara opciones y decide con tu criterio.</li></ol><p><strong>La IA propone. Tú decides. Brandopolis recuerda.</strong></p></section>';$('#context').innerHTML='';return;}
  history.replaceState(null,'',`/?brand=${encodeURIComponent(brandId)}&module=${encodeURIComponent(selected)}`);setTitle(labels[selected]);
  const q=context.questions.find(q=>q.module===selected);
  if(!q){renderMissingSection();return;}
  const d=context.decisions.find(d=>d.questionId===q.id),v=context.versions.find(v=>v.id===d?.activeVersionId),reviews=context.reviews.filter(r=>r.downstreamDecisionId===d?.id&&r.status!=='COMPLETED');
  const pending=context.impacts.some(i=>i.status==='IMPACT_PENDING');
  const hasCustomer=context.decisions.some(d=>context.questions.find(q=>q.id===d.questionId)?.module==='Primary Customer');
  const locked=selected==='Positioning'&&!hasCustomer;
  const editButton=`<button id="edit" ${pending||locked?'disabled':''}>${reviews.length?'Iniciar revisión':v?'Preparar nueva versión':'Preparar decisión'}</button>`;
  // Review card: the signature flow is shown as words, never as automatic rewriting.
  const warn=reviews.length?`<section class="review" aria-labelledby="review-title"><h3 id="review-title">Tu estrategia ha evolucionado.</h3><p>Una decisión conectada cambió. Esta decisión no se modificará hasta que una persona complete la revisión.</p>${reviewUpdatesHtml(reviewUpdates(context,d))}<ol class="impact-steps" aria-label="Recorrido de la revisión"><li>Decisión que cambió</li><li>${reviews.some(r=>r.dependencyType==='HARD')?'Dependencia estricta':'Dependencia sugerida'}</li><li>Decisión afectada</li><li>Requiere revisión</li><li>Revisión</li></ol>${impactVisible?reviews.map(r=>impactPair(r,q,v)+`<p class="impact-reason">${escape(impactReason(r))}</p>`).join(''):''}<div class="actions">${draft?'':editButton}<button id="show-impact" class="secondary" aria-expanded="${impactVisible}">Ver impacto</button></div></section>`:'';
  const versions=context.versions.filter(v=>v.decisionId===d?.id).sort((a,b)=>b.sequence-a.sequence);
  const why=user.learningMoments?.[q.module]?.why;
  const reviewChoices='<h3 id="review-choice-title" tabindex="-1">Qué puedes hacer</h3><div class="review-options" role="group" aria-label="Opciones de revisión"><button type="button" id="keep" class="option-card" aria-pressed="false" aria-label="Mantener sin cambios" aria-describedby="keep-hint"><strong>Mantener sin cambios</strong><span id="keep-hint">La decisión sigue siendo válida con el nuevo contexto.</span></button><button type="button" id="modify" class="option-card" aria-pressed="false" aria-label="Modificar" aria-describedby="modify-hint"><strong>Modificar</strong><span id="modify-hint">Ajustas la decisión a lo que cambió.</span></button></div><p class="hint" id="review-choice-hint">Elige una opción para confirmar la revisión. Editar tu decisión cuenta como «Modificar».</p>';
  const number=String(Object.keys(labels).indexOf(selected)+1).padStart(2,'0');
  $('#decision').innerHTML=`<p class="eyebrow decision-breadcrumb">Estrategia / <strong>${number} ${escape(labels[selected])}</strong></p><h2 class="decision-title">${escape(labels[selected])}</h2><p class="decision-question">${escape(questionText[q.module]??q.text)}</p>${questionHelp[q.module]?`<p class="decision-help">${escape(questionHelp[q.module])}</p>`:''}<p class="decision-meta">${stateBadge(v,reviews.length>0)}${v?`<span>Última actualización: ${escape(fmt(v.approvedAt))}</span><span>Decidido por: ${v.actorUserId===user.userId?'Tú':'Persona autorizada'}</span>`:''}</p>${declaredContextHtml(context,q.module)}${decisionIntelligenceHtml(context,q.module)}${why?`<p class="why"><span class="label">Por qué es importante:</span> ${escape(why)}</p>`:''}${pending?'<section class="review"><h3>Impacto pendiente</h3><p>La decisión se guardó. Falta calcular su efecto antes de otro cambio.</p><button id="retry-impact">Reintentar impacto</button></section>':''}${warn}${draft?`<form id="decision-form" class="decision-form">${draft.reviewToken?reviewChoices:''}<label for="option">Tu decisión</label>${decisionGuide[q.module]?`<p class="hint" id="option-guide">${escape(decisionGuide[q.module])}</p>`:''}<textarea id="option" name="selectedOption" required maxlength="12000" aria-describedby="${decisionGuide[q.module]?'option-guide ':''}form-hint">${escape(draft.selectedOption)}</textarea><p class="input-assist"><button type="button" id="possibilities" class="secondary">Ayúdame a generar posibilidades</button><span class="hint">Opcional. Escribe tu propia respuesta o pide posibilidades y decide cuál incorporar.</span></p><div id="possibilities-activity" class="local-activity" role="status" aria-live="polite" aria-atomic="true" hidden><span class="local-activity-mark" aria-hidden="true">✦</span><div><strong class="local-activity-title"></strong><p class="local-activity-detail"></p></div></div><label for="rationale">¿Por qué eliges esta opción?</label><textarea id="rationale" name="rationale" required ${draft.brandoReview?'minlength="10"':''} maxlength="12000">${escape(draft.rationale)}</textarea><div class="form-footer"><p class="hint" id="form-hint">${draft.reviewToken?'Nada se reescribe sin tu confirmación: «Confirmar revisión» registra una nueva versión y conserva las anteriores.':'Tu elección y tu criterio dan forma a la estrategia. Aprobar crea una versión nueva y conserva las anteriores.'}</p><div class="actions"><button id="cancel" type="button" class="secondary">Cancelar</button><button type="submit" id="submit-decision" ${draft.reviewToken?'disabled aria-describedby="review-choice-hint"':''}>${draft.reviewToken?'Confirmar revisión':draft.brandoReview?'Confirmar cambio':'Aprobar decisión'}</button></div></div></form>`:`${v?`<p class="current">${escape(v.selectedOption)}</p><p class="rationale"><span class="label">Por qué:</span> ${escape(v.rationale)}</p>`:`<p class="empty">${locked?'Aprueba primero tu cliente prioritario.':'Todavía no hay una decisión aprobada. Define tu elección y explica tu criterio.'}</p>`}`}<div class="actions">${!draft&&!reviews.length?editButton:''}<button id="reload" class="tertiary">Revisar versión más reciente</button>${sessionStorage.getItem(`draft:${user.userId}:${brandId}:${selected}`)?'<button id="restore-draft" class="tertiary">Ver borrador conservado</button>':''}</div>`;
  composeDecision(q,d,v,reviews);
  mountRecommendation(q,d,v,reviews,pending||locked);
  mountLearningMoment(q);
  $('#decision').insertAdjacentHTML('beforeend',historyHtml(versions,d));
  decisionTabs($('#decision'),draft?'overview':activeDecisionTab,key=>{activeDecisionTab=key;if(key==='knowledge')recordEvidenceOpened();},versions.length);
  renderContext();
  $('#edit')?.addEventListener('click',event=>run(async()=>{
    let receipt;
    if(reviews.length){impactVisible=true;await api('/api/impacts/shown',{brandId});receipt=await api('/api/reviews/start',{brandId,decisionId:d.id});}
    // Capture the version the human actually saw; never replace it automatically during save.
    activeDecisionTab='overview';draft={questionId:q.id,expectedActiveVersion:v?.id??null,selectedOption:v?.selectedOption??'',rationale:'',idempotencyKey:crypto.randomUUID(),reviewToken:receipt?.reviewToken};
    await api('/api/questions/prepare',{brandId,questionId:q.id,expectedActiveVersion:draft.expectedActiveVersion});
    await refresh();(receipt?$('#review-brief-title'):$('#option'))?.focus();
  },event.currentTarget));
  $('#decision-form')?.addEventListener('input',event=>{draft.selectedOption=$('#option').value;draft.rationale=$('#rationale').value;if(event.target.id==='option'&&$('#modify')&&v&&$('#option').value!==v.selectedOption)choose('#modify',false);});
  $('#decision-form')?.addEventListener('submit',event=>{event.preventDefault();run(async()=>{
    const command={brandId,questionId:draft.questionId,sourceRecommendationId:draft.sourceRecommendationId??null,selectedOption:draft.selectedOption,rationale:draft.rationale,expectedActiveVersion:draft.expectedActiveVersion,idempotencyKey:draft.idempotencyKey,actorUserId:user.userId};
    const result=await api('/api/decisions/commit',{command,reviewToken:draft.reviewToken,...(draft.brandoReview?{brandoReview:draft.brandoReview}:{})});draft=null;await refresh();
    if((context?.versions?.length??0)===1)analytics.sendOnce(PILOT_EVENTS.firstDecision,{pilot_stage:'activated'});
    analytics.send(PILOT_EVENTS.phaseCompleted,{pilot_stage:'phase_done'});
    showPhaseHandoff();notice(result.impactPending?'Decisión guardada. El impacto está pendiente; reinténtalo.':'Decisión aprobada. Su versión y su historial quedaron guardados.');
  },event.submitter);});
  function choose(id,focus=true){draft.reviewChoice=id;for(const b of ['#keep','#modify'])$(b).setAttribute('aria-pressed',String(b===id));$('#submit-decision').disabled=false;if(id==='#keep'){draft.selectedOption=v.selectedOption;$('#option').value=v.selectedOption;$('#option').readOnly=true;if(focus)$('#rationale').focus();}else{$('#option').readOnly=false;if(focus)$('#option').focus();}}
  $('#keep')?.addEventListener('click',()=>choose('#keep',false));
  $('#modify')?.addEventListener('click',()=>choose('#modify',false));
  if(draft?.reviewToken&&$('#modify')){const choice=draft.reviewChoice??(draft.brandoReview?'#modify':null);if(choice)choose(choice,false);}
  // Optional assistance from the initial input, in every strategic phase. The participant's own text
  // is preserved in this tab first, so asking for possibilities can never lose what they wrote.
  $('#possibilities')?.addEventListener('click',event=>run(async()=>{
    preserveDraft();
    const cta=event.currentTarget,original=cta.textContent;
    cta.textContent='Generando posibilidades…';
    setActivityMirror($('#possibilities-activity'));
    try{
      const generated=await generatePossibilities(q.id,{locked:pending||locked,stage:'initial_input',fromDraft:true});
      if(generated)notice('Compara las posibilidades y decide cuál incorporar. Tu borrador quedó conservado en esta pestaña; nada se aprueba sin ti.');
    }finally{
      // On success the form is replaced by the options, so this only matters when it is still here.
      setActivityMirror(null);
      if(cta.isConnected)cta.textContent=original;
    }
  },event.currentTarget));
  $('#cancel')?.addEventListener('click',()=>{draft=null;render();focusView($('#edit')??undefined);});
  $('#reload').addEventListener('click',event=>run(async()=>{if(draft)sessionStorage.setItem(`draft:${user.userId}:${brandId}:${selected}`,JSON.stringify(draft));draft=null;await refresh();notice('Borrador conservado en esta pestaña. Contexto recargado. Revisa la versión vigente antes de volver a editar.');},event.currentTarget));
  $('#restore-draft')?.addEventListener('click',()=>{const saved=JSON.parse(sessionStorage.getItem(`draft:${user.userId}:${brandId}:${selected}`));notice(`Borrador conservado: ${saved.selectedOption} — ${saved.rationale}`);});
  $('#show-impact')?.addEventListener('click',event=>run(async()=>{impactVisible=true;render();await api('/api/impacts/shown',{brandId});focusView($('.impact-pair'));},event.currentTarget));
  $('#retry-impact')?.addEventListener('click',event=>run(async()=>{const result=await api('/api/impacts/retry',{brandId});await refresh();notice(result.pending?'El impacto sigue pendiente.':'Impacto calculado.',result.pending);},event.currentTarget));
}
$('#login-form').addEventListener('submit',event=>{event.preventDefault();run(async()=>{await api('/api/session',{token:$('#token').value});$('#token').value='';await enterWorkspace();notice('Workspace disponible.');},event.submitter);});
$('#logout').addEventListener('click',event=>run(async()=>{resetBrando();await api('/api/logout',{});location.reload();},event.currentTarget));
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
 // Declared geography is context for Market Arena (ADR-0025): store it before the brand loads, whatever path follows.
 await saveBrandGeography(brand.id);

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
 // New brands start the journey at its first section (ADR-0021); existing brands are never redirected.
 selected='Strategic Objective';
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
   notice('Marca creada. Tu contexto inicial quedó guardado. Comienza con tu objetivo estratégico.');
  }
 }
},event.submitter);});
bindDocumentSelection('#brand-documents','#brand-document-selection');
$('#new-brand').addEventListener('click',()=>{$('#brand-dialog').showModal();$('#brand-name').focus();});
$('#cancel-brand').addEventListener('click',()=>$('#brand-dialog').close());
$('#brand-dialog').addEventListener('close',()=>$('#new-brand').focus());
trapFocus($('#brand-dialog'));
$('#brands').addEventListener('change',event=>run(async()=>{preserveDraft();resetBrando();brandId=event.target.value;activeDecisionTab='overview';draft=null;impactVisible=false;await refresh();notice('Marca activa actualizada. Su contexto permanece separado.');}));
// Single entry point to a Decision: keeps drafts, resets local tab and impact disclosure, then renders.
function openModule(module,focus=true){closeRailDrawer(false);preserveDraft();selected=module;activeDecisionTab='overview';draft=null;impactVisible=false;render();if(focus)focusView();}
document.querySelectorAll('[data-module]').forEach(button=>button.addEventListener('click',()=>{const fromDrawer=$('#journey').classList.contains('open');closeMenu(false);openModule(button.dataset.module,fromDrawer);}));

// History is strategic evolution: version, date, actor, rationale and the superseded relation.
function historyHtml(versions,decision){return historyView(versions,decision,user.userId);}
/** An existing brand without a journey section: one explicit action adds it; nothing is created on read. */
function renderMissingSection(){
 const missing=[...document.querySelectorAll('#journey [data-module]')].map(b=>b.dataset.module).filter(m=>!context.questions.some(q=>q.module===m)).map(m=>labels[m]??m);
 $('#decision').innerHTML=strategicSectionsHtml(labels[selected]??selected,missing);
 renderContext();
 $('#add-strategic-sections').addEventListener('click',event=>run(async()=>{
  const result=await api('/api/brands/strategic-sections',{brandId});
  await refresh();focusView();
  notice(result.added.length?'Secciones agregadas. Ninguna decisión cambió.':'Estas secciones ya estaban en tu recorrido.');
 },event.currentTarget));
}
function impactPair(review,question,version){return impactView(context,review,question,version);}
function impactReason(review){
 const trigger=context.versions.find(v=>v.id===review.triggerVersionId),decision=context.decisions.find(d=>d.id===trigger?.decisionId),question=context.questions.find(q=>q.id===decision?.questionId);
 const label=labels[question?.module]??'Decisión conectada';
 const change=trigger&&trigger.previousVersionId===null?`${label} se registró por primera vez después de esta decisión.`:`${label} cambió: versión ${context.versions.find(v=>v.id===trigger?.previousVersionId)?.sequence??'anterior'} → ${trigger?.sequence??'vigente'}.`;
 return `${change} ${review.dependencyType==='HARD'?'Una dependencia estricta requiere confirmar que tu decisión sigue alineada.':'Revisa si este cambio afecta tu decisión.'}`;
}
function preserveDraft(){if(draft&&brandId)sessionStorage.setItem(`draft:${user.userId}:${brandId}:${selected}`,JSON.stringify(draft));}
const narrow=matchMedia('(max-width:1279px)');
function drawerBackground(inert){for(const selector of ['#brando-card','#brando-suggestion','header','.skip','.workspace-head','#create-brand','#decision','#context','footer'])$(selector).inert=inert;}
function closeMenu(returnFocus=true){const nav=$('#journey'),wasOpen=nav.classList.contains('open');nav.classList.remove('open');nav.removeAttribute('role');nav.removeAttribute('aria-modal');$('#nav-backdrop').hidden=true;$('#menu').setAttribute('aria-expanded','false');drawerBackground(false);nav.inert=narrow.matches;if(wasOpen&&returnFocus&&narrow.matches)$('#menu').focus();}
/** Declared strategic market for a brand the participant just created. Optional, never inferred. */
async function saveBrandGeography(id){
 const influence=$('#brand-geography')?.value??'';
 if(!influence)return;
 const market=$('#brand-market')?.value.trim()||null;
 try{await api('/api/brands/geography',{brandId:id,geographicInfluence:influence,primaryMarket:market});}
 catch{/* geography is context, never a reason to lose a created brand */}
}
$('#demo-create')?.addEventListener('click',()=>$('#new-brand').click());
$('#menu').addEventListener('click',()=>{closeRailDrawer(false);$('#journey').inert=false;$('#journey').classList.add('open');$('#journey').setAttribute('role','dialog');$('#journey').setAttribute('aria-modal','true');$('#nav-backdrop').hidden=false;$('#menu').setAttribute('aria-expanded','true');drawerBackground(true);$('#close-menu').focus();});
narrow.addEventListener('change',()=>closeMenu(false));$('#journey').inert=narrow.matches;
$('#close-menu').addEventListener('click',closeMenu);$('#nav-backdrop').addEventListener('click',()=>{if(railDrawerOpen)closeRailDrawer();else closeMenu();});
trapFocus($('#rail-panel'),()=>railDrawerOpen&&!desktopRail.matches);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#journey').classList.contains('open'))closeMenu();});
trapFocus($('#journey'),()=>$('#journey').classList.contains('open'));
$('#blueprint').addEventListener('click',()=>run(showBlueprint));
$('#help').addEventListener('click',()=>run(showHelp));
$('#brand-settings').addEventListener('click',()=>run(showBrandSettings));
$('#home').addEventListener('click',()=>run(showHome));
// Public views of the single page: gateway (/), access (/login) and request access (/request-access).
function showPublicView(){
 const path=location.pathname;
 const legalPath=path.replace(/\/$/,'')||'/';
 const isLegal=['/privacidad','/terminos'].includes(legalPath);
 // Any public document takes the surface over: no gateway, no access card competing with it.
 const isDocument=isLegal||legalPath==='/gracias-encuesta';
 $('#privacidad').hidden=legalPath!=='/privacidad';$('#terminos').hidden=legalPath!=='/terminos';
 $('#gracias-encuesta').hidden=legalPath!=='/gracias-encuesta';
 $('#gateway').hidden=path!=='/'||isDocument;$('#login').hidden=path==='/request-access'||isDocument;$('#request-access-view').hidden=path!=='/request-access';
 // On the gateway the access card is a section of the page, not a second top-level heading.
 if(path==='/')$('#login-title').setAttribute('aria-level','2');else $('#login-title').removeAttribute('aria-level');
 setTitle(legalPath==='/privacidad'?'Política de Privacidad':legalPath==='/terminos'?'Términos del piloto':legalPath==='/gracias-encuesta'?'Gracias por compartir tu experiencia':path==='/login'?'Entrar al piloto':path==='/request-access'?'Acceso al piloto':'');
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
 pilotMode=mode.mode==='PILOT';liveAi=!pilotMode&&mode.liveAi===true;aiNotice=mode.aiNotice??null;
 // Local live AI (ADR-0026): say so plainly; the default DEMO keeps its deterministic wording.
 if(liveAi){$('#mode-badge').textContent='DEMO LOCAL · IA EN VIVO';document.body.dataset.liveAi='true';}
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
  $('#login-form').hidden=true;$('#mode-badge').textContent='PILOT';document.body.dataset.mode='PILOT';
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
 if(state.authenticated){
  // Public documents first: a participant who still owes intake must still be able to read the very
  // policy and terms they are being asked to accept. Then /admin, then intake, then the workspace.
  if(isPublicDocument())document.body.classList.remove('booting');
  else if(currentPath()==='/admin')await showAdmin();
  else if(state.intakeRequired)await showIntake();
  else await authenticated();
 }
 else document.body.classList.remove('booting');
}).catch(error=>{if(error.code!=='UNAUTHORIZED')notice(error.message,true);}).finally(()=>document.body.classList.remove('booting'));
$('#brand-context').addEventListener('click',()=>run(showBrandContext));
$('#competitive-context').addEventListener('click',()=>run(showCompetitiveContext));
// Entering a non-Decision view: title, active navigation, drawer closed, draft preserved. False without a brand.
function enterView(selector,title){closeRailDrawer(false);$('#decision').before($('#brando-suggestion'));setTitle(title);setNavActive(selector);syncBrandoPresentation();closeMenu(false);preserveDraft();draft=null;return !!brandId;}


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
     <ul>${limitations||'<li>Requiere revisión.</li>'}</ul>
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
 competitiveCompletionReported=null;

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
       :['Hallazgo asistido por IA; requiere la revisión del Estratega de Marca.'],
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
 competitiveRejectionsBrandId=brandId;

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
      <span class="badge">Aporte del Estratega de Marca</span>
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

 // Canonical completion is the HUMAN-reviewed state, not "the AI finished generating": research must
 // have produced candidates AND the participant must have resolved every one of them, by
 // incorporating it into the Brand Context or explicitly discarding it. While one stays unresolved
 // the workflow is incomplete and no hand-off is shown.
 const reviewComplete=Boolean(activeResult?.findings?.length)&&pendingFindings.length===0;

 if(reviewComplete){
  if(competitiveCompletionReported!==brandId){
   competitiveCompletionReported=brandId;
   analytics.send(PILOT_EVENTS.phaseCompleted,{pilot_stage:'competitive_review'});
  }
  showPhaseHandoff({
   eyebrow:'Contexto competitivo revisado',
   done:'Ya incorporaste las señales que quieres considerar.',
   complete:'Ya incorporaste las señales que quieres considerar. Además, cada decisión estratégica de esta marca ya está tomada.',
   secondaryLabel:'Revisar contexto',
   secondaryAction:showBrandContext
  });
 }
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
 const groups=[['Aprendizajes aceptados',context.learnings.filter(l=>l.status==='ACCEPTED')],['Aportaciones del Estratega de Marca',context.userInputs],['Hipótesis por validar',context.hypotheses],['Evidencia registrada',context.evidence],['Preguntas abiertas',context.openQuestions.filter(q=>q.status==='OPEN')]];
 $('#decision').innerHTML=`<p class="eyebrow">Contexto estratégico</p><h2>¿Qué sabes y qué falta comprobar?</h2><ul class="kpis" aria-label="Memoria de marca"><li><strong>${context.evidence.length}</strong><span>Fuentes registradas</span></li><li><strong>${context.hypotheses.length}</strong><span>Hipótesis explícitas</span></li><li><strong>${context.userInputs.length}</strong><span>Aportaciones del Estratega de Marca</span></li><li><strong>${context.learnings.filter(l=>l.status==='ACCEPTED').length}</strong><span>Aprendizajes aceptados</span></li></ul><p>Tus aportaciones orientan la estrategia. Las hipótesis siguen sin validar hasta que exista una revisión respaldada.</p>${currentStrategySummary()}${groups.map(([title,rows],index)=>`<section class="memory-group memory-${index}"><h3>${title}</h3>${rows.length?rows.map(r=>`<p>${escape(r.statement??r.claim??r.text??r.interpretation)}</p>${r.source?`<p class="hint">${escape(r.source)} · ${escape(r.sourceDate)} · ${escape(r.provenance)}<br>Limitaciones: ${escape(r.limitations.join('; ')||'No declaradas')}</p>`:''}`).join(''):'<p class="hint">Aún no hay registros.</p>'}</section>`).join('')}<section class="add-context" aria-labelledby="add-context-title"><h3 id="add-context-title">Añadir contexto</h3><div class="context-documents"><p class="eyebrow">Documentos de la marca</p><h4>Agrega fuentes que Brandopolis deberá considerar</h4><p class="hint">Puedes incorporar varios documentos. Se conservarán por separado y todavía no modificarán el Brand Context.</p>${storedDocumentsHtml(sourceDocuments)}<label class="document-picker" for="context-documents"><span aria-hidden="true">＋</span><span>Agregar documentos</span></label><input id="context-documents" class="document-input" type="file" multiple accept=".pdf,.docx,.pptx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain"><div id="context-document-selection" class="document-selection" aria-live="polite"></div><div class="document-actions"><button id="upload-context-documents" type="button" class="secondary">Guardar documentos</button><button id="analyze-context-documents" type="button" class="secondary"${sourceDocuments.length?'':' disabled'}>Procesar documentos</button><button id="generate-document-claims" type="button"${sourceDocuments.some(document=>document.status==='EXTRACTED')?'':' disabled'}>Generar hallazgos</button></div><div id="document-claims-progress" class="document-progress" hidden aria-live="polite"><div class="document-progress-head"><strong id="document-progress-title">Preparando análisis…</strong><span id="document-progress-count">0%</span></div><div class="document-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span id="document-progress-fill"></span></div><p id="document-progress-detail" class="hint">Preparando documentos.</p></div><p class="hint">PDF, DOCX, PPTX o TXT · máximo 20 MB por archivo.</p><div class="document-findings"><p class="eyebrow">Hallazgos documentales</p><h4>Lo que Brandopolis detectó para tu revisión</h4><p class="hint">Estos hallazgos todavía no forman parte del Brand Context. Tú decidirás cuáles incorporar.</p><div id="document-claims-results">${documentClaimsHtml(documentClaims,sourceDocuments)}</div></div></div><div class="context-entry-divider"><span>o registra contexto manualmente</span></div><form id="capture-context"><label for="context-kind">Tipo de aportación</label><select id="context-kind"><option value="user-input">Aportación del Estratega de Marca</option><option value="hypothesis">Hipótesis por validar</option><option value="open-question">Pregunta abierta</option><option value="evidence">Evidencia</option></select><label for="context-statement">Contenido</label><textarea id="context-statement" maxlength="6000" required></textarea><fieldset id="evidence-fields" hidden><legend>Evaluación del Estratega de Marca</legend><label for="evidence-source">Fuente</label><input id="evidence-source" maxlength="1000"><label for="evidence-date">Fecha de la fuente</label><input id="evidence-date" type="date"><label for="evidence-provenance">Cómo se obtuvo</label><input id="evidence-provenance" maxlength="1000"><label for="evidence-quality">Calidad de la fuente</label><select id="evidence-quality"><option value="LOW">Baja</option><option value="MEDIUM">Media</option><option value="HIGH">Alta</option></select><label for="evidence-relevance">Relevancia</label><select id="evidence-relevance"><option value="INDIRECT">Indirecta</option><option value="DIRECT">Directa</option></select><label for="evidence-freshness">Vigencia</label><select id="evidence-freshness"><option value="HISTORICAL">Histórica</option><option value="AGING">Envejeciendo</option><option value="CURRENT">Actual</option></select><label for="evidence-limitations">Limitaciones</label><input id="evidence-limitations" maxlength="1000"><label><input id="evidence-external" type="checkbox" checked> Fuente externa</label><p class="hint">Tu evaluación queda registrada. El sistema no certifica la veracidad de la fuente.</p></fieldset><button type="submit">Guardar contexto</button></form></section>`;
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
   if(progressDetail)progressDetail.textContent=`${totalClaims} hallazgo${totalClaims===1?'':'s'} listo${totalClaims===1?'':'s'} para la revisión del Estratega de Marca.`;

   activityDone(
    'Hallazgos preparados',
    `${totalClaims} hallazgo${totalClaims===1?'':'s'} listo${totalClaims===1?'':'s'} para la revisión del Estratega de Marca.`
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
/** Shown whenever generation cannot produce options. Never carries provider or transport detail. */
const POSSIBILITIES_FAILED='No pudimos generar posibilidades en este momento. Puedes continuar con tu propia respuesta o intentarlo nuevamente.';
const POSSIBILITIES_UNAVAILABLE='Las propuestas no están disponibles para esta decisión ahora mismo. Puedes continuar con tu propia respuesta.';
/**
 * Failures api() already resolves on its own. Its messages are written for participants, never taken
 * from the provider, and UNAUTHORIZED also returns the page to sign-in — so these must keep
 * propagating. Swallowing them would leave an expired session stranded on a dead screen, and would
 * replace an accurate message ("the daily AI limit was reached") with a useless invitation to retry.
 */
const GENERATION_ERRORS_HANDLED_BY_API=new Set([
 'UNAUTHORIZED','FORBIDDEN','CONFLICT','NOT_FOUND','INVALID','RATE_LIMITED','UNAVAILABLE','AI_CAP_REACHED','AI_CONSENT_REQUIRED'
]);

/**
 * The one and only generation path. Both the assistance panel and the initial-input CTA call this,
 * so there is a single request, a single loading state and a single failure message.
 *
 * It never approves anything: it asks the engine for options and re-renders so the human can compare
 * them. engine.analyze(token,brandId,questionId) takes no free-text seed, so a draft in progress
 * cannot be fed to the provider; proposals are shaped by the brand's registered context instead. The
 * typed draft is therefore preserved, never sent and never overwritten without the participant.
 */
async function generatePossibilities(questionId,{locked=false,stage='options',fromDraft=false,afterConsent=false}={}){
 if(locked){notice(POSSIBILITIES_UNAVAILABLE,true,'assistance');return false;}
 analytics.send(PILOT_EVENTS.possibilitiesRequested,{pilot_stage:stage});
 activityStart(
  pilotMode?'Brandopolis está preparando opciones…':'Preparando opciones DEMO…',
  pilotMode?'Analizando tu contexto estratégico.':'Preparando alternativas de demostración.'
 );
 let result;
 try{
  result=await api('/api/recommendations/generate',{brandId,questionId});
 }catch(error){
  activityFail();
  // Ask for consent once, then resume this same request. afterConsent stops a second prompt.
  if(error.code==='AI_CONSENT_REQUIRED'&&aiNotice&&!afterConsent){showAiNotice(questionId,{locked,stage,fromDraft});return false;}
  if(GENERATION_ERRORS_HANDLED_BY_API.has(error.code))throw error;
  // Anything left is an unmapped provider or transport failure. It gets the generation-specific
  // message, so nothing raw reaches a participant and nothing ever fails silently.
  notice(POSSIBILITIES_FAILED,true,'assistance');
  return false;
 }
 if(result.error){
  activityFail();
  notice(POSSIBILITIES_FAILED,true,'assistance');
  return false;
 }
 activityStep('Opciones listas.','Actualizando tu espacio estratégico…');
 // The comparison surface exists only outside the draft form. Release the draft — already preserved
 // in this tab — so the options render with Incorporar/Modificar/Descartar on every one of them.
 if(fromDraft)draft=null;
 // «Opciones» is a tab panel: without selecting it the options would be generated into a hidden
 // panel. Requesting possibilities must always land on the possibilities, on every viewport.
 activeDecisionTab='recommendation';
 await refresh();
 activityDone(
  pilotMode?'Opciones preparadas':'Opciones DEMO preparadas',
  'Ya puedes compararlas antes de decidir.'
 );
 if(fromDraft)revealRecommendation();
 return true;
}

/** Brings the freshly generated options into view without yanking the page if they already are. */
function revealRecommendation(){
 const panel=$('#decision')?.querySelector('.recommendation');
 if(!panel)return;
 const box=panel.getBoundingClientRect();
 if(box.top>=0&&box.top<=window.innerHeight*0.6)return;
 panel.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
}
function mountRecommendation(q,d,v,reviews,locked){
 if(draft)return;
 const facts=context.evidence,assumptions=context.hypotheses.filter(h=>h.status!=='REJECTED');
 $('#decision').insertAdjacentHTML('beforeend',`<details class="knowledge" open><summary>Lo que sabemos y lo que suponemos</summary><div class="knowledge-grid"><section class="evidence-panel"><p class="eyebrow">Fuentes y observaciones</p><h3>Evidencia registrada</h3>${facts.map(e=>`<p>${escape(e.claim)}<br><span class="hint">${escape(e.source)} · ${escape(e.sourceDate)}. Límites: ${escape(e.limitations.join('; ')||'No declarados')}</span></p>`).join('')||'<p class="hint">Sin evidencia registrada. No confundas una propuesta con un hecho.</p>'}</section><section class="hypothesis-panel"><p class="eyebrow">Supuestos por comprobar</p><h3>Hipótesis explícitas</h3>${assumptions.map(h=>`<p>${escape(h.statement)}<br><span class="badge warn">${h.status==='SUPPORTED'?'Con soporte registrado':'Por validar'}</span></p>`).join('')||'<p class="hint">Aún no declaras hipótesis para esta marca.</p>'}</section></div><p class="hint">Este contexto de marca no implica que cada fuente respalde la propuesta.</p></details>`);
 const row=context.recommendations?.find(r=>r.questionId===q.id&&r.resolution==='GENERATED'),rec=row?.payload,analysis=context.analyses?.find(a=>a.recommendationId===rec?.id);
 const list=rows=>`<ul>${rows.map(text=>`<li>${escape(text)}</li>`).join('')}</ul>`;
 // Scopes a discard to this proposal; a newly generated proposal starts with a clean slate.
 const discardKey=optionId=>`${rec?.id??'none'}:${optionId}`;
 $('#decision').insertAdjacentHTML('beforeend',`<section class="recommendation" aria-label="Propuesta de asistencia"><p class="eyebrow">Asistencia estratégica · ${pilotMode?'Piloto':liveAi?'DEMO local · IA en vivo':'DEMO'}</p><p class="hint">${liveAi?'Las consultas explícitas de IA se envían al proveedor configurado. Revisa cada propuesta con tu criterio; no es evidencia de mercado.':pilotMode?'El contexto de esta marca se comparte con el proveedor IA configurado al solicitar una propuesta. Puede no estar disponible; siempre puedes decidir con tu propio criterio. No incluyas secretos ni datos personales innecesarios.':'Opciones fijas de demostración. No son análisis de IA en vivo ni evidencia de mercado.'}</p><button id="generate-recommendation" class="secondary" ${locked?'disabled':''}>Ayúdame a generar posibilidades</button><p class="hint">Opcional. Tu propia respuesta siempre es el punto de partida: la IA sólo propone posibilidades que tú decides.</p>${rec?`<h3>Compara antes de decidir</h3><span class="badge warn">Sin validar · requiere tu revisión</span>${rec.options.map(o=>`<article class="option ${o.id===rec.recommendedOptionId?'is-proposed':''} ${discardedOptions.has(discardKey(o.id))?'is-discarded':''}"><h4>${escape(o.label)}${o.id===rec.recommendedOptionId?(pilotMode?' · propuesta IA':' · propuesta DEMO'):''}</h4><p>${escape(o.rationale)}</p>${list(o.tradeoffs)}<div class="option-actions">${discardedOptions.has(discardKey(o.id))?`<span class="badge muted">Descartada</span><button type="button" class="tertiary" data-option-restore="${escape(o.id)}">Reconsiderar</button>`:`<button type="button" class="secondary" data-option-take="${escape(o.id)}">Incorporar</button><button type="button" class="secondary" data-option-edit="${escape(o.id)}">Modificar</button><button type="button" class="tertiary" data-option-drop="${escape(o.id)}">Descartar</button>`}</div></article>`).join('')}<p>${escape(rec.rationale)}</p><h4>Renuncias y condiciones de fallo</h4>${list([...rec.tradeoffs,...rec.failureConditions])}<h4>Preguntas abiertas</h4>${list(rec.openQuestions)}<p class="hint">Evidencias: ${rec.evidenceReferences.length}. Hipótesis utilizadas: ${rec.hypothesesUsed.length}. Ámbitos: ${escape(rec.affectedDomains.map(x=>labels[x]??x).join(', '))}.</p><details><summary>Evaluación y límites</summary>${list(analysis?.evaluation?.issues.map(i=>i.reason)??[])}</details><div class="human-choice" role="group" aria-labelledby="human-choice-title"><p class="eyebrow" id="human-choice-title">Decisión del Estratega de Marca</p><p class="hint">La propuesta no cambia tu estrategia. Úsala o ajústala como punto de partida, o recházala con un motivo.</p><div class="actions">${rec.recommendedOptionId?'<button id="use-recommendation" class="secondary">Usar propuesta sugerida</button>':''}<button id="modify-recommendation" class="secondary">${rec.recommendedOptionId?'Modificar propuesta':'Construir mi decisión'}</button></div><form id="reject-recommendation"><label for="reject-reason">Motivo para rechazar</label><div class="reject-row"><input id="reject-reason" maxlength="1000" required><button class="secondary" type="submit">Rechazar recomendación</button></div></form></div>`:''}</section>`);
 $('#generate-recommendation').addEventListener('click',event=>run(
  ()=>generatePossibilities(q.id,{locked,stage:'options'}),
  event.currentTarget
 ));
 let chosenOptionId=null;
 const prepare=async(edit)=>{let receipt;if(reviews.length)receipt=await api('/api/reviews/start',{brandId,decisionId:d.id});activeDecisionTab='overview';draft={questionId:q.id,sourceRecommendationId:rec.id,expectedActiveVersion:v?.id??null,selectedOption:rec.options.find(o=>o.id===(chosenOptionId??rec.recommendedOptionId))?.label??'',rationale:'',idempotencyKey:crypto.randomUUID(),reviewToken:receipt?.reviewToken};await api('/api/questions/prepare',{brandId,questionId:q.id,expectedActiveVersion:draft.expectedActiveVersion});render();$('#option').readOnly=!edit;(edit?$('#option'):$('#rationale')).focus();};
 $('#use-recommendation')?.addEventListener('click',e=>run(()=>{chosenOptionId=null;return prepare(false);},e.currentTarget));$('#modify-recommendation')?.addEventListener('click',e=>run(()=>{chosenOptionId=null;return prepare(true);},e.currentTarget));
 // Every generated option is independently actionable, with real buttons rather than a hover menu.
 $('#decision').querySelectorAll('[data-option-take],[data-option-edit],[data-option-drop],[data-option-restore]').forEach(button=>{
  const {optionTake,optionEdit,optionDrop,optionRestore}=button.dataset;
  button.addEventListener('click',event=>run(async()=>{
   if(optionDrop){discardedOptions.add(discardKey(optionDrop));analytics.send(PILOT_EVENTS.optionDiscarded,{pilot_stage:'options'});render();notice('Opción descartada. Puedes reconsiderarla mientras la propuesta siga abierta.');return;}
   if(optionRestore){discardedOptions.delete(discardKey(optionRestore));render();return;}
   chosenOptionId=optionTake??optionEdit;
   analytics.send(optionTake?PILOT_EVENTS.optionIncorporated:PILOT_EVENTS.optionModified,{pilot_stage:'options'});
   await prepare(Boolean(optionEdit));
  },event.currentTarget));
 });
 $('#reject-recommendation')?.addEventListener('submit',event=>{event.preventDefault();run(async()=>{await api('/api/recommendations/reject',{brandId,recommendationId:rec.id,rationale:$('#reject-reason').value});await refresh();notice('Recomendación rechazada. Tu estrategia permanece como la aprobaste.');},event.submitter);});
}
const statusTone=status=>['INCONCLUSIVE','CANDIDATE','REVIEWED'].includes(status)?'warn':['CANCELLED','REJECTED'].includes(status)?'muted':'';
const statusLabels={PLANNED:'Planeado',RUNNING:'En curso',COMPLETED:'Completado',INCONCLUSIVE:'No concluyente',CANCELLED:'Cancelado',CANDIDATE:'Candidato',REVIEWED:'Revisado',ACCEPTED:'Aceptado',REJECTED:'Rechazado'};
async function showBlueprint(){
 if(!enterView('#blueprint','Mapa estratégico'))return;context=await api(`/api/blueprint?brandId=${encodeURIComponent(brandId)}`);renderContext();
 const name=id=>labels[context.questions.find(q=>q.id===context.decisions.find(d=>d.id===id)?.questionId)?.module]??'Decisión';
 const progress=strategyProgress(context),next=nextPhase();
 const segments=progress.segments.map(x=>`<li class="${x.state==='defined'?'is-defined':x.state==='review'?'is-review':''}" title="${escape(labels[x.module])}"></li>`).join('');
 const cells=context.questions.map((q,i)=>{const d=context.decisions.find(d=>d.questionId===q.id),v=context.versions.find(v=>v.id===d?.activeVersionId);return `<section class="map-cell${v?' is-defined':''}"><span class="map-number" aria-hidden="true">${String(i+1).padStart(2,'0')}</span><div><h3>${escape(labels[q.module])}</h3><p class="map-text">${escape(v?.selectedOption??'Pendiente de definir.')}</p></div><div class="map-actions">${stateBadge(v,needsReview(context,d))}<button type="button" class="link-action" data-attention-module="${escape(q.module)}" aria-label="Abrir decisión: ${escape(labels[q.module])}">Abrir</button></div></section>`;}).join('');
 const pillars=context.questions.map(q=>{const d=context.decisions.find(d=>d.questionId===q.id),v=context.versions.find(v=>v.id===d?.activeVersionId);return `<section class="analysis-item blueprint-pillar"><p class="eyebrow">${String(context.questions.indexOf(q)+1).padStart(2,'0')} · Pilar estratégico</p><h3>${escape(labels[q.module])}</h3>${stateBadge(v,needsReview(context,d))}<p class="current">${escape(v?.selectedOption??'Aún no hay una decisión aprobada.')}</p><p>${escape(v?.rationale??'')}</p>${decisionIntelligenceHtml(context,q.module)}</section>`;}).join('');
 const running=context.experiments.filter(e=>e.status==='RUNNING').length;
 $('#decision').innerHTML=`<div class="map-head"><div class="ws-hero"><p class="eyebrow">Mapa estratégico · estrategia vigente</p><h2>Mapa estratégico</h2><p class="ws-lead">Las decisiones que dan rumbo a tu marca, en un solo lugar.</p></div><div class="actions"><a class="button secondary" href="#map-documents" id="map-documents-jump"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#i-download"/></svg><span>Documentos</span></a><button type="button" id="map-history" class="link-action">Ver historial</button></div></div>${context.intelligence?`<p class="intelligence-status" data-evaluator="${escape(context.intelligence.evaluatorResult)}"><span class="label">Coherencia:</span> ${escape(evaluatorLabel(context.intelligence.evaluatorResult,context))} <span class="hint">Reglas del sistema · sin consulta a la IA.</span></p>`:''}${context.impacts.some(i=>i.status==='IMPACT_PENDING')?'<p class="review">Hay un cálculo de impacto pendiente. Revisa el estado antes de continuar.</p>':''}<div class="map-progress"><p><b>${progress.defined}</b> de ${progress.total} decisiones definidas</p><ol class="progress-segments" aria-hidden="true">${segments}</ol></div><div class="map-grid">${cells}</div>${next?`<div class="map-next"><p>Siguiente decisión: <strong>${escape(labels[next])}</strong></p><button type="button" data-attention-module="${escape(next)}">Continuar estrategia <svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#i-arrow"/></svg></button></div>`:''}${mapDocumentsHtml()}<details class="map-foundations bp-disclosure"><summary><span>Ver fundamentos y conexiones</span></summary><div class="bp-disclosure-body"><div class="blueprint-grid">${pillars}</div><h3>Conexiones</h3>${context.dependencies.map(d=>`<p class="dependency-path"><span>${escape(name(d.upstreamDecisionId))}</span><span class="edge ${d.kind==='HARD'?'':'is-soft'}">${d.kind==='HARD'?'Dependencia estricta':d.kind==='SOFT'?'Dependencia sugerida':'Informativa'}</span><span>${escape(name(d.downstreamDecisionId))}</span>${needsReview(context,context.decisions.find(x=>x.id===d.downstreamDecisionId))?'<span class="badge warn">Requiere revisión</span>':''}</p>`).join('')||'<p class="hint">Aún no hay decisiones conectadas.</p>'}<h3>Hipótesis</h3>${context.hypotheses.map(h=>`<p>${escape(h.statement)} <span class="badge ${['WEAKENED','REJECTED'].includes(h.status)?'warn':''}">${hypothesisWords[h.status]??''}</span></p>`).join('')||'<p class="hint">Sin hipótesis registradas.</p>'}<h3>Validación</h3><p>${running?`${running} experimento${running===1?'':'s'} en curso.`:'Sin experimentos en curso.'} <span class="hint">Una hipótesis respaldada sigue siendo una hipótesis.</span></p><h3>Aprendizajes aceptados</h3>${context.learnings.filter(l=>l.status==='ACCEPTED').map(l=>`<p>${escape(l.interpretation)}<br><span class="hint">Límites: ${escape(l.limitations.join('; '))}</span></p>`).join('')||'<p class="hint">Aún no hay aprendizajes aceptados.</p>'}</div></details>`;
 bindAttentionActions($('#decision'));
 $('#map-history')?.addEventListener('click',event=>selectRailTool('history',event.currentTarget));
 bindStrategyLinks();
 $('#map-documents-jump')?.addEventListener('click',event=>{event.preventDefault();const target=$('#map-documents');target?.scrollIntoView({block:'start'});target?.querySelector('button')?.focus({preventScroll:true});});
 $('#blueprint-pdf')?.addEventListener('click',event=>downloadDocument(event.currentTarget,'blueprint'));
 $('#brandbook-pdf')?.addEventListener('click',event=>downloadDocument(event.currentTarget,'brandbook'));
}
/** ADR-0028: two independent documents, each with its purpose, so the participant chooses what to take away. */
function mapDocumentsHtml(){
 const doc=(id,title,purpose,detail)=>`<article class="map-document"><h4>${title}</h4><p>${purpose}</p><p class="hint">${detail}</p><button type="button" id="${id}" class="secondary"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#i-download"/></svg><span>Descargar PDF</span></button></article>`;
 return `<section id="map-documents" class="map-documents" aria-labelledby="map-documents-title"><h3 id="map-documents-title">Documentos para compartir</h3><p class="hint">Se generan con el estado vigente de esta marca. No incluyen propuestas de IA ni reflexiones personales.</p><div class="map-documents-grid">${doc('blueprint-pdf','Mapa estratégico ejecutivo','Para presentar la estrategia en pocas páginas: decisiones, conexiones, tensiones y próximos pasos.','Resumen ejecutivo · A4')}${doc('brandbook-pdf','Brand Book integral','El libro de referencia de la marca: lo aprobado, la evidencia, lo aprendido y lo que falta documentar.','Capítulos según lo documentado · índice y marcadores · A4')}</div></section>`;
}
const DOCUMENTS={
 blueprint:{endpoint:'/api/blueprint/pdf',busy:'Preparando tu mapa…',fallback:'Brandopolis-Blueprint.pdf',noun:'tu mapa estratégico',done:'Mapa estratégico descargado. Refleja el estado vigente al momento de generarlo.'},
 brandbook:{endpoint:'/api/brandbook/pdf',busy:'Preparando tu Brand Book…',fallback:'Brandopolis-Brand-Book.pdf',noun:'tu Brand Book',done:'Brand Book descargado. Refleja el estado vigente al momento de generarlo.'}
};
function downloadDocument(button,kind){
 const spec=DOCUMENTS[kind];
 return run(async()=>{
  const label=button.querySelector('span')??button,original=label.textContent,brand=brandId;
  label.textContent=spec.busy;
  let response;
  try{
   response=await fetch(`${spec.endpoint}?brandId=${encodeURIComponent(brand)}`,{credentials:'same-origin'});
  }catch{
   label.textContent=original;
   throw Object.assign(new Error(`No pudimos preparar ${spec.noun} en este momento. Vuelve a intentarlo.`),{code:'UNAVAILABLE'});
  }
  if(!response.ok){
   label.textContent=original;
   // Never surface the transport detail: the participant gets one safe, retryable sentence.
   throw Object.assign(new Error(response.status===401
    ?`Tu sesión venció. Vuelve a entrar y descarga ${spec.noun} de nuevo.`
    :`No pudimos preparar ${spec.noun} en este momento. Vuelve a intentarlo.`),{code:response.status===401?'UNAUTHORIZED':'UNAVAILABLE'});
  }
  const blob=await response.blob();
  const named=/filename="([^"]+)"/.exec(response.headers.get('content-disposition')??'');
  const href=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=href;link.download=named?.[1]??spec.fallback;
  document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(href),2000);
  if(button.isConnected)label.textContent=original;
  notice(spec.done);
 },button);
}
function currentStrategySummary(){return `<details><summary>Lo que decidiste y lo que requiere revisión</summary>${context.questions.map(q=>{const d=context.decisions.find(d=>d.questionId===q.id),v=context.versions.find(v=>v.id===d?.activeVersionId);return `<p><strong>${escape(labels[q.module])}</strong><br>${escape(v?.selectedOption??'Pregunta estratégica abierta')}${needsReview(context,d)?'<br><span class="badge warn">Requiere revisión</span>':''}</p>`;}).join('')}</details>`;}
async function showHome(){
 if(!enterView('#home','Inicio'))return;
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
 // ADR-0027 · Inicio: one next step from the real Brand state, a brief real progress and what needs attention.
 // The full Strategic Intelligence stays one click away in the rail (Atención); nothing here asks the AI.
 $('#decision').innerHTML=homeHtml(context,documentState);
 bindAttentionActions($('#decision'));
 $('#next-step-brando')?.addEventListener('click',event=>{const module=event.currentTarget.dataset.module;openModule(module,false);$('#brando-section-explore')?.click();});
 $('#home-open-attention')?.addEventListener('click',event=>selectRailTool('attention',event.currentTarget));
 $('#attention-learning')?.addEventListener('click',()=>run(showLearning));
 $('#attention-context')?.addEventListener('click',()=>run(showBrandContext));
 $('#attention-documents')?.addEventListener('click',()=>openDocuments());
}
/** Shared by Inicio and the rail: open a decision or a view. Navigation only; it never writes or asks the AI. */
function bindAttentionActions(root){
 root.querySelectorAll('[data-attention-module]').forEach(button=>button.addEventListener('click',()=>{if(button.dataset.attentionModule)openModule(button.dataset.attentionModule);}));
 root.querySelectorAll('[data-home-action]').forEach(button=>button.addEventListener('click',()=>{const view=button.dataset.homeAction;if(view==='validation')run(showLearning);else if(view==='map')run(showBlueprint);else if(view==='documents')openDocuments();else if(view==='context')run(showBrandContext);}));
 root.querySelectorAll('[data-history-module]').forEach(button=>button.addEventListener('click',()=>{activeDecisionTab='history';const module=button.dataset.historyModule;preserveDraft();selected=module;draft=null;impactVisible=false;render();focusView();}));
}
function openDocuments(){run(async()=>{await showBrandContext();const target=$('.context-documents');if(target)target.scrollIntoView({behavior:'smooth',block:'center'});$('#analyze-context-documents')?.focus();});}
/** The one visible rail tool. Attention and history are projections of the context already loaded. */
function renderRailTool(){
 if(!context||!brandId)return;
 if(panels.tool==='attention'){const host=$('#rail-attention');host.innerHTML=railAttentionHtml(context);bindAttentionActions(host);host.querySelector('#intelligence-ask-brando')?.addEventListener('click',event=>askBrandoAbout(event.currentTarget,'¿Qué no está alineado en mi estrategia y qué debería revisar primero? Explica por qué y qué cambió.'));host.querySelector('#validation-open')?.addEventListener('click',()=>run(showLearning));}
 if(panels.tool==='history'){const host=$('#rail-history');host.innerHTML=railHistoryHtml(context,$('#decision').dataset.view==='decision'?selected:null);bindAttentionActions(host);}
}
function mountLearningMoment(question){const m=user.learningMoments?.[question.module];if(m)$('#decision').insertAdjacentHTML('beforeend',`<details class="learning-moment"><summary>Qué estás aprendiendo aquí</summary><div class="learning-moment-body"><p class="eyebrow">${escape(capabilityLabel(m.capability))}</p><p>${escape(m.why)}</p><p><strong>Prueba esto:</strong> ${escape(m.apply)}</p><details><summary>Ver una pista más</summary><p><strong>Observa:</strong> ${escape(m.observe)}</p><p><strong>Cuidado:</strong> ${escape(m.caution)}</p></details></div></details>`);}
$('#learning-loop').addEventListener('click',()=>run(showLearning));
// ADR-0026: the next Brando question may carry an interpretation scope; a valid answer returns a server proof.
let brandoInterpretation=null,brandoAssistanceProof=null;
const assistActive=()=>!!brandoAssistanceProof&&brandoAssistanceProof.brandId===brandId&&Date.parse(brandoAssistanceProof.expiresAt)>Date.now();
async function showLearning(){
 if(!enterView('#learning-loop','Validación y aprendizajes'))return;context=await api(`/api/context?brandId=${encodeURIComponent(brandId)}`);renderContext();
 // ADR-0026 · Validation Workspace: Hipótesis → Experimento → Señales → Aprendizaje → Impacto. Every change is a human action.
 const v=context.validation??{hypotheses:[],planQuality:{},signalBalance:{},nextValidation:[]};
 const options=(rows,label)=>rows.map(r=>`<option value="${escape(r.id)}">${escape(label(r))}</option>`).join(''),running=context.experiments.filter(e=>e.status==='RUNNING');
 const action=(kind,row,status,label)=>`<button type="button" class="secondary" data-transition="${kind}" data-id="${escape(row.id)}" data-from="${row.status}" data-to="${status}">${label}</button>`;
 const priority=context.decisions.find(d=>context.questions.find(q=>q.id===d.questionId)?.module==='Priority Experiment'&&d.activeVersionId);
 const decisionOptions=[...(priority?[priority]:[]),...context.decisions.filter(d=>d!==priority&&d.activeVersionId)];
 const testable=context.hypotheses.filter(h=>h.status==='UNTESTED'||h.status==='TESTING');
 const accepted=context.learnings.filter(l=>l.status==='ACCEPTED');
 const hypothesisCard=h=>{
  const view=v.hypotheses.find(x=>x.id===h.id)??{inUseBy:[],testedBy:[],acceptedLearningIds:[],cycleLearningIds:[],cycles:0,lastReview:null};
  const next=h.status==='UNTESTED'?['TESTING']:h.status==='TESTING'?['SUPPORTED','WEAKENED','REJECTED']:['SUPPORTED','WEAKENED'].includes(h.status)?['TESTING']:[];
  const retest=['SUPPORTED','WEAKENED'].includes(h.status);
  const usedBy=[...view.inUseBy.map(u=>`${labels[u.module]??u.module} (supuesto en uso)`),...view.testedBy.map(u=>`${labels[u.module]??u.module} (la pone a prueba)`)];
  // Only learnings of the current validation cycle can resolve it; earlier cycles stay as history.
  const learnings=accepted.filter(l=>(view.cycleLearningIds??view.acceptedLearningIds).includes(l.id));
  const form=next.length&&!(h.status==='TESTING'&&!learnings.length)?`<details class="hypothesis-review"><summary><span>${retest?'Volver a probar esta hipótesis':'Revisar esta hipótesis'}</span></summary><form class="hypothesis-review-form" data-id="${escape(h.id)}" data-from="${escape(h.status)}"><label for="hypothesis-status-${escape(h.id)}">Nuevo estado</label><select id="hypothesis-status-${escape(h.id)}" required>${next.map(s=>`<option value="${s}">${retest?'En prueba · nuevo ciclo':hypothesisWords[s]}</option>`).join('')}</select>${retest?'<p class="hint">Abres un nuevo ciclo de validación: para resolverlo necesitarás un aprendizaje aceptado después de este momento. El historial se conserva.</p>':''}${h.status==='TESTING'&&learnings.length?`<label for="hypothesis-learning-${escape(h.id)}">Aprendizaje aceptado que lo sustenta</label><select id="hypothesis-learning-${escape(h.id)}" class="learning-choice" data-id="${escape(h.id)}" required><option value="" disabled selected>Elige el aprendizaje que la sustenta</option>${options(learnings,l=>l.interpretation)}</select><p class="hint learning-choice-detail" id="hypothesis-learning-detail-${escape(h.id)}" aria-live="polite">Sólo aparecen aprendizajes aceptados sobre esta hipótesis${view.cycles>1?' en su ciclo actual':''}.</p>`:''}<label for="hypothesis-rationale-${escape(h.id)}">Tu criterio sobre esta hipótesis</label><textarea id="hypothesis-rationale-${escape(h.id)}" maxlength="2000" required></textarea><button>Guardar revisión de hipótesis</button><p class="hint">Cambiar una hipótesis no modifica ninguna decisión.</p></form></details>`:'';
  // Owner defect 2026-10-09: with no eligible learning the review used to show an empty, disabled selector that
  // looked broken. Now it says why and offers the next step; nothing is fabricated and the rule is unchanged.
  const blocked=h.status==='TESTING'&&!learnings.length?`<div class="learning-missing" role="note"><p><strong>Todavía no hay un aprendizaje aceptado que puedas utilizar aquí.</strong></p><p class="hint">${view.cycles>1?'Abriste un nuevo ciclo: para resolverla necesitas un aprendizaje aceptado después de volver a probarla.':'Para respaldarla, debilitarla o rechazarla, primero registra lo que observaste y acepta un aprendizaje sobre esta hipótesis.'}${accepted.length?' Los aprendizajes aceptados que ya tienes corresponden a otras hipótesis o a ciclos anteriores.':''}</p><button type="button" class="secondary" data-goto-learning="${escape(h.id)}">Proponer un aprendizaje sobre esta hipótesis</button></div>`:'';
  return `<article class="analysis-item hypothesis-card" data-status="${escape(h.status)}"><span class="badge ${['WEAKENED','REJECTED'].includes(h.status)?'warn':''}">${hypothesisWords[h.status]??escape(h.status)}</span><p>${escape(h.statement)}</p>${usedBy.length?`<p class="hint">Conectada con: ${escape(usedBy.join(' · '))}</p>`:''}${view.lastReview?`<p class="hint">Última revisión: ${hypothesisWords[view.lastReview.status]??''} · ${escape(fmt(view.lastReview.at))}</p>`:''}${form}${blocked}</article>`;
 };
 const balance=id=>{const b=v.signalBalance[id];if(!b||!(b.expected+b.contrary+b.ambiguous+b.unclassified))return '';return `<p class="hint">Señales: ${b.expected} esperadas · ${b.contrary} contrarias · ${b.ambiguous} ambiguas${b.unclassified?` · ${b.unclassified} sin clasificar`:''}</p>`;};
 const impactOf=l=>{const view=v.hypotheses.find(h=>h.id===l.hypothesisId);const modules=view?[...view.inUseBy,...view.testedBy].map(u=>labels[u.module]??u.module):[];return modules.length?`<strong>Posible impacto:</strong> si cambias la hipótesis, revisa ${escape([...new Set(modules)].join(', '))}. Aceptar este aprendizaje no cambia ninguna decisión.`:'';};
 const learningExtra=l=>[l.supports&&`<strong>Qué apoya:</strong> ${escape(l.supports)}`,l.doesNotSupport&&`<strong>Qué no apoya:</strong> ${escape(l.doesNotSupport)}`,l.alternativeExplanations?.length&&`<strong>Explicaciones alternativas:</strong> ${escape(l.alternativeExplanations.join('; '))}`,l.hypothesisId&&`<strong>Hipótesis:</strong> ${escape(context.hypotheses.find(h=>h.id===l.hypothesisId)?.statement??'')}`,['CANDIDATE','REVIEWED'].includes(l.status)&&impactOf(l),l.signalIds?.length&&`<strong>Señales:</strong> ${escape(l.signalIds.map(id=>context.signals.find(s=>s.id===id)?.observation).filter(Boolean).join(' · '))}`].filter(Boolean).join('<br>');
  const experimentCard=e=>{
  const p=context.experimentPlans.find(x=>x.experimentId===e.id),h=context.hypotheses.find(x=>x.id===e.hypothesisId),signals=context.signals.filter(x=>x.experimentId===e.id);
  const row=(label,value)=>value?`<dt>${label}</dt><dd>${escape(value)}</dd>`:'';
  const dates=p?[['Creado',p.createdAt],['Inicio',p.startedAt],['Cierre',p.completedAt]].filter(([,d])=>d).map(([k,d])=>`${k}: ${fmt(d)}`).join(' · '):'';
  const learnable=signals.length&&['RUNNING','COMPLETED','INCONCLUSIVE'].includes(e.status);
  return `<article class="experiment-card" data-experiment="${escape(e.id)}"><p><span class="badge ${statusTone(e.status)}">${statusLabels[e.status]}</span></p><h4>${escape(p?.objective??e.intendedSignal)}</h4><dl class="plan-grid">${row('Hipótesis',h?.statement)}${row('Método',e.method)}${row('Señal prevista',e.intendedSignal)}${row('Criterio de éxito',p?.successCriteria)}${row('Criterio que la refutaría',e.disconfirmingCriteria)}${row('Periodo',e.plannedPeriod)}${row('Límites',e.limitations?.join('; '))}${row('Responsable',e.ownerUserId===user.userId?'Tú':'Persona autorizada')}${row('Fechas',dates)}</dl>${e.status==='PLANNED'?planQualityHtml(v.planQuality[e.id]):''}${signals.length?`<h5>Señales registradas</h5><ul class="signal-list">${signals.map(x=>`<li><span>${escape(x.observation)}</span>${x.direction?`<span class="badge ${x.direction==='CONTRARY'?'warn':''}">${directionWords[x.direction]}</span>`:'<span class="badge">Observación</span>'}<p class="hint">${escape(x.source)} · ${escape(new Date(x.observedAt).toLocaleString('es-MX'))}${x.limitation?` · Límite: ${escape(x.limitation)}`:''}</p></li>`).join('')}</ul>`:''}${balance(e.id)}<div class="actions">${e.status==='PLANNED'?action('experiment',e,'RUNNING','Iniciar experimento')+action('experiment',e,'CANCELLED','Cancelar experimento'):e.status==='RUNNING'?action('experiment',e,'COMPLETED','Completar experimento')+action('experiment',e,'INCONCLUSIVE','Marcar no concluyente')+action('experiment',e,'CANCELLED','Cancelar experimento'):''}</div>${learnable?`<div class="learn-prompt"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#i-lightbulb"/></svg><div><h5>¿Qué podemos aprender?</h5><p>Revisa las señales y sus límites antes de sacar una conclusión. Las señales no confirman por sí solas la hipótesis.</p><div class="actions"><button type="button" class="secondary" data-prepare-learning="${escape(signals[0].id)}">Preparar aprendizaje</button></div></div></div>`:''}</article>`;
 };
 const learningActions=l=>{
  if(l.status==='CANDIDATE'||l.status==='REVIEWED'){
   const edit=`<details class="learning-edit"><summary><span>Editar interpretación</span></summary><form class="learning-revise-form" data-id="${escape(l.id)}" data-from="${escape(l.status)}"><label for="revise-interpretation-${escape(l.id)}">Interpretación revisada</label><textarea id="revise-interpretation-${escape(l.id)}" maxlength="4000" required>${escape(l.interpretation)}</textarea><label for="revise-limitations-${escape(l.id)}">Límites revisados</label><input id="revise-limitations-${escape(l.id)}" maxlength="1000" value="${escape(l.limitations.join('; '))}"><button class="secondary">Guardar cambios</button></form></details>`;
   const decide=l.status==='CANDIDATE'?action('learning',l,'REVIEWED','Confirmar revisión'):`<label for="learning-rationale-${escape(l.id)}">Tu criterio (obligatorio para rechazar)</label><input id="learning-rationale-${escape(l.id)}" maxlength="2000">`+action('learning',l,'ACCEPTED','Aceptar aprendizaje')+action('learning',l,'REJECTED','Rechazar aprendizaje');
   return `<div class="actions">${decide}</div>${edit}`;
  }
  return '';
 };
 $('#decision').innerHTML=`<div class="ws-hero"><p class="eyebrow">Validación · camino opcional</p><h2>Pon tus ideas a prueba</h2><p class="ws-lead">Puedes comprobar tus suposiciones con pequeñas pruebas y aprender de los resultados. No necesitas hacerlo todo ahora.</p></div><ol class="validation-path" aria-label="Cómo funciona">${[['pending','¿Qué quieres comprobar?','Tus hipótesis'],['experiments','¿Cómo lo probarás?','Una prueba pequeña'],['experiments','¿Qué ocurrió?','Lo que observaste'],['learnings','¿Qué aprendiste?','Tu conclusión']].map(([tab,q,hint],i)=>`<li><button type="button" class="validation-path-step" data-step-tab="${tab}"><span class="step-number" aria-hidden="true">${i+1}</span><span><strong>${q}</strong><span class="hint">${hint}</span></span></button></li>`).join('')}</ol><p class="ws-note validation-note"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#i-info"/></svg>Tu estrategia puede avanzar sin esto. Nada cambia tus decisiones sin tu confirmación.</p><div class="ws-tabs" role="tablist" aria-label="Validación">${[['pending','Por validar'],['experiments','Experimentos'],['learnings','Aprendizajes']].map(([k,l])=>`<button type="button" role="tab" id="vtab-${k}" aria-controls="vpanel-${k}" data-vtab="${k}">${l}${k==='learnings'&&v.learningsAwaitingReview?.length?` <span class="badge warn">${v.learningsAwaitingReview.length}</span>`:''}</button>`).join('')}</div><section role="tabpanel" id="vpanel-pending" aria-labelledby="vtab-pending" tabindex="0">${validationNextHtml(context,{withHeading:false})}<div class="validation-toolbar"><h3>¿Qué estamos suponiendo y qué debemos comprobar?</h3><button type="button" id="validation-capture" class="secondary">Registrar hipótesis o evidencia</button></div>${context.hypotheses.map(hypothesisCard).join('')||'<p class="hint">Aún no hay hipótesis. Regístralas con «Registrar hipótesis o evidencia».</p>'}
</section><section role="tabpanel" id="vpanel-experiments" aria-labelledby="vtab-experiments" tabindex="0"><div class="validation-toolbar"><h3>${running.length?'Experimento en curso':'Experimentos'}</h3>${running.length?'<button type="button" id="open-signal-form">Registrar señal</button>':''}</div><details class="validation-form" ${context.experiments.length?'':'open'}><summary>Planear un experimento</summary><form id="experiment-form"><label for="experiment-decision">Decisión relacionada</label><select id="experiment-decision" required>${options(decisionOptions,d=>`${labels[context.questions.find(q=>q.id===d.questionId)?.module]??'Decisión'} · ${context.versions.find(x=>x.id===d.activeVersionId)?.selectedOption??''}`)}</select><label for="experiment-hypothesis">Hipótesis a comprobar</label><select id="experiment-hypothesis" required>${options(testable.length?testable:context.hypotheses,h=>h.statement)}</select><label for="experiment-objective">Objetivo del experimento</label><input id="experiment-objective" maxlength="4000" required><label for="success-criteria">Criterio de éxito</label><input id="success-criteria" maxlength="4000" required><label for="intended-signal">¿Qué señal esperas observar?</label><textarea id="intended-signal" maxlength="4000" required></textarea><label for="disconfirming-criteria">¿Qué resultado te diría que la hipótesis no se sostiene? (recomendado)</label><textarea id="disconfirming-criteria" maxlength="4000"></textarea><label for="experiment-method">Método para observarlo (recomendado)</label><input id="experiment-method" maxlength="4000"><label for="planned-period">Periodo previsto (opcional)</label><input id="planned-period" maxlength="200"><label for="experiment-limitations">Límites conocidos (opcional)</label><input id="experiment-limitations" maxlength="1000"><button ${!decisionOptions.length||!context.hypotheses.length?'disabled':''}>Crear experimento</button><p class="hint">Necesitas una decisión aprobada y una hipótesis registrada en Contexto estratégico.${priority?' Tu experimento prioritario aparece primero.':''}</p></form></details><details class="validation-form" id="signal-details"><summary>Registrar una señal</summary><form id="signal-form"><label for="signal-experiment">Experimento en curso</label><select id="signal-experiment" required>${options(running,e=>e.intendedSignal)}</select><label for="observation">¿Qué ocurrió?</label><textarea id="observation" maxlength="4000" required></textarea><label for="signal-source">Fuente de la observación</label><input id="signal-source" maxlength="1000" required><label for="signal-date">Fecha y hora observada</label><input id="signal-date" type="datetime-local" required><label for="signal-direction">Dirección de la señal (opcional)</label><select id="signal-direction"><option value="">Sin clasificar</option>${Object.entries(directionWords).map(([k,w])=>`<option value="${k}">${w}</option>`).join('')}</select><label for="signal-limitation">Límite de esta observación (opcional)</label><input id="signal-limitation" maxlength="1000"><button ${!running.length?'disabled':''}>Guardar señal</button></form></details>${context.experiments.map(experimentCard).join('')||'<p class="hint">Aún no hay experimentos. Planea uno para poner a prueba una hipótesis.</p>'}</section><section role="tabpanel" id="vpanel-learnings" aria-labelledby="vtab-learnings" tabindex="0"><details class="validation-form" id="learning-details"><summary>Proponer un aprendizaje</summary><form id="learning-form"><label for="learning-signal">Señal que lo sustenta</label><select id="learning-signal" required>${options(context.signals,s=>s.observation)}</select><label for="learning-hypothesis">Hipótesis a la que responde (opcional)</label><select id="learning-hypothesis"><option value="">Ninguna en particular</option>${options(context.hypotheses,h=>h.statement)}</select><label for="interpretation">Interpretación</label><textarea id="interpretation" maxlength="4000" required></textarea><label for="learning-supports">Qué apoyan las señales (opcional)</label><textarea id="learning-supports" maxlength="4000"></textarea><label for="learning-not-supports">Qué no apoyan (opcional)</label><textarea id="learning-not-supports" maxlength="4000"></textarea><label for="learning-alternatives">Otras explicaciones posibles (opcional)</label><input id="learning-alternatives" maxlength="1000"><label for="learning-limitations">Límites de esta interpretación</label><input id="learning-limitations" maxlength="1000" required><button ${!context.signals.length?'disabled':''}>Crear aprendizaje candidato</button><button type="button" class="secondary brando-action" id="learning-ask-brando" ${!context.signals.length?'disabled':''}>Ayúdame a interpretar</button><p class="hint">Brando sólo propone; el aprendizaje queda como candidato hasta que tú lo revises.</p><p class="hint" id="learning-assist-note" ${assistActive()?'':'hidden'}>Tienes una interpretación de Brando para estas señales: si creas el aprendizaje, su origen quedará como «asistido por Brando».</p></form></details>${context.learnings.map(l=>`<article class="analysis-item"><span class="badge ${statusTone(l.status)}">${statusLabels[l.status]}</span><p>${escape(l.interpretation)}</p>${learningExtra(l)?`<p>${learningExtra(l)}</p>`:''}<p class="hint">Límites: ${escape(l.limitations.join('; '))}${l.origin==='BRANDO_ASSISTED'?' · Interpretación asistida por Brando, revisada por ti':''}</p>${learningActions(l)}</article>`).join('')||'<p class="hint">Aún no hay aprendizajes.</p>'}</section>`;
 validationTabs();
 document.querySelectorAll('[data-step-tab]').forEach(button=>button.addEventListener('click',()=>{const tab=$(`#vtab-${button.dataset.stepTab}`);tab?.click();tab?.focus();}));
 // The interpretation Brando was asked about keeps its hypothesis visible; the person can still change it (then it is manual).
 if(assistActive()&&brandoAssistanceProof.hypothesisId&&$('#learning-hypothesis'))$('#learning-hypothesis').value=brandoAssistanceProof.hypothesisId;
 const key=()=>crypto.randomUUID();
 const opt=(selector)=>$(selector)?.value.trim()||undefined;
 const submit=(selector,kind,entity,extra=()=>({}))=>{const idempotencyKey=key();$(selector).addEventListener('submit',e=>{e.preventDefault();run(async()=>{const created=await api('/api/learning/create',{brandId,kind,entity:entity(),idempotencyKey,...extra()});if(kind==='learning'&&created.origin==='BRANDO_ASSISTED')brandoAssistanceProof=null;await showLearning();notice('Registro guardado. Las decisiones no cambiaron.');},e.submitter);});};
 submit('#experiment-form','experiment',()=>({hypothesisId:$('#experiment-hypothesis').value,intendedSignal:$('#intended-signal').value,...(opt('#disconfirming-criteria')?{disconfirmingCriteria:opt('#disconfirming-criteria')}:{}),...(opt('#experiment-method')?{method:opt('#experiment-method')}:{}),...(opt('#planned-period')?{plannedPeriod:opt('#planned-period')}:{}),...(opt('#experiment-limitations')?{limitations:[opt('#experiment-limitations')]}:{})}),()=>({decisionId:$('#experiment-decision').value,plan:{objective:$('#experiment-objective').value,successCriteria:$('#success-criteria').value}}));
 submit('#signal-form','signal',()=>({experimentId:$('#signal-experiment').value,observation:$('#observation').value,source:$('#signal-source').value,observedAt:new Date($('#signal-date').value).toISOString(),...(opt('#signal-direction')?{direction:opt('#signal-direction')}:{}),...(opt('#signal-limitation')?{limitation:opt('#signal-limitation')}:{})}));
 submit('#learning-form','learning',()=>({signalIds:[$('#learning-signal').value],interpretation:$('#interpretation').value,limitations:[$('#learning-limitations').value],...(assistActive()&&brandoAssistanceProof.signalIds.includes($('#learning-signal').value)?{assistanceProof:brandoAssistanceProof.proofId}:{}),...(opt('#learning-hypothesis')?{hypothesisId:opt('#learning-hypothesis')}:{}),...(opt('#learning-supports')?{supports:opt('#learning-supports')}:{}),...(opt('#learning-not-supports')?{doesNotSupport:opt('#learning-not-supports')}:{}),...(opt('#learning-alternatives')?{alternativeExplanations:[opt('#learning-alternatives')]}:{})}));
 $('#learning-ask-brando')?.addEventListener('click',event=>{const signal=context.signals.find(s=>s.id===$('#learning-signal').value);if(!signal)return;const related=context.signals.filter(s=>s.experimentId===signal.experimentId).map(s=>s.id).slice(0,20);brandoInterpretation={signalIds:related,experimentId:signal.experimentId,hypothesisId:$('#learning-hypothesis').value||context.experiments.find(e=>e.id===signal.experimentId)?.hypothesisId||null};askBrandoAbout(event.currentTarget,'Ayúdame a interpretar estas señales. ¿Qué apoyan, qué no apoyan, qué otras explicaciones existen, qué no podemos concluir y qué debería revisar después?');});
 document.querySelectorAll('[data-transition]').forEach(button=>button.addEventListener('click',()=>run(async()=>{const rationale=$(`#learning-rationale-${CSS.escape(button.dataset.id)}`)?.value.trim();if(button.dataset.to==='REJECTED'&&!rationale){notice('Explica por qué rechazas este aprendizaje.');$(`#learning-rationale-${CSS.escape(button.dataset.id)}`)?.focus();return;}await api('/api/learning/transition',{brandId,kind:button.dataset.transition,objectId:button.dataset.id,expectedStatus:button.dataset.from,status:button.dataset.to,...(rationale?{rationale}:{})});await showLearning();notice('Revisión guardada. El historial estratégico permanece intacto.');},button)));
 document.querySelectorAll('.learning-revise-form').forEach(form=>form.addEventListener('submit',e=>{e.preventDefault();const id=form.dataset.id;run(async()=>{const limits=$(`#revise-limitations-${CSS.escape(id)}`).value.split(';').map(x=>x.trim()).filter(Boolean);const before=context.learnings.find(l=>l.id===id);await api('/api/learning/revise',{brandId,learningId:id,expectedStatus:form.dataset.from,changes:{interpretation:$(`#revise-interpretation-${CSS.escape(id)}`).value,limitations:limits},expected:{interpretation:before?.interpretation,limitations:before?.limitations}});await showLearning();notice('Interpretación actualizada. Vuelve a quedar como candidato hasta que la revises.');},e.submitter);}));
 document.querySelectorAll('select.learning-choice').forEach(select=>select.addEventListener('change',()=>{const chosen=context.learnings.find(l=>l.id===select.value),detail=$(`#hypothesis-learning-detail-${CSS.escape(select.dataset.id)}`);if(chosen&&detail)detail.textContent=`Aprendizaje elegido: ${chosen.interpretation}${chosen.limitations?.length?` · Límites: ${chosen.limitations.join('; ')}`:''}`;}));
 document.querySelectorAll('[data-goto-learning]').forEach(button=>button.addEventListener('click',()=>{$('#vtab-learnings')?.click();const form=$('#learning-form');form?.closest('details')?.setAttribute('open','');if($('#learning-hypothesis'))$('#learning-hypothesis').value=button.dataset.gotoLearning;form?.scrollIntoView({block:'start'});$('#learning-signal')?.focus({preventScroll:true});}));
 document.querySelectorAll('.hypothesis-review-form').forEach(form=>{const idempotencyKey=key();form.addEventListener('submit',e=>{e.preventDefault();const id=form.dataset.id;run(async()=>{const status=$(`#hypothesis-status-${CSS.escape(id)}`).value,learning=$(`#hypothesis-learning-${CSS.escape(id)}`);const result=await api('/api/hypotheses/review',{brandId,review:{hypothesisId:id,expectedStatus:form.dataset.from,status,rationale:$(`#hypothesis-rationale-${CSS.escape(id)}`).value,learningId:status==='TESTING'?null:learning?.value||null,idempotencyKey}});await showLearning();const affected=result.affectedDecisions.map(d=>labels[d.module]??d.module);notice(affected.length?`Hipótesis revisada. Revisa ${affected.join(', ')}: ninguna decisión cambió.`:'Hipótesis revisada. Ninguna decisión cambió.');},e.submitter);});});

 function validationTabs(){
  let active='pending';try{active=sessionStorage.getItem('brandopolis:validation-tab')??'pending';}catch{/* best effort */}
  const select=key=>{for(const tab of document.querySelectorAll('[data-vtab]')){const on=tab.dataset.vtab===key;tab.setAttribute('aria-selected',String(on));tab.tabIndex=on?0:-1;$(`#vpanel-${tab.dataset.vtab}`).hidden=!on;}try{sessionStorage.setItem('brandopolis:validation-tab',key);}catch{/* best effort */}};
  document.querySelectorAll('[data-vtab]').forEach(tab=>tab.addEventListener('click',()=>select(tab.dataset.vtab)));
  $('.ws-tabs[aria-label="Validación"]')?.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const tabs=[...document.querySelectorAll('[data-vtab]')],i=tabs.indexOf(document.activeElement),n=event.key==='Home'?0:event.key==='End'?tabs.length-1:(i+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[n].click();tabs[n].focus();});
  select(['pending','experiments','learnings'].includes(active)?active:'pending');
  $('#validation-capture')?.addEventListener('click',()=>run(showBrandContext));
  $('#open-signal-form')?.addEventListener('click',()=>{const d=$('#signal-details');d.open=true;d.scrollIntoView({block:'nearest'});$('#observation').focus();});
  document.querySelectorAll('[data-prepare-learning]').forEach(button=>button.addEventListener('click',()=>{select('learnings');const d=$('#learning-details');d.open=true;$('#learning-signal').value=button.dataset.prepareLearning;d.scrollIntoView({block:'nearest'});$('#interpretation').focus();}));
 }
}
$('#practice').addEventListener('click',()=>run(showPractice));
/** ADR-0027 · Mi aprendizaje: Capability Context (practice) and private reflections. Never Brand Context. */
async function showPractice(){
 enterView('#practice','Mi aprendizaje');
 const [events,reflections]=await Promise.all([api('/api/practice'),api('/api/reflections')]);let limit=12;
 const brandName=$('#brands').selectedOptions[0]?.textContent?.replace(/ · (DEMO|PILOT|Marca demo)$/,'')??'';
 const decided=context?context.questions.map(q=>({q,d:context.decisions.find(d=>d.questionId===q.id)})).filter(x=>x.d?.activeVersionId):[];
 // A real evolution from this brand (an earlier version and the current one), never an invented example.
 const evolved=context?context.decisions.map(d=>({d,versions:context.versions.filter(v=>v.decisionId===d.id).sort((a,b)=>b.sequence-a.sequence)})).filter(x=>x.versions.length>1).sort((a,b)=>new Date(b.versions[0].approvedAt)-new Date(a.versions[0].approvedAt))[0]:null;
 const evolvedModule=evolved?context.questions.find(q=>q.id===evolved.d.questionId)?.module:null;
 const compare=evolved?`<h3>Cómo evolucionó una decisión</h3><p class="hint">${escape(labels[evolvedModule]??'Decisión')} · de tu marca ${escape(brandName)}</p><div class="practice-compare"><div><small>Versión ${evolved.versions[1].sequence}</small>${escape(evolved.versions[1].selectedOption)}</div><span aria-hidden="true">→</span><div><small>Versión ${evolved.versions[0].sequence} · vigente</small>${escape(evolved.versions[0].selectedOption)}</div></div>`:'';
 const linkLabel=r=>r.decisionId?`${escape(labels[context?.questions.find(q=>q.id===context.decisions.find(d=>d.id===r.decisionId)?.questionId)?.module]??'Decisión')}`:r.brandId?(r.brandId===brandId?escape(brandName):'Otra marca'):'Sin vincular';
 const list=reflections.length?`<ul class="reflection-list">${reflections.map(r=>`<li><p class="hint">${escape(fmt(r.createdAt))} · ${linkLabel(r)}</p><dl>${r.changedThinking?`<dt>¿Qué cambió en tu forma de pensar?</dt><dd>${escape(r.changedThinking)}</dd>`:''}${r.learnedFromDecision?`<dt>¿Qué aprendiste de esta decisión?</dt><dd>${escape(r.learnedFromDecision)}</dd>`:''}${r.doDifferently?`<dt>¿Qué harías diferente la próxima vez?</dt><dd>${escape(r.doDifferently)}</dd>`:''}</dl></li>`).join('')}</ul>`:'<p class="hint">Aún no has guardado reflexiones. Una reflexión breve basta.</p>';
 $('#decision').innerHTML=`<div class="ws-hero"><p class="eyebrow">Mi aprendizaje</p><h2>Mi aprendizaje</h2><p class="ws-lead">Reconoce cómo estás tomando tus decisiones.</p><p class="ws-note"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#i-info"/></svg>Reflexión personal y privada · sin calificaciones automáticas.</p></div><div class="ws-tabs" role="tablist" aria-label="Mi aprendizaje"><button type="button" role="tab" id="ltab-practice" data-tab="practice" aria-controls="lpanel-practice">Mi práctica</button><button type="button" role="tab" id="ltab-reflections" data-tab="reflections" aria-controls="lpanel-reflections">Mis reflexiones</button></div><section role="tabpanel" id="lpanel-practice" aria-labelledby="ltab-practice" tabindex="0">${compare}<div id="practice-body"></div></section><section role="tabpanel" id="lpanel-reflections" aria-labelledby="ltab-reflections" tabindex="0"><form id="reflection-form" class="reflection-form" novalidate><label for="reflection-changed">¿Qué cambió en tu forma de pensar?</label><textarea id="reflection-changed" maxlength="2000" rows="2"></textarea><label for="reflection-learned">¿Qué aprendiste de esta decisión?</label><textarea id="reflection-learned" maxlength="2000" rows="2"></textarea><label for="reflection-different">¿Qué harías diferente la próxima vez?</label><textarea id="reflection-different" maxlength="2000" rows="2"></textarea><label for="reflection-link">Vincular con (opcional)</label><select id="reflection-link"><option value="">Sin vincular</option>${brandId?`<option value="brand">Esta marca · ${escape(brandName)}</option>`:''}${decided.map(x=>`<option value="decision:${escape(x.d.id)}">${escape(labels[x.q.module])}</option>`).join('')}</select><div class="reflection-actions"><button type="submit" id="save-reflection">Guardar reflexión <svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#i-arrow"/></svg></button><button type="button" id="reflection-brando" class="link-action brando-action">Consultar a Brando <svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#i-arrow"/></svg></button></div><p class="hint"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#i-info"/></svg> Tu reflexión es privada: no modifica decisiones, no valida hipótesis y no se envía a la IA.</p></form><h3>Tus reflexiones anteriores</h3>${list}</section>`;
 const paint=()=>{$('#practice-body').innerHTML=practiceHtml(events,limit);$('#more-practice')?.addEventListener('click',()=>{limit+=12;paint();focusView($('#practice-body .analysis-item:nth-last-of-type(12)')??$('#more-practice'));});};paint();
 viewTabs($('#decision'),'brandopolis:learning-tab','practice');
 const idempotencyKey=crypto.randomUUID();
 $('#reflection-form').addEventListener('submit',event=>{event.preventDefault();run(async()=>{
  const fields={changedThinking:$('#reflection-changed').value.trim(),learnedFromDecision:$('#reflection-learned').value.trim(),doDifferently:$('#reflection-different').value.trim()};
  if(!Object.values(fields).some(Boolean)){notice('Escribe al menos una respuesta para guardar tu reflexión.');$('#reflection-changed').focus();return;}
  const link=$('#reflection-link').value;
  await api('/api/reflections',{...Object.fromEntries(Object.entries(fields).filter(([,v])=>v)),idempotencyKey,...(link==='brand'?{brandId}:link.startsWith('decision:')?{brandId,decisionId:link.slice(9)}:{})});
  await showPractice();notice('Reflexión guardada. Tu estrategia no cambió.');
 },event.submitter);});
 $('#reflection-brando').addEventListener('click',event=>askBrandoAbout(event.currentTarget,'Ayúdame a formular preguntas para reflexionar sobre cómo tomé mis decisiones recientes. No escribas mis respuestas ni cambies nada.'));
}
/** Ayuda: plain-language guide to the workspace. Navigation only. */
/**
 * Configuración de marca · Zona de peligro (ADR-0029). Deleting is permanent and server-authorized (workspace
 * ADMIN, exact name, idempotent). The page never claims full deletion while a file purge is still pending.
 */
async function showBrandSettings(){
 if(!enterView('#brand-settings','Configuración de marca'))return;
 const brands=await api('/api/brands'),brand=brands.find(b=>b.id===brandId);
 if(!brand){$('#decision').innerHTML='<p class="empty">Selecciona una marca para ver su configuración.</p>';return;}
 const idempotencyKey=crypto.randomUUID();
 $('#decision').innerHTML=`<div class="ws-hero"><p class="eyebrow">Configuración de marca</p><h2>${escape(brand.name)}</h2><p class="ws-lead">Datos generales de esta marca y acciones que no forman parte del trabajo estratégico diario.</p></div>
 <section class="settings-card" aria-labelledby="settings-data-title"><h3 id="settings-data-title">Datos de la marca</h3><dl class="settings-data"><div><dt>Nombre</dt><dd>${escape(brand.name)}</dd></div><div><dt>Tipo</dt><dd>${brand.isDemo?'Marca demo · espacio de práctica':'Marca'}</dd></div></dl></section>
 <section class="danger-zone" aria-labelledby="danger-title"><h3 id="danger-title">Zona de peligro</h3><details id="delete-brand-details"><summary><span>Eliminar marca</span></summary>
 <form id="delete-brand-form" class="delete-brand-form" novalidate><p>Vas a eliminar <strong>${escape(brand.name)}</strong> de forma permanente.</p>
 <ul class="delete-consequences"><li>Se borran sus decisiones, versiones e historial, su contexto, hipótesis, experimentos, señales, aprendizajes y relaciones.</li><li>Se borran los documentos que subiste a esta marca y sus archivos.</li><li>Tú y cualquier persona con acceso a esta marca perderán el acceso de inmediato.</li><li>Las reflexiones personales se conservan para su autor, desvinculadas de esta marca. Tus otras marcas no cambian.</li><li>No podrás recuperarla desde Brandopolis. Las copias de seguridad externas pueden conservar datos hasta que caduquen.</li></ul>
 <label for="delete-confirm-name">Escribe el nombre exacto de la marca para confirmar</label><input id="delete-confirm-name" autocomplete="off" spellcheck="false" aria-describedby="delete-confirm-hint"><p class="hint" id="delete-confirm-hint">Debe coincidir exactamente: ${escape(brand.name)}</p>
 <div class="actions"><button type="submit" id="delete-brand" class="danger" disabled>Eliminar marca definitivamente</button><button type="button" id="delete-brand-cancel" class="secondary">Cancelar</button></div></form></details></section>`;
 const input=$('#delete-confirm-name'),submit=$('#delete-brand');
 input.addEventListener('input',()=>{submit.disabled=input.value!==brand.name;});
 $('#delete-brand-cancel').addEventListener('click',()=>{input.value='';submit.disabled=true;$('#delete-brand-details').open=false;$('#delete-brand-details summary').focus();});
 $('#delete-brand-form').addEventListener('submit',event=>{event.preventDefault();if(input.value!==brand.name)return;run(async()=>{
  let result;
  try{result=await api('/api/brands/delete',{brandId:brand.id,confirmName:input.value,idempotencyKey});}
  catch(error){if(error.code==='FORBIDDEN')throw Object.assign(new Error('Sólo una persona administradora de este espacio puede eliminar marcas.'),{code:'FORBIDDEN'});throw error;}
  draft=null;resetBrando();brandId=null;await loadBrands();await showHome().catch(()=>{});
  notice(result.status==='FILES_PENDING'?`Eliminaste ${brand.name}. Sus datos ya no están disponibles; algunos archivos siguen pendientes de borrado y Brandopolis lo reintentará.`:`Eliminaste ${brand.name} y todos sus datos. Tus otras marcas no cambiaron.`);
 },submit);});
}
async function showHelp(){
 enterView('#help','Ayuda');
 $('#decision').innerHTML=`<div class="ws-hero"><p class="eyebrow">Ayuda</p><h2>Cómo funciona Brandopolis</h2><p class="ws-lead">La IA propone. Tú decides. Brandopolis recuerda.</p></div><div class="help-grid"><section><h3>Inicio</h3><p>Te muestra tu siguiente paso: una decisión por tomar o algo que requiere tu revisión. Distingue lo que requiere tu decisión de las observaciones.</p></section><section><h3>Estrategia</h3><p>Nueve decisiones conectadas. Cada una guarda tu elección, tu criterio y su historial. Si una decisión cambia, las conectadas piden revisión; nada se reescribe solo.</p></section><section><h3>Mercado objetivo</h3><p>El mercado donde decides competir: tipo de mercado, necesidad y alcance. No es lo mismo que el <strong>ámbito geográfico</strong> (dónde operas o vendes), el <strong>entorno competitivo</strong> (competidores y alternativas) ni el <strong>cliente principal</strong> (a quién atiendes primero dentro de ese mercado).</p></section><section><h3>Validación</h3><p>Un camino opcional para poner tus ideas a prueba: qué quieres comprobar, cómo lo probarás, qué ocurrió y qué aprendiste. Tu estrategia puede avanzar sin esto; una hipótesis sólo cambia de estado con un aprendizaje que tú aceptas</p></section><section><h3>Brando</h3><p>Tu copiloto estratégico. Sólo consulta a la IA cuando tú lo pides. Sus propuestas aparecen «sin aprobar»: puedes llevarlas al borrador, modificarlas o rechazarlas.</p></section><section><h3>Mi aprendizaje</h3><p>Tu práctica registrada y tus reflexiones privadas. No hay calificaciones automáticas y tus reflexiones no cambian la estrategia de la marca.</p></section><section><h3>Laterales y modo enfoque</h3><p>Contrae la navegación y las herramientas para ganar espacio. Con ambos plegados trabajas en modo enfoque; tus borradores se conservan.</p></section><section><h3>Documentos y configuración</h3><p>Desde el Mapa estratégico descargas el Mapa estratégico ejecutivo y el Brand Book integral. En Configuración de marca está la zona de peligro para eliminar una marca de forma permanente.</p></section><section><h3>Próximamente</h3><p>Productos y servicios, Plan de marketing y Resultados aparecen en la navegación como «Próximamente». Todavía no están disponibles en esta versión.</p></section></div>`;
}

function renderContext(){
  syncBrandoPresentation();
  updateShell();
  const versions=context.versions.filter(v=>context.decisions.some(d=>d.activeVersionId===v.id));
  const latest=versions.slice().sort((a,b)=>new Date(b.approvedAt)-new Date(a.approvedAt))[0];
  const pendingReview=context.questions.filter(q=>needsReview(context,context.decisions.find(d=>d.questionId===q.id))).length;
  const marketStatus=competitiveStatus();
  const marketTone=marketStatus===COMPETITIVE_STATUS.REVIEWED?'':marketStatus===COMPETITIVE_STATUS.PENDING?'warn':'muted';
  if(!$('#rail-panel').hidden)renderRailTool();
  $('#context').innerHTML=`<div class="context-cover"><p class="eyebrow">Memoria estratégica</p><h3>Contexto vigente</h3><p>${escape($('#brands').selectedOptions[0]?.textContent?.replace(/ · (DEMO|PILOT)$/,''))}</p></div><section class="context-market" aria-labelledby="context-market-label"><p class="context-section" id="context-market-label">Contexto del mercado</p><h4 class="context-market-title">Entorno competitivo</h4><p class="context-market-status"><span class="badge ${marketTone}">${escape(marketStatus)}</span></p><p class="hint">Preparación estratégica. No cuenta como decisión.</p></section><details class="context-details" open><summary><span class="context-section">Lo que ya decidiste</span><span class="context-count">${versions.length} de ${context.questions.length}${pendingReview?` · ${pendingReview} por revisar`:''}</span></summary><ol class="context-lineage">${context.questions.map((q,index)=>{const d=context.decisions.find(d=>d.questionId===q.id),v=context.versions.find(v=>v.id===d?.activeVersionId);return `<li${$('#decision').dataset.view==='decision'&&q.module===selected?' aria-current="step"':''}><span class="context-number">${String(index+1).padStart(2,'0')}</span><div><strong>${escape(labels[q.module]??q.module)}</strong><p>${v?escape(v.selectedOption):'Tu siguiente decisión comienza aquí.'}</p>${v?`<span class="context-version">v${v.sequence} · Decisión del Estratega de Marca</span>`:''}${needsReview(context,d)?'<span class="badge warn">Requiere revisión</span>':''}</div></li>`;}).join('')}</ol></details>${latest?`<p class="context-updated">Última decisión<br><strong>${escape(fmt(latest.approvedAt))}</strong></p>`:''}<p class="hint context-note">Los cambios conservan su historia.<br>Nada se reescribe sin tu criterio.</p>`;
}
function updateShell(){
 const name=$('#brands').selectedOptions[0]?.textContent?.replace(/ · (DEMO|PILOT|Marca demo)$/,'')??'Tu espacio estratégico';
 $('#brands').title=name;
 // CoffeePolis is a sandbox: say so wherever the participant is working, and explain it once.
 const demo=activeBrandIsDemo();
 $('#workspace').classList.toggle('is-demo',demo);
 const banner=$('#demo-banner');
 if(banner){
  banner.hidden=!demo;
  if(demo)analytics.sendOnce(PILOT_EVENTS.demoBrandOpened,{pilot_stage:'demo'});
 }
 if(!context)return;
 // Journey line: decided, review and next-phase states. The next phase is also said in words (title and
 // aria-description), so neither colour nor the finite pulse is the only signal.
 syncPanelSignal();
 // Estrategia N/9 counts decisions with a current version: completeness, never quality or validation.
 const progress=strategyProgress(context);$('#strategy-count').textContent=`${progress.defined}/${progress.total}`;$('#strategy-count-text').textContent=`, ${progress.defined} de ${progress.total} decisiones definidas`;
 const upcoming=nextPhase();
 document.querySelectorAll('[data-module]').forEach(button=>{const q=context.questions.find(q=>q.module===button.dataset.module),d=context.decisions.find(d=>d.questionId===q?.id),review=needsReview(context,d),isNext=button.dataset.module===upcoming;button.classList.toggle('needs-attention',review);button.classList.toggle('is-decided',!!d?.activeVersionId&&!review);if(isNext&&!button.classList.contains('is-next'))button.classList.add('is-next');else if(!isNext)button.classList.remove('is-next');button.title=(isNext?'Siguiente decisión sugerida · ':'')+(review?'Requiere revisión':d?'Decisión vigente':'Por decidir');button.setAttribute('aria-label',button.textContent.trim());button.setAttribute('aria-description',button.title);});
}
/** Review brief derived from the real Change Impact (review items and their trigger versions); nothing is inferred. */
function reviewBriefHtml(q,v,reviews){
 const origins=reviews.map(r=>{const trigger=context.versions.find(x=>x.id===r.triggerVersionId),decision=context.decisions.find(x=>x.id===trigger?.decisionId),source=context.questions.find(x=>x.id===decision?.questionId),before=context.versions.find(x=>x.id===trigger?.previousVersionId);return {label:labels[source?.module]??'Una decisión conectada',trigger,before,mine:trigger?.actorUserId===user.userId,reason:impactReason(r)};}).filter(o=>o.trigger);
 const names=[...new Set(origins.map(o=>o.label))],verb=origins.every(o=>o.mine)?'cambiaste':'cambió';
 const title=names.length?`Estás revisando ${labels[q.module]} porque ${verb} ${names.join(' y ')}.`:`Estás revisando ${labels[q.module]}.`;
 const originHtml=origins.map(o=>`<div class="review-origin-item"><p><strong>${escape(o.label)}</strong> · ${o.before?`versión ${o.before.sequence} → ${o.trigger.sequence}`:'registrada por primera vez'}</p>${o.before?`<p class="impact-before"><span>Antes · v${o.before.sequence}</span> ${escape(o.before.selectedOption)}</p>`:''}<p class="impact-after"><span>Ahora · v${o.trigger.sequence}</span> ${escape(o.trigger.selectedOption)}</p></div>`).join('');
 return `<section class="review-brief" aria-labelledby="review-brief-title"><h3 id="review-brief-title" tabindex="-1">${escape(title)}</h3><p class="review-tip"><strong>Esta decisión necesita tu revisión.</strong> Comprueba si sigue siendo adecuada después del cambio. Puedes modificarla o confirmar que se mantiene.</p><h4>Decisión que estás revisando</h4><div class="review-brief-current" data-version="${v.sequence}"><section class="human-decision is-under-review" aria-label="Decisión vigente en revisión"><p class="eyebrow">Decisión vigente · v${v.sequence}</p><p class="current">${escape(v.selectedOption)}</p>${v.rationale?`<p class="rationale"><span class="label">Por qué:</span> ${escape(v.rationale)}</p>`:''}</section></div><h4>Por qué requiere revisión</h4><p class="review-trigger">${escape(origins.map(o=>o.reason).join(' '))}</p>${originHtml?`<h4>Qué decisión originó el impacto</h4><div class="review-origins">${originHtml}</div>`:''}</section>`;
}
function composeDecision(q,d,v,reviews){
 const surface=$('#decision');
 const hero=document.createElement('div');hero.className='decision-heading';
 for(const selector of [':scope > .eyebrow',':scope > h2',':scope > .decision-question',':scope > .decision-help',':scope > .decision-meta']){const el=surface.querySelector(selector);if(el)hero.append(el);}
 surface.prepend(hero);
 const current=surface.querySelector(':scope > .current'),rationale=surface.querySelector(':scope > .rationale');
 if(current){const committed=document.createElement('section');committed.className=`human-decision${reviews.length?' is-under-review':''}`;committed.setAttribute('aria-label','Decisión vigente del Estratega de Marca');committed.innerHTML=`<p class="eyebrow">Decisión del Estratega de Marca · vigente${reviews.length?' · en revisión':''}</p>`;current.before(committed);committed.append(current);if(rationale)committed.append(rationale);}
 const human=surface.querySelector('.human-decision');
 if(human)hero.after(human);
 // View 06: what the brand declared (geography) sits right under the question, before the decision; it is context, never the decision.
 const declared=surface.querySelector(':scope > .declared-context');if(declared)hero.after(declared);
 const review=surface.querySelector('.review');
 if(draft&&review){
   const disclosure=document.createElement('details');disclosure.className='review-origin';disclosure.innerHTML='<summary>Cambio que origina esta revisión</summary>';
   review.before(disclosure);disclosure.append(review);
   const form=surface.querySelector('.decision-form');
   // Owner decision 2026-10-09 · the person first understands what they review and why, then chooses:
   // 1 decision under review (its current content) · 2 why · 3 which decision caused it · 4 what you can do.
   if(form){hero.after(form);if(v){form.insertAdjacentHTML('afterbegin',reviewBriefHtml(q,v,reviews));human?.remove();}}
 }
 const related=context.dependencies.filter(link=>link.upstreamDecisionId===d?.id||link.downstreamDecisionId===d?.id);
 if(related.length){const connections=document.createElement('div');connections.className='decision-connections';const chip=link=>{const other=link.upstreamDecisionId===d.id?link.downstreamDecisionId:link.upstreamDecisionId,otherDecision=context.decisions.find(d=>d.id===other),question=context.questions.find(q=>q.id===otherDecision?.questionId),review=needsReview(context,otherDecision);return `<span class="connection${review?' is-review':''}">${escape(labels[question?.module]??'Decisión')} <small>· ${link.kind==='HARD'?'estricta':link.kind==='SOFT'?'sugerida':'informativa'}${review?' · requiere revisión':''}</small></span>`;},dependsOn=related.filter(link=>link.downstreamDecisionId===d.id),affects=related.filter(link=>link.upstreamDecisionId===d.id);
  connections.innerHTML=(dependsOn.length?`<span class="label">Depende de</span>${dependsOn.map(chip).join('')}`:'')+(affects.length?`<span class="label">Afecta a</span>${affects.map(chip).join('')}`:'');surface.append(connections);}
 if(reviews.length)surface.classList.add('under-review');else surface.classList.remove('under-review');
}
function bindStrategyLinks(){document.querySelectorAll('[data-strategy-module]').forEach(button=>button.addEventListener('click',()=>openModule(button.dataset.strategyModule)));}

function setNavActive(selector){$('#decision').dataset.view=selector?.slice(1)??'decision';document.querySelectorAll('#journey [aria-current]').forEach(b=>b.removeAttribute('aria-current'));if(selector)$(selector).setAttribute('aria-current','page');$('#strategy-toggle')?.classList.toggle('contains-current',!selector);}

/** Completion hand-off: what to do next, in the page, on every viewport. Shows a continuation only
 *  when a next phase genuinely exists, so it can never point nowhere. Copy is a parameter so every
 *  workflow can reuse it; the destination always comes from the canonical journey, never a local list. */
function showPhaseHandoff({
 eyebrow='Fase completada',
 done='Tu decisión quedó guardada.',
 complete='Completaste las decisiones de esta marca.',
 secondaryLabel='Revisar avance',
 secondaryAction=showHome
}={}){
 const host=$('#decision');if(!host)return;
 host.querySelector('.phase-handoff')?.remove();
 const next=nextPhase();
 const label=next?(labels[next]??next):null;
 const panel=document.createElement('section');
 panel.className='phase-handoff';
 panel.innerHTML=`<p class="eyebrow">${escape(eyebrow)}</p><h3>${next?`${escape(done)} Continúa con ${escape(label)}.`:escape(complete)}</h3><div class="actions">${next?`<button type="button" id="phase-next" data-next="${escape(next)}">Continuar a ${escape(label)}</button>`:''}<button type="button" id="phase-review" class="secondary">${escape(secondaryLabel)}</button></div>`;
 host.prepend(panel);
 $('#phase-next')?.addEventListener('click',event=>run(async()=>{
  analytics.send(PILOT_EVENTS.nextPhaseStarted,{pilot_stage:'next_phase'});
  await openModule(event.currentTarget.dataset.next);
 },event.currentTarget));
 $('#phase-review')?.addEventListener('click',event=>run(secondaryAction,event.currentTarget));
 panel.scrollIntoView({block:'nearest'});
}
async function showFeedback(){
 analytics.send(PILOT_EVENTS.feedbackOpened);
 closeMenu(false);setTitle('Feedback');preserveDraft();if(!brandId){notice('Selecciona una marca para compartir feedback.');return;}
 const capturedBrand=brandId;
 $('#decision').innerHTML=`<h2>Ayúdanos a mejorar tu experiencia</h2><p>Feedback del piloto; no modifica tus decisiones. No incluyas secretos ni datos personales de terceros.</p><form id="feedback-form">${[['usefulness','Utilidad'],['clarity','Claridad'],['confidence','Confianza para decidir']].map(([id,label])=>`<label for="feedback-${id}">${label} (1 baja, 5 alta)</label><select id="feedback-${id}" required><option value="">Elige</option>${[1,2,3,4,5].map(n=>`<option value="${n}">${n}</option>`).join('')}</select>`).join('')}<label for="feedback-kind">Tipo</label><select id="feedback-kind"><option value="FEEDBACK">Comentario</option><option value="ISSUE">Reportar problema</option></select><label for="feedback-comment">Comentario opcional</label><textarea id="feedback-comment" maxlength="2000"></textarea><button>Enviar feedback</button></form>`;
 $('#feedback-form').addEventListener('submit',event=>{event.preventDefault();run(async()=>{await api('/api/feedback',{brandId:capturedBrand,usefulness:Number($('#feedback-usefulness').value),clarity:Number($('#feedback-clarity').value),confidence:Number($('#feedback-confidence').value),kind:$('#feedback-kind').value,comment:$('#feedback-comment').value});await refresh();notice('Gracias. Tu feedback quedó registrado.');},event.submitter);});
}

// PILOT only: one-time acknowledgement before Brand Context is sent to the configured AI provider.
function showAiNotice(questionId,origin={}){
 const section=document.createElement('section');section.className='analysis-item';section.setAttribute('aria-labelledby','ai-notice-title');
 section.innerHTML=`<h3 id="ai-notice-title">Antes de pedir una propuesta IA</h3><p>${escape(aiNotice.text)}</p><button id="ai-notice-accept">Entiendo y acepto</button> <button id="ai-notice-decline" class="secondary">Ahora no</button>`;
 ($('#decision h2')??$('#decision').firstChild).after(section);$('#ai-notice-accept').focus();
 $('#ai-notice-decline').addEventListener('click',()=>{section.remove();notice('Puedes continuar con tu decisión sin propuesta IA.');focusView($('#generate-recommendation'));});
 $('#ai-notice-accept').addEventListener('click',event=>run(async()=>{
  await api('/api/ai-notice/accept',{version:aiNotice.version});
  section.remove();
  // Resume the request the participant originally made, through the one generation path, so the
  // options land on the visible panel and a draft in progress is released exactly as it would be.
  await generatePossibilities(questionId,{...origin,afterConsent:true});
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


// B1 conversation is memory-only, scoped to this user, brand, decision and context revision.
let brandoTurns=[],brandoScope='',brandoGeneration=0,brandoBusy=false,brandoExpiryTimer;
const brandoDialog=$('#brando-dialog');
let brandoOpener=$('#open-brando'),brandoClosing=false;
/** Desktop: Brando lives docked in the rail panel (non-modal), so the person can switch tools without losing the
 *  conversation. Small screens keep the modal drawer. Showing or hiding the docked panel never asks the AI. */
let brandoQuietClose=false;
function syncDockedBrando(){
 const dialog=document.querySelector('#brando-dialog');if(!dialog)return;
 const wanted=desktopRail.matches&&!panels.right&&panels.tool==='brando'&&!!brandId&&!!context;
 if(wanted&&!dialog.open){dialog.classList.add('brando-docked');dialog.show();document.querySelector('#brando-scroll').scrollTop=dialog.dataset.scroll?Number(dialog.dataset.scroll):0;}
 else if(!wanted&&dialog.open&&dialog.classList.contains('brando-docked')){dialog.dataset.scroll=String(document.querySelector('#brando-scroll').scrollTop);brandoQuietClose=true;dialog.close();}
}
function closeBrando(){
 if(!brandoDialog.open||brandoClosing)return Promise.resolve();
 // Docked: closing Brando collapses the rail; the conversation stays for this session and scope.
 if(brandoDialog.classList.contains('brando-docked')){panels.right=true;brandoDialog.close();applyPanels();return Promise.resolve();}
 brandoClosing=true;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const animation=reduced?null:brandoDialog.animate([{transform:'translateX(0)'},{transform:'translateX(102%)'}],{duration:220,easing:'cubic-bezier(.4,0,1,1)'});
 return (animation?animation.finished.catch(()=>{}):Promise.resolve()).then(()=>{brandoDialog.close();animation?.cancel();brandoClosing=false;});
}
let brandoVisualState='idle',brandoSuggestionDismissed=false;
const presenceLabels={idle:'Brando está atento a esta marca',consulting:'Brando está consultando tu contexto',ready:'Brando tiene una respuesta para ti',attention:'Hay elementos que necesitan tu atención',unavailable:'No pudimos obtener una respuesta'};
const brandoPresence=createBrandoPresence({portraits:[...document.querySelectorAll('[data-brando-portrait]')],motionButton:$('#brando-motion-toggle'),onState:state=>{$('#brando-card').dataset.state=state;$('#home').dataset.state=state;$('#brando-presence-label').textContent=presenceLabels[state];$('#brando-card').setAttribute('aria-busy',String(state==='consulting'));}});
const brandoCompact=matchMedia('(max-width: 1000px)');
function placeBrandoCard(){if(brandoCompact.matches)$('#brando-mobile-slot').prepend($('#brando-card'));else $('header').append($('#brando-card'));}
brandoCompact.addEventListener('change',placeBrandoCard);placeBrandoCard();
function syncBrandoPresentation(){
 if(brandoScope&&brandoScope!==currentBrandoScope())resetBrando();
 const needsAttention=context?.attention?.length>0;
 brandoPresence.setState(brandoVisualState==='idle'&&needsAttention?'attention':brandoVisualState);
 const suggestion=draft?.brandoSuggestion;
 const visible=Boolean(suggestion&&draft.questionId===brandoQuestion()&&!brandoSuggestionDismissed);
 $('#brando-suggestion').hidden=!visible;
 if(brandoDialog.open)$('#brando-context-overview').innerHTML=brandoContextHtml(context,brandoQuestion());
 $('#brando-suggestion-text').textContent=visible?brandoPlainText(suggestion):'';
 const hero=$('#decision .decision-heading');if(hero&&visible)hero.after($('#brando-suggestion'));else $('#decision').before($('#brando-suggestion'));
 syncBrandoSection();
}
function sectionAnswer(orientation){return brandoTurns.findLast(t=>t.question===orientation?.query&&t.result.suggestionTickets?.length&&t.result.suggestionTickets.every(ticket=>!ticket.reviewed&&!brandoTicketExpired(ticket,t.result.receivedAt)));}
function syncBrandoSection(){
 $('#brando-section')?.remove();
 const orientation=brandoSectionOrientation(context,brandoQuestion()),hero=$('#decision .decision-heading');
 if(!orientation||!hero)return;
 // Hierarchy (owner decision 2026-10-08): title · question · main card · Brando's compact card · context and connections.
 const overview=$('#decision #panel-overview');
 const main=overview?.querySelector(':scope > .decision-form')??overview?.querySelector(':scope > .human-decision')??overview?.querySelector(':scope > .empty')??null;
 const anchor=main?(main.nextElementSibling?.matches('.actions')?main.nextElementSibling:main):hero;
 anchor.insertAdjacentHTML('afterend',brandoSectionHtml(orientation,{busy:brandoBusy,hasAnswer:!!sectionAnswer(orientation)}));
 $('#brando-section-explore').addEventListener('click',event=>{
  if(brandoBusy)return;
  const existing=sectionAnswer(orientation);
  openBrando(event.currentTarget);
  if(existing){$('#brando-conversation').children[brandoTurns.indexOf(existing)]?.scrollIntoView({block:'start'});return;}
  $('#brando-message').value=orientation.query;
  $('#brando-form').requestSubmit();
 });
}
function expireBrandoActions(){
 clearTimeout(brandoExpiryTimer);
 let next=Infinity,expired=false;const now=Date.now();
 for(const turn of brandoTurns)for(const ticket of turn.result.suggestionTickets??[]){
  if(brandoTicketExpired(ticket,turn.result.receivedAt,now)){
   expired=true;
   for(const button of document.querySelectorAll('[data-brando-ticket]'))if(button.dataset.brandoTicket===ticket.ticketId){button.disabled=true;button.title='La propuesta venció. Consulta de nuevo.';}
  }else next=Math.min(next,ticket.expiresAt==null?turn.result.receivedAt+15*60*1000:Date.parse(ticket.expiresAt));
 }
 if(expired&&brandoDialog.open&&!brandoBusy)$('#brando-status').textContent='Hay propuestas vencidas. Consulta de nuevo para elegir una alternativa vigente.';
 if(next!==Infinity)brandoExpiryTimer=setTimeout(()=>{expireBrandoActions();syncBrandoSection();},Math.max(1,next-now));
}
$('#brando-view-answer').addEventListener('click',()=>$('#open-brando').click());
$('#brando-dismiss-suggestion').addEventListener('click',()=>{brandoSuggestionDismissed=true;syncBrandoPresentation();$('#open-brando').focus();});
function resetBrando(){
 clearTimeout(brandoExpiryTimer);
 brandoGeneration++;brandoTurns=[];brandoScope='';brandoBusy=false;
 $('#brando-conversation').replaceChildren();$('#brando-status').textContent='';$('#brando-message').value='';$('#brando-consent').hidden=true;
 $('#brando-form button[type="submit"]').disabled=false;setBrandoBusy(false);
 brandoVisualState='idle';brandoSuggestionDismissed=false;syncBrandoPresentation();
}
function brandoQuestion(){return $('#journey [data-module][aria-current="page"]')?context?.questions.find(q=>q.module===selected)?.id??null:null;}
function currentBrandoScope(){return JSON.stringify([user?.userId,brandId,brandoQuestion(),context?.brandoContextVersion??context?.contextVersion]);}
/** Explicit, human-initiated strategy-wide question: opens the existing drawer and sends one query. */
function askBrandoAbout(opener,question){
 if(brandoBusy)return;
 openBrando(opener);
 $('#brando-message').value=question;
 $('#brando-form').requestSubmit();
}
function openBrando(opener){
 if(!brandId||!context){notice('Primero crea o selecciona una marca.');return;}
 const key=currentBrandoScope();if(key!==brandoScope)resetBrando();brandoScope=key;
 $('#brando-scope').textContent=`${$('#brands').selectedOptions[0]?.textContent??'Marca activa'} · ${brandoQuestion()?labels[selected]:'Contexto general de la marca'}`;
 brandoOpener=opener;closeMenu(false);
 $('#brando-context-overview').innerHTML=brandoContextHtml(context,brandoQuestion());
 if(desktopRail.matches){
  // Docked in the rail: Brando becomes the one visible tool; nothing else is closed or reset.
  panels.tool='brando';panels.right=false;
  if(brandoDialog.open&&!brandoDialog.classList.contains('brando-docked')){brandoQuietClose=true;brandoDialog.close();}
  applyPanels();
 }else{brandoDialog.classList.remove('brando-docked');if(!brandoDialog.open)brandoDialog.showModal();}
 brandoPresence.setDialogOpen(true);expireBrandoActions();$('#brando-message').focus();
 $('#brando-scroll').scrollTop=0;
}
$('#open-brando').addEventListener('click',()=>openBrando($('#open-brando')));
$('#close-brando').addEventListener('click',()=>closeBrando());
brandoDialog.addEventListener('cancel',event=>{event.preventDefault();closeBrando();});
// A docked (non-modal) dialog does not receive `cancel`: Escape still closes it and returns focus.
brandoDialog.addEventListener('keydown',event=>{if(event.key==='Escape'&&brandoDialog.classList.contains('brando-docked')&&!feedbackDialog.open){event.preventDefault();event.stopPropagation();closeBrando();}});
brandoDialog.addEventListener('close',()=>{brandoPresence.setDialogOpen(false);if(brandoQuietClose){brandoQuietClose=false;return;}const opener=brandoOpener.isConnected?brandoOpener:$('#brando-section-explore')??$('#open-brando');(opener.closest('[inert]')?$('#menu'):opener).focus();});
$('#brando-context-overview').addEventListener('click',async event=>{const button=event.target.closest('[data-brando-module],[data-brando-view]');if(!button)return;await closeBrando();if(button.dataset.brandoModule)openModule(button.dataset.brandoModule);else run(button.dataset.brandoView==='context'?showBrandContext:showHome);});
trapFocus(brandoDialog,()=>brandoDialog.matches(':modal'));
$('#clear-brando').addEventListener('click',()=>{resetBrando();brandoScope=currentBrandoScope();$('#brando-message').focus();});
document.querySelectorAll('[data-brando-question]').forEach(button=>button.addEventListener('click',()=>{$('#brando-message').value=button.dataset.brandoQuestion;$('#brando-message').focus();}));
function setBrandoBusy(busy){
 const button=$('#brando-submit');button.disabled=busy;button.setAttribute('aria-busy',String(busy));$('#brando-submit-label').textContent=busy?'Pensando…':'Consultar';button.querySelector('.brando-thinking-mark').hidden=!busy;
}
let brandoFeedbackPending=null;
const feedbackDialog=$('#brando-feedback-dialog');
async function openBrandoFeedback(ticketId,action){
 if(brandoBusy){notice('Espera a que Brando termine la consulta.');return;}
 const turn=brandoTurns.find(t=>t.result.suggestionTickets?.some(ticket=>ticket.ticketId===ticketId));
 if(!turn||!['ACCEPT','MODIFY','REJECT','EVIDENCE','CONTEXT'].includes(action)){notice('Consulta de nuevo para revisar una sugerencia vigente.');return;}
 const index=turn.result.suggestionTickets.findIndex(ticket=>ticket.ticketId===ticketId);
 const ticket=turn.result.suggestionTickets[index];
 if(ticket.reviewed||brandoTicketExpired(ticket,turn.result.receivedAt)){expireBrandoActions();$('#brando-status').textContent='Esta propuesta ya no está disponible. Consulta de nuevo antes de elegir.';return;}
 if(['EVIDENCE','CONTEXT'].includes(action)){
  await closeBrando();await run(showBrandContext);
  if(action==='EVIDENCE'){const heading=$('#decision .memory-3 h3');if(heading){heading.tabIndex=-1;heading.focus();}}return;
 }
 if(ticket.kind!=='STRATEGY'){notice('Esta recomendación sirve para revisar contexto, no para cambiar una decisión.');return;}
 if(action!=='REJECT'){
  if(draft){notice('Confirma o cancela el borrador actual antes de elegir otra propuesta.');return;}
  const q=context.questions.find(q=>q.id===turn.result.questionId);
  if(!q||!ticket.proposedDecision){notice('Abre la sección correspondiente y consulta a Brando de nuevo.');return;}
  const targetBrand=brandId,proposal=turn.result.answer.suggestions[index];
  await closeBrando();openModule(q.module,false);
  await run(async()=>{
   const d=context.decisions.find(d=>d.questionId===q.id),v=context.versions.find(v=>v.id===d?.activeVersionId);
   let receipt;if(needsReview(context,d))receipt=await api('/api/reviews/start',{brandId:targetBrand,decisionId:d.id});
   await api('/api/questions/prepare',{brandId:targetBrand,questionId:q.id,expectedActiveVersion:v?.id??null});
   if(brandId!==targetBrand||selected!==q.module)return;
   draft={questionId:q.id,expectedActiveVersion:v?.id??null,selectedOption:ticket.proposedDecision,rationale:'',idempotencyKey:crypto.randomUUID(),reviewToken:receipt?.reviewToken,brandoReview:{ticketId,action},brandoSuggestion:proposal};
   brandoSuggestionDismissed=false;activeDecisionTab='overview';render();
   (action==='MODIFY'?$('#option'):$('#rationale')).focus();
  });return;
 }

 brandoFeedbackPending={ticketId,action,scope:currentBrandoScope(),brandId,text:turn.result.answer.suggestions[index]};
 $('#brando-feedback-title').textContent={ACCEPT:'Aceptar sugerencia',MODIFY:'Modificar sugerencia',REJECT:'Rechazar sugerencia'}[action];
 $('#brando-feedback-text').textContent=brandoPlainText(brandoFeedbackPending.text);
 $('#brando-feedback-rationale').value='';$('#brando-feedback-status').textContent='';
 $('#brando-target-field').hidden=action==='REJECT';$('#brando-target').required=action!=='REJECT';
 $('#brando-target').innerHTML='<option value="">Elige una sección</option>'+context.questions.map(q=>`<option value="${escape(q.id)}">${escape(labels[q.module]??q.module)}</option>`).join('');
 $('#brando-target').value=turn.result.questionId??'';
 $('#brando-feedback-save').textContent=action==='REJECT'?'Registrar rechazo':'Continuar a revisión';
 $('#brando-feedback-boundary').textContent=action==='REJECT'?'Tu motivo se registrará en Mi aprendizaje. La estrategia se conserva.':'Después revisarás la elección concreta y confirmarás una nueva versión. Ese cambio puede requerir revisar decisiones conectadas.';
 feedbackDialog.showModal();brandoPresence.setDialogOpen(true);$('#brando-feedback-rationale').focus();
}
$('#brando-conversation').addEventListener('click',event=>{const button=event.target.closest('[data-brando-ticket]');if(button)openBrandoFeedback(button.dataset.brandoTicket,button.dataset.brandoAction);});
$('#close-brando-feedback').addEventListener('click',()=>feedbackDialog.close());trapFocus(feedbackDialog);
feedbackDialog.addEventListener('close',()=>{brandoFeedbackPending=null;brandoPresence.setDialogOpen(brandoDialog.open);});
$('#brando-feedback-form').addEventListener('submit',async event=>{
 event.preventDefault();const pending=brandoFeedbackPending;if(!pending)return;
 const rationale=$('#brando-feedback-rationale').value.trim();if(rationale.length<10){$('#brando-feedback-status').textContent='Explica tu criterio con al menos diez caracteres.';return;}
 const q=context.questions.find(q=>q.id===$('#brando-target').value);
 if(pending.action!=='REJECT'&&!q){$('#brando-feedback-status').textContent='Elige la sección que quieres cambiar.';return;}
 if(pending.scope!==currentBrandoScope()){feedbackDialog.close();notice('El contexto cambió. Consulta de nuevo antes de revisar.');return;}
 $('#brando-feedback-save').disabled=true;
 try{
  if(pending.action==='REJECT'){
   await api('/api/brando/suggestions/review',{brandId:pending.brandId,review:{ticketId:pending.ticketId,action:'REJECT',rationale,revisedText:null}});
   feedbackDialog.close();for(const turn of brandoTurns)for(const ticket of turn.result.suggestionTickets??[])if(ticket.ticketId===pending.ticketId)ticket.reviewed=true;if(brandoTurns.at(-1)?.result.suggestionTickets?.[0]?.ticketId===pending.ticketId)brandoSuggestionDismissed=true;for(const button of document.querySelectorAll('[data-brando-ticket]'))if(button.dataset.brandoTicket===pending.ticketId)button.disabled=true;syncBrandoPresentation();notice('Rechazo y criterio registrados en Mi aprendizaje. La estrategia se conserva.');
  }
 }catch(error){$('#brando-feedback-status').textContent=error.code==='CONFLICT'?'El contexto cambió. Solicita una respuesta nueva.':'No se pudo registrar. Inténtalo de nuevo.';notice(error.code==='CONFLICT'?'El contexto cambió. Consulta de nuevo.':'No se pudo completar la revisión.');}
 finally{$('#brando-feedback-save').disabled=false;}
});
$('#brando-form').addEventListener('submit',async event=>{
 event.preventDefault();if(brandoBusy)return;
 const message=$('#brando-message').value.trim();if(!message)return;
 if(currentBrandoScope()!==brandoScope){resetBrando();brandoScope=currentBrandoScope();$('#brando-message').value=message;}
 const generation=++brandoGeneration,key=brandoScope,targetBrand=brandId,q=brandoQuestion();
 brandoVisualState='consulting';brandoBusy=true;syncBrandoPresentation();setBrandoBusy(true);$('#brando-status').textContent='Consultando el contexto autorizado de tu marca…';
 try{
  const interpretation=brandoInterpretation;brandoInterpretation=null;
  const result=await api('/api/brando/ask',{brandId:targetBrand,questionId:q,message,history:brandoTurns.slice(-4).map(t=>({question:t.question,answer:''})),...(interpretation?{interpretation}:{})},45000);
  if(generation!==brandoGeneration||key!==currentBrandoScope())return;
  if(result.error)throw new Error('Brando no pudo obtener una respuesta validada. Puedes continuar manualmente o volver a consultar.');
  const latest=await api(`/api/context?brandId=${encodeURIComponent(targetBrand)}`);
  if(generation!==brandoGeneration||key!==currentBrandoScope())return;
  if((latest.brandoContextVersion??latest.contextVersion)!==(result.sourceContextVersion??result.contextVersion)){context=latest;resetBrando();syncBrandoPresentation();$('#brando-status').textContent='El contexto cambió. Vuelve a consultar para usar la información actual.';return;}
  brandoVisualState='ready';brandoSuggestionDismissed=false;
  result.receivedAt=Date.now();brandoTurns.push({question:message,result});brandoTurns=brandoTurns.slice(-4);
  $('#brando-conversation').innerHTML=brandoTurns.map(t=>`<article class="brando-turn"><h3>Tu pregunta</h3><p>${escape(t.question)}</p>${brandoAnswerHtml(t.result)}</article>`).join('');
  $('#brando-conversation').querySelectorAll('[data-brando-module]').forEach(b=>b.addEventListener('click',async()=>{await closeBrando();if(b.dataset.brandoModule)openModule(b.dataset.brandoModule);else run(showHome);}));
  syncBrandoPresentation();
  expireBrandoActions();
  $('#brando-conversation').lastElementChild?.scrollIntoView({block:'start',behavior:'smooth'});
  $('#brando-message').value='';$('#brando-status').textContent='Respuesta disponible. La estrategia permanece sin cambios.';
  if(result.assistanceProof&&interpretation){brandoAssistanceProof={...result.assistanceProof,signalIds:interpretation.signalIds,hypothesisId:interpretation.hypothesisId??null,brandId:targetBrand};if(interpretation.hypothesisId&&$('#learning-hypothesis'))$('#learning-hypothesis').value=interpretation.hypothesisId;$('#brando-status').textContent='Respuesta disponible. Si propones un aprendizaje con estas señales, quedará registrado como asistido por Brando. Nada cambia sin tu revisión.';if($('#learning-form'))$('#learning-assist-note')?.removeAttribute('hidden');}
 }catch(error){
  if(generation!==brandoGeneration)return;
  brandoVisualState='unavailable';syncBrandoPresentation();
  $('#brando-status').textContent=error.code==='CONFLICT'?'El contexto cambió. Actualiza la vista y vuelve a consultar.':error.message;
  if(error.code==='AI_CONSENT_REQUIRED'&&aiNotice){
   const consent=$('#brando-consent');consent.hidden=false;consent.innerHTML=`<p>${escape(aiNotice.text)}</p><button type="button" class="secondary">Entiendo y acepto</button>`;
   consent.querySelector('button').onclick=async()=>{try{await api('/api/ai-notice/accept',{version:aiNotice.version});consent.hidden=true;$('#brando-status').textContent='Aviso aceptado. Puedes enviar tu consulta.';}catch(e){$('#brando-status').textContent=e.message;}};
  }
 }finally{
  if(generation===brandoGeneration){brandoBusy=false;setBrandoBusy(false);syncBrandoSection();}
 }
});
