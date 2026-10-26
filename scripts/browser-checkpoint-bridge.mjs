// Loopback persistence for supported CUA. No dealer network access or publication.
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {randomUUID} from 'node:crypto';
import {restoreOfficialCheckpoint} from './browser-inventory.mjs';
import {verifiedCarfaxUrl} from '../src/carfax.js';
import {finalizeHutchinsonInventory,finalizeHutchinsonRun} from './finalize-hutchinson-run.mjs';
import {finalizeAutoNationRun} from './autonation-browser-run.mjs';
import {autoNationVehicle} from '../src/autonation-inventory.js';
import {checkpointForm,checkpointError,checkpointHtmlHeaders,readCheckpointForm,assertAcceptedPrefix} from './checkpoint-form.mjs';
import {applyCheckpointDelta} from './checkpoint-delta.mjs';

export async function atomicJson(path,value){await mkdir(dirname(path),{recursive:true});await writeFile(path+'.tmp',JSON.stringify(value));await rename(path+'.tmp',path);}
const same=(a,b,label)=>{if(!isDeepStrictEqual(a,b))throw Error('Accepted evidence changed: '+label);};
const preserveMap=(a,b,label)=>{for(const [key,value] of Object.entries(a||{}))same(value,b?.[key],label);};
const ageCheck=(state,limit)=>{const age=Date.now()-Date.parse(state.startedAt);if(!Number.isFinite(age)||age<0||age>limit)throw Error('Expired checkpoint; reserve a fresh run');};

export function validateBridgeProgress(previous,state,config){
 same(previous.startedAt,state.startedAt,'startedAt');ageCheck(state,config.adapter==='dealer-inspire-browser'?3600000:7200000);
 if(config.adapter==='dealer-inspire-browser'){
  same(previous.source,state.source,'source');same(previous.adapter,state.adapter,'adapter');
  if(!Array.isArray(state.sections)||state.sections.length<previous.sections.length)throw Error('Section regression');
  let added=0;
  for(let i=0;i<state.sections.length;i++){
   const old=previous.sections[i],next=state.sections[i];
   if(old){same(old.condition,next.condition,'condition');same(old.total,next.total,'total');assertAcceptedPrefix(old,next,['pages']);if(old.done&&!next.done)throw Error('Completed section regressed');}
   added+=next.pages.length-(old?.pages.length||0);
  }
  if(added>4)throw Error('Page batch too large'); // three reads plus one pass delimiter
  assertAcceptedPrefix(previous,state,['reportDetails']);if(state.reportDetails.length-previous.reportDetails.length>5)throw Error('Report batch too large');
  const c=restoreOfficialCheckpoint(config,state);
  if(state.nextUrl===null&&state.sections.filter(s=>s.done).length!==config.sections.length)throw Error('Incomplete sections');
  if(state.nextUrl){const section=config.sections[state.sections.filter(s=>s.done).length],url=new URL(state.nextUrl);if(!section||url.origin!==config.origin||url.pathname!==section.path)throw Error('Unexpected next page');if(state.reportDetails.length)throw Error('Reports before inventory completion');return {};}
  const snapshot=c.snapshot(state.inventoryCheckedAt||new Date().toISOString());
  if(previous.inventoryCheckedAt)same(previous.inventoryCheckedAt,state.inventoryCheckedAt,'inventoryCheckedAt');
  const used=Object.entries(snapshot.prices).filter(([,r])=>r.condition==='used');
  if(state.reportDetails.length>used.length)throw Error('Excess report evidence');
  const reports={};
  state.reportDetails.forEach((d,i)=>{const [vin,row]=used[i];if(d.vin!==vin||d.url!==row.url||!d.body.toUpperCase().includes(vin)||/access denied|verify you are human|security challenge/i.test(d.body))throw Error('Report identity mismatch');const links=[...new Set(d.hrefs.map(verifiedCarfaxUrl).filter(Boolean))];if(links.length>1)throw Error('Conflicting Carfax reports');if(!Number.isFinite(Date.parse(d.checkedAt))||Date.parse(d.checkedAt)>Date.now())throw Error('Invalid report date');reports[vin]={stockNumber:row.stockNumber,listingUrl:row.url,interiorColor:d.body.match(/(?:^|\n)Interior(?: Color)?\s*:?\s*\n?([^\n]+)/i)?.[1]?.trim()||'',url:links[0]||null};});
  if(state.reportDetails.length===used.length){snapshot.carfax={source:config.origin,checkedAt:new Date().toISOString(),total:used.length,reports};return {snapshot,done:true};}
  return {};
 }
 if(config.adapter==='hutchinson-browser'){
  same(previous.source,state.source,'source');same(previous.store,state.store,'store');
  assertAcceptedPrefix(previous,state,['pages','finalChecks']);if(state.pages.length-previous.pages.length>1)throw Error('Page batch too large');
  preserveMap(previous.details,state.details,'listing details');preserveMap(previous.reports,state.reports,'reports');
  if(previous.inventoryFinalChecks)assertAcceptedPrefix(previous,state,['inventoryFinalChecks']);
  if(previous.duplicateRun&&!state.duplicateRun)throw Error('Accepted confirmation evidence removed');
  if(state.duplicateRun){same(state.startedAt,state.duplicateRun.startedAt,'duplicate confirmation date');same(state.source,state.duplicateRun.source,'duplicate confirmation source');if(previous.duplicateRun){assertAcceptedPrefix({...previous.duplicateRun,inventoryFinalChecks:previous.duplicateRun.inventoryFinalChecks??[]},{...state.duplicateRun,inventoryFinalChecks:state.duplicateRun.inventoryFinalChecks??[]},['pages','inventoryFinalChecks']);preserveMap(previous.duplicateRun.details,state.duplicateRun.details,'confirmation details');}if(state.duplicateRun.pages.length-(previous.duplicateRun?.pages.length||0)>1)throw Error('Confirmation page batch too large');}
  if(Object.keys(state.reports).length-Object.keys(previous.reports).length>5)throw Error('Report batch too large');
  if(previous.detailQueue.length)same(previous.detailQueue,state.detailQueue,'report queue');
  if(previous.inventoryFinishedAt){same(previous.inventoryFinishedAt,state.inventoryFinishedAt,'inventory date');same(previous.inventoryFinalChecks,state.inventoryFinalChecks,'inventory count checks');}
  if(state.phase==='inventory-ready')return {inventory:finalizeHutchinsonInventory(state,config)};
  if(state.phase==='done')return {snapshot:finalizeHutchinsonRun(state,config),done:true};
  if(!['list','inventory-confirm','duplicate-list','details','confirm'].includes(state.phase))throw Error('Invalid phase');
  return {};
 }
 if(config.adapter==='autonation-browser'){
  assertAcceptedPrefix(previous,state,['cards','evidence']);if(state.evidence.length-previous.evidence.length>5||state.detailCount!==state.evidence.length)throw Error('Invalid detail progression');
  for(const key of ['total','resultsTotal','promotionalTileCount','promotionalTiles'])if(previous[key]!==undefined)same(previous[key],state[key],key);
  for(const row of state.evidence)autoNationVehicle(row,config,state.startedAt);
  if(!['list','details','confirm-list','done'].includes(state.phase))throw Error('Invalid phase');
  return {done:state.phase==='done'};
 }
 throw Error('Unsupported browser store');
}

export async function reserveBridgeRun(store,{directory=resolve('tmp/browser-bridge'),registryPath=resolve('data/dealership-sources.json'),trigger='manual recovery'}={}){
 const registry=JSON.parse(await readFile(registryPath,'utf8')),config=registry[store];
 if(!['dealer-inspire-browser','hutchinson-browser','autonation-browser'].includes(config?.adapter))throw Error('Unregistered browser store');
 const startedAt=new Date().toISOString(),base=resolve(directory,store+'-'+startedAt.replaceAll(':','-'));
 let state;
 if(config.adapter==='dealer-inspire-browser')state={source:config.origin,adapter:config.adapter,startedAt,sections:[],nextUrl:new URL(config.sections[0].path,config.origin).href,reportDetails:[]};
 else if(config.adapter==='hutchinson-browser')state={store:config.key,source:config.origin,startedAt,phase:'list',sectionIndex:0,nextUrl:new URL(config.sections[0].path,config.origin).href,pages:[],details:{},detailQueue:[],detailIndex:0,reports:{},confirmIndex:0,finalChecks:[]};
 else state={phase:'list',startedAt,cards:[],evidence:[],detailCount:0};
 const meta={store,config,scope:'physical',trigger,route:randomUUID(),checkpoint:base+'-checkpoint.json',snapshot:base+'-snapshot.json',inventorySnapshot:base+'-inventory-snapshot.json',evidence:base+'-evidence.json',inventoryEvidence:base+'-inventory-evidence.json',metadata:base+'-run.json'};
 await atomicJson(meta.checkpoint,{version:0,state,progress:{phase:'reserved'}});await atomicJson(meta.metadata,meta);return meta;
}

export function bridgeServer(meta,{port=4321}={}){
 const origin='http://127.0.0.1:'+port,path='/'+meta.route;let queue=Promise.resolve();
 const handler=async(req,res)=>{try{
  if(req.headers.host!=='127.0.0.1:'+port||req.url!==path)throw Error('Reserved local form only');
  let saved=JSON.parse(await readFile(meta.checkpoint,'utf8'));
  if(req.method==='POST'){
   if(req.headers.origin!==origin)throw Error('Same-origin form required');
   const incoming=await readCheckpointForm(req,24000000);
   if(incoming.delta){if(incoming.version!==saved.version)throw Error('Checkpoint version changed; reload before resuming');incoming.state=applyCheckpointDelta(saved.state,incoming.delta);}
   if(incoming.version!==saved.version){if(!isDeepStrictEqual(incoming.state,saved.state))throw Error('Checkpoint version changed; reload before resuming');}
   else{
    const result=validateBridgeProgress(saved.state,incoming.state,meta.config),state=incoming.state;
    if(meta.config.adapter==='dealer-inspire-browser'&&state.nextUrl===null&&!state.inventoryCheckedAt)state.inventoryCheckedAt=new Date().toISOString();
    if(result.inventory){await atomicJson(meta.inventorySnapshot,result.inventory);await atomicJson(meta.inventoryEvidence,state);}
    if(result.done){if(meta.config.adapter==='autonation-browser')await finalizeAutoNationRun(state,meta);else await atomicJson(meta.snapshot,result.snapshot);await atomicJson(meta.evidence,state);}
    const progress={phase:state.phase||(result.done?'done':state.nextUrl?'list':'reports'),done:!!result.done,pages:state.pages?.length??state.sections?.reduce((n,s)=>n+s.pages.filter(Boolean).length,0),details:state.detailIndex??state.detailCount??state.reportDetails?.length,inventoryReady:!!result.inventory,snapshot:result.done?meta.snapshot:null,inventorySnapshot:result.inventory?meta.inventorySnapshot:null};
    saved={version:saved.version+1,state,progress};await atomicJson(meta.checkpoint,saved);
   }
  }else if(req.method!=='GET')throw Error('Unsupported local method');
  res.writeHead(200,checkpointHtmlHeaders);res.end(checkpointForm({...saved,config:meta.config},JSON.stringify({version:saved.version,...saved.progress}),'Pocket Desking '+meta.store+' checkpoint',true));
 }catch(error){res.writeHead(400,checkpointHtmlHeaders);res.end(checkpointError(error.message));}};
 const server=createServer((req,res)=>{queue=queue.then(()=>handler(req,res),()=>handler(req,res));});
 return {server,url:origin+path};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const args=process.argv.slice(2),resume=args.indexOf('--resume'),meta=resume>=0?JSON.parse(await readFile(args[resume+1],'utf8')):await reserveBridgeRun(args[0]);
 const i=args.indexOf('--port'),port=i<0?4321:Number(args[i+1]);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid loopback port');
 const {server,url}=bridgeServer(meta,{port});server.listen(port,'127.0.0.1',()=>console.log(JSON.stringify({url,...meta})));
}
