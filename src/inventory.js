import {reconcileOfficialAvailability} from './inventory-availability.js';
import {verifiedCarfaxUrl} from './carfax.js';
import {trimFromTitle} from './vehicle-trim.js';
import {usableCustomerCash} from './coggin-offers.js';
import {validateAutoNationFeed} from './autonation-inventory.js';
// Feed contract: each row has an exact stock number and VIN, condition,
// year/make/model, and explicitly labeled numeric prices in dollars.
const hostedInventory=globalThis.location?.hostname==='pocket-desking.pages.dev'||globalThis.location?.hostname?.endsWith('.pocket-desking.pages.dev');
const inventoryBase=import.meta.env?.VITE_INVENTORY_BASE_URL||(hostedInventory?'https://prosponky.github.io':'');
export const inventoryStores={'GW Kia Ave':{file:'greenway',origin:'https://www.greenwaykiaattheavenues.com'},'Coggin Nissan Atl':{file:'coggin-atlantic',origin:'https://www.cogginnissanatlantic.com',account:'cogginnissanonatlantic'},'Coggin Nissan Ave':{file:'coggin-avenues',origin:'https://www.nissanattheavenues.com',account:'cogginnissanattheavenues'}};
inventoryStores['Coggin group']={members:['Coggin Nissan Atl','Coggin Nissan Ave']};
inventoryStores['AutoNation USA Jax']={file:'autonation-jacksonville',origin:'https://www.autonationusa.com',storeId:'2993',officialFeed:true};
inventoryStores['AutoNation group']={members:['AutoNation USA Jax']};
let inventoryAccess={owner:'',store:'',revision:0};
export function setInventoryAccess(owner,store){if(inventoryAccess.owner!==owner||inventoryAccess.store!==store)inventoryAccess={owner,store,revision:inventoryAccess.revision+1};}
export function inventoryAccessMessage(){return inventoryAccess.store?'Inventory is not available for your assigned store yet.':'No store assigned. Ask your administrator to assign your store.';}
const stockKey=value=>String(value??'').trim().toUpperCase();
const colorFamilies={red:['red','scarlet','crimson','ruby','garnet'],blue:['blue'],black:['black','onyx','ebony'],white:['white'],gray:['gray','grey','gunmetal'],silver:['silver'],green:['green'],brown:['brown'],orange:['orange'],yellow:['yellow'],purple:['purple']};
export function inventoryColorLabel(value){
 const original=String(value??'').trim();
 const words=original.toLowerCase().replace(/[^a-z]+/g,' ').split(/\s+/);
 const matches=Object.entries(colorFamilies).filter(([,shades])=>shades.some(shade=>words.includes(shade))).map(([name])=>name);
 return matches.length===1?matches[0][0].toUpperCase()+matches[0].slice(1):original||'Color unavailable';
}
export function inventorySearchMatches(vehicle,query){
 const normalize=value=>String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const normalized=normalize(query);
 const certification=/\b(?:cpo|certified(?: pre owned| preowned)?)\b/g;
 const wantsCertified=certification.test(normalized);
 if(wantsCertified&&(vehicle.condition!=='used'||vehicle.certified!==true))return false;
 const tokens=normalized.replace(certification,' ').split(/\s+/).filter(Boolean);
 const details=normalize([vehicle.stockNumber,vehicle.vin,vehicle.make,vehicle.model,vehicle.trim,vehicle.year,vehicle.color,vehicle.condition,vehicle.vehicleTitle].filter(Boolean).join(' '));
 const color=normalize(vehicle.color);
 const colors={...colorFamilies,grey:colorFamilies.gray};
 return tokens.every(token=>tokens.length>1&&/^(19|20)\d{2}$/.test(token)?String(vehicle.year)===token:colors[token]?colors[token].some(shade=>color.split(' ').includes(shade)):details.includes(token));
}
const amount=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0?value:null;

export function parseInventoryCard(text,sourceUrl,condition,checkedAt){
 const stockNumber=text.match(/Stock\s*:\s*([A-Z0-9-]+)/i)?.[1]?.toUpperCase();
 const vin=text.match(/VIN\s*:\s*([A-HJ-NPR-Z0-9]{17})\b/i)?.[1]?.toUpperCase();
 const title=text.match(/(?:New|Pre-Owned|Used|Certified(?: Pre-Owned)?)\s+(20\d{2}|19\d{2})\s+([^\n]+)/i);
 if(!stockNumber||!vin||!title||!sourceUrl?.startsWith('https://www.greenwaykiaattheavenues.com/inventory/'))throw Error('Unrecognized inventory card; snapshot not published.');
 const priceFor=label=>{const match=text.match(new RegExp('(?:^|\\n)'+label+'\\s*[-]?\\$([\\d,]+(?:\\.\\d{1,2})?)','i'));return match?Number(match[1].replaceAll(',','')):null;};
 const name=title[2].trim(),make=name.startsWith('Kia ')?'Kia':name.split(' ')[0],model=name.slice(make.length).trim().split(' ')[0];
 const msrp=priceFor('MSRP'),dealerDiscount=priceFor('Greenway Savings');
 return {stockNumber,vin,condition,year:Number(title[1]),make,model,vehicleTitle:name,msrp,
  dealerDiscount,discountKind:dealerDiscount===null?'':'dealer',
  advertisedPrice:priceFor('Greenway Price[^\\n$]*')??priceFor('Sale Price')??priceFor('Our Price'),sourceUrl,checkedAt};
}

export async function loadInventory(){
 const access=inventoryAccess;if(access.store!=='__all__'&&!inventoryStores[access.store])throw Error(inventoryAccessMessage());
 const names=access.store==='__all__'?Object.keys(inventoryStores).filter(name=>inventoryStores[name].file):inventoryStores[access.store].members||[access.store];
 const feeds=await Promise.all(names.map(async name=>{
 const config=inventoryStores[name];
 const response=await fetch(inventoryBase+'/inventory/'+config.file+'.json',{cache:'no-store'});
 if(!response.ok)throw Error('Inventory is not available yet. Enter vehicle details manually.');
 let data=await response.json();
 if(!Array.isArray(data.vehicles)||!Number.isFinite(Date.parse(data.checkedAt)))throw Error('Inventory data is invalid. Use manual entry.');
 if(config.officialFeed)data=validateAutoNationFeed(data,config);
 // Direct dealer links are matched by exact VIN; never construct guessed vehicle URLs.
 if(!config.officialFeed)try{
  const response=await fetch(inventoryBase+'/inventory/'+(config.account?config.file+'-links.json':'dealer-links.json'),{cache:'no-store'});
  if(response.ok){const map=await response.json();if(config.account)data=reconcileOfficialAvailability(data,map,config);for(const row of data.vehicles){const link=config.account?verifiedCogginLink(map.stocks?.[stockKey(row.stockNumber)],config.origin):verifiedDealerLink(map.links?.[stockKey(row.vin)],row.vin);if(link)row.dealerListingUrl=link;if(config.account&&link)row.certified=row.condition==='used'&&map.certified?.[row.vin]===true;if(config.account&&link&&row.condition==='used')row.carfaxUrl=verifiedCarfaxUrl(map.carfax?.[row.vin]);if(config.account&&link&&typeof map.trims?.[row.vin]==='string')row.trim=map.trims[row.vin].trim();if(config.account&&row.condition!=='new'){const price=map.retailPrices?.[row.vin];row.retailPrice=priceEvidenceAvailable(map)&&typeof price==='number'&&Number.isFinite(price)&&price>0?price:null;}if(config.account&&row.condition==='new') {row.rebateOffers=usableCustomerCash(map.offers?.[row.vin],map.checkedAt);row.offerCheckedAt=map.checkedAt;}}}
 }catch{} // Inventory and pricing remain usable if the separate link map is unavailable.
 if(!config.account&&!config.officialFeed){
  let official;try{const response=await fetch(inventoryBase+'/inventory/greenway-prices.json',{cache:'no-store'});if(response.ok)official=await response.json();}catch{}
  let reports;try{const response=await fetch(inventoryBase+'/inventory/greenway-carfax.json',{cache:'no-store'});if(response.ok)reports=await response.json();}catch{}
  for(const row of data.vehicles){
   const report=reports?.reports?.[stockKey(row.vin)];if(row.condition==='used'&&reports?.source===config.origin&&report?.stockNumber===row.stockNumber&&verifiedDealerLink(report.listingUrl,row.vin))row.carfaxUrl=verifiedCarfaxUrl(report.url);
   const record=official?.prices?.[stockKey(row.vin)];
   if(verifiedDealerLink(record?.url,row.vin)&&record.stockNumber===row.stockNumber&&record.condition===row.condition){row.trim=trimFromTitle(row,record.vehicleTitle);row.certified=row.condition==='used'&&record.certified===true;}
   if(row.condition!== 'new')row.advertisedPrice=priceEvidenceAvailable(official||{})&&verifiedDealerLink(record?.url,row.vin)&&typeof record?.price==='number'&&Number.isFinite(record.price)&&record.price>0?record.price:null;
  }
 }
 for(const row of data.vehicles){row.storeLabel=name;if(config.account&&!row.dealerListingUrl){row.dealerListingUrl=config.origin+'/all-inventory/index.htm?accountId='+config.account+'&search='+encodeURIComponent(row.stockNumber);row.dealerSearch=true;}}
 return {...data,storeLabel:name};
 }));
 if(access!==inventoryAccess)throw Error('Your store changed. Reopen Inventory.');
 if(feeds.length===1)return feeds[0];
 return {storeLabel:access.store,checkedAt:feeds.map(f=>f.checkedAt).sort()[0],vehicles:feeds.flatMap(f=>f.vehicles),feeds,dailyChanges:{date:feeds.map(f=>f.dailyChanges?.date).filter(Boolean).sort().at(-1),addedVins:feeds.filter(f=>f.dailyChanges?.date===feeds.map(x=>x.dailyChanges?.date).filter(Boolean).sort().at(-1)).flatMap(f=>f.dailyChanges?.addedVins||[])}};
}
export function verifiedCogginLink(value,origin){try{const url=new URL(value);return url.origin===origin&&/^\/(new|used|certified)\/[^/]+\/[^/]+\.htm$/.test(url.pathname)?url.href:null;}catch{return null;}}
export function verifiedDealerLink(value,vin){
 try{const url=new URL(value);return url.origin==='https://www.greenwaykiaattheavenues.com'&&url.pathname.startsWith('/inventory/')&&url.pathname.toUpperCase().endsWith('-'+stockKey(vin)+'/')&&/^[A-HJ-NPR-Z0-9]{17}$/.test(stockKey(vin))?url.href:null;}catch{return null;}
}

function priceEvidenceAvailable(data,now=Date.now()){
 const checkedAt=Date.parse(data.checkedAt);
 return Number.isFinite(checkedAt)&&checkedAt<=now;
}

export function inventoryFresh(data,now=Date.now()){
 const age=now-Date.parse(data.checkedAt);
 return Number.isFinite(age)&&age>=0&&age<=24*60*60*1000;
}

export function stockMatches(rows,query){
 const key=stockKey(query);
 if(!key)return [];
 const exact=rows.filter(row=>stockKey(row.stockNumber)===key);
 if(exact.length)return exact;
 if(key.length!==4)return [];
 // Return every match. The UI must ask the user to choose when length > 1.
 return rows.filter(row=>stockKey(row.stockNumber).endsWith(key)||stockKey(row.vin).endsWith(key));
}

export function inventoryDisplayPrice(row){return row.condition==='new'?row.msrp:inventoryStores[row.storeLabel]?.account?row.retailPrice:row.advertisedPrice;}
export function inventoryDeal(row,previous){
 const stockNumber=stockKey(row.stockNumber),vin=stockKey(row.vin);
 if(!stockNumber||!['new','used'].includes(row.condition))throw Error('Inventory vehicle is missing its stock number or condition.');
 const price=amount(inventoryDisplayPrice(row));
 // Do not infer a discount from MSRP minus an advertised price: that may
 // include incentives. Only a feed field explicitly marked dealer discount.
 const discount=row.condition==='new'&&row.discountKind==='dealer'?amount(row.dealerDiscount):null;
 if(price!==null&&discount!==null&&discount>price)throw Error('Inventory discount exceeds the vehicle price.');
 return {...previous,stockNumber,vin,condition:row.condition,year:String(row.year??''),makeId:String(row.makeId??''),model:String(row.model??''),
  vehicle:[row.year,row.make,row.model,'Stock '+stockNumber].filter(Boolean).join(' '),vehicleAuto:true,
  price:price===null?'':String(price),discount:discount===null?'':String(discount),
  // A replacement vehicle must not carry a rebate from the previous car.
  rebate:'',rebateOffers:row.condition==='new'?row.rebateOffers||[]:[],offerCheckedAt:row.offerCheckedAt||'',offerStock:stockNumber,offerVin:vin,inventorySource:row.sourceUrl||'',inventoryCheckedAt:row.checkedAt||''};
}


