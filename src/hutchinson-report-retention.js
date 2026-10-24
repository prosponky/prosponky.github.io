import {verifiedCarfaxUrl} from './carfax.js';
// Keep prior reports only for the same vehicle/listing, with their original date.
export function retainHutchinsonReports(incoming,previous){
 const data=structuredClone(incoming);if(previous?.source!==data.source)return data;
 const old=new Map(previous.vehicles.map(v=>[v.vin,v]));
 for(const row of data.vehicles){if(row.condition!=='used')continue;const prior=old.get(row.vin),stamp=prior?.carfaxRetained?prior.carfaxCheckedAt:prior?.carfaxCheckedAt||previous.carfaxAuditAt;
  if(!prior||prior.condition!==row.condition||prior.stockNumber!==row.stockNumber||prior.dealerListingUrl!==row.dealerListingUrl||!Number.isFinite(Date.parse(stamp))||Date.parse(stamp)>Date.parse(data.checkedAt))continue;
  const link=verifiedCarfaxUrl(prior.carfaxUrl);if(link||prior.carfaxUrl===null){row.carfaxUrl=link;row.carfaxCheckedAt=stamp;row.carfaxRetained=true;}
 }
 data.carfaxAuditAt=previous.carfaxAuditAt||null;return data;
}

export function mergeHutchinsonReports(current,incoming){
 if(!current||current.source!==incoming.source)throw Error('Current inventory source missing or mismatched');
 const data=structuredClone(current),reports=new Map(incoming.vehicles.filter(v=>v.condition==='used').map(v=>[v.vin,v]));
 for(const row of data.vehicles){if(row.condition!=='used')continue;const report=reports.get(row.vin);
  if(!report||report.stockNumber!==row.stockNumber||report.dealerListingUrl!==row.dealerListingUrl||!Number.isFinite(Date.parse(report.carfaxCheckedAt))||report.carfaxUrl!==null&&!verifiedCarfaxUrl(report.carfaxUrl))throw Error('Report snapshot no longer covers current inventory');
  if(Date.parse(row.carfaxCheckedAt)>Date.parse(report.carfaxCheckedAt))continue;
  row.carfaxUrl=report.carfaxUrl;row.carfaxCheckedAt=report.carfaxCheckedAt;delete row.carfaxRetained;
 }
 data.carfaxAuditAt=[current.carfaxAuditAt,incoming.carfaxAuditAt].filter(Boolean).sort().at(-1);data.collectionStage='inventory-and-reports';return data;
}
