import RAPIER from '@dimforge/rapier3d-compat';
import {initPhysics,MergeGame,type Piece} from './engine/core';
import {RegistrationError} from './registration-security';
import type {RunTicket} from './score-protocol';
type PieceState=Omit<Piece,'body'>&{handle:number};
export type PhysicsState={world:string;pieces:PieceState[];tick:number;score:number;combo:number;merges:number;nextId:number;lastDrop:number;lastMerge:number;status:MergeGame['status'];discovered:number[]};
export function capturePhysics(g:MergeGame):PhysicsState {
 return {world:Buffer.from(g.world.takeSnapshot()).toString('base64'),pieces:[...g.pieces.values()].map(({body,...p})=>({...p,handle:body.handle})),tick:g.tick,score:g.score,combo:g.combo,merges:g.merges,nextId:g.nextId,lastDrop:g.lastDrop,lastMerge:g.lastMerge,status:g.status,discovered:[...g.discovered]};
}
export async function advancePhysics(t:RunTicket,snapshot:PhysicsState|undefined,moves:{tick:number;x:number}[],tick:number,cached?:MergeGame|null) {
 await initPhysics();
 if(cached){
  if(tick<cached.tick){cached.dispose();throw new RegistrationError('Live moves cannot go backwards.',409);}
  const started=performance.now();
  while(cached.tick<tick&&cached.status==='playing'){cached.step();cached.events.length=0;if(cached.tick%600===0&&performance.now()-started>15000)throw new RegistrationError('Live verification is busy. Retry this move.',503);}
  if(cached.tick!==tick){cached.dispose();throw new RegistrationError('The live game ended before this move.',422);}
  return cached;
 }
 const g=new MergeGame(t.seed,t.character);
 try {
  if(snapshot){
   const restored=RAPIER.World.restoreSnapshot(Uint8Array.from(Buffer.from(snapshot.world,'base64')));if(!restored)throw Error('Invalid physics snapshot');g.world.free();g.world=restored;
   for(const {handle,...p} of snapshot.pieces)g.pieces.set(p.id,{...p,body:g.world.getRigidBody(handle)});
   for(const field of ['tick','score','combo','merges','nextId','lastDrop','lastMerge'] as const)g[field]=snapshot[field];
   g.status=snapshot.status;g.discovered=new Set(snapshot.discovered);g.inputs=moves.map(({tick,x})=>({tick,x}));
  }else if(moves.length)throw Error('Missing server physics state');
  if(tick<g.tick)throw new RegistrationError('Live moves cannot go backwards.',409);
  const started=performance.now();
  while(g.tick<tick&&g.status==='playing'){g.step();g.events.length=0;if(g.tick%600===0&&performance.now()-started>15000)throw new RegistrationError('Live verification is busy. Retry this move.',503);}
  if(g.tick!==tick)throw new RegistrationError('The live game ended before this move.',422);
  return g;
 }catch(e){g.dispose();throw e;}
}
