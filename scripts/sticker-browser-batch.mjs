// Self-contained for supported CUA runtimes that permit file reads but block file module imports.
// Call once per browser tool call, supplying the runtime's fs promises object.
export async function collectStickerBrowserBatch(tab,fs,path,maxVehicles=5){
 if(!Number.isInteger(maxVehicles)||maxVehicles<1||maxVehicles>5)throw Error('One to five vehicles per browser call');
 const state=JSON.parse(await fs.readFile(path,'utf8'));
 const save=async()=>{await fs.writeFile(path+'.tmp',JSON.stringify(state));await fs.rename(path+'.tmp',path);};
 for(let i=0;i<maxVehicles&&state.index<state.vehicles.length;i++){
  const row=state.vehicles[state.index],result={vin:row.vin,checkedAt:new Date().toISOString(),discoveries:[],pages:[]};
  const sources=[...new Set([row.listingUrl,row.reportUrl].filter(Boolean))];
  for(const source of sources){
   const origin=new URL(source).origin;if(origin!==state.source&&origin!=='https://www.carfax.com')throw Error('Unregistered discovery source');
   await tab.goto(source);
   const evidence=await tab.playwright.evaluate(vin=>{
    const text=document.body?.innerText||'';
    if(/verify (?:you are human|your device)|access denied|security challenge|captcha/i.test(text))return {blocked:true};
    if(!text.replace(/\s/g,'').toUpperCase().includes(vin))return {identity:false};
    return {identity:true,url:location.href,reports:[...new Set([...document.querySelectorAll('a[href]')].map(a=>a.href).filter(url=>/^https:\/\/(?:www\.)?carfax\.com\/(?:vehiclehistory|VehicleHistory)\//.test(url)))],links:[...document.querySelectorAll('a[href]')].filter(a=>/window\s*sticker|monroney/i.test((a.textContent||'')+' '+(a.getAttribute('aria-label')||'')+' '+(a.getAttribute('title')||''))).slice(0,5).map(a=>({url:a.href,label:(a.textContent||a.getAttribute('aria-label')||a.getAttribute('title')||'').trim()}))};
   },row.vin);
   if(evidence.blocked){state.blocked={source,at:new Date().toISOString()};await save();return {done:false,blocked:true,index:state.index,total:state.vehicles.length};}
   result.pages.push({sourceUrl:source,identity:evidence.identity===true});
   if(evidence.identity&&new URL(source).origin===state.source&&evidence.reports?.length===1&&!sources.includes(evidence.reports[0]))sources.push(evidence.reports[0]);
   if(evidence.identity)result.discoveries.push(...evidence.links.map(link=>({...link,vin:row.vin,sourceVin:row.vin,sourceUrl:evidence.url,discoveredAt:result.checkedAt})));
  }
  result.status=result.discoveries.length?'candidate':result.pages.length&&result.pages.every(p=>p.identity)?'no-link':'unverified';
  state.results[row.vin]=result;state.index++;state.updatedAt=new Date().toISOString();delete state.blocked;await save();
 }
 state.done=state.index===state.vehicles.length;await save();
 return {done:state.done,index:state.index,total:state.vehicles.length,candidates:Object.values(state.results).filter(r=>r.discoveries.length).length};
}
