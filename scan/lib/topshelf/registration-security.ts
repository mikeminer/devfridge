import {createHmac, timingSafeEqual} from 'node:crypto';
export class RegistrationError extends Error { constructor(message:string,public status=400){super(message);} }
export function seal(payload:object, secret:string) {
  const data=Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${data}.${createHmac('sha256',secret).update(data).digest('base64url')}`;
}
export function unseal<T extends {kind:string;expires:number}>(token:unknown,secret:string,kind:string,now=Date.now()):T {
  if(typeof token!=='string'||token.length>12000)throw new RegistrationError('Invalid authorization');
  const parts=token.split('.');if(parts.length!==2)throw new RegistrationError('Invalid authorization');
  const expected=createHmac('sha256',secret).update(parts[0]).digest(), actual=Buffer.from(parts[1],'base64url');
  if(actual.length!==expected.length||!timingSafeEqual(actual,expected))throw new RegistrationError('Invalid authorization');
  const body=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8'));
  if(body.kind!==kind||!Number.isSafeInteger(body.expires)||body.expires<now)throw new RegistrationError('Authorization expired. Start a new verified run.');
  return body;
}
export async function scoreStore(command:(string|number)[]) {
  const url=process.env.KV_REST_API_URL,token=process.env.KV_REST_API_TOKEN;
  if(!url||!token)throw new RegistrationError('Score verification is not configured.',503);
  const response=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(command),cache:'no-store',signal:AbortSignal.timeout(5000)});
  if(!response.ok)throw new RegistrationError('Score verification storage is unavailable.',503);
  const data=await response.json();if(data.error)throw new RegistrationError('Score verification storage is unavailable.',503);return data.result;
}
export async function scoreRateLimit(identity:string,limit:number,seconds=60) {
  const key=createHmac('sha256',process.env.TOPSHELF_RUN_SECRET!).update(identity).digest('hex');
  const count=await scoreStore(['EVAL',"local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]); end; return n",1,`topshelf:rate:${key}`,seconds]);
  if(!Number.isInteger(count)||count<1)throw new RegistrationError('Verification unavailable.',503);
  if(count>limit)throw new RegistrationError('Too many requests. Please wait a minute.',429);
}
