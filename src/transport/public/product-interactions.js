// Presentation-only keyboard and focus behavior. Native dialog provides background inertness.
// checkVisibility() is missing before Safari 17.4; rendered boxes are an equivalent test here.
const visible=el=>el.checkVisibility?el.checkVisibility():el.getClientRects().length>0;
// Tab / Shift+Tab cycle inside a container while isActive(). Used by the brand dialog and the navigation drawer.
export function trapFocus(container,isActive=()=>true){
 container.addEventListener('keydown',event=>{
  if(event.key!=='Tab'||!isActive())return;
  const controls=[...container.querySelectorAll('button,input,textarea,select,summary,a[href],[tabindex="0"]')].filter(el=>!el.disabled&&visible(el));
  const first=controls[0],last=controls.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
 });
}
export function decisionTabs(surface,active,onSelect,versionCount){
 const overview=document.createElement('section');
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
  button.addEventListener('click',()=>{select(key);onSelect(key);button.scrollIntoView({inline:'nearest',block:'nearest'});});nav.append(button);surface.append(panel);
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
/** Accessible tabs for a redesigned view (Mi aprendizaje): roving tabindex, arrows/Home/End, remembered per session. */
export function viewTabs(root,storageKey,fallback,onSelect=()=>{}){
 const tabs=[...root.querySelectorAll('[role="tab"]')];
 let active=fallback;try{active=sessionStorage.getItem(storageKey)??fallback;}catch{/* best effort */}
 const select=key=>{for(const tab of tabs){const on=tab.dataset.tab===key;tab.setAttribute('aria-selected',String(on));tab.tabIndex=on?0:-1;root.querySelector(`#${tab.getAttribute('aria-controls')}`).hidden=!on;}try{sessionStorage.setItem(storageKey,key);}catch{/* best effort */}onSelect(key);};
 for(const tab of tabs)tab.addEventListener('click',()=>select(tab.dataset.tab));
 root.querySelector('[role="tablist"]')?.addEventListener('keydown',event=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();
  const i=tabs.indexOf(document.activeElement),n=event.key==='Home'?0:event.key==='End'?tabs.length-1:(i+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
  tabs[n].click();tabs[n].focus();
 });
 select(tabs.some(t=>t.dataset.tab===active)?active:fallback);
 return select;
}
