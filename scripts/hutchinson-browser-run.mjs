import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';import {fileURLToPath} from 'node:url';
const {hutchinsonBrowserBatch}=await import(new URL('./hutchinson-browser-batch.mjs',import.meta.url).href+'?fresh='+Date.now());

const root=fileURLToPath(new URL('..',import.meta.url));
async function save(path,value){await mkdir(dirname(path),{recursive:true});await writeFile(path+'.tmp',JSON.stringify(value));await rename(path+'.tmp',path);}
export async function createHutchinsonRun(key,{directory=resolve(root,'tmp')}={}){
 const config=JSON.parse(await readFile(resolve(root,'data/dealership-sources.json'),'utf8'))['hutchinson-'+key];if(config?.adapter!=='hutchinson-browser'||config.key!==key)throw Error('Unknown Hutchinson store');
 const base=resolve(directory,'hutchinson-'+key+'-'+new Date().toISOString().replaceAll(':','-')),run={config,checkpoint:base+'-checkpoint.json',snapshot:base+'-snapshot.json',evidence:base+'-evidence.json',health:resolve(directory,'inventory-health-hutchinson-'+key+'.json')};
 await save(run.checkpoint,{store:key,source:config.origin,startedAt:new Date().toISOString(),phase:'list',sectionIndex:0,nextUrl:new URL(config.sections[0].path,config.origin).href,pages:[],details:{},detailQueue:[],detailIndex:0,reports:{},confirmIndex:0,finalChecks:[]});await save(base+'-run.json',run);return run;
}
export async function runHutchinsonBatch(tab,run,options={}){
 const state=JSON.parse(await readFile(run.checkpoint,'utf8'));if(state.source!==run.config.origin||Date.now()-Date.parse(state.startedAt)>7200000)throw Error('Expired or mismatched Hutchinson checkpoint');
 try{const progress=await hutchinsonBrowserBatch(tab,state,run.config,{...options,onCheckpoint:async s=>save(run.checkpoint,s)});if(progress.done)await save(run.evidence,state);await save(run.health,{status:progress.done?'evidence-complete':'collecting',updatedAt:new Date().toISOString(),...progress,checkpoint:run.checkpoint,snapshot:progress.done?run.snapshot:null});return {...progress,evidence:progress.done?run.evidence:null,snapshot:null};}
 catch(error){await save(run.checkpoint,state);await save(run.health,{status:'failed',updatedAt:new Date().toISOString(),reason:error.message,checkpoint:run.checkpoint});throw error;}
}
