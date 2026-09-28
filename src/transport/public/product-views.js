// Pure presentation projections. No writes, requests, inferred strategic state or domain rules.
export const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const labels={'Primary Customer':'Cliente principal','Value Mechanism':'Modelo de valor','Positioning':'Posicionamiento','Core Message':'Mensaje principal'};
export const fmt=value=>new Date(value).toLocaleString('es-MX',{dateStyle:'medium',timeStyle:'short'});
export const needsReview=(context,decision)=>!!decision&&(decision.reviewStatus==='NEEDS_REVIEW'||context.reviews.some(r=>r.downstreamDecisionId===decision.id&&r.status!=='COMPLETED'));
export function decisionState(context,question){
 const decision=context.decisions.find(d=>d.questionId===question.id);
 return {decision,version:context.versions.find(v=>v.id===decision?.activeVersionId),review:needsReview(context,decision)};
}
// One status vocabulary everywhere. «Vigente» is a display relation over the active version, never a Decision.status.
export function stateBadge(version,review){return `<span class="badge ${review?'warn':''}">${review?'Requiere revisión':version?'Vigente · v'+version.sequence:'Por decidir'}</span>`;}
// Display names for the canonical capability keys of the strategic method (config/strategic-method/learning-moments.v1.json).
const capabilityLabels={'Customer Understanding':'Comprensión del cliente','Business Model Thinking':'Modelo de negocio','Strategic Differentiation':'Diferenciación estratégica','Message Prioritization':'Priorización del mensaje','Problem Framing':'Encuadre del problema'};
export const capabilityLabel=key=>capabilityLabels[key]??key;
const plural=(n,one,many)=>`${n} ${n===1?one:many}`;

const legacyCapabilityBehavior='Explicitó una elección y su criterio en una decisión humana.';
const personalizedCapabilityBehavior={
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
   <h2>Aprendes mientras construyes tu marca.</h2>
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
 return `<div class="impact-pair"><article><p class="eyebrow">01 · Decisión que cambió</p><h4>${escape(labels[source?.module]??'Decisión conectada')}</h4><span class="badge">Vigente · v${trigger?.sequence??''}</span>${before?`<div class="impact-before"><span>Antes · v${before.sequence}</span><p>${escape(before.selectedOption)}</p></div>`:''}<div class="impact-after"><span>Ahora</span><p>${escape(trigger?.selectedOption??'')}</p></div></article><span class="impact-link"><span class="impact-arrow" aria-hidden="true">→</span><span class="impact-relation">${review.dependencyType==='HARD'?'Dependencia estricta':'Dependencia sugerida'}</span></span><article><p class="eyebrow">02 · Decisión afectada</p><h4>${escape(labels[question.module])}</h4><span class="badge warn">Requiere revisión</span><p>${escape(version?.selectedOption??'')}</p><p class="impact-boundary">Conserva su versión. Tú decides si necesita un ajuste.</p></article></div>`;
}
export function historyHtml(versions,decision,userId){
 if(!versions.length)return '<section class="empty-state"><p class="eyebrow">Memoria por construir</p><h3>Tu primera decisión inicia esta historia.</h3><p>Cuando apruebes, podrás volver a tu elección, su criterio y cada versión anterior.</p></section>';
 const items=versions.map(h=>{const current=h.versionStatus!=='SUPERSEDED',next=versions.find(x=>x.previousVersionId===h.id);return `<li class="history-item ${current?'is-current':''}"><div class="version-marker">v${h.sequence}</div><article><div class="history-meta"><span class="badge ${current?'':'muted'}">${current?'Vigente':'Sustituida'}</span><time datetime="${escape(h.approvedAt)}">${escape(fmt(h.approvedAt))}</time><span>${h.actorUserId===userId?'Tú':'Persona autorizada'}</span></div><h4>${escape(h.selectedOption)}</h4><p><span class="label">Criterio de esta versión</span><br>${escape(h.rationale)}</p>${next?`<p class="lineage-note">Continúa en v${next.sequence} · esta versión permanece en el historial.</p>`:'<p class="lineage-note">Esta es la versión vigente de tu decisión.</p>'}</article></li>`;}).join('');
 return `<details class="history" open><summary>Versiones registradas</summary><div class="history-intro"><p class="eyebrow">Evolución estratégica</p><h3>El criterio detrás de cada cambio.</h3><p>Tu estrategia evoluciona. Su historia permanece.</p></div><ol class="timeline">${items}</ol>${decision?.reviewStatus==='NEEDS_REVIEW'?'<p class="hint">La versión actual requiere revisión humana por un cambio en una decisión conectada.</p>':''}</details>`;
}
export function homeHtml(context,documentState={total:0,pending:0,processed:0,candidateClaims:0}){
 const documentAttention=documentState.pending
  ?`<section class="document-attention" aria-labelledby="document-attention-title">
      <div>
       <p class="eyebrow">Documentos de la marca</p>
       <h3 id="document-attention-title">${documentState.pending} documento${documentState.pending===1?' pendiente':'s pendientes'} de procesar</h3>
       <p>Ya están guardados. Procésalos para que Brandopolis pueda convertir su contenido en hallazgos candidatos.</p>
      </div>
      <button id="attention-documents" class="secondary">Procesar documentos →</button>
     </section>`
  :documentState.candidateClaims
   ?`<section class="document-attention" aria-labelledby="document-attention-title">
       <div>
        <p class="eyebrow">Revisión documental</p>
        <h3 id="document-attention-title">${documentState.candidateClaims} hallazgo${documentState.candidateClaims===1?' pendiente':'s pendientes'} de revisión</h3>
        <p>Brandopolis identificó información en tus documentos. Ningún hallazgo cambiará tu Brand Context hasta que tú lo revises.</p>
       </div>
       <button id="attention-documents" class="secondary">Revisar hallazgos →</button>
      </section>`
   :documentState.processed
    ?`<section class="document-attention is-ready" aria-labelledby="document-attention-title">
        <div>
         <p class="eyebrow">Documentos de la marca</p>
         <h3 id="document-attention-title">${documentState.processed} documento${documentState.processed===1?' procesado':'s procesados'}</h3>
         <p>El contenido ya está extraído. Genera hallazgos para identificar información que valga la pena revisar.</p>
        </div>
        <button id="attention-documents" class="secondary">Generar hallazgos →</button>
       </section>`
    :'';

 const reviewQuestions=context.questions.filter(q=>decisionState(context,q).review);
 const open=context.questions.filter(q=>!decisionState(context,q).version);
 const active=context.experiments.filter(e=>['PLANNED','RUNNING'].includes(e.status));
 const unreviewed=context.learnings.filter(l=>['CANDIDATE','REVIEWED'].includes(l.status));
 const uninterpreted=context.signals.filter(s=>!context.learnings.some(l=>l.signalIds.includes(s.id)));
 const approved=context.decisions.filter(d=>d.activeVersionId).length;
 const hypotheses=context.hypotheses.filter(h=>!['SUPPORTED','REJECTED'].includes(h.status));
 const next=reviewQuestions[0]??open[0];
 const reviewRows=reviewQuestions.map(q=>{const {decision}=decisionState(context,q);const reviews=context.reviews.filter(r=>r.downstreamDecisionId===decision.id&&r.status!=='COMPLETED');const sources=[...new Set(reviews.map(r=>{const version=context.versions.find(v=>v.id===r.triggerVersionId),source=context.decisions.find(d=>d.id===version?.decisionId);return labels[context.questions.find(q=>q.id===source?.questionId)?.module]??'Decisión conectada';}))];return `<article class="attention-row"><div><h3>${escape(labels[q.module])}</h3><p>${escape(sources.join(' · ')||'Una decisión conectada')} cambió. Revisa si tu elección sigue alineada.</p></div><button class="secondary" data-attention-module="${escape(q.module)}">Abrir ${escape(labels[q.module].toLowerCase())}</button></article>`;}).join('');
 return `<div class="home-heading"><div><p class="eyebrow">Tu estrategia hoy</p><h2>Claridad para tu siguiente decisión.</h2><p class="view-lead">Decisiones vigentes, cambios conectados y aprendizaje de tu marca.</p></div>${next?`<button data-attention-module="${escape(next.module)}">${reviewQuestions.length?'Revisar estrategia':'Continuar estrategia'} <span aria-hidden="true">→</span></button>`:''}</div><ul class="kpis" aria-label="Resumen de tu estrategia"><li><strong>${approved}<small> / ${context.questions.length}</small></strong><span>Decisiones vigentes</span></li><li class="${reviewQuestions.length?'attention':''}"><strong>${reviewQuestions.length}</strong><span>Necesitan revisión</span></li><li class="${hypotheses.length?'':'is-zero'}"><strong>${hypotheses.length}</strong><span>Hipótesis abiertas</span></li><li class="${active.length?'':'is-zero'}"><strong>${active.length}</strong><span>Experimentos activos</span></li></ul>${context.impacts.some(i=>i.status==='IMPACT_PENDING')?'<p class="review">Hay un impacto pendiente de cálculo. Abre una decisión para reintentarlo.</p>':''}${reviewQuestions.length?`<section class="attention-section"><div class="section-heading"><div><p class="eyebrow">Atención estratégica</p><h3>Tu estrategia ha evolucionado.</h3></div><span>${reviewQuestions.length} decisiones por revisar</span></div>${reviewRows}</section>`:`<section class="clear-state"><span class="eyebrow">${open.length?'Tu punto de partida':'Sin revisiones pendientes'}</span><p>${open.length?'Empieza por tu cliente y construye desde ahí.':'Tus decisiones conservan una versión vigente. Sigue aprendiendo de lo que ocurre en el mercado.'}</p></section>`}${documentAttention}${strategyMap(context)}<section class="learning-summary"><div><p class="eyebrow">Del mercado al aprendizaje</p><h3>La estrategia también se comprueba.</h3></div><div class="learning-counts"><span><strong>${uninterpreted.length}</strong> señales por interpretar</span><span><strong>${unreviewed.length}</strong> aprendizajes por revisar</span></div><button id="attention-learning" class="secondary">Abrir experimentos y aprendizajes</button></section><section class="context-next"><div><p class="eyebrow">Memoria de tu marca</p><h3>Contexto para seguir decidiendo</h3><p>${plural(context.evidence.length,'fuente registrada','fuentes registradas')} · ${plural(hypotheses.length,'hipótesis abierta','hipótesis abiertas')}. Revisa su procedencia y sus límites.</p></div><button id="attention-context" class="secondary">Abrir contexto estratégico</button></section>`;
}
