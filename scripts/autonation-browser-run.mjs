import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {autoNationBrowserBatch} from './autonation-browser-batch.mjs';
import {autoNationVehicle,validateAutoNationFeed} from '../src/autonation-inventory.js';
import {inventoryChanges} from '../src/inventory-changes.js';
const root=fileURLToPath(new URL('../',import.meta.url));
async function save(path,data){await mkdir(resolve(root,'tmp'),{recursive:true});await writeFile(path+'.tmp',JSON.stringify(data,null,2));await rename(path+'.tmp',path);}
export async function createAutoNationRun({scope='physical'}={}){
 const config=JSON.parse(await readFile(resolve(root,'data/dealership-sources.json'),'utf8'))['autonation-jacksonville'];
 if(config?.adapter!=='autonation-browser'||!['physical','advertised'].includes(scope))throw Error('Invalid AutoNation browser configuration.');
 const base=resolve(root,'tmp','autonation-'+new Date().toISOString().replaceAll(':','-'));
 const run={config,scope,checkpoint:base+'-checkpoint.json',snapshot:base+'-snapshot.json',health:resolve(root,'tmp/inventory-health-autonation-jacksonville.json')};
 await save(run.checkpoint,{phase:'list',startedAt:new Date().toISOString(),cards:[],evidence:[],detailCount:0});return run;
}
export async function finalizeAutoNationRun(state,run){
 const age=Date.now()-Date.parse(state.startedAt);
 if(state.phase!=='done'||age<0||age>7200000||!state.listRecheckedAt||state.cards.length!==state.total||state.evidence.length!==state.total||state.detailCount!==state.total||state.resultsTotal!==state.total+state.promotionalTileCount)throw Error('Incomplete or stale AutoNation collection.');
 const all=state.evidence.map(e=>autoNationVehicle(e,run.config,state.startedAt));
 if(new Set(all.map(v=>v.vin)).size!==all.length||state.cards.some((card,i)=>card.vin!==all[i].vin))throw Error('Missing or duplicate AutoNation VIN detail evidence.');
 const vehicles=run.scope==='physical'?all.filter(v=>v.physicalStoreId===run.config.storeId):all;
 let previous;try{previous=JSON.parse(await readFile(resolve(root,'public/inventory/autonation-jacksonville.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 for(const row of vehicles)if(row.advertisedPrice===null){const prior=previous?.vehicles?.find(v=>v.vin===row.vin&&v.stockNumber===row.stockNumber);if(prior?.advertisedPrice>0&&Number.isFinite(prior.advertisedPrice)){row.advertisedPrice=prior.advertisedPrice;row.priceCheckedAt=prior.priceCheckedAt||prior.checkedAt;row.priceRetained=true;}}
 const data=validateAutoNationFeed({source:run.config.origin,storeLabel:run.config.store,storeId:run.config.storeId,scope:run.scope,complete:true,checkedAt:new Date().toISOString(),listRecheckedAt:state.listRecheckedAt,advertisedTotal:state.total,resultsTotal:state.resultsTotal,promotionalTileCount:state.promotionalTileCount,detailCount:state.detailCount,vehicles},run.config);
 data.dailyChanges=inventoryChanges(previous,vehicles,data.checkedAt);await save(run.snapshot,data);return data;
}
export async function runAutoNationBatch(tab,run,options={}){
 const state=JSON.parse(await readFile(run.checkpoint,'utf8'));
 try{const result=await autoNationBrowserBatch(tab,state,run.config,options);await save(run.checkpoint,state);
 if(state.phase==='done')await finalizeAutoNationRun(state,run);
 await save(run.health,{status:state.phase==='done'?'verified':'collecting',updatedAt:new Date().toISOString(),...result,checkpoint:run.checkpoint,snapshot:state.phase==='done'?run.snapshot:null});
 return {...result,done:state.phase==='done',snapshot:state.phase==='done'?run.snapshot:null};
 }catch(e){await save(run.checkpoint,state);await save(run.health,{status:'failed',reason:e.message,checkpoint:run.checkpoint});throw e;}
}
