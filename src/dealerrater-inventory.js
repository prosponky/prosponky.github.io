const origin='https://www.dealerrater.com';
const inventoryPath='/classifieds/dealer/Greenway-Kia-at-the-Avenues-cars-26040/';
export function dealerraterPage(html,checkedAt){
 if(!html.includes('Greenway Kia at the Avenues')||!html.includes('10564 Philips'))throw Error('DealerRater dealership identity is missing.');
 const total=Number(html.match(/Inventory\s*\((\d+)\)/)?.[1]);
 if(!Number.isInteger(total)||total<1)throw Error('DealerRater inventory count is missing.');
 const cars=[...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1])).filter(r=>r['@type']==='Car');
 const visibleHtml=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
 const cards=visibleHtml.split(/<div\s+class="[^"]*\bvehicle-card\b[^"]*">/).slice(1);
 const vehicles=cars.map(car=>{
  const vin=String(car.vehicleIdentificationNumber||'').toUpperCase(),stockNumber=String(car.sku||'').trim().toUpperCase();
  const offer=car.offers,url=new URL(offer?.url||'');
  if(!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)||!stockNumber||url.origin!==origin||!url.pathname.endsWith('-26040/')||!url.pathname.includes('-ad-'+vin+'-')||offer.seller!=='Greenway Kia at the Avenues'||offer.priceCurrency!=='USD'||!String(offer.availability).endsWith('/InStock'))throw Error('DealerRater listing identity is invalid.');
  const condition=String(car.itemCondition).endsWith('/NewCondition')?'new':String(car.itemCondition).endsWith('/UsedCondition')?'used':null;
  const card=cards.find(text=>text.includes(url.pathname));
  if(!condition||!card||!car.modelDate||!car.manufacturer||!car.model)throw Error('DealerRater vehicle details are incomplete.');
  const dollars=value=>{const n=Number(String(value).replaceAll(',',''));if(!Number.isFinite(n)||n<=0)throw Error('DealerRater price is invalid.');return n;};
  const msrpText=card.match(/MSRP:\s*\$([\d,]+(?:\.\d{1,2})?)/)?.[1];
  return {stockNumber,vin,condition,year:Number(car.modelDate),make:car.manufacturer,model:car.model,color:String(car.color||'').trim(),mileage:car.mileageFromOdometer!==undefined&&car.mileageFromOdometer!==''&&Number.isFinite(Number(car.mileageFromOdometer))&&Number(car.mileageFromOdometer)>=0?Number(car.mileageFromOdometer):null,
   msrp:msrpText?dollars(msrpText):null,advertisedPrice:offer.price===null||offer.price===undefined||String(offer.price).trim()===''||Number(offer.price)===0?null:dollars(offer.price),dealerDiscount:null,discountKind:'',
   sourceName:'DealerRater',sourceUrl:url.href,checkedAt};
 });
 if(!vehicles.length)throw Error('DealerRater inventory is empty.');
 const nextMatch=html.match(/<a\b[^>]*href="([^"]+)"[^>]*rel="next\b[^\"]*"/);
 const next=nextMatch?new URL(nextMatch[1],origin):null;
 if(next&&(next.origin!==origin||!next.pathname.startsWith(inventoryPath)||!/\/page\d+\/$/.test(next.pathname)))throw Error('DealerRater pagination left the dealership.');
 return {total,vehicles,next:next?.href||null};
}
