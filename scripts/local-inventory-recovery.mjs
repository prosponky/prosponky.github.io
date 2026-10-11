import {readFile,writeFile,rename,mkdir,open,unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {verifiedCarfaxUrl} from '../src/carfax.js';
import {retainCogginPrices} from '../src/retained-official-prices.js';

export function validateCogginSnapshot(data,config,startedAt,now=Date.now()){
 const age=now-Date.parse(data.checkedAt),vins=data.inventoryVins;
 if(data.complete!==true||data.source!==config.origin||!Number.isFinite(age)||age<0||age>3600000||Date.parse(data.checkedAt)<Date.parse(startedAt)||!Array.isArray(vins)||!vins.length||data.total!==vins.length||new Set(vins).size!==vins.length)throw Error('Incomplete, stale or mismatched official snapshot');
 const maps=['offers','retailPrices','trims','interiorColors','carfax','certified'];
 for(const name of maps)if(!data[name]||Object.keys(data[name]).length!==vins.length||vins.some(v=>!Object.hasOwn(data[name],v)))throw Error('Incomplete VIN map: '+name);
 if(Object.keys(data.stocks||{}).length!==vins.length)throw Error('Incomplete stock map');
 for(const vin of vins){
  if(!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin))throw Error('Invalid official VIN');
  const amount=data.retailPrices[vin];if(amount!==null&&!(Number.isFinite(amount)&&amount>0))throw Error('Invalid official amount');
  if(data.carfax[vin]!==null&&!verifiedCarfaxUrl(data.carfax[vin]))throw Error('Invalid dealer report link');
  if(typeof data.interiorColors[vin]!=='string'||typeof data.trims[vin]!=='string'||typeof data.certified[vin]!=='boolean'||!Array.isArray(data.offers[vin]))throw Error('Invalid official fields');
 }
 for(const [stock,href]of Object.entries(data.stocks)){const url=new URL(href);if(!stock||url.origin!==config.origin||!/^\/(new|used|certified)\//.test(url.pathname))throw Error('Invalid official listing link');}
 return data;
}

export async function acquireRunLock(path,{pid=process.pid,isAlive=p=>{try{process.kill(p,0);return true;}catch(e){return e.code!=='ESRCH';}}}={}){
 for(let attempt=0;attempt<2;attempt++){
  try{const file=await open(path,'wx');await file.writeFile(JSON.stringify({pid,startedAt:new Date().toISOString()}));await file.close();return async()=>{await unlink(path);};}
  catch(e){if(e.code!=='EEXIST')throw e;const previous=JSON.parse(await readFile(path,'utf8'));if(!Number.isInteger(previous.pid)||previous.pid<1||isAlive(previous.pid)||attempt)throw Error('Another inventory recovery is active or lock ownership cannot be verified');await unlink(path);}
 }
}

export async function recoverStores(configs,{collect,publish,live,save,force=false,slotStartedAt,now=()=>Date.now(),onProgress=async()=>{}}){
 const report={startedAt:new Date(now()).toISOString(),scope:'official-coggin-recovery',stores:{}};
 for(const [key,config]of configs){
  const result=report.stores[key]={status:'checking'};
  await onProgress(report);
  try{
   const existing=await live(config).catch(()=>null);
   let current=false;try{if(existing){validateCogginSnapshot(existing,config,slotStartedAt,now());current=true;}}catch{}
   if(!force&&current){result.status='already-fresh';result.checkedAt=existing.checkedAt;result.total=existing.total;}
   else{
    const startedAt=new Date(now()).toISOString();
    const data=validateCogginSnapshot(retainCogginPrices(await collect(key,config),existing),config,startedAt,now());
    await save(key,data); // Archive the exact complete evidence before publication.
    const publication=await publish(key,config,data);
    if(publication?.buildRequestWarning)result.buildRequestWarning=publication.buildRequestWarning;
    const actual=await live(config,data.checkedAt);
    if(JSON.stringify(actual)!==JSON.stringify(data))throw Error('Published evidence does not match the live map');
    result.status='published-live-verified';result.checkedAt=data.checkedAt;result.total=data.total;
   }
  }catch(e){result.status='failed';result.reason=e.message;}
  await onProgress(report);
 }
 report.finishedAt=new Date(now()).toISOString();return report;
}

export function easternSlot(now=new Date()){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23',timeZoneName:'longOffset'}).formatToParts(now).map(p=>[p.type,p.value]));
 // Before the morning slot, use yesterday's noon. Day arithmetic is calendar based.
 let date=parts.year+'-'+parts.month+'-'+parts.day,hour=Number(parts.hour)>=12?'12':'07';
 if(Number(parts.hour)<7){date=new Date(Date.parse(date+'T12:00:00Z')-86400000).toISOString().slice(0,10);hour='12';}
 const slotOffset=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',timeZoneName:'longOffset'}).formatToParts(new Date(date+'T17:00:00Z')).find(p=>p.type==='timeZoneName').value;
 const offset=slotOffset.replace('GMT','')||'+00:00';return date+'T'+hour+':00:00'+offset;
}

async function main(){
 // URL conversion handles workspace spaces and Windows paths correctly.
 const {fileURLToPath}=await import('node:url');process.chdir(fileURLToPath(new URL('..',import.meta.url)));
 await mkdir('tmp/local-inventory-recovery',{recursive:true});
 const release=await acquireRunLock(resolve('tmp/local-inventory-recovery/run.lock'));
 const stamp=new Date().toISOString().replaceAll(':','-'),dir=resolve('tmp/local-inventory-recovery',stamp);await mkdir(dir,{recursive:true});
 const atomic=async(path,data)=>{await writeFile(path+'.tmp',JSON.stringify(data,null,2));await rename(path+'.tmp',path);};
 const registry=JSON.parse(await readFile('data/dealership-sources.json','utf8'));
 const configs=Object.entries(registry).filter(([,c])=>c.adapter==='dealer-com-public-html');
 const repo=resolve('tmp/hosted-preview'),safe='safe.directory='+repo.replaceAll('\\','/');
 const git=args=>execFileSync('git',['-c',safe,'-C',repo,'-c','user.name=Pocket Desking inventory','-c','user.email=github-actions[bot]@users.noreply.github.com',...args],{encoding:'utf8',timeout:120000});
 const live=async(config,expected)=>{
  for(let i=0;i<(expected?30:1);i++){
   const response=await fetch('https://prosponky.github.io/inventory/'+config.priceFile+'?check='+Date.now(),{signal:AbortSignal.timeout(15000),cache:'no-store'});
   if(!response.ok)throw Error('Live inventory HTTP '+response.status);
   const data=await response.json();if(!expected||data.checkedAt===expected)return data;
   await new Promise(r=>setTimeout(r,2000));
  }throw Error('Live publication did not become current');
 };
 try{
  const report=await recoverStores(configs,{force:process.argv.includes('--force'),slotStartedAt:easternSlot(),live,
   onProgress:async report=>{await atomic(resolve(dir,'report.json'),report);await atomic(resolve('tmp/local-inventory-recovery/latest-report.json'),report);},
   collect:async(key,config)=>{
    await new Promise((ok,no)=>{const p=spawn(process.execPath,['scripts/collect-coggin-offers.mjs',key],{stdio:['ignore','pipe','pipe'],windowsHide:true,timeout:600000});let tail='';const log=chunk=>{tail=(tail+chunk).slice(-8000);process.stdout.write(chunk);};p.stdout.on('data',log);p.stderr.on('data',log);p.on('error',no);p.on('close',code=>code===0?ok():no(Error(key+' collection failed: '+tail.slice(-1000))));});
    return JSON.parse(await readFile('public/inventory/'+config.priceFile,'utf8'));
   },save:async(key,data)=>{await atomic(resolve(dir,key+'.json'),data);await atomic(resolve('public/inventory',registry[key].priceFile),data);},
   publish:async(key,config,data)=>{
    if(!process.argv.includes('--publish'))throw Error('Snapshot verified locally; --publish required for end-to-end recovery');
    const unlock=await acquireRunLock(resolve('tmp/official-price-publish.lock'));
    try{
     if(git(['status','--porcelain']).trim())throw Error('Release checkout has unfinished changes; no overwrite attempted');
     git(['pull','--rebase','origin','main']);
     const path='inventory/'+config.priceFile,current=JSON.parse(await readFile(resolve(repo,path),'utf8'));
     if(Date.parse(current.checkedAt)>Date.parse(data.checkedAt))throw Error('Newer evidence already published; older snapshot not applied');
     await atomic(resolve(repo,path),data);git(['add','--',path]);
     if(git(['diff','--cached','--name-only']).trim()){
      git(['commit','-m','Recover complete official '+config.name+' inventory']);
      let pushed=false;for(let i=0;i<5;i++){git(['pull','--rebase','origin','main']);try{git(['push','origin','main']);pushed=true;break;}catch{}}
      if(!pushed)throw Error('Snapshot committed; push could not complete');
     }
     // A push can already have triggered Pages. A rejected redundant build request
     // is diagnostic; exact equality below still decides whether publication worked.
     try{execFileSync('gh',['api','--method','POST','repos/prosponky/prosponky.github.io/pages/builds'],{stdio:['ignore','pipe','pipe'],timeout:30000});}
     catch(e){return {buildRequestWarning:String(e.stderr||e.message).slice(-1000)};}
    }finally{await unlock();}
   }});
  await atomic(resolve(dir,'report.json'),report);await atomic(resolve('tmp/local-inventory-recovery/latest-report.json'),report);
  console.log(JSON.stringify(report));if(Object.values(report.stores).some(s=>s.status==='failed'))process.exitCode=1;
 }finally{await release();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main();
