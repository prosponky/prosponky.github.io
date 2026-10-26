import {isDeepStrictEqual} from 'node:util';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {easternSlot,validateCogginSnapshot} from './local-inventory-recovery.mjs';
import {verifiedCogginVehicles} from '../src/coggin-inventory.js';

export function officialFallback(expected,live,config,{now=Date.now(),slot=easternSlot(new Date(now))}={}){
 const checked=Date.parse(expected?.checkedAt);
 if(!Number.isFinite(checked)||checked>now||checked<Date.parse(slot)||!verifiedCogginVehicles(expected,config,now))throw Error('No complete current-slot official vehicle inventory');
 validateCogginSnapshot(expected,config,slot,checked);
 if(!isDeepStrictEqual(expected,live))throw Error('Official live map does not match published evidence');
 return {status:'official-fallback-live-verified',checkedAt:expected.checkedAt,total:expected.total};
}

export async function sourceHealth(outcomes,registry,{readOfficial,now=Date.now()}={}){
 const report={checkedAt:new Date(now).toISOString(),slotStartedAt:easternSlot(new Date(now)),stores:{}};
 for(const key of ['greenway','coggin-atlantic','coggin-avenues']){
  if(outcomes[key]==='success'){report.stores[key]={status:'public-refreshed'};continue;}
  if(key==='greenway'){report.stores[key]={status:'failed',reason:'Public inventory could not refresh; prior evidence retained'};continue;}
  try{const {expected,live}=await readOfficial(key,registry[key]);report.stores[key]=officialFallback(expected,live,registry[key],{now,slot:report.slotStartedAt});}
  catch(error){report.stores[key]={status:'failed',reason:error.message};}
 }
 report.allAvailable=Object.values(report.stores).every(row=>row.status!=='failed');return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const registry=JSON.parse(await readFile('data/dealership-sources.json','utf8'));
 const outcomes={greenway:process.env.GREENWAY,'coggin-atlantic':process.env.ATLANTIC,'coggin-avenues':process.env.AVENUES};
 const readJson=async url=>{const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Official fallback HTTP '+r.status);return r.json();};
 const report=await sourceHealth(outcomes,registry,{readOfficial:async(key,config)=>{
  const file=config.priceFile,suffix='?health='+Date.now();
  const expected=await readJson('https://raw.githubusercontent.com/prosponky/prosponky.github.io/main/inventory/'+file+suffix);
  const live=await readJson('https://prosponky.github.io/inventory/'+file+suffix);return {expected,live};
 }});
 await mkdir('tmp',{recursive:true});await writeFile('tmp/cloud-source-health.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));
 if(process.env.GITHUB_STEP_SUMMARY){const {appendFile}=await import('node:fs/promises');await appendFile(process.env.GITHUB_STEP_SUMMARY,'\n| Store | Effective inventory outcome |\n|---|---|\n'+Object.entries(report.stores).map(([key,row])=>'| '+key+' | '+row.status+(row.reason?': '+row.reason:'')+' |').join('\n')+'\n');}
 if(!report.allAvailable)process.exitCode=1;
}
