import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const store=process.argv[2],registry=JSON.parse(await readFile('data/dealership-sources.json','utf8'));
if(!registry[store])throw Error('Registered store required');
const state=JSON.parse(await readFile(`tmp/${store}-sticker-browser.json`,'utf8'));
if(state.source!==registry[store].origin)throw Error('Source mismatch');
await mkdir('tmp/sticker-discoveries',{recursive:true});
let verified=0;
for(const result of Object.values(state.results)){
 if(!result.discoveries.length)continue;
 const path=`tmp/sticker-discoveries/${store}-${result.vin}.json`;
 await writeFile(path,JSON.stringify(result.discoveries.slice(0,5)));
 const run=spawnSync(process.execPath,['scripts/collect-window-stickers.mjs','--store',store,'--vin',result.vin,'--discovery-file',path],{encoding:'utf8',env:process.env,timeout:150000});
 console.log(run.stdout||run.stderr);if(run.status!==0)throw Error('Document verifier failed; checkpoints retained');verified++;
}
console.log('Candidate vehicles processed:',verified);
