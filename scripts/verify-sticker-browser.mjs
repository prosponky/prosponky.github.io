import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {mergeVerificationMarkers} from './sticker-queue.mjs';
const store=process.argv[2],registry=JSON.parse(await readFile('data/dealership-sources.json','utf8'));
const limitIndex=process.argv.indexOf('--limit'),limit=limitIndex<0?Infinity:Number(process.argv[limitIndex+1]);
if(limit!==Infinity&&(!Number.isInteger(limit)||limit<1||limit>5))throw Error('Use one to five verification records per bounded batch');
if(!registry[store])throw Error('Registered store required');
const state=JSON.parse(await readFile(`tmp/${store}-sticker-browser.json`,'utf8'));
if(state.source!==registry[store].origin)throw Error('Source mismatch');
const checkpoint=`tmp/${store}-sticker-browser.json`;
const save=async()=>{
 // Merge verification markers into the current queue; never overwrite a newer collection index.
 const current=JSON.parse(await readFile(checkpoint,'utf8'));
 mergeVerificationMarkers(current,state);
 await writeFile(checkpoint+'.verify.tmp',JSON.stringify(current));await rename(checkpoint+'.verify.tmp',checkpoint);
};
await mkdir('tmp/sticker-discoveries',{recursive:true});
let verified=0,processed=0;
for(const result of Object.values(state.results)){
 if(result.processedAt)continue;
 if(result.status!=='no-link'&&!result.discoveries.length)continue;
 if(processed>=limit)break;processed++;
 if(result.status==='no-link'){
  const path=`public/inventory/${store}-stickers.json`,map=JSON.parse(await readFile(path,'utf8'));
  if(map.records[result.vin]?.status!=='verified'){
   map.records[result.vin]={vin:result.vin,status:'unavailable',checkedAt:result.checkedAt,browserPages:result.pages};
   await writeFile(path+'.tmp',JSON.stringify(map,null,2));await rename(path+'.tmp',path);
  }
  result.processedAt=new Date().toISOString();await save();continue;
 }
 if(!result.discoveries.length)continue;
 const path=`tmp/sticker-discoveries/${store}-${result.vin}.json`;
 await writeFile(path,JSON.stringify(result.discoveries.slice(0,5)));
 const run=spawnSync(process.execPath,['scripts/collect-window-stickers.mjs','--store',store,'--vin',result.vin,'--discovery-file',path],{encoding:'utf8',env:process.env,timeout:150000});
 console.log(run.stdout||run.stderr);if(run.status!==0)throw Error('Document verifier failed; checkpoints retained');verified++;
 result.processedAt=new Date().toISOString();await save();
}
console.log('Candidate vehicles processed:',verified);
console.log('Pending verification records:',Object.values(state.results).filter(r=>!r.processedAt&&(r.status==='no-link'||r.discoveries.length)).length);
