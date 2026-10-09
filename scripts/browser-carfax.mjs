import {readFile,writeFile,rename} from 'node:fs/promises';
import {verifiedCarfaxUrl} from '../src/carfax.js';
// Bounded, durable reads of rendered public detail pages through supported CUA.
export async function collectCarfaxBatch(tab,snapshot,checkpoint,{maxVehicles=5}={}){
 if(!Number.isInteger(maxVehicles)||maxVehicles<1||maxVehicles>5)throw Error('Use one to five vehicle detail pages');
 const source=JSON.parse(await readFile(snapshot,'utf8'));
 if(source.source!=='https://www.greenwaykiaattheavenues.com')throw Error('Unexpected dealer source');
 const vehicles=Object.entries(source.prices).filter(([,r])=>r.condition==='used');
 let state;try{state=JSON.parse(await readFile(checkpoint,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;state={signature:JSON.stringify(vehicles.map(([vin,row])=>[vin,row.url])),source:source.source,startedAt:new Date().toISOString(),index:0,total:vehicles.length,reports:{}};}
 if(!Number.isInteger(state.index)||state.index<0||state.index>vehicles.length||Date.now()-Date.parse(state.startedAt)>3600000||state.total!==vehicles.length||state.source!==source.source||state.signature!==JSON.stringify(vehicles.map(([vin,row])=>[vin,row.url])))throw Error('Carfax checkpoint source changed');
 for(let n=0;n<maxVehicles&&state.index<vehicles.length;n++){
  const [vin,row]=vehicles[state.index];const url=new URL(row.url);
  if(url.origin!==source.source||!url.pathname.toUpperCase().endsWith('-'+vin+'/'))throw Error('Dealer vehicle identity mismatch');
  await tab.goto(url.href);const dom=await tab.playwright.domSnapshot();
  if(/access denied|verify you are human|security challenge/i.test(dom))throw Error('Dealer access challenge; previous reports retained');
  const identity=await tab.playwright.evaluate(()=>document.body.innerText);
  if(!identity.toUpperCase().includes(vin))throw Error('Vehicle detail VIN unavailable; previous reports retained');
  const hrefs=await tab.playwright.locator('a[href]').evaluateAll(es=>es.filter(e=>/carfax/i.test(e.href)).map(e=>e.href));
  const links=[...new Set(hrefs.map(verifiedCarfaxUrl).filter(Boolean))];if(links.length>1)throw Error('Conflicting dealer Carfax reports');
  state.reports[vin]={stockNumber:row.stockNumber,listingUrl:row.url,url:links[0]||null};state.index++;
  await writeFile(checkpoint+'.tmp',JSON.stringify(state));await rename(checkpoint+'.tmp',checkpoint);
 }
 return {done:state.index===state.total,count:state.index,total:state.total,map:state.index===state.total?{source:state.source,checkedAt:new Date().toISOString(),total:state.total,reports:state.reports}:null};
}
