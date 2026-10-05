import {randomUUID} from 'node:crypto';
import {AppError} from './contracts.js';
export type SuggestionScope={workspaceId:string;brandId:string;userId:string};
export type SuggestionTicket=SuggestionScope&{sourceVersion:string;contextVersion:string;questionId:string|null;suggestion:string;kind?:'STRATEGY'|'EVIDENCE'|'CONTEXT';proposedDecision?:string|null;capability:string;expiresAt:number};
/** Short-lived source proof, not strategic persistence or conversation memory. */
export class BrandoSuggestions {
 private tickets=new Map<string,SuggestionTicket>();
 constructor(private now=Date.now,private ttlMs=15*60*1000,private capacity=512){}
 issue(value:Omit<SuggestionTicket,'expiresAt'>){
  for(const [key,ticket] of this.tickets)if(ticket.expiresAt<=this.now())this.tickets.delete(key);
  while(this.tickets.size>=this.capacity)this.tickets.delete(this.tickets.keys().next().value!);
  const ticketId=randomUUID(),expiresAt=this.now()+this.ttlMs;this.tickets.set(ticketId,{...value,expiresAt});
  return {ticketId,expiresAt:new Date(expiresAt).toISOString()};
 }
 read(ticketId:string,scope:SuggestionScope){
  const ticket=this.tickets.get(ticketId);
  if(!ticket||ticket.expiresAt<=this.now()||ticket.userId!==scope.userId||ticket.workspaceId!==scope.workspaceId||ticket.brandId!==scope.brandId)throw new AppError('NOT_FOUND','Suggestion unavailable; request a fresh answer');
  return ticket;
 }
}
