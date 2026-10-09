import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const store=process.argv[2],registry=JSON.parse(await readFile('data/dealership-sources.json','utf8'));
if(!registry[store])throw Error('Registered store required');
const state=JSON.parse(await readFile(`tmp/${store}-sticker-browser.json`,'utf8'));
if(state.source!==registry[store].origin)throw Error('Source mismatch');
await mkdir('tmp/sticker-discoveries',{recursive:true});
let verified=0;
for(const result of Object.values(state.results)){
 if(result.processedAt)continue;
 if(result.status==='no-link'){
  const path=`public/inventory/${store}-stickers.json`,map=JSON.parse(await readFile(path,'utf8'));
  if(map.records[result.vin]?.status!=='verified'){
   map.records[result.vin]={vin:result.vin,status:'unavailable',checkedAt:result.checkedAt,browserPages:result.pages};
   await writeFile(path+'.tmp',JSON.stringify(map,null,2));const {rename}=await import('node:fs/promises');await rename(path+'.tmp',path);
  }
  result.processedAt=new Date().toISOString();await writeFile(`tmp/${store}-sticker-browser.json`,JSON.stringify(state));continue;
 }
 if(!result.discoveries.length)continue;
 const path=`tmp/sticker-discoveries/${store}-${result.vin}.json`;
 await writeFile(path,JSON.stringify(result.discoveries.slice(0,5)));
 const run=spawnSync(process.execPath,['scripts/collect-window-stickers.mjs','--store',store,'--vin',result.vin,'--discovery-file',path],{encoding:'utf8',env:process.env,timeout:150000});
 console.log(run.stdout||run.stderr);if(run.status!==0)throw Error('Document verifier failed; checkpoints retained');verified++;
 result.processedAt=new Date().toISOString();await writeFile(`tmp/${store}-sticker-browser.json`,JSON.stringify(state));
}
console.log('Candidate vehicles processed:',verified);
