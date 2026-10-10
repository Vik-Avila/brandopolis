import type { Page } from '@playwright/test';

/**
 * Navigation of the Strategic Workspace (ADR-0027), shared by the browser suites. Destinations renamed by the
 * owner's decision keep working under their previous names; «Contexto estratégico» and «Entorno competitivo» are
 * reached from the rail's Contexto tool; the nine decisions live in the expandable Estrategia group.
 */
const RENAMED:Record<string,string>={
 'Qué necesita atención':'Inicio',
 'Experimentos y aprendizajes':'Validación',
 '02 Arena de mercado':'02 Mercado objetivo'
};
const IN_CONTEXT_RAIL=['Contexto estratégico','Entorno competitivo'];

export async function navigate(page:Page,raw:string){
 const name=RENAMED[raw]??raw;
 await page.locator('#workspace').waitFor();
 if(IN_CONTEXT_RAIL.includes(name)){
  const link=page.locator('#rail-panel').getByRole('button',{name,exact:true});
  if(!(await link.isVisible())){
   const desktop=page.locator('.rail-tools [data-rail-tool="context"]');
   if(await desktop.isVisible()){if((await desktop.getAttribute('aria-pressed'))!=='true')await desktop.click();}
   else await page.locator('.mobile-tools [data-rail-tool="context"]').click();
  }
  await link.click();
  return;
 }
 const menu=page.getByRole('button',{name:'Abrir navegación',exact:true});
 if(await menu.isVisible())await menu.click();
 const button=page.locator('#journey').getByRole('button',{name,exact:true});
 if(!(await button.isVisible())){
  const group=page.locator('#strategy-toggle');
  if(await group.isVisible()&&(await group.getAttribute('aria-expanded'))==='false')await group.click();
 }
 await button.click();
}

/** Opens one tool of the right rail (desktop strip, or the drawer below 1001px). Never asks the AI. */
export async function openTool(page:Page,tool:'context'|'attention'|'history'){
 const desktop=page.locator(`.rail-tools [data-rail-tool="${tool}"]`);
 if(await desktop.isVisible()){if((await desktop.getAttribute('aria-pressed'))!=='true')await desktop.click();}
 else await page.locator(`.mobile-tools [data-rail-tool="${tool}"]`).click();
 await page.locator(`[data-rail-panel="${tool}"]`).waitFor();
}
