// A complete official vehicle list can replace syndicated membership only when
// every row agrees with the separately collected VIN, stock and condition maps.
export function verifiedCogginVehicles(data,{origin,account},now=Date.now()){
 const checked=Date.parse(data?.checkedAt),vins=data?.inventoryVins,rows=data?.vehicles;
 if(data?.source!==origin||data?.account!==account||data?.complete!==true||!Number.isFinite(checked)||checked>now||!Array.isArray(vins)||!vins.length||data.total!==vins.length||new Set(vins).size!==vins.length||!Array.isArray(rows)||rows.length!==vins.length)return null;
 const seen=new Set();
 for(const row of rows){
  if(!row||!/^[A-HJ-NPR-Z0-9]{17}$/.test(row.vin)||!vins.includes(row.vin)||seen.has(row.vin)||typeof row.stockNumber!=='string'||!row.stockNumber.trim()||data.stockNumbers?.[row.vin]!==row.stockNumber||data.conditions?.[row.vin]!==row.condition||!['new','used'].includes(row.condition)||!Number.isInteger(row.year)||row.year<1900||row.year>2100||!['make','model'].every(key=>typeof row[key]==='string'&&row[key].trim())||row.checkedAt!==data.checkedAt)return null;
  let url;try{url=new URL(row.sourceUrl);}catch{return null;}
  if(url.origin!==origin||!/^\/(new|used|certified)\/[^/]+\/[^/]+\.htm$/.test(url.pathname)||data.stocks?.[row.stockNumber]!==url.href||(url.pathname.startsWith('/new/')?'new':'used')!==row.condition)return null;
  if(!['color','interiorColor','trim'].every(key=>typeof row[key]==='string')||row.mileage!==null&&(!Number.isFinite(row.mileage)||row.mileage<0))return null;
  seen.add(row.vin);
 }
 return rows;
}
