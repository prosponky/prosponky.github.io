// Copy this literal function into the supported CUA REPL when local module
// imports are unavailable. It uses only documented browser actions and DOM reads.
export async function autoNationBrowserBatch(tab,state,config,{maxPages=3,maxVehicles=5}={}){
 if(!Number.isInteger(maxPages)||maxPages<1||maxPages>3||!Number.isInteger(maxVehicles)||maxVehicles<1||maxVehicles>5)throw Error('Batch exceeds bounded limits.');
 const checkAccess=async()=>{if(/access denied|verify you are human|security challenge|too many requests/i.test(await tab.playwright.domSnapshot()))throw Error('Dealer access challenge; stop without retry.');};
 if(state.phase==='list'){
  // A durable checkpoint can outlive its browser tab. Replay visible pages in
  // bounded batches until they reach the accepted prefix; never erase that
  // prefix or replace prices observed before the interruption.
  const expected=new URL(config.inventoryPath,config.origin);let current;
  try{current=new URL(await tab.url());}catch{}
  if(!current||current.origin!==expected.origin||current.pathname!==expected.pathname||[...expected.searchParams].some(([key,value])=>current.searchParams.get(key)!==value))await tab.goto(expected.href);
  for(let page=0;page<maxPages;page++){
   await checkAccess();
   await tab.playwright.locator('[id^="vehicle_"]').filter({has:tab.playwright.locator('a[id^="srp-tile-vdp-link-"]')}).first().waitFor({state:'attached',timeoutMs:25000});
   const e=await tab.playwright.evaluate(()=>({store:document.querySelector('#store-name')?.textContent.trim(),count:document.querySelector('#div-srp-results-count-component')?.textContent,cards:[...document.querySelectorAll('[id^="vehicle_"]')].filter(c=>/^vehicle_[A-HJ-NPR-Z0-9]{17}$/.test(c.id)).map(c=>({vin:c.id.slice(8),url:c.querySelector('a[id^="srp-tile-vdp-link-"]')?.href,priceLabel:c.querySelector('.price-label')?.textContent.trim(),price:c.querySelector('[id^="srp-tile-lockedprice-"]')?.textContent.trim(),store:c.querySelector('.store-desc')?.textContent.trim()})),next:[...document.querySelectorAll('button')].some(b=>/^Load next (?:[1-9]|1\d|2[0-4])$/i.test(b.textContent.trim())&&!b.disabled)}));
   const total=Number(e.count?.match(/([\d,]+)\s+Results/)?.[1]?.replaceAll(',',''));
   if(e.store!==config.name||!Number.isInteger(total)||total<=0||state.total&&state.total!==total)throw Error('Store or total changed.');
   const cards=e.cards.map(card=>{if(card.store!==config.name||!card.url||card.priceLabel!==config.salePriceLabel)throw Error('Unverified store or price label.');return {...card,price:/^\d[\d,]*$/.test(card.price||'')?Number(card.price.replaceAll(',','')):null};});
   if(new Set(cards.map(v=>v.vin)).size!==cards.length)throw Error('VIN pages repeated or regressed.');
   for(let i=0;i<Math.min(cards.length,state.cards.length);i++)if(['vin','url','priceLabel','price','store'].some(key=>cards[i][key]!==state.cards[i][key]))throw Error('Accepted AutoNation listing changed; start a fresh collection.');
   state.total=total;if(cards.length>=state.cards.length)state.cards=cards;
   if(!e.next){
    const tiles=await tab.playwright.evaluate(()=>({total:document.querySelectorAll('an-srp-tile-v4[id]').length,promos:[...document.querySelectorAll('an-srp-tile-v4[id="vehicle_"]')].map(c=>({text:c.textContent,vehicleLinks:c.querySelectorAll('a[id^="srp-tile-vdp-link-"]').length}))}));
    const labels={'one-price':'What you see is what you pay','pre-qualification':'Get pre-qualified with zero impact','appraisal':'Wondering What Your Car'};
    const promos=tiles.promos.map(p=>{const matches=typeof p.text==='string'?Object.entries(labels).filter(([,label])=>p.text.includes(label)):[];return {...p,kind:matches.length===1?matches[0][0]:null};});
    if(tiles.total!==total+promos.length||promos.some(p=>p.vehicleLinks!==0||!p.kind)||new Set(promos.map(p=>p.kind)).size!==promos.length||cards.length!==total)throw Error('Full VIN count does not reconcile with the official vehicle and promotional tiles.');
    state.resultsTotal=tiles.total;state.promotionalTiles=promos;state.promotionalTileCount=promos.length;state.total=cards.length;state.phase='details';break;
   }
   await tab.playwright.getByRole('button',{name:/^Load next (?:[1-9]|1\d|2[0-4])$/i}).click();
   await tab.playwright.locator('[id^="vehicle_"]').filter({has:tab.playwright.locator('a[id^="srp-tile-vdp-link-"]')}).nth(cards.length).waitFor({state:'attached',timeoutMs:25000});
  }
 }else if(state.phase==='details'){
  for(let n=0;n<maxVehicles&&state.detailCount<state.cards.length;n++){
   const card=state.cards[state.detailCount];await tab.goto(card.url);await checkAccess();await tab.playwright.locator('#my-app-state').waitFor({state:'attached',timeoutMs:25000});
   const readDetail=()=>tab.playwright.evaluate(()=>{const s=JSON.parse(document.querySelector('#my-app-state').textContent),v=s.VehicleDetails;return {url:location.href,storeId:s.StoreInfo?.HyperionId,vehicle:v&&{Vin:v.Vin,StockNumber:v.StockNumber,HyperionId:v.HyperionId,ActualHyperionId:v.ActualHyperionId,IsAvailabile:v.IsAvailabile,StockType:v.StockType,StockTypeForSite:v.StockTypeForSite,Make:v.Make,Model:v.Model,Year:v.Year,Trim:v.Trim,ExteriorColor:v.ExteriorColor,InteriorColor:v.InteriorColor,Mileage:v.Mileage,Certification:v.Certification,FuelType:v.FuelType,InventoryVehicleDetail:{PricingStack:v.InventoryVehicleDetail?.PricingStack,VehicleHistory:{CarfaxUrl:v.InventoryVehicleDetail?.VehicleHistory?.CarfaxUrl}}}};});
   let e,retry=false;
   try{e=await readDetail();}catch(error){if(error?.name!=='SyntaxError')throw error;retry=true;}
   if(e&&(e.vehicle?.Vin!==card.vin||String(e.storeId)!==String(config.storeId)||String(e.vehicle?.HyperionId)!==String(config.storeId)))retry=true;
   if(retry){await checkAccess();await tab.reload();await checkAccess();await tab.playwright.locator('#my-app-state').waitFor({state:'attached',timeoutMs:25000});e=await readDetail();}
   if(e.vehicle?.Vin!==card.vin||String(e.storeId)!==String(config.storeId)||String(e.vehicle?.HyperionId)!==String(config.storeId))throw Error('Detail page VIN or advertised store changed or source denied access.');
   state.evidence.push({...e,expectedVin:card.vin,cardPrice:card.price});state.detailCount++;
  }
  if(state.detailCount===state.cards.length){state.phase='confirm-list';state.confirmation={phase:'list',startedAt:state.startedAt,cards:[],evidence:[],detailCount:0};}
 }else if(state.phase==='confirm-list'){
  await autoNationBrowserBatch(tab,state.confirmation,config,{maxPages,maxVehicles});
  if(state.confirmation.phase==='details'){
   const first=new Map(state.cards.map(v=>[v.vin,v]));
   if(state.confirmation.total!==state.total||state.confirmation.cards.length!==state.cards.length||state.confirmation.cards.some(v=>first.get(v.vin)?.price!==v.price||first.get(v.vin)?.url!==v.url))throw Error('AutoNation inventory changed during detail verification.');
   state.listRecheckedAt=new Date().toISOString();state.phase='done';
  }
 }
 return {phase:state.phase,total:state.total,listCount:state.cards.length,detailCount:state.detailCount};
}
