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
export type AssistanceScope=SuggestionScope&{signalIds:string[];hypothesisId:string|null;experimentId:string|null;sourceVersion:string};
/**
 * ADR-0026 · server-side proof that a person asked Brando to interpret specific signals. It is issued only after a
 * valid answer, lives in memory for a short time and is never sent to the provider. It grants no strategic
 * authority: it only lets the server record a learning's provenance as BRANDO_ASSISTED.
 */
export class BrandoAssistance {
 private proofs=new Map<string,AssistanceScope&{expiresAt:number}>();
 constructor(private now=Date.now,private ttlMs=30*60*1000,private capacity=512){}
 issue(value:AssistanceScope){
  for(const [key,proof] of this.proofs)if(proof.expiresAt<=this.now())this.proofs.delete(key);
  while(this.proofs.size>=this.capacity)this.proofs.delete(this.proofs.keys().next().value!);
  const proofId=randomUUID(),expiresAt=this.now()+this.ttlMs;this.proofs.set(proofId,{...value,expiresAt});
  return {proofId,expiresAt:new Date(expiresAt).toISOString()};
 }
 /** Returns the proof only when it is current and belongs to this actor, workspace and brand; otherwise null. */
 read(proofId:unknown,scope:SuggestionScope){
  if(typeof proofId!=='string')return null;
  const proof=this.proofs.get(proofId);
  if(!proof||proof.expiresAt<=this.now()||proof.userId!==scope.userId||proof.workspaceId!==scope.workspaceId||proof.brandId!==scope.brandId)return null;
  return proof;
 }
}
