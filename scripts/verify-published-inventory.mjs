import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';
const allowed=new Set(['greenway.json','greenway-prices.json','greenway-carfax.json','coggin-atlantic.json','coggin-avenues.json','coggin-atlantic-links.json','coggin-avenues-links.json','autonation-jacksonville.json']);
export async function verifyPublishedSnapshots(files,{readExpected,fetchLive,wait=ms=>new Promise(r=>setTimeout(r,ms)),attempts=61,intervalMs=10000,timeoutMs=600000,now=Date.now,onProgress=()=>{}}={}){
 if(!files.length||new Set(files).size!==files.length||files.some(file=>!allowed.has(file)))throw Error('Invalid live snapshot selection');
 if(!Number.isInteger(attempts)||attempts<1||!Number.isFinite(intervalMs)||intervalMs<0||!Number.isFinite(timeoutMs)||timeoutMs<=0)throw Error('Invalid publication wait limits');
 const expected=await Promise.all(files.map(async file=>{const data=await readExpected(file);if(!Number.isFinite(Date.parse(data?.checkedAt)))throw Error('Expected snapshot lacks verification date: '+file);return {file,data};}));
 const started=now(),results={};
 await Promise.all(expected.map(async({file,data})=>{
  let reason='Live snapshot does not match published evidence',reads=0,actualCheckedAt=null;
  for(let attempt=0;attempt<attempts;attempt++){
   if(attempt>0&&now()-started>=timeoutMs)break;
   reads++;
   try{const actual=await fetchLive(file);actualCheckedAt=actual?.checkedAt||null;if(JSON.stringify(actual)===JSON.stringify(data)){results[file]={status:'exact-live-verified',checkedAt:data.checkedAt,attempts:reads,elapsedMs:now()-started};return;}reason='Live snapshot does not match published evidence';}catch(e){reason=e.message;if([401,403,429].includes(e.status)||/HTTP (401|403|429)\b/.test(reason))break;}
   const remaining=timeoutMs-(now()-started);
   if(attempt+1<attempts&&remaining>0){if(attempt%6===0)await onProgress({status:'waiting-for-publication',file,attempt:reads,elapsedMs:now()-started,expectedCheckedAt:data.checkedAt,actualCheckedAt});await wait(Math.min(intervalMs,remaining));}
  }
  results[file]={status:'failed',reason,expectedCheckedAt:data.checkedAt,actualCheckedAt,attempts:reads,elapsedMs:now()-started};
 }));
 return {checkedAt:new Date().toISOString(),allVerified:files.every(f=>results[f]?.status==='exact-live-verified'),files:results};
}
async function main(){
 const files=process.argv.slice(2);
 const report=await verifyPublishedSnapshots(files,{readExpected:async file=>JSON.parse(await readFile(resolve('public/inventory',file),'utf8')),fetchLive:async file=>{const r=await fetch('https://prosponky.github.io/inventory/'+file+'?verify='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Live map HTTP '+r.status);return r.json();},onProgress:progress=>console.log(JSON.stringify(progress))});
 await mkdir('tmp',{recursive:true});await writeFile('tmp/published-inventory-verification.json',JSON.stringify({...report,trigger:process.env.GITHUB_EVENT_NAME||'manual',workflowRun:process.env.GITHUB_RUN_ID||null},null,2));
 console.log(JSON.stringify(report));if(!report.allVerified)process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main();
