import {verifiedCarfaxUrl} from './carfax.js';
import {hutchinsonModelFields} from './hutchinson-model.js';
const amount=s=>s?Number(s.replace(/[$,]/g,'')):null;
const field=(text,name)=>text.match(new RegExp('(?:^|\\n)'+name+'\\s*:[ \\t]*([^\\n]*)','i'))?.[1]?.trim()||'';
export function hutchinsonCard(card,detail,extra,config,checkedAt){
 const text=card.text,title=text.match(/(?:^|\n)(?:Certified Pre-Owned|Pre-Owned|New)\s+(\d{4})\s*\n([^\n]+)/i);if(!title)throw Error('Missing vehicle title');
 const url=new URL(card.url);if(url.origin!==config.origin||!url.pathname.startsWith('/inventory/'))throw Error('Foreign vehicle listing');
 const vin=(field(text,'VIN')||url.pathname.match(/-([a-z0-9]+)\/$/i)?.[1]||'').toUpperCase(),year=+title[1];
 if(!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)&&!(year<1981&&/^[A-Z0-9]{5,16}$/.test(vin)))throw Error('Invalid vehicle identity');
 if(!url.pathname.toUpperCase().endsWith('-'+vin+'/'))throw Error('VIN and link disagree');
 const prices=[...text.matchAll(/(?:^|\n)Hutchinson Price\s*\n\s*(\$[\d,]+(?:\.\d{2})?)/gi)],msrp=amount(text.match(/(?:^|\n)MSRP\s*\n\s*(\$[\d,]+(?:\.\d{2})?)/i)?.[1]),advertisedPrice=amount(prices.at(-1)?.[1]);
 const stockNumber=field(text,'STOCK'),condition=/\/new-/i.test(url.pathname)?'new':'used',titleText=title[2].trim(),makeMatch=titleText.match(/^(Land Rover|Alfa Romeo|Mercedes-Benz|[\w-]+)\s+(.+)$/i);if(!makeMatch)throw Error('Missing make/model');
 const details=detail?.text||extra?.text||'',mileage=field(details,'MILEAGE').replaceAll(',','');
 return {stockNumber,vin,vinOnlyIdentifier:!stockNumber,condition,year,...hutchinsonModelFields(makeMatch[1],makeMatch[2]),vehicleTitle:year+' '+titleText,certified:/Certified Pre-Owned/i.test(text),msrp,advertisedPrice,priceLabel:'Hutchinson Price',priceIncludesDealerFees:true,interiorColor:field(details,'INTERIOR'),exteriorColor:field(details,'EXTERIOR'),mileage:/^\d+$/.test(mileage)?+mileage:null,dealerLocation:field(details,'LOCATION'),dealerListingUrl:url.href,sourceUrl:url.href,carfaxUrl:verifiedCarfaxUrl(card.carfax||detail?.carfax||extra?.carfax?.[0]),checkedAt};
}
export function validateHutchinsonFeed(data,config){
 if(data.complete!==true||data.source!==config.origin||!Number.isFinite(Date.parse(data.checkedAt))||Date.parse(data.checkedAt)>Date.now()||!Array.isArray(data.vehicles)||data.total!==data.vehicles.length||!data.total||new Set(data.vehicles.map(v=>v.vin)).size!==data.total)throw Error('Incomplete Hutchinson inventory');
 for(const row of data.vehicles){const url=new URL(row.sourceUrl);if(url.origin!==config.origin||!url.pathname.toUpperCase().endsWith('-'+row.vin+'/'))throw Error('Invalid Hutchinson VIN listing');for(const p of ['msrp','advertisedPrice'])if(row[p]!==null&&!(typeof row[p]==='number'&&Number.isFinite(row[p])&&row[p]>0))throw Error('Invalid Hutchinson price');if(typeof row.interiorColor!=='string'||typeof row.exteriorColor!=='string'||!['new','used'].includes(row.condition))throw Error('Invalid Hutchinson fields');}return data;
}
export function buildHutchinsonSnapshot(run,key,config){
 const store=run.stores[key];if(store.sectionIndex!==2)throw Error('Incomplete sections');const rows=[],sections=[];
 const readSection=(source,condition,checks,details)=>{
  const pages=source.filter(p=>p.condition===condition).sort((a,b)=>a.page-b.page),count=headings=>Number(headings?.find(h=>/^\d+\s+(New|Pre-Owned|Used)/i.test(h))?.match(/^([\d,]+)/)?.[1]?.replaceAll(',',''));
  const totals=pages.map(p=>count(p.heading)),final=count(checks?.find(s=>s.condition===condition)?.headings);
  if(!pages.length||pages.length!==pages[0].lastPage||pages.some((p,i)=>p.page!==i+1||p.lastPage!==pages.length)||new Set(totals).size!==1||totals[0]!==final||pages.reduce((n,p)=>n+p.cards.length,0)!==totals[0])throw Error('Pagination/count changed');
  const observed=pages.flatMap(page=>page.cards.map(card=>hutchinsonCard(card,details?.[card.url],run.extra?.[card.url],config,run.finishedAt))),unique=new Map();
  for(const row of observed){const previous=unique.get(row.vin);if(previous&&JSON.stringify(previous)!==JSON.stringify(row))throw Error('Duplicate Hutchinson listing changed identity or price');unique.set(row.vin,row);}
  return {observed,unique,listedTotal:totals[0]};
 };
 for(const condition of ['new','used']){
  const first=readSection(store.pages,condition,run.finalChecks?.[key],run.details?.[key]);
  if(first.unique.size!==first.listedTotal||run.duplicateConfirmation?.[key]){
   const second=run.duplicateConfirmation?.[key];if(second?.phase!=='inventory-ready'||second.sectionIndex!==2||second.inventoryConfirmIndex!==2||second.startedAt!==run.startedAt||second.source!==config.origin||!Number.isFinite(Date.parse(second.inventoryFinishedAt))||Date.parse(second.inventoryFinishedAt)<Date.parse(run.startedAt)||Date.parse(second.inventoryFinishedAt)>Date.parse(run.finishedAt))throw Error('Duplicate listings require a complete stable confirmation pass');
   const confirmed=readSection(second.pages,condition,second.inventoryFinalChecks,second.details);
   if(confirmed.listedTotal!==first.listedTotal||confirmed.unique.size!==first.unique.size||[...first.unique].some(([vin,row])=>JSON.stringify(row)!==JSON.stringify(confirmed.unique.get(vin))))throw Error('Duplicate confirmation changed vehicle set or prices');
  }
  sections.push({condition,total:first.unique.size,...(first.unique.size!==first.listedTotal?{listedTotal:first.listedTotal,duplicateListings:first.listedTotal-first.unique.size}:{})});rows.push(...first.unique.values());
 }
 const data={checkedAt:run.finishedAt,startedAt:run.startedAt,source:config.origin,complete:true,scope:'advertised-on-dealer-site',sections,total:rows.length,vehicles:rows};return validateHutchinsonFeed(data,config);
}
