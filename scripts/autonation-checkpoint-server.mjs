import {createServer} from 'node:http';
import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {autoNationVehicle} from '../src/autonation-inventory.js';
import {finalizeAutoNationRun} from './autonation-browser-run.mjs';
import {checkpointForm,checkpointError,checkpointHtmlHeaders,readCheckpointForm,assertAcceptedPrefix} from './checkpoint-form.mjs';
const config=JSON.parse(await readFile('data/dealership-sources.json','utf8'))['autonation-jacksonville'];
const base=resolve('tmp','autonation-'+new Date().toISOString().replaceAll(':','-'));
const resume=process.argv.includes('--resume');
const meta=resume?JSON.parse(await readFile('tmp/autonation-current-run.json','utf8')):{config,checkpoint:base+'-checkpoint.json',snapshot:base+'-snapshot.json',scope:process.argv[2]||'physical'};
meta.config=config;
const initial={phase:'list',startedAt:new Date().toISOString(),cards:[],evidence:[],detailCount:0};
await mkdir('tmp',{recursive:true});
const save=async(path,data)=>{await writeFile(path+'.tmp',JSON.stringify(data,null,2));await rename(path+'.tmp',path);};
if(!resume)await save(meta.checkpoint,initial);await save('tmp/autonation-current-run.json',meta);
const html=(state,status)=>checkpointForm(state,status,'AutoNation collection checkpoint');
createServer(async(req,res)=>{
 try{
 if(req.method==='GET'){res.writeHead(200,checkpointHtmlHeaders);const saved=JSON.parse(await readFile(meta.checkpoint,'utf8'));res.end(html(saved,'Ready'));return;}
 if(req.method!=='POST'||!['http://127.0.0.1:4319','http://localhost:4319'].includes(req.headers.origin))throw Error('Only the local checkpoint form may write this run.');
 const state=await readCheckpointForm(req,12000000);
 const old=JSON.parse(await readFile(meta.checkpoint,'utf8'));
 if(state.startedAt!==old.startedAt||!['list','details','confirm-list','done'].includes(state.phase)||state.detailCount!==state.evidence.length||state.detailCount<old.detailCount||state.cards.length<old.cards.length)throw Error('Invalid checkpoint progression.');
 assertAcceptedPrefix(old,state,['cards','evidence']);
 for(const e of state.evidence)autoNationVehicle(e,config,state.startedAt);
 await save(meta.checkpoint,state);
 if(state.phase==='done'){
  await finalizeAutoNationRun(state,meta);
 }
 const status={phase:state.phase,total:state.total,listCount:state.cards.length,detailCount:state.detailCount,snapshot:state.phase==='done'?meta.snapshot:null};
 await save('tmp/inventory-health-autonation-jacksonville.json',{status:state.phase==='done'?'verified':'collecting',updatedAt:new Date().toISOString(),...status});
 res.writeHead(200,checkpointHtmlHeaders);res.end(html(state,JSON.stringify(status)));
 }catch(e){res.writeHead(400,checkpointHtmlHeaders);res.end(checkpointError(e.message));}
}).listen(4319,'127.0.0.1',()=>console.log(JSON.stringify({url:'http://127.0.0.1:4319',meta,initial})));
