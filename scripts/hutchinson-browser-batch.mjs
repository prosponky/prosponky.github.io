// Supported CUA only. Bounded public DOM reads; no private endpoints or challenge retries.
export async function hutchinsonBrowserBatch(tab,state,config,{maxPages=1,maxVehicles=5,onCheckpoint=async()=>{}}={}){
 if(!Number.isInteger(maxPages)||maxPages<1||maxPages>3||!Number.isInteger(maxVehicles)||maxVehicles<1||maxVehicles>5)throw Error('Batch exceeds bounded limits');
 const sections=config.sections;
 const checkPage=async()=>{const dom=await tab.playwright.domSnapshot();if(/access denied|verify you are human|security challenge/i.test(dom))throw Error('Dealer access challenge');};
 const headings=async()=>tab.playwright.getByRole('heading').allTextContents();
 if(state.phase==='list')for(let n=0;n<maxPages&&state.nextUrl;n++){
  const section=sections[state.sectionIndex],target=new URL(state.nextUrl);if(target.origin!==config.origin||target.pathname!==section.path)throw Error('Unexpected Hutchinson destination');
  if(await tab.url()!==target.href)await tab.goto(target.href);await checkPage();
  const page=Number(target.searchParams.get('_p')||1);await tab.playwright.getByText(new RegExp('Page\\s+'+page+' of \\d+')).waitFor({state:'visible',timeoutMs:20000});
  const heading=await headings(),positions=await tab.playwright.getByText(new RegExp('Page\\s+'+page+' of \\d+')).allTextContents();
  const lastPage=Number(positions.find(t=>/of\s+\d+/.test(t))?.match(/of\s+(\d+)/)?.[1]);
  // Restore pricing only for a partially read page resumed after interruption.
  const visibleUrls=await tab.playwright.locator('.hit').evaluateAll(es=>es.map(e=>e.querySelector('a[href*="/inventory/"]')?.href));
  for(let i=0;i<visibleUrls.length;i++)if(state.details[visibleUrls[i]])await tab.playwright.locator('.hit').nth(i).getByRole('button',{name:'pricing tab',exact:true}).click();
  const cards=await tab.playwright.locator('.hit').evaluateAll(es=>es.map(e=>({text:e.innerText,url:e.querySelector('a[href*="/inventory/"]')?.href})));
  if(!cards.length||!Number.isInteger(lastPage)||lastPage<page)throw Error('Incomplete Hutchinson page');
  for(let i=0;i<cards.length;i++){
   // Resume from the first accepted observation. Rereading an already accepted
   // detail would replace its timestamp and violate the checkpoint prefix.
   if(state.details[cards[i].url])continue;
   const row=tab.playwright.locator('.hit').nth(i);await row.getByRole('button',{name:'details tab',exact:true}).click();
   const text=await row.innerText(),vin=cards[i].text.match(/VIN\s*:\s*([A-Z0-9]+)/i)?.[1]||new URL(cards[i].url).pathname.match(/-([a-z0-9]+)\/$/i)?.[1]?.toUpperCase();
   const href=await row.locator('a[href*="/inventory/"]').first().getAttribute('href'),printedVin=text.match(/VIN\s*:\s*([A-Z0-9]+)/i)?.[1];
   if(!vin||new URL(href,config.origin).href!==cards[i].url||printedVin&&printedVin.toUpperCase()!==vin)throw Error('Listing detail identity changed');
   state.details[cards[i].url]={text,checkedAt:new Date().toISOString()};
  }
  state.pages.push({condition:section.condition,page,lastPage,heading,cards,url:await tab.url()});
  if(page===lastPage){state.sectionIndex++;state.nextUrl=sections[state.sectionIndex]?new URL(sections[state.sectionIndex].path,config.origin).href:null;if(!state.nextUrl){state.phase='inventory-confirm';state.inventoryConfirmIndex=0;state.inventoryFinalChecks=[];state.detailQueue=state.pages.filter(p=>p.condition==='used').flatMap(p=>p.cards).map(c=>({url:c.url,vin:(c.text.match(/VIN\s*:\s*([A-Z0-9]+)/i)?.[1]||new URL(c.url).pathname.match(/-([a-z0-9]+)\/$/i)?.[1]).toUpperCase()}));}}
  else{const next=tab.playwright.getByRole('button',{name:'next page',exact:true});if(!await next.isEnabled())throw Error('Hutchinson pagination stopped early');await next.press('Enter');await tab.playwright.getByText(new RegExp('Page\\s+'+(page+1)+' of \\d+')).waitFor({state:'visible',timeoutMs:20000});await tab.playwright.domSnapshot();await tab.playwright.waitForURL('**/*_p='+String(page+1)+'&**',{timeoutMs:20000});state.nextUrl=await tab.url();}
  await onCheckpoint(state);
 }
 else if(state.phase==='inventory-ready'){state.phase='details';await onCheckpoint(state);}
 else if(state.phase==='inventory-confirm'){
  for(let n=0;n<maxPages&&state.inventoryConfirmIndex<sections.length;n++){const section=sections[state.inventoryConfirmIndex];await tab.goto(new URL(section.path,config.origin).href);await checkPage();await tab.playwright.getByText(/Page\s+1 of \d+/).waitFor({state:'visible',timeoutMs:20000});state.inventoryFinalChecks.push({condition:section.condition,headings:await headings()});state.inventoryConfirmIndex++;if(state.inventoryConfirmIndex===sections.length){state.phase='inventory-ready';state.inventoryFinishedAt=new Date().toISOString();}await onCheckpoint(state);}
 }
 else if(state.phase==='details'){
  for(let n=0;n<maxVehicles&&state.detailIndex<state.detailQueue.length;n++){
   const item=state.detailQueue[state.detailIndex],url=new URL(item.url);if(url.origin!==config.origin)throw Error('Foreign Hutchinson detail');await tab.goto(item.url);await checkPage();await tab.playwright.getByText(item.vin,{exact:false}).first().waitFor({state:'visible',timeoutMs:20000});
   const body=await tab.playwright.evaluate(()=>document.body.innerText);if(!body.toUpperCase().includes(item.vin))throw Error('Detail VIN not visible');
   const hrefs=await tab.playwright.locator('a[href]').evaluateAll(es=>es.filter(e=>/carfax/i.test(e.href)).map(e=>e.href));state.reports[item.vin]={vin:item.vin,url:await tab.url(),body,hrefs,checkedAt:new Date().toISOString()};state.detailIndex++;await onCheckpoint(state);
  }
  if(state.detailIndex===state.detailQueue.length){state.phase='confirm';await onCheckpoint(state);}
 }else if(state.phase==='confirm')for(let n=0;n<maxPages&&state.confirmIndex<sections.length;n++){
  const section=sections[state.confirmIndex];await tab.goto(new URL(section.path,config.origin).href);await checkPage();await tab.playwright.getByText(/Page\s+1 of \d+/).waitFor({state:'visible',timeoutMs:20000});state.finalChecks.push({condition:section.condition,headings:await headings()});state.confirmIndex++;
  if(state.confirmIndex===sections.length){state.phase='done';state.finishedAt=new Date().toISOString();}await onCheckpoint(state);
 }
 return {phase:state.phase,pages:state.pages.length,detailIndex:state.detailIndex,total:state.detailQueue.length,inventoryReady:state.phase==='inventory-ready',done:state.phase==='done'};
}
