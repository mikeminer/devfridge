export const SCORE_TYPES = {ScoreReceipt:[
 {name:'runId',type:'bytes32'},{name:'solanaWallet',type:'bytes32'},
 {name:'player',type:'address'},{name:'season',type:'uint256'},
 {name:'score',type:'uint64'},{name:'seed',type:'uint32'},
 {name:'character',type:'uint8'},{name:'replayHash',type:'bytes32'},
 {name:'token',type:'address'},{name:'amount',type:'uint256'},{name:'deadline',type:'uint64'}
]};
export interface RunTicket {kind:'run';liveVersion?:2;runId:string;wallet:string;character:number;seed:number;season:number;rules:string;issued:number;expires:number;contract:string}
export interface ScoreChallenge {kind:'score';runId:string;wallet:string;player:string;season:number;hash:string;token:string;amount:string;score:number;ticks:number;expires:number;contract:string}
export function registrationMessage(c:ScoreChallenge) {
 return `DevFridge World — optional score registration\nhttps://world.devfridge.cool\n\nSolana wallet: ${c.wallet}\nRobinhood wallet: ${c.player}\nRobinhood Chain: 4663\nTopShelf: ${c.contract}\nSeason: ${c.season}\nRun: ${c.runId}\nScore to verify: ${c.score}\nReplay: ${c.hash}\nPayment token: ${c.token}\nPayment amount (raw token units): ${c.amount}\nAuthorization expires: ${new Date(c.expires).toISOString()}\n\nI authorize verification of this run for this Robinhood wallet. Registration permanently links these two wallets in TopShelf. This message does not transfer tokens. A separate Robinhood transaction is required for payment. Playing remains free.`;
}
