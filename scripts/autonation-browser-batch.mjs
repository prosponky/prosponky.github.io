// Copy this literal function into the supported CUA REPL when local module
// imports are unavailable. It uses only documented browser actions and DOM reads.
export async function autoNationBrowserBatch(tab,state,config,{maxPages=3,maxVehicles=5}={}){
 if(maxPages<1||maxPages>3||maxVehicles<1||maxVehicles>5)throw Error('Batch exceeds bounded limits.');
 if(state.phase==='list'){
  if(!state.cards.length)await tab.goto(config.origin+config.inventoryPath);
  for(let page=0;page<maxPages;page++){
   await tab.playwright.locator('[id^="vehicle_"]').filter({has:tab.playwright.locator('a[id^="srp-tile-vdp-link-"]')}).first().waitFor({state:'attached',timeoutMs:25000});
   const e=await tab.playwright.evaluate(()=>({store:document.querySelector('#store-name')?.textContent.trim(),count:document.querySelector('#div-srp-results-count-component')?.textContent,cards:[...document.querySelectorAll('[id^="vehicle_"]')].filter(c=>/^vehicle_[A-HJ-NPR-Z0-9]{17}$/.test(c.id)).map(c=>({vin:c.id.slice(8),url:c.querySelector('a[id^="srp-tile-vdp-link-"]')?.href,priceLabel:c.querySelector('.price-label')?.textContent.trim(),price:c.querySelector('[id^="srp-tile-lockedprice-"]')?.textContent.trim(),store:c.querySelector('.store-desc')?.textContent.trim()})),next:[...document.querySelectorAll('button')].some(b=>/^Load next 24$/i.test(b.textContent.trim())&&!b.disabled)}));
   const total=Number(e.count?.match(/([\d,]+)\s+Results/)?.[1]?.replaceAll(',',''));
   if(e.store!==config.name||!Number.isInteger(total)||total<=0||state.total&&state.total!==total)throw Error('Store or total changed.');
   const cards=e.cards.map(card=>{if(card.store!==config.name||!card.url||card.priceLabel!==config.salePriceLabel)throw Error('Unverified store or price label.');return {...card,price:/^\d[\d,]*$/.test(card.price||'')?Number(card.price.replaceAll(',','')):null};});
   if(cards.length<state.cards.length||new Set(cards.map(v=>v.vin)).size!==cards.length)throw Error('VIN pages repeated or regressed.');
   state.total=total;state.cards=cards;
   if(!e.next){
    const tiles=await tab.playwright.evaluate(()=>({total:document.querySelectorAll('an-srp-tile-v4[id]').length,promos:[...document.querySelectorAll('an-srp-tile-v4[id="vehicle_"]')].map(c=>({text:c.textContent,vehicleLinks:c.querySelectorAll('a[id^="srp-tile-vdp-link-"]').length}))}));
    const labels=['What you see is what you pay','Get pre-qualified with zero impact','Wondering What Your Car'];
    if(tiles.total!==total||tiles.promos.length!==3||tiles.promos.some(p=>p.vehicleLinks||!labels.some(label=>p.text.includes(label)))||cards.length+tiles.promos.length!==total)throw Error('Full VIN count does not reconcile with the official vehicle and promotional tiles.');
    state.resultsTotal=total;state.promotionalTileCount=tiles.promos.length;state.total=cards.length;state.phase='details';break;
   }
   await tab.playwright.getByRole('button',{name:/^Load next 24$/i}).click();
   await tab.playwright.locator('[id^="vehicle_"]').filter({has:tab.playwright.locator('a[id^="srp-tile-vdp-link-"]')}).nth(cards.length).waitFor({state:'attached',timeoutMs:25000});
  }
 }else if(state.phase==='details'){
  for(let n=0;n<maxVehicles&&state.detailCount<state.cards.length;n++){
   const card=state.cards[state.detailCount];await tab.goto(card.url);await tab.playwright.locator('#my-app-state').waitFor({state:'attached',timeoutMs:25000});
   const e=await tab.playwright.evaluate(()=>{const s=JSON.parse(document.querySelector('#my-app-state').textContent),v=s.VehicleDetails;return {url:location.href,storeId:s.StoreInfo?.HyperionId,vehicle:v&&{Vin:v.Vin,StockNumber:v.StockNumber,HyperionId:v.HyperionId,ActualHyperionId:v.ActualHyperionId,IsAvailabile:v.IsAvailabile,StockType:v.StockType,StockTypeForSite:v.StockTypeForSite,Make:v.Make,Model:v.Model,Year:v.Year,Trim:v.Trim,ExteriorColor:v.ExteriorColor,Mileage:v.Mileage,Certification:v.Certification,FuelType:v.FuelType,InventoryVehicleDetail:{PricingStack:v.InventoryVehicleDetail?.PricingStack,VehicleHistory:{CarfaxUrl:v.InventoryVehicleDetail?.VehicleHistory?.CarfaxUrl}}}};});
   if(e.vehicle?.Vin!==card.vin)throw Error('Detail page VIN changed or source denied access.');
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
