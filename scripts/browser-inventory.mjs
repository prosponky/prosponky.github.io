import {OfficialCollection} from '../src/official-inventory.js';

// Supported CUA tab only. Read rendered public cards; never launch a separate
// browser, access session secrets, or bypass an access challenge.
export function nextPageUrl(href,current,config,section){
 const url=new URL(href,config.origin),previous=new URL(current);
 if(url.origin!==config.origin||url.pathname!==section.path)throw Error('Unexpected pagination destination');
 for(const [key,value] of previous.searchParams)if(key!=='_p'&&!url.searchParams.has(key))url.searchParams.append(key,value);
 return url.href;
}
function restore(config,state){
 const collection=new OfficialCollection(config);
 if(state.source!==config.origin||state.adapter!==config.adapter||Date.now()-Date.parse(state.startedAt)>3600000||!Number.isFinite(Date.parse(state.startedAt)))throw Error('Invalid or expired collection checkpoint');
 for(let i=0;i<state.sections.length;i++){
  const section=state.sections[i];if(section.condition!==config.sections[i]?.condition)throw Error('Checkpoint section mismatch');
  collection.start(section.condition,section.total);for(const cards of section.pages){if(cards===null)collection.section.pages.clear();else collection.add(cards);}
  if(section.done)collection.finish();else if(i!==state.sections.length-1)throw Error('Incomplete checkpoint section');
 }
 return collection;
}
export async function collectBrowserBatch(tab,config,{checkpoint,maxPages=3,onCheckpoint=()=>{}}={}){
 if(!Number.isInteger(maxPages)||maxPages<1||maxPages>5)throw Error('Use batches of one to five pages');
 const state=checkpoint?structuredClone(checkpoint):{source:config.origin,adapter:config.adapter,startedAt:new Date().toISOString(),sections:[],nextUrl:new URL(config.sections[0].path,config.origin).href};
 const collection=restore(config,state);
 for(let processed=0;processed<maxPages&&state.nextUrl;processed++){
  const index=state.sections.filter(s=>s.done).length,section=config.sections[index];
  if(!section)throw Error('Unexpected collection section');
  const destination=new URL(state.nextUrl);if(destination.origin!==config.origin||destination.pathname!==section.path)throw Error('Checkpoint destination mismatch');
  if(await tab.url()!==destination.href)await tab.goto(destination.href);
  await tab.playwright.domSnapshot();
  const pageNumber=Number(destination.searchParams.get('_p')||1);
  await tab.playwright.getByText(new RegExp('Page\\s+'+pageNumber+' of \\d+')).waitFor({state:'visible',timeoutMs:10000});
  const readTotal=async()=>{const headings=await tab.playwright.getByRole('heading',{name:new RegExp(config.countHeading)}).allTextContents();return Number(headings.find(t=>/^[\d,]+/.test(t))?.match(/^[\d,]+/)[0].replaceAll(',',''));};
  let total=await readTotal();
  // Hydration can briefly render the unfiltered count during navigation.
  if(collection.section&&total!==collection.section.total){await tab.playwright.domSnapshot();total=await readTotal();}
  if(!collection.section){collection.start(section.condition,total);state.sections.push({condition:section.condition,total,pages:[],done:false});}
  if(total!==collection.section.total)throw Error('Official filters or count changed during collection');
  const cards=await tab.playwright.locator(config.cardSelector).evaluateAll(es=>es.map(e=>({text:e.innerText,url:e.querySelector('a[href*="/inventory/"]')?.href})));
  const count=collection.add(cards),saved=state.sections[index];saved.pages.push(cards);
  if(saved.pages.length>100)throw Error('Official pagination limit reached');
  const pagination=await tab.playwright.getByText(new RegExp('Page\\s+'+pageNumber+' of \\d+')).allTextContents();
  const lastPage=Number(pagination.find(t=>/of\s+\d+/.test(t))?.match(/of\s+(\d+)/)?.[1]);
  if(!Number.isInteger(lastPage)||lastPage<pageNumber)throw Error('Official page position unavailable');
  if(pageNumber===lastPage&&count===total){collection.finish();saved.done=true;state.nextUrl=config.sections[index+1]?new URL(config.sections[index+1].path,config.origin).href:null;}
  else if(pageNumber===lastPage){
   if(saved.pages.includes(null))throw Error('Official inventory still incomplete after two passes');
   saved.pages.push(null);collection.section.pages.clear();state.nextUrl=new URL(section.path,config.origin).href;
  }
  else{
   const next=tab.playwright.getByRole('button',{name:config.nextButton,exact:true});
   if(!await next.isEnabled())throw Error('Pagination stopped before official total');
   const href=await next.getAttribute('href'),current=await tab.url();
   await tab.playwright.waitForTimeout(1500); // Polite request spacing.
   if(href&&new URL(current).searchParams.has('_p'))state.nextUrl=nextPageUrl(href,current,config,section);
   else{
    // Initial activation reveals the selected type filter in the site's URL.
    // Keyboard activation avoids shifting dealer call-to-action overlays.
    const vin=cards[0].text.match(/VIN\s*:\s*([A-HJ-NPR-Z0-9]{17})/i)?.[1];
    await next.press('Enter');
    await tab.playwright.locator(config.cardSelector).filter({hasText:vin}).waitFor({state:'hidden',timeoutMs:10000});
    await tab.playwright.domSnapshot();state.nextUrl=await tab.url();
    nextPageUrl(state.nextUrl,state.nextUrl,config,section);
   }
  }
  // Save after every accepted page, even when the next tool call is interrupted.
  await onCheckpoint(structuredClone(state),{condition:section.condition,page:saved.pages.length,count,total});
 }
 return {checkpoint:state,done:!state.nextUrl,snapshot:!state.nextUrl?collection.snapshot():null};
}
export async function collectBrowserInventory(tab,config,options={}){
 let result;do{result=await collectBrowserBatch(tab,config,{...options,checkpoint:result?.checkpoint});}while(!result.done);return result.snapshot;
}
