import {mkdir,writeFile,rename} from 'node:fs/promises';
import {marketcheckPage} from '../src/marketcheck-inventory.js';

// Authenticated, documented inventory service. Never expose the API key in
// the browser bundle, published snapshot, or network error output.
const key=process.env.MARKETCHECK_API_KEY;
if(!key)throw Error('MarketCheck API access is not configured; no snapshot changed.');
const checkedAt=new Date().toISOString(),rows=[],seen=new Set();let expected;
const maxCalls=Number(process.env.INVENTORY_MAX_CALLS||1);let calls=0;
if(!Number.isInteger(maxCalls)||maxCalls<1||maxCalls>10)throw Error('Invalid inventory call limit.');
for(let start=0;start<10000;){
 if(++calls>maxCalls)throw Error('Inventory call limit reached; previous snapshot retained.');
 const url=new URL('https://api.marketcheck.com/v2/dealerships/inventory');
 for(const [k,v] of Object.entries({api_key:key,source:'greenwaykiaattheavenues.com',start:String(start),rows:'1500',append_api_key:'false'}))url.searchParams.set(k,v);
 let response;try{response=await fetch(url,{signal:AbortSignal.timeout(30000)});}catch{throw Error('Inventory service connection failed; previous snapshot retained.');}
 if(!response.ok)throw Error(`Inventory service returned HTTP ${response.status}; previous snapshot retained.`);
 const page=marketcheckPage(await response.json(),checkedAt);
 if(expected===undefined)expected=page.total;
 if(expected!==page.total||!page.vehicles.length)throw Error('Inventory count changed or pagination is incomplete; previous snapshot retained.');
 for(const row of page.vehicles){if(seen.has(row.listingId))throw Error('Inventory pagination repeated; previous snapshot retained.');seen.add(row.listingId);rows.push(row);}
 start+=page.vehicles.length;
 if(start===expected)break;
 if(start>expected||start>=10000)throw Error('Inventory pagination limit exceeded; previous snapshot retained.');
}
if(rows.length!==expected)throw Error('Incomplete inventory; previous snapshot retained.');
// Syndication can include duplicate records. Conflicting prices for one VIN
// need review rather than an arbitrary choice of the cheaper listing.
const unique=new Map();
for(const row of rows){const old=unique.get(row.vin);if(old&&(old.stockNumber!==row.stockNumber||old.msrp!==row.msrp||old.advertisedPrice!==row.advertisedPrice))throw Error('Conflicting duplicate vehicle records; previous snapshot retained.');unique.set(row.vin,row);}
await mkdir('public/inventory',{recursive:true});
await writeFile('public/inventory/greenway.json.tmp',JSON.stringify({dealer:'Greenway Kia at the Avenues',source:'MarketCheck licensed inventory',checkedAt,vehicles:[...unique.values()]}));
await rename('public/inventory/greenway.json.tmp','public/inventory/greenway.json');
console.log(`Saved ${unique.size} verified dealership listings.`);
