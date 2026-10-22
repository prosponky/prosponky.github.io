import {verifiedCarfaxUrl} from './carfax.js';

export function retainHutchinsonCarfax(feed,previous){
 const old=new Map((previous?.vehicles||[]).map(v=>[v.vin,v]));
 return {...feed,vehicles:feed.vehicles.map(row=>{
  const prior=old.get(row.vin);
  return row.condition==='used'&&!row.carfaxUrl&&prior?.dealerListingUrl===row.dealerListingUrl&&verifiedCarfaxUrl(prior.carfaxUrl)?{...row,carfaxUrl:prior.carfaxUrl,carfaxCheckedAt:prior.carfaxCheckedAt}:row;
 })};
}

export function applyHutchinsonCarfax(feed,key,checkpoint){
 const used=feed.vehicles.filter(v=>v.condition==='used');
 const queue=checkpoint.queue?.filter(v=>v.store===key);
 if(!queue||checkpoint.index!==checkpoint.queue.length||queue.length!==used.length||new Set(queue.map(v=>v.vin)).size!==used.length)throw Error('Incomplete Carfax audit');
 const byVin=new Map(queue.map(v=>[v.vin,v]));
 return {...feed,carfaxAuditAt:checkpoint.finishedAt||checkpoint.reports[`${key}|${used.at(-1)?.vin}`]?.checkedAt,vehicles:feed.vehicles.map(row=>{
  if(row.condition!=='used')return row;
  const item=byVin.get(row.vin),report=checkpoint.reports?.[`${key}|${row.vin}`];
  if(!item||item.url!==row.dealerListingUrl||report?.vin!==row.vin||report.listingUrl!==item.url||!Number.isFinite(Date.parse(report.checkedAt)))throw Error('Carfax identity mismatch');
  const url=report.url===null?null:verifiedCarfaxUrl(report.url);
  if(report.url!==null&&!url)throw Error('Invalid Carfax report');
  return {...row,carfaxUrl:url,carfaxCheckedAt:report.checkedAt};
 })};
}
