// One unchanged gemstone: expression comes from rigid movement and light, never morphing.
const rest={transform:'translate(0,0) rotate(0deg)',filter:'brightness(1) drop-shadow(0 0 0 transparent)'};
const light='brightness(1.16) drop-shadow(0 0 4px rgba(178,151,88,.28))';
const frames={
 idle:[rest,{transform:'translate(0,-4px) rotate(-4deg)',filter:light,offset:.38},{transform:'translate(0,-2px) rotate(2deg)',offset:.7},rest],
 consulting:[rest,{transform:'translate(2px,-3px) rotate(7deg)',filter:light,offset:.3},{transform:'translate(-2px,-2px) rotate(-5deg)',filter:'brightness(1.08)',offset:.7},rest],
 ready:[rest,{transform:'translate(0,-5px) rotate(-5deg)',filter:light,offset:.35},{transform:'translate(0,-2px) rotate(3deg)',offset:.7},rest],
 attention:[rest,{transform:'translate(-2px,-3px) rotate(-6deg)',filter:light,offset:.3},{transform:'translate(2px,-1px) rotate(4deg)',offset:.7},rest],
 unavailable:[rest,{transform:'translate(0,2px) rotate(-4deg)',filter:'brightness(.94)',offset:.4},rest]
};
export function createBrandoPresence({portraits,onState,motionButton,ownerDocument=document,clock=window,random=Math.random,motionPreference=matchMedia('(prefers-reduced-motion: reduce)'),observe=callback=>new IntersectionObserver(callback,{threshold:.35})}){
 let state='idle',timer=null,paused=false,dialogOpen=false,destroyed=false,firstPulse=true;
 const visible=new Set(),animations=new Map();
 const allowed=()=>!destroyed&&!paused&&!motionPreference.matches&&!ownerDocument.hidden;
 const eligible=portrait=>visible.has(portrait)&&(!dialogOpen||Boolean(portrait.closest('dialog')?.open));
 function clearTimer(){if(timer!==null){clock.clearTimeout(timer);timer=null;}}
 function cancel(){clearTimer();for(const animation of animations.values())animation.cancel();animations.clear();}
 function pulse(mode=state){
  if(!allowed())return;
  for(const portrait of portraits){
   if(!eligible(portrait)||!portrait.animate||animations.has(portrait))continue;
   const startedState=state;
   const animation=portrait.animate(frames[mode],{duration:mode==='consulting'?2000:2600,easing:'cubic-bezier(.4,0,.2,1)',iterations:1});
   animations.set(portrait,animation);
   // Finish at the neutral pose before expressing a new state; no mid-motion snap.
   animation.onfinish=()=>{if(animations.get(portrait)!==animation)return;animations.delete(portrait);if(startedState!==state)pulse();};
  }
 }
 function schedule(){
  clearTimer();
  if(state==='unavailable'||!allowed()||!portraits.some(eligible))return;
  const delay=firstPulse?1800:state==='consulting'?3000:8000+Math.floor(random()*4000);
  timer=clock.setTimeout(()=>{timer=null;firstPulse=false;pulse(state==='ready'?'idle':state);schedule();},delay);
 }
 function reconcile(){cancel();schedule();}
 const observer=observe(entries=>{for(const entry of entries){if(entry.isIntersecting&&entry.intersectionRatio>=.35)visible.add(entry.target);else visible.delete(entry.target);}reconcile();});
 for(const portrait of portraits)observer.observe(portrait);
 const visibility=()=>reconcile();ownerDocument.addEventListener('visibilitychange',visibility);
 motionPreference.addEventListener('change',visibility);
 function toggle(){paused=!paused;motionButton.textContent=paused?'Activar animación':'Pausar animación';motionButton.setAttribute('aria-pressed',String(paused));reconcile();}
 motionButton.addEventListener('click',toggle);
 return {
  setState(next){
   if(!Object.hasOwn(frames,next))return;
   const changed=next!==state;state=next;onState(state);
   if(changed){firstPulse=false;pulse();schedule();}
  },
  setDialogOpen(open){dialogOpen=open;reconcile();},
  destroy(){destroyed=true;cancel();observer.disconnect();ownerDocument.removeEventListener('visibilitychange',visibility);motionPreference.removeEventListener('change',visibility);motionButton.removeEventListener('click',toggle);}
 };
}
