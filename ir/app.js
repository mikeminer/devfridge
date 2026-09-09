import {getLocale} from './i18n.mjs';
const t=getLocale(navigator.language), $=id=>document.getElementById(id);
document.documentElement.lang=t.language;
for(const [id,key] of Object.entries({title:'title',reset:'reset',send:'send','sources-title':'sourceTitle','source-note':'sourceNote','tip-title':'tipTitle','tip-description':'tipDescription','wallet-label':'walletLabel','verify-wallet':'verify','team-link':'team',privacy:'privacy','footer-note':'footer',copy:'copy','audience-label':'audienceLabel','position-title':'positionTitle','position-description':'positionDescription','founder-link':'founderLink'})) $(id).textContent=t[key];
$('question').placeholder=t.placeholder;
let history=[], busy=false;
function safeLink(value){try{const u=new URL(value);return u.protocol==='https:'?u.href:null}catch{return null}}
function renderText(element,text){text=text.replace(/<\|eos\|>/g,'');element.replaceChildren();const pattern=/\[\[?([^\]\n]+)\]?\]\((https:\/\/[^\s)]+)\)|\*\*([^*\n]+)\*\*|`([^`\n]+)`/g;let start=0;for(const match of text.matchAll(pattern)){element.append(document.createTextNode(text.slice(start,match.index)));const node=document.createElement(match[2]?'a':match[3]?'strong':'code');node.textContent=match[1]||match[3]||match[4];if(match[2]){node.href=safeLink(match[2])||'#';node.target='_blank';node.rel='noopener noreferrer';}element.append(node);start=match.index+match[0].length;}element.append(document.createTextNode(text.slice(start)));}
function message(role,text){const article=document.createElement('article');article.className='message '+role;const speaker=document.createElement('div');speaker.className='speaker';speaker.textContent=role==='assistant'?'DEVFRIDGE IR · GROK':'YOU';const content=document.createElement('div');content.className='text';renderText(content,text);article.append(speaker,content);$('messages').append(article);return {article,content};}
function scroll(){const el=$('messages');el.scrollTop=el.scrollHeight;}
function reset(){if(busy)return;history=[];$('messages').replaceChildren();message('assistant',t.welcome);$('prompts').hidden=false;$('status').textContent='';$('question').focus();}
for(const prompt of t.prompts){const button=document.createElement('button');button.type='button';button.textContent=prompt;button.onclick=()=>{$('question').value=prompt;$('chat-form').requestSubmit();};$('prompts').append(button);}
$('reset').onclick=reset;
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText($('wallet').value);$('copy').textContent=t.copied;setTimeout(()=>$('copy').textContent=t.copy,2500);}catch{$('wallet').select();$('status').textContent=t.copyError;}};
$('question').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing&&matchMedia('(min-width: 700px)').matches){event.preventDefault();$('chat-form').requestSubmit();}});
$('chat-form').addEventListener('submit',async event=>{
 event.preventDefault();const question=$('question').value.trim();if(busy||!question)return;
 busy=true;$('send').disabled=true;$('reset').disabled=true;$('prompts').hidden=true;$('status').textContent=t.loading;
 message('user',question);$('question').value='';const reply=message('assistant','');scroll();let answer='',completed=false;
 try{
  const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[...history.slice(-6),{role:'user',content:question}],language:navigator.language})});
  if(!response.ok)throw new Error(response.status===429?t.limited:t.error);
  const reader=response.body.getReader(),decoder=new TextDecoder();let pending='';
  const consume=event=>{if(event.type==='text'){answer+=event.text;renderText(reply.content,answer);$('status').textContent='';scroll();}else if(event.type==='done'){completed=true;const links=document.createElement('div');links.className='citations';for(const source of event.sources??[]){const href=safeLink(source.url);if(!href)continue;const a=document.createElement('a');a.href=href;a.textContent=source.title||new URL(href).hostname;a.target='_blank';a.rel='noopener noreferrer';links.append(a);}const state=document.createElement('p');state.className='source-status';state.textContent=`${event.xSearched?t.xSearched:t.xNotSearched} · ${t.sourceTime}: ${new Date(event.retrievedAt).toLocaleString()}`;reply.article.append(links,state);}else if(event.type==='error')throw new Error(t.error);};
  while(true){const {value,done}=await reader.read();pending+=decoder.decode(value||new Uint8Array(),{stream:!done});let end;while((end=pending.indexOf('\n'))>=0){const line=pending.slice(0,end);pending=pending.slice(end+1);if(line)consume(JSON.parse(line));}if(done)break;}
  if(pending.trim())consume(JSON.parse(pending));if(!completed||!answer)throw new Error(t.error);
  history=[...history,{role:'user',content:question},{role:'assistant',content:answer}].slice(-6);
 }catch(error){$('status').textContent=error.message||t.error;if(!answer)reply.article.remove();$('question').value=question;}
 finally{busy=false;$('send').disabled=false;$('reset').disabled=false;scroll();}
});
reset();
