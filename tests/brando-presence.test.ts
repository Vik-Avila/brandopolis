import {describe,it,expect,vi,afterEach} from 'vitest';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
// Execute the exact browser module with injected lifecycle primitives, without a DOM dependency.
const create=runInNewContext(readFileSync('src/transport/public/brando-presence.js','utf8').replace('export function','function')+'\ncreateBrandoPresence;');
function fixture(){
 vi.useFakeTimers();
 const cancel=vi.fn(),animate=vi.fn((_frames:unknown,_options:unknown)=>({cancel,onfinish:null}));
 const portrait={src:'/brando/idle.webp',getAttribute:()=>portrait.src,setAttribute:(_key:string,value:string)=>{portrait.src=value;},addEventListener:vi.fn(),closest:()=>null,animate};
 const doc=Object.assign(new EventTarget(),{hidden:false});
 const media=Object.assign(new EventTarget(),{matches:false});
 const button=Object.assign(new EventTarget(),{textContent:'',setAttribute:vi.fn()});
 type Entry={target:typeof portrait;isIntersecting:boolean;intersectionRatio:number};
 let notify:(entries:Entry[])=>void=()=>{};
 const disconnect=vi.fn();
 const presence=create({portraits:[portrait],onState:vi.fn(),motionButton:button,ownerDocument:doc,motionPreference:media,clock:globalThis,random:()=>0,observe:(callback:typeof notify)=>{notify=callback;return{observe:vi.fn(),disconnect};}});
 const visible=(shown:boolean)=>notify([{target:portrait,isIntersecting:shown,intersectionRatio:shown?1:0}]);
 return {presence,animate,cancel,portrait,doc,media,button,visible,disconnect};
}
afterEach(()=>vi.useRealTimers());
const finish=(f:ReturnType<typeof fixture>,duration:number)=>{
 let index=-1;f.animate.mock.calls.forEach((call,i)=>{if((call[1] as {duration:number}).duration===duration)index=i;});
 const animation=f.animate.mock.results[index].value;(animation.onfinish as unknown as ()=>void)?.();
};
describe('Brando visual lifecycle',()=>{
 it('idle has a finite 1.6-second gesture every 4–5.5 seconds and hidden time is not replayed',()=>{
  const f=fixture();f.visible(true);vi.advanceTimersByTime(1800);expect(f.animate.mock.calls[0][1]).toMatchObject({iterations:1,duration:1600});finish(f,1600);
  vi.advanceTimersByTime(4000);expect(f.animate).toHaveBeenCalledTimes(2);
  f.doc.hidden=true;f.doc.dispatchEvent(new Event('visibilitychange'));vi.advanceTimersByTime(120000);expect(f.animate).toHaveBeenCalledTimes(2);
  f.presence.destroy();expect(vi.getTimerCount()).toBe(0);
 });
 it('uses original investigating and response poses with a fade, never geometry morphing',()=>{
  const f=fixture();f.visible(true);f.presence.setState('consulting');finish(f,120);expect(f.portrait.src).toBe('/brando/consultando.webp');finish(f,180);
  f.presence.setState('ready');finish(f,1800);finish(f,120);expect(f.portrait.src).toBe('/brando/respuesta.webp');
  for(const call of f.animate.mock.calls)expect(JSON.stringify(call[0])).not.toMatch(/scale|skew|matrix/);
  f.presence.destroy();
 });
 it('reduced motion keeps a static semantic pose; human pause and hidden background stop animation',()=>{
  const f=fixture();f.visible(true);f.media.matches=true;f.media.dispatchEvent(new Event('change'));f.presence.setState('consulting');expect(f.portrait.src).toBe('/brando/consultando.webp');expect(f.animate).not.toHaveBeenCalled();
  f.media.matches=false;f.media.dispatchEvent(new Event('change'));f.button.dispatchEvent(new Event('click'));f.presence.setState('ready');vi.advanceTimersByTime(120000);expect(f.animate).not.toHaveBeenCalled();expect(f.portrait.src).toBe('/brando/respuesta.webp');
  f.button.dispatchEvent(new Event('click'));f.presence.setDialogOpen(true);vi.advanceTimersByTime(120000);expect(f.animate).not.toHaveBeenCalled();f.presence.destroy();
 });
 it('state changes wait for the current finite gesture before changing the pose',()=>{
  const f=fixture();f.visible(true);vi.advanceTimersByTime(1800);f.presence.setState('consulting');expect(f.portrait.src).toBe('/brando/idle.webp');expect(f.animate).toHaveBeenCalledOnce();
  finish(f,1600);finish(f,120);expect(f.portrait.src).toBe('/brando/consultando.webp');f.presence.destroy();
 });
});
