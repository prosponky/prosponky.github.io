import {readFile,writeFile} from 'node:fs/promises';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';
import {buildHutchinsonSnapshot} from '../src/hutchinson-inventory.js';import {verifiedCarfaxUrl} from '../src/carfax.js';
export function finalizeHutchinsonRun(state,config,now=Date.now()){
 if(state.phase!=='done'||now-Date.parse(state.startedAt)>7200000||Date.parse(state.startedAt)>now||!Number.isFinite(Date.parse(state.startedAt))||!Number.isFinite(Date.parse(state.finishedAt))||Date.parse(state.finishedAt)>now)throw Error('Incomplete or expired Hutchinson run');
 const key=config.key,legacy={startedAt:state.startedAt,finishedAt:state.inventoryFinishedAt||state.finishedAt,stores:{[key]:{sectionIndex:state.sectionIndex,pages:state.pages}},details:{[key]:state.details},finalChecks:{[key]:state.finalChecks}};
 const data=buildHutchinsonSnapshot(legacy,key,config),used=data.vehicles.filter(v=>v.condition==='used');
 if(state.detailIndex!==used.length||state.detailQueue.length!==used.length||Object.keys(state.reports).length!==used.length)throw Error('Incomplete Hutchinson report coverage');
 data.vehicles=data.vehicles.map(row=>{
  if(!state.details[row.dealerListingUrl])throw Error('Missing listing color detail');if(row.condition!=='used')return row;
  const item=state.detailQueue.find(v=>v.vin===row.vin),report=state.reports[row.vin];if(item?.url!==row.dealerListingUrl||report?.url!==row.dealerListingUrl||!report.body.toUpperCase().includes(row.vin)||/access denied|verify you are human|security challenge/i.test(report.body)||!Number.isFinite(Date.parse(report.checkedAt))||Date.parse(report.checkedAt)>now)throw Error('Hutchinson report identity mismatch');
  const links=[...new Set(report.hrefs.map(verifiedCarfaxUrl).filter(Boolean))];if(links.length>1)throw Error('Conflicting Hutchinson Carfax reports');return {...row,carfaxUrl:links[0]||null,carfaxCheckedAt:report.checkedAt};
 });data.carfaxAuditAt=state.finishedAt;return data;
}

export function finalizeHutchinsonInventory(state,config,now=Date.now()){
 const finished=Date.parse(state.inventoryFinishedAt),started=Date.parse(state.startedAt);
 if(!['inventory-ready','details','confirm','done'].includes(state.phase)||!Number.isFinite(started)||!Number.isFinite(finished)||started>finished||finished>now||now-started>7200000||state.inventoryConfirmIndex!==2)throw Error('Incomplete or expired inventory stage');
 const key=config.key,data=buildHutchinsonSnapshot({startedAt:state.startedAt,finishedAt:state.inventoryFinishedAt,stores:{[key]:{sectionIndex:state.sectionIndex,pages:state.pages}},details:{[key]:state.details},finalChecks:{[key]:state.inventoryFinalChecks}},key,config);
 for(const row of data.vehicles){if(!state.details[row.dealerListingUrl])throw Error('Missing listing color detail');row.carfaxUrl=null;row.carfaxCheckedAt=null;}
 return {...data,collectionStage:'inventory',carfaxAuditAt:null};
}

async function main(){const input=process.argv[2];if(!input)throw Error('Supply a completed Hutchinson evidence file');const state=JSON.parse(await readFile(input,'utf8')),registry=JSON.parse(await readFile('data/dealership-sources.json','utf8')),config=registry['hutchinson-'+state.store];if(config?.adapter!=='hutchinson-browser'||state.source!==config.origin)throw Error('Unregistered Hutchinson evidence');const data=process.argv.includes('--inventory-only')?finalizeHutchinsonInventory(state,config):finalizeHutchinsonRun(state,config),output=input.replace(/-evidence\.json$/,'-snapshot.json');if(output===input)throw Error('Use an -evidence.json filename');await writeFile(output,JSON.stringify(data));console.log(JSON.stringify({snapshot:output,total:data.total,complete:true}));}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main();
