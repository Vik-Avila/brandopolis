// Pure presentation projections. No writes, requests, inferred strategic state or domain rules.
export const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const labels={'Strategic Objective':'Objetivo estratégico','Market Arena':'Arena de mercado','Primary Customer':'Cliente principal','Value Mechanism':'Modelo de valor','Positioning':'Posicionamiento','Brand Promise':'Promesa de marca','Core Message':'Mensaje principal'};
export const fmt=value=>new Date(value).toLocaleString('es-MX',{dateStyle:'medium',timeStyle:'short'});
export const needsReview=(context,decision)=>!!decision&&(decision.reviewStatus==='NEEDS_REVIEW'||context.reviews.some(r=>r.downstreamDecisionId===decision.id&&r.status!=='COMPLETED'));
export function decisionState(context,question){
 const decision=context.decisions.find(d=>d.questionId===question.id);
 return {decision,version:context.versions.find(v=>v.id===decision?.activeVersionId),review:needsReview(context,decision)};
}
// One status vocabulary everywhere. «Vigente» is a display relation over the active version, never a Decision.status.
export function stateBadge(version,review){return `<span class="badge ${review?'warn':''}">${review?'Requiere revisión':version?'Vigente · v'+version.sequence:'Por decidir'}</span>`;}
// Display names for the canonical capability keys of the strategic method (config/strategic-method/learning-moments.v3.json).
const capabilityLabels={'Market Reasoning':'Razonamiento de mercado','Brand Thinking':'Pensamiento de marca','Customer Understanding':'Comprensión del cliente','Business Model Thinking':'Modelo de negocio','Strategic Differentiation':'Diferenciación estratégica','Message Prioritization':'Priorización del mensaje','Problem Framing':'Encuadre del problema'};
export const capabilityLabel=key=>capabilityLabels[key]??key;
const plural=(n,one,many)=>`${n} ${n===1?one:many}`;

const legacyCapabilityBehavior='Explicitó una elección y su criterio como Estratega de Marca.';
const personalizedCapabilityBehavior={
 'Market Reasoning':'Delimitaste dónde compite tu marca, frente a qué alternativas y con qué límites.',
 'Brand Thinking':'Definiste qué debe significar tu marca para tu cliente y qué puede esperar de ella.',
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
/** Section-specific writing guide for the decision editor. Guidance only: it never fills or validates the text. */
export const decisionGuide={
 'Strategic Objective':'Incluye qué quieres construir o cambiar con tu marca y cómo reconocerás que avanzas. Es distinto de una meta comercial puntual.',
 'Market Arena':'Incluye dónde compites primero, frente a qué alternativas (también no hacer nada) y qué queda fuera. Tu ubicación no define por sí sola tu arena.',
 'Brand Promise':'Incluye qué puede esperar tu cliente de tu marca y por qué es creíble hoy. Debe expresar tu posicionamiento; tu mensaje principal se apoyará en ella.'
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

 const reviewQuestions=context.questions.filter(q=>(context.attention??[]).some(i=>i.kind==='review'&&i.module===q.module));
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
  'Market Arena':'Delimita dónde compites, frente a qué alternativas y qué queda fuera. Tu ubicación no define por sí sola tu arena.',
  'Primary Customer':'Precisa a quién atender y qué problema necesitas comprobar.',
  'Value Mechanism':'Conecta el problema del cliente con el valor que ofrecerás.',
  Positioning:'Revisa por qué elegirían tu marca frente a otras alternativas.',
  'Brand Promise':'Define qué debe significar tu marca para tu cliente y qué puede esperar de ella; promete sólo lo que puedes cumplir.',
  'Core Message':'Expresa tu valor con claridad y evita promesas sin respaldo.'
 }[q.module];
 const {decision,version,review}=decisionState(c,q);
 let state='pending',message='Esta sección aún no tiene una decisión registrada.';
 if(c.impacts.some(i=>i.status==='IMPACT_PENDING')){state='impact';message='Hay un impacto pendiente de cálculo. Resuélvelo antes de confirmar otro cambio.';}
 else if(decision?.reviewStatus==='INVALIDATED'){state='invalidated';message='Esta decisión está invalidada. Revisa su estado antes de continuar.';}
 else if(review){state='review';message='Una decisión conectada cambió. Revisa esta sección antes de darla por vigente.';}
 else if(!(c.evidence.length||c.userInputs.length||c.learnings.some(l=>l.status==='ACCEPTED'))){state='context';message=version?'Hay una decisión registrada, pero no hay evidencia, información aportada ni aprendizajes aceptados en el contexto de la marca.':'Antes de decidir, aporta información de tu marca. Aún no hay evidencia, información aportada ni aprendizajes aceptados.';}
 else if(version){state='current';message='Tu decisión está registrada. Comprueba si sigue teniendo sentido con el contexto disponible.';}
 const changes=review?[...c.reviews.filter(r=>r.downstreamDecisionId===decision.id&&r.status!=='COMPLETED').map(r=>{
  const changed=c.versions.find(v=>v.id===r.triggerVersionId),up=c.decisions.find(d=>d.id===changed?.decisionId),source=c.questions.find(q=>q.id===up?.questionId);
  return changed&&source?{label:labels[source.module]??'Decisión conectada',choice:changed.selectedOption,rationale:changed.rationale}:null;
 }).filter(Boolean),...reviewUpdates(c,decision).map(u=>({label:`${u.label} · v${u.sequence} (cambió después)`,choice:u.choice,rationale:u.rationale}))]:[];
 return {state,message,focus,changes,title:labels[q.module],query:`Ayúdame a explorar propuestas para ${labels[q.module]}. ${focus} Explica qué está registrado y qué falta comprobar; considera las decisiones conectadas y las revisiones pendientes. Propón alternativas concretas para esta pregunta cuando el contexto lo permita. Distingue hechos, hipótesis y límites; no apruebes ni cambies estrategia.`};
}
export function brandoSectionHtml(orientation,{busy=false,hasAnswer=false}={}){
 if(!orientation)return '';
 return `<section id="brando-section" class="brando-section" aria-labelledby="brando-section-title" data-orientation="${escape(orientation.state)}"><img src="/brando/idle.webp" width="32" height="32" alt=""><div><p class="eyebrow" id="brando-section-title">Brando · ${escape(orientation.title)}</p><p>${escape(orientation.message)} ${escape(orientation.focus)}</p>${orientation.changes.length?`<details><summary>Qué cambió en las decisiones conectadas</summary>${orientation.changes.map(change=>`<p><strong>${escape(change.label)}:</strong> ${escape(change.choice)}</p><p><strong>Criterio registrado:</strong> ${escape(change.rationale)}</p>`).join('')}</details>`:''}<p class="hint">Orientación del sistema · sin consulta a la IA</p><button type="button" id="brando-section-explore" class="secondary" ${busy?'disabled aria-busy="true"':''}>${busy?'Pensando…':hasAnswer?'Ver propuestas de esta sección':'Explorar propuestas con Brando'}</button></div></section>`;
}
export function brandoSuggestionButtons(ticket,expired=false){
 if(ticket.reviewed)return '<p class="hint">Ya registraste tu criterio sobre esta propuesta.</p>';
 if(expired)return '<p class="hint">Esta propuesta venció. Consulta de nuevo para revisarla.</p>';
 const id=escape(ticket.ticketId);
 if(ticket.kind!=='STRATEGY')return `<button type="button" class="secondary" data-brando-ticket="${id}" data-brando-action="${ticket.kind==='EVIDENCE'?'EVIDENCE':'CONTEXT'}">${ticket.kind==='EVIDENCE'?'Revisar fuentes':'Abrir contexto'}</button>`;
 return `<div class="brando-review-actions">${['ACCEPT','MODIFY','REJECT'].map((action,j)=>`<button type="button" class="secondary" data-brando-ticket="${id}" data-brando-action="${action}">${['Aceptar','Modificar','Rechazar'][j]}</button>`).join('')}</div>`;
}
export function brandoAnswerHtml(result){
 const a=result.answer;
 if(!a)return '<p>No hay una respuesta validada disponible. Puedes continuar trabajando manualmente.</p>';
 const section=(title,rows)=>rows.length?`<section><h3>${title}</h3><ul>${rows.map(t=>`<li>${escape(brandoPlainText(t))}</li>`).join('')}</ul></section>`:'';
 return `<p class="badge">${result.provider==='DEMO_FIXTURE'?'DEMO determinista · sin IA en vivo':'Asistencia estratégica · revisa con tu criterio'}</p><p>${escape(brandoPlainText(a.answer))}</p>
 ${section('Lo registrado',a.facts.map(f=>`${f.text} (Fuentes: ${f.referenceIds.map(id=>result.sources.findIndex(s=>s.id===id)+1).join(', ')})`))}${section('Hipótesis por validar',a.hypotheses)}${a.suggestions.length?`<section><h3>Sugerencias</h3><ul>${a.suggestions.map((text,i)=>`<li><p>${escape(brandoPlainText(text))}</p>${result.suggestionTickets?.[i]?brandoSuggestionButtons(result.suggestionTickets[i],brandoTicketExpired(result.suggestionTickets[i],result.receivedAt??Date.now())):''}</li>`).join('')}</ul><p class="hint">Aceptar o modificar lleva a tu revisión antes de cambiar estrategia.</p></section>`:''}${section('Preguntas para ti',a.questions)}${section('Límites de esta respuesta',a.limitations)}
 ${result.omitted.length?`<p class="review">Contexto parcial: se omitieron ${result.omitted.length} elementos por espacio. La respuesta no es exhaustiva.</p>`:''}
 <section><h3>Qué necesita atención</h3>${result.attention.length?result.attention.map(i=>`<p>${escape(labels[i.module]??'Contexto y aprendizaje')}: ${escape(i.label)} <button type="button" class="tertiary" data-brando-module="${escape(i.module??'')}">Abrir</button></p>`).join(''):'<p>Sin pendientes en las categorías consultadas. Esto no certifica la calidad de la estrategia.</p>'}</section>
 ${result.sources.length?`<section><h3>Fuentes consultadas</h3>${result.sources.map((source,index)=>`<details><summary>Fuente ${index+1} · ${escape(brandoSourceLabel(source.type))}</summary>${brandoSourceHtml(source)}</details>`).join('')}</section>`:''}`;
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
