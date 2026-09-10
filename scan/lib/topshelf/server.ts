import {Contract, FetchRequest, JsonRpcProvider, isAddress, ZeroAddress, getAddress} from 'ethers';
import {TOPSHELF_ABI, TOPSHELF_CHAIN, TOPSHELF_OWNER, ERC20_ABI, type FeeMenu, type FeeToken, type ShelfData, type ShelfToken} from './config';
import {ROBINHOOD_TOKENS} from '../official-tokens';
export function shelfConnection() {
 const address=process.env.TOPSHELF_CONTRACT_ADDRESS;
 if(!address) return null;
 if(!isAddress(address)||address===ZeroAddress) throw Error('Invalid TopShelf deployment configuration');
 const request=new FetchRequest(process.env.ROBINHOOD_RPC_URL||'https://rpc.mainnet.chain.robinhood.com');request.timeout=12000;
 const provider=new JsonRpcProvider(request,TOPSHELF_CHAIN,{staticNetwork:true});
 return {address:getAddress(address),provider,contract:new Contract(address,TOPSHELF_ABI,provider)};
}
let feeCache:{value:FeeMenu;expires:number;staleUntil:number}|null=null;
let feeRequest:Promise<FeeMenu>|null=null;
async function fetchFeeMenu():Promise<FeeMenu> {
 const connection=shelfConnection();
 if(!connection)return {configured:false,address:null,tokens:[],block:null};
 const {contract,provider,address}=connection;
 try {
  const block=await provider.getBlockNumber(),opts={blockTag:block},tokenAddresses=Array.from(await contract.getTokens(opts) as string[]);
  const tokens=await Promise.all(tokenAddresses.map(async token=>{
   const known=ROBINHOOD_TOKENS.find(item=>item.address.toLowerCase()===token.toLowerCase()),erc20=new Contract(token,ERC20_ABI,provider);
   const [symbol,decimals,fee,enabled]=await Promise.all([known?.symbol??erc20.symbol(opts),known?18:erc20.decimals(opts),contract.feeAmount(token,opts),contract.acceptedToken(token,opts)]);
   return {address:getAddress(token),symbol:String(symbol),decimals:Number(decimals),fee:String(fee),enabled:Boolean(enabled)} satisfies FeeToken;
  }));
  return {configured:true,address,tokens,block};
 } finally {provider.destroy();}
}
export async function readFeeMenu():Promise<FeeMenu> {
 const now=Date.now();if(feeCache&&feeCache.expires>now)return feeCache.value;
 if(feeRequest)return feeRequest;
 feeRequest=fetchFeeMenu().then(value=>{feeCache={value,expires:Date.now()+30000,staleUntil:Date.now()+15*60000};return value;}).catch(error=>{
  if(feeCache&&feeCache.staleUntil>Date.now())return {...feeCache.value,stale:true};throw error;
 }).finally(()=>{feeRequest=null;});
 return feeRequest;
}
export async function readShelf(seasonInput:number|null,cursor:string,wallet:string|null,claimSeasonInput:number|null):Promise<ShelfData> {
 const connection=shelfConnection();
 if(!connection) return {configured:false,address:null,owner:TOPSHELF_OWNER,currentSeason:1,season:1,activeDistribution:0,winnerCount:0,phase:0,players:0,registrations:0,captured:0,selectedWinners:0,totalScore:'0',rows:[],next:ZeroAddress,tokens:[],block:null,claimSeason:0,claimPhase:0,claimTokens:[]};
 const {contract,provider,address}=connection;
 try {
  if(Number(BigInt(await provider.send('eth_chainId',[])))!==TOPSHELF_CHAIN)throw Error('Wrong RPC network');
  const block=await provider.getBlockNumber(),opts={blockTag:block};
  const [owner,current,active,winners,tokenAddresses]=await Promise.all([contract.owner(opts),contract.currentSeason(opts),contract.activeDistribution(opts),contract.winnerCount(opts),contract.getTokens(opts)]);
  const season=seasonInput??Number(current);if(season<1||season>Number(current))throw Error('Invalid season');
  const claimSeason=claimSeasonInput??Number(active);if(claimSeason<0||claimSeason>=Number(current)&&claimSeason!==Number(active))throw Error('Invalid claim season');
  const [state,board]=await Promise.all([contract.seasons(season,opts),contract.leaderboard(season,cursor,100,opts)]);
  const readToken=async(token:string,claimId=0):Promise<ShelfToken>=>{
   const erc20=new Contract(token,ERC20_ABI,provider),known=ROBINHOOD_TOKENS.find(t=>t.address.toLowerCase()===token.toLowerCase());
   const [symbol,decimals,fee,enabled,balance,reserved,claimable]=await Promise.all([known?.symbol??erc20.symbol(opts),erc20.decimals(opts),contract.feeAmount(token,opts),contract.acceptedToken(token,opts),erc20.balanceOf(address,opts),contract.reserved(token,opts),wallet&&claimId?contract.claimable(claimId,wallet,token,opts):0n]);
   return {address:token,symbol,decimals:Number(decimals),fee:String(fee),enabled,balance:String(balance),reserved:String(reserved),available:String(BigInt(balance)-BigInt(reserved)),claimable:String(claimable)};
  };
  const tokens=await Promise.all(Array.from(tokenAddresses as string[]).map(t=>readToken(t)));
  let claimTokens:ShelfToken[]=[],claimPhase=0;
  if(claimSeason){const [claimState,addresses]=await Promise.all([contract.seasons(claimSeason,opts),contract.getDistributionTokens(claimSeason,opts)]);claimPhase=Number(claimState.phase);claimTokens=await Promise.all(Array.from(addresses as string[]).map(t=>readToken(t,claimSeason)));}
  return {configured:true,address,owner,currentSeason:Number(current),season,activeDistribution:Number(active),winnerCount:Number(winners),phase:Number(state.phase),players:Number(state.playerCount),registrations:Number(state.registrations),captured:Number(state.captured),selectedWinners:Number(state.winnerCount),totalScore:String(state.totalScore),rows:board[0].map((account:string,i:number)=>({address:account,score:String(board[1][i]),rank:i+1})),next:board[2],tokens,block,claimSeason,claimPhase,claimTokens};
 } finally {provider.destroy();}
}
