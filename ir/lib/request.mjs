export function validateBody(body){
 if(!body||!Array.isArray(body.messages)||body.messages.length<1||body.messages.length>7)throw new Error('Invalid messages');
 let total=0;
 const messages=body.messages.map((message,index)=>{if(!message||!['user','assistant'].includes(message.role)||typeof message.content!=='string'||!message.content.trim()||message.content.length>(message.role==='user'?2000:16000)||message.role!==(index%2===0?'user':'assistant'))throw new Error('Invalid message');total+=message.content.length;return {role:message.role,content:message.content.trim()};});
 if(total>30000||messages.at(-1).role!=='user')throw new Error('Invalid conversation');return messages;
}
export function allowedOrigin(origin,host){return !origin||origin==='https://ir.devfridge.cool'||origin===`https://${host}`||(!process.env.VERCEL&&origin==='http://127.0.0.1:4180');}
export function publicSource(source){try{const u=new URL(source.url);if(u.protocol!=='https:'||u.username||u.password)return null;const official=u.hostname==='devfridge.cool'||u.hostname.endsWith('.devfridge.cool');const ceo=['x.com','twitter.com'].includes(u.hostname)&&/^\/anonimocommando\/status\/\d+/i.test(u.pathname);if(!official&&!ceo)return null;return {url:u.href,title:String(source.title||u.hostname).slice(0,160)};}catch{return null;}}
