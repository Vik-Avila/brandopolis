// Presentation-only keyboard and focus behavior. Native dialog provides background inertness.
export function containDialogFocus(dialog){
 dialog.addEventListener('keydown',event=>{
  if(event.key!=='Tab')return;
  const controls=[...dialog.querySelectorAll('button,input,textarea,select,summary,a[href],[tabindex="0"]')].filter(el=>!el.disabled&&el.checkVisibility());
  const first=controls[0],last=controls.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
 });
}
export function decisionTabs(surface,active,onSelect,versionCount){
 const overview=document.createElement('section');overview.id='decision-overview';
 const knowledge=surface.querySelector('.knowledge'),recommendation=surface.querySelector('.recommendation'),history=surface.querySelector('.history');
 const emptyHistory=!history?surface.querySelector('.empty-state'):null;
 const heading=surface.querySelector('.decision-heading');
 for(const child of [...surface.children])if(child!==heading&&child!==knowledge&&child!==recommendation&&child!==history&&child!==emptyHistory)overview.append(child);
 const entries=[['overview','Decisión',overview],['knowledge','Evidencia e hipótesis',knowledge],['recommendation','Opciones',recommendation],['history',`Historial · ${versionCount} ${versionCount===1?'versión':'versiones'}`,history??emptyHistory]].filter(([, ,panel])=>panel);
 const nav=document.createElement('div');nav.className='decision-tabs';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Explorar esta decisión');
 for(const [key,label,panel] of entries){
  const button=document.createElement('button');button.type='button';button.id=`tab-${key}`;button.textContent=label;button.setAttribute('role','tab');button.setAttribute('aria-controls',`panel-${key}`);button.dataset.tab=key;
  panel.id=`panel-${key}`;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',button.id);panel.tabIndex=0;
  if(panel.tagName==='DETAILS')panel.open=true;
  button.addEventListener('click',()=>{select(key);onSelect(key);});nav.append(button);surface.append(panel);
 }
 heading.after(nav);
 function select(key){for(const [id,,panel] of entries){const button=nav.querySelector(`[data-tab="${id}"]`),chosen=key===id;button.setAttribute('aria-selected',String(chosen));button.tabIndex=chosen?0:-1;panel.hidden=!chosen;}}
 nav.addEventListener('keydown',event=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();
  const buttons=[...nav.querySelectorAll('button')],index=buttons.indexOf(document.activeElement),next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;
  buttons[next].click();buttons[next].focus();
 });
 select(entries.some(([key])=>key===active)?active:'overview');
}
