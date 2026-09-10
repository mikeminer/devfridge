import artifact from './artifact.json';
export const TOPSHELF_ABI = artifact.abi;
export const TOPSHELF_OWNER = '0x5d69c42a3a481d0ccfd88cfa8a2a08e2bf456134';
export const TOPSHELF_CHAIN = 4663;
export const EXPLORER = 'https://robinhoodchain.blockscout.com';
export const ERC20_ABI = ['function symbol() view returns (string)','function decimals() view returns (uint8)','function balanceOf(address) view returns (uint256)','function allowance(address,address) view returns (uint256)','function approve(address,uint256) returns (bool)'];
export type ShelfToken = {address:string;symbol:string;decimals:number;fee:string;enabled:boolean;balance:string;reserved:string;available:string;claimable:string};
export type ShelfData = {
 configured:boolean;address:string|null;owner:string;currentSeason:number;season:number;activeDistribution:number;winnerCount:number;phase:number;players:number;registrations:number;captured:number;selectedWinners:number;totalScore:string;
 rows:{address:string;name?:string;score:string;rank:number}[];next:string;tokens:ShelfToken[];block:number|null;claimSeason:number;claimPhase:number;claimTokens:ShelfToken[];
};
