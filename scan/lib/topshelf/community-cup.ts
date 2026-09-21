import {getAddress} from 'ethers';
import {shelfConnection} from './server';
import {TOPSHELF_CHAIN} from './config';
import {displayNames} from './names';

const DEPLOYMENT_BLOCK=59_392_721;
export const COMMUNITY_CUP_MINIMUM_PLAYERS=5;
export const COMMUNITY_CUP_COUNTED_PLAYERS=10;
const communities=[
 {tier:1,id:'rugarugo',name:'Rugarugo',symbol:'RUGARUGO'},
 {tier:2,id:'aperitivo',name:'Aperitivo',symbol:'APE'},
 {tier:3,id:'friedfomo',name:'FriedFomo',symbol:'FIFO'},
 {tier:4,id:'fudfusilli',name:'FudFusilli',symbol:'FUSILLI'},
 {tier:5,id:'lambocello',name:'Lambocello',symbol:'LAMBOCELLO'},
 {tier:6,id:'gmgnocco',name:'GmGnocco',symbol:'GMGN'},
 {tier:7,id:'sersugo',name:'SerSugo',symbol:'SESU'},
 {tier:8,id:'moonzarella',name:'MoonZarella',symbol:'MOONZARELL'},
 {tier:9,id:'bonkatino',name:'Bonkatino',symbol:'BONKATINO'},
 {tier:10,id:'ciccia',name:'Ciccia Salsiccia',symbol:'CICCIA'},
] as const;

export type CommunityRegistration={player:string;tier:number;score:bigint;blockNumber:number;logIndex:number};
export type CommunityCupRow={tier:number;id:string;name:string;symbol:string;score:string;players:number;qualified:boolean;contributors:{address:string;name?:string;score:string;rank:number}[]};

/** The first confirmed character fixes a wallet's team for the season. Only its best score for that team counts. */
export function aggregateCommunityCup(registrations:CommunityRegistration[],names=new Map<string,string>()):CommunityCupRow[] {
 const ordered=[...registrations].sort((a,b)=>a.blockNumber-b.blockNumber||a.logIndex-b.logIndex);
 const players=new Map<string,{tier:number;score:bigint}>();
 for(const registration of ordered){
  if(!Number.isInteger(registration.tier)||registration.tier<1||registration.tier>10||registration.score<0n)continue;
  let player:string;try{player=getAddress(registration.player).toLowerCase();}catch{continue;}
  const current=players.get(player);
  if(!current)players.set(player,{tier:registration.tier,score:registration.score});
  else if(current.tier===registration.tier&&registration.score>current.score)current.score=registration.score;
 }
 const rows=communities.map(community=>{
  const contributors=[...players].filter(([,entry])=>entry.tier===community.tier).map(([address,entry])=>({address,score:entry.score})).sort((a,b)=>a.score===b.score?a.address.localeCompare(b.address):a.score>b.score?-1:1);
  const counted=contributors.slice(0,COMMUNITY_CUP_COUNTED_PLAYERS),score=counted.reduce((sum,entry)=>sum+entry.score,0n);
  return {...community,score:String(score),players:contributors.length,qualified:contributors.length>=COMMUNITY_CUP_MINIMUM_PLAYERS,contributors:counted.map((entry,index)=>({address:entry.address,name:names.get(entry.address),score:String(entry.score),rank:index+1}))};
 });
 return rows.sort((a,b)=>{const scoreA=BigInt(a.score),scoreB=BigInt(b.score);return scoreA===scoreB?a.tier-b.tier:scoreA>scoreB?-1:1;});
}

export type CommunityCupData={configured:boolean;season:number|null;block:number|null;minimumPlayers:number;countedPlayers:number;rows:CommunityCupRow[]};
let cache:{value:CommunityCupData;expires:number;staleUntil:number}|null=null;
let pending:Promise<CommunityCupData>|null=null;

async function readFreshCommunityCup():Promise<CommunityCupData>{
 const connection=shelfConnection();
 if(!connection)return {configured:false,season:null,block:null,minimumPlayers:COMMUNITY_CUP_MINIMUM_PLAYERS,countedPlayers:COMMUNITY_CUP_COUNTED_PLAYERS,rows:[]};
 const {address,provider,contract}=connection;
 try{
  if(Number(BigInt(await provider.send('eth_chainId',[])))!==TOPSHELF_CHAIN)throw Error('Wrong network');
  const block=await provider.getBlockNumber(),season=Number(await contract.currentSeason({blockTag:block}));
  const events=await contract.queryFilter(contract.filters.ScoreRegistered(null,null,season),DEPLOYMENT_BLOCK,block);
  const registrations:CommunityRegistration[]=[];
  for(let offset=0;offset<events.length;offset+=8){
   const batch=events.slice(offset,offset+8);
   const decoded=await Promise.all(batch.map(async event=>{
    const transaction=await provider.getTransaction(event.transactionHash);if(!transaction||!transaction.to||getAddress(transaction.to)!==address)return null;
    const parsed=contract.interface.parseTransaction({data:transaction.data,value:transaction.value});if(!parsed||parsed.name!=='registerScore')return null;
    const receipt=parsed.args[0],args='args' in event?event.args:null;
    if(Number(receipt.season)!==season||Number(receipt.character)<1||Number(receipt.character)>10||!args||getAddress(receipt.player)!==getAddress(String(args.player))||String(receipt.runId).toLowerCase()!==String(args.runId).toLowerCase()||BigInt(receipt.score)!==BigInt(args.score))return null;
    return {player:getAddress(receipt.player),tier:Number(receipt.character),score:BigInt(receipt.score),blockNumber:event.blockNumber,logIndex:event.index} satisfies CommunityRegistration;
   }));
   registrations.push(...decoded.filter((entry):entry is CommunityRegistration=>entry!==null));
  }
  const playerAddresses=[...new Set(registrations.map(entry=>entry.player.toLowerCase()))],names=await displayNames(playerAddresses);
  return {configured:true,season,block,minimumPlayers:COMMUNITY_CUP_MINIMUM_PLAYERS,countedPlayers:COMMUNITY_CUP_COUNTED_PLAYERS,rows:aggregateCommunityCup(registrations,names)};
 }finally{provider.destroy();}
}

export async function readCommunityCup():Promise<CommunityCupData>{
 const now=Date.now();if(cache&&cache.expires>now)return cache.value;if(pending)return pending;
 pending=readFreshCommunityCup().then(value=>{cache={value,expires:Date.now()+30_000,staleUntil:Date.now()+10*60_000};return value;}).catch(error=>{if(cache&&cache.staleUntil>Date.now())return cache.value;throw error;}).finally(()=>{pending=null;});
 return pending;
}
