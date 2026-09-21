import test from 'node:test';
import assert from 'node:assert/strict';
import {aggregateCommunityCup} from './community-cup';

const address=(id:number)=>`0x${id.toString(16).padStart(40,'0')}`;
test('Community Cup fixes the first team and counts one best score per wallet',()=>{
 const registrations=[
  {player:address(1),tier:2,score:100n,blockNumber:2,logIndex:0},
  {player:address(1),tier:2,score:300n,blockNumber:3,logIndex:0},
  {player:address(1),tier:4,score:900n,blockNumber:4,logIndex:0},
  ...Array.from({length:4},(_,index)=>({player:address(index+2),tier:2,score:BigInt(200-index),blockNumber:5+index,logIndex:0})),
 ];
 const rows=aggregateCommunityCup(registrations),team=rows.find(row=>row.tier===2)!,switched=rows.find(row=>row.tier===4)!;
 assert.equal(team.players,5);assert.equal(team.qualified,true);assert.equal(team.contributors[0].score,'300');assert.equal(switched.score,'0');
});

test('only the best ten distinct players contribute to the score',()=>{
 const registrations=Array.from({length:12},(_,index)=>({player:address(index+1),tier:1,score:BigInt(index+1),blockNumber:index,logIndex:0}));
 const team=aggregateCommunityCup(registrations).find(row=>row.tier===1)!;
 assert.equal(team.players,12);assert.equal(team.contributors.length,10);assert.equal(team.score,String(12+11+10+9+8+7+6+5+4+3));
});
