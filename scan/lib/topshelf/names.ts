import {getAddress,verifyMessage} from 'ethers';
import {scoreRateLimit,scoreStore,RegistrationError} from './registration-security';
import {TOPSHELF_CHAIN} from './config';

const key=(wallet:string)=>`topshelf:name:${TOPSHELF_CHAIN}:${wallet.toLowerCase()}`;
export function cleanDisplayName(value:unknown){
 if(typeof value!=='string')throw new RegistrationError('Enter a display name.');
 const name=value.normalize('NFKC').replace(/\s+/g,' ').trim();
 if(name.length<2||name.length>24||!/^[\p{L}\p{N}][\p{L}\p{N} _.'-]*$/u.test(name))throw new RegistrationError('Use 2–24 letters or numbers. Spaces, dots, apostrophes, underscores and hyphens are allowed.');
 return name;
}
export function displayNameMessage(wallet:string,name:string,timestamp:number){return `DevFridge World display name\nWallet: ${getAddress(wallet)}\nName: ${name}\nTimestamp: ${timestamp}`;}
export async function saveDisplayName(walletInput:string,nameInput:unknown,timestampInput:unknown,signature:unknown){
 const wallet=getAddress(walletInput),name=cleanDisplayName(nameInput),timestamp=Number(timestampInput);
 if(!Number.isSafeInteger(timestamp)||Math.abs(Date.now()-timestamp)>5*60_000||typeof signature!=='string'||signature.length>200)throw new RegistrationError('Name authorization expired. Please sign again.');
 try{if(getAddress(verifyMessage(displayNameMessage(wallet,name,timestamp),signature))!==wallet)throw Error();}catch{throw new RegistrationError('The display name signature does not match this wallet.',403);}
 await scoreRateLimit(`name:${wallet}`,5,300);
 await scoreStore(['SET',key(wallet),JSON.stringify({name,updated:Date.now()})]);
 return name;
}
export async function displayNames(wallets:string[]){
 const unique=[...new Set(wallets.map(a=>getAddress(a)))];if(!unique.length)return new Map<string,string>();
 try{const values=await scoreStore(['MGET',...unique.map(key)]);const result=new Map<string,string>();if(Array.isArray(values))values.forEach((value,i)=>{try{const parsed=JSON.parse(value);const name=cleanDisplayName(parsed.name);result.set(unique[i].toLowerCase(),name);}catch{}});return result;}catch{return new Map<string,string>();}
}
export async function displayName(wallet:string){return (await displayNames([wallet])).get(getAddress(wallet).toLowerCase())||'';}
