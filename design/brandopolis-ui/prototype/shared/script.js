(function(){
  const publicBtn=document.querySelector('[data-menu-toggle]');
  const publicNav=document.querySelector('[data-mobile-nav]');
  function setPublic(open){if(!publicBtn||!publicNav)return;publicNav.classList.toggle('open',open);publicBtn.setAttribute('aria-expanded',String(open));}
  if(publicBtn&&publicNav){
    publicBtn.addEventListener('click',()=>setPublic(!publicNav.classList.contains('open')));
  }

  const appBtn=document.querySelector('[data-app-menu-toggle]');
  const appNav=document.querySelector('[data-app-nav]');
  const backdrop=document.querySelector('[data-app-backdrop]');
  function setApp(open){
    if(!appBtn||!appNav)return;
    appNav.classList.toggle('open',open);
    appBtn.setAttribute('aria-expanded',String(open));
    if(backdrop)backdrop.classList.toggle('open',open);
    if(open){const first=appNav.querySelector('a,button,[tabindex]:not([tabindex="-1"])'); if(first)first.focus();}
  }
  if(appBtn&&appNav){
    appBtn.addEventListener('click',()=>setApp(!appNav.classList.contains('open')));
    if(backdrop)backdrop.addEventListener('click',()=>setApp(false));
  }
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){setPublic(false);setApp(false)}});
  document.addEventListener('click',e=>{
    if(publicNav&&publicBtn&&publicNav.classList.contains('open')&&!publicNav.contains(e.target)&&!publicBtn.contains(e.target))setPublic(false);
  });
})();
