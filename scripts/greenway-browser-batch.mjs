// Literal supported-CUA workflow; all verification runs in the local checkpoint server.
export async function greenwayBrowserBatch(tab,state,config,{maxPages=3,maxVehicles=5}={}){
 if(!Number.isInteger(maxPages)||maxPages<1||maxPages>3||!Number.isInteger(maxVehicles)||maxVehicles<1||maxVehicles>5)throw Error('Batch exceeds bounded limits');
 if(state.phase==='list')for(let n=0;n<maxPages&&state.nextUrl;n++){
  const section=config.sections[state.sectionIndex];const target=new URL(state.nextUrl);
  if(target.origin!==config.origin||target.pathname!==section.path)throw Error('Unexpected collection destination');
  if(await tab.url()!==target.href)await tab.goto(target.href);
  const page=Number(target.searchParams.get('_p')||1);
  await tab.playwright.getByText(new RegExp('Page\\s+'+page+' of \\d+')).waitFor({state:'visible',timeoutMs:15000});
  const headings=await tab.playwright.getByRole('heading',{name:new RegExp(config.countHeading)}).allTextContents();
  const total=Number(headings.find(t=>/^[\d,]+/.test(t))?.match(/^[\d,]+/)[0].replaceAll(',',''));
  const cards=await tab.playwright.locator(config.cardSelector).evaluateAll(es=>es.map(e=>({text:e.innerText,url:e.querySelector('a[href*="/inventory/"]')?.href})));
  const positions=await tab.playwright.getByText(new RegExp('Page\\s+'+page+' of \\d+')).allTextContents();
  const lastPage=Number(positions.find(t=>/of\s+\d+/.test(t))?.match(/of\s+(\d+)/)?.[1]);
  if(!Number.isInteger(total)||total<1||!Number.isInteger(lastPage)||lastPage<page||!cards.length)throw Error('Official page is not ready or access denied');
  state.pages.push({condition:section.condition,total,page,lastPage,url:await tab.url(),cards});
  if(page===lastPage){state.sectionIndex++;state.nextUrl=config.sections[state.sectionIndex]?new URL(config.sections[state.sectionIndex].path,config.origin).href:null;if(!state.nextUrl)state.phase='details';}
  else{
   const next=tab.playwright.getByRole('button',{name:config.nextButton,exact:true});if(!await next.isEnabled())throw Error('Pagination stopped early');
   const href=await next.getAttribute('href'),current=new URL(await tab.url());
   if(href&&current.searchParams.has('_p')){const dest=new URL(href,config.origin);for(const [key,value]of current.searchParams)if(key!=='_p'&&!dest.searchParams.has(key))dest.searchParams.append(key,value);state.nextUrl=dest.href;}
   else{const vin=cards[0].text.match(/VIN\s*:\s*([A-HJ-NPR-Z0-9]{17})/i)?.[1];if(!vin)throw Error('Missing VIN');await next.press('Enter');await tab.playwright.locator(config.cardSelector).filter({hasText:vin}).waitFor({state:'hidden',timeoutMs:15000});state.nextUrl=await tab.url();}
  }
 }
 else if(state.phase==='details')for(let n=0;n<maxVehicles&&state.detailIndex<state.vehicles.length;n++){
  const row=state.vehicles[state.detailIndex];await tab.goto(row.url);
  const dom=await tab.playwright.domSnapshot();if(/access denied|verify you are human|security challenge/i.test(dom))throw Error('Dealer access challenge');
  await tab.playwright.getByText(row.vin,{exact:false}).first().waitFor({state:'visible',timeoutMs:15000});
  const body=await tab.playwright.evaluate(()=>document.body.innerText);
  if(!body.toUpperCase().includes(row.vin))throw Error('Detail VIN not visible');
  const hrefs=await tab.playwright.locator('a[href]').evaluateAll(es=>es.filter(e=>/carfax/i.test(e.href)).map(e=>e.href));
  state.details.push({vin:row.vin,url:await tab.url(),body,hrefs});state.detailIndex++;
 }
 return {phase:state.phase,pages:state.pages.length,detailIndex:state.detailIndex,total:state.vehicles?.length||0};
}
