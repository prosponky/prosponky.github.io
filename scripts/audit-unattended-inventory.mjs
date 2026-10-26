import {validateHutchinsonFeed} from '../src/hutchinson-inventory.js';
import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {easternSlot,validateCogginSnapshot} from './local-inventory-recovery.mjs';
import {validateAutoNationFeed,validateAutoNationPromotions} from '../src/autonation-inventory.js';
import {verifiedCarfaxUrl} from '../src/carfax.js';

function validDate(value,now){const time=Date.parse(value);if(!Number.isFinite(time)||time>now)throw Error('Invalid verification date');return time;}
export function amountMetrics(values,retained={},dates={},checkedAt){
 let available=0,fresh=0,kept=0;
 for(const [vin,amount]of Object.entries(values||{})){
  if(amount===null)continue;
  if(!(typeof amount==='number'&&Number.isFinite(amount)&&amount>0))throw Error('Invalid official amount');
  const date=dates[vin]||checkedAt;validDate(date,Date.parse(checkedAt));
  if(retained[vin]===true&&!dates[vin])throw Error('Retained amount lacks original verification date');
  available++;if(retained[vin]===true)kept++;else fresh++;
 }
 return {availableAmounts:available,freshAmounts:fresh,retainedAmounts:kept};
}
function validateGreenway(data,reports,config,now){
 validDate(data.checkedAt,now);
 const entries=Object.entries(data.prices||{});
 if(data.source!==config.origin||data.adapter!==config.adapter||data.total<1||entries.length!==data.total||!Array.isArray(data.sections)||config.sections.some(s=>!data.sections.includes(s.condition)))throw Error('Incomplete official Greenway map');
 const stocks=new Set();let used=0;
 for(const [vin,row]of entries){
  const url=new URL(row.url);if(!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)||stocks.has(row.stockNumber)||!row.stockNumber||url.origin!==config.origin||!url.pathname.startsWith('/inventory/')||!url.pathname.toUpperCase().endsWith('-'+vin+'/')||!['new','used'].includes(row.condition)||typeof row.interiorColor!=='string')throw Error('Invalid official Greenway identity or fields');
  stocks.add(row.stockNumber);for(const name of ['price','msrp'])if(row[name]!==null&&!(Number.isFinite(row[name])&&row[name]>0))throw Error('Invalid official Greenway price');
  if(row.condition==='used')used++;
 }
 if(!data.carfax||!reports||JSON.stringify(data.carfax)!==JSON.stringify(reports)||reports.source!==config.origin||reports.total!==used||Object.keys(reports.reports||{}).length!==used)throw Error('Greenway price and Carfax maps do not reconcile');
 validDate(reports.checkedAt,now);
 for(const [vin,row]of Object.entries(reports.reports)){const vehicle=data.prices[vin];if(vehicle?.condition!=='used'||vehicle.stockNumber!==row.stockNumber||vehicle.url!==row.listingUrl||typeof row.interiorColor!=='string'||row.url!==null&&!verifiedCarfaxUrl(row.url))throw Error('Invalid Greenway dealer report evidence');}
 return {total:entries.length,interiorColors:entries.filter(([,r])=>r.interiorColor.trim()).length,verifiedAmounts:entries.filter(([,r])=>r.price>0).length,retainedAmounts:entries.filter(([,r])=>r.priceRetained===true).length,carfaxReports:Object.values(reports.reports).filter(r=>r.url).length};
}

export function auditOfficialMaps(registry,maps,{now=Date.now(),slotStartedAt=easternSlot(new Date(now)),errors={}}={}){
 const report={checkedAt:new Date(now).toISOString(),slotStartedAt,scope:'all-official-store-maps',stores:{},allCurrent:false,scheduledEndToEndProven:false};
 for(const [key,config]of Object.entries(registry)){
  const file=config.priceFile||'autonation-jacksonville.json',data=maps[file];
  try{
   if(errors[file])throw Error(errors[file]);if(!data)throw Error('Live map unavailable');validDate(data.checkedAt,now);
   let metrics;
   if(key==='greenway')metrics=validateGreenway(data,maps['greenway-carfax.json'],config,now);
   else if(config.adapter==='dealer-com-public-html'){
    // Structural verification is separate from freshness. Old valid maps are
    // retained evidence, not invalidated solely because their amounts are old.
    validateCogginSnapshot(data,config,data.checkedAt,Date.parse(data.checkedAt));
    metrics={total:data.total,interiorColors:Object.values(data.interiorColors).filter(v=>v.trim()).length,verifiedAmounts:Object.values(data.retailPrices).filter(v=>v>0).length,...amountMetrics(data.retailPrices,data.priceRetained,data.priceCheckedAt,data.checkedAt),msrp:amountMetrics(data.msrps,data.msrpRetained,data.msrpCheckedAt,data.checkedAt),officialMsrpMapPresent:!!data.msrps,carfaxReports:Object.values(data.carfax).filter(Boolean).length};
   }else if(key==='autonation-jacksonville'){
    validateAutoNationFeed(data,config);validDate(data.listRecheckedAt,now);
    if(data.scope!=='physical'||data.vehicles.length>data.advertisedTotal||Date.parse(data.listRecheckedAt)>Date.parse(data.checkedAt))throw Error('AutoNation physical scope or final listing reconciliation is incomplete');
    validateAutoNationPromotions(data,{allowLegacy:true});
    for(const row of data.vehicles)if(row.interiorColor!==undefined&&typeof row.interiorColor!=='string'||typeof row.color!=='string'||row.carfaxUrl!==null&&!verifiedCarfaxUrl(row.carfaxUrl))throw Error('AutoNation vehicle color/report fields are invalid');
    metrics={total:data.vehicles.length,advertisedChecked:data.advertisedTotal,interiorColors:data.vehicles.filter(v=>typeof v.interiorColor==='string'&&v.interiorColor.trim()).length,missingInteriorFields:data.vehicles.filter(v=>v.interiorColor===undefined).length,verifiedAmounts:data.vehicles.filter(v=>v.advertisedPrice>0).length,retainedAmounts:data.vehicles.filter(v=>v.priceRetained===true).length,carfaxReports:data.vehicles.filter(v=>v.carfaxUrl).length};
   }else if(config.adapter==='hutchinson-browser'){
    validateHutchinsonFeed(data,config);if(data.carfaxAuditAt)validDate(data.carfaxAuditAt,now);
    for(const row of data.vehicles){if(row.carfaxCheckedAt)validDate(row.carfaxCheckedAt,now);if(row.carfaxUrl!==null&&!verifiedCarfaxUrl(row.carfaxUrl))throw Error('Invalid Hutchinson dealer report');for(const [field,date,retained]of [['advertisedPrice','priceCheckedAt','priceRetained'],['msrp','msrpCheckedAt','msrpRetained']])if(row[field]>0&&row[retained]===true)validDate(row[date],Date.parse(data.checkedAt));}
    metrics={total:data.total,interiorColors:data.vehicles.filter(v=>v.interiorColor.trim()).length,verifiedAmounts:data.vehicles.filter(v=>(v.condition==='new'?v.msrp:v.advertisedPrice)>0).length,retainedAmounts:data.vehicles.filter(v=>v.condition==='new'?v.msrpRetained===true:v.priceRetained===true).length,carfaxReports:data.vehicles.filter(v=>v.carfaxUrl).length,carfaxAuditAt:data.carfaxAuditAt||null,retainedCarfaxReports:data.vehicles.filter(v=>v.carfaxRetained===true).length,carfaxCurrent:!!data.carfaxAuditAt&&Number.isFinite(Date.parse(data.carfaxAuditAt))&&Date.parse(data.carfaxAuditAt)<=now&&Date.parse(data.carfaxAuditAt)>=Date.parse(slotStartedAt)&&data.vehicles.filter(v=>v.condition==='used').every(v=>Number.isFinite(Date.parse(v.carfaxCheckedAt))&&Date.parse(v.carfaxCheckedAt)>=Date.parse(slotStartedAt)&&Date.parse(v.carfaxCheckedAt)<=now)};
   }else throw Error('Unregistered official map adapter');
   const current=Date.parse(data.checkedAt)>=Date.parse(slotStartedAt);
   report.stores[key]={status:current?(metrics.missingInteriorFields?'incomplete-current-fields':'verified-in-current-slot'):'retained-earlier-verification',checkedAt:data.checkedAt,...metrics};
  }catch(e){report.stores[key]={status:'unverified-live-evidence',reason:e.message};}
 }
 report.allCurrent=Object.keys(report.stores).length===Object.keys(registry).length&&Object.values(report.stores).every(s=>s.status==='verified-in-current-slot'&&s.carfaxCurrent!==false);
 // Map freshness alone cannot establish which trigger ran or whether anyone
 // intervened. Scheduled execution must be proved from independent run evidence.
 return report;
}

async function main(){
 const root=fileURLToPath(new URL('..',import.meta.url));
 const registry=JSON.parse(await readFile(resolve(root,'data/dealership-sources.json'),'utf8'));
 const files=[...Object.values(registry).map(c=>c.priceFile||'autonation-jacksonville.json'),'greenway-carfax.json'];
 const maps={},errors={};
 await Promise.all(files.map(async file=>{try{const response=await fetch('https://prosponky.github.io/inventory/'+file+'?audit='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Live map HTTP '+response.status);maps[file]=await response.json();}catch(e){errors[file]=e.message;}}));
 const report=auditOfficialMaps(registry,maps,{errors});
 const dir=resolve(root,'tmp/unattended-audit');await mkdir(dir,{recursive:true});
 const save=async path=>{await writeFile(path+'.tmp',JSON.stringify(report,null,2));await rename(path+'.tmp',path);};
 await save(resolve(dir,report.checkedAt.replaceAll(':','-')+'.json'));await save(resolve(dir,'latest-report.json'));
 console.log(JSON.stringify(report));if(!report.allCurrent)process.exitCode=2;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main();
