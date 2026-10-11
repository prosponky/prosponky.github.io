const positive=value=>typeof value==='number'&&Number.isFinite(value)&&value>0;
const evidenceTime=(value,latest)=>Number.isFinite(Date.parse(value))&&Date.parse(value)<=Date.parse(latest)?value:null;
function amountEvidence(value,retained,originalTime,priorValue,priorTime,checkedAt){
 if(positive(value)&&retained!==true)return {amount:value,checkedAt,retained:false};
 const own=positive(value)&&retained===true?evidenceTime(originalTime,checkedAt):null;
 const prior=positive(priorValue)?evidenceTime(priorTime,checkedAt):null;
 if(prior&&(!own||Date.parse(prior)>Date.parse(own)))return {amount:priorValue,checkedAt:prior,retained:true};
 if(own)return {amount:value,checkedAt:own,retained:true};
 return {amount:null,checkedAt:null,retained:false};
}
export function retainGreenwayPrices(incoming,previous){
 const data=structuredClone(incoming),sameSource=previous?.source===data.source&&previous?.adapter===data.adapter;
 for(const [vin,row]of Object.entries(data.prices||{})){
  const old=sameSource?previous.prices?.[vin]:null;
  const matches=old&&old.stockNumber===row.stockNumber&&old.condition===row.condition&&old.url===row.url;
  for(const [field,observed,time,retained]of [['price','observedPrice','priceCheckedAt','priceRetained'],['msrp','observedMsrp','msrpCheckedAt','msrpRetained']]){
   // Only an explicitly absent amount is eligible. A malformed fresh amount
   // must remain malformed for the caller's validator to reject it.
   if(row[field]!==null&&!positive(row[field]))continue;
   const raw=row[retained]===true?row[observed]??null:row[field];
   const oldTime=old?.[retained]===true?old[time]:old?.[time]||previous?.checkedAt;
   const result=amountEvidence(row[field],row[retained],row[time],matches?old[field]:null,oldTime,data.checkedAt);
   row[field]=result.amount;row[observed]=raw;row[time]=result.checkedAt;row[retained]=result.retained;
  }
 }
 return data;
}
export function retainCogginPrices(incoming,previous){
 const data=structuredClone(incoming),sameSource=previous?.source===data.source&&previous?.complete===true;
 data.priceCheckedAt={};data.priceRetained={};data.observedRetailPrices={};
 for(const [vin,value]of Object.entries(data.retailPrices||{})){
  if(value!==null&&!positive(value))continue;
  const wasRetained=incoming.priceRetained?.[vin]===true;
  const prior=sameSource&&previous.inventoryVins?.includes(vin)&&incoming.conditions?.[vin]==='used';
  const priorTime=previous?.priceRetained?.[vin]===true?previous.priceCheckedAt?.[vin]:previous?.priceCheckedAt?.[vin]||previous?.checkedAt;
  const result=amountEvidence(value,wasRetained,incoming.priceCheckedAt?.[vin],prior?previous.retailPrices?.[vin]:null,priorTime,data.checkedAt);
  data.retailPrices[vin]=result.amount;data.observedRetailPrices[vin]=wasRetained?incoming.observedRetailPrices?.[vin]??null:value;data.priceCheckedAt[vin]=result.checkedAt;data.priceRetained[vin]=result.retained;
 }
 return data;
}
