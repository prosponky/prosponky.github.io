import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {stickerQueue} from './sticker-queue.mjs';
const registry=JSON.parse(await readFile('data/dealership-sources.json','utf8'));
const read=async path=>{try{return JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}};
await mkdir('tmp',{recursive:true});
for(const [store,config] of Object.entries(registry)){
 const feed=await read(`public/inventory/${store}.json`),cache=await read(`public/inventory/${store}-stickers.json`);
 const official=await read(`public/inventory/${config.priceFile}`),links=config.account?official:await read('public/inventory/dealer-links.json');
 const reports=config.account?official:await read('public/inventory/greenway-carfax.json');
 const active=new Set(official?.inventoryVins||Object.keys(official?.prices||{}));
 const records={...cache?.records};
 // HTTP failures are eligible for the browser immediately, without aging valid evidence.
 for(const [vin,row] of Object.entries(records))if(row.status==='unverified')delete records[vin];
 const vehicles=stickerQueue(feed.vehicles.filter(v=>!active.size||active.has(v.vin)),records)
 .map(v=>({vin:v.vin,stockNumber:v.stockNumber,listingUrl:config.account?links?.stocks?.[v.stockNumber]:official?.prices?.[v.vin]?.url||links?.links?.[v.vin],reportUrl:config.account?reports?.carfax?.[v.vin]:reports?.reports?.[v.vin]?.url}));
 const path=`tmp/${store}-sticker-browser.json`;
 // Never reset an in-progress queue: its durable VIN results are authoritative.
 const previous=await read(path);
 if(previous&&!previous.done){
  if(previous.source!==config.origin)throw Error('Checkpoint source changed');
  const known=new Set(previous.vehicles.map(v=>v.vin)),added=vehicles.filter(v=>!known.has(v.vin));
  const fresh=new Map(vehicles.map(v=>[v.vin,v]));
  previous.vehicles=previous.vehicles.map(v=>fresh.has(v.vin)?{...v,...fresh.get(v.vin)}:v);
  const completed=previous.vehicles.slice(0,previous.index),pending=previous.vehicles.slice(previous.index);
  const retry=completed.filter(v=>previous.results[v.vin]?.pages?.length===0&&(v.listingUrl||v.reportUrl));
  if(retry.length){const vins=new Set(retry.map(v=>v.vin));previous.vehicles=[...completed.filter(v=>!vins.has(v.vin)),...retry,...pending];previous.index-=retry.length;for(const vin of vins)delete previous.results[vin];}
  previous.vehicles.splice(previous.index,0,...added);
  const {rename}=await import('node:fs/promises');await writeFile(path+'.tmp',JSON.stringify(previous));await rename(path+'.tmp',path);
  console.log(store,'resume',previous.index,'/',previous.vehicles.length,'new',added.length);continue;
 }
 await writeFile(path,JSON.stringify({source:config.origin,store,startedAt:new Date().toISOString(),index:0,done:false,vehicles,results:{}}));
 console.log(store,vehicles.length,'queued');
}
