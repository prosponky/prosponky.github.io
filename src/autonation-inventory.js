import {verifiedCarfaxUrl} from './carfax.js';
const vinPattern=/^[A-HJ-NPR-Z0-9]{17}$/;
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
 const price=values[0]??null;
 if(evidence.cardPrice!==price)throw Error('AutoNation list and vehicle prices changed during collection.');
 if(condition==='NEW')throw Error('New AutoNation pricing requires separate verified MSRP semantics.');
 return {vin,stockNumber,condition:'used',year:v.Year,make:v.Make,model:v.Model,trim:String(v.Trim||'').trim(),color:String(v.ExteriorColor||'').trim(),interiorColor:typeof v.InteriorColor==='string'?v.InteriorColor.trim():'',mileage:typeof v.Mileage==='number'&&Number.isFinite(v.Mileage)&&v.Mileage>=0?v.Mileage:null,
  certified:['AN-Cert','CPO'].includes(v.Certification),certificationLabel:v.Certification==='AN-Cert'?'AutoNation Certified':v.Certification==='CPO'?'Certified pre-owned':'',
  fuelType:v.FuelType||'',advertisedPrice:price,priceLabel:config.salePriceLabel,msrp:null,dealerDiscount:null,discountKind:'',
  carfaxUrl:verifiedCarfaxUrl(details?.VehicleHistory?.CarfaxUrl),dealerListingUrl:url,sourceUrl:url,checkedAt,priceCheckedAt:checkedAt,physicalStoreId:String(v.ActualHyperionId),advertisingStoreId:config.storeId};
}
export function validateAutoNationFeed(data,config){
 if(data?.source!==config.origin||data.complete!==true||data.storeId!==config.storeId||!Number.isFinite(Date.parse(data.checkedAt))||Date.parse(data.checkedAt)>Date.now()||!Array.isArray(data.vehicles)||!Number.isInteger(data.advertisedTotal)||data.advertisedTotal!==data.detailCount)throw Error('AutoNation snapshot is incomplete or has invalid evidence.');
 const vins=new Set(),stocks=new Set();
 for(const v of data.vehicles){if(vins.has(v.vin)||stocks.has(v.stockNumber)||!verifiedAutoNationLink(v.dealerListingUrl,v.vin)||v.advertisingStoreId!==config.storeId||data.scope==='physical'&&v.physicalStoreId!==config.storeId||v.condition!=='used'||!(v.advertisedPrice===null||typeof v.advertisedPrice==='number'&&Number.isFinite(v.advertisedPrice)&&v.advertisedPrice>0))throw Error('AutoNation snapshot contains invalid or duplicate vehicles.');vins.add(v.vin);stocks.add(v.stockNumber);}
 if(!['physical','advertised'].includes(data.scope)||data.scope==='advertised'&&data.vehicles.length!==data.advertisedTotal)throw Error('AutoNation scope count is incomplete.');
 return data;
}
