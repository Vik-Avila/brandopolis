// ADR-0035 · development web form of a brand. The page sends only allow-listed fields; the server resolves the brand
// from the form id. The submission id is kept until the server confirms, so a retry after a lost response or a
// failure returns the same opportunity instead of creating another one.
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const params=new URLSearchParams(location.search),formId=params.get('f')??'';
const UTM=['source','medium','campaign','id','content','term'],CLICK=['gclid','gbraid','wbraid','fbclid','ttclid','li_fat_id','msclkid'];
const pick=(keys,prefix='')=>Object.fromEntries(keys.map(k=>[k,params.get(prefix+k)]).filter(([,v])=>v));
const storageKey=`brandopolis.lead.${formId}`;
const store={get(){try{return sessionStorage.getItem(storageKey);}catch{return null;}},set(v){try{sessionStorage.setItem(storageKey,v);}catch{/* storage unavailable: kept in memory */}},clear(){try{sessionStorage.removeItem(storageKey);}catch{/* ignore */}}};
let memoryKey=null;
const submissionId=()=>store.get()??memoryKey??(memoryKey=crypto.randomUUID(),store.set(memoryKey),memoryKey);
const renew=()=>{memoryKey=crypto.randomUUID();store.set(memoryKey);return memoryKey;};

async function post(payload){
 const response=await fetch('/api/forms/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),credentials:'omit'});
 const data=await response.json().catch(()=>({}));
 if(!response.ok){const error=new Error(data.message||'Error');error.status=response.status;error.code=data.code;throw error;}
 return data;
}
function render(form){
 $('#lead-root').innerHTML=`<h1>${esc(form.name)}</h1><p class="lead-brand">${esc(form.brandName)}</p>
 <form id="lead-form" novalidate>
 <label for="lead-name">Nombre</label><input id="lead-name" name="name" maxlength="160" autocomplete="name" required>
 <label for="lead-email">Correo</label><input id="lead-email" name="email" type="email" maxlength="254" autocomplete="email">
 <label for="lead-phone">Teléfono</label><input id="lead-phone" name="phone" type="tel" maxlength="40" autocomplete="tel">
 <p class="lead-hint">Deja al menos un correo o un teléfono para que el equipo pueda responderte.</p>
 <label for="lead-need">¿En qué te podemos ayudar?</label><textarea id="lead-need" name="need" maxlength="2000" rows="4" required></textarea>
 <label class="lead-check"><input id="lead-contact" type="checkbox" required> <span>Acepto que me contacten sobre esta solicitud.</span></label>
 <label class="lead-check"><input id="lead-marketing" type="checkbox"> <span>Opcional: también quiero recibir novedades y promociones.</span></label>
 <p class="lead-hint">Aviso de privacidad provisional de desarrollo (versión ${esc(form.privacyNoticeVersion)}). El texto definitivo está pendiente. Tu solicitud no activa etiquetas publicitarias.</p>
 <p id="lead-status" class="lead-status" role="status" aria-live="polite"></p>
 <button type="submit">Enviar solicitud</button></form>`;
 $('#lead-form').addEventListener('submit',async event=>{
  event.preventDefault();const status=$('#lead-status'),button=event.submitter??$('#lead-form button');
  const value=id=>$(id).value.trim();
  if(!value('#lead-name')){status.textContent='Escribe tu nombre.';$('#lead-name').focus();return;}
  if(!value('#lead-email')&&!value('#lead-phone')){status.textContent='Deja un correo o un teléfono.';$('#lead-email').focus();return;}
  if(!value('#lead-need')){status.textContent='Cuéntanos qué necesitas.';$('#lead-need').focus();return;}
  if(!$('#lead-contact').checked){status.textContent='Para responderte necesitamos que aceptes que te contacten sobre esta solicitud.';$('#lead-contact').focus();return;}
  const payload=()=>({form:formId,submissionId:submissionId(),name:value('#lead-name'),email:value('#lead-email'),phone:value('#lead-phone'),need:value('#lead-need'),consent:{contactPurpose:true,marketingOptIn:$('#lead-marketing').checked},utm:pick(UTM,'utm_'),clickIds:pick(CLICK),landingPath:location.pathname,referrer:document.referrer||null});
  button.disabled=true;status.textContent='Enviando…';
  try{
   let result;
   try{result=await post(payload());}
   catch(error){if(error.code!=='CONFLICT')throw error;renew();result=await post(payload());} // the content changed after a failed try: a new submission
   store.clear();memoryKey=null;
   $('#lead-root').innerHTML=`<h1>Recibimos tu solicitud</h1><p>Referencia: <strong id="lead-reference">${esc(result.reference)}</strong>.</p><p>El equipo te contactará por el medio que dejaste.</p>`;
  }catch(error){
   status.textContent=error.status===400?'Revisa los datos: el correo o el teléfono no tienen un formato válido, o algún texto es demasiado largo.':error.status===429?'Demasiados envíos seguidos. Espera un momento e inténtalo de nuevo.':error.status===404?'Este formulario ya no está disponible.':'No pudimos confirmar tu envío. Tus datos siguen aquí; vuelve a intentarlo.';
   button.disabled=false;
  }
 });
}
(async()=>{
 try{const r=await fetch(`/api/forms/public?f=${encodeURIComponent(formId)}`,{credentials:'omit'});if(!r.ok)throw new Error();render(await r.json());}
 catch{$('#lead-root').innerHTML='<h1>Formulario no disponible</h1><p>Este formulario no existe o fue desactivado.</p>';}
})();
