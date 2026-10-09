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
export function homeHtml(context,documentState={total:0,pending:0,processed:0,candidateClaims:0}){
 const step=nextStep(context),progress=strategyProgress(context);
 // Each segment opens its decision (owner decision 2026-10-09): number · name — state, for mouse, keyboard and touch.
 const segments=progress.segments.map((s,i)=>{const state=s.state==='defined'?'Definida':s.state==='review'?'Requiere revisión':s.state==='missing'?'No disponible':'Pendiente',name=`${String(i+1).padStart(2,'0')} · ${labels[s.module]} — ${state}`;return `<li class="${s.state==='defined'?'is-defined':s.state==='review'?'is-review':''}">${s.state==='missing'?`<span class="segment" title="${escape(name)}"><span class="visually-hidden">${escape(name)}</span></span>`:`<button type="button" class="segment" data-attention-module="${escape(s.module)}" aria-label="${escape(name)}" title="${escape(name)}"><span class="segment-tip" aria-hidden="true">${escape(name)}</span></button>`}</li>`;}).join('');
 return `<div class="ws-hero home-heading"><p class="eyebrow">Inicio</p><h2>Tu siguiente paso</h2><p class="ws-lead">Avanza con claridad, una decisión a la vez.</p></div>
 <section class="next-step" data-tone="${step.tone}" data-kind="${step.kind}" aria-labelledby="next-step-title"><div><p class="step-badge">${escape(step.badge)}</p><h3 id="next-step-title">${escape(step.title)}</h3><p>${escape(step.text)}</p><div class="actions"><button type="button" id="next-step-action" ${actionAttrs(step.action)}>${escape(step.cta)} <svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#i-arrow"/></svg></button>${step.brando?`<button type="button" id="next-step-brando" class="link-action brando-action" data-module="${escape(step.action.module)}">Explorar con Brando <svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#i-arrow"/></svg></button>`:''}</div></div><div class="next-step-art" aria-hidden="true"><img src="/brand/symbol-premium.webp" alt="" width="96" height="96"></div></section>
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
