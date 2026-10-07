const day=value=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
export function inventoryChanges(previous,vehicles,checkedAt){
 const date=day(checkedAt),sameDay=previous&&day(previous.checkedAt)===date;
 const baselineVins=sameDay?previous.dailyChanges?.baselineVins:previous?.vehicles?.map(v=>v.vin);
 const baselineDate=sameDay?previous.dailyChanges?.baselineDate:previous?day(previous.checkedAt):null;
 const known=new Set(baselineVins||[]);
 return {date,baselineDate,baselineVins:baselineVins||null,addedVins:baselineVins?vehicles.map(v=>v.vin).filter(v=>!known.has(v)):[]};
}
