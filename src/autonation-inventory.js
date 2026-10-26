import {verifiedCarfaxUrl} from './carfax.js';
const vinPattern=/^[A-HJ-NPR-Z0-9]{17}$/;
export const autoNationPromotions=Object.freeze({
 'one-price':'What you see is what you pay',
 'pre-qualification':'Get pre-qualified with zero impact',
 'appraisal':'Wondering What Your Car'
});
export function validateAutoNationPromotions(data,{allowLegacy=false}={}){
 const check=(tiles,count,total)=>{
  if(!Array.isArray(tiles)||!Number.isSafeInteger(count)||count!==tiles.length||count>Object.keys(autoNationPromotions).length||!Number.isSafeInteger(total)||total!==data.advertisedTotal+count)throw Error('AutoNation promotional reconciliation is incomplete.');
  const kinds=new Set();
  for(const tile of tiles){
   const matches=typeof tile?.text==='string'?Object.entries(autoNationPromotions).filter(([,label])=>tile.text.includes(label)):[];
   if(matches.length!==1||matches[0][0]!==tile.kind||kinds.has(tile.kind)||tile.vehicleLinks!==0)throw Error('AutoNation promotional evidence is unknown, duplicated or contains a vehicle link.');
   kinds.add(tile.kind);
  }
 };
 if(!Number.isSafeInteger(data.advertisedTotal)||data.advertisedTotal<1)throw Error('AutoNation advertised VIN total is invalid.');
 // Existing verified maps predate persisted tile evidence. They remain readable,
 // but every newly finalized/published snapshot must contain both listing passes.
 if(allowLegacy&&data.promotionalTiles===undefined&&data.recheckedPromotionalTiles===undefined&&data.recheckedResultsTotal===undefined){
  if(data.promotionalTileCount!==3||data.resultsTotal!==data.advertisedTotal+3)throw Error('Legacy AutoNation promotional reconciliation is incomplete.');
  return data;
 }
 check(data.promotionalTiles,data.promotionalTileCount,data.resultsTotal);
 check(data.recheckedPromotionalTiles,data.recheckedPromotionalTiles?.length,data.recheckedResultsTotal);
 return data;
}
export function verifiedAutoNationLink(value,vin){
 try{const u=new URL(value);return !u.username&&!u.password&&u.origin==='https://www.autonationusa.com'&&u.pathname.toUpperCase().startsWith('/CARS/'+vin.toUpperCase()+'/')&&vinPattern.test(vin.toUpperCase())?u.href:null;}catch{return null;}
}
export function autoNationVehicle(evidence,config,checkedAt){
 const v=evidence.vehicle,details=v?.InventoryVehicleDetail;
 const vin=String(v?.Vin||'').toUpperCase(),stockNumber=String(v?.StockNumber||'').trim();
 const url=verifiedAutoNationLink(evidence.url,vin);
 if(!url||vin!==evidence.expectedVin||!stockNumber||String(v.HyperionId)!==config.storeId||String(evidence.storeId)!==config.storeId||v.IsAvailabile!==true)throw Error('AutoNation vehicle identity or availability changed; retain the previous complete snapshot.');
 if(!/^\d+$/.test(String(v.ActualHyperionId||'')))throw Error('AutoNation physical store identity is unavailable.');
 const condition=String(v.StockTypeForSite||v.StockType).toUpperCase();
 if(!['USED','CPO','NEW'].includes(condition)||!v.Make||!v.Model||!Number.isInteger(v.Year))throw Error('AutoNation vehicle fields are incomplete.');
 // Only the explicit customer-facing 1Price is accepted. Internal vehicle,
 // payment and fee amounts are not substitutes for an advertised price.
 const entries=details?.PricingStack?.Items?.filter(p=>/^autonation1price$/i.test(p.Name))||[];
 const values=[...new Set(entries.map(p=>p.Value))];
 if(values.length>1||values.some(p=>typeof p!=='number'||!Number.isFinite(p)||p<=0))throw Error('AutoNation advertised price evidence is inconsistent.');
 const items=details?.PricingStack?.Items||[],base=items.filter(p=>p.Name==='VehiclePrice');
 // Some dealer detail pages omit the vehicle amount and put only filing fees
 // into their computed 1Price. That is missing price evidence, never a $499 car.
 const feeOnly=values.length===1&&base.length>0&&base.every(p=>p.Value===0)&&['lock','unlock'].every(mode=>{
  const one=items.find(p=>p.Name==='Autonation1Price'&&p.ItemDisplayMode===mode),vehicle=items.find(p=>p.Name==='VehiclePrice'&&p.ItemDisplayMode===mode);
  const fees=items.filter(p=>['Dealer Fee','Electronic Filing Fee'].includes(p.Name)&&p.ItemDisplayMode===mode);
  return one&&vehicle?.Value===0&&fees.length>0&&fees.every(p=>typeof p.Value==='number'&&Number.isFinite(p.Value)&&p.Value>=0)&&one.Value===fees.reduce((n,p)=>n+p.Value,0);
 });
 const price=feeOnly?null:values[0]??null;
 if(!feeOnly&&evidence.cardPrice!==price)throw Error('AutoNation list and vehicle prices changed during collection.');
 if(condition==='NEW')throw Error('New AutoNation pricing requires separate verified MSRP semantics.');
 return {vin,stockNumber,condition:'used',year:v.Year,make:v.Make,model:v.Model,trim:String(v.Trim||'').trim(),color:String(v.ExteriorColor||'').trim(),interiorColor:typeof v.InteriorColor==='string'?v.InteriorColor.trim():'',mileage:typeof v.Mileage==='number'&&Number.isFinite(v.Mileage)&&v.Mileage>=0?v.Mileage:null,
  certified:['AN-Cert','CPO'].includes(v.Certification),certificationLabel:v.Certification==='AN-Cert'?'AutoNation Certified':v.Certification==='CPO'?'Certified pre-owned':'',
  fuelType:v.FuelType||'',advertisedPrice:price,priceUnavailableReason:feeOnly?'Dealer detail contains fees without a vehicle price':'',priceLabel:config.salePriceLabel,msrp:null,dealerDiscount:null,discountKind:'',
  carfaxUrl:verifiedCarfaxUrl(details?.VehicleHistory?.CarfaxUrl),dealerListingUrl:url,sourceUrl:url,checkedAt,priceCheckedAt:checkedAt,physicalStoreId:String(v.ActualHyperionId),advertisingStoreId:config.storeId};
}
export function validateAutoNationFeed(data,config){
 if(data?.source!==config.origin||data.complete!==true||data.storeId!==config.storeId||!Number.isFinite(Date.parse(data.checkedAt))||Date.parse(data.checkedAt)>Date.now()||!Array.isArray(data.vehicles)||!Number.isInteger(data.advertisedTotal)||data.advertisedTotal!==data.detailCount)throw Error('AutoNation snapshot is incomplete or has invalid evidence.');
 const vins=new Set(),stocks=new Set();
 for(const v of data.vehicles){if(vins.has(v.vin)||stocks.has(v.stockNumber)||!verifiedAutoNationLink(v.dealerListingUrl,v.vin)||v.advertisingStoreId!==config.storeId||data.scope==='physical'&&v.physicalStoreId!==config.storeId||v.condition!=='used'||!(v.advertisedPrice===null||typeof v.advertisedPrice==='number'&&Number.isFinite(v.advertisedPrice)&&v.advertisedPrice>0))throw Error('AutoNation snapshot contains invalid or duplicate vehicles.');vins.add(v.vin);stocks.add(v.stockNumber);}
 if(!['physical','advertised'].includes(data.scope)||data.scope==='advertised'&&data.vehicles.length!==data.advertisedTotal)throw Error('AutoNation scope count is incomplete.');
 return data;
}
