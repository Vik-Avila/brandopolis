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
describe('Brando visual lifecycle',()=>{
 it('idle is a finite occasional pulse, and hidden or off-screen time is not replayed',()=>{
  const f=fixture();f.visible(true);vi.advanceTimersByTime(1799);expect(f.animate).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);expect(f.animate).toHaveBeenCalledTimes(1);expect(f.animate.mock.calls[0][1]).toMatchObject({iterations:1,duration:2600});
  f.doc.hidden=true;f.doc.dispatchEvent(new Event('visibilitychange'));expect(f.cancel).toHaveBeenCalled();vi.advanceTimersByTime(120000);expect(f.animate).toHaveBeenCalledTimes(1);
  f.doc.hidden=false;f.doc.dispatchEvent(new Event('visibilitychange'));f.visible(false);vi.advanceTimersByTime(120000);expect(f.animate).toHaveBeenCalledTimes(1);
  f.visible(true);vi.advanceTimersByTime(8000);expect(f.animate).toHaveBeenCalledTimes(2);f.presence.destroy();expect(vi.getTimerCount()).toBe(0);expect(f.disconnect).toHaveBeenCalledOnce();
 });
 it('reduced motion and human pause cancel motion while semantic state remains available',()=>{
  const f=fixture();f.visible(true);f.presence.setState('consulting');expect(f.portrait.src).toBe('/brando/idle.webp');expect(f.animate).toHaveBeenCalledOnce();
  f.media.matches=true;f.media.dispatchEvent(new Event('change'));expect(f.cancel).toHaveBeenCalled();f.presence.setState('ready');expect(f.portrait.src).toBe('/brando/idle.webp');expect(f.animate).toHaveBeenCalledOnce();
  f.media.matches=false;f.media.dispatchEvent(new Event('change'));f.button.dispatchEvent(new Event('click'));f.presence.setState('idle');vi.advanceTimersByTime(120000);expect(f.animate).toHaveBeenCalledOnce();expect(f.button.textContent).toBe('Activar animación');
  f.button.dispatchEvent(new Event('click'));vi.advanceTimersByTime(8000);expect(f.animate).toHaveBeenCalledTimes(2);f.presence.destroy();
 });
 it('opening a modal suspends the background portrait and failed states never produce a success pose',()=>{
  const f=fixture();f.visible(true);f.presence.setDialogOpen(true);f.presence.setState('consulting');expect(f.animate).not.toHaveBeenCalled();
  f.presence.setState('unavailable');expect(f.portrait.src).toBe('/brando/idle.webp');f.presence.setDialogOpen(false);f.presence.setState('idle');expect(f.animate).toHaveBeenCalledOnce();f.presence.destroy();
 });
 it('state changes finish the current rigid motion before the next, preserving one gemstone',()=>{
  const f=fixture();f.visible(true);f.presence.setState('consulting');const running=f.animate.mock.results[0].value;
  f.presence.setState('ready');expect(f.cancel).not.toHaveBeenCalled();expect(f.animate).toHaveBeenCalledOnce();
  (running.onfinish as unknown as ()=>void)();expect(f.animate).toHaveBeenCalledTimes(2);
  expect(f.portrait.src).toBe('/brando/idle.webp');
  for(const call of f.animate.mock.calls)expect(JSON.stringify(call[0])).not.toMatch(/scale|skew|matrix/);
  f.presence.destroy();
 });

});
