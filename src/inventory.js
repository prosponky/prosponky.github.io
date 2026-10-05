// Feed contract: each row has an exact stock number and VIN, condition,
// year/make/model, and explicitly labeled numeric prices in dollars.
const stockKey=value=>String(value??'').trim().toUpperCase();
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
 const response=await fetch('/inventory/greenway.json',{cache:'no-store'});
 if(!response.ok)throw Error('Inventory is not available yet. Use VIN or manual entry.');
 const data=await response.json();
 if(!Array.isArray(data.vehicles)||!Number.isFinite(Date.parse(data.checkedAt)))throw Error('Inventory data is invalid. Use manual entry.');
 return data;
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
 return rows.filter(row=>stockKey(row.stockNumber).endsWith(key));
}

export function inventoryDeal(row,previous){
 const stockNumber=stockKey(row.stockNumber),vin=stockKey(row.vin);
 if(!stockNumber||!['new','used'].includes(row.condition))throw Error('Inventory vehicle is missing its stock number or condition.');
 const price=amount(row.condition==='new'?row.msrp:row.advertisedPrice);
 // Do not infer a discount from MSRP minus an advertised price: that may
 // include incentives. Only a feed field explicitly marked dealer discount.
 const discount=row.condition==='new'&&row.discountKind==='dealer'?amount(row.dealerDiscount):null;
 if(price!==null&&discount!==null&&discount>price)throw Error('Inventory discount exceeds the vehicle price.');
 return {...previous,stockNumber,vin,condition:row.condition,year:String(row.year??''),makeId:String(row.makeId??''),model:String(row.model??''),
  vehicle:[row.year,row.make,row.model,'Stock '+stockNumber].filter(Boolean).join(' '),vehicleAuto:true,
  price:price===null?'':String(price),discount:discount===null?'':String(discount),
  // A replacement vehicle must not carry a rebate from the previous car.
  rebate:'',inventorySource:row.sourceUrl||'',inventoryCheckedAt:row.checkedAt||''};
}
