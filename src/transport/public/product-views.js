// Pure presentation projections. No writes, requests, inferred strategic state or domain rules.
export const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Owner decision 2026-10-08 (ADR-0027): the visible name of `Market Arena` is «Mercado objetivo». The internal
// module key, schema, API, dependency graph and history keep `Market Arena`.
export const labels={'Strategic Objective':'Objetivo estratégico','Market Arena':'Mercado objetivo','Primary Customer':'Cliente principal','Value Mechanism':'Modelo de valor','Positioning':'Posicionamiento','Brand Promise':'Promesa de marca','Core Message':'Mensaje principal','GTM Priority':'Prioridad de lanzamiento','Priority Experiment':'Experimento prioritario'};
/** Plain-language question shown for a decision when it differs from the stored canonical question text. */
export const questionText={
 'Market Arena':'¿En qué mercado quieres competir?',
 'Primary Customer':'Dentro de ese mercado, ¿a qué tipo de cliente atenderás primero?'
};
export const questionHelp={
 'Market Arena':'Define el tipo de mercado, la necesidad que atenderás y su alcance geográfico, cuando sea relevante.'
};
export const fmt=value=>new Date(value).toLocaleString('es-MX',{dateStyle:'medium',timeStyle:'short'});
export const needsReview=(context,decision)=>!!decision&&(decision.reviewStatus==='NEEDS_REVIEW'||context.reviews.some(r=>r.downstreamDecisionId===decision.id&&r.status!=='COMPLETED'));
export function decisionState(context,question){
 const decision=context.decisions.find(d=>d.questionId===question.id);
 return {decision,version:context.versions.find(v=>v.id===decision?.activeVersionId),review:needsReview(context,decision)};
}
// One status vocabulary everywhere. «Vigente» is a display relation over the active version, never a Decision.status.
export function stateBadge(version,review){return `<span class="badge ${review?'warn':''}">${review?'Requiere revisión':version?'Vigente · v'+version.sequence:'Por decidir'}</span>`;}
// ADR-0030 · editorial status vocabulary (offers, deliverables, kit, site, campaign). Canonical values live in
// schemas/editorial-version; this is the only place that turns them into words. Never colour alone: always a word.
const EDITORIAL_WORDS={DRAFT:'Borrador',IN_REVIEW:'En revisión',CHANGES_REQUESTED:'Cambios solicitados',APPROVED:'Aprobada',SUPERSEDED:'Reemplazada'};
export function editorialStateBadge(status,sequence){const word=EDITORIAL_WORDS[status]??'';return `<span class="badge ${status==='CHANGES_REQUESTED'?'warn':''}">${escape(word)}${sequence?` · v${sequence}`:''}</span>`;}
// Block 8 · ADR-0031 operation and step status words (canonical values in schemas/external-job). Editorial,
// operation and provider states are always shown apart; «cancelled» is never shown for something already sent.
const JOB_WORDS={QUEUED:'En cola',CLAIMED:'Tomada por el worker',RUNNING:'En curso',SUCCEEDED:'Creada en pausa',FAILED:'No se creó',NEEDS_CHECK:'Pendiente de comprobación',PARTIAL:'Creada en parte',EXPIRED:'Autorización vencida',CANCELLED:'Cancelada antes de enviar'};
const STEP_STATE_WORDS={PENDING:'Pendiente',DISPATCHING:'Enviando',SUCCEEDED:'Creado',REJECTED:'Rechazado sin efecto',NEEDS_CHECK:'Pendiente de comprobación',NOT_CREATED:'No creado (comprobado)'};
export function operationBadge(kind,status){const word=(kind==='step'?STEP_STATE_WORDS:JOB_WORDS)[status]??'';return `<span class="badge ${['NEEDS_CHECK','FAILED','PARTIAL','EXPIRED','REJECTED'].includes(status)?'warn':''}">${escape(word)}</span>`;}
// PHASE4_SPEC §4.2 · PlanAction status words (canonical values in schemas/plan-action).
const ACTION_WORDS={PLANNED:'Planeada',IN_PROGRESS:'En curso',DONE:'Hecha',CANCELLED:'Cancelada'};
export function planActionBadge(status){return `<span class="badge">${escape(ACTION_WORDS[status]??'')}</span>`;}
// Display names for the canonical capability keys of the strategic method (config/strategic-method/learning-moments.v5.json).
const capabilityLabels={'Market Reasoning':'Razonamiento de mercado','Brand Thinking':'Pensamiento de marca','GTM Prioritization':'Priorización del lanzamiento','Experimentation & Learning':'Experimentación y aprendizaje','Customer Understanding':'Comprensión del cliente','Business Model Thinking':'Modelo de negocio','Strategic Differentiation':'Diferenciación estratégica','Message Prioritization':'Priorización del mensaje','Problem Framing':'Encuadre del problema'};
export const capabilityLabel=key=>capabilityLabels[key]??key;

const legacyCapabilityBehavior='Explicitó una elección y su criterio como Estratega de Marca.';
const personalizedCapabilityBehavior={
 'Market Reasoning':'Delimitaste dónde compite tu marca, frente a qué alternativas y con qué límites.',
 'Brand Thinking':'Definiste qué debe significar tu marca para tu cliente y qué puede esperar de ella.',
 'GTM Prioritization':'Elegiste dónde concentrar primero tus recursos para llegar a tu cliente y qué dejas para después.',
 'Experimentation & Learning':'Elegiste qué supuesto crítico validar primero y qué señal te diría si se sostiene.',
 'Customer Understanding':'Identificaste y priorizaste el segmento de cliente que consideras más relevante para tu marca.',
 'Business Model Thinking':'Relacionaste lo que ofreces con una necesidad concreta del cliente que quieres atender.',
 'Strategic Differentiation':'Articulaste una diferencia que puede ayudarte a ser elegido frente a otras alternativas.',
 'Message Prioritization':'Priorizaste una idea central para comunicar con mayor claridad el valor de tu marca.',
 'Problem Framing':'Definiste con mayor claridad qué problema estratégico necesitabas resolver.'
};
const capabilityBehavior=event=>
 event.behavior===legacyCapabilityBehavior
  ?personalizedCapabilityBehavior[event.capability]??'Tomaste una decisión estratégica y explicaste el criterio que utilizaste.'
  :event.behavior;
export function practiceHtml(events,limit){
 const counts=[...events.reduce((map,event)=>{
  map.set(event.capability,(map.get(event.capability)??0)+1);
  return map;
 },new Map())];

 const latestByCapability=[...events.reduce((map,event)=>{
  const current=map.get(event.capability);
  if(!current||new Date(event.occurredAt)>new Date(current.occurredAt))map.set(event.capability,event);
  return map;
 },new Map()).values()];

 const leastPracticed=counts.reduce(
  (current,item)=>!current||item[1]<current[1]?item:current,
  null
 );

 const challengeByCapability={
  'Customer Understanding':'Busca una señal real que confirme que ese segmento vive el problema que estás priorizando.',
  'Business Model Thinking':'Comprueba si el valor que propones resuelve una necesidad por la que alguien estaría dispuesto a actuar o pagar.',
  'Strategic Differentiation':'Compara tu propuesta con una alternativa real y detecta qué diferencia importa de verdad para tu cliente.',
  'Message Prioritization':'Prueba tu mensaje con alguien de tu audiencia y observa qué idea recuerda primero.',
  'Problem Framing':'Busca una evidencia que te ayude a distinguir el problema real de una posible suposición.'
 };

 return `<section class="learning-dashboard">
  <section class="learning-hero">
   <p class="eyebrow">Mi aprendizaje</p>
   <h3>Aprendes mientras construyes tu marca.</h3>
   <p>Cada decisión te ayuda a practicar una capacidad estratégica. Aquí puedes ver qué has ejercitado y qué conviene practicar después.</p>
  </section>

  ${counts.length?`
  <section class="learning-capabilities">
   <div class="section-heading">
    <div>
     <p class="eyebrow">Tu progreso</p>
     <h3>Capacidades que estás practicando</h3>
    </div>
   </div>

   <div class="learning-grid">
    ${counts.map(([key,count])=>`
     <article class="learning-card">
      <span class="learning-icon" aria-hidden="true">✦</span>
      <h3>${escape(capabilityLabel(key))}</h3>
      <p>${count===1?'La has practicado 1 vez.':`La has practicado ${count} veces.`}</p>
      <span class="badge">En práctica</span>
     </article>
    `).join('')}
   </div>
  </section>`:''}

  <section class="learning-evidence">
   <div class="section-heading">
    <div>
     <p class="eyebrow">Evidencia de práctica</p>
     <h3>Lo que has ejercitado</h3>
    </div>
    ${latestByCapability.length?`<span>${latestByCapability.length} capacidades</span>`:''}
   </div>

   ${latestByCapability.length
    ?latestByCapability.slice(0,limit).map(event=>{
      const count=counts.find(([key])=>key===event.capability)?.[1]??1;
      return `
      <article class="learning-evidence-item">
       <div class="learning-evidence-meta">
        <p class="eyebrow">${count===1?'Primera práctica':`${count} prácticas acumuladas`}</p>
        <span>${escape(fmt(event.occurredAt))}</span>
       </div>
       <h3>${escape(capabilityLabel(event.capability))}</h3>
       <p>${escape(capabilityBehavior(event))}</p>
       ${count>1?'<p class="learning-repeat">Has vuelto a practicar esta capacidad al revisar o tomar una nueva decisión.</p>':''}
      </article>`;
     }).join('')
    :`<section class="empty-state">
      <h3>Tu aprendizaje empieza con una decisión.</h3>
      <p>Elige una opción, explica por qué y Brandopolis empezará a registrar las capacidades que practicas.</p>
     </section>`}
  </section>

  ${leastPracticed?`
  <section class="learning-next">
   <p class="eyebrow">Tu siguiente reto</p>
   <h3>${escape(capabilityLabel(leastPracticed[0]))}</h3>
   <p>${escape(challengeByCapability[leastPracticed[0]]??'Busca una evidencia concreta que confirme o cuestione lo que hoy estás suponiendo.')}</p>
  </section>`:''}
 </section>`;
}
export function strategyMap(context){return `<section class="strategy-map"><div class="section-heading"><div><p class="eyebrow">Decisiones conectadas</p><h3>La estructura de tu marca</h3></div><span>${context.decisions.length} decisiones registradas</span></div><div class="strategy-cards">${context.questions.map((q,index)=>{const {version,review}=decisionState(context,q);return `<article class="strategy-card"><div class="strategy-index">${String(index+1).padStart(2,'0')}</div><h3>${escape(labels[q.module])}</h3><p>${escape(version?.selectedOption??'Todavía no has tomado esta decisión.')}</p><div class="strategy-card-footer">${stateBadge(version,review)}<button class="tertiary" data-strategy-module="${escape(q.module)}" aria-label="Abrir decisión de ${escape(labels[q.module].toLowerCase())}">Abrir →</button></div></article>`;}).join('')}</div></section>`;}
export function impactPair(context,review,question,version){
 const trigger=context.versions.find(v=>v.id===review.triggerVersionId),decision=context.decisions.find(d=>d.id===trigger?.decisionId),source=context.questions.find(q=>q.id===decision?.questionId);
 const before=context.versions.find(v=>v.id===trigger?.previousVersionId);
 return `<div class="impact-pair"><article><p class="eyebrow">01 · Decisión que cambió</p><h4>${escape(labels[source?.module]??'Decisión conectada')}</h4><span class="badge">Vigente · v${trigger?.sequence??''}</span>${before?`<div class="impact-before"><span>Antes · v${before.sequence}</span><p>${escape(before.selectedOption)}</p></div>`:trigger&&trigger.previousVersionId===null?'<div class="impact-before"><span>Antes</span><p>Sin decisión registrada</p></div>':''}<div class="impact-after"><span>Ahora</span><p>${escape(trigger?.selectedOption??'')}</p></div></article><span class="impact-link"><span class="impact-arrow" aria-hidden="true">→</span><span class="impact-relation">${review.dependencyType==='HARD'?'Dependencia estricta':'Dependencia sugerida'}</span></span><article><p class="eyebrow">02 · Decisión afectada</p><h4>${escape(labels[question.module])}</h4><span class="badge warn">Requiere revisión</span><p>${escape(version?.selectedOption??'')}</p><p class="impact-boundary">Conserva su versión. Tú decides si necesita un ajuste.</p></article></div>`;
}
/**
 * Connected decisions whose current version was approved after this decision's pending review opened and
 * that are not themselves the origin of a pending review (ADR-0022: a change folded into the existing review
 * instead of a duplicate). Read-only projection over recorded versions: it never infers or writes state.
 */
export function reviewUpdates(c,decision){
 if(!decision)return [];
 const triggers=c.reviews.filter(r=>r.downstreamDecisionId===decision.id&&r.status!=='COMPLETED').map(r=>c.versions.find(v=>v.id===r.triggerVersionId)).filter(Boolean);
 if(!triggers.length)return [];
 const since=Math.min(...triggers.map(v=>Date.parse(v.approvedAt)));
 return (c.dependencies??[]).filter(e=>e.downstreamDecisionId===decision.id).map(e=>{
  const up=c.decisions.find(d=>d.id===e.upstreamDecisionId),v=c.versions.find(x=>x.id===up?.activeVersionId),q=c.questions.find(x=>x.id===up?.questionId);
  return v&&q&&Date.parse(v.approvedAt)>since&&!triggers.some(t=>t.id===v.id)?{module:q.module,label:labels[q.module]??q.module,sequence:v.sequence,choice:v.selectedOption,rationale:v.rationale,kind:e.kind}:null;
 }).filter(Boolean);
}
export function reviewUpdatesHtml(updates){
 if(!updates.length)return '';
 return `<section class="review-updates" aria-labelledby="review-updates-title"><h4 id="review-updates-title">También cambió mientras esta revisión estaba pendiente</h4>${updates.map(u=>`<p><strong>${escape(u.label)} · Vigente · v${u.sequence}</strong> (${u.kind==='HARD'?'dependencia estricta':'dependencia sugerida'}): ${escape(u.choice)}</p><p class="hint">Criterio registrado: ${escape(u.rationale)}</p>`).join('')}<p class="hint">Se integra en esta misma revisión; no se abre otra. Tu decisión no cambia hasta que la confirmes.</p></section>`;
}
/* Strategic Intelligence (ADR-0025): presentation of the server's deterministic projection. Words carry every
   state; nothing here infers, writes or calls a provider. */
// Owner decision 2026-10-09: say what the rules found, never an empty «coherente» stamp.
const evaluatorWords={PASS:'No se detectan contradicciones relevantes entre tus decisiones actuales.',PASS_WITH_CAUTION:'Hay puntos entre tus decisiones que conviene revisar.',REVIEW_REQUIRED:'Hay contradicciones entre tus decisiones que conviene revisar.'};
const FEW_DECISIONS='Aún hay pocas decisiones definidas para evaluar su coherencia.';
const severityWords={CONFLICT:'Contradicción',REVIEW:'Requiere revisión',INFO:'Información'};
const supportWords={STRONG_SUPPORT:'Soporte fuerte',MODERATE_SUPPORT:'Soporte moderado',LIMITED_SUPPORT:'Soporte limitado',UNVALIDATED:'Sin validar'};
const geographyWords={LOCAL:'Local / ciudad',REGIONAL:'Regional',STATE:'Estatal',NATIONAL:'Nacional',LATAM:'Latinoamérica',GLOBAL:'Global'};
const moduleLabel=m=>labels[m]??m;
export function issueText(issue){
 const [a,b]=issue.modules.map(moduleLabel);
 return ({
  PENDING_REVIEW:[issue.severity==='REVIEW'?`${a} requiere revisión por un cambio conectado.`:`Se sugiere revisar ${a} por un cambio conectado.`,'Una decisión de la que depende cambió; tu elección se conserva hasta que la revises.'],
  MISSING_BASIS:[`${a} se decidió antes que ${b}, que es su base.`,`Define ${b} y comprueba que ${a} sigue alineada.`],
  INVALIDATED_UPSTREAM:[`${a} depende de ${b}, que fue invalidada.`,'Una base invalidada no sostiene la decisión que depende de ella.'],
  RELIES_ON_REJECTED_HYPOTHESIS:[`${a} se apoya en una hipótesis que rechazaste.`,'El supuesto que sostenía esta decisión ya no se considera válido.'],
  RELIES_ON_WEAKENED_HYPOTHESIS:[`${a} se apoya en una hipótesis que se debilitó.`,'La evidencia reciente no respalda el supuesto como antes.'],
  CONTEXT_CHANGED_AFTER_DECISION:['El ámbito geográfico que declaraste cambió después de decidir tu Mercado objetivo.','Tu Mercado objetivo no se modificó; comprueba si sigue vigente con el nuevo contexto.'],
  EXPERIMENT_NOT_PLANNED:['Elegiste tu experimento prioritario, pero aún no lo planeas.','Sin ejecución no habrá señales que revisar; planéalo en Experimentos y aprendizajes.'],
  VALIDATION_CHALLENGES_DECISION:[issue.severity==='CONFLICT'?`Rechazaste la hipótesis que ${a} puso a prueba.`:`Debilitaste la hipótesis que ${a} puso a prueba.`,'Tu decisión no cambió; revisa si sigue en pie con lo que aprendiste.']
 })[issue.kind]??[`${a}: revisa la coherencia.`,''];
}
export function intelligenceHtml(c){
 const i=c?.intelligence;if(!i)return '';
 const tensions=i.issues.filter(x=>x.kind!=='PENDING_REVIEW');
 const gaps=i.memory.filter(m=>m.activeVersionId&&m.support==='UNVALIDATED').length;
 const plan=i.reviewPlan.map(step=>{
  const why=step.triggers.map(t=>t.firstVersion?`${moduleLabel(t.module)} se registró por primera vez`:`${moduleLabel(t.module)} cambió a la versión ${t.sequence}`).join(' · ');
  const later=step.laterChanges.length?`<p class="hint">También cambió mientras estaba pendiente: ${escape(step.laterChanges.map(l=>`${moduleLabel(l.module)} (v${l.sequence})`).join(', '))}.</p>`:'';
  const follow=step.followUps.length?`<p class="hint">Después podrías revisar: ${escape(step.followUps.map(moduleLabel).join(', '))}. Nada cambia sin tu confirmación.</p>`:'';
  return `<li class="intelligence-step"><div><strong>${step.order}. ${escape(moduleLabel(step.module))}</strong> <span class="badge ${step.mandatory?'warn':''}">${step.mandatory?'Revisión obligatoria':'Revisión sugerida'}</span><p>Por qué ahora: ${escape(why)}.</p>${later}${follow}</div><button class="secondary" data-attention-module="${escape(step.module)}">Abrir ${escape(moduleLabel(step.module).toLowerCase())}</button></li>`;
 }).join('');
 const issues=tensions.map(x=>{const [what,why]=issueText(x);return `<li class="intelligence-issue" data-severity="${escape(x.severity)}"><div><span class="badge ${x.severity==='INFO'?'':'warn'}">${severityWords[x.severity]}</span> <strong>${escape(what)}</strong>${why?`<p class="hint">Por qué importa: ${escape(why)}</p>`:''}</div><button class="tertiary" data-attention-module="${escape(x.reviewFirst)}">Revisar ${escape(moduleLabel(x.reviewFirst).toLowerCase())}</button></li>`;}).join('');
 const changes=i.recentChanges.map(r=>`<li>${escape(moduleLabel(r.module))} · v${r.sequence} · ${escape(fmt(r.approvedAt))}</li>`).join('');
 return `<section class="intelligence-summary" aria-labelledby="intelligence-title" data-evaluator="${escape(i.evaluatorResult)}">
  <div class="section-heading"><div><p class="eyebrow">Inteligencia estratégica</p><h3 id="intelligence-title">Coherencia de tu estrategia</h3><p class="coherence-sentence">${escape(evaluatorLabel(i.evaluatorResult,c))}</p><p class="hint">Reglas del sistema sobre lo que registraste · sin consulta a la IA. Tú decides qué hacer con cada punto.</p></div>
  <button type="button" id="intelligence-ask-brando" class="secondary brando-action">Preguntar a Brando qué no está alineado</button></div>
  ${plan?`<h4>Orden de revisión recomendado</h4><ol class="intelligence-plan">${plan}</ol>`:'<p>No hay revisiones pendientes.</p>'}
  ${issues?`<h4>Tensiones detectadas</h4><ul class="intelligence-issues">${issues}</ul>`:'<p>No se detectaron tensiones en las reglas del sistema.</p>'}
  <details class="bp-disclosure"><summary><span>Cambios recientes y soporte de evidencia</span></summary><div class="bp-disclosure-body">${changes?`<ul>${changes}</ul>`:'<p>Aún no hay versiones nuevas.</p>'}<p>${gaps?`${gaps} ${gaps===1?'decisión vigente no tiene':'decisiones vigentes no tienen'} evidencia vinculada.`:'Las decisiones vigentes con evidencia vinculada se muestran en cada sección.'} El soporte describe la fuerza de lo registrado, no la probabilidad de acertar.</p></div></details>
 </section>`;
}
/** ADR-0026 · Validation & Learning. Pure presentation of the deterministic validation projection. */
export const hypothesisWords={UNTESTED:'Sin probar',TESTING:'En prueba',SUPPORTED:'Respaldada',WEAKENED:'Debilitada',REJECTED:'Rechazada'};
export const planQualityWords={READY:'Plan listo',READY_WITH_CAUTION:'Listo con cautela',REWORK:'Conviene replantear'};
export const planFindingWords={NO_HYPOTHESIS:'Falta la hipótesis.',EMPTY_OBJECTIVE:'Falta el objetivo.',EMPTY_SIGNAL:'Falta la señal esperada.',SIGNAL_NOT_OBSERVABLE:'La señal describe una opinión; conviene algo que puedas observar y registrar.',CIRCULAR_CRITERIA:'El criterio de éxito repite el objetivo o la señal.',NO_DISCONFIRMING_CRITERIA:'Define qué resultado te diría que la hipótesis no se sostiene.',NO_METHOD:'Describe cómo vas a observarlo.'};
export const directionWords={EXPECTED:'Esperada',CONTRARY:'Contraria',AMBIGUOUS:'Ambigua'};
export function nextValidationText(n,c){
 const h=c?.validation?.hypotheses?.find(x=>x.id===n.ref);
 const quote=h?`«${h.statement}»`:'';
 return ({
  REVIEW_LEARNING:['Revisa un aprendizaje pendiente.','Antes de crear más trabajo, decide si lo que interpretaste se sostiene.'],
  INTERPRET_SIGNALS:['Interpreta las señales registradas.','Una señal es una observación; todavía no es aprendizaje.'],
  RESOLVE_HYPOTHESIS:[`Revisa la hipótesis ${quote}.`,'Ya tienes un aprendizaje aceptado sobre ella; decide si queda respaldada, debilitada o rechazada.'],
  REVIEW_AFFECTED_DECISION:[`Revisa ${moduleLabel(n.module)}.`,`Se apoyaba en ${quote||'una hipótesis'} y lo que aprendiste la cuestiona. Nada cambia sin tu confirmación.`],
  RESOLVE_INCONCLUSIVE:['Un experimento quedó no concluyente.','Es un resultado válido: decide si lo replanteas o lo dejas así.'],
  TEST_ASSUMPTION_IN_USE:[`Pon a prueba ${quote}.`,`${moduleLabel(n.module)} la usa como supuesto y aún no tiene experimento.`],
  EXECUTE_PRIORITY_EXPERIMENT:['Planea tu experimento prioritario.','Ya elegiste qué validar primero; falta convertirlo en un plan.'],
  RETEST_WEAKENED:[`Considera volver a probar ${quote}.`,'Quedó debilitada; puede valer un experimento distinto.']
 })[n.kind]??['Siguiente validación.',''];
}
export function validationNextHtml(c,{withHeading=true}={}){
 const v=c?.validation;if(!v)return '';
 const items=v.nextValidation.slice(0,3);
 const counts=Object.entries(hypothesisWords).map(([k,w])=>[w,v.hypotheses.filter(h=>h.status===k).length]).filter(([,n])=>n);
 if(!items.length&&!v.hypotheses.length)return '';
 const list=items.map((n,i)=>{const [what,why]=nextValidationText(n,c);return `<li class="validation-step" data-kind="${escape(n.kind)}"><span class="badge ${i?'':'warn'}">${i?'Después':'Ahora'}</span> <strong>${escape(what)}</strong>${why?`<p class="hint">${escape(why)}</p>`:''}</li>`;}).join('');
 return `<section class="validation-next" aria-labelledby="validation-next-title">${withHeading?'<p class="eyebrow">Validación y aprendizaje</p>':''}<h3 id="validation-next-title">Siguiente validación recomendada</h3><p class="hint">Reglas del sistema · una recomendación, nunca una decisión.</p>${list?`<ol class="validation-steps">${list}</ol>`:'<p>No hay validaciones pendientes.</p>'}${withHeading?'<button type="button" class="secondary" id="validation-open">Ver siguiente validación</button>':''}${counts.length?`<p class="hint">Hipótesis: ${escape(counts.map(([w,n])=>`${n} ${w.toLowerCase()}`).join(' · '))}</p>`:''}</section>`;
}
export function planQualityHtml(q){
 if(!q)return '';
 return `<div class="plan-quality" data-quality="${escape(q.result)}"><span class="badge ${q.result==='READY'?'':'warn'}">${planQualityWords[q.result]}</span>${q.findings.length?`<ul>${q.findings.map(f=>`<li>${escape(planFindingWords[f]??f)}</li>`).join('')}</ul>`:''}<p class="hint">Revisión del sistema; tú decides si lo inicias.</p></div>`;
}
/** What the brand already declared, shown as context for a decision. Context reused is never a decision. */
export function declaredContextHtml(c,module){
 const items=c?.intelligence?.declaredContext?.[module]??[];
 if(!items.length)return '';
 const kindWords={GEOGRAPHY:'Alcance y mercado declarados',INITIAL_CONTEXT:'Lo que estás construyendo',GOAL:'Objetivo inmediato declarado',STAGE:'Punto de partida',COMPETITIVE_REFERENCES:'Referencias competitivas que aportaste'};
 const rows=items.map(item=>{
  if(item.kind==='GEOGRAPHY'){const geo=c.brandContext??{};return `${geo.geographicInfluence?`<dt>Alcance declarado</dt><dd>${escape(geographyWords[geo.geographicInfluence]??geo.geographicInfluence)}</dd>`:''}${geo.primaryMarket?`<dt>Mercado principal</dt><dd>${escape(geo.primaryMarket)}</dd>`:''}`;}
  return `<dt>${kindWords[item.kind]??'Contexto'}</dt><dd>${escape(item.text)}</dd>`;
 }).join('');
 const lead=module==='Market Arena'?'Este contexto es un punto de partida, no tu Mercado objetivo. Dónde operas o vendes orienta la decisión, pero no la define: elige el mercado, la necesidad que atenderás y frente a qué alternativas compites.':'Este contexto es un punto de partida, no tu decisión. Úsalo, ajústalo o descártalo con tu criterio.';
 return `<section class="declared-context" aria-labelledby="declared-context-title"><p class="eyebrow" id="declared-context-title">Lo que ya sabemos de tu marca</p><dl>${rows}</dl><p class="hint">${lead}</p></section>`;
}
/** Support and tensions for one decision, from the same projection. */
export function decisionIntelligenceHtml(c,module){
 const memory=c?.intelligence?.memory?.find(m=>m.module===module);
 const issues=(c?.intelligence?.issues??[]).filter(x=>x.kind!=='PENDING_REVIEW'&&x.modules.includes(module));
 if(!memory?.activeVersionId&&!issues.length)return '';
 const support=memory?.activeVersionId?`<p class="decision-support"><span class="label">Soporte registrado:</span> ${supportWords[memory.support]}${memory.support==='UNVALIDATED'?' · no hay evidencia vinculada a esta decisión.':'.'} <span class="hint">Describe la fuerza de lo registrado, no la probabilidad de acertar.</span></p>`:'';
 return `${support}${issues.map(x=>{const [what,why]=issueText(x);return `<p class="decision-tension"><span class="badge ${x.severity==='INFO'?'':'warn'}">${severityWords[x.severity]}</span> ${escape(what)} ${why?`<span class="hint">${escape(why)}</span>`:''}</p>`;}).join('')}`;
}
/** One plain sentence backed by the deterministic engine; with fewer than two decisions there is nothing to compare yet. */
export function evaluatorLabel(result,c){
 const defined=c?(c.decisions??[]).filter(d=>d.activeVersionId).length:2;
 if(defined<2&&result==='PASS')return FEW_DECISIONS;
 return evaluatorWords[result]??'';
}
/** Section-specific writing guide for the decision editor. Guidance only: it never fills or validates the text. */
export const decisionGuide={
 'Strategic Objective':'Incluye qué quieres construir o cambiar con tu marca y cómo reconocerás que avanzas. Es distinto de una meta comercial puntual.',
 'Market Arena':'Incluye el tipo de mercado, la necesidad que atenderás, frente a qué alternativas compites (también no hacer nada) y qué queda fuera. Tu ubicación no define por sí sola tu mercado objetivo.',
 'Brand Promise':'Incluye qué puede esperar tu cliente de tu marca y por qué es creíble hoy. Debe expresar tu posicionamiento; tu mensaje principal se apoyará en ella.',
 'GTM Priority':'Incluye dónde concentrarás primero tus recursos (canal, comunidad o alianza), por qué ahí llegas a tu cliente prioritario y qué dejas para después. Sin evidencia, el canal elegido es una hipótesis.',
 'Priority Experiment':'Incluye qué supuesto crítico validarás primero, por qué es el más riesgoso y qué señal observable te diría si se sostiene. La ejecución se planea y registra en «Validación».'
};
/** Shown when an existing brand lacks a journey section. Adding it is an explicit human action (ADR-0021). */
export function strategicSectionsHtml(label,missing=[label]){
 const names=missing.length>1?`${missing.slice(0,-1).join(', ')} y ${missing.at(-1)}`:missing[0];
 return `<section class="empty-state strategic-sections" aria-labelledby="strategic-sections-title"><p class="eyebrow">${escape(label)}</p><h2 id="strategic-sections-title">Esta sección es nueva en tu recorrido.</h2><p>Se agregarán a tu recorrido: ${escape(names)}, cada una en su lugar. Agregarlas no cambia ninguna decisión.</p><p>Cuando registres por primera vez una de estas decisiones, Brandopolis te pedirá revisar las decisiones conectadas que ya tomaste. Ninguna se reescribe: tú decides en cada revisión.</p><div class="actions"><button type="button" id="add-strategic-sections">Agregar estas secciones</button></div><p class="hint">Orientación del sistema · sin consulta a la IA</p></section>`;
}
export function historyHtml(versions,decision,userId){
 if(!versions.length)return '<section class="empty-state"><p class="eyebrow">Memoria por construir</p><h3>Tu primera decisión inicia esta historia.</h3><p>Cuando apruebes, podrás volver a tu elección, su criterio y cada versión anterior.</p></section>';
 const items=versions.map(h=>{const current=h.versionStatus!=='SUPERSEDED',next=versions.find(x=>x.previousVersionId===h.id);return `<li class="history-item ${current?'is-current':''}"><div class="version-marker">v${h.sequence}</div><article><div class="history-meta"><span class="badge ${current?'':'muted'}">${current?'Vigente':'Sustituida'}</span><time datetime="${escape(h.approvedAt)}">${escape(fmt(h.approvedAt))}</time><span>${h.actorUserId===userId?'Tú':'Persona autorizada'}</span></div><h4>${escape(h.selectedOption)}</h4><p><span class="label">Criterio de esta versión</span><br>${escape(h.rationale)}</p>${next?`<p class="lineage-note">Continúa en v${next.sequence} · esta versión permanece en el historial.</p>`:'<p class="lineage-note">Esta es la versión vigente de tu decisión.</p>'}</article></li>`;}).join('');
 return `<details class="history" open><summary>Versiones registradas</summary><div class="history-intro"><p class="eyebrow">Evolución estratégica</p><h3>El criterio detrás de cada cambio.</h3><p>Tu estrategia evoluciona. Su historia permanece.</p></div><ol class="timeline">${items}</ol>${decision?.reviewStatus==='NEEDS_REVIEW'?'<p class="hint">La versión actual requiere la revisión del Estratega de Marca por un cambio en una decisión conectada.</p>':''}</details>`;
}
/** ADR-0027 · Inicio. Deterministic next step from the real Brand state: human reviews and pending learning first,
 *  then validation impact, then the next undecided decision in journey order (which follows the HARD dependency
 *  path), then validation suggestions. A recommendation for the person, never an action. */
const shortCta={'Strategic Objective':'Definir objetivo','Market Arena':'Definir mercado','Primary Customer':'Definir cliente','Value Mechanism':'Definir modelo de valor','Positioning':'Definir posicionamiento','Brand Promise':'Definir promesa','Core Message':'Definir mensaje','GTM Priority':'Definir prioridad','Priority Experiment':'Elegir experimento'};
const stepCopy={
 'Strategic Objective':'Precisa qué quieres construir o cambiar con tu marca y cómo reconocerás que avanzas.',
 'Market Arena':'Elige en qué mercado quieres competir. Brando puede ayudarte a explorar posibilidades.',
 'Primary Customer':'Dentro de tu mercado, decide a qué tipo de cliente atenderás primero.',
 'Value Mechanism':'Conecta la necesidad de tu cliente con el valor que ofrecerás y cómo lo capturas.',
 'Positioning':'Define la diferencia por la que quieres ser elegido frente a otras alternativas.',
 'Brand Promise':'Expresa qué puede esperar tu cliente de tu marca y por qué es creíble hoy.',
 'Core Message':'Elige la idea central que comunicarás primero.',
 'GTM Priority':'Decide dónde concentrarás primero tus recursos para llegar a tu cliente.',
 'Priority Experiment':'Elige qué supuesto crítico validar primero y qué señal te diría si se sostiene.'
};
const definedVerb={'Strategic Objective':'Define tu objetivo estratégico','Market Arena':'Define tu mercado objetivo','Primary Customer':'Define tu cliente principal','Value Mechanism':'Define tu modelo de valor','Positioning':'Define tu posicionamiento','Brand Promise':'Define tu promesa de marca','Core Message':'Define tu mensaje principal','GTM Priority':'Define tu prioridad de lanzamiento','Priority Experiment':'Elige tu experimento prioritario'};
const VALIDATION_ISSUES=['RELIES_ON_REJECTED_HYPOTHESIS','RELIES_ON_WEAKENED_HYPOTHESIS','VALIDATION_CHALLENGES_DECISION'];
export function strategyProgress(c){
 const order=Object.keys(labels);
 const segments=order.map(module=>{const q=c.questions.find(x=>x.module===module);if(!q)return {module,state:'missing'};const {version,review}=decisionState(c,q);return {module,state:review?'review':version?'defined':'open'};});
 return {defined:segments.filter(s=>s.state==='defined'||s.state==='review').length,total:order.length,segments};
}
export function nextStep(c){
 const plan=c.intelligence?.reviewPlan??[],v=c.validation??{nextValidation:[],learningsAwaitingReview:[]};
 const mandatory=plan.find(s=>s.mandatory);
 if(mandatory){const why=mandatory.triggers.map(t=>labels[t.module]??t.module).join(', ');return {kind:'REVIEW',tone:'review',badge:'Revisión obligatoria',title:`Revisa tu ${(labels[mandatory.module]??mandatory.module).toLowerCase()}`,text:`${why||'Una decisión conectada'} cambió. Confirma si tu decisión sigue alineada; nada cambia sin tu confirmación.`,cta:`Abrir ${(labels[mandatory.module]??'').toLowerCase()}`,action:{type:'module',module:mandatory.module}};}
 const challenged=(c.intelligence?.issues??[]).find(i=>VALIDATION_ISSUES.includes(i.kind));
 if(challenged){const label=labels[challenged.reviewFirst]??challenged.reviewFirst;return {kind:'VALIDATION_IMPACT',tone:'review',badge:'Revisión estratégica',title:`Revisa tu ${label.toLowerCase()}`,text:'Una hipótesis en la que se apoya cambió después de lo que aprendiste. Tu decisión no se modificó: confirma si sigue en pie.',cta:`Abrir ${label.toLowerCase()}`,action:{type:'module',module:challenged.reviewFirst}};}
 const open=strategyProgress(c).segments.find(s=>s.state==='open');
 if(open)return {kind:'DECISION',tone:'decision',badge:'Siguiente decisión',title:definedVerb[open.module],text:stepCopy[open.module],cta:shortCta[open.module],action:{type:'module',module:open.module},brando:true};
 // Owner decision 2026-10-09: strategy is the main path. Optional validation work (a learning or a hypothesis to
 // resolve) follows the next decision instead of taking over Inicio; strategic reviews above still come first.
 if(v.learningsAwaitingReview?.length)return {kind:'LEARNING',tone:'review',badge:'Aprendizaje por revisar',title:'Revisa un aprendizaje pendiente',text:'Interpretaste señales de tus experimentos. Decide si el aprendizaje se sostiene antes de crear más trabajo.',cta:'Abrir validación',action:{type:'view',view:'validation'}};
 const resolve=v.nextValidation?.find(n=>n.kind==='RESOLVE_HYPOTHESIS');
 if(resolve)return {kind:'HYPOTHESIS',tone:'review',badge:'Hipótesis por revisar',title:'Revisa una hipótesis',text:'Ya tienes un aprendizaje aceptado sobre ella: decide si queda respaldada, debilitada o rechazada.',cta:'Abrir validación',action:{type:'view',view:'validation'}};
 const suggested=plan[0];
 if(suggested)return {kind:'SUGGESTED_REVIEW',tone:'review',badge:'Revisión sugerida',title:`Revisa tu ${(labels[suggested.module]??'').toLowerCase()}`,text:'Una decisión conectada cambió. Revisarla es opcional y nada cambia sin tu confirmación.',cta:`Abrir ${(labels[suggested.module]??'').toLowerCase()}`,action:{type:'module',module:suggested.module}};
 const validation=v.nextValidation?.[0];
 if(validation)return {kind:'VALIDATION',tone:'decision',badge:'Siguiente validación',title:'Comprueba lo que sostiene tu estrategia',text:'Tus nueve decisiones están definidas. Definida no significa validada: sigue con la validación recomendada.',cta:'Abrir validación',action:{type:'view',view:'validation'}};
 return {kind:'UP_TO_DATE',tone:'decision',badge:'Tu estrategia hoy',title:'Tu estrategia está al día',text:'Tus decisiones tienen una versión vigente y no hay revisiones pendientes. Revisa tu mapa o sigue aprendiendo del mercado.',cta:'Abrir mapa estratégico',action:{type:'view',view:'map'}};
}
/** What deserves attention, split into «Requiere tu decisión» and «Observación». Counts are real, never invented. */
export function attentionGroups(c,documentState={pending:0,candidateClaims:0,processed:0}){
 const decide=[],observe=[],plan=c.intelligence?.reviewPlan??[],v=c.validation??{};
 for(const step of plan.filter(s=>s.mandatory))decide.push({text:`${labels[step.module]??step.module} requiere revisión`,detail:`${step.triggers.map(t=>labels[t.module]??t.module).join(', ')||'Una decisión conectada'} cambió.`,action:{type:'module',module:step.module},label:'Revisar'});
 if(v.learningsAwaitingReview?.length)decide.push({text:v.learningsAwaitingReview.length===1?'Hay un aprendizaje pendiente de revisión':`Hay ${v.learningsAwaitingReview.length} aprendizajes pendientes de revisión`,detail:'Sólo tú puedes aceptarlo o rechazarlo.',action:{type:'view',view:'validation'},label:'Revisar'});
 for(const issue of (c.intelligence?.issues??[]).filter(i=>VALIDATION_ISSUES.includes(i.kind)))decide.push({text:`${labels[issue.reviewFirst]??issue.reviewFirst} se apoya en una hipótesis que cambió`,detail:'Tu decisión no se modificó.',action:{type:'module',module:issue.reviewFirst},label:'Revisar'});
 if(v.nextValidation?.some(n=>n.kind==='RESOLVE_HYPOTHESIS'))decide.push({text:'Una hipótesis tiene aprendizaje aceptado y espera tu revisión',detail:'Respaldada, debilitada o rechazada: tú decides.',action:{type:'view',view:'validation'},label:'Revisar'});
 if(documentState.candidateClaims)decide.push({text:`${documentState.candidateClaims} hallazgo${documentState.candidateClaims===1?'':'s'} de tus documentos por revisar`,detail:'Ningún hallazgo entra a tu contexto sin tu revisión.',action:{type:'view',view:'documents'},label:'Revisar'});
 for(const step of plan.filter(s=>!s.mandatory))observe.push({text:`Podrías revisar ${(labels[step.module]??step.module).toLowerCase()}`,detail:'Revisión sugerida por un cambio conectado.',action:{type:'module',module:step.module},label:'Ver observación'});
 for(const issue of (c.intelligence?.issues??[]).filter(i=>i.kind!=='PENDING_REVIEW'&&!VALIDATION_ISSUES.includes(i.kind))){const [what]=issueText(issue);observe.push({text:what,detail:'Observación de las reglas del sistema.',action:{type:'module',module:issue.reviewFirst},label:'Ver observación'});}
 const running=(c.experiments??[]).filter(e=>e.status==='RUNNING').length;
 if(running)observe.push({text:running===1?'Tu experimento continúa en ejecución':`${running} experimentos continúan en ejecución`,detail:'Registra lo que observes como señales.',action:{type:'view',view:'validation'},label:'Ver validación'});
 if(v.uninterpretedSignals?.length)observe.push({text:`${v.uninterpretedSignals.length} señal${v.uninterpretedSignals.length===1?'':'es'} sin interpretar`,detail:'Una señal es una observación; todavía no es aprendizaje.',action:{type:'view',view:'validation'},label:'Ver validación'});
 if(v.inconclusive?.length)observe.push({text:'Un experimento quedó no concluyente',detail:'Es un resultado válido; decide si lo replanteas.',action:{type:'view',view:'validation'},label:'Ver validación'});
 if(documentState.pending)observe.push({text:`${documentState.pending} documento${documentState.pending===1?'':'s'} pendiente${documentState.pending===1?'':'s'} de procesar`,detail:'Ya están guardados.',action:{type:'view',view:'documents'},label:'Procesar'});
 if((c.impacts??[]).some(i=>i.status==='IMPACT_PENDING'))decide.unshift({text:'Hay un impacto pendiente de cálculo',detail:'Abre una decisión para reintentarlo antes de otro cambio.',action:{type:'view',view:'map'},label:'Revisar'});
 return {decide,observe,mandatoryReviews:plan.filter(s=>s.mandatory).length};
}
const actionAttrs=a=>a.type==='module'?`data-attention-module="${escape(a.module)}"`:`data-home-action="${escape(a.view)}"`;
const attentionRow=(item,kind)=>`<li class="attention-item" data-kind="${kind}"><span class="attention-mark" aria-hidden="true"><svg class="ico" viewBox="0 0 24 24" focusable="false"><use href="#i-${kind==='decide'?'alert':'info'}"/></svg></span><p><span class="visually-hidden">${kind==='decide'?'Requiere tu decisión: ':'Observación: '}</span>${escape(item.text)}<small>${escape(item.detail)}</small></p><button type="button" class="link-action" ${actionAttrs(item.action)}>${escape(item.label)} <svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#i-arrow"/></svg></button></li>`;
export function attentionListHtml(c,documentState){
 const {decide,observe,mandatoryReviews}=attentionGroups(c,documentState);
 const clear=mandatoryReviews?'':`<li class="attention-item is-clear"><span class="attention-mark" aria-hidden="true"><svg class="ico" viewBox="0 0 24 24" focusable="false"><use href="#i-check"/></svg></span><p>Sin revisiones obligatorias pendientes</p></li>`;
 return `${decide.length?`<p class="attention-group-label">Requiere tu decisión</p><ul class="attention-items">${decide.map(i=>attentionRow(i,'decide')).join('')}</ul>`:''}${observe.length?`<p class="attention-group-label">Observación</p><ul class="attention-items">${observe.map(i=>attentionRow(i,'observe')).join('')}</ul>`:''}<ul class="attention-items">${clear}</ul>`;
}
// PHASE4_SPEC §4.9 · «¿Qué te gustaría trabajar primero con tu marca?». Intent ids mirror schemas/work-priority (v1).
// The priority orders suggestions only: it never hides an area, changes permissions or approves anything.
// PHASE4_SPEC §4.9/§4.10 (owner list 2026-10-11): eleven understandable choices. CONTENT is an earlier value, still
// shown with its name for brands that chose it before.
export const WORK_INTENTS=[['STRATEGY_FULL','Mi estrategia completa'],['STRATEGY_POINT','Un punto concreto de mi estrategia'],['SELL_OFFER','Mis productos y servicios'],['VISUAL_IDENTITY','Mi identidad visual'],['MARKETING_PLAN','Mi Plan de Marketing'],['SOCIAL_MEDIA','Mis redes sociales'],['WEBSITE','Mi sitio web'],['CAMPAIGN','Mis campañas digitales'],['SALES_MATERIALS','Mis materiales de venta'],['OTHER','Otro'],['HELP_ME_CHOOSE','No lo sé todavía']];
export const workIntentLabel=id=>[...WORK_INTENTS,['CONTENT','Crear contenidos o materiales']].find(([k])=>k===id)?.[1]??'';
/** Radio group (native keyboard support). `prefix` keeps ids unique when the group appears twice. «Otro» adds a note. */
export function workIntentFieldsHtml(prefix,current=null,note=''){
 const radio=([k,label])=>`<label class="work-intent-option"><input type="radio" name="${prefix}-intent" value="${k}"${current===k?' checked':''}> <span>${escape(label)}</span></label>`;
 return `<fieldset class="work-intent" data-prefix="${escape(prefix)}"><legend>¿Qué te gustaría trabajar primero con tu marca?</legend><p class="hint">Elige por dónde empezar. Ordena tus sugerencias; no oculta nada y puedes cambiarlo después.</p><div class="work-intent-options">${WORK_INTENTS.map(radio).join('')}</div><div class="work-intent-note"${current==='OTHER'?'':' hidden'}><label for="${prefix}-intent-note">Cuéntanos qué te gustaría trabajar <span class="hint">opcional</span></label><input id="${prefix}-intent-note" maxlength="500" value="${escape(note??'')}"></div></fieldset>`;
}
// Where an intent leads today. Areas of the next blocks are named honestly as not available yet; the suggestion falls
// back to the strategic decisions that prepare them. Never a button to a capability that does not exist.
const INTENT_GUIDE={
 MARKETING_PLAN:{area:'Marketing · Plan de Marketing',modules:['Strategic Objective','GTM Priority']},
 CAMPAIGN:{area:'Marketing · Campañas digitales',modules:['Primary Customer','Core Message']},
 CONTENT:{area:'Marketing · Redes sociales y materiales',modules:['Core Message','Brand Promise']},
 WEBSITE:{area:'Marketing · Sitio web',modules:['Positioning','Core Message']},
 VISUAL_IDENTITY:{area:'Marca y recursos · Identidad visual',modules:['Positioning','Brand Promise']},
 SELL_OFFER:{area:'Productos y servicios',modules:['Primary Customer','Value Mechanism']},
 SOCIAL_MEDIA:{area:'Marketing · Redes sociales',modules:['Core Message','Primary Customer']},
 SALES_MATERIALS:{area:'Productos y servicios · Materiales de venta',modules:['Value Mechanism','Core Message']}
};
/** Inicio · «Tu prioridad»: the saved priority, what it suggests now and a way to change it. Pure projection. */
export function priorityHtml(priority,context,available={}){
 const intent=priority?.intent??null;
 const decided=new Set(context.decisions.filter(d=>d.activeVersionId).map(d=>context.questions.find(q=>q.id===d.questionId)?.module));
 const moduleButtons=modules=>`<div class="priority-modules">${modules.map(m=>`<button type="button" class="secondary" data-attention-module="${escape(m)}">${escape(labels[m])}${decided.has(m)?' · Definida':''}</button>`).join('')}</div>`;
 let body;
 if(!intent) body=`<p>Aún no has elegido por dónde empezar. Elegirlo ordena las sugerencias de Inicio; no limita lo que puedes hacer.</p>`;
 else if(intent==='STRATEGY_FULL') body=`<p>Sigue el recorrido completo de las nueve decisiones. Tu siguiente paso aparece arriba.</p>`;
 else if(intent==='STRATEGY_POINT') body=`<p>Elige el punto de tu estrategia que quieres trabajar. No necesitas recorrer las nueve decisiones.</p>${moduleButtons(Object.keys(labels))}`;
 else if(intent==='OTHER') body=`<p>${priority.note?`Nos contaste: «${escape(priority.note)}». `:''}Elige el área más cercana cuando quieras; mientras tanto, tu siguiente paso aparece arriba.</p>`;
 else if(intent==='HELP_ME_CHOOSE'){
  const pending=Object.keys(labels).filter(m=>!decided.has(m)).slice(0,3);
  body=pending.length?`<p>Una base sólida empieza por la estrategia. Te sugerimos empezar por estas decisiones; tú eliges.</p>${moduleButtons(pending)}`:`<p>Tus nueve decisiones están definidas. Puedes elegir una prioridad concreta para ordenar el siguiente trabajo.</p>`;
 }
 else {
  const guide=INTENT_GUIDE[intent];
  body=available[intent]?`<p>Puedes empezar en <strong>${escape(guide.area)}</strong>.</p><div class="actions"><button type="button" data-priority-area="${escape(intent)}">Ir a ${escape(guide.area)}</button></div>`
   :`<p><strong>${escape(guide.area)}</strong> todavía no está disponible en tu espacio. Mientras tanto, estas decisiones preparan ese trabajo:</p>${moduleButtons(guide.modules)}`;
 }
 return `<section class="work-priority" aria-labelledby="work-priority-title"><div class="work-priority-head"><h3 id="work-priority-title">Tu prioridad</h3>${intent?`<p class="badge">${escape(workIntentLabel(intent))}</p>`:''}</div>${body}<details class="work-priority-change"><summary>${intent?'Cambiar prioridad':'Elegir prioridad'}</summary><form id="work-priority-form">${workIntentFieldsHtml('home',intent,priority?.note??'')}<p id="work-priority-status" role="status" aria-live="polite"></p><button type="submit">Guardar prioridad</button></form></details></section>`;
}
export function homeHtml(context,documentState={total:0,pending:0,processed:0,candidateClaims:0},priority=undefined,available={}){
 const step=nextStep(context),progress=strategyProgress(context);
 // Each segment opens its decision (owner decision 2026-10-09): number · name — state, for mouse, keyboard and touch.
 const segments=progress.segments.map((s,i)=>{const state=s.state==='defined'?'Definida':s.state==='review'?'Requiere revisión':s.state==='missing'?'No disponible':'Pendiente',name=`${String(i+1).padStart(2,'0')} · ${labels[s.module]} — ${state}`;return `<li class="${s.state==='defined'?'is-defined':s.state==='review'?'is-review':''}">${s.state==='missing'?`<span class="segment" title="${escape(name)}"><span class="visually-hidden">${escape(name)}</span></span>`:`<button type="button" class="segment" data-attention-module="${escape(s.module)}" aria-label="${escape(name)}" title="${escape(name)}"><span class="segment-tip" aria-hidden="true">${escape(name)}</span></button>`}</li>`;}).join('');
 return `<div class="ws-hero home-heading"><p class="eyebrow">Inicio</p><h2>Tu siguiente paso</h2><p class="ws-lead">Avanza con claridad, una decisión a la vez.</p></div>
 <section class="next-step" data-tone="${step.tone}" data-kind="${step.kind}" aria-labelledby="next-step-title"><div><p class="step-badge">${escape(step.badge)}</p><h3 id="next-step-title">${escape(step.title)}</h3><p>${escape(step.text)}</p><div class="actions"><button type="button" id="next-step-action" ${actionAttrs(step.action)}>${escape(step.cta)} <svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#i-arrow"/></svg></button>${step.brando?`<button type="button" id="next-step-brando" class="link-action brando-action" data-module="${escape(step.action.module)}">Explorar con Brando <svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#i-arrow"/></svg></button>`:''}</div></div><div class="next-step-art" aria-hidden="true"><img src="/brand/symbol-premium.webp" alt="" width="96" height="96"></div></section>
  ${priority===undefined?'':priorityHtml(priority,context,available)}
 <section class="strategy-progress" aria-label="Avance de tu estrategia"><p><strong>Estrategia de marca</strong> · <b>${progress.defined}</b> de ${progress.total} decisiones definidas</p><ol class="progress-segments" aria-label="Abrir una decisión">${segments}</ol><p class="hint">Definida no significa validada: describe completitud, no calidad ni evidencia.</p></section>
 <section class="home-attention" aria-labelledby="home-attention-title"><h3 id="home-attention-title">Lo que merece tu atención</h3>${attentionListHtml(context,documentState)}<div class="home-more"><button type="button" id="home-open-attention" class="link-action">Ver inteligencia estratégica completa</button><button type="button" id="attention-learning" class="link-action">Abrir validación</button><button type="button" id="attention-context" class="link-action">Abrir contexto estratégico</button>${documentState.pending||documentState.processed||documentState.candidateClaims?'<button type="button" id="attention-documents" class="link-action">Revisar documentos</button>':''}</div></section>`;
}
/** Rail · Atención: the whole deterministic picture on demand (Phase 2 intelligence + Phase 3 validation). */
export function railAttentionHtml(c){return `<section class="rail-attention"><p class="eyebrow">Qué requiere atención</p>${attentionListHtml(c)}</section>${intelligenceHtml(c)}${validationNextHtml(c,{withHeading:true})}`;}
/** Rail · Historial: versions of the open decision, or the latest changes of the brand. Deep history stays in each decision. */
export function railHistoryHtml(c,module){
 const q=module?c.questions.find(x=>x.module===module):null,d=q?c.decisions.find(x=>x.questionId===q.id):null;
 if(q){
  const versions=c.versions.filter(v=>v.decisionId===d?.id).sort((a,b)=>b.sequence-a.sequence);
  return `<p class="eyebrow">${escape(labels[module])}</p>${versions.length?`<ol class="rail-history-list">${versions.map(v=>`<li><strong>v${v.sequence}</strong> · ${escape(fmt(v.approvedAt))}${v.id===d.activeVersionId?' · <span class="badge">Vigente</span>':''}<p>${escape(v.selectedOption)}</p><p class="hint">Por qué: ${escape(v.rationale)}</p></li>`).join('')}</ol><button type="button" class="link-action" data-history-module="${escape(module)}">Ver historial completo</button>`:'<p class="hint">Aún no hay versiones de esta decisión.</p>'}`;
 }
 const latest=c.versions.slice().sort((a,b)=>new Date(b.approvedAt)-new Date(a.approvedAt)).slice(0,8);
 const moduleOf=v=>c.questions.find(x=>x.id===c.decisions.find(d=>d.id===v.decisionId)?.questionId)?.module;
 return `<p class="eyebrow">Cambios recientes de tu marca</p>${latest.length?`<ol class="rail-history-list">${latest.map(v=>`<li><strong>${escape(labels[moduleOf(v)]??'Decisión')}</strong> · v${v.sequence}<p class="hint">${escape(fmt(v.approvedAt))}</p><button type="button" class="link-action" data-attention-module="${escape(moduleOf(v)??'')}">Abrir decisión</button></li>`).join('')}</ol>`:'<p class="hint">Aún no hay decisiones registradas.</p>'}`;
}

/** Defensive display translation; canonical sources and their identifiers remain intact. */
export function brandoPlainText(text){
 const terms={HARD:'dependencia estricta',SOFT:'dependencia sugerida',INFORMATIVE:'conexión informativa',UNTESTED:'sin validar',UNVALIDATED:'sin validar',READY_FOR_DECISION:'lista para decidir',NEEDS_REVIEW:'requiere revisión',APPROVED:'aprobada por una persona',SUPERSEDED:'versión anterior','Fixture DEMO':'datos simulados de demostración',DEMO_FIXTURE:'demostración sin IA en vivo'};
 return String(text??'').replace(/\b(?:Fixture DEMO|DEMO_FIXTURE|READY_FOR_DECISION|NEEDS_REVIEW|UNVALIDATED|UNTESTED|INFORMATIVE|SUPERSEDED|APPROVED|HARD|SOFT)\b/g,value=>terms[value]);
}
/** Brando prose is always escaped; model output is never executable HTML or a navigation URL. */
export function brandoTicketExpired(ticket,receivedAt,now=Date.now()){
 const expires=ticket.expiresAt==null?receivedAt+15*60*1000:Date.parse(ticket.expiresAt);
 return !Number.isFinite(expires)||expires<=now;
}
/** Orientation projects recorded state. It is neither an AI answer nor a strategic verdict. */
export function brandoSectionOrientation(c,questionId){
 const q=c?.questions.find(q=>q.id===questionId);
 if(!q||!Object.hasOwn(labels,q.module))return null;
 const focus={
  'Strategic Objective':'Precisa qué quieres construir o cambiar y cómo reconocerás que avanzas, sin reducirlo a una sola cifra.',
  'Market Arena':'Delimita en qué mercado compites, frente a qué alternativas y qué queda fuera. Tu ubicación no define por sí sola tu mercado objetivo.',
  'Primary Customer':'Precisa a quién atender y qué problema necesitas comprobar.',
  'Value Mechanism':'Conecta el problema del cliente con el valor que ofrecerás.',
  Positioning:'Revisa por qué elegirían tu marca frente a otras alternativas.',
  'Brand Promise':'Define qué debe significar tu marca para tu cliente y qué puede esperar de ella; promete sólo lo que puedes cumplir.',
  'Core Message':'Expresa tu valor con claridad y evita promesas sin respaldo.',
  'GTM Priority':'Elige dónde concentrar primero tus recursos para llegar a tu cliente prioritario y qué dejas para después.',
  'Priority Experiment':'Elige qué supuesto crítico validar primero y qué señal observable te diría si se sostiene.'
 }[q.module];
 const {decision,version,review}=decisionState(c,q);
 let state='pending',message='Esta sección aún no tiene una decisión registrada.';
 if(c.impacts.some(i=>i.status==='IMPACT_PENDING')){state='impact';message='Hay un impacto pendiente de cálculo. Resuélvelo antes de confirmar otro cambio.';}
 else if(decision?.reviewStatus==='INVALIDATED'){state='invalidated';message='Esta decisión está invalidada. Revisa su estado antes de continuar.';}
 else if(review){state='review';message='Una decisión conectada cambió. Revisa esta sección antes de darla por vigente.';}
 else if(!(c.evidence.length||c.userInputs.length||c.learnings.some(l=>l.status==='ACCEPTED'))){state='context';message=version?'Hay una decisión registrada, pero no hay evidencia, información aportada ni aprendizajes aceptados en el contexto de la marca.':'Antes de decidir, aporta información de tu marca. Aún no hay evidencia, información aportada ni aprendizajes aceptados.';}
 else if(version){state='current';message='Tu decisión está registrada. Comprueba si sigue teniendo sentido con el contexto disponible.';}
 // Activation Analysis: GTM builds on Customer, Value, Positioning and Message; while any of them awaits review a proposal may be provisional.
 if(q.module==='GTM Priority'&&!['impact','invalidated'].includes(state)){
  const pending=['Primary Customer','Value Mechanism','Positioning','Core Message'].filter(m=>{const upstream=c.questions.find(x=>x.module===m);return upstream&&decisionState(c,upstream).review;}).map(m=>labels[m]);
  if(pending.length)message+=` ${pending.join(', ')} ${pending.length>1?'están':'está'} en revisión: cualquier propuesta para esta sección puede ser provisional.`;
 }
 // Priority Experiment: name the recorded, still-unvalidated hypotheses and those an approved decision relies on.
 // Execution stays in Experimentos y aprendizajes, where a signal only becomes learning after human review.
 if(q.module==='Priority Experiment'&&!['impact','invalidated'].includes(state)){
  const open=(c.hypotheses??[]).filter(h=>['UNTESTED','TESTING','WEAKENED'].includes(h.status));
  const inUse=new Set((c.versions??[]).filter(v=>v.versionStatus==='APPROVED').flatMap(v=>(v.hypothesisUsages??[]).filter(u=>u.assumptionInUse).map(u=>u.hypothesisId)));
  const used=open.filter(h=>inUse.has(h.id)).length;
  message+=open.length?` Hay ${open.length===1?'1 hipótesis sin validar':`${open.length} hipótesis sin validar`}${used?` (${used} ${used===1?'sostiene':'sostienen'} una decisión vigente)`:''}; elige cuál validar primero.`:' Aún no hay hipótesis registradas: anota en el contexto el supuesto que más te preocupa.';
  message+=version?' Planea y registra su ejecución en Validación; una señal no es aprendizaje hasta que la revises.':'';
 }
 const changes=review?[...c.reviews.filter(r=>r.downstreamDecisionId===decision.id&&r.status!=='COMPLETED').map(r=>{
  const changed=c.versions.find(v=>v.id===r.triggerVersionId),up=c.decisions.find(d=>d.id===changed?.decisionId),source=c.questions.find(q=>q.id===up?.questionId);
  return changed&&source?{label:labels[source.module]??'Decisión conectada',choice:changed.selectedOption,rationale:changed.rationale}:null;
 }).filter(Boolean),...reviewUpdates(c,decision).map(u=>({label:`${u.label} · v${u.sequence} (cambió después)`,choice:u.choice,rationale:u.rationale}))]:[];
 return {state,message,focus,changes,title:labels[q.module],query:`Ayúdame a explorar propuestas para ${labels[q.module]}. ${focus} Explica qué está registrado y qué falta comprobar; considera las decisiones conectadas y las revisiones pendientes. Propón alternativas concretas para esta pregunta cuando el contexto lo permita. Distingue hechos, hipótesis y límites; no apruebes ni cambies estrategia.`};
}
/** Brando's auxiliary card (owner decision 2026-10-08): compact, AFTER the decision's main card, one CTA that opens
 *  the contextual Brando already docked in the rail. The full system orientation stays one click away. */
export function brandoSectionHtml(orientation,{busy=false,hasAnswer=false}={}){
 if(!orientation)return '';
 const changes=orientation.changes.length?`<p><strong>Qué cambió en las decisiones conectadas</strong></p>${orientation.changes.map(change=>`<p><strong>${escape(change.label)}:</strong> ${escape(change.choice)}</p><p><strong>Criterio registrado:</strong> ${escape(change.rationale)}</p>`).join('')}`:'';
 return `<section id="brando-section" class="brando-section brando-aux" aria-labelledby="brando-section-title" data-orientation="${escape(orientation.state)}"><img src="/brando/idle.webp" width="40" height="40" alt=""><div class="brando-aux-copy"><p class="brando-aux-title" id="brando-section-title"><strong>Brando</strong> · Tu copiloto estratégico</p><p class="brando-aux-line">${hasAnswer?'Ya tienes propuestas de Brando para esta decisión.':'¿Quieres explorar otras posibilidades?'}</p><details class="brando-aux-more"><summary><span>Orientación · ${escape(orientation.title)}</span></summary><div class="brando-aux-body"><p>${escape(orientation.message)} ${escape(orientation.focus)}</p>${changes}<p class="hint">Orientación del sistema · sin consulta a la IA</p></div></details></div><button type="button" id="brando-section-explore" class="secondary brando-action" ${busy?'disabled aria-busy="true"':''}>${busy?'Pensando…':hasAnswer?'Ver propuestas de esta sección':'Explorar con Brando'} <svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#i-arrow"/></svg></button></section>`;
}
export function brandoSuggestionButtons(ticket,expired=false){
 if(ticket.reviewed)return '<p class="hint">Ya registraste tu criterio sobre esta propuesta.</p>';
 if(expired)return '<p class="hint">Esta propuesta venció. Consulta de nuevo para revisarla.</p>';
 const id=escape(ticket.ticketId);
 if(ticket.kind!=='STRATEGY')return `<button type="button" class="secondary" data-brando-ticket="${id}" data-brando-action="${ticket.kind==='EVIDENCE'?'EVIDENCE':'CONTEXT'}">${ticket.kind==='EVIDENCE'?'Revisar fuentes':'Abrir contexto'}</button>`;
 return `<div class="brando-review-actions">${['ACCEPT','MODIFY','REJECT'].map((action,j)=>`<button type="button" class="secondary" data-brando-ticket="${id}" data-brando-action="${action}">${['Llevar al borrador','Modificar','Descartar'][j]}</button>`).join('')}</div><p class="hint">Llevar al borrador no guarda ni aprueba: revisas, escribes tu criterio y confirmas tú.</p>`;
}
/** Brando answer, practical value first (owner decision 2026-10-09): each proposed alternative in bold and «Sin
 *  aprobar», then why it could work, then what to consider; evidence, attention and sources stay one click away.
 *  Every model string is escaped text: no model HTML ever reaches the page. Nothing here saves or approves. */
export function brandoAnswerHtml(result){
 const a=result.answer;
 if(!a)return '<p>No hay una respuesta validada disponible. Puedes continuar trabajando manualmente.</p>';
 const list=rows=>`<ul>${rows.map(t=>`<li>${escape(brandoPlainText(t))}</li>`).join('')}</ul>`;
 const section=(title,rows)=>rows.length?`<section><h3>${title}</h3>${list(rows)}</section>`:'';
 const proposals=a.suggestions.length?`<section class="brando-proposals" aria-label="Alternativas propuestas">${a.suggestions.map((text,i)=>`<article class="brando-proposal"><p class="brando-proposal-label">Alternativa propuesta <span class="proposal-chip">Sin aprobar</span></p><p class="brando-proposal-text"><strong>${escape(brandoPlainText(text))}</strong></p>${result.suggestionTickets?.[i]?brandoSuggestionButtons(result.suggestionTickets[i],brandoTicketExpired(result.suggestionTickets[i],result.receivedAt??Date.now())):''}</article>`).join('')}</section>`:'';
 const consider=[...a.hypotheses.map(h=>`Por validar: ${h}`),...a.limitations,...(result.omitted.length?[`Contexto parcial: se omitieron ${result.omitted.length} elementos por espacio; la respuesta no es exhaustiva.`]:[])];
 return `<p class="badge">${result.provider==='DEMO_FIXTURE'?'DEMO determinista · sin IA en vivo':'Asistencia estratégica · revisa con tu criterio'}</p>${proposals}
 <section class="brando-why"><h3>${a.suggestions.length?'Por qué podría funcionar':'Respuesta'}</h3><p>${escape(brandoPlainText(a.answer))}</p></section>
 ${consider.length?`<section class="brando-consider"><h3>Qué conviene considerar</h3>${list(consider)}</section>`:''}${section('Preguntas para ti',a.questions)}
 <details class="brando-more"><summary><span>Lo registrado, atención y fuentes</span></summary>${section('Lo registrado',a.facts.map(f=>`${f.text} (Fuentes: ${f.referenceIds.map(id=>result.sources.findIndex(s=>s.id===id)+1).join(', ')})`))}
 <section><h3>Qué necesita atención</h3>${result.attention.length?result.attention.map(i=>`<p>${escape(labels[i.module]??'Contexto y aprendizaje')}: ${escape(i.label)} <button type="button" class="tertiary" data-brando-module="${escape(i.module??'')}">Abrir</button></p>`).join(''):'<p>Sin pendientes en las categorías consultadas. Esto no certifica la calidad de la estrategia.</p>'}</section>
 ${result.sources.length?`<section><h3>Fuentes consultadas</h3>${result.sources.map((source,index)=>`<details><summary>Fuente ${index+1} · ${escape(brandoSourceLabel(source.type))}</summary>${brandoSourceHtml(source)}</details>`).join('')}</section>`:''}</details>`;
}

function brandoSourceLabel(type){return {Decision:'Decisión registrada',DecisionHistory:'Versión anterior',Evidence:'Evidencia',Hypothesis:'Hipótesis',Learning:'Aprendizaje aceptado',UserInput:'Información aportada',Brand:'Marca',OpenQuestion:'Pregunta abierta',Experiment:'Experimento',Signal:'Señal'}[type]??'Contexto registrado';}
function brandoSourceHtml(source){
 const d=source.data,record=d.version??d;
 const fields=[['Contenido',record.selectedOption??record.claim??record.statement??record.question??record.observation??record.name],['Versión',record.sequence],['Razón registrada',record.rationale],['Fuente',record.source],['Procedencia',record.provenance],['Fecha',record.sourceDate??record.approvedAt??record.createdAt??record.date??record.observedAt],['Límites',record.limitations]];
 return fields.filter(([,v])=>v!=null).map(([label,value])=>`<p><strong>${label}:</strong> ${escape(typeof value==='object'?JSON.stringify(value):value)}</p>`).join('')||'<p>Referencia disponible en el contexto de esta marca.</p>';
}

/** Local authorized context only; these projections never infer or write strategy. */
export function brandoContextHtml(c,questionId){
 if(!c)return '<p>Selecciona una marca para consultar su contexto.</p>';
 const question=c.questions.find(q=>q.id===questionId),decision=c.decisions.find(d=>d.questionId===questionId),version=c.versions.find(v=>v.id===decision?.activeVersionId);
 const attention=c.attention??[],evidence=c.evidence??[],hypotheses=c.hypotheses??[];
 const count=c.decisions.filter(d=>d.activeVersionId).length;
 const textRows=(rows,key)=>rows.slice(0,2).map(row=>`<li>${escape(row[key]??'Contenido registrado')}</li>`).join('');
 return `<section class="brando-context-card"><p class="eyebrow">Contexto actual</p><h3>${escape(question?labels[question.module]??question.module:'Tu estrategia hoy')}</h3>${question?stateBadge(version,needsReview(c,decision)):''}${version?`<p class="brando-current-choice">${escape(version.selectedOption)}</p><p><strong>Por qué:</strong> ${escape(version.rationale)}</p>`:question?'<p>Esta pregunta todavía no tiene una decisión vigente.</p>':'<p>Vista general de las decisiones y el contexto registrado de esta marca.</p>'}</section>
 <dl class="brando-context-counts"><div><dt>Decisiones vigentes</dt><dd>${count} de ${c.questions.length}</dd></div><div><dt>Evidencias</dt><dd>${evidence.length}</dd></div><div><dt>Hipótesis registradas</dt><dd>${hypotheses.length}</dd></div></dl>
 <details id="brando-attention-details" class="brando-context-detail"><summary>Qué necesita atención <span>${attention.length}</span></summary>${attention.length?`<ul>${attention.slice(0,4).map(item=>`<li><span>${escape(labels[item.module]??'Contexto de marca')} · ${escape(item.label)}</span><button type="button" class="tertiary" data-brando-module="${escape(item.module??'')}">Abrir</button></li>`).join('')}</ul>${attention.length>4?`<p>Y ${attention.length-4} pendientes más.</p>`:''}`:'<p>Sin pendientes en las categorías registradas. Esto no certifica la calidad de tu estrategia.</p>'}<button type="button" class="tertiary" data-brando-view="attention">Ver atención de la marca</button></details>
 <details class="brando-context-detail"><summary>Evidencia e hipótesis</summary><h4>Evidencia registrada</h4>${evidence.length?`<ul>${textRows(evidence,'claim')}</ul>`:'<p>Aún no hay evidencia registrada.</p>'}<h4>Hipótesis registradas</h4>${hypotheses.length?`<ul>${textRows(hypotheses,'statement')}</ul>`:'<p>Aún no hay hipótesis registradas.</p>'}<p class="hint">Registrar información no equivale a validarla. Revisa su origen y sus límites.</p><button type="button" class="tertiary" data-brando-view="context">Abrir contexto estratégico</button></details>`;
}

// ─── PHASE4_SPEC §4.1 · Productos y servicios (pure projections; operations live in app.js) ───
const GAP_WORDS={AUDIENCE:'A quién va dirigida',NEED:'Qué necesidad resuelve',BENEFITS:'Beneficios',PROOF:'Pruebas que la respalden'};
export function priceText(price){
 if(!price)return 'Sin precio registrado';
 let amount;try{amount=new Intl.NumberFormat('es-MX',{style:'currency',currency:price.currency}).format(price.amountMinor/100);}catch{amount=`${(price.amountMinor/100).toFixed(2)} ${price.currency}`;}
 const validity=price.validFrom||price.validUntil?` · vigencia ${price.validFrom??'—'} a ${price.validUntil??'sin fecha final'}`:'';
 return `${amount} · ${price.certainty==='ESTIMATED'?'Estimado, no confirmado':'Confirmado'}${validity}`;
}
function offerSummaryHtml(content){
 const rows=[['Para quién',content.audience.segment||(content.audience.customerDecisionVersionId?'Cliente principal definido':'')],['Necesidad',content.need],['Resultado buscado',content.outcome],['Beneficios',content.benefits.join(' · ')],['Diferencias',content.differentiators.join(' · ')],['Condiciones',content.conditions],['Precio',priceText(content.price)]].filter(([,v])=>v);
 return `<dl class="offer-facts">${rows.map(([k,v])=>`<div><dt>${escape(k)}</dt><dd>${escape(v)}</dd></div>`).join('')}</dl>`;
}
/** Offers list. Each card shows the approved version, the working draft, versions waiting for review and what is missing. */
export function offersHtml(offers){
 const card=o=>{
  const shown=o.approved??o.draft??o.inReview[0];
  const title=shown?.content.name??'Oferta';
  const parts=[];
  if(o.approved)parts.push(`<div class="offer-version"><p class="offer-version-head">${editorialStateBadge('APPROVED',o.approved.sequence)} <span class="hint">Versión que usan materiales, sitio y campañas.</span></p>${offerSummaryHtml(o.approved.content)}${o.approved.originOutdated.length?`<p class="offer-origin" role="note"><strong>Origen actualizado:</strong> una decisión que cita esta oferta tiene una versión más reciente. Revisa si conviene crear una versión nueva; nada se cambia solo.</p>`:''}</div>`);
  for(const v of o.inReview)parts.push(`<div class="offer-version"><p class="offer-version-head">${editorialStateBadge('IN_REVIEW',v.sequence)}</p>${offerSummaryHtml(v.content)}<form class="offer-decide" data-offer="${escape(o.id)}" data-version="${escape(v.id)}" data-fingerprint="${escape(v.fingerprint)}"><label for="offer-criterion-${escape(v.id)}">¿Por qué apruebas o pides cambios?</label><textarea id="offer-criterion-${escape(v.id)}" required minlength="10" maxlength="2000" rows="2"></textarea><div class="actions"><button type="submit" name="decision" value="APPROVE">Aprobar esta versión</button><button type="submit" name="decision" value="REQUEST_CHANGES" class="secondary">Pedir cambios</button></div></form></div>`);
  if(o.draft)parts.push(`<div class="offer-version"><p class="offer-version-head">${editorialStateBadge('DRAFT',o.draft.sequence)}</p>${offerSummaryHtml(o.draft.content)}${o.draft.gaps.length?`<p class="hint">Para que sea útil, aún falta: ${escape(o.draft.gaps.map(g=>GAP_WORDS[g]).join(', '))}.</p>`:''}${o.status==='ACTIVE'?`<div class="actions"><button type="button" class="secondary" data-offer-edit="${escape(o.id)}">Editar borrador</button><button type="button" data-offer-submit="${escape(o.id)}">Enviar a revisión</button></div>`:''}</div>`);
  const tail=o.status==='RETIRED'?'<p class="hint">Oferta retirada: se conserva con su historial y ya no se edita.</p>':`<div class="actions offer-tail">${!o.draft?`<button type="button" class="secondary" data-offer-new-draft="${escape(o.id)}">Crear una nueva versión</button>`:''}<button type="button" class="link-action" data-offer-retire="${escape(o.id)}">Retirar oferta</button></div>`;
  return `<article class="offer-card" data-offer-id="${escape(o.id)}" data-revision="${o.revision}"><header><p class="eyebrow">${shown?.content.kind==='PRODUCT'?'Producto':'Servicio'}</p><h3>${escape(title)}</h3></header>${parts.join('')}${tail}</article>`;
 };
 return `<div class="ws-hero"><p class="eyebrow">Productos y servicios</p><h2>Qué ofreces y por qué te elegirían</h2><p class="ws-lead">Cada oferta conecta a quién sirve, qué necesidad resuelve, qué resultado busca y qué la respalda.</p></div>
 <div class="actions"><button type="button" id="offer-new">Nueva oferta</button></div><div id="offer-editor"></div>
 ${offers.length?`<div class="offer-list">${offers.map(card).join('')}</div>`:'<p class="hint offer-empty">Aún no hay ofertas. Empieza con la que más te importa vender ahora; puedes completarla poco a poco.</p>'}`;
}
/** Offer form. Only references of this brand are offered (the server checks them again). */
export function offerFormHtml(c,content=null,offer=null){
 const v=content??{name:'',kind:'SERVICE',audience:{customerDecisionVersionId:null,segment:''},need:'',outcome:'',benefits:[],differentiators:[],conditions:'',proofIds:[],sourceDecisionVersionIds:[],hypothesisIds:[],price:null};
 const moduleOf=id=>c.questions.find(q=>q.id===c.decisions.find(d=>d.id===id)?.questionId)?.module;
 const activeVersions=c.decisions.filter(d=>d.activeVersionId).map(d=>c.versions.find(x=>x.id===d.activeVersionId)).filter(Boolean);
 const customer=activeVersions.find(x=>moduleOf(x.decisionId)==='Primary Customer');
 const check=(name,id,label,checked)=>`<label class="check-option"><input type="checkbox" name="${name}" value="${escape(id)}"${checked?' checked':''}> <span>${escape(label)}</span></label>`;
 const evidence=(c.evidence??[]).map(e=>check('proof',e.id,e.claim??e.source??'Evidencia',v.proofIds.includes(e.id))).join('');
 const decisions=activeVersions.map(x=>check('source',x.id,`${labels[moduleOf(x.decisionId)]??'Decisión'} · v${x.sequence}: ${x.selectedOption}`,v.sourceDecisionVersionIds.includes(x.id))).join('');
 const hypotheses=(c.hypotheses??[]).map(h=>check('hypothesis',h.id,h.statement??'Hipótesis',v.hypothesisIds.includes(h.id))).join('');
 const p=v.price;
 return `<form id="offer-form" class="offer-form" data-offer="${escape(offer?.id??'')}" data-revision="${offer?.revision??''}" novalidate>
 <h3>${offer?'Editar borrador':'Nueva oferta'}</h3>
 <label for="offer-name">Nombre</label><input id="offer-name" maxlength="160" required value="${escape(v.name)}">
 <label for="offer-kind">Tipo</label><select id="offer-kind"><option value="SERVICE"${v.kind==='SERVICE'?' selected':''}>Servicio</option><option value="PRODUCT"${v.kind==='PRODUCT'?' selected':''}>Producto</option></select>
 <fieldset><legend>Para quién</legend>${customer?`<label class="check-option"><input type="checkbox" id="offer-customer" value="${escape(customer.id)}"${v.audience.customerDecisionVersionId===customer.id?' checked':''}> <span>Usar tu cliente principal: ${escape(customer.selectedOption)}</span></label>`:'<p class="hint">Aún no hay un cliente principal definido; puedes describir el público aquí.</p>'}<label for="offer-segment">Segmento o público</label><input id="offer-segment" maxlength="500" value="${escape(v.audience.segment)}" placeholder="Ej. agencias pequeñas con clientes recurrentes"></fieldset>
 <label for="offer-need">¿Qué necesidad resuelve?</label><textarea id="offer-need" maxlength="1000" rows="2">${escape(v.need)}</textarea>
 <label for="offer-outcome">¿Qué resultado busca quien la compra?</label><textarea id="offer-outcome" maxlength="1000" rows="2">${escape(v.outcome)}</textarea>
 <label for="offer-benefits">Beneficios (uno por línea)</label><textarea id="offer-benefits" rows="3">${escape(v.benefits.join('\n'))}</textarea>
 <label for="offer-differentiators">Qué la diferencia (uno por línea)</label><textarea id="offer-differentiators" rows="2">${escape(v.differentiators.join('\n'))}</textarea>
 <label for="offer-conditions">Condiciones</label><textarea id="offer-conditions" maxlength="1500" rows="2">${escape(v.conditions)}</textarea>
 <fieldset><legend>Pruebas que la respaldan</legend>${evidence||'<p class="hint">Aún no hay evidencias registradas en esta marca.</p>'}</fieldset>
 <fieldset><legend>Decisiones de origen</legend>${decisions||'<p class="hint">Aún no hay decisiones definidas.</p>'}</fieldset>
 <fieldset><legend>Supuestos que usa (hipótesis)</legend>${hypotheses||'<p class="hint">Aún no hay hipótesis registradas.</p>'}</fieldset>
 <fieldset><legend>Precio <span class="hint">opcional</span></legend><label class="check-option"><input type="checkbox" id="offer-has-price"${p?' checked':''}> <span>Registrar un precio</span></label><div class="offer-price"${p?'':' hidden'}><label for="offer-amount">Monto</label><input id="offer-amount" inputmode="decimal" value="${p?(p.amountMinor/100).toFixed(2):''}"><label for="offer-currency">Moneda</label><input id="offer-currency" maxlength="3" value="${escape(p?.currency??'MXN')}"><label for="offer-valid-from">Vigente desde</label><input id="offer-valid-from" type="date" value="${escape(p?.validFrom??'')}"><label for="offer-valid-until">Vigente hasta</label><input id="offer-valid-until" type="date" value="${escape(p?.validUntil??'')}"><label for="offer-certainty">¿Qué tan seguro es?</label><select id="offer-certainty"><option value="ESTIMATED"${p?.certainty!=='CONFIRMED'?' selected':''}>Estimado</option><option value="CONFIRMED"${p?.certainty==='CONFIRMED'?' selected':''}>Confirmado</option></select></div></fieldset>
 <p id="offer-form-status" role="status" aria-live="polite"></p>
 <div class="actions"><button type="submit">${offer?'Guardar borrador':'Crear borrador'}</button><button type="button" class="secondary" id="offer-cancel">Cancelar</button></div></form>`;
}

// ─── PHASE4_SPEC §4.2 · Marketing → Plan de Marketing (pure projections; operations live in app.js) ───
const PLAN_GAP_WORDS={ANNUAL_OBJECTIVE:'un objetivo para el año',NINETY_DAY_PRIORITY:'al menos una prioridad para los próximos 90 días',ACTIONS:'acciones concretas',OWNER:'quién es responsable de cada acción',DATES:'fechas para cada acción',INDICATOR:'cómo sabrás si cada acción funcionó',MEASURE:'cómo medirás cada objetivo'};
const MONTHS=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const dayText=iso=>{if(!iso)return '';const [y,m,d]=iso.split('-').map(Number);return `${d} de ${MONTHS[m-1]} de ${y}`;};
export function moneyText(budget){
 if(!budget)return '';
 let amount;try{amount=new Intl.NumberFormat('es-MX',{style:'currency',currency:budget.currency}).format(budget.amountMinor/100);}catch{amount=`${(budget.amountMinor/100).toFixed(2)} ${budget.currency}`;}
 return `${amount} · ${budget.certainty==='ESTIMATED'?'estimado':'confirmado'}`;
}
const NEXT_STATUS={PLANNED:[['IN_PROGRESS','Empezar'],['CANCELLED','Cancelar']],IN_PROGRESS:[['DONE','Marcar como hecha'],['CANCELLED','Cancelar']],DONE:[],CANCELLED:[]};
const actionFacts=(a,offerName)=>[['Tipo',a.kind==='COMMERCIAL'?`Comercial${offerName?` · ${offerName}`:''}`:'Institucional (marca)'],['Responsable',a.owner],['Fechas',a.startDate||a.dueDate?`${a.startDate?dayText(a.startDate):'—'} a ${a.dueDate?dayText(a.dueDate):'sin fecha final'}`:''],['Presupuesto',moneyText(a.budget)],['Cómo se mide',a.indicator]].filter(([,v])=>v);
const factsHtml=facts=>`<dl class="offer-facts">${facts.map(([k,v])=>`<div><dt>${escape(k)}</dt><dd>${escape(v)}</dd></div>`).join('')}</dl>`;
/** One action. When it is part of the version shared with the client, a status change also shares its progress (with an optional note). */
function actionHtml(a,offers,shared=false){
 const offer=a.offerId?offers.find(o=>o.id===a.offerId):null;
 const open=a.status==='PLANNED'||a.status==='IN_PROGRESS';
 const note=shared&&open?`<label class="plan-note-label" for="progress-note-${escape(a.id)}">Nota de avance para el cliente <span class="hint">opcional</span></label><input id="progress-note-${escape(a.id)}" class="plan-note" maxlength="280" data-note-for="${escape(a.id)}">`:'';
 return `<li class="plan-action" data-action-id="${escape(a.id)}"><div class="plan-action-head">${planActionBadge(a.status)}<h4>${escape(a.title)}</h4>${shared?'<span class="hint">En la versión compartida</span>':''}</div>
 ${factsHtml(actionFacts(a,offer?.name))}
 ${open?`${note}<div class="actions">${NEXT_STATUS[a.status].map(([to,label])=>`<button type="button" class="${to==='CANCELLED'?'link-action':'secondary'}" data-action-status="${to}" data-action="${escape(a.id)}">${escape(label)}</button>`).join('')}<button type="button" class="secondary" data-action-edit="${escape(a.id)}">Editar</button></div>`:''}</li>`;
}
function actionsByMonth(actions,offers,sharedIds){
 const groups=new Map();
 for(const a of actions){const k=a.dueDate?a.dueDate.slice(0,7):'';if(!groups.has(k))groups.set(k,[]);groups.get(k).push(a);}
 const keys=[...groups.keys()].sort((x,y)=>x===''?1:y===''?-1:x.localeCompare(y));
 return keys.map(k=>`<section class="plan-month"><h4>${k?`${MONTHS[Number(k.slice(5,7))-1]} ${k.slice(0,4)}`:'Sin fecha'}</h4><ul class="plan-actions">${groups.get(k).map(a=>actionHtml(a,offers,sharedIds.has(a.id))).join('')}</ul></section>`).join('')||'<p class="hint">Aún no hay acciones.</p>';
}
const pad=n=>String(n).padStart(2,'0');
/** Days of a month (YYYY-MM) on which an action is active: from its start (or due) date to its due (or start) date. */
export function calendarDays(actions,month){
 const [y,m]=month.split('-').map(Number),last=new Date(Date.UTC(y,m,0)).getUTCDate(),days=[];
 for(let d=1;d<=last;d++){
  const iso=`${month}-${pad(d)}`;
  days.push({iso,day:d,weekday:(new Date(Date.UTC(y,m-1,d)).getUTCDay()+6)%7,actions:actions.filter(a=>{const from=a.startDate??a.dueDate,to=a.dueDate??a.startDate;return from&&from<=iso&&iso<=to;})});
 }
 return days;
}
/** Calendar of the same action records (no copies): a month grid on wide screens, an agenda list on small ones. */
function calendarHtml(actions,month){
 const [y,m]=month.split('-').map(Number);
 const prev=m===1?`${y-1}-12`:`${y}-${pad(m-1)}`,next=m===12?`${y+1}-01`:`${y}-${pad(m+1)}`;
 const days=calendarDays(actions,month);
 const chip=a=>`<button type="button" class="plan-chip" data-action-edit="${escape(a.id)}" ${a.status==='DONE'?'disabled':''}><span class="plan-chip-title">${escape(a.title)}</span><span class="plan-chip-meta">${escape(ACTION_WORDS[a.status]??'')}${a.owner?` · ${escape(a.owner)}`:''}</span></button>`;
 const cells=[...Array(days[0].weekday).fill(null),...days];
 while(cells.length%7)cells.push(null);
 const rows=[];for(let i=0;i<cells.length;i+=7)rows.push(cells.slice(i,i+7));
 const undated=actions.filter(a=>!a.startDate&&!a.dueDate);
 const busy=days.filter(d=>d.actions.length);
 return `<div class="plan-calendar"><div class="plan-calendar-nav"><button type="button" class="secondary" data-plan-month="${prev}" aria-label="Mes anterior">‹</button><h4 id="plan-calendar-title">${MONTHS[m-1]} ${y}</h4><button type="button" class="secondary" data-plan-month="${next}" aria-label="Mes siguiente">›</button></div>
 <table class="plan-calendar-grid" aria-labelledby="plan-calendar-title"><thead><tr>${['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d=>`<th scope="col">${d}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>c?`<td><span class="plan-day">${c.day}</span>${c.actions.map(chip).join('')}</td>`:'<td aria-hidden="true"></td>').join('')}</tr>`).join('')}</tbody></table>
 <ol class="plan-agenda" aria-label="Acciones de ${MONTHS[m-1]} ${y}">${busy.map(d=>`<li><p class="plan-agenda-day">${escape(dayText(d.iso))}</p>${d.actions.map(chip).join('')}</li>`).join('')||'<li class="hint">Sin acciones con fecha este mes.</li>'}</ol>
 ${undated.length?`<p class="hint">Sin fecha: ${undated.map(a=>escape(a.title)).join(' · ')}.</p>`:''}</div>`;
}
/** Version shared with the client: prepare, review (exact copy + criterion), approved version and pending changes. */
function sharingHtml(p){
 const s=p.sharing??{approved:null,inReview:null,changedSinceShared:null,history:[]};
 const prepare=`<button type="button" id="plan-share">Preparar versión para revisión</button>`;
 const review=s.inReview?`<div class="plan-review"><p><strong>Versión ${s.inReview.sequence} en revisión.</strong> Incluye ${s.inReview.content.objectives.length} objetivo(s) y ${s.inReview.content.actions.length} acción(es). Al aprobarla, es lo que verá el cliente.</p>${s.inReview.matchesPlan?'':'<p class="hint">El plan cambió después de preparar esta versión; lo que se aprueba es esta copia, no los cambios posteriores.</p>'}
 <form class="plan-share-decide" data-snapshot="${escape(s.inReview.id)}" data-fingerprint="${escape(s.inReview.fingerprint)}"><label for="plan-share-criterion">¿Por qué apruebas o pides cambios?</label><textarea id="plan-share-criterion" required minlength="10" maxlength="2000" rows="2"></textarea><div class="actions"><button type="submit" value="APPROVE">Aprobar y compartir esta versión</button><button type="submit" value="REQUEST_CHANGES" class="secondary">Pedir cambios</button></div></form></div>`:'';
 const approved=s.approved?`<p><strong>El cliente ve la versión ${s.approved.sequence}</strong>${s.approved.decidedAt?`, aprobada el ${escape(fmt(s.approved.decidedAt))}`:''}. El avance de las acciones se comparte sin volver a aprobar el plan.</p>${s.changedSinceShared?'<p class="plan-pending" role="note">Hay cambios en el plan que el cliente aún no ve. Para compartirlos, prepara una nueva versión y revísala.</p>':''}<button type="button" class="secondary" id="plan-shared-view">Ver lo que recibe el cliente</button>`:'<p>Aún no compartes este plan. Cuando esté listo, prepara una versión: es una copia fija que alguien revisa antes de compartirla.</p>';
 const canPrepare=!s.inReview&&(!s.approved||s.changedSinceShared);
 return `<section class="plan-block plan-sharing" aria-labelledby="plan-sharing-title"><h3 id="plan-sharing-title">Versión compartida con el cliente</h3>${approved}${review}${canPrepare?`<div class="actions">${prepare}</div>`:''}</section>`;
}
/** Plan de Marketing: annual objectives, 90-day priorities with their actions, other actions; list, month or calendar view. */
export function planHtml(data,mode='list',month=null){
 const head=`<div class="ws-hero"><p class="eyebrow">Marketing</p><h2>Plan de Marketing</h2><p class="ws-lead">Tu año en objetivos claros, con foco en los próximos 90 días: qué harás, quién se encarga, cuándo, cuánto cuesta y cómo sabrás si funcionó.</p></div>
 <div class="plan-year" role="group" aria-label="Año del plan"><button type="button" class="secondary" data-plan-year="${data.year-1}" aria-label="Ver el plan de ${data.year-1}">‹ ${data.year-1}</button><strong>Plan ${data.year}</strong><button type="button" class="secondary" data-plan-year="${data.year+1}" aria-label="Ver el plan de ${data.year+1}">${data.year+1} ›</button></div>`;
 if(!data.plan)return `${head}<div class="plan-empty"><p>Aún no hay plan para ${data.year}. Puedes empezarlo aunque tu estrategia no esté completa; te diremos qué falta.</p>
 <form id="plan-start" class="plan-inline-form"><label for="plan-focus-start">¿Desde qué día cuentan tus próximos 90 días? <span class="hint">opcional</span></label><input id="plan-focus-start" type="date"><button type="submit">Empezar el plan de ${data.year}</button></form></div>`;
 const p=data.plan;
 const sharedIds=new Set(p.sharing?.approved?.actionIds??[]);
 const active=p.objectives.filter(o=>o.status==='ACTIVE');
 const annual=active.filter(o=>o.horizon==='ANNUAL'),priorities=active.filter(o=>o.horizon==='NINETY_DAYS');
 const objective=o=>`<li class="plan-objective" data-objective-id="${escape(o.id)}"><p class="plan-objective-title">${escape(o.title)}</p>${o.measure?`<p class="hint">Cómo se mide: ${escape(o.measure)}</p>`:'<p class="hint">Falta decir cómo se medirá.</p>'}<div class="actions"><button type="button" class="secondary" data-objective-edit="${escape(o.id)}">Editar</button><button type="button" class="link-action" data-objective-archive="${escape(o.id)}">Archivar</button></div></li>`;
 const visible=p.actions.filter(a=>a.status!=='CANCELLED');
 const cancelled=p.actions.filter(a=>a.status==='CANCELLED');
 const priorityIds=new Set(priorities.map(o=>o.id));
 const others=visible.filter(a=>!priorityIds.has(a.objectiveId));
 const focus=p.focus?`Del ${dayText(p.focus.start)} al ${dayText(p.focus.end)}.`:'Aún no elegiste desde qué día cuentan los 90 días.';
 const item=a=>actionHtml(a,data.offers,sharedIds.has(a.id));
 const list=`${priorities.map(o=>`<section class="plan-priority"><h4>${escape(o.title)}</h4><ul class="plan-actions">${visible.filter(a=>a.objectiveId===o.id).map(item).join('')||'<li class="hint">Sin acciones todavía.</li>'}</ul></section>`).join('')}
 <section class="plan-priority"><h4>Otras acciones del año</h4><ul class="plan-actions">${others.map(item).join('')||'<li class="hint">Sin otras acciones.</li>'}</ul></section>`;
 const firstDated=visible.map(a=>a.startDate??a.dueDate).filter(Boolean).sort()[0];
 const calendarMonth=month??(p.focusStart??firstDated??`${data.year}-01-01`).slice(0,7);
 const body=mode==='month'?actionsByMonth(visible,data.offers,sharedIds):mode==='calendar'?calendarHtml(visible,calendarMonth):list;
 const modeButton=(id,label)=>`<button type="button" class="secondary" data-plan-mode="${id}" aria-pressed="${mode===id}">${label}</button>`;
 return `${head}
 ${p.gaps.length?`<div class="plan-gaps" role="note"><p><strong>Para que el plan sea útil, aún falta:</strong></p><ul>${p.gaps.map(g=>`<li>${escape(PLAN_GAP_WORDS[g])}</li>`).join('')}</ul></div>`:''}
 <section class="plan-block" aria-labelledby="plan-annual-title"><h3 id="plan-annual-title">Objetivos del año</h3><ul class="plan-objectives">${annual.map(objective).join('')||'<li class="hint">Aún no hay objetivos para el año.</li>'}</ul><button type="button" class="secondary" data-objective-new="ANNUAL">Añadir objetivo del año</button></section>
 <section class="plan-block" aria-labelledby="plan-focus-title"><h3 id="plan-focus-title">Prioridades de los próximos 90 días</h3><p class="plan-focus">${escape(focus)} <button type="button" class="link-action" id="plan-focus-edit">Cambiar</button></p><ul class="plan-objectives">${priorities.map(objective).join('')||'<li class="hint">Aún no hay prioridades para estos 90 días.</li>'}</ul><button type="button" class="secondary" data-objective-new="NINETY_DAYS">Añadir prioridad de 90 días</button></section>
 <div id="plan-editor"></div>
 <section class="plan-block" aria-labelledby="plan-actions-title"><div class="plan-actions-head"><h3 id="plan-actions-title">Acciones</h3><div class="plan-view" role="group" aria-label="Ver acciones">${modeButton('list','Por prioridad')}${modeButton('month','Por mes')}${modeButton('calendar','Calendario')}</div></div>
 <button type="button" id="plan-action-new">Añadir acción</button>
 ${body}
 ${cancelled.length?`<details class="plan-cancelled"><summary>Acciones canceladas (${cancelled.length})</summary><ul class="plan-actions">${cancelled.map(item).join('')}</ul></details>`:''}</section>
 ${sharingHtml(p)}
 <details class="plan-changes"><summary>Cambios recientes</summary><ul>${p.changes.map(c=>`<li>${escape(fmt(c.createdAt))} · ${escape({CREATE:'Creado',UPDATE:'Editado',STATUS:'Cambio de estado'}[c.operation]??'')} · ${escape(c.title)} <span class="hint">(revisión ${c.revision})</span></li>`).join('')}</ul></details>`;
}
/** What the client receives: the approved version exactly as approved, with the shared progress of its actions. Read only. */
export function sharedPlanHtml(data){
 const back='<button type="button" class="secondary" id="plan-back">Volver al plan</button>';
 if(!data.shared)return `<div class="ws-hero"><p class="eyebrow">Marketing · Plan de Marketing</p><h2>Lo que recibe el cliente</h2></div><p>Aún no hay una versión aprobada de este plan.</p>${back}`;
 const s=data.shared,c=s.content,progress=new Map(s.progress.map(x=>[x.actionId,x]));
 const objectives=h=>c.objectives.filter(o=>o.horizon===h);
 const objectiveList=list=>list.length?`<ul class="plan-objectives">${list.map(o=>`<li class="plan-objective"><p class="plan-objective-title">${escape(o.title)}</p>${o.measure?`<p class="hint">Cómo se mide: ${escape(o.measure)}</p>`:''}</li>`).join('')}</ul>`:'<p class="hint">Sin elementos.</p>';
 const action=a=>{const pr=progress.get(a.id);return `<li class="plan-action"><div class="plan-action-head">${planActionBadge(pr?.status??a.status)}<h4>${escape(a.title)}</h4></div>${factsHtml(actionFacts(a,a.offerName))}${pr?.note||pr?.date?`<p class="hint">Avance${pr.date?` del ${escape(dayText(pr.date))}`:''}${pr.note?`: ${escape(pr.note)}`:''}</p>`:''}</li>`;};
 return `<div class="ws-hero"><p class="eyebrow">Marketing · Plan de Marketing</p><h2>Lo que recibe el cliente</h2><p class="ws-lead">Versión ${s.sequence} del plan ${c.year}${s.approvedAt?`, aprobada el ${escape(fmt(s.approvedAt))}`:''}. Sólo lectura: los cambios internos posteriores no aparecen aquí hasta aprobar otra versión.</p></div>
 ${back}
 ${c.focus?`<p class="plan-focus">Próximos 90 días: del ${escape(dayText(c.focus.start))} al ${escape(dayText(c.focus.end))}.</p>`:''}
 <section class="plan-block"><h3>Objetivos del año</h3>${objectiveList(objectives('ANNUAL'))}</section>
 <section class="plan-block"><h3>Prioridades de los próximos 90 días</h3>${objectiveList(objectives('NINETY_DAYS'))}</section>
 <section class="plan-block"><h3>Acciones y avance</h3><ul class="plan-actions">${c.actions.map(action).join('')||'<li class="hint">Sin acciones.</li>'}</ul></section>`;
}
/** Objective form (annual objective or 90-day priority). */
export function objectiveFormHtml(horizon,o=null){
 return `<form id="objective-form" class="offer-form" novalidate><h3>${o?'Editar':'Añadir'} ${horizon==='ANNUAL'?'objetivo del año':'prioridad de 90 días'}</h3>
 <label for="objective-title">${horizon==='ANNUAL'?'¿Qué quieres lograr este año?':'¿Qué es lo más importante en estos 90 días?'}</label><input id="objective-title" maxlength="300" required value="${escape(o?.title??'')}">
 <label for="objective-measure">¿Cómo sabrás que lo lograste?</label><input id="objective-measure" maxlength="500" value="${escape(o?.measure??'')}" placeholder="Ej. clientes nuevos por mes">
 <p id="objective-form-status" role="status" aria-live="polite"></p><div class="actions"><button type="submit">Guardar</button><button type="button" class="secondary" data-editor-cancel>Cancelar</button></div></form>`;
}
/** 90-day window form. */
export function focusFormHtml(focusStart){
 return `<form id="focus-form" class="offer-form" novalidate><h3>Tus próximos 90 días</h3><label for="focus-start">¿Desde qué día cuentan?</label><input id="focus-start" type="date" value="${escape(focusStart??'')}"><p id="focus-form-status" role="status" aria-live="polite"></p><div class="actions"><button type="submit">Guardar</button><button type="button" class="secondary" data-editor-cancel>Cancelar</button></div></form>`;
}
/** Action form. A commercial action cites one of this brand's offers (the server checks it again). */
export function actionFormHtml(data,a=null){
 const p=data.plan,v=a??{title:'',kind:'INSTITUTIONAL',offerId:null,objectiveId:null,owner:'',startDate:null,dueDate:null,budget:null,indicator:''};
 const objectives=p.objectives.filter(o=>o.status==='ACTIVE'||o.id===v.objectiveId);
 const offers=data.offers.filter(o=>o.status==='ACTIVE'||o.id===v.offerId);
 const b=v.budget;
 return `<form id="action-form" class="offer-form" novalidate><h3>${a?'Editar acción':'Añadir acción'}</h3>
 <label for="action-title">¿Qué vas a hacer?</label><input id="action-title" maxlength="300" required value="${escape(v.title)}">
 <fieldset><legend>¿Sobre qué es?</legend><label class="check-option"><input type="radio" name="action-kind" value="INSTITUTIONAL"${v.kind!=='COMMERCIAL'?' checked':''}> <span>Sobre la marca en general</span></label><label class="check-option"><input type="radio" name="action-kind" value="COMMERCIAL"${v.kind==='COMMERCIAL'?' checked':''}> <span>Para vender una oferta</span></label>
 <div class="action-offer"${v.kind==='COMMERCIAL'?'':' hidden'}>${offers.length?`<label for="action-offer">Oferta</label><select id="action-offer"><option value="">Elige una oferta</option>${offers.map(o=>`<option value="${escape(o.id)}"${o.id===v.offerId?' selected':''}>${escape(o.name)}${o.approved?'':' (sin aprobar)'}</option>`).join('')}</select>`:'<p class="hint">Aún no hay ofertas. Créalas en Productos y servicios.</p>'}</div></fieldset>
 <label for="action-objective">¿A qué objetivo o prioridad ayuda?</label><select id="action-objective"><option value="">A ninguno en particular</option>${objectives.map(o=>`<option value="${escape(o.id)}"${o.id===v.objectiveId?' selected':''}>${o.horizon==='ANNUAL'?'Año':'90 días'} · ${escape(o.title)}</option>`).join('')}</select>
 <label for="action-owner">Responsable</label><input id="action-owner" maxlength="160" value="${escape(v.owner)}" placeholder="Nombre de quien se encarga">
 <div class="plan-dates"><div><label for="action-start">Empieza</label><input id="action-start" type="date" value="${escape(v.startDate??'')}"></div><div><label for="action-due">Termina</label><input id="action-due" type="date" value="${escape(v.dueDate??'')}"></div></div>
 <fieldset><legend>Presupuesto <span class="hint">opcional</span></legend><label class="check-option"><input type="checkbox" id="action-has-budget"${b?' checked':''}> <span>Registrar un presupuesto</span></label><div class="offer-price"${b?'':' hidden'}><label for="action-amount">Monto</label><input id="action-amount" inputmode="decimal" value="${b?(b.amountMinor/100).toFixed(2):''}"><label for="action-currency">Moneda</label><input id="action-currency" maxlength="3" value="${escape(b?.currency??'MXN')}"><label for="action-certainty">¿Qué tan seguro es?</label><select id="action-certainty"><option value="ESTIMATED"${b?.certainty!=='CONFIRMED'?' selected':''}>Estimado</option><option value="CONFIRMED"${b?.certainty==='CONFIRMED'?' selected':''}>Confirmado</option></select></div></fieldset>
 <label for="action-indicator">¿Cómo sabrás si funcionó?</label><input id="action-indicator" maxlength="500" value="${escape(v.indicator)}" placeholder="Ej. registros al webinar">
 <p id="action-form-status" role="status" aria-live="polite"></p><div class="actions"><button type="submit">Guardar acción</button><button type="button" class="secondary" data-editor-cancel>Cancelar</button></div></form>`;
}

// ─── PHASE4_SPEC §3 · area sub-navigation: accessible tabs; a selector on narrow screens. Only areas that exist. ───
const AREA_TABS={
 marketing:{label:'Marketing',tabs:[['plan','Plan de Marketing'],['social','Redes sociales'],['site','Sitio web'],['ads','Campañas digitales']],later:''},
 offers:{label:'Productos y servicios',tabs:[['offers','Ofertas'],['materials','Materiales de venta']],later:''},
 brand:{label:'Marca y recursos',tabs:[['identity','Identidad visual'],['guide','Guía de marca']],later:'Biblioteca y Plantillas llegarán más adelante.'}
};
export function areaTabsHtml(area,active){
 const a=AREA_TABS[area];
 return `<div class="area-nav"><div class="ws-tabs area-tabs" role="tablist" aria-label="${escape(a.label)}">${a.tabs.map(([k,l])=>`<button type="button" role="tab" id="area-tab-${k}" data-area-tab="${k}" aria-selected="${k===active}" tabindex="${k===active?0:-1}">${escape(l)}</button>`).join('')}</div>
 <label class="area-select-label" for="area-select">${escape(a.label)}: sección</label><select id="area-select" class="area-select">${a.tabs.map(([k,l])=>`<option value="${k}"${k===active?' selected':''}>${escape(l)}</option>`).join('')}</select>${a.later?`<p class="hint area-later">${escape(a.later)}</p>`:''}</div>`;
}

// ─── PHASE4_SPEC §4.4 · deliverables (pure projections; operations live in app.js) ───
const TYPE_WORDS={SALES_PRESENTATION:'Presentación comercial',OFFER_COPY:'Textos de producto o servicio',SOCIAL_POST:'Publicación para redes',AD:'Anuncio',DESIGN_BRIEF:'Brief para diseñador o Canva'};
const NETWORK_WORDS={INSTAGRAM:'Instagram',FACEBOOK:'Facebook',LINKEDIN:'LinkedIn',TIKTOK:'TikTok',X:'X',OTHER:'Otra red'};
const FORMAT_WORDS={POST:'Publicación',CAROUSEL:'Carrusel',REEL:'Reel',STORY:'Historia',VIDEO:'Video',ARTICLE:'Artículo'};
const CHANNEL_WORDS={GOOGLE:'Google',META:'Meta (Facebook e Instagram)',LINKEDIN:'LinkedIn',OTHER:'Otro canal'};
const AD_OBJECTIVE_WORDS={AWARENESS:'Que te conozcan',TRAFFIC:'Visitas al sitio',LEADS:'Contactos o solicitudes',SALES:'Ventas'};
const FOR_WORDS={DESIGNER:'Diseñador',CANVA:'Canva'};
const DELIVERABLE_GAP_WORDS={AUDIENCE:'a quién va dirigida',SLIDES:'al menos tres diapositivas',HEADLINE:'un título',SHORT:'un texto corto',CALL_TO_ACTION:'una llamada a la acción',TEXT:'el texto de la publicación',DATE:'la fecha prevista',OBJECTIVE:'para qué sirve',HEADLINES:'al menos tres títulos',DESCRIPTIONS:'una descripción',LANDING:'la página a la que lleva',MESSAGE:'el mensaje',FORMAT:'el formato o tamaño',ORIGIN:'de qué oferta o decisión nace'};
export const AREA_TYPES={materials:['SALES_PRESENTATION','OFFER_COPY','DESIGN_BRIEF'],social:['SOCIAL_POST'],ads:['AD']};
/** Plain text of a version, ready to copy or download (the only export available until PPTX/DOCX/PDF exist). */
export function deliverableText(c){
 const b=c.body,lines=[c.name,''];
 if(c.type==='SALES_PRESENTATION'){if(b.audience)lines.push(`Para: ${b.audience}`,'');b.slides.forEach((s,i)=>lines.push(`${i+1}. ${s.title}`,s.text,''));}
 if(c.type==='OFFER_COPY')lines.push(b.headline,'',b.short,'',b.long,'',b.callToAction);
 if(c.type==='SOCIAL_POST')lines.push(`${NETWORK_WORDS[b.network]} · ${FORMAT_WORDS[b.format]}${b.scheduledDate?` · ${b.scheduledDate}`:''}`,'',b.text,'',b.hashtags.join(' '),...(b.materials?['',`Materiales: ${b.materials}`]:[]));
 if(c.type==='AD')lines.push(`${CHANNEL_WORDS[b.channel]} · ${AD_OBJECTIVE_WORDS[b.objective]}`,'','Títulos:',...b.headlines.map(h=>`- ${h}`),'','Descripciones:',...b.descriptions.map(d=>`- ${d}`),'',b.callToAction,b.landingUrl??'');
 if(c.type==='DESIGN_BRIEF')lines.push(`Para: ${FOR_WORDS[b.for]}`,`Pieza: ${b.piece}`,`Formato: ${b.format}`,`Público: ${b.audience}`,`Mensaje: ${b.message}`,`Debe incluir: ${b.mustInclude}`,`Evitar: ${b.avoid}`,`Fecha de entrega: ${b.dueDate??'sin fecha'}`);
 return lines.join('\n').replace(/\n{3,}/g,'\n\n').trim()+'\n';
}
function deliverableSummary(c,offers){
 const b=c.body,offer=c.offerId?offers.find(o=>o.id===c.offerId):null,rows=[];
 if(offer)rows.push(['Oferta',offer.name]);
 if(c.type==='SALES_PRESENTATION')rows.push(['Para',b.audience],['Diapositivas',b.slides.map((s,i)=>`${i+1}. ${s.title}`).join(' · ')]);
 if(c.type==='OFFER_COPY')rows.push(['Título',b.headline],['Texto corto',b.short],['Llamada a la acción',b.callToAction]);
 if(c.type==='SOCIAL_POST')rows.push(['Red y formato',`${NETWORK_WORDS[b.network]} · ${FORMAT_WORDS[b.format]}`],['Fecha prevista',b.scheduledDate?dayText(b.scheduledDate):''],['Para qué',b.objective],['Texto',b.text],['Etiquetas',b.hashtags.join(' ')],['Materiales',b.materials]);
 if(c.type==='AD')rows.push(['Canal',CHANNEL_WORDS[b.channel]],['Objetivo',AD_OBJECTIVE_WORDS[b.objective]],['Títulos',b.headlines.join(' · ')],['Descripciones',b.descriptions.join(' · ')],['Lleva a',b.landingUrl??'']);
 if(c.type==='DESIGN_BRIEF')rows.push(['Para',FOR_WORDS[b.for]],['Pieza',b.piece],['Formato',b.format],['Mensaje',b.message],['Fecha de entrega',b.dueDate?dayText(b.dueDate):'']);
 return factsHtml(rows.filter(([,v])=>v));
}
const provenanceWord=p=>p==='AI_ASSISTED'?'Propuesta de Brando editada por una persona':'Escrito por una persona';
/** One deliverable: approved version (with copy/download and, for a social post, the manual publication record),
 *  versions in review (decision on the exact version), the working draft and what is missing. */
function deliverableCard(d,offers){
 const shown=d.approved??d.draft??d.inReview[0],name=shown?.content.name??'Material',parts=[];
 const exportBar=v=>`<div class="actions deliverable-export"><button type="button" class="secondary" data-export-version="${escape(v.id)}" data-export-format="pdf">Descargar PDF</button>${d.type==='SALES_PRESENTATION'?`<button type="button" class="secondary" data-export-version="${escape(v.id)}" data-export-format="pptx">Descargar PowerPoint</button>`:''}<button type="button" class="secondary" data-export-version="${escape(v.id)}" data-export-format="docx">Descargar Word</button><button type="button" class="tertiary" data-copy-version="${escape(v.id)}">Copiar texto</button><button type="button" class="tertiary" data-download-version="${escape(v.id)}">Descargar .txt</button></div><p class="hint">El documento muestra esta versión exacta con la identidad del kit con el que se escribió. Descargarlo no cambia ni aprueba nada.</p>`;
 if(d.approved){
  const v=d.approved;
  const pubs=d.type==='SOCIAL_POST'?`<div class="deliverable-publications"><h4>Publicación</h4>${d.publications.length?`<ul>${d.publications.map(p=>`<li>Publicada el ${escape(dayText(p.publishedOn))}${p.url?` · <a href="${escape(p.url)}" rel="noopener noreferrer" target="_blank">ver publicación</a>`:''}${p.note?` · ${escape(p.note)}`:''}</li>`).join('')}</ul>`:'<p class="hint">Aún no registras su publicación. Brandopolis no publica por ti: cuando la publiques, registra aquí la fecha.</p>'}
  <form class="publication-form" data-deliverable="${escape(d.id)}" data-version="${escape(v.id)}"><div class="plan-dates"><div><label for="pub-date-${escape(d.id)}">Fecha de publicación</label><input id="pub-date-${escape(d.id)}" type="date" required></div><div><label for="pub-url-${escape(d.id)}">Enlace <span class="hint">opcional, https://</span></label><input id="pub-url-${escape(d.id)}" type="url" maxlength="500" placeholder="https://"></div></div><label for="pub-note-${escape(d.id)}">Nota <span class="hint">opcional</span></label><input id="pub-note-${escape(d.id)}" maxlength="280"><div class="actions"><button type="submit" class="secondary">Registrar publicación</button></div></form></div>`:'';
  parts.push(`<div class="offer-version"><p class="offer-version-head">${editorialStateBadge('APPROVED',v.sequence)} <span class="hint">${escape(provenanceWord(v.provenance))}</span></p>${deliverableSummary(v.content,offers)}${v.originOutdated.length?'<p class="offer-origin" role="note"><strong>Origen actualizado:</strong> la oferta o una decisión en la que se basa tiene una versión más reciente. Revisa si conviene crear una versión nueva; nada se cambia solo.</p>':''}${exportBar(v)}${pubs}</div>`);
 }
 for(const v of d.inReview)parts.push(`<div class="offer-version"><p class="offer-version-head">${editorialStateBadge('IN_REVIEW',v.sequence)}</p>${deliverableSummary(v.content,offers)}<form class="deliverable-decide" data-deliverable="${escape(d.id)}" data-version="${escape(v.id)}" data-fingerprint="${escape(v.fingerprint)}"><label for="deliverable-criterion-${escape(v.id)}">¿Por qué apruebas o pides cambios?</label><textarea id="deliverable-criterion-${escape(v.id)}" required minlength="10" maxlength="2000" rows="2"></textarea><div class="actions"><button type="submit" value="APPROVE">Aprobar esta versión</button><button type="submit" value="REQUEST_CHANGES" class="secondary">Pedir cambios</button></div></form></div>`);
 if(d.draft)parts.push(`<div class="offer-version"><p class="offer-version-head">${editorialStateBadge('DRAFT',d.draft.sequence)} <span class="hint">${escape(provenanceWord(d.draft.provenance))}</span></p>${deliverableSummary(d.draft.content,offers)}${d.draft.gaps.length?`<p class="hint">Para que sea útil, aún falta: ${escape(d.draft.gaps.map(g=>DELIVERABLE_GAP_WORDS[g]).join(', '))}.</p>`:''}${d.status==='ACTIVE'?`<div class="actions"><button type="button" class="secondary" data-deliverable-edit="${escape(d.id)}">Editar borrador</button><button type="button" data-deliverable-submit="${escape(d.id)}">Enviar a revisión</button></div>`:''}</div>`);
 const tail=d.status==='RETIRED'?'<p class="hint">Retirado: se conserva con su historial y ya no se edita.</p>':`<div class="actions offer-tail">${!d.draft?`<button type="button" class="secondary" data-deliverable-new-draft="${escape(d.id)}">Crear una nueva versión</button>`:''}<button type="button" class="link-action" data-deliverable-retire="${escape(d.id)}">Retirar</button></div>`;
 return `<article class="offer-card deliverable-card" data-deliverable-id="${escape(d.id)}"><header><p class="eyebrow">${escape(TYPE_WORDS[d.type])}</p><h3>${escape(name)}</h3></header>${parts.join('')}${tail}</article>`;
}
const AREA_COPY={
 materials:{eyebrow:'Productos y servicios',title:'Materiales de venta',lead:'Presentaciones, textos de tus ofertas y briefs para quien diseña. Cada versión se revisa y aprueba antes de usarse.',empty:'Aún no hay materiales. Empieza por los textos de la oferta que más quieres vender.'},
 social:{eyebrow:'Marketing',title:'Redes sociales',lead:'Prepara tus publicaciones con su red, formato, fecha y texto. Se revisan y aprueban aquí; tú las publicas y registras la fecha.',empty:'Aún no hay publicaciones. Prepara la primera con su fecha prevista.'},
 ads:{eyebrow:'Marketing',title:'Campañas digitales',lead:'Prepara los textos de tus anuncios y tus campañas de Google y Meta. Cada versión se revisa y aprueba; en esta fase una campaña sólo se crea en pausa y con el simulador, sin gasto.',empty:'Aún no hay anuncios. Prepara los textos del primero.'}
};
/** Materials of one area. Social posts are grouped by planned month (same records, no copies). */
export function deliverablesHtml(area,list,offers){
 const copy=AREA_COPY[area],types=AREA_TYPES[area];
 const newButtons=types.map(t=>`<button type="button" class="${types.length>1?'secondary':''}" data-deliverable-new="${t}">Nuevo: ${escape(TYPE_WORDS[t])}</button>`).join('');
 let body;
 if(!list.length)body=`<p class="hint offer-empty">${escape(copy.empty)}</p>`;
 else if(area==='social'){
  const date=d=>(d.approved??d.draft??d.inReview[0])?.content.body.scheduledDate??'';
  const groups=new Map();for(const d of [...list].sort((x,y)=>(date(x)||'9999').localeCompare(date(y)||'9999'))){const k=date(d).slice(0,7);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(d);}
  body=[...groups].map(([k,ds])=>`<section class="plan-month"><h4>${k?`${MONTHS[Number(k.slice(5,7))-1]} ${k.slice(0,4)}`:'Sin fecha'}</h4><div class="offer-list">${ds.map(d=>deliverableCard(d,offers)).join('')}</div></section>`).join('');
 } else body=`<div class="offer-list">${list.map(d=>deliverableCard(d,offers)).join('')}</div>`;
 return `<div class="ws-hero"><p class="eyebrow">${escape(copy.eyebrow)}</p><h2>${escape(copy.title)}</h2><p class="ws-lead">${escape(copy.lead)}</p></div>
 <div class="actions deliverable-new">${newButtons}</div><p class="hint">Exportación disponible: copiar o descargar el texto. Presentación en PowerPoint o PDF y documento de Word llegarán más adelante.</p><div id="deliverable-editor"></div>${body}`;
}
/** Form of one deliverable type. Origin choices are only this brand's offers and active decision versions. */
export function deliverableFormHtml(type,ctx,offers,content=null,d=null){
 const c=content??{type,name:'',offerId:null,sourceDecisionVersionIds:[],body:{}},b=c.body;
 const moduleOf=id=>ctx.questions.find(q=>q.id===ctx.decisions.find(x=>x.id===id)?.questionId)?.module;
 const versions=ctx.decisions.filter(x=>x.activeVersionId).map(x=>ctx.versions.find(v=>v.id===x.activeVersionId)).filter(Boolean);
 const usable=offers.filter(o=>o.status==='ACTIVE'||o.id===c.offerId);
 const select=(id,label,map,value)=>`<label for="${id}">${label}</label><select id="${id}">${Object.entries(map).map(([k,l])=>`<option value="${k}"${k===value?' selected':''}>${escape(l)}</option>`).join('')}</select>`;
 const input=(id,label,value,extra='')=>`<label for="${id}">${label}</label><input id="${id}" value="${escape(value??'')}" ${extra}>`;
 const area=(id,label,value,extra='')=>`<label for="${id}">${label}</label><textarea id="${id}" rows="3" ${extra}>${escape(value??'')}</textarea>`;
 let fields='';
 if(type==='SALES_PRESENTATION')fields=`${input('dl-audience','¿Para quién es la presentación?',b.audience,'maxlength="500"')}${area('dl-slides','Diapositivas: una por bloque, con el título en la primera línea y una línea vacía entre diapositivas',(b.slides??[]).map(s=>`${s.title}\n${s.text}`).join('\n\n'),'rows="8"')}`;
 if(type==='OFFER_COPY')fields=`${input('dl-headline','Título',b.headline,'maxlength="160"')}${area('dl-short','Texto corto (para redes o tarjetas)',b.short,'maxlength="300"')}${area('dl-long','Texto largo (para tu sitio o catálogo)',b.long,'maxlength="3000" rows="6"')}${input('dl-cta','Llamada a la acción',b.callToAction,'maxlength="80" placeholder="Ej. Agenda una llamada"')}`;
 if(type==='SOCIAL_POST')fields=`<div class="plan-dates"><div>${select('dl-network','Red',NETWORK_WORDS,b.network??'INSTAGRAM')}</div><div>${select('dl-format','Formato',FORMAT_WORDS,b.format??'POST')}</div></div>${input('dl-objective','¿Para qué sirve esta publicación?',b.objective,'maxlength="300"')}${input('dl-date','Fecha prevista',b.scheduledDate,'type="date"')}${area('dl-text','Texto',b.text,'maxlength="2200" rows="5"')}${input('dl-hashtags','Etiquetas (separadas por espacios)',(b.hashtags??[]).join(' '),'maxlength="600"')}${area('dl-materials','Materiales necesarios (imagen, video, carrusel)',b.materials,'maxlength="1000" rows="2"')}`;
 if(type==='AD')fields=`<div class="plan-dates"><div>${select('dl-channel','Canal',CHANNEL_WORDS,b.channel??'GOOGLE')}</div><div>${select('dl-ad-objective','Objetivo',AD_OBJECTIVE_WORDS,b.objective??'TRAFFIC')}</div></div>${area('dl-headlines','Títulos (uno por línea)',(b.headlines??[]).join('\n'),'rows="4"')}${area('dl-descriptions','Descripciones (una por línea)',(b.descriptions??[]).join('\n'),'rows="3"')}${input('dl-ad-cta','Llamada a la acción',b.callToAction,'maxlength="80"')}${input('dl-landing','Página a la que lleva (https://)',b.landingUrl,'type="url" maxlength="500" placeholder="https://"')}`;
 if(type==='DESIGN_BRIEF')fields=`${select('dl-for','Para',FOR_WORDS,b.for??'DESIGNER')}${input('dl-piece','¿Qué pieza necesitas?',b.piece,'maxlength="300" required')}${input('dl-format-size','Formato o tamaño',b.format,'maxlength="200" placeholder="Ej. 1080×1350 para Instagram"')}${input('dl-brief-audience','¿A quién va dirigida?',b.audience,'maxlength="500"')}${area('dl-message','Mensaje principal',b.message,'maxlength="1000"')}${area('dl-must','Debe incluir',b.mustInclude,'maxlength="1000" rows="2"')}${area('dl-avoid','Evitar',b.avoid,'maxlength="1000" rows="2"')}${input('dl-due','Fecha de entrega',b.dueDate,'type="date"')}`;
 const offerField=usable.length?`<label for="dl-offer">${type==='OFFER_COPY'?'Oferta':'Oferta relacionada <span class="hint">opcional</span>'}</label><select id="dl-offer"><option value="">${type==='OFFER_COPY'?'Elige una oferta':'Ninguna'}</option>${usable.map(o=>`<option value="${escape(o.id)}"${o.id===c.offerId?' selected':''}>${escape(o.name)}${o.approved?'':' (sin aprobar)'}</option>`).join('')}</select>`:`<p class="hint">${type==='OFFER_COPY'?'Necesitas una oferta: créala primero en Productos y servicios.':'Aún no hay ofertas en esta marca.'}</p>`;
 const sources=versions.length?`<fieldset><legend>Decisiones en las que se basa <span class="hint">opcional</span></legend>${versions.map(v=>`<label class="check-option"><input type="checkbox" name="dl-source" value="${escape(v.id)}"${c.sourceDecisionVersionIds.includes(v.id)?' checked':''}> <span>${escape(labels[moduleOf(v.decisionId)]??'Decisión')} · v${v.sequence}: ${escape(v.selectedOption)}</span></label>`).join('')}</fieldset>`:'';
 return `<form id="deliverable-form" class="offer-form" data-type="${escape(type)}" novalidate><h3>${d?'Editar borrador':'Nuevo'} · ${escape(TYPE_WORDS[type])}</h3>${input('dl-name','Nombre',c.name,'maxlength="160" required')}${offerField}${fields}${sources}${d?'':`<section class="brando-marketing" aria-labelledby="dl-brando-title"><h4 id="dl-brando-title">¿Quieres una propuesta de Brando?</h4><p class="hint">Brando propone un borrador con tu información aprobada: decisiones vigentes, ofertas aprobadas y prioridades de 90 días. Tú lo editas y decides; nada se aprueba ni se publica solo.</p><label for="dl-request">¿Qué necesitas? <span class="hint">opcional</span></label><textarea id="dl-request" maxlength="1000" rows="2" placeholder="Ej. anunciar el lanzamiento con un tono cercano"></textarea><div class="actions"><button type="button" class="secondary brando-action" id="dl-ask-brando">Pedir una propuesta a Brando</button></div><div id="dl-brando-result" aria-live="polite"></div></section>`}<p id="deliverable-form-status" role="status" aria-live="polite"></p><div class="actions"><button type="submit">${d?'Guardar borrador':'Crear borrador'}</button><button type="button" class="secondary" data-editor-cancel>Cancelar</button></div></form>`;
}
/** Brando's marketing proposal: why, which approved information it used, what is missing and questions. Never applied by itself. */
export function brandoProposalHtml(r){
 if(!r.proposal)return `<p class="hint brando-unavailable">Brando no pudo proponer un borrador ahora. Puedes escribirlo tú: el formulario sigue disponible.</p>`;
 const p=r.proposal,c=p.content;
 const list=(title,items)=>items.length?`<p class="brando-list-title">${escape(title)}</p><ul>${items.map(i=>`<li>${escape(i)}</li>`).join('')}</ul>`:'';
 return `<div class="brando-proposal"><p class="eyebrow">${r.demo?'Propuesta de ejemplo (modo DEMO, no generada por IA)':'Propuesta de Brando · sin aprobar'}</p><p class="brando-proposal-name"><strong>${escape(c.name)}</strong></p><pre class="brando-proposal-text">${escape(deliverableText(c))}</pre><p><strong>Por qué:</strong> ${escape(p.rationale)}</p>${list('Información que usó',p.sources.map(s=>s.label).filter(Boolean))}${list('Lo que falta para afinarla',p.missing)}${list('Preguntas para ti',p.questions)}<div class="actions"><button type="button" id="dl-use-proposal">Usar esta propuesta en el formulario</button></div><p class="hint">Al usarla, el borrador queda marcado como propuesta de Brando editada por ti. Revísalo antes de enviarlo a revisión.</p></div>`;
}

// ─── ADR-0034 · Marca y recursos → Identidad visual (pure projections; operations live in app.js) ───
const CERTAINTY_WORDS={DECLARED:'Declarado, sin adoptar',ESTIMATED:'Estimado',PROPOSED:'Propuesto, sin adoptar',CONFIRMED:'Confirmado por una persona'};
export function certaintyBadge(c){return `<span class="badge ${c==='CONFIRMED'?'':'warn'}">${escape(CERTAINTY_WORDS[c]??'')}</span>`;}
const ROLE_WORDS={PRIMARY:'Principal',ACCENT:'Acento',BACKGROUND:'Fondo',TEXT:'Texto',SUPPORT:'Apoyo'};
const USE_WORDS={HEADINGS:'Títulos',BODY:'Texto corrido',ACCENT:'Destacados'};
const VARIANT_WORDS={PRIMARY:'Principal',ON_DARK:'Sobre fondo oscuro',MONOCHROME:'Monocromo',SYMBOL:'Símbolo',FAVICON:'Favicon',OTHER:'Otra'};
const CHANNEL_WORDS2={SOCIAL:'Redes sociales',WEBSITE:'Sitio web',ADS:'Anuncios',PRESENTATION:'Presentaciones',PRINT:'Impresos',CANVA:'Canva'};
const EMBED_WORDS={ALLOWED:'Permitido',NOT_ALLOWED:'No permitido',UNKNOWN:'Desconocido'};
const FILE_ROLE_WORDS={LOGO:'Logotipo',MANUAL:'Manual de marca (PDF)',FONT:'Fuente',REFERENCE:'Referencia',DESIGNER_DELIVERY:'Entrega de diseñador'};
const KIT_GAP_WORDS={PALETTE:'una paleta de colores',TONE:'el tono de la marca',PRIMARY_LOGO:'el logotipo principal',FAVICON:'un favicon o símbolo',WEB_FONT:'una tipografía que se pueda usar en la web (o una alternativa revisada)',CONTRAST_PAIRS:'las combinaciones de texto y fondo que usarás',DOCUMENT_FONT:'una tipografía que se pueda incrustar en documentos (o una alternativa revisada)',PRIMARY_COLOR:'un color principal'};
const originText=o=>o.kind==='DOCUMENT'?`Documento${o.page?`, página ${o.page}`:''}`:o.kind==='IMAGE'?'Muestreado de una imagen':o.kind==='BRANDO'?'Propuesta de Brando':o.kind==='DESIGNER'?'Diseñador':o.note?`${o.note}${o.page?` (antes: documento, página ${o.page})`:''}`:'Persona';
const sizeText=b=>b>1048576?`${(b/1048576).toFixed(1)} MB`:`${Math.max(1,Math.round(b/1024))} KB`;
function assetsHtml(assets,brandIdValue,reusable=[]){
 const row=f=>`<li class="kit-asset"><div class="kit-asset-preview">${f.previewable?`<img src="/api/brand-kit/assets/preview?brandId=${encodeURIComponent(brandIdValue)}&amp;assetId=${encodeURIComponent(f.id)}" alt="Vista previa de ${escape(f.originalName)}" loading="lazy">`:`<span class="hint">${f.format==='SVG'?'Un SVG no se muestra hasta sanearlo':'Sin vista previa'}</span>`}</div><div><p class="kit-asset-name">${escape(f.originalName)}</p><p class="hint">${escape(FILE_ROLE_WORDS[f.role]??'')} · ${escape(f.format)} · ${sizeText(f.bytes)}${f.width?` · ${f.width}×${f.height} px`:''}${f.alpha===true?' · Transparencia real':f.alpha===false?' · Sin transparencia':''}${f.format==='PNG'||f.format==='JPEG'||f.format==='WEBP'?' · Imagen de mapa de bits (no vectorial)':''}</p><p class="hint">Derechos: ${f.rights==='UNKNOWN'?'desconocidos':escape(f.rights)}</p></div></li>`;
 return `<section class="plan-block" aria-labelledby="kit-files-title"><h3 id="kit-files-title">Archivos de tu identidad</h3><p class="hint">Se guardan sin modificar y en privado. El formato se comprueba por el contenido del archivo, no por su nombre.</p>
 <form id="kit-upload" class="kit-upload"><label for="kit-file-role">¿Qué archivo es?</label><select id="kit-file-role">${Object.entries(FILE_ROLE_WORDS).map(([k,v])=>`<option value="${k}">${escape(v)}</option>`).join('')}</select><label for="kit-file">Archivo</label><input id="kit-file" type="file" accept=".png,.jpg,.jpeg,.webp,.svg,.pdf,.ttf,.otf,.woff,.woff2"><button type="submit" class="secondary">Subir archivo</button></form>
 ${reusable.length?`<div class="kit-reusable"><h4>Archivos que ya cargaste</h4><p class="hint">Los aportaste al preparar tu marca. Puedes usarlos aquí sin volver a subirlos.</p><ul>${reusable.map(d=>`<li><span>${escape(d.originalName)} · PDF · ${sizeText(d.bytes)}</span><button type="button" class="secondary" data-reuse-document="${escape(d.id)}">Usar como manual de marca</button></li>`).join('')}</ul></div>`:''}
 ${assets.length?`<ul class="kit-assets">${assets.map(row).join('')}</ul>`:'<p class="hint">Aún no hay archivos en tu identidad.</p>'}</section>`;
}
function kitValuesHtml(c,editable){
 const pick=(name,id)=>editable&&('certainty' in (c.palette.find(x=>x.id===id)??c.typography.find(x=>x.id===id)??c.logos.find(x=>x.id===id)??{}))?`<label class="check-option kit-adopt"><input type="checkbox" name="${name}" value="${escape(id)}"> <span>Adoptar</span></label>`:'';
 const palette=c.palette.map(p=>`<li class="kit-value"><span class="kit-swatch" data-hex="${escape(p.hex)}" aria-hidden="true"></span><div><p><strong>${escape(p.name)}</strong> · ${escape(p.hex)} · ${escape(ROLE_WORDS[p.role])}${p.reference?` · ${escape(p.reference)}`:''}</p><p class="hint">${certaintyBadge(p.certainty)} ${escape(originText(p.origin))}</p></div>${p.certainty!=='CONFIRMED'?pick('kit-adopt',p.id):''}</li>`).join('');
 const fonts=c.typography.map(f=>`<li class="kit-value"><div><p><strong>${escape(f.family)}</strong> · ${escape(USE_WORDS[f.use]??'')}${f.weights.length?` · pesos ${f.weights.join(', ')}`:''}</p><p class="hint">${certaintyBadge(f.certainty)} ${escape(originText(f.origin))} · Web: ${escape(EMBED_WORDS[f.webEmbedding])} · Documentos: ${escape(EMBED_WORDS[f.documentEmbedding])}${f.alternatives.length?` · Alternativas: ${f.alternatives.map(a=>`${escape(CHANNEL_WORDS2[a.channel])}: ${escape(a.family)}${a.reviewed?'':' (sin revisar)'}`).join('; ')}`:''}</p></div>${f.certainty!=='CONFIRMED'?pick('kit-adopt',f.id):''}</li>`).join('');
 const logos=c.logos.map(l=>`<li class="kit-value"><div><p><strong>${escape(VARIANT_WORDS[l.variant]??'')}</strong>${l.minWidthPx?` · ancho mínimo ${l.minWidthPx} px`:''}</p><p class="hint">${certaintyBadge(l.certainty)} ${escape(originText(l.origin))}</p></div>${l.certainty!=='CONFIRMED'?pick('kit-adopt',l.id):''}</li>`).join('');
 return `<div class="kit-values"><h4>Logotipos</h4>${logos?`<ul>${logos}</ul>`:'<p class="hint">Sin logotipos.</p>'}<h4>Colores</h4>${palette?`<ul>${palette}</ul>`:'<p class="hint">Sin colores.</p>'}<h4>Tipografías</h4>${fonts?`<ul>${fonts}</ul>`:'<p class="hint">Sin tipografías.</p>'}${c.verbal.tone?`<h4>Tono</h4><p>${escape(c.verbal.tone)}</p>`:''}<p class="hint">Canales: ${c.channels.length?escape(c.channels.map(x=>CHANNEL_WORDS2[x]).join(', ')):'sin indicar'} · Derechos: ${c.rights==='UNKNOWN'?'desconocidos (aprobar no acredita titularidad ni licencia)':escape(c.rights)}</p></div>`;
}
function contrastHtml(pairs,palette){
 if(!pairs.length)return '';
 const name=id=>palette.find(p=>p.id===id)?.name??id;
 return `<h4>Contraste de las combinaciones que usas</h4><ul class="kit-contrast">${pairs.map(p=>`<li><strong>${escape(name(p.text))}</strong> sobre <strong>${escape(name(p.background))}</strong>${p.use?` (${escape(p.use)})`:''}: ${p.ratio}:1 · texto normal ${p.normalText==='AA'?'cumple AA':'no cumple AA'} · texto grande ${p.largeText==='AA'?'cumple AA':'no cumple AA'}</li>`).join('')}</ul><p class="hint">Se mide cada combinación por separado; no se afirma la accesibilidad de toda la identidad.</p>`;
}
const gapsHtml=gaps=>gaps.length?`<div class="plan-gaps" role="note"><p><strong>Para los canales que usas, aún falta:</strong></p><ul>${gaps.map(g=>`<li>${g.channel==='ALL'?'':`${escape(CHANNEL_WORDS2[g.channel])}: `}${escape(KIT_GAP_WORDS[g.need]??g.need)}</li>`).join('')}</ul></div>`:'';
/** Identidad visual: three entries, files, the working draft, versions in review and the approved/published kit. */
export function identityHtml(data,brandIdValue,canPublish){
 const k=data.kit;
 const head=`<div class="ws-hero"><p class="eyebrow">Marca y recursos</p><h2>Identidad visual</h2><p class="ws-lead">Un solo kit de marca con logotipos, colores, tipografías y tono. Lo usan tus materiales, tu sitio y tus campañas.</p></div>`;
 const entries=`<div class="kit-entries"><article class="kit-entry"><h3>Ya tengo identidad</h3><p>Sube tu logotipo, tu manual o tus fuentes. Te mostraremos lo que encontramos, con su origen, para que lo revises y adoptes.</p><button type="button" data-kit-start="INGEST">Incorporar mi identidad</button></article><article class="kit-entry"><h3>Quiero completarla</h3>${k?.approved?'<p>Partimos de tu versión aprobada y vemos qué falta para los canales que usas. Nada aprobado cambia sin revisión.</p><button type="button" data-kit-start="COMPLETE">Completar mi identidad</button>':'<p>¿Tienes sólo una parte, como el logotipo o algunos colores? Empieza con lo que tienes y te mostramos lo que falta para tus canales.</p><button type="button" data-kit-start="INGEST" data-kit-partial="true">Empezar con lo que tengo</button>'}</article><article class="kit-entry"><h3>Quiero crearla</h3><p>Desde tu estrategia definimos colores, tipografías y tono. El recorrido termina con un kit utilizable y aprobado, no con un tablero de inspiración.</p><button type="button" data-kit-start="CREATE">Crear mi identidad</button></article></div>`;
 if(!k)return `${head}${entries}${assetsHtml(data.assets,brandIdValue,data.reusable)}`;
 const parts=[];
 if(k.approved){const v=k.approved;parts.push(`<section class="plan-block"><h3>Kit aprobado · versión ${v.sequence}</h3><p class="hint">${k.published?`Publicado: versión ${k.published.sequence}${k.published.id===v.id?' (la misma)':' (otra versión; publicar es un paso aparte)'}.`:'Aún no publicado. Publicar es un paso aparte de aprobar.'}</p>${kitValuesHtml(v.content,false)}${contrastHtml(v.contrast,v.content.palette)}${gapsHtml(v.gaps)}${k.impact.length?`<div class="offer-origin" role="note"><strong>Materiales con una versión anterior del kit:</strong> ${escape(k.impact.map(i=>i.name).join(', '))}. No se cambian solos; revisa si conviene una versión nueva.</div>`:''}${canPublish&&k.published?.id!==v.id?`<div class="actions"><button type="button" id="kit-publish" data-version="${escape(v.id)}" data-fingerprint="${escape(v.fingerprint)}">Publicar esta versión</button></div>`:''}${!canPublish?'<p class="hint">Publicar el kit requiere un permiso propio que concede quien administra la agencia.</p>':''}</section>`);}
 for(const v of k.inReview)parts.push(`<section class="plan-block"><h3>${editorialStateBadge('IN_REVIEW',v.sequence)}</h3>${kitValuesHtml(v.content,false)}${contrastHtml(v.contrast,v.content.palette)}<form class="kit-decide" data-version="${escape(v.id)}" data-fingerprint="${escape(v.fingerprint)}"><label for="kit-criterion-${escape(v.id)}">¿Por qué apruebas o pides cambios?</label><textarea id="kit-criterion-${escape(v.id)}" required minlength="10" maxlength="2000" rows="2"></textarea><div class="actions"><button type="submit" value="APPROVE">Aprobar esta versión</button><button type="submit" value="REQUEST_CHANGES" class="secondary">Pedir cambios</button></div></form></section>`);
 if(k.draft){const v=k.draft;const diff=v.diff?`<p class="hint">Cambios frente a la versión aprobada: ${v.diff.added.length} añadidos, ${v.diff.changed.length} modificados, ${v.diff.removed.length} quitados.</p>`:'';const manual=data.assets.find(f=>f.role==='MANUAL');parts.push(`<section class="plan-block"><h3>${editorialStateBadge('DRAFT',v.sequence)} <span class="hint">${v.entry==='INGEST'?'Incorporando tu identidad':v.entry==='COMPLETE'?'Completando tu identidad':'Creando tu identidad'}</span></h3>${diff}${gapsHtml(v.gaps)}<form id="kit-adopt-form">${kitValuesHtml(v.content,true)}<div class="actions">${[...v.content.palette,...v.content.typography,...v.content.logos].some(x=>x.certainty!=='CONFIRMED')?'<button type="submit" class="secondary">Adoptar los seleccionados</button>':''}</div></form>${contrastHtml(v.contrast,v.content.palette)}<div class="actions">${manual?`<button type="button" class="secondary" id="kit-extract" data-asset="${escape(manual.id)}">Buscar colores y tipografías en el manual</button>`:''}<button type="button" class="secondary" id="kit-edit">Editar valores</button><button type="button" id="kit-submit">Enviar a revisión</button></div><div id="kit-editor"></div>
 <section class="brando-marketing" aria-labelledby="kit-brando-title"><h4 id="kit-brando-title">${v.entry==='CREATE'?'Pide direcciones visuales a Brando':'¿Quieres ideas de Brando?'}</h4><p class="hint">Brando propone direcciones a partir de tu estrategia y tus ofertas aprobadas: qué comunican, colores, tipografías, imágenes y ejemplos. Tú eliges y adoptas cada valor; nada se aprueba ni se publica solo. Los logotipos se incorporan con tus archivos, un diseñador o Canva.</p><label for="kit-brando-request">¿Qué buscas? <span class="hint">opcional</span></label><textarea id="kit-brando-request" maxlength="1000" rows="2" placeholder="Ej. cercana, clara y profesional"></textarea><div class="actions"><button type="button" class="secondary brando-action" id="kit-ask-brando">Pedir direcciones a Brando</button></div><div id="kit-brando-result" aria-live="polite"></div></section></section>`);}
 const startable=!k.draft;
 return `${head}${parts.join('')}${startable?entries:''}${assetsHtml(data.assets,brandIdValue,data.reusable)}`;
}
/** Draft editor for kit values. New or edited values never arrive confirmed: adoption is a separate step. */
export function kitFormHtml(c,assets){
 const certaintyOptions=v=>['DECLARED','ESTIMATED','PROPOSED'].map(x=>`<option value="${x}"${v===x?' selected':''}>${escape(CERTAINTY_WORDS[x])}</option>`).join('');
 const logos=assets.filter(f=>f.role==='LOGO'||f.role==='DESIGNER_DELIVERY');
 const colorRow=(p,i)=>`<fieldset class="kit-row" data-kind="color" data-id="${escape(p?.id??'')}" data-confirmed="${p?.certainty==='CONFIRMED'}"><legend>Color ${i+1}</legend><label>Nombre<input name="name" maxlength="80" value="${escape(p?.name??'')}"></label><label>Hex<input name="hex" maxlength="7" value="${escape(p?.hex??'')}" placeholder="#C8102E"></label><label>Función<select name="role">${Object.entries(ROLE_WORDS).map(([k,v])=>`<option value="${k}"${p?.role===k?' selected':''}>${escape(v)}</option>`).join('')}</select></label><label>Referencia<input name="reference" maxlength="80" value="${escape(p?.reference??'')}" placeholder="Pantone 186 C"></label>${p?.certainty==='CONFIRMED'?'<p class="hint">Confirmado: si lo cambias, deberá adoptarse de nuevo.</p>':`<label>Certeza<select name="certainty">${certaintyOptions(p?.certainty??'PROPOSED')}</select></label>`}</fieldset>`;
 const fontRow=(f,i)=>`<fieldset class="kit-row" data-kind="font" data-id="${escape(f?.id??'')}" data-confirmed="${f?.certainty==='CONFIRMED'}"><legend>Tipografía ${i+1}</legend><label>Familia<input name="family" maxlength="80" value="${escape(f?.family??'')}"></label><label>Uso<select name="use">${Object.entries(USE_WORDS).map(([k,v])=>`<option value="${k}"${f?.use===k?' selected':''}>${escape(v)}</option>`).join('')}</select></label><label>Dónde se obtiene<input name="source" maxlength="200" value="${escape(f?.source??'')}"></label><label>Uso en web<select name="webEmbedding">${Object.entries(EMBED_WORDS).map(([k,v])=>`<option value="${k}"${(f?.webEmbedding??'UNKNOWN')===k?' selected':''}>${escape(v)}</option>`).join('')}</select></label><label>Incrustar en documentos<select name="documentEmbedding">${Object.entries(EMBED_WORDS).map(([k,v])=>`<option value="${k}"${(f?.documentEmbedding??'UNKNOWN')===k?' selected':''}>${escape(v)}</option>`).join('')}</select></label>${f?.certainty==='CONFIRMED'?'<p class="hint">Confirmada: si la cambias, deberá adoptarse de nuevo.</p>':`<label>Certeza<select name="certainty">${certaintyOptions(f?.certainty??'PROPOSED')}</select></label>`}</fieldset>`;
 const logoRow=(l,i)=>`<fieldset class="kit-row" data-kind="logo" data-id="${escape(l?.id??'')}" data-confirmed="${l?.certainty==='CONFIRMED'}"><legend>Logotipo ${i+1}</legend><label>Archivo<select name="assetId"><option value="">Elige un archivo</option>${logos.map(f=>`<option value="${escape(f.id)}" data-sha="${escape(f.sha256)}"${l?.assetId===f.id?' selected':''}>${escape(f.originalName)}</option>`).join('')}</select></label><label>Variante<select name="variant">${Object.entries(VARIANT_WORDS).map(([k,v])=>`<option value="${k}"${l?.variant===k?' selected':''}>${escape(v)}</option>`).join('')}</select></label><label>Ancho mínimo (px)<input name="minWidthPx" inputmode="numeric" value="${l?.minWidthPx??''}"></label>${l?.certainty==='CONFIRMED'?'':`<label>Certeza<select name="certainty">${certaintyOptions(l?.certainty??'DECLARED')}</select></label>`}</fieldset>`;
 const colorIds=c.palette.map(p=>`<option value="${escape(p.id)}">${escape(p.name)}</option>`).join('');
 return `<form id="kit-form" class="offer-form" novalidate><h3>Editar valores del kit</h3>
 <fieldset><legend>Canales que usa tu marca</legend>${Object.entries(CHANNEL_WORDS2).map(([k,v])=>`<label class="check-option"><input type="checkbox" name="kit-channel" value="${k}"${c.channels.includes(k)?' checked':''}> <span>${escape(v)}</span></label>`).join('')}</fieldset>
 <div id="kit-logos">${c.logos.map(logoRow).join('')}</div><button type="button" class="secondary" data-kit-add="logo"${logos.length?'':' disabled'}>Añadir logotipo</button>${logos.length?'':'<p class="hint">Sube primero el archivo del logotipo.</p>'}
 <div id="kit-colors">${c.palette.map(colorRow).join('')}</div><button type="button" class="secondary" data-kit-add="color">Añadir color</button>
 <div id="kit-fonts">${c.typography.map(fontRow).join('')}</div><button type="button" class="secondary" data-kit-add="font">Añadir tipografía</button>
 <fieldset><legend>Combinaciones de texto y fondo que usarás</legend><div id="kit-pairs">${c.pairs.map(p=>`<div class="kit-pair"><select name="pair-text">${c.palette.map(x=>`<option value="${escape(x.id)}"${x.id===p.text?' selected':''}>${escape(x.name)}</option>`).join('')}</select> sobre <select name="pair-background">${c.palette.map(x=>`<option value="${escape(x.id)}"${x.id===p.background?' selected':''}>${escape(x.name)}</option>`).join('')}</select><input name="pair-use" maxlength="120" value="${escape(p.use)}" aria-label="Uso"></div>`).join('')}</div>${colorIds?'<button type="button" class="secondary" data-kit-add="pair">Añadir combinación</button>':'<p class="hint">Añade colores para indicar combinaciones.</p>'}</fieldset>
 <label for="kit-tone">Tono de la marca</label><textarea id="kit-tone" maxlength="500" rows="2">${escape(c.verbal.tone)}</textarea>
 <label for="kit-rights">Derechos sobre la identidad</label><select id="kit-rights"><option value="UNKNOWN"${c.rights==='UNKNOWN'?' selected':''}>Desconocidos</option><option value="DECLARED_OWNED"${c.rights==='DECLARED_OWNED'?' selected':''}>Declarados como propios</option><option value="LICENSED"${c.rights==='LICENSED'?' selected':''}>Con licencia</option></select>
 <p id="kit-form-status" role="status" aria-live="polite"></p><div class="actions"><button type="submit">Guardar borrador</button><button type="button" class="secondary" data-editor-cancel>Cancelar</button></div>
 <template id="kit-row-color">${colorRow(null,0)}</template><template id="kit-row-font">${fontRow(null,0)}</template><template id="kit-row-logo">${logoRow(null,0)}</template></form>`;
}
/** Brando's visual directions: what each communicates, colors, typefaces, imagery, examples and what to confirm. */
export function identityDirectionsHtml(r){
 if(!r.directions)return '<p class="hint brando-unavailable">Brando no pudo proponer direcciones ahora. Puedes completar los valores tú mismo.</p>';
 const card=(d,i)=>`<article class="kit-direction"><p class="eyebrow">Dirección ${i+1}</p><h4>${escape(d.name)}</h4><p>${escape(d.intent)}</p><ul class="kit-direction-colors">${d.palette.map(c=>`<li><span class="kit-swatch" data-hex="${escape(c.hex)}" aria-hidden="true"></span>${escape(c.name)} · ${escape(c.hex)} · ${escape(ROLE_WORDS[c.role]??'')}</li>`).join('')}</ul><p><strong>Tipografías:</strong> ${d.typography.map(f=>`${escape(f.family)} (${escape(USE_WORDS[f.use]??'')})`).join(', ')}</p><p class="hint">${d.typography.map(f=>escape(f.licenseNote)).filter(Boolean).join(' · ')}</p>${d.imagery?`<p><strong>Imágenes:</strong> ${escape(d.imagery)}</p>`:''}${d.examples.length?`<p class="brando-list-title">Ejemplos de uso</p><ul>${d.examples.map(e=>`<li>${escape(e)}</li>`).join('')}</ul>`:''}${d.toConfirm.length?`<p class="brando-list-title">Antes de adoptar, confirma</p><ul>${d.toConfirm.map(e=>`<li>${escape(e)}</li>`).join('')}</ul>`:''}<div class="actions"><button type="button" class="secondary" data-direction-index="${i}">Usar esta dirección en el borrador</button></div></article>`;
 return `<p class="eyebrow">${r.demo?'Direcciones de ejemplo (modo DEMO, no generadas por IA)':'Direcciones propuestas por Brando · sin adoptar'}</p><div class="kit-directions">${r.directions.map(card).join('')}</div>${r.missing.length?`<p class="brando-list-title">Lo que falta para afinarlas</p><ul>${r.missing.map(m=>`<li>${escape(m)}</li>`).join('')}</ul>`:''}${r.questions.length?`<p class="brando-list-title">Preguntas para ti</p><ul>${r.questions.map(m=>`<li>${escape(m)}</li>`).join('')}</ul>`:''}<p class="hint">Al usar una dirección, sus colores y tipografías entran al borrador como «Propuesto, sin adoptar». Revísalos, ajústalos y adopta los que confirmes.</p>`;
}

// PHASE4_SPEC §4.10 · guided start. Pure projections over the draft returned by the server; guide and ficha show the
// same fields. Real stages (never a percentage); confirming the ficha approves no strategy, kit or plan.
export const SETUP_STAGES=['Tu marca','Lo que ya sabemos','Tu identidad','Revisa y comienza'];
export const SETUP_LABELS={name:'Nombre',ownership:'De quién es la marca',stage:'Punto de partida',offer:'Qué ofreces',audience:'A quién atiendes',geography:'Dónde compite',market:'Mercado principal',goal:'Qué buscas primero',references:'Referencias competitivas'};
const SETUP_CHOICES={ownership:{OWN:'Es mi marca',CLIENT:'Es la marca de un cliente'},stage:{IDEA:'Tengo una idea',EXISTING:'Mi marca ya existe'},geography:{LOCAL:'Local / ciudad',REGIONAL:'Regional',STATE:'Estatal',NATIONAL:'Nacional',LATAM:'LATAM',GLOBAL:'Global'}};
const SETUP_QUESTIONS={
 offer:{q:'¿Qué ofreces?',hint:'Tus productos o servicios, en tus palabras.'},
 audience:{q:'¿A quién atiendes?',hint:'Las personas o empresas que hoy te compran o quieres que te compren.'},
 geography:{q:'¿Dónde compite tu marca?',hint:'La ubicación de tu empresa no siempre es el mercado donde compite tu marca.'},
 goal:{q:'¿Qué buscas primero?',hint:'Lo que necesitas lograr ahora. No es tu Objetivo estratégico: ese se decide en Estrategia.'},
 stage:{q:'¿Tu marca ya existe o es una idea?',hint:''},
 ownership:{q:'¿De quién es esta marca?',hint:''},
 references:{q:'¿Qué competidores o marcas de referencia tienes en mente?',hint:''},
 market:{q:'Mercado principal',hint:''},
 name:{q:'Nombre de tu marca',hint:''}
};
export const setupValueText=(field,f)=>!f?'':f.state==='UNKNOWN'?'No lo sé todavía':(SETUP_CHOICES[field]?.[f.value]??f.value??'');
/** Stages as an ordered list with a word for each state (Hecho / Ahora / Pendiente), never colour alone. */
export function setupStagesHtml(step){
 return `<ol class="setup-stages" aria-label="Etapas de preparación">${SETUP_STAGES.map((label,i)=>{const n=i+1,state=n<step?'Hecho':n===step?'Ahora':'Pendiente';return `<li class="setup-stage is-${n<step?'done':n===step?'current':'pending'}"${n===step?' aria-current="step"':''}><span class="setup-stage-n">${n}</span> <span>${escape(label)}</span> <span class="setup-stage-state">${state}</span></li>`;}).join('')}</ol>`;
}
/** One input for a field (select for closed answers, textarea for open ones). `id` keeps the control unique. */
function setupInputHtml(field,f,id){
 const value=f?.state==='CONFIRMED'?f.value:'';
 if(SETUP_CHOICES[field])return `<select id="${id}" name="${field}"><option value="">Elige una opción</option>${Object.entries(SETUP_CHOICES[field]).map(([k,label])=>`<option value="${k}"${value===k?' selected':''}>${escape(label)}</option>`).join('')}</select>`;
 if(field==='name'||field==='market')return `<input id="${id}" name="${field}" maxlength="160" value="${escape(value??'')}">`;
 return `<textarea id="${id}" name="${field}" maxlength="${field==='offer'?6000:field==='references'?2500:2000}">${escape(value??'')}</textarea>`;
}
/** The guide asks one thing at a time: the first field the priority still needs. */
export function setupQuestionHtml(draft){
 const field=draft.missing[0];
 if(!field)return `<section class="setup-question" aria-labelledby="setup-question-title"><h3 id="setup-question-title">Ya tenemos lo que tu prioridad necesita.</h3><p>Puedes revisar o completar el resto en la ficha cuando quieras.</p><div class="actions"><button type="button" id="setup-next" data-step="3">Continuar a Tu identidad</button></div></section>`;
 const {q,hint}=SETUP_QUESTIONS[field];
 const market=field==='geography'?`<label for="setup-answer-market">Mercado principal <span class="hint">opcional</span></label>${setupInputHtml('market',draft.fields.market,'setup-answer-market')}`:'';
 return `<form id="setup-question" class="setup-question" data-field="${field}" aria-labelledby="setup-question-title"><p class="eyebrow">Lo que falta para tu prioridad · ${draft.missing.length===1?'última pregunta':`${draft.missing.length} preguntas`}</p><h3 id="setup-question-title"><label for="setup-answer">${escape(q)}</label></h3>${hint?`<p class="hint">${escape(hint)}</p>`:''}${setupInputHtml(field,draft.fields[field],'setup-answer')}${market}<div class="actions"><button type="button" class="secondary" id="setup-unknown">No lo sé todavía</button><button type="submit">Guardar y seguir</button></div></form>`;
}
/** Values proposed by the brand's documents, with their origin; conflicts between documents stay visible. */
export function setupProposalsHtml(draft){
 if(!draft.proposals.length)return '';
 const fields=[...new Set(draft.proposals.map(p=>p.field))];
 return `<section class="setup-proposals" aria-labelledby="setup-proposals-title"><h3 id="setup-proposals-title">Lo que encontramos en tus documentos</h3><p class="hint">Son propuestas: nada pasa a tu ficha hasta que eliges una o escribes la tuya.</p>${fields.map(field=>`<div class="setup-proposal-group" data-field="${field}"><h4>${escape(SETUP_LABELS[field])}</h4>${draft.conflicts.includes(field)?`<p class="setup-conflict" role="note">Tus documentos no coinciden. Elige la que corresponde o escribe la tuya.</p>`:''}<ul>${draft.proposals.filter(p=>p.field===field).map(p=>`<li class="setup-proposal"><p>«${escape(p.statement)}»</p><p class="hint">Desde ${escape(p.documentName)}</p><button type="button" class="secondary" data-use-proposal="${escape(p.claimId)}">Usar esta</button></li>`).join('')}</ul></div>`).join('')}</section>`;
}
/** Documents for this brand (stored once per file) and the extraction of proposals. */
export function setupDocumentsHtml(documents){
 return `<section class="setup-documents" aria-labelledby="setup-documents-title"><h3 id="setup-documents-title">Tus materiales</h3>${documents.length?`<ul class="setup-document-list">${documents.map(d=>`<li>${escape(d.originalName)}</li>`).join('')}</ul>`:'<p>Aún no has aportado documentos.</p>'}<label for="setup-files">Aportar documentos <span class="hint">PDF, DOCX, PPTX o TXT · máximo 20 MB por archivo</span></label><input id="setup-files" type="file" multiple accept=".pdf,.docx,.pptx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain"><p class="hint">Cada archivo se guarda una sola vez: si ya lo subiste, se reutiliza.</p><div class="actions"><button type="button" class="secondary" id="setup-upload">Subir documentos</button>${documents.length?'<button type="button" class="secondary" id="setup-extract">Buscar propuestas en mis documentos</button>':''}</div></section>`;
}
/** Step 3: the three identity entries of ADR-0034, postponable when the priority does not need it. */
export function setupIdentityHtml(draft,documents=[]){
 const choice=draft.identityChoice;
 const pdfs=documents.filter(d=>d.mediaType==='application/pdf');
 const option=(value,title,text)=>`<button type="button" class="setup-identity-option${choice===value?' is-chosen':''}" data-identity="${value}" aria-pressed="${choice===value}"><strong>${escape(title)}</strong><span>${escape(text)}</span></button>`;
 return `<section class="setup-identity" aria-labelledby="setup-identity-title"><h3 id="setup-identity-title">¿Cómo está tu identidad visual?</h3><p class="hint">El desarrollo completo sigue en Marca y recursos › Identidad visual.${pdfs.length?` Allí podrás usar como manual, sin volver a subirlo: ${escape(pdfs.map(d=>d.originalName).join(', '))}.`:''}</p><div class="setup-identity-options">${option('HAVE','Ya tengo identidad','Incorpora logotipo, colores y tipografías que ya existen.')}${option('COMPLETE','Quiero completarla','Tengo una parte y quiero completar lo que falta.')}${option('CREATE','Quiero crearla','Brando te propone direcciones; tú decides.')}${draft.identityPostponable?option('LATER','Más adelante','Tu prioridad no la necesita ahora.'):''}</div>${draft.identityPostponable?'':'<p class="hint">Tu prioridad es la identidad visual, así que conviene definir por dónde empezar.</p>'}</section>`;
}
/** The ficha: every field, editable, with its origin. The brand name is changed in brand settings once created. */
export function setupFichaHtml(draft){
 const row=field=>{const f=draft.fields[field],locked=field==='name'&&draft.brandId;const source=f?.source?`<p class="hint">Desde ${escape(f.source.documentName)}</p>`:'';return `<div class="setup-ficha-row" data-field="${field}"><label for="ficha-${field}">${escape(SETUP_LABELS[field])}</label>${locked?`<p id="ficha-${field}" class="setup-locked">${escape(f?.value??'')}</p>`:setupInputHtml(field,f,`ficha-${field}`)}${f?.state==='UNKNOWN'?'<p class="hint">Marcado como «No lo sé todavía».</p>':''}${source}</div>`;};
 return `<form id="setup-ficha" class="setup-ficha" aria-labelledby="setup-ficha-title"><h3 id="setup-ficha-title">Ficha de marca</h3><p class="hint">Es la misma información que reúne la guía. Un campo vacío queda pendiente.</p>${Object.keys(SETUP_LABELS).map(row).join('')}<div class="actions"><button type="submit">Guardar ficha</button></div></form>`;
}
/** Step 4 summary: confirmed, proposed and pending, plus what confirming does and does not do. */
export function setupSummaryHtml(draft){
 const list=(title,fields,cls,empty)=>`<div class="setup-summary-group ${cls}"><h4>${title}</h4>${fields.length?`<ul>${fields.map(f=>`<li><strong>${escape(SETUP_LABELS[f])}</strong>${cls==='is-confirmed'?`: ${escape(setupValueText(f,draft.fields[f]))}`:''}</li>`).join('')}</ul>`:`<p class="hint">${empty}</p>`}</div>`;
 const {confirmed,proposed,pending}=draft.summary;
 return `<section class="setup-summary" aria-labelledby="setup-summary-title"><h3 id="setup-summary-title">Revisa y comienza</h3><div class="setup-summary-groups">${list('Confirmado',confirmed,'is-confirmed','Nada confirmado todavía.')}${list('Propuesto por tus documentos',proposed,'is-proposed','Sin propuestas pendientes.')}${list('Pendiente',pending,'is-pending','Nada pendiente para tu prioridad.')}</div><p class="setup-note">Confirmar la ficha guarda este contexto de tu marca. No aprueba estrategia, kit ni plan, y las propuestas sin elegir no se guardan.</p><div class="actions"><button type="button" id="setup-confirm">Confirmar ficha y comenzar</button></div></section>`;
}
/** Whole guided start view. `mode` is 'guide' or 'ficha'; both read and write the same draft. */
export function setupHtml(draft,brandName,mode,documents=[]){
 const body=mode==='ficha'?`${setupFichaHtml(draft)}${draft.brandId?setupSummaryHtml(draft):''}`
  :draft.step<=2?`${setupDocumentsHtml(documents)}${setupProposalsHtml(draft)}${setupQuestionHtml(draft)}`
  :draft.step===3?`${setupIdentityHtml(draft,documents)}<div class="actions"><button type="button" class="secondary" id="setup-back" data-step="2">Volver</button><button type="button" id="setup-next" data-step="4">Continuar</button></div>`
  :`${setupSummaryHtml(draft)}<div class="actions"><button type="button" class="secondary" id="setup-back" data-step="3">Volver</button></div>`;
 return `<p class="eyebrow">Preparar tu marca</p><h2>${escape(brandName)}</h2>${setupStagesHtml(draft.step)}<div class="setup-modes" role="group" aria-label="Forma de completar"><button type="button" class="secondary" data-setup-mode="guide" aria-pressed="${mode!=='ficha'}">Guía</button><button type="button" class="secondary" data-setup-mode="ficha" aria-pressed="${mode==='ficha'}">Ficha completa</button></div><div class="setup-body">${body}</div><div class="setup-footer actions"><button type="button" class="secondary" id="setup-leave">Guardar y salir</button><button type="button" class="secondary" id="setup-abandon">Descartar borrador</button></div><p id="setup-status" class="hint" role="status" aria-live="polite"></p>`;
}

// ─── ADR-0033 · living guide, Colaboración and the guest portal (pure projections; operations live in app.js) ───
/** Living guide from the published kit version only: logos, colours with their role, type, contrast and tone. */
export function guideBodyHtml(guide,previewUrl){
 const c=guide.content,file=id=>guide.files.find(f=>f.id===id);
 const logos=c.logos.map(l=>{const f=file(l.assetId);return `<li class="guide-logo">${f?.previewable?`<img src="${previewUrl(l.assetId)}" alt="Logotipo ${escape(VARIANT_WORDS[l.variant]??'')}" loading="lazy">`:'<span class="hint">Archivo sin vista previa</span>'}<p><strong>${escape(VARIANT_WORDS[l.variant]??'')}</strong>${l.minWidthPx?` · ancho mínimo ${l.minWidthPx} px`:''}</p>${l.usage?`<p class="hint">${escape(l.usage)}</p>`:''}</li>`;}).join('');
 const colors=c.palette.map(p=>`<li class="guide-color"><span class="kit-swatch" data-hex="${escape(p.hex)}" aria-hidden="true"></span><div><p><strong>${escape(p.name)}</strong></p><p class="hint">${escape(ROLE_WORDS[p.role])} · ${escape(p.hex)}${p.reference?` · ${escape(p.reference)}`:''}</p></div></li>`).join('');
 const fonts=c.typography.map(f=>`<li><strong>${escape(f.family)}</strong> · ${escape(USE_WORDS[f.use]??'')}${f.alternatives.filter(a=>a.reviewed).length?`<p class="hint">Alternativas: ${f.alternatives.filter(a=>a.reviewed).map(a=>`${escape(CHANNEL_WORDS2[a.channel])}: ${escape(a.family)}`).join('; ')}</p>`:''}</li>`).join('');
 const list=(title,items)=>items.length?`<h4>${escape(title)}</h4><ul>${items.map(i=>`<li>${escape(i)}</li>`).join('')}</ul>`:'';
 return `<div class="guide">${logos?`<section class="plan-block"><h3>Logotipos</h3><ul class="guide-logos">${logos}</ul></section>`:''}
 ${colors?`<section class="plan-block"><h3>Colores</h3><ul class="guide-colors">${colors}</ul>${contrastHtml(guide.contrast,c.palette)}</section>`:''}
 ${fonts?`<section class="plan-block"><h3>Tipografías</h3><ul class="guide-fonts">${fonts}</ul></section>`:''}
 ${c.verbal.tone||c.verbal.messages.length?`<section class="plan-block"><h3>Cómo habla la marca</h3>${c.verbal.tone?`<p>${escape(c.verbal.tone)}</p>`:''}${list('Mensajes',c.verbal.messages)}${list('Ejemplos',c.verbal.examples)}</section>`:''}
 ${c.style.do.length||c.style.dont.length?`<section class="plan-block"><h3>Usos</h3>${list('Sí',c.style.do)}${list('No',c.style.dont)}</section>`:''}</div>`;
}
export function guideHtml(guide,brandIdValue){
 const head=`<div class="ws-hero"><p class="eyebrow">Marca y recursos</p><h2>Guía de marca</h2><p class="ws-lead">La guía se genera de la versión publicada de tu kit. Cambia cuando publicas otra versión; los borradores no aparecen aquí.</p></div>`;
 if(!guide)return `${head}<p>Aún no hay una versión publicada del kit. Aprueba y publica tu kit en Identidad visual para tener tu guía.</p>`;
 return `${head}<p class="hint">Versión ${guide.sequence} del kit, publicada.</p><div class="actions"><button type="button" class="secondary" id="guide-export">Descargar guía en PDF</button></div>${guideBodyHtml(guide,id=>`/api/brand-kit/assets/preview?brandId=${encodeURIComponent(brandIdValue)}&amp;assetId=${encodeURIComponent(id)}`)}`;
}
const SHARE_WORDS={STRATEGY_SNAPSHOT:'Estrategia',PLAN_SNAPSHOT:'Plan de Marketing',DELIVERABLE_VERSION:'Material',KIT_VERSION:'Identidad visual',SITE_VERSION:'Sitio web'};
const INVITATION_WORDS={PENDING:'Pendiente',ACCEPTED:'Aceptada',REVOKED:'Retirada',EXPIRED:'Vencida'};
const DECISION_WORDS={APPROVE:'Aprobó esta versión',REQUEST_CHANGES:'Pidió cambios'};
const commentsHtml=comments=>comments.length?`<ul class="share-comments">${comments.map(c=>`<li><p><strong>${escape(c.author)}</strong>${c.context==='GUEST'?' <span class="badge">Cliente</span>':''}${c.visibility==='INTERNAL'?' <span class="badge warn">Interno</span>':''} · <span class="hint">${escape(fmt(c.createdAt))}</span></p><p>${escape(c.body)}</p></li>`).join('')}</ul>`:'<p class="hint">Sin comentarios.</p>';
const approvalsHtml=approvals=>approvals.length?`<ul class="share-approvals">${approvals.map(x=>`<li><span class="badge ${x.decision==='APPROVE'?'':'warn'}">${escape(DECISION_WORDS[x.decision])}</span> ${escape(x.actor)} · <span class="hint">${escape(fmt(x.createdAt))}</span>${x.comment?`<p>${escape(x.comment)}</p>`:''}</li>`).join('')}</ul>`:'';
/** Colaboración (team): invite by link (email delivery not configured), guests, and what the client sees. */
export function collaborationHtml(d){
 const head=`<div class="ws-hero"><p class="eyebrow">Colaboración</p><h2>Trabaja con tu cliente</h2><p class="ws-lead">Invita a tu cliente a esta marca. Sólo verá lo que compartas, puede comentar y aprobar la versión exacta; nunca edita, publica ni autoriza gasto.</p></div>`;
 const invite=d.canManageGuests?`<form id="invite-form" class="offer-form" novalidate><label for="invite-email">Correo de tu cliente</label><input id="invite-email" type="email" maxlength="254" autocomplete="off" required placeholder="cliente@empresa.com"><p class="hint">${d.emailDelivery?'Le enviaremos la invitación por correo.':'El envío por correo aún no está configurado. Te daremos un enlace de un solo uso para que se lo envíes tú.'} Sólo podrá aceptarla quien inicie sesión con ese correo. Vence en 7 días.</p><p id="invite-status" role="status" aria-live="polite"></p><div class="actions"><button type="submit">Crear invitación</button></div></form><div id="invite-link"></div>`:'<p class="hint">Invitar o retirar invitados necesita el permiso «Gestionar invitados» en esta marca.</p>';
 const invitations=d.invitations.length?`<ul class="collab-list">${d.invitations.map(i=>`<li><span>${escape(i.email)}</span><span class="badge ${i.state==='PENDING'?'':'warn'}">${escape(INVITATION_WORDS[i.state])}</span><span class="hint">vence ${escape(fmt(i.expiresAt))}</span>${d.canManageGuests&&i.state==='PENDING'?`<button type="button" class="tertiary" data-revoke-invitation="${escape(i.id)}">Retirar invitación</button>`:''}</li>`).join('')}</ul>`:'<p class="hint">Aún no has invitado a nadie.</p>';
 const guests=d.guests.length?`<ul class="collab-list">${d.guests.map(g=>`<li><span>${escape(g.name)}${g.email&&g.email!==g.name?` · ${escape(g.email)}`:''}</span><span class="badge ${g.status==='ACTIVE'?'':'warn'}">${g.status==='ACTIVE'?'Con acceso':'Acceso retirado'}</span>${d.canManageGuests&&g.status==='ACTIVE'?`<button type="button" class="tertiary" data-revoke-guest="${escape(g.id)}">Retirar acceso</button>`:''}</li>`).join('')}</ul>`:'<p class="hint">Nadie ha aceptado todavía.</p>';
 const s=d.shareable,option=(type,id,title)=>`<option value="${escape(type)}:${escape(id)}">${escape(title)}</option>`;
 const options=[s.strategy.decisions?option('STRATEGY_SNAPSHOT','strategy',`Estrategia: ${s.strategy.decisions} decisión(es) aprobada(s), tal como están hoy`):'',...s.planSnapshots.map(p=>option('PLAN_SNAPSHOT',p.id,p.title)),...s.deliverables.map(v=>option('DELIVERABLE_VERSION',v.id,`${v.title}${v.status==='IN_REVIEW'?' (en revisión)':''}`)),...s.kitVersions.map(v=>option('KIT_VERSION',v.id,`${v.title}${v.status==='IN_REVIEW'?' (en revisión)':''}`)),...(s.siteVersions??[]).map(v=>option('SITE_VERSION',v.id,`${v.title}${v.status==='IN_REVIEW'?' (en revisión)':''}`))].join('');
 const share=!d.canManageGuests?'<p class="hint">Compartir con tu cliente necesita el permiso «Gestionar invitados» en esta marca.</p>':options?`<form id="share-form" class="offer-form" novalidate><label for="share-target">¿Qué quieres compartir?</label><select id="share-target">${options}</select><p class="hint">Se comparte esa versión exacta. Si después cambia, tu cliente sigue viendo la que compartiste hasta que compartas otra.</p><div class="actions"><button type="submit">Compartir con el cliente</button></div></form>`:`<p class="hint">${d.shares.some(x=>!x.withdrawnAt)?'No hay versiones nuevas para compartir.':'Aún no hay nada que se pueda compartir: aprueba decisiones, una copia del plan, un material o una versión del kit.'}</p>`;
 const shares=d.shares.length?d.shares.map(x=>`<article class="share-card${x.withdrawnAt?' is-withdrawn':''}"><div class="share-head"><p class="eyebrow">${escape(SHARE_WORDS[x.targetType])}</p><h4>${escape(x.title)}</h4><p class="hint">${x.withdrawnAt?`Compartido el ${escape(fmt(x.sharedAt))} · retirado el ${escape(fmt(x.withdrawnAt))}`:`Compartido el ${escape(fmt(x.sharedAt))}`}</p></div>${approvalsHtml(x.approvals)}${commentsHtml(x.comments)}${x.withdrawnAt?'':`<form class="share-comment" data-share="${escape(x.id)}"><label for="comment-${escape(x.id)}">Comentario</label><textarea id="comment-${escape(x.id)}" maxlength="2000" rows="2"></textarea><label for="visibility-${escape(x.id)}">¿Quién lo ve?</label><select id="visibility-${escape(x.id)}"><option value="SHARED">Tu cliente y tu equipo</option><option value="INTERNAL">Sólo tu equipo</option></select><div class="actions"><button type="submit" class="secondary">Comentar</button>${d.canManageGuests?`<button type="button" class="tertiary" data-withdraw="${escape(x.id)}">Dejar de compartir</button>`:''}</div></form>`}</article>`).join(''):'<p class="hint">Todavía no compartes nada.</p>';
 return `${head}<section class="plan-block" aria-labelledby="collab-invite-title"><h3 id="collab-invite-title">Invitar a tu cliente</h3>${invite}<h4>Invitaciones</h4>${invitations}<h4>Personas invitadas</h4>${guests}</section>
 <section class="plan-block" aria-labelledby="collab-share-title"><h3 id="collab-share-title">Lo que ve tu cliente</h3>${share}<div class="share-cards">${shares}</div></section>`;
}
/** The single-use link, shown once right after creating the invitation. */
export function invitationLinkHtml(link){
 return `<div class="invite-link" role="note"><p><strong>Enlace de un solo uso</strong> (sólo se muestra ahora):</p><input id="invite-link-value" readonly value="${escape(link)}" aria-label="Enlace de invitación"><div class="actions"><button type="button" class="secondary" id="invite-copy">Copiar enlace</button></div><p class="hint">Envíaselo a tu cliente. Si lo pierdes, retira la invitación y crea otra.</p></div>`;
}
function planBodyHtml(s){
 const c=s.content,progress=new Map(s.progress.map(x=>[x.actionId,x]));
 const objectives=h=>c.objectives.filter(o=>o.horizon===h);
 const objectiveList=list=>list.length?`<ul class="plan-objectives">${list.map(o=>`<li class="plan-objective"><p class="plan-objective-title">${escape(o.title)}</p>${o.measure?`<p class="hint">Cómo se mide: ${escape(o.measure)}</p>`:''}</li>`).join('')}</ul>`:'<p class="hint">Sin elementos.</p>';
 const action=a=>{const pr=progress.get(a.id);return `<li class="plan-action"><div class="plan-action-head">${planActionBadge(pr?.status??a.status)}<h4>${escape(a.title)}</h4></div>${factsHtml(actionFacts(a,a.offerName))}${pr?.note||pr?.date?`<p class="hint">Avance${pr.date?` del ${escape(dayText(pr.date))}`:''}${pr.note?`: ${escape(pr.note)}`:''}</p>`:''}</li>`;};
 return `${c.focus?`<p class="plan-focus">Próximos 90 días: del ${escape(dayText(c.focus.start))} al ${escape(dayText(c.focus.end))}.</p>`:''}<h5>Objetivos del año</h5>${objectiveList(objectives('ANNUAL'))}<h5>Prioridades de los próximos 90 días</h5>${objectiveList(objectives('NINETY_DAYS'))}<h5>Acciones y avance</h5><ul class="plan-actions">${c.actions.map(action).join('')||'<li class="hint">Sin acciones.</li>'}</ul>`;
}
function portalBodyHtml(x,brandIdValue){
 const b=x.body;
 if(!b)return '<p class="hint">Este contenido ya no está disponible.</p>';
 if(x.targetType==='STRATEGY_SNAPSHOT')return `<dl class="portal-strategy">${b.decisions.map(d=>`<dt>${escape(labels[d.module]??d.module)}</dt><dd>${escape(d.selectedOption)}</dd>`).join('')}</dl>`;
 if(x.targetType==='PLAN_SNAPSHOT')return planBodyHtml(b);
 if(x.targetType==='SITE_VERSION')return `<p>Páginas: ${b.pages.map(escape).join(' · ')||'sin páginas'}</p><p><a class="button-link" href="${escape(b.previewUrl)}" target="_blank" rel="noopener">Ver la vista previa de esta versión</a></p><p class="hint">Se abre en otra dirección y te pide confirmar con tu cuenta. Sólo verás esta versión.</p>`;
 if(x.targetType==='DELIVERABLE_VERSION')return `<p class="hint">${escape(TYPE_WORDS[b.type]??'Material')} · versión ${b.sequence}</p><pre class="brando-proposal-text">${escape(deliverableText(b.content))}</pre>`;
 return guideBodyHtml(b,id=>`/api/portal/asset?brandId=${encodeURIComponent(brandIdValue)}&amp;assetId=${encodeURIComponent(id)}`);
}
/** Guest portal: only what was shared, the published guide, shared comments and decisions on the exact version. */
export function portalHtml(p){
 const approvable=x=>x.targetType==='DELIVERABLE_VERSION'||x.targetType==='KIT_VERSION';
 const card=x=>`<article class="share-card" id="share-${escape(x.id)}"><div class="share-head"><p class="eyebrow">${escape(SHARE_WORDS[x.targetType])}</p><h3>${escape(x.title)}</h3><p class="hint">Compartido el ${escape(fmt(x.sharedAt))}</p></div>${portalBodyHtml(x,p.brand.id)}${approvalsHtml(x.approvals)}<h4>Comentarios</h4>${commentsHtml(x.comments)}
  <form class="portal-comment" data-share="${escape(x.id)}"><label for="portal-comment-${escape(x.id)}">Tu comentario</label><textarea id="portal-comment-${escape(x.id)}" maxlength="2000" rows="2"></textarea><div class="actions"><button type="submit" class="secondary">Comentar</button></div></form>
  ${approvable(x)?`<form class="portal-decide" data-share="${escape(x.id)}" data-fingerprint="${escape(x.fingerprint)}"><label for="portal-decide-${escape(x.id)}">Comentario de tu decisión <span class="hint">obligatorio si pides cambios</span></label><textarea id="portal-decide-${escape(x.id)}" maxlength="2000" rows="2"></textarea><div class="actions"><button type="submit" value="APPROVE">Aprobar esta versión</button><button type="submit" value="REQUEST_CHANGES" class="secondary">Pedir cambios</button></div><p class="hint">Tu aprobación vale sólo para esta versión. No publica nada ni autoriza gasto.</p></form>`:''}</article>`;
 const groups=[['Marca',x=>x.targetType==='STRATEGY_SNAPSHOT'||x.targetType==='KIT_VERSION'],['Marketing',x=>x.targetType==='PLAN_SNAPSHOT'||x.targetType==='SITE_VERSION'],['Entregables',x=>x.targetType==='DELIVERABLE_VERSION']];
 const sections=groups.map(([title,match])=>{const items=p.shares.filter(match);return items.length?`<section class="portal-section" aria-label="${escape(title)}"><h2 class="portal-section-title">${escape(title)}</h2>${items.map(card).join('')}</section>`:'';}).join('');
 const pending=p.shares.filter(x=>approvable(x)&&!x.approvals.some(a=>a.actor==='Tú')).length;
 return `<div class="ws-hero"><p class="eyebrow">Portal del cliente</p><h2>${escape(p.brand.name)}</h2><p class="ws-lead">Aquí ves lo que el equipo compartió contigo. Puedes comentar y aprobar o pedir cambios; no puedes editar ni publicar.</p></div>
 <section class="plan-block portal-summary" aria-label="Resumen"><p>${p.shares.length} elemento(s) compartido(s)${pending?` · ${pending} esperando tu revisión`:''}.</p></section>
 ${p.guide?`<section class="portal-section" aria-label="Guía de marca"><h2 class="portal-section-title">Guía de marca</h2><p class="hint">Versión ${p.guide.sequence} del kit, publicada.</p>${guideBodyHtml(p.guide,id=>`/api/portal/asset?brandId=${encodeURIComponent(p.brand.id)}&amp;assetId=${encodeURIComponent(id)}`)}</section>`:''}
 ${sections||'<p>El equipo todavía no ha compartido nada contigo.</p>'}`;
}

// ─── ADR-0035 · Clientes and Resultados (pure projections; operations live in app.js) ───
// Opportunity status words (canonical values in schemas/client-opportunity). «Nueva» never means a sale.
const OPPORTUNITY_WORDS={NEW:'Nueva',IN_PROGRESS:'En seguimiento'};
export function opportunityBadge(status){return `<span class="badge">${escape(OPPORTUNITY_WORDS[status]??'')}</span>`;}
const ATTENTION_WORDS={UNASSIGNED:'Por asignar',NO_FOLLOW_UP:'Sin seguimiento',OVERDUE:'Seguimiento vencido'};
const CHANNEL_WORDS3={WEB_FORM:'Formulario web',PHONE:'Teléfono',EMAIL:'Correo',IN_PERSON:'En persona',WHATSAPP:'WhatsApp',SOCIAL:'Redes sociales',OTHER:'Otro',UNKNOWN:'Sin dato'};
const PLATFORM_WORDS={GOOGLE:'Google',META:'Meta',TIKTOK:'TikTok',LINKEDIN:'LinkedIn',ORGANIC_SEARCH:'Búsqueda orgánica',REFERRAL:'Recomendación o enlace',DIRECT:'Directo',OTHER:'Otra fuente',UNKNOWN:''};
const CAUSE_WORDS={NO_REFERENCE:'no llegó ninguna referencia',DECLARED_ONLY:'sólo hay origen declarado'};
const EVENT_WORDS={CREATED:'Registrada',ASSIGNED:'Responsable asignado',UNASSIGNED:'Pasó a «Por asignar»',FOLLOW_UP_SET:'Seguimiento actualizado',FOLLOW_UP_CLEARED:'Seguimiento quitado',STATUS_CHANGED:'Estado cambiado',DETAILS_EDITED:'Datos editados'};
export const CLIENT_FILTERS=[['all','Todas'],['UNASSIGNED','Por asignar'],['NO_FOLLOW_UP','Sin seguimiento'],['OVERDUE','Seguimiento vencido']];
/** Where an opportunity came from: attention channel, platform, and the campaign evidence with its real status. */
export function acquisitionText(origin){
 if(!origin)return 'Origen sin registrar';
 const parts=[CHANNEL_WORDS3[origin.attentionChannel]??'',PLATFORM_WORDS[origin.acquisitionPlatform]??''].filter(Boolean);
 const utm=origin.utm??{},campaign=utm.campaign||utm.id;
 const ref=origin.campaignStatus==='CAPTURED_UNVERIFIED'?`Campaña capturada sin verificar${campaign?`: ${campaign}`:''}`:`Campaña no identificada (${CAUSE_WORDS[origin.campaignCause]??'sin referencia'})`;
 return [parts.join(' · '),ref,origin.declaredOrigin?`Dice: «${origin.declaredOrigin}»`:''].filter(Boolean).join(' · ');
}
const selectOptions=(list,selected,empty)=>`${empty!==undefined?`<option value="">${escape(empty)}</option>`:''}${list.map(([v,l])=>`<option value="${escape(v)}"${v===selected?' selected':''}>${escape(l)}</option>`).join('')}`;
function opportunityCardHtml(o,d){
 const segment=d.segments.find(s=>s.id===o.segmentId),offer=d.offers.find(x=>x.id===o.offerId);
 const facts=[['Necesita',o.need],['Contacto',[o.contactEmail,o.contactPhone].filter(Boolean).join(' · ')||'Sin medio de contacto'],['Origen',acquisitionText(o.origin)],['Recibida',fmt(o.receivedAt)],['Responsable',o.ownerName??'Por asignar'],['Siguiente seguimiento',o.nextActionDate?`${o.nextAction??''} · ${dayText(o.nextActionDate)}`:'Sin seguimiento'],...(segment?[['Segmento',segment.name]]:[]),...(offer?[['Oferta',offer.name]]:[])];
 const members=d.members.map(m=>[m.userId,m.name]),segs=d.segments.filter(s=>s.active||s.id===o.segmentId).map(s=>[s.id,s.name]),offs=d.offers.filter(x=>x.active||x.id===o.offerId).map(x=>[x.id,x.name]);
 const id=escape(o.id);
 return `<article class="client-card" id="op-${id}"><div class="client-head"><h4>${escape(o.personName)}</h4>${opportunityBadge(o.status)}${o.attention.map(a=>`<span class="badge warn">${escape(ATTENTION_WORDS[a])}</span>`).join('')}<span class="hint">${escape(o.reference??'')}</span></div>${factsHtml(facts)}
 <details class="client-edit"><summary>Dar seguimiento</summary><form class="client-update offer-form" data-id="${id}" data-revision="${o.revision}" novalidate>
 <label for="owner-${id}">Responsable</label><select id="owner-${id}" name="ownerUserId">${selectOptions(members,o.ownerUserId,'Por asignar')}</select>
 <label for="status-${id}">Estado</label><select id="status-${id}" name="status">${selectOptions(Object.entries(OPPORTUNITY_WORDS),o.status)}</select>
 <label for="next-${id}">Siguiente seguimiento</label><input id="next-${id}" name="nextAction" maxlength="300" value="${escape(o.nextAction??'')}" placeholder="Ej. Llamar para enviar precios">
 <label for="date-${id}">Fecha</label><input id="date-${id}" name="nextActionDate" type="date" value="${escape(o.nextActionDate??'')}">
 ${segs.length?`<label for="segment-${id}">Segmento</label><select id="segment-${id}" name="segmentId">${selectOptions(segs,o.segmentId,'Sin segmento')}</select>`:''}
 ${offs.length?`<label for="offer-${id}">Oferta</label><select id="offer-${id}" name="offerId">${selectOptions(offs,o.offerId,'Sin oferta')}</select>`:''}
 <p class="hint client-update-status" role="status" aria-live="polite"></p><div class="actions"><button type="submit">Guardar seguimiento</button></div></form></details>
 ${o.history.length?`<details class="client-history"><summary>Historial</summary><ul>${o.history.map(h=>`<li>${escape(EVENT_WORDS[h.kind]??h.kind)} · ${escape(h.actor??'')} · <span class="hint">${escape(fmt(h.createdAt))}</span></li>`).join('')}</ul></details>`:''}</article>`;
}
/** Clientes: register and follow up real opportunities of the active brand. Nothing here is sample data. */
export function clientsHtml(d,filter='all'){
 const count=f=>f==='all'?d.opportunities.length:d.opportunities.filter(o=>o.attention.includes(f)).length;
 const shown=filter==='all'?d.opportunities:d.opportunities.filter(o=>o.attention.includes(filter));
 const members=d.members.map(m=>[m.userId,m.name]),segs=d.segments.filter(s=>s.active).map(s=>[s.id,s.name]),offs=d.offers.filter(x=>x.active).map(x=>[x.id,x.name]);
 const create=`<details class="plan-block client-new"${d.opportunities.length?'':' open'}><summary><strong>Registrar una oportunidad</strong></summary><form id="client-form" class="offer-form" novalidate>
 <label for="client-name">Nombre o referencia</label><input id="client-name" maxlength="160" required autocomplete="off">
 <label for="client-need">¿Qué necesita?</label><textarea id="client-need" maxlength="2000" rows="2" required></textarea>
 <div class="plan-dates"><div><label for="client-email">Correo <span class="hint">opcional</span></label><input id="client-email" type="email" maxlength="254" autocomplete="off"></div><div><label for="client-phone">Teléfono <span class="hint">opcional</span></label><input id="client-phone" type="tel" maxlength="40" autocomplete="off"></div></div>
 <label for="client-channel">¿Por dónde llegó?</label><select id="client-channel">${selectOptions(Object.entries(CHANNEL_WORDS3).filter(([k])=>k!=='WEB_FORM'),'UNKNOWN')}</select>
 <label for="client-declared">¿Cómo dice que te conoció? <span class="hint">opcional; se guarda tal como lo dijo, sin atribuirlo a una campaña</span></label><input id="client-declared" maxlength="300">
 <label for="client-owner">Responsable</label><select id="client-owner">${selectOptions(members,null,'Por asignar')}</select>
 ${segs.length?`<label for="client-segment">Segmento <span class="hint">opcional</span></label><select id="client-segment">${selectOptions(segs,null,'Sin segmento')}</select>`:''}
 ${offs.length?`<label for="client-offer">Oferta <span class="hint">opcional</span></label><select id="client-offer">${selectOptions(offs,null,'Sin oferta')}</select>`:''}
 <div class="plan-dates"><div><label for="client-next">Siguiente seguimiento <span class="hint">opcional</span></label><input id="client-next" maxlength="300" placeholder="Ej. Llamar el jueves"></div><div><label for="client-date">Fecha</label><input id="client-date" type="date"></div></div>
 <p id="client-form-status" role="status" aria-live="polite"></p><div class="actions"><button type="submit">Guardar oportunidad</button></div></form></details>`;
 const filters=`<div class="client-filters" role="group" aria-label="Filtrar oportunidades">${CLIENT_FILTERS.map(([k,l])=>`<button type="button" class="secondary" data-client-filter="${k}" aria-pressed="${k===filter}">${escape(l)} <span class="client-count">${count(k)}</span></button>`).join('')}</div>`;
 const list=shown.length?`<div class="client-list">${shown.map(o=>opportunityCardHtml(o,d)).join('')}</div>`:`<p class="hint">${d.opportunities.length?'Nada pendiente en este filtro.':'Aún no hay oportunidades. Registra la primera o recibe solicitudes con un formulario web.'}</p>`;
 const forms=`<section class="plan-block" aria-labelledby="client-forms-title"><h3 id="client-forms-title">Formulario web</h3><p class="hint">Cada envío crea una oportunidad en esta marca con su origen y las referencias de campaña que traiga. En esta etapa el formulario se prueba en una página de desarrollo de Brandopolis; publicarlo en tu sitio llegará con Sitio web, dominio y aviso de privacidad definitivo.</p>
 ${d.forms.length?`<ul class="collab-list">${d.forms.map(f=>`<li><span>${escape(f.name)}</span><span class="badge ${f.status==='ACTIVE'?'':'warn'}">${f.status==='ACTIVE'?'Activo':'Desactivado'}</span>${f.status==='ACTIVE'?`<a href="/formulario?f=${escape(f.publicId)}" target="_blank" rel="noopener" data-form-link>Abrir formulario de prueba</a>${d.canManageForms?`<button type="button" class="tertiary" data-disable-form="${escape(f.id)}">Desactivar</button>`:''}`:''}</li>`).join('')}</ul>`:'<p class="hint">Todavía no hay formularios.</p>'}
 ${d.canManageForms?`<form id="lead-form-create" class="offer-form" novalidate><label for="lead-form-name">Nombre del formulario</label><input id="lead-form-name" maxlength="120" value="Contacto del sitio">${segs.length?`<label for="lead-form-segment">Segmento de quien lo use <span class="hint">opcional</span></label><select id="lead-form-segment">${selectOptions(segs,null,'Sin segmento')}</select>`:''}<div class="actions"><button type="submit" class="secondary">Crear formulario</button></div></form>`:'<p class="hint">Crear o desactivar un formulario necesita el permiso de publicar en esta marca.</p>'}</section>`;
 const segments=`<section class="plan-block" aria-labelledby="client-segments-title"><h3 id="client-segments-title">Segmentos</h3><p class="hint">Grupos de clientes que usa tu equipo. Son opcionales y nunca se asignan solos.</p>${d.segments.length?`<ul class="client-tags">${d.segments.map(s=>`<li>${escape(s.name)}</li>`).join('')}</ul>`:''}<form id="segment-form" class="offer-form" novalidate><label for="segment-name">Nuevo segmento</label><input id="segment-name" maxlength="120" placeholder="Ej. Restaurantes"><div class="actions"><button type="submit" class="secondary">Añadir segmento</button></div></form></section>`;
 return `<div class="ws-hero"><p class="eyebrow">Clientes</p><h2>Oportunidades de tu marca</h2><p class="ws-lead">Registra cada solicitud, quién la atiende y cuál es el siguiente paso. Nada se pierde al recargar y nada se marca como venta por sí solo.</p></div>
 ${create}<section class="plan-block" aria-labelledby="client-list-title"><h3 id="client-list-title">Oportunidades</h3>${filters}${list}</section>${forms}${segments}`;
}
const periodText=m=>m.period?`${m.period.label}${m.period.from?` (desde ${fmt(m.period.from)})`:''}`:'';
// Kind of source behind each figure: an internal record of Brandopolis, a planned budget or data from a provider.
const KIND_WORDS={INTERNAL_RECORD:'Registro interno de Brandopolis',PLANNED_BUDGET:'Presupuesto planificado (no es gasto)',PROVIDER:'Dato de proveedor',SIMULATED:'Simulado (no es dato real)'};
const metricValue=m=>m.currency?new Intl.NumberFormat('es-MX',{style:'currency',currency:m.currency}).format(m.value):String(m.value);
function metricHtml(m){
 const kind=`<p class="result-kind">${escape(KIND_WORDS[m.kind]??'')}</p>`;
 if(!m.available)return `<li class="result-card is-missing" data-metric="${escape(m.id)}" data-kind="${escape(m.kind)}"><p class="result-label">${escape(m.label)}</p><p class="result-value">${m.state==='NOT_CONNECTED'?'Sin conectar':'Sin datos'}</p>${kind}<p class="hint">${escape(m.reason)}</p></li>`;
 return `<li class="result-card" data-metric="${escape(m.id)}" data-kind="${escape(m.kind)}"><p class="result-label">${escape(m.label)}</p><p class="result-value">${escape(metricValue(m))}</p>${kind}<details><summary>Cómo se calcula y sus límites</summary><p class="hint">${escape(m.definition)}</p><p class="hint"><strong>Límites:</strong> ${escape(m.limitations)}</p><p class="hint">Fuente: ${escape(m.source)} · Ámbito: ${escape(m.scope)} · Periodo: ${escape(periodText(m))} · Zona horaria: ${escape(m.timezone)} · Calculado: ${escape(fmt(m.computedAt))}</p></details></li>`;
}
/** Resultados: marketing, commercial operation and sales, each with its real availability. */
export function resultsHtml(r){
 const block=(title,lead,list)=>`<section class="plan-block" aria-label="${escape(title)}"><h3>${escape(title)}</h3><p class="hint">${escape(lead)}</p><ul class="result-grid">${list.map(metricHtml).join('')}</ul></section>`;
 return `<div class="ws-hero"><p class="eyebrow">Resultados</p><h2>Lo que está pasando con tu marca</h2><p class="ws-lead">Cifras calculadas con los registros reales de esta marca. Un cero significa que se midió y no hubo eventos; «Sin conectar» o «Sin datos» significa que todavía falta la fuente.</p></div>
 ${block('Marketing','Solicitudes que llegan y si traen una referencia de campaña. Las conversiones de Google o Meta no se suman como personas.',r.marketing)}
 ${block('Operación comercial','Cómo va la atención de las oportunidades registradas en Clientes.',r.operations)}
 ${block('Ventas','Una oportunidad nueva no es una venta. Las ventas ganadas y perdidas, las metas y el forecast llegan con el núcleo comercial.',r.sales)}
 ${(r.campaigns??[]).length?`<section class="plan-block" aria-labelledby="results-campaigns"><h3 id="results-campaigns">Campañas</h3><p class="hint">Presupuesto planificado, gasto confirmado por el proveedor y lecturas del simulador se muestran por separado. Nada se suma entre ellos.</p>${r.campaigns.map(c=>`<article class="result-campaign"><h4>${escape(c.name)} <span class="hint">${escape(PROVIDER_WORDS[c.provider]??c.provider)}${c.version?` · versión ${c.version}`:''} · referencia ${escape(c.utmCampaign)}</span></h4><ul class="result-grid">${c.metrics.map(metricHtml).join('')}</ul></article>`).join('')}</section>`:''}
 <section class="plan-block" id="cycle-review" aria-labelledby="cycle-title"><h3 id="cycle-title">Revisión del ciclo</h3><p class="hint">Cargando…</p></section>
 <p class="hint">Zona horaria: ${escape(r.timezone)} · Calculado: ${escape(fmt(r.computedAt))}</p>`;
}

// ─── ADR-0032 · Marketing › Sitio web (pure projections; operations live in app.js) ───
export const SITE_GOAL_WORDS={LEADS:'Conseguir contactos y solicitudes',SELL:'Vender un producto o servicio',INFORM:'Dar a conocer la marca',EVENT:'Promocionar un evento o campaña'};
export const SECTION_WORDS={HERO:'Portada',TEXT:'Texto',OFFERS:'Lista de ofertas',IMAGE:'Imagen',CTA:'Llamada a la acción',CONTACT:'Formulario de contacto',FAQ:'Preguntas frecuentes',TESTIMONIALS:'Testimonios',FIGURES:'Cifras'};
const SOURCE_WORDS={OFFER:'Oferta',DECISION:'Decisión',KIT:'Kit',BRAND:'Marca',PERSON:'Persona'};
const PUB_WORDS={PENDING:'Publicando',PUBLISHED:'Publicada',FAILED:'Falló',REPLACED:'Reemplazada'};
const DOMAIN_WORDS={PENDING_VERIFICATION:'Esperando verificación',VERIFIED:'Control verificado',NEEDS_REVERIFICATION:'Comprobación pendiente',FAILED:'Perdió la verificación',REMOVED:'Retirado'};
/** Default content of a new section of the catalogue (never free HTML). */
export function newSection(type){
 const id=`s-${Math.random().toString(36).slice(2,10)}`;
 return ({HERO:{id,type,title:'',subtitle:'',ctaLabel:'',ctaTarget:'',imageAssetId:null,imageAlt:''},TEXT:{id,type,heading:'',body:''},OFFERS:{id,type,heading:'Lo que ofrecemos',items:[]},IMAGE:{id,type,assetId:'',alt:'',caption:''},CTA:{id,type,heading:'',text:'',label:'',target:'#contacto'},CONTACT:{id,type,heading:'Escríbenos',text:''},FAQ:{id,type,heading:'Preguntas frecuentes',items:[{question:'',answer:''}]},TESTIMONIALS:{id,type,heading:'Lo que dicen de nosotros',items:[{quote:'',author:'',role:'',source:null}]},FIGURES:{id,type,heading:'En cifras',items:[{value:'',label:'',context:'',source:null}]}})[type];
}
const targetSelect=(name,value,pages,label)=>{const custom=value&&!value.startsWith('page:')&&value!=='#contacto';return `<label>${escape(label)}<select data-field="${name}" data-target-select><option value="">Sin botón</option>${pages.map(p=>`<option value="page:${escape(p.id)}"${value===`page:${p.id}`?' selected':''}>Página: ${escape(p.title||'sin título')}</option>`).join('')}<option value="#contacto"${value==='#contacto'?' selected':''}>Formulario de contacto</option><option value="url"${custom?' selected':''}>Otra dirección (https://)</option></select></label><input data-field="${name}-url" placeholder="https://" maxlength="300" value="${custom?escape(value):''}"${custom?'':' hidden'} aria-label="Dirección del botón">`;};
const field=(name,label,value,o={})=>o.area?`<label>${escape(label)}<textarea data-field="${name}" maxlength="${o.max??4000}" rows="${o.rows??3}">${escape(value??'')}</textarea></label>`:`<label>${escape(label)}<input data-field="${name}" maxlength="${o.max??300}" value="${escape(value??'')}"${o.placeholder?` placeholder="${escape(o.placeholder)}"`:''}></label>`;
const imageSelect=(name,value,images,label)=>`<label>${escape(label)}<select data-field="${name}"><option value="">${images.length?'Sin imagen':'El kit no tiene imágenes válidas'}</option>${images.map(i=>`<option value="${escape(i.id)}"${i.id===value?' selected':''}>${escape(i.originalName)} · ${i.width}×${i.height}</option>`).join('')}</select></label>`;
/** Source of a testimonial or figure: a brand evidence or a text a person supplied (with where it comes from). Never published. */
function proofSourceEditor(src,k,d,quote){
 const kind=src?.kind==='EVIDENCE'?`EVIDENCE:${src.evidenceId}`:src?.kind==='PERSON'?'PERSON':'';
 const person=src?.kind==='PERSON';
 return `<fieldset class="site-proof-source"><legend>¿De dónde viene? <span class="hint">no se publica; queda en la versión</span></legend><select aria-label="Fuente del elemento ${k+1}" data-field="src-kind${k}" data-source-select><option value="">Elige la fuente</option><option value="PERSON"${person?' selected':''}>Lo aporta una persona</option>${(d.evidence??[]).map(e=>`<option value="EVIDENCE:${escape(e.id)}"${kind===`EVIDENCE:${e.id}`?' selected':''}>Evidencia: ${escape(e.claim.slice(0,80))}${e.source?` (${escape(e.source.slice(0,40))})`:''}</option>`).join('')}</select>
 <div data-person-fields${person?'':' hidden'}>${field(`src-label${k}`,'Fuente (por ejemplo, correo de la clienta del 12 de septiembre)',person?src.label:'')}${quote?`<label class="check-option"><input type="checkbox" data-field="src-permission${k}"${person&&src.permission?' checked':''}> <span>Quien lo dice aceptó que se publique</span></label>`:''}${d.examplesAllowed?`<label class="check-option"><input type="checkbox" data-field="src-example${k}"${person&&src.example?' checked':''}> <span>Es un ejemplo de demostración (el sitio lo marca como ejemplo)</span></label>`:''}</div></fieldset>`;
}
function sectionEditor(s,i,count,pages,d,sources){
 const head=`<div class="site-section-head"><h5>${escape(SECTION_WORDS[s.type])}</h5>${sources?.[s.id]?`<span class="hint">Propuesta de Brando · ${escape(SOURCE_WORDS[sources[s.id].kind])}: ${escape(sources[s.id].label)}</span>`:''}<div class="actions"><button type="button" class="tertiary" data-section-move="-1"${i===0?' disabled':''} aria-label="Subir sección">↑</button><button type="button" class="tertiary" data-section-move="1"${i===count-1?' disabled':''} aria-label="Bajar sección">↓</button><button type="button" class="tertiary" data-section-remove>Quitar</button></div></div>`;
 let body='';
 if(s.type==='HERO')body=field('title','Título',s.title,{max:120})+field('subtitle','Frase de apoyo',s.subtitle)+field('ctaLabel','Texto del botón',s.ctaLabel,{max:60,placeholder:'Ej. Contáctanos'})+targetSelect('ctaTarget',s.ctaTarget,pages,'¿A dónde lleva el botón?')+imageSelect('imageAssetId',s.imageAssetId,d.images,'Imagen')+field('imageAlt','Describe la imagen',s.imageAlt);
 if(s.type==='TEXT')body=field('heading','Título',s.heading,{max:120})+field('body','Texto',s.body,{area:true,rows:5});
 if(s.type==='OFFERS')body=field('heading','Título',s.heading,{max:120})+`<fieldset><legend>Ofertas aprobadas</legend>${d.offers.length?d.offers.map(o=>`<label class="check-option"><input type="checkbox" data-offer="${escape(o.offerId)}"${s.items.some(x=>x.offerId===o.offerId)?' checked':''}> <span>${escape(o.name)} <span class="hint">versión ${o.sequence}</span></span></label>`).join(''):'<p class="hint">No hay ofertas aprobadas en Productos y servicios.</p>'}</fieldset>`;
 if(s.type==='IMAGE')body=imageSelect('assetId',s.assetId,d.images,'Imagen')+field('alt','Describe la imagen',s.alt)+field('caption','Pie de foto (opcional)',s.caption);
 if(s.type==='CTA')body=field('heading','Título',s.heading,{max:120})+field('text','Texto',s.text)+field('label','Texto del botón',s.label,{max:60})+targetSelect('target',s.target,pages,'¿A dónde lleva el botón?');
 if(s.type==='CONTACT')body=field('heading','Título',s.heading,{max:120})+field('text','Texto',s.text)+'<p class="hint">El formulario pide nombre, correo o teléfono y la necesidad. Cada envío llega a Clientes con su origen.</p>';
 if(s.type==='FAQ')body=field('heading','Título',s.heading,{max:120})+s.items.map((q,k)=>`<div class="site-faq" data-faq="${k}">${field(`q${k}`,`Pregunta ${k+1}`,q.question)}${field(`a${k}`,'Respuesta',q.answer,{area:true,rows:2})}</div>`).join('')+'<button type="button" class="tertiary" data-faq-add>Añadir pregunta</button>';
 if(s.type==='TESTIMONIALS')body=field('heading','Título',s.heading,{max:120})+'<p class="hint">Sólo testimonios reales, con su fuente y el permiso de quien los da. Brando no los escribe.</p>'+s.items.map((q,k)=>`<div class="site-proof" data-proof="${k}">${field(`quote${k}`,`Testimonio ${k+1}`,q.quote,{area:true,rows:2,max:600})}${field(`author${k}`,'Quién lo dice',q.author,{max:120})}${field(`role${k}`,'Cargo o relación (opcional)',q.role,{max:120})}${proofSourceEditor(q.source,k,d,true)}</div>`).join('')+'<button type="button" class="tertiary" data-proof-add>Añadir testimonio</button>';
 if(s.type==='FIGURES')body=field('heading','Título',s.heading,{max:120})+'<p class="hint">Sólo cifras con fuente: una evidencia de la marca o de dónde sale el número.</p>'+s.items.map((q,k)=>`<div class="site-proof" data-proof="${k}">${field(`value${k}`,`Cifra ${k+1}`,q.value,{max:30,placeholder:'Ej. 120'})}${field(`flabel${k}`,'Qué mide',q.label,{max:120,placeholder:'Ej. cafeterías atendidas en 2025'})}${field(`fcontext${k}`,'Contexto (opcional)',q.context)}${proofSourceEditor(q.source,k,d,false)}</div>`).join('')+'<button type="button" class="tertiary" data-proof-add>Añadir cifra</button>';
 return `<li class="site-section" data-section="${escape(s.id)}">${head}<div class="site-section-body">${body}</div></li>`;
}
function siteChecks(checks){
 if(!checks)return '';
 const blocking=checks.filter(c=>c.code!=='NO_KIT'&&c.code!=='OUTDATED'),notices=checks.filter(c=>c.code==='NO_KIT'||c.code==='OUTDATED');
 return `<div class="site-checks">${blocking.length?`<p><strong>Antes de publicar falta:</strong></p><ul>${blocking.map(c=>`<li>${escape(c.message)}</li>`).join('')}</ul>`:'<p><span class="badge">Lista para publicar</span> Las comprobaciones previas están completas.</p>'}${notices.length?`<ul class="site-notices">${notices.map(c=>`<li class="hint">${escape(c.message)}</li>`).join('')}</ul>`:''}</div>`;
}
const REQ_WORDS={MET:'hecho',PENDING:'pendiente',PENDING_HOSTING:'pendiente del alojamiento definitivo'};
/** One address: control (TXT, re-checked), DNS routing and HTTPS kept apart; a custom domain is never shown as ready here. */
function domainItem(x,canPublish){
 if(x.kind==='BRANDOPOLIS')return `<li><span>${escape(x.hostname)} <span class="hint">dirección de Brandopolis · servidor de desarrollo, sin HTTPS</span></span><span class="badge">Activa en desarrollo</span></li>`;
 const when=v=>v?escape(fmt(v)):'—';
 const alert=x.status==='NEEDS_REVERIFICATION'?`<p class="hint" role="note">No hemos podido confirmar el registro desde ${when(x.lastConfirmedAt)}. El sitio ya no se sirve en este dominio, pero sigue reservado para tu marca; se reactiva solo cuando se confirme el registro.</p>`
  :x.status==='VERIFIED'&&x.failingSince?`<p class="hint" role="note">La última comprobación no encontró tu registro (desde ${when(x.failingSince)}). Si en la siguiente sigue sin aparecer, el dominio se libera y deja de servirse.</p>`
  :x.status==='VERIFIED'&&x.lastOutcome==='LOOKUP_FAILED'?`<p class="hint" role="note">La última consulta de DNS no respondió; no cambia nada. Se mantiene mientras haya una confirmación vigente (hasta ${when(x.servedUntil)}).</p>`
  :x.status==='FAILED'?`<p class="hint" role="note">El dominio dejó de estar verificado y se liberó. Si vuelves a publicar el registro, pulsa «Comprobar».</p>`:'';
 const reqs=`<span class="hint site-domain-reqs">Control del dominio: ${REQ_WORDS[x.requirements.control]}${x.lastConfirmedAt?` (confirmado ${when(x.lastConfirmedAt)}${x.nextCheckAt?`, próxima comprobación ${when(x.nextCheckAt)}`:''})`:''} · Dirección DNS hacia el alojamiento: ${REQ_WORDS[x.requirements.routing]} · HTTPS: ${REQ_WORDS[x.requirements.https]}</span>`;
 return `<li><span>${escape(x.hostname)}</span><span class="badge ${x.status==='VERIFIED'?'':'warn'}">${escape(DOMAIN_WORDS[x.status])}</span><span class="badge warn">Todavía no se puede publicar aquí</span>${x.record&&x.status!=='VERIFIED'?`<span class="hint">Añade en tu DNS el registro ${escape(x.record.type)} «${escape(x.record.name)}» con el valor «${escape(x.record.value)}».</span>`:''}${reqs}${alert}${canPublish?`<button type="button" class="tertiary" data-domain-check="${escape(x.id)}">Comprobar</button><button type="button" class="tertiary" data-domain-remove="${escape(x.id)}">Retirar</button>`:''}</li>`;
}
/** Marketing › Sitio web: create, propose, edit by sections, check, preview, publish, restore and addresses. */
export function sitesHtml(d,ui){
 const head=`<div class="ws-hero"><p class="eyebrow">Marketing</p><h2>Sitio web</h2><p class="ws-lead">Prepara un sitio con lo que tu marca ya tiene. Brando propone; tú decides qué entra. Nada se publica sin que lo confirmes.</p></div>`;
 if(!d.sites.length)return `${head}<form id="site-create" class="offer-form plan-block" novalidate><h3>¿Qué quieres conseguir con tu sitio?</h3><fieldset><legend class="visually-hidden">Objetivo</legend>${Object.entries(SITE_GOAL_WORDS).map(([k,l],i)=>`<label class="check-option"><input type="radio" name="site-goal" value="${k}"${i===0?' checked':''}> <span>${escape(l)}</span></label>`).join('')}</fieldset><label for="site-name">Nombre del sitio</label><input id="site-name" maxlength="120" required placeholder="Ej. Sitio de ${escape(ui.brandName??'mi marca')}"><p id="site-create-status" role="status" aria-live="polite"></p><div class="actions"><button type="submit">Empezar el sitio</button></div><p class="hint">No hace falta tener toda la estrategia: empiezas con lo que hay y el sitio te dice lo que falta.</p></form>`;
 const site=d.sites.find(s=>s.id===ui.siteId)??d.sites[0],draft=ui.draft,live=site.publications.find(p=>p.status==='PUBLISHED');
 const host=site.domains.find(x=>x.kind==='BRANDOPOLIS')?.hostname;
 const known=`<section class="plan-block" aria-labelledby="site-known"><h3 id="site-known">Lo que ya tenemos</h3><ul class="site-known"><li><strong>Objetivo:</strong> ${escape(SITE_GOAL_WORDS[site.goal])}</li><li><strong>Ofertas aprobadas:</strong> ${d.offers.length?d.offers.map(o=>escape(o.name)).join(', '):'ninguna todavía (puedes crearlas en Productos y servicios)'}</li><li><strong>Kit de marca:</strong> ${d.kit?`versión ${d.kit.sequence}${d.kit.published?' publicada':' aprobada'}`:'sin kit aprobado: se usarán colores neutros'}</li><li><strong>Imágenes del kit utilizables:</strong> ${d.images.length}</li></ul></section>`;
 const proposal=ui.proposal?`<div class="site-proposal" role="region" aria-label="Propuesta de Brando"><p><strong>Propuesta de Brando</strong> <span class="hint">sin aprobar · se basa en lo aprobado de tu marca</span></p>${ui.proposal.missing.length?`<p class="hint">Para mejorarla falta: ${ui.proposal.missing.map(escape).join('; ')}.</p>`:''}<ul>${ui.proposal.proposal.pages.map(p=>`<li><strong>${escape(p.title)}</strong>: ${p.sections.map(s=>escape(SECTION_WORDS[s.type])).join(' · ')}</li>`).join('')}</ul>${ui.proposal.suggestions?.length?`<p><strong>Secciones que puedes añadir cuando tengas la información</strong> <span class="hint">Brando no las rellena</span></p><ul class="site-suggestions">${ui.proposal.suggestions.map(x=>`<li><strong>${escape(x.title)}</strong>: ${escape(x.why)} <span class="hint">Necesitas: ${escape(x.needs)}</span></li>`).join('')}</ul>`:''}<div class="actions"><button type="button" id="site-proposal-apply">Incorporar la propuesta al borrador</button><button type="button" class="secondary" id="site-proposal-discard">Descartar</button></div><p class="hint">Incorporarla sólo cambia tu borrador. Puedes editar o quitar cualquier parte.</p></div>`:'';
 const pages=draft?draft.content.pages:[];
 const editor=draft?`<section class="plan-block" aria-labelledby="site-edit"><h3 id="site-edit">Páginas y secciones ${editorialStateBadge('DRAFT',draft.sequence)}</h3>${proposal}${!ui.proposal?`<div class="actions"><button type="button" class="secondary" id="site-propose">Pedir propuesta a Brando</button></div>`:''}
  <form id="site-editor" novalidate>${pages.length?pages.map((p,pi)=>`<details class="site-page" data-page="${escape(p.id)}"${pi===ui.openPage?' open':''}><summary><strong>${escape(p.title||'Página sin título')}</strong> <span class="hint">${pi===0?'/':`/${escape(p.slug)}/`} · ${p.sections.length} sección(es)</span></summary>
   <div class="site-page-fields">${field('page-title','Título de la página',p.title,{max:120})}${pi?field('page-slug','Dirección (sin espacios)',p.slug,{max:60}):''}${field('page-description','Descripción para buscadores',p.description,{max:160})}</div>
   <ol class="site-sections">${p.sections.map((s,si)=>sectionEditor(s,si,p.sections.length,pages,d,ui.sources)).join('')}</ol>
   <div class="actions"><label class="visually-hidden" for="add-${escape(p.id)}">Tipo de sección</label><select id="add-${escape(p.id)}" data-section-type>${Object.entries(SECTION_WORDS).map(([k,l])=>`<option value="${k}">${escape(l)}</option>`).join('')}</select><button type="button" class="secondary" data-section-add>Añadir sección</button>${pi?'<button type="button" class="tertiary" data-page-remove>Quitar página</button>':''}</div></details>`).join(''):'<p class="hint">El sitio todavía no tiene páginas. Pide una propuesta a Brando o añade la primera página.</p>'}
   <div class="actions"><button type="button" class="secondary" id="site-page-add"${pages.length>=12?' disabled':''}>Añadir página</button><button type="submit" id="site-save">Guardar borrador</button></div><p id="site-save-status" role="status" aria-live="polite"></p></form>
  ${siteChecks(draft.checks)}
  <div class="actions"><a class="secondary button-link" id="site-preview" href="${escape(d.previewOrigin)}/b/${escape(ui.brandId)}/v/${escape(draft.id)}/" target="_blank" rel="noopener">Vista previa del borrador</a><button type="button" id="site-submit"${pages.length?'':' disabled'}>Enviar a revisión</button></div><p class="hint">La vista previa se abre en otra dirección, sólo para personas con acceso. Enviar a revisión fija esta versión.</p></section>`
  :`<section class="plan-block"><p class="hint">No hay un borrador abierto.</p><div class="actions"><button type="button" class="secondary" id="site-new-draft">Crear una versión nueva</button></div></section>`;
 const review=site.inReview.map(v=>`<article class="offer-version"><p class="offer-version-head">${editorialStateBadge('IN_REVIEW',v.sequence)}</p><p><a href="${escape(d.previewOrigin)}/b/${escape(ui.brandId)}/v/${escape(v.id)}/" target="_blank" rel="noopener">Vista previa de la versión ${v.sequence}</a></p><form class="site-decide offer-form" data-version="${escape(v.id)}" data-fingerprint="${escape(v.fingerprint)}"><label for="site-criterion-${escape(v.id)}">¿Por qué apruebas o pides cambios?</label><textarea id="site-criterion-${escape(v.id)}" maxlength="2000" rows="2"></textarea><div class="actions"><button type="submit" value="APPROVE">Aprobar esta versión</button><button type="submit" value="REQUEST_CHANGES" class="secondary">Pedir cambios</button></div></form></article>`).join('');
 const approved=site.approved?`<article class="offer-version"><p class="offer-version-head">${editorialStateBadge('APPROVED',site.approved.sequence)}${site.liveVersionId===site.approved.id?' <span class="badge">En línea</span>':''}</p>${siteChecks(site.approved.checks)}${d.canPublish?`<div class="actions"><button type="button" data-site-publish="${escape(site.approved.id)}" data-sequence="${site.approved.sequence}">Publicar esta versión</button></div>`:'<p class="hint">Publicar necesita el permiso de publicar en esta marca.</p>'}<div class="actions"><button type="button" class="secondary" data-site-zip="${escape(site.approved.id)}">Descargar ZIP de la versión ${site.approved.sequence}</button></div><p class="hint">Una copia de esta versión exacta para alojarla en otro sitio. Su formulario no envía solicitudes fuera de Brandopolis; el archivo LEEME.txt explica qué incluye y qué no.</p></article>`:'';
 const pubs=site.publications.length?`<ul class="collab-list">${site.publications.map(p=>`<li><span>Versión ${p.sequence} · ${escape(fmt(p.createdAt))}${p.restoredFrom?' · restauración':''}</span><span class="badge ${p.status==='FAILED'?'warn':''}">${escape(PUB_WORDS[p.status])}</span>${p.status==='REPLACED'&&d.canPublish?`<button type="button" class="tertiary" data-site-publish="${escape(p.versionId)}" data-sequence="${p.sequence}" data-restore>Restaurar esta versión</button>`:''}</li>`).join('')}</ul>`:'<p class="hint">Todavía no has publicado.</p>';
 const publish=`<section class="plan-block" aria-labelledby="site-publish"><h3 id="site-publish">Revisar y publicar</h3>${review}${approved}<h4>Publicaciones</h4>${live&&host?`<p>En línea: <a href="${escape(d.publicScheme)}://${escape(host)}/" target="_blank" rel="noopener" id="site-live-link">${escape(host)}</a> · versión ${live.sequence}</p>`:''}${pubs}<p class="hint">En esta etapa se publica en el servidor de desarrollo aislado; la dirección definitiva depende del dominio de publicación que se decida.</p></section>`;
 const domains=`<section class="plan-block" aria-labelledby="site-domains"><h3 id="site-domains">Dirección del sitio</h3><ul class="collab-list site-domains">${site.domains.filter(x=>x.status!=='REMOVED').map(x=>domainItem(x,d.canPublish)).join('')}</ul>${d.canPublish?`<form id="site-domain-form" class="offer-form" novalidate><label for="site-domain">Tu dominio propio <span class="hint">opcional</span></label><input id="site-domain" maxlength="253" placeholder="www.tumarca.com"><div class="actions"><button type="submit" class="secondary">Añadir dominio</button></div><p class="hint">Brandopolis no compra dominios ni cambia tu DNS. Tú añades el registro; después lo comprobamos y lo volvemos a comprobar cada día. Para publicar de verdad en tu dominio hacen falta tres cosas: el control verificado, la dirección DNS hacia el alojamiento y HTTPS. Las dos últimas dependen del alojamiento definitivo.</p></form>`:''}</section>`;
 const picker=d.sites.length>1?`<label for="site-pick">Sitio</label><select id="site-pick">${d.sites.map(s=>`<option value="${escape(s.id)}"${s.id===site.id?' selected':''}>${escape(s.name)}</option>`).join('')}</select>`:'';
 return `${head}${picker}<p class="site-steps" aria-label="Pasos">1 · Objetivo ✓ &nbsp; 2 · Lo que ya tenemos &nbsp; 3 · Propuesta &nbsp; 4 · Edición &nbsp; 5 · Revisar y publicar</p>${known}${editor}${publish}${domains}`;
}

// ─── Block 8 · Campañas digitales (Google Ads, Meta Ads), Canva and cycle review (pure projections) ───
const PROVIDER_WORDS={GOOGLE_ADS:'Google Ads · Búsqueda',META_ADS:'Meta Ads · Tráfico',CANVA:'Canva'};
const CAMPAIGN_KIND_WORDS={SEARCH:'Google Ads · Búsqueda',TRAFFIC:'Meta Ads · Tráfico',LEADS:'Meta Ads · Captación'};
const OPERATION_WORDS={CREATE_PAUSED:'Crear en pausa',ACTIVATE:'Activar (segunda autorización)',PAUSE:'Pausar'};
const DELIVERY_WORDS={NOT_CREATED:'Sin crear en la cuenta',PAUSED:'En pausa en la cuenta',ACTIVE:'Activa en la cuenta'};
const BLOCK_WORDS={MEASUREMENT_NOT_VERIFIED:'La medición del destino ya no está verificada: no se activó. Vuelve a verificarla y solicita otra autorización.',CAPABILITY_REVOKED:'Quien autorizó ya no tiene permiso de gasto: no se envió nada más.',AUTHORIZATION_NOT_RESERVED:'La autorización se canceló o ya no está reservada: no se envió nada más.',CONNECTION_UNAVAILABLE:'La conexión no está activa: vuelve a conectar la cuenta. No se envió el siguiente paso.',AUTHORIZATION_EXPIRED:'La autorización venció: lo que falta necesita una autorización nueva.',CONTENT_CHANGED:'La versión aprobada cambió: lo autorizado ya no coincide y no se envía.',POSSIBLE_DUPLICATE:'Posible duplicado: un resultado tardío contradice lo registrado. Una persona debe revisarlo antes de seguir.',HUMAN_RELEASE_REQUIRED:'Espera a que una persona decida si se reintenta.',AUTHORIZATION_CANCELLED:'Autorización cancelada: no se envían más pasos.',ACTOR_LACKS_SPEND:'Quien autorizó ya no tiene permiso de gasto.',STEP_NOT_DISPATCHABLE:'Hay un paso incierto: se comprueba antes de seguir.'};
const CODE_WORDS={RESOURCE_EXHAUSTED:'El proveedor limitó las peticiones; nada se creó.',PERMISSION_DENIED:'La cuenta no tiene permiso suficiente; nada se creó.',UNAUTHENTICATED:'La credencial no es válida; nada se creó.',DEADLINE_EXCEEDED:'Se perdió la respuesta: pudo haberse creado.',TRANSPORT_ERROR:'Se cortó la comunicación: pudo haberse creado.',INVALID_ARGUMENT:'El proveedor rechazó los datos; nada se creó.',DUPLICATE_NAME:'Ya existía un recurso con esa referencia.'};
const OUTCOME_WORDS={PROVIDER_SUCCESS:'Creado',PROVIDER_REJECTED:'Rechazado',AMBIGUOUS:'Sin respuesta clara',LATE_RESULT:'Respuesta tardía',RECONCILED_FOUND:'Encontrado al comprobar',REMOTE_ABSENCE_CONFIRMED:'Ausencia comprobada',NOT_SENT_DEADLINE:'No enviado (plazo vencido)',EMIT_IMPOSSIBLE:'El intento ya no puede enviarse'};
const SCENARIO_WORDS={NORMAL:'Normal',LOST_RESPONSE:'Respuesta perdida después de crear',LOST_AND_DELAYED:'Respuesta perdida y recurso visible con retraso',RATE_LIMIT:'Límite del proveedor',PERMISSION_DENIED:'Acceso insuficiente'};
const lines=v=>(v??[]).join('\n');
function campaignEditor(c,v,d){
 const x=v.content,g=c.provider==='GOOGLE_ADS';
 const sel=(id,label,opts,val)=>`<label for="${id}">${escape(label)}</label><select id="${id}">${opts.map(([k,l])=>`<option value="${escape(k)}"${k===val?' selected':''}>${escape(l)}</option>`).join('')}</select>`;
 const dest=x.destination?.kind==='SITE'?`SITE:${x.destination.siteId}`:x.destination?.kind==='URL'?'URL':'';
 return `<form class="campaign-editor offer-form" data-campaign="${escape(c.id)}" novalidate>
 <label for="cmp-name-${escape(c.id)}">Nombre</label><input id="cmp-name-${escape(c.id)}" data-f="name" maxlength="120" value="${escape(x.name)}">
 ${sel(`cmp-offer-${c.id}`,'Oferta aprobada que anuncia',[['','Elige una oferta'],...d.offers.map(o=>[`${o.offerId}|${o.offerVersionId}|${o.name}`,`${o.name} · versión ${o.sequence}`])],x.offer?`${x.offer.offerId}|${x.offer.offerVersionId}|${x.offer.name}`:'')}
 ${sel(`cmp-dest-${c.id}`,'¿A dónde llega quien hace clic?',[['','Elige un destino'],...d.sites.map(s=>[`SITE:${s.siteId}`,`Sitio publicado: ${s.name}`]),['URL','Otra dirección https']],dest)}
 <input id="cmp-url-${escape(c.id)}" aria-label="Dirección https de destino" placeholder="https://" maxlength="300" value="${x.destination?.kind==='URL'?escape(x.destination.url):''}"${dest==='URL'?'':' hidden'}>
 ${sel(`cmp-ad-${c.id}`,'Textos de un anuncio aprobado (opcional)',[['','No usar'],...d.ads.map(a=>[`${a.deliverableId}|${a.versionId}`,`${a.name} · versión ${a.sequence}`])],x.adDeliverable?`${x.adDeliverable.deliverableId}|${x.adDeliverable.versionId}`:'')}
 ${g?`<label for="cmp-kw-${escape(c.id)}">Palabras clave <span class="hint">una por línea</span></label><textarea id="cmp-kw-${escape(c.id)}" rows="3">${escape(lines(x.search.keywords.map(k=>k.text)))}</textarea>
 <label for="cmp-h-${escape(c.id)}">Títulos <span class="hint">uno por línea · de 3 a 15 · máximo 30 caracteres</span></label><textarea id="cmp-h-${escape(c.id)}" rows="4">${escape(lines(x.search.headlines))}</textarea>
 <label for="cmp-d-${escape(c.id)}">Descripciones <span class="hint">una por línea · de 2 a 4 · máximo 90 caracteres</span></label><textarea id="cmp-d-${escape(c.id)}" rows="3">${escape(lines(x.search.descriptions))}</textarea>`
 :`<label for="cmp-pt-${escape(c.id)}">Texto principal</label><textarea id="cmp-pt-${escape(c.id)}" rows="3" maxlength="500">${escape(x.social.primaryText)}</textarea>
 <label for="cmp-hl-${escape(c.id)}">Titular <span class="hint">máximo 40 caracteres</span></label><input id="cmp-hl-${escape(c.id)}" maxlength="120" value="${escape(x.social.headline)}">
 ${sel(`cmp-img-${c.id}`,'Imagen del kit',[['',d.images.length?'Elige una imagen':'El kit no tiene imágenes válidas'],...d.images.map(i=>[i.id,`${i.originalName} · ${i.width}×${i.height}`])],x.social.imageAssetId??'')}
 <label for="cmp-alt-${escape(c.id)}">Describe la imagen</label><input id="cmp-alt-${escape(c.id)}" maxlength="300" value="${escape(x.social.imageAlt)}">
 <div class="plan-dates"><div><label for="cmp-amin-${escape(c.id)}">Edad mínima</label><input id="cmp-amin-${escape(c.id)}" type="number" min="18" max="65" value="${x.audience.ageMin??''}"></div><div><label for="cmp-amax-${escape(c.id)}">Edad máxima</label><input id="cmp-amax-${escape(c.id)}" type="number" min="18" max="65" value="${x.audience.ageMax??''}"></div></div>`}
 <label for="cmp-geo-${escape(c.id)}">Ubicaciones <span class="hint">una por línea</span></label><textarea id="cmp-geo-${escape(c.id)}" rows="2">${escape(lines(x.audience.geo))}</textarea>
 <div class="plan-dates">${g?'':`<div>${sel(`cmp-btype-${c.id}`,'Tipo de presupuesto',[['DAILY','Diario (promedio)'],['TOTAL','Total']],x.budget.type)}</div>`}<div><label for="cmp-amt-${escape(c.id)}">Presupuesto${g?' diario (promedio)':''}</label><input id="cmp-amt-${escape(c.id)}" inputmode="decimal" maxlength="12" value="${escape(x.budget.amount)}"></div><div>${sel(`cmp-cur-${c.id}`,'Moneda',['MXN','USD','EUR','COP','ARS','CLP','PEN'].map(k=>[k,k]),x.budget.currency)}</div></div>
 <div class="plan-dates"><div><label for="cmp-start-${escape(c.id)}">Inicio</label><input id="cmp-start-${escape(c.id)}" type="date" value="${escape(x.schedule.startDate)}"></div><div><label for="cmp-end-${escape(c.id)}">Fin <span class="hint">opcional con presupuesto diario</span></label><input id="cmp-end-${escape(c.id)}" type="date" value="${escape(x.schedule.endDate??'')}"></div></div>
 <p class="hint">Zona horaria: ${escape(x.schedule.timezone)}. El presupuesto diario es un promedio: el proveedor puede gastar más un día concreto.</p>
 <div class="actions"><button type="button" class="secondary" data-campaign-propose="${escape(c.id)}">Pedir propuesta a Brando</button><button type="submit">Guardar borrador</button><button type="button" data-campaign-submit="${escape(c.id)}">Enviar a revisión</button></div></form>`;
}
function campaignChecks(checks){
 if(!checks)return '';
 const blocking=checks.filter(c=>c.code!=='OUTDATED'),notices=checks.filter(c=>c.code==='OUTDATED');
 return `<div class="site-checks">${blocking.length?`<p><strong>Antes de solicitar su creación falta:</strong></p><ul>${blocking.map(c=>`<li>${escape(c.message)}</li>`).join('')}</ul>`:'<p><span class="badge">Lista para solicitar</span> Las comprobaciones están completas.</p>'}${notices.length?`<ul class="site-notices">${notices.map(c=>`<li class="hint">${escape(c.message)}</li>`).join('')}</ul>`:''}</div>`;
}
function campaignSummary(x){
 const rows=[['Oferta',x.offer?.name??''],['Destino',x.destination?.url??''],['Ubicaciones',x.audience.geo.join(', ')],['Presupuesto',x.budget.amount?`${x.budget.amount} ${x.budget.currency} · ${x.budget.type==='DAILY'?'diario promedio':'total'}`:''],['Fechas',x.schedule.startDate?`${x.schedule.startDate}${x.schedule.endDate?` a ${x.schedule.endDate}`:' sin fecha de fin'}`:'']];
 if(x.search)rows.push(['Palabras clave',x.search.keywords.map(k=>k.text).join(', ')],['Títulos',x.search.headlines.join(' · ')],['Descripciones',x.search.descriptions.join(' · ')]);
 if(x.social)rows.push(['Texto',x.social.primaryText],['Titular',x.social.headline]);
 return `<dl class="facts">${rows.filter(([,v])=>v).map(([k,v])=>`<dt>${escape(k)}</dt><dd>${escape(v)}</dd>`).join('')}</dl>`;
}
function operationHtml(o,c,d){
 const simulated=d.connections.ads.find(l=>l.provider===c.provider)?.simulated;
 const steps=o.steps.map(s=>{const last=s.attempts[s.attempts.length-1];const codes=s.attempts.flatMap(a=>a.outcomes).map(x=>`${OUTCOME_WORDS[x.kind]??x.kind}${x.code?` · ${CODE_WORDS[x.code]??x.code}`:''}`);
  const actions=[s.status==='NEEDS_CHECK'&&simulated?`<button type="button" class="tertiary" data-sim-release="${escape(o.jobId)}" data-step="${escape(s.key)}">Simulador: hacer visible el recurso</button>`:'',s.status==='REJECTED'&&d.canAuthorize?`<form class="campaign-retry" data-job="${escape(o.jobId)}" data-step="${escape(s.key)}"><label for="retry-${escape(o.jobId)}-${escape(s.key)}">Criterio para reintentar este paso</label><input id="retry-${escape(o.jobId)}-${escape(s.key)}" maxlength="2000" minlength="10"><button type="submit" class="secondary">Reintentar este paso</button></form>`:''].join('');
  return `<li><span>${escape(s.label)}</span>${operationBadge('step',s.status)}<span class="hint">Referencia ${escape(s.reference)}${Object.keys(s.providerIds??{}).length?` · id del proveedor ${escape(Object.values(s.providerIds).join(', '))}`:''}${last?` · ${s.attempts.length} intento(s)`:''}</span>${codes.length?`<span class="hint">${escape(codes.join(' · '))}</span>`:''}${actions}</li>`;}).join('');
 const auth=o.authorization;
 const inFlight=o.steps.some(s=>['DISPATCHING','NEEDS_CHECK'].includes(s.status));
 const cancellable=auth&&['AUTHORIZED','RESERVED'].includes(auth.status)&&['QUEUED','CLAIMED','RUNNING','NEEDS_CHECK','PARTIAL'].includes(o.status)&&d.canAuthorize;
 const cancel=cancellable?`<button type="button" class="tertiary" data-campaign-cancel="${escape(auth.id)}">${inFlight||o.status==='RUNNING'?'Pedir que se detenga':'Cancelar antes de enviar'}</button>`:'';
 const sentKeys=o.steps.filter(s=>['DISPATCHING','NEEDS_CHECK'].includes(s.status)).map(s=>s.label);
 const stopped=auth?.status==='CANCELLED'?`<p class="hint" role="note"><strong>Solicitud cancelada.</strong> ${sentKeys.length?`No se enviará nada más; ${escape(sentKeys.join(', '))} ya había salido y queda pendiente de comprobación hasta conocer el resultado.`:o.steps.some(s=>s.status==='SUCCEEDED')?'No se envió nada más; lo ya creado sigue en la cuenta.':'Nada llegó al proveedor.'} Cancelar detiene la solicitud: no pausa ni borra lo que ya exista en la cuenta.</p>`:'';
 const reconcile=o.status==='NEEDS_CHECK'||o.steps.some(s=>s.status==='NEEDS_CHECK')?`<button type="button" class="secondary" data-campaign-reconcile="${escape(o.jobId)}">Comprobar en el proveedor</button>`:'';
 const status=o.status==='SUCCEEDED'&&o===c.operations.find(x=>x.status==='SUCCEEDED')?`<button type="button" class="secondary" data-campaign-status="${escape(c.id)}">Leer estado en el proveedor</button>`:'';
 return `<article class="campaign-operation" data-job="${escape(o.jobId)}"><p><strong>${escape(OPERATION_WORDS[o.operation]??o.operation)}</strong> ${operationBadge('job',o.status)} ${auth?`<span class="hint">versión ${auth.sequence} · autorizada · vence ${escape(fmt(auth.expiresAt))}</span>`:''}</p>${o.blockedReason?`<p class="hint" role="note">${escape(BLOCK_WORDS[o.blockedReason]??o.blockedReason)}</p>`:''}${o.lastErrorCode?`<p class="hint">${escape(CODE_WORDS[o.lastErrorCode]??o.lastErrorCode)}</p>`:''}${stopped}<ol class="collab-list campaign-steps">${steps}</ol>${o.status==='NEEDS_CHECK'?'<p class="hint">Un paso pudo crearse: no se repite a ciegas. «Comprobar» busca el recurso por su referencia; si no aparece, sigue pendiente hasta tener evidencia.</p>':''}<div class="actions">${reconcile}${status}${cancel}</div></article>`;
}
/** Marketing › Campañas digitales: connections, campaigns, review, request creation in pause, operations and status. */
export function campaignsHtml(d,ui){
 if(!d.available)return '<section class="plan-block"><h3>Campañas en Google Ads y Meta Ads</h3><p class="hint">No disponible en este entorno.</p></section>';
 const sim=d.simulatedOnly?'<p class="campaign-sim" role="note"><strong>Simulador.</strong> No hay conexión real con Google ni con Meta: nada de lo que hagas aquí crea anuncios reales ni gasta dinero. Las cuentas reales esperan el acceso del proveedor.</p>':'';
 const conns=`<section class="plan-block" aria-labelledby="cmp-conns"><h4 id="cmp-conns">Cuentas</h4>${d.connections.ads.length?`<ul class="collab-list">${d.connections.ads.map(l=>`<li><span>${escape(PROVIDER_WORDS[l.provider]??l.provider)} · ${escape(l.account)}</span>${l.simulated?'<span class="badge warn">Simulada</span>':''}<span class="badge ${l.status==='ACTIVE'?'':'warn'}">${l.status==='ACTIVE'?'Conectada':'Acceso vencido'}</span>${d.canManageConnections&&l.simulated?`<button type="button" class="tertiary" data-conn-status="${escape(l.connectionId)}" data-to="${l.status==='ACTIVE'?'EXPIRED':'ACTIVE'}">${l.status==='ACTIVE'?'Simular acceso vencido':'Volver a conectar'}</button>`:''}</li>`).join('')}</ul>`:'<p class="hint">Todavía no hay cuentas.</p>'}${d.canManageConnections&&d.simulatedOnly?`<div class="actions">${['GOOGLE_ADS','META_ADS'].filter(p=>!d.connections.ads.some(l=>l.provider===p)).map(p=>`<button type="button" class="secondary" data-conn-sim="${p}">Conectar cuenta simulada de ${p==='GOOGLE_ADS'?'Google Ads':'Meta Ads'}</button>`).join('')}</div>`:''}</section>`;
 const create=`<form id="campaign-create" class="offer-form plan-block" novalidate><h4>Nueva campaña</h4><fieldset><legend class="visually-hidden">Proveedor</legend>${['GOOGLE_ADS','META_ADS'].map((p,i)=>`<label class="check-option"><input type="radio" name="cmp-provider" value="${p}"${i===0?' checked':''}> <span>${escape(PROVIDER_WORDS[p])}</span></label>`).join('')}</fieldset><label class="check-option"><input type="checkbox" id="cmp-leads"> <span>Meta: captación de contactos (necesita un sitio publicado con medición verificada para activarse)</span></label><label for="cmp-new-name">Nombre de la campaña</label><input id="cmp-new-name" maxlength="120"><div class="actions"><button type="submit" class="secondary">Crear campaña</button></div><p class="hint">Google: Búsqueda con anuncios adaptables. Meta: tráfico al sitio o captación.</p></form>`;
 const cards=d.campaigns.map(c=>{
  const draft=c.draft?`<div class="offer-version"><p class="offer-version-head">${editorialStateBadge('DRAFT',c.draft.sequence)}${c.draft.provenance==='AI_ASSISTED'?' <span class="hint">con propuesta de Brando incorporada</span>':''}</p>${ui.proposals?.[c.id]?`<div class="site-proposal" role="region" aria-label="Propuesta de Brando"><p><strong>Propuesta de Brando</strong> <span class="hint">sin aprobar · no se ha guardado</span></p><ul>${Object.values(ui.proposals[c.id].sources).map(x=>`<li>${escape(x)}</li>`).join('')}</ul>${ui.proposals[c.id].missing.length?`<p class="hint">Falta: ${ui.proposals[c.id].missing.map(escape).join('; ')}.</p>`:''}<div class="actions"><button type="button" data-proposal-apply="${escape(c.id)}">Incorporar al borrador</button><button type="button" class="secondary" data-proposal-discard="${escape(c.id)}">Descartar</button></div></div>`:''}${campaignEditor(c,c.draft,d)}${campaignChecks(c.draft.checks)}</div>`:'';
  const review=c.inReview.map(v=>`<div class="offer-version"><p class="offer-version-head">${editorialStateBadge('IN_REVIEW',v.sequence)}</p>${campaignSummary(v.content)}<form class="campaign-decide offer-form" data-campaign="${escape(c.id)}" data-version="${escape(v.id)}" data-fingerprint="${escape(v.fingerprint)}"><label for="cmp-crit-${escape(v.id)}">¿Por qué apruebas o pides cambios?</label><textarea id="cmp-crit-${escape(v.id)}" maxlength="2000" rows="2"></textarea><div class="actions"><button type="submit" value="APPROVE">Aprobar esta versión</button><button type="submit" value="REQUEST_CHANGES" class="secondary">Pedir cambios</button></div><p class="hint">Aprobar no crea nada en el proveedor: solicitarlo es otro paso, con otra confirmación.</p></form></div>`).join('');
  const link=d.connections.ads.find(l=>l.provider===c.provider);
  const open=c.operations.some(o=>!['SUCCEEDED','FAILED','EXPIRED','CANCELLED'].includes(o.status)); // same rule as the one-open-operation index
  const approved=c.approved?`<div class="offer-version"><p class="offer-version-head">${editorialStateBadge('APPROVED',c.approved.sequence)}</p>${campaignSummary(c.approved.content)}${campaignChecks(c.approved.checks)}${measurementHtml(c,d)}<p class="campaign-states"><strong>En la cuenta:</strong> ${escape(DELIVERY_WORDS[c.delivery]??'')}</p>${d.canAuthorize?(link?campaignActions(c,link,open):'<p class="hint">Conecta una cuenta de este proveedor para solicitar operaciones.</p>'):'<p class="hint">Solicitar operaciones necesita el permiso de autorizar gasto en esta marca.</p>'}${ui.screens?.[c.id]?screenHtml(ui.screens[c.id]):''}</div>`:'';
  const ops=c.operations.length?`<h4>Operaciones en el proveedor</h4>${c.operations.map(o=>operationHtml(o,c,d)).join('')}`:'';
  const reading=c.metrics[0]?`<p class="campaign-states"><strong>Estados por separado:</strong> editorial ${editorialStateBadge(c.approved?'APPROVED':'DRAFT',c.approved?.sequence)} · operación ${operationBadge('job',c.operations[0]?.status??'')} · proveedor${c.metrics[0].source==='SIMULATED'?' (simulado)':''}: ${c.metrics[0].providerStatus==='PAUSED'?'en pausa':escape(c.metrics[0].providerStatus??'')} · revisión del anuncio: ${c.metrics[0].reviewStatus==='UNDER_REVIEW'?'en revisión':escape(c.metrics[0].reviewStatus??'')} <span class="hint">leído ${escape(fmt(c.metrics[0].recordedAt))}</span></p>`:'';
  const tail=`<div class="actions">${!c.draft?`<button type="button" class="secondary" data-campaign-new-draft="${escape(c.id)}">Crear una versión nueva</button>`:''}</div><p class="hint">Activar es una segunda autorización, distinta de la de creación. En esta DEMO todo ocurre en el simulador: no hay campañas ni gasto reales.</p>`;
  return `<article class="offer-card campaign-card" data-campaign-id="${escape(c.id)}"><header><p class="eyebrow">${escape(CAMPAIGN_KIND_WORDS[c.objective]??PROVIDER_WORDS[c.provider])}</p><h3>${escape(c.name)}</h3><p class="hint">Referencia para enlaces: utm_campaign=${escape(c.utmCampaign)}</p></header>${draft}${review}${approved}${ops}${reading}${tail}</article>`;
 }).join('');
 return `<section class="campaigns-area" aria-labelledby="campaigns-title"><h2 id="campaigns-title" class="section-title">Campañas en Google Ads y Meta Ads</h2>${sim}${conns}${create}${cards||'<p class="hint">Todavía no hay campañas.</p>'}</section>`;
}
function campaignActions(c,link,open){
 const b=(op,label)=>`<button type="button" data-campaign-screen="${escape(c.id)}" data-link="${escape(link.linkId)}" data-operation="${op}"${open?' disabled':''}>${label}</button>`;
 if(c.delivery==='NOT_CREATED')return `<div class="actions">${b('CREATE_PAUSED','Solicitar la creación en pausa')}</div>`;
 if(c.delivery==='PAUSED')return c.measurement&&!c.measurement.verified?'<p class="hint">Para activar una campaña de captación, primero verifica la medición del sitio de destino.</p>':`<div class="actions">${b('ACTIVATE','Solicitar la activación (segunda autorización)')}</div>`;
 return `<div class="actions">${b('PAUSE','Solicitar la pausa')}</div>`;
}
/** Lead campaigns: measurement of the live destination, verified only by (simulated) evidence. */
function measurementHtml(c,d){
 if(!c.measurement)return '';
 const m=c.measurement,site=d.sites.find(s=>s.siteId===m.siteId);
 return `<div class="campaign-measurement"><p><strong>Medición del destino:</strong> ${m.verified?`<span class="badge">Verificada${m.source==='SIMULATED'?' (simulada)':''}</span>`:'<span class="badge warn">Sin verificar</span>'} ${site?`<span class="hint">${escape(site.name)}</span>`:'<span class="hint">elige un sitio publicado como destino</span>'}</p><p class="hint">Activar una campaña de captación exige medición verificada de la publicación en línea del destino. En la DEMO la verificación es simulada; la comprobación real está pendiente.</p>${d.simulatedOnly&&m.siteId&&m.live?`<div class="actions">${m.verified?`<button type="button" class="tertiary" data-measure-withdraw="${escape(m.evidenceId)}">Simular que la medición deja de estar verificada</button>`:`<button type="button" class="secondary" data-measure-verify="${escape(m.siteId)}">Registrar verificación simulada</button>`}</div>`:''}</div>`;
}
function screenHtml(x){
 const s=x.summary;
 return `<div class="campaign-screen" role="region" aria-label="Confirmación"><h4>Confirma lo que se solicita al proveedor · ${escape(OPERATION_WORDS[x.operation])}</h4>${x.simulated?'<p class="campaign-sim"><strong>Cuenta simulada:</strong> nada llega a Google ni a Meta.</p>':''}<dl class="facts"><dt>Operación</dt><dd>${escape(OPERATION_WORDS[x.operation])}</dd>${x.measurement?`<dt>Medición</dt><dd>${x.measurement.verified?'Verificada (simulada)':'Sin verificar'}</dd>`:''}<dt>Cuenta</dt><dd>${escape(s.accountLabel)}</dd><dt>Marca</dt><dd>${escape(x.brand)}</dd><dt>Campaña</dt><dd>${escape(x.campaign)} · versión aprobada ${x.sequence}</dd><dt>Destino</dt><dd>${escape(s.destination)}</dd><dt>Presupuesto</dt><dd>${escape(x.budgetRule)}</dd><dt>Fechas</dt><dd>${escape(s.startsOn??'')}${s.endsOn?` a ${escape(s.endsOn)}`:' sin fecha de fin'} · ${escape(s.timeZone)}</dd></dl><p>${escape(x.effect)}</p>${x.simulated?`<label for="cmp-scenario">Escenario del simulador</label><select id="cmp-scenario">${Object.entries(SCENARIO_WORDS).map(([k,l])=>`<option value="${k}">${escape(l)}</option>`).join('')}</select>`:''}<div class="actions"><button type="button" data-campaign-request="${escape(x.campaignId)}" data-fingerprint="${escape(x.screenFingerprint)}" data-link="${escape(x.linkId)}" data-operation="${escape(x.operation)}">${x.operation==='ACTIVATE'?'Autorizar y solicitar la activación':x.operation==='PAUSE'?'Autorizar y solicitar la pausa':'Autorizar y solicitar la creación en pausa'}</button><button type="button" class="secondary" data-screen-close="${escape(x.campaignId)}">Cancelar</button></div></div>`;
}
const CANVA_WORDS={VERIFIED:'verificada',SIMULATED:'simulada',UNAVAILABLE:'no disponible en el plan',NOT_VERIFIED:'sin verificar'};
const CANVA_KEYS={UPLOAD_ASSETS:'Enviar recursos del kit',CREATE_DESIGN:'Crear diseño',LINK_DESIGN:'Vincular un diseño existente',OPEN_EDITOR:'Abrir el editor',EXPORT:'Recuperar el diseño',AUTOFILL:'Autocompletar plantillas',BRAND_TEMPLATES:'Plantillas de marca'};
/** Canva on one design brief (per-person connection): send the approved brief, retrieve the design into a new version. */
export function canvaPanelHtml(deliverable,c){
 const designs=c.designs.filter(x=>x.deliverableId===deliverable.id),conn=c.connections.canva.find(x=>x.status==='ACTIVE');
 return `<div class="canva-panel"><h4>Canva</h4>${conn?.simulated||!conn?'<p class="campaign-sim">Simulador: no hay conexión real con Canva.</p>':''}<p class="hint">Capacidades: ${c.canvaCapabilities.map(k=>`${escape(CANVA_KEYS[k.key])} (${escape(CANVA_WORDS[k.state])})`).join(' · ')}.</p>${designs.length?`<ul class="collab-list">${designs.map(x=>`<li><span>Diseño ${escape(x.designRef)}${x.simulated?' · simulado':''}</span><span class="badge">${x.status==='RETRIEVED'?'Recuperado en una versión nueva':'Creado'}</span>${x.status==='CREATED'?`<button type="button" class="secondary" data-canva-retrieve="${escape(x.id)}">Recuperar el diseño</button>`:''}</li>`).join('')}</ul>`:''}<div class="actions">${conn?(deliverable.approved?`<button type="button" class="secondary" data-canva-send="${escape(deliverable.id)}">Enviar el brief aprobado a Canva</button>`:'<span class="hint">Aprueba el brief para enviarlo.</span>'):`<button type="button" class="secondary" data-conn-sim="CANVA">Conectar Canva (simulado)</button>`}</div>${conn&&deliverable.approved?`<form class="canva-link offer-form" data-deliverable="${escape(deliverable.id)}"><label for="canva-ref-${escape(deliverable.id)}">O vincula un diseño que ya tienes en Canva <span class="hint">referencia del diseño</span></label><input id="canva-ref-${escape(deliverable.id)}" maxlength="80"><div class="actions"><button type="submit" class="tertiary">Vincular diseño</button></div></form>`:''}<p class="hint">Abrir el diseño en el editor de Canva: sin verificar (el simulador no tiene editor).</p><p class="hint">Recuperar crea una versión nueva del brief que se revisa; la aprobada no cambia.</p></div>`;
}
const CYCLE_DECISION_WORDS={MAINTAIN:'Mantener',ADJUST:'Ajustar',RETEST:'Volver a probar'};
/** Resultados › Revisión del ciclo: available results, limitations, learnings, proposals and the human decision. */
export function cycleReviewHtml(r){
 const val=m=>m.available?(m.currency?`${m.value} ${m.currency}`:String(m.value)):(m.state==='NOT_CONNECTED'?'Sin conectar':'Sin datos');
 return `<h3 id="cycle-title">Revisión del ciclo</h3><p class="hint">Revisa lo que se sabe del periodo, sus límites y decide. Nada de lo que escribas aquí cambia la estrategia, el plan ni una campaña.</p>
 <details><summary>Resultados disponibles (${r.results.filter(m=>m.available).length} de ${r.results.length})</summary><ul class="cycle-results">${r.results.map(m=>`<li>${escape(m.label)}: <strong>${escape(val(m))}</strong> <span class="hint">${escape(KIND_WORDS[m.kind]??'')}</span></li>`).join('')}</ul></details>
 <p><strong>Limitaciones:</strong></p><ul>${r.limitations.map(l=>`<li>${escape(l)}</li>`).join('')}</ul>
 ${r.suggestions.items.length?`<div class="site-proposal" role="region" aria-label="Sugerencias de Brando"><p><strong>Sugerencias de Brando</strong> <span class="hint">propuestas, no decisiones · DEMO determinista</span></p><ul>${r.suggestions.items.map((x,i)=>`<li><label class="check-option"><input type="checkbox" data-suggestion="${i}"> <span>${escape(x.text)} <span class="hint">${escape(x.basis)}</span></span></label></li>`).join('')}</ul><p class="hint">Marca las que quieras llevar como propuesta al siguiente periodo.</p></div>`:''}
 <form id="cycle-form" class="offer-form" novalidate><div class="plan-dates"><div><label for="cycle-start">Desde</label><input id="cycle-start" type="date" value="${escape(r.period.start)}"></div><div><label for="cycle-end">Hasta</label><input id="cycle-end" type="date" value="${escape(r.period.end)}"></div></div>
 <label for="cycle-learnings">¿Qué aprendiste en este periodo?</label><textarea id="cycle-learnings" rows="3" maxlength="4000"></textarea>
 <label for="cycle-proposals">Tus propuestas para el siguiente periodo <span class="hint">una por línea</span></label><textarea id="cycle-proposals" rows="3" maxlength="4000"></textarea>
 <fieldset><legend>Decisión</legend>${Object.entries(CYCLE_DECISION_WORDS).map(([k,l],i)=>`<label class="check-option"><input type="radio" name="cycle-decision" value="${k}"${i===0?' checked':''}> <span>${escape(l)}</span></label>`).join('')}</fieldset>
 <label for="cycle-criterion">¿Por qué? <span class="hint">al menos diez caracteres</span></label><textarea id="cycle-criterion" rows="2" maxlength="2000"></textarea>
 <p id="cycle-status" role="status" aria-live="polite"></p><div class="actions"><button type="submit">Guardar la revisión</button></div></form>
 ${r.previous.length?`<h4>Revisiones anteriores</h4><ul class="collab-list">${r.previous.map(p=>`<li><span>${escape(p.periodStart)} a ${escape(p.periodEnd)} · ${escape(CYCLE_DECISION_WORDS[p.decision])}: ${escape(p.criterion)}</span>${p.proposals.length?`<ul class="cycle-proposals">${p.proposals.map((x,i)=>{const link=p.experiments.find(e=>e.proposalIndex===i);return `<li>${escape(x.text)} <span class="hint">${x.origin==='BRANDO'?'sugerida por Brando':'de la persona'} · sin aplicar</span>${link?` <span class="badge">${link.mode==='CREATED'?'Experimento creado en Validación':'Vinculada a un experimento'}</span>`:` <button type="button" class="tertiary" data-cycle-experiment="${escape(p.id)}" data-index="${i}">Llevar a Validación</button>`}</li>`;}).join('')}</ul>`:''}</li>`).join('')}</ul>`:''}
 <div id="cycle-experiment" aria-live="polite"></div>`;
}
/** Revisable experiment proposal from a cycle review proposal: the person chooses and creates (or links) it. */
export function cycleExperimentHtml(p){
 const o=p.options,d=p.draft;
 const canCreate=o.hypotheses.length&&o.decisions.length;
 return `<div class="campaign-screen" role="region" aria-label="Experimento propuesto"><h4>Experimento propuesto para Validación</h4><p class="hint">Propuesta revisable: nada se crea hasta que lo confirmes. Se conserva su origen (revisión ${escape(p.sources.periodStart)} a ${escape(p.sources.periodEnd)}${p.sources.campaignId?', campaña y versión':''}). No aprueba aprendizajes ni cambia la estrategia o el plan.</p>
 <form id="cycle-experiment-form" class="offer-form" data-review="${escape(p.reviewId)}" data-index="${p.proposalIndex}" novalidate>
 ${canCreate?`<label for="cx-hyp">Hipótesis que pone a prueba</label><select id="cx-hyp">${o.hypotheses.map(h=>`<option value="${escape(h.id)}">${escape(h.statement.slice(0,120))}</option>`).join('')}</select>
 <label for="cx-dec">Decisión a la que se vincula</label><select id="cx-dec">${o.decisions.map(x=>`<option value="${escape(x.id)}">${escape(x.module)}</option>`).join('')}</select>
 <label for="cx-signal">Señal que se observará</label><input id="cx-signal" maxlength="4000" value="${escape(d.intendedSignal)}">
 <label for="cx-method">Cómo se hará</label><textarea id="cx-method" rows="2" maxlength="4000">${escape(d.method)}</textarea>
 <label for="cx-period">Periodo</label><input id="cx-period" maxlength="200" value="${escape(d.plannedPeriod)}">
 <label for="cx-success">Criterio de éxito</label><input id="cx-success" maxlength="4000" value="${escape(d.successCriteria)}">
 <p class="hint">Limitaciones que se guardan con el experimento: ${escape(d.limitations.join(' '))}</p>
 <div class="actions"><button type="submit" value="CREATE">Crear el experimento en Validación</button></div>`:'<p class="hint">Para crear un experimento hace falta una hipótesis y una decisión vigente en la marca.</p>'}
 ${o.experiments.length?`<label for="cx-link">O vincúlala a un experimento existente</label><select id="cx-link">${o.experiments.map(e=>`<option value="${escape(e.id)}">${escape(e.objective.slice(0,100))}</option>`).join('')}</select><div class="actions"><button type="submit" value="LINK" class="secondary">Vincular</button></div>`:''}
 <div class="actions"><button type="button" class="tertiary" data-cycle-experiment-close>Cerrar</button></div></form></div>`;
}

