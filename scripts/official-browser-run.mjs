import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {collectBrowserBatch} from './browser-inventory.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
async function save(path,value){await mkdir(resolve(root,'tmp'),{recursive:true});await writeFile(path+'.tmp',JSON.stringify(value));await rename(path+'.tmp',path);}
export async function createBrowserRun(store){
 const registry=JSON.parse(await readFile(resolve(root,'data/dealership-sources.json'),'utf8')),config=registry[store];
 if(config?.adapter!=='dealer-inspire-browser')throw Error('Store does not use the registered browser adapter');
 const id=new Date().toISOString().replaceAll(':','-');
 const base=resolve(root,'tmp',store+'-official-'+id);
 return {store,config,checkpoint:base+'-checkpoint.json',snapshot:base+'-snapshot.json',health:resolve(root,'tmp','inventory-health-'+store+'.json')};
}
export async function runBrowserBatch(tab,run,{maxPages=3}={}){
 let checkpoint;try{checkpoint=JSON.parse(await readFile(run.checkpoint,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
 try{
  const result=await collectBrowserBatch(tab,run.config,{checkpoint,maxPages,onCheckpoint:async(state,progress)=>{await save(run.checkpoint,state);await save(run.health,{status:'collecting',store:run.store,updatedAt:new Date().toISOString(),...progress,checkpoint:run.checkpoint});}});
  if(result.done){await save(run.snapshot,result.snapshot);await save(run.health,{status:'verified',store:run.store,updatedAt:new Date().toISOString(),total:result.snapshot.total,snapshot:run.snapshot});}
  return {done:result.done,snapshot:result.done?run.snapshot:null,checkpoint:run.checkpoint};
 }catch(error){await save(run.health,{status:'failed',store:run.store,updatedAt:new Date().toISOString(),reason:error.message,checkpoint:run.checkpoint});throw error;}
}
