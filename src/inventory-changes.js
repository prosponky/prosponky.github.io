const day=value=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
export const inventoryArrivalKey=row=>String(row.storeLabel||'')+'|'+String(row.vin||'').trim().toUpperCase();
export function inventoryChanges(previous,vehicles,checkedAt){
 const date=day(checkedAt),sameDay=previous&&day(previous.checkedAt)===date;
 const savedBaseline=sameDay&&Array.isArray(previous.dailyChanges?.baselineVins)?previous.dailyChanges.baselineVins:null;
 const baselineVins=savedBaseline||previous?.vehicles?.map(v=>v.vin)||vehicles.map(v=>v.vin);
 const baselineDate=savedBaseline?previous.dailyChanges.baselineDate:previous?day(previous.checkedAt):date;
 const known=new Set(baselineVins);
 return {date,baselineDate,baselineVins,addedVins:vehicles.map(v=>v.vin).filter(v=>!known.has(v))};
}
