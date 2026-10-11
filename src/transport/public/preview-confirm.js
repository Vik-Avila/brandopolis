// ADR-0032 · step 2 of the preview exchange, on the app's own origin. The person confirms with their own session (a
// same-site action, so the SameSite=Strict app cookie is sent); the app returns a single-use code bound to the state
// and challenge the preview origin created, and the browser goes back to that origin to redeem it.
const $=s=>document.querySelector(s);
const p=new URLSearchParams(location.search);
const input={brandId:p.get('brand')??'',versionId:p.get('version')??'',state:p.get('state')??'',challenge:p.get('challenge')??''};
const back=p.get('return')??'';
const valid=/^[A-Za-z0-9-]{1,80}$/.test(input.brandId)&&/^[A-Za-z0-9-]{1,80}$/.test(input.versionId)&&/^[A-Za-z0-9_-]{20,100}$/.test(input.state)&&/^[A-Za-z0-9_-]{40,60}$/.test(input.challenge)&&/^\/b\/[A-Za-z0-9-]{1,80}\/v\/[A-Za-z0-9-]{1,80}(\/[A-Za-z0-9._/-]*)?$/.test(back);
(async()=>{
 if(!valid){$('#preview-who').textContent='Este enlace de vista previa no es válido. Ábrelo de nuevo desde Brandopolis.';return;}
 let state={};try{state=await (await fetch('/api/session-state')).json();}catch{state={};}
 if(!state.authenticated){$('#preview-who').innerHTML='Inicia sesión en Brandopolis y vuelve a abrir la vista previa. <a href="/">Ir a Brandopolis</a>';return;}
 $('#preview-who').textContent='Abrirás la vista previa con tu propia cuenta de Brandopolis.';
 const button=$('#preview-open');button.hidden=false;button.focus();
 button.addEventListener('click',async()=>{
  button.disabled=true;$('#preview-status').textContent='Preparando…';
  try{
   const r=await fetch('/api/site-preview/code',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
   if(!r.ok){$('#preview-status').textContent=r.status===404?'No tienes acceso a esta versión del sitio.':'No se pudo abrir la vista previa. Inténtalo de nuevo.';button.disabled=false;return;}
   const d=await r.json();
   location.replace(`${d.previewOrigin}/__preview/callback?code=${encodeURIComponent(d.code)}&state=${encodeURIComponent(input.state)}&return=${encodeURIComponent(back)}`);
  }catch{$('#preview-status').textContent='No se pudo abrir la vista previa. Inténtalo de nuevo.';button.disabled=false;}
 });
})();
