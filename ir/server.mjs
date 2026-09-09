import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import chat from './api/chat.mjs';
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript'};
createServer(async(req,res)=>{try{const path=new URL(req.url,'http://localhost').pathname;if(path==='/api/chat'){let body='';for await(const chunk of req){body+=chunk;if(body.length>40000){res.writeHead(413).end();return;}}try{req.body=JSON.parse(body)}catch{req.body=null}await chat(req,res);return;}const file=path==='/'?'index.html':path.slice(1);if(!['index.html','style.css','app.js','i18n.mjs'].includes(file)){res.writeHead(404).end();return;}res.setHeader('Content-Type',types[extname(file)]);res.end(await readFile(resolve(file)));}catch{res.writeHead(500).end();}}).listen(4180,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4180'));
