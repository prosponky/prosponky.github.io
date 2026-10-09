import {mkdir,copyFile} from 'node:fs/promises';
import {readJson,saveJson,reserveSticker,easternDay} from './sticker-policy.mjs';
const registry=await readJson('data/dealership-sources.json'),vehicles=[],records={};
await mkdir('tmp',{recursive:true});
for(const [store,config] of Object.entries(registry)){
 const feed=await readJson(`public/inventory/${store}.json`),cache=await readJson(`public/inventory/${store}-stickers.json`),official=await readJson(`public/inventory/${config.priceFile}`),links=config.account?official:await readJson('public/inventory/dealer-links.json'),reports=config.account?official:await readJson('public/inventory/greenway-carfax.json');
 const active=new Set(official?.inventoryVins||Object.keys(official?.prices||{}));
 for(const v of feed.vehicles.filter(v=>!active.size||active.has(v.vin))){const key=store+':'+v.vin;vehicles.push({key,store,vin:v.vin,stockNumber:v.stockNumber,listingUrl:config.account?links?.stocks?.[v.stockNumber]:official?.prices?.[v.vin]?.url||links?.links?.[v.vin],reportUrl:config.account?reports?.carfax?.[v.vin]:reports?.reports?.[v.vin]?.url});records[key]=cache?.records?.[v.vin];}
}
const path='public/inventory/sticker-collection.json';let ledger=await readJson(path);
if(!ledger){ledger={version:1,createdAt:new Date().toISOString(),seen:Object.fromEntries(vehicles.map(v=>[v.key,{firstSeen:new Date().toISOString(),baseline:true}])),attempts:Object.entries(records).filter(([,r])=>r?.checkedAt).map(([key,r])=>({key,day:easternDay(new Date(r.checkedAt)),at:r.checkedAt}))};}
// Archive superseded bulk queues once; do not resume their pending backlog.
for(const store of Object.keys(registry)){
 const file=`tmp/${store}-sticker-browser.json`,q=await readJson(file);
 if(q&&!q.policy){await copyFile(file,file+'.bulk-archive');await saveJson(file,{source:registry[store].origin,store,policy:'five-per-day',index:0,done:true,vehicles:[],results:{}});}
}
const unfinished=[];
for(const store of Object.keys(registry)){const q=await readJson(`tmp/${store}-sticker-browser.json`);if(q?.blocked){console.log('Collection stopped at an access challenge; no automatic retry:',store);process.exit(0);}if(q?.policy&&(!q.done||Object.values(q.results).some(r=>!r.processedAt&&(r.status==='no-link'||r.discoveries?.length))))unfinished.push(store);}
if(unfinished.length){console.log('Resume reserved vehicle only:',unfinished.join(', '));process.exit(0);}
const next=reserveSticker(ledger,vehicles,records);
await saveJson(path,ledger);
if(!next){console.log('No eligible sticker slot: daily cap, two-hour spacing, or empty queue.');process.exit(0);}
await saveJson(`tmp/${next.store}-sticker-browser.json`,{source:registry[next.store].origin,store:next.store,policy:'five-per-day',startedAt:new Date().toISOString(),index:0,done:false,vehicles:[next],results:{}});
console.log('Reserved one vehicle:',next.store,next.stockNumber,'Daily attempts:',ledger.attempts.filter(a=>a.day===easternDay()).length);


