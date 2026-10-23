export function retainHutchinsonPrices(incoming,previous){
 const data=structuredClone(incoming);if(previous?.source!==data.source)return data;const old=new Map(previous.vehicles.map(v=>[v.vin,v]));
 for(const row of data.vehicles){const prior=old.get(row.vin);if(!prior||prior.stockNumber!==row.stockNumber||prior.condition!==row.condition||prior.dealerListingUrl!==row.dealerListingUrl)continue;
  for(const [field,time,flag] of [['advertisedPrice','priceCheckedAt','priceRetained'],['msrp','msrpCheckedAt','msrpRetained']]){
   if(row[field]!==null)continue;const stamp=prior[time]||prior.checkedAt||previous.checkedAt;
   if(typeof prior[field]==='number'&&Number.isFinite(prior[field])&&prior[field]>0&&Number.isFinite(Date.parse(stamp))&&Date.parse(stamp)<=Date.parse(data.checkedAt)){row[field]=prior[field];row[time]=stamp;row[flag]=true;}
  }
 }return data;
}
