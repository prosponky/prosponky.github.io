// Supported browser APIs only: no local writes, network clients or private APIs.
const {collectBrowserBatch,restoreOfficialCheckpoint}=await import(new URL('./browser-inventory.mjs',import.meta.url).href+'?fresh='+Date.now());
const {hutchinsonBrowserBatch}=await import(new URL('./hutchinson-browser-batch.mjs',import.meta.url).href+'?fresh='+Date.now());
const {autoNationBrowserBatch}=await import(new URL('./autonation-browser-batch.mjs',import.meta.url).href+'?fresh='+Date.now());
const {checkpointDelta}=await import(new URL('./checkpoint-delta.mjs',import.meta.url).href+'?fresh='+Date.now());

export async function readCheckpointEnvelope(form){
 const field=form.playwright.locator('#checkpoint'),length=await field.evaluate(e=>e.value.length);
 if(!Number.isInteger(length)||length<1||length>12000000)throw Error('Invalid checkpoint length');
 let text='';for(let offset=0;offset<length;offset+=50000)text+=await field.evaluate((e,start)=>e.value.slice(start,start+50000),offset);
 if(text.length!==length)throw Error('Checkpoint changed while reading');return JSON.parse(text);
}

export async function runCheckpointBatch(tab,form,{maxPages,maxVehicles=5}={}){
 const envelope=await readCheckpointEnvelope(form);
 const {state,config}=envelope;if(envelope.progress.done)return envelope.progress;
 let acceptedState=structuredClone(state);
 const persist=async()=>{
  await form.playwright.locator('#update').fill(JSON.stringify({version:envelope.version,delta:checkpointDelta(acceptedState,state)}));
  await form.playwright.locator('form button').click();
  await form.playwright.locator('#status').filter({hasText:'"version":'+(envelope.version+1)+','}).waitFor({state:'visible',timeoutMs:10000});
  const accepted=await readCheckpointEnvelope(form);
  if(accepted.version!==envelope.version+1)throw Error('Checkpoint was not saved');
  envelope.version=accepted.version;envelope.progress=accepted.progress;
  acceptedState=structuredClone(accepted.state);
  Object.assign(state,accepted.state);
 };
 if(config.adapter==='dealer-inspire-browser'){
  if(state.nextUrl)await collectBrowserBatch(tab,config,{checkpoint:state,maxPages:maxPages??3,onCheckpoint:async next=>{Object.assign(state,next);await persist();}});
  else{
   if(!Number.isInteger(maxVehicles)||maxVehicles<1||maxVehicles>5)throw Error('Use one to five details');
   const used=Object.entries(restoreOfficialCheckpoint(config,state).snapshot().prices).filter(([,r])=>r.condition==='used');
   for(let n=0;n<maxVehicles&&state.reportDetails.length<used.length;n++){
    const [vin,row]=used[state.reportDetails.length];await tab.goto(row.url);const dom=await tab.playwright.domSnapshot();if(/access denied|verify you are human|security challenge/i.test(dom))throw Error('Dealer access challenge');
    const body=await tab.playwright.evaluate(()=>document.body.innerText);if(!body.toUpperCase().includes(vin))throw Error('Detail VIN unavailable');
    const hrefs=await tab.playwright.locator('a[href]').evaluateAll(es=>es.filter(e=>/carfax/i.test(e.href)).map(e=>e.href));
    state.reportDetails.push({vin,url:row.url,body,hrefs,checkedAt:new Date().toISOString()});await persist();
   }
  }
 }else if(config.adapter==='hutchinson-browser')await hutchinsonBrowserBatch(tab,state,config,{maxPages:maxPages??1,maxVehicles,onCheckpoint:persist});
 else if(config.adapter==='autonation-browser'){await autoNationBrowserBatch(tab,state,config,{maxPages:maxPages??3,maxVehicles});await persist();}
 else throw Error('Unsupported browser store');
 return envelope.progress;
}
