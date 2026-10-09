// New VINs first; successful documents and confirmed absences need only weekly rechecks.
export function stickerQueue(vehicles,records,now=Date.now()){
 const unique=[...new Map(vehicles.map(v=>[v.vin,v])).values()];
 return unique.filter(v=>{const r=records[v.vin];const age=now-Date.parse(r?.lastAttemptAt||r?.checkedAt);return !r||!Number.isFinite(age)||age>=(r.status==='verified'||r.status==='unavailable'?6:1)*86400000;})
 .sort((a,b)=>Number(Boolean(records[a.vin]))-Number(Boolean(records[b.vin]))||Date.parse(records[a.vin]?.lastAttemptAt||records[a.vin]?.checkedAt||0)-Date.parse(records[b.vin]?.lastAttemptAt||records[b.vin]?.checkedAt||0));
}
export function morningStickerRun(date=new Date()){
 return Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'numeric',hourCycle:'h23'}).format(date))===7;
}
