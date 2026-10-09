import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
export function easternDay(date=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
export function reserveSticker(ledger,vehicles,records,now=new Date()){
 const day=easternDay(now),time=now.getTime();
 for(const v of vehicles)if(!ledger.seen[v.key])ledger.seen[v.key]={firstSeen:now.toISOString(),baseline:false};
 const today=ledger.attempts.filter(a=>a.day===day);
 if(today.length>=5||time-Date.parse(ledger.lastAttemptAt||0)<7200000)return null;
 const eligible=vehicles.filter(v=>records[v.key]?.status!=='verified'&&!ledger.attempts.some(a=>a.key===v.key));
 const arrivals=eligible.filter(v=>!ledger.seen[v.key].baseline);
 const pool=arrivals.length?arrivals:eligible;
 const next=pool.sort((a,b)=>Date.parse(ledger.seen[a.key].firstSeen)-Date.parse(ledger.seen[b.key].firstSeen)||a.key.localeCompare(b.key))[0];
 if(!next)return null;
 ledger.attempts.push({key:next.key,day,at:now.toISOString()});ledger.lastAttemptAt=now.toISOString();return next;
}
export async function readJson(path){try{return JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}}
export async function saveJson(path,value){await writeFile(path+'.tmp',JSON.stringify(value,null,2));await rename(path+'.tmp',path);}
