import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {shouldCollectStickers} from './sticker-queue.mjs';
import {stickerQueue} from './sticker-queue.mjs';
// Noon never repeats sticker work. Explicit manual runs are separate from scheduled evidence.
if(!shouldCollectStickers({manual:process.argv.includes('--manual'),schedule:process.env.STICKER_SCHEDULE||''})){
 console.log('Outside 7 a.m. Eastern sticker window; inventory refresh remains independent.');
 process.exit(0);
}
const registry=JSON.parse(await readFile(new URL('../data/dealership-sources.json',import.meta.url),'utf8'));
const report={startedAt:new Date().toISOString(),trigger:process.argv.includes('--manual')?'manual':'morning',stores:{}};
for(const store of Object.keys(registry)){
 const deadline=Date.now()+180000;
 const feed=JSON.parse(await readFile(`public/inventory/${store}.json`,'utf8'));
 let batches=0,result;
 do{
 // Individual processes checkpoint every VIN. A bounded deadline leaves remaining work resumable.
 result=spawnSync(process.execPath,['scripts/collect-window-stickers.mjs','--store',store,'--limit','5'],{encoding:'utf8',timeout:180000,env:process.env});batches++;
 report.stores[store]={success:result.status===0,output:result.stdout||'',error:result.error?.message||result.stderr||''};
 console.log(store,result.stdout||result.error?.message||result.stderr);
 // A denied host needs the supported browser fallback, not hundreds of identical failed requests.
 if(result.status!==0||/HTTP 403|HTTP 429|Security challenge/.test(result.stdout||''))break;
 const map=JSON.parse(await readFile(`public/inventory/${store}-stickers.json`,'utf8'));
 if(!stickerQueue(feed.vehicles,map.records).length)break;
 }while(Date.now()<deadline);
 const map=JSON.parse(await readFile(`public/inventory/${store}-stickers.json`,'utf8'));
 const counts={};for(const v of feed.vehicles){const status=map.records[v.vin]?.status||'unchecked';counts[status]=(counts[status]||0)+1;}
 report.stores[store].batches=batches;report.stores[store].coverage=counts;
 report.stores[store].browserRequired=/HTTP 403|HTTP 429|Security challenge/.test(result.stdout||'');
}
report.finishedAt=new Date().toISOString();
await mkdir('tmp',{recursive:true});await writeFile('tmp/sticker-refresh-latest.json',JSON.stringify(report,null,2));
if(Object.values(report.stores).some(r=>!r.success||r.browserRequired))process.exitCode=1;
