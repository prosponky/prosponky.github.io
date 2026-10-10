import {createServer} from 'node:http';
import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {autoNationVehicle} from '../src/autonation-inventory.js';
import {finalizeAutoNationRun} from './autonation-browser-run.mjs';
const config=JSON.parse(await readFile('data/dealership-sources.json','utf8'))['autonation-jacksonville'];
const base=resolve('tmp','autonation-'+new Date().toISOString().replaceAll(':','-'));
const resume=process.argv.includes('--resume');
const meta=resume?JSON.parse(await readFile('tmp/autonation-current-run.json','utf8')):{config,checkpoint:base+'-checkpoint.json',snapshot:base+'-snapshot.json',scope:process.argv[2]||'physical'};
meta.config=config;
const initial={phase:'list',startedAt:new Date().toISOString(),cards:[],evidence:[],detailCount:0};
await mkdir('tmp',{recursive:true});
const save=async(path,data)=>{await writeFile(path+'.tmp',JSON.stringify(data,null,2));await rename(path+'.tmp',path);};
if(!resume)await save(meta.checkpoint,initial);await save('tmp/autonation-current-run.json',meta);
const html=`<!doctype html><html><body><h1>AutoNation collection checkpoint</h1><p id="status">Ready</p><form method="post"><label>Checkpoint<textarea name="checkpoint" id="checkpoint"></textarea></label><button>Save checkpoint</button></form></body></html>`;
createServer(async(req,res)=>{
 try{
 if(req.method==='GET'){res.writeHead(200,{'Content-Type':'text/html'});const saved=JSON.parse(await readFile(meta.checkpoint,'utf8'));res.end(html.replace('</textarea>',JSON.stringify(saved).replaceAll('&','&amp;').replaceAll('<','&lt;')+'</textarea>'));return;}
 if(req.method!=='POST'||!['http://127.0.0.1:4319','http://localhost:4319'].includes(req.headers.origin))throw Error('Only the local checkpoint form may write this run.');
 let body='';for await(const chunk of req){body+=chunk;if(body.length>2000000)throw Error('Checkpoint too large.');}
 const state=JSON.parse(new URLSearchParams(body).get('checkpoint'));
 const old=JSON.parse(await readFile(meta.checkpoint,'utf8'));
 if(state.startedAt!==old.startedAt||!['list','details','confirm-list','done'].includes(state.phase)||state.detailCount!==state.evidence.length||state.detailCount<old.detailCount||state.cards.length<old.cards.length)throw Error('Invalid checkpoint progression.');
 if(old.cards.some((card,i)=>state.cards[i]?.vin!==card.vin||state.cards[i]?.price!==card.price||state.cards[i]?.url!==card.url))throw Error('Accepted VIN evidence changed while resuming.');
 for(const e of state.evidence)autoNationVehicle(e,config,state.startedAt);
 await save(meta.checkpoint,state);
 if(state.phase==='done'){
  await finalizeAutoNationRun(state,meta);
 }
 const status={phase:state.phase,total:state.total,listCount:state.cards.length,detailCount:state.detailCount,snapshot:state.phase==='done'?meta.snapshot:null};
 await save('tmp/inventory-health-autonation-jacksonville.json',{status:state.phase==='done'?'verified':'collecting',updatedAt:new Date().toISOString(),...status});
 res.writeHead(200,{'Content-Type':'text/html'});res.end(html.replace('Ready',JSON.stringify(status).replaceAll('&','&amp;').replaceAll('<','&lt;')));
 }catch(e){res.writeHead(400,{'Content-Type':'text/html'});res.end('<h1>Checkpoint failed</h1><p>'+e.message.replaceAll('&','&amp;').replaceAll('<','&lt;')+'</p>');}
}).listen(4319,'127.0.0.1',()=>console.log(JSON.stringify({url:'http://127.0.0.1:4319',meta,initial})));
