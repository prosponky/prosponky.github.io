import {mkdir,writeFile,rename} from 'node:fs/promises';
import {dealerraterPage} from '../src/dealerrater-inventory.js';
const checkedAt=new Date().toISOString(),rows=new Map(),seenPages=new Set();let expected;
let url='https://www.dealerrater.com/classifieds/dealer/Greenway-Kia-at-the-Avenues-cars-26040/';
for(let pageNumber=1;url&&pageNumber<=100;pageNumber++){
 if(seenPages.has(url))throw Error('Inventory pagination repeated; previous snapshot retained.');seenPages.add(url);
 const response=await fetch(url,{signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error(`DealerRater returned HTTP ${response.status}; previous snapshot retained.`);
 const page=dealerraterPage(await response.text(),checkedAt);
 if(expected===undefined)expected=page.total;
 if(page.total!==expected)throw Error('Inventory count changed during collection; previous snapshot retained.');
 for(const row of page.vehicles){if(rows.has(row.vin))throw Error('Duplicate VIN across inventory pages; previous snapshot retained.');rows.set(row.vin,row);}
 console.log(`Page ${pageNumber}: ${rows.size} of ${expected} dealership vehicles`);
 url=page.next;
 if(url)await new Promise(resolve=>setTimeout(resolve,1000));
}
if(url||rows.size!==expected)throw Error('Incomplete inventory pagination; previous snapshot retained.');
if(![...rows.values()].some(r=>r.condition==='new')||![...rows.values()].some(r=>r.condition==='used'))throw Error('Missing inventory category; previous snapshot retained.');
await mkdir('public/inventory',{recursive:true});
await writeFile('public/inventory/greenway.json.tmp',JSON.stringify({dealer:'Greenway Kia at the Avenues',source:'DealerRater public listings',checkedAt,coverage:'Greenway inventory published on DealerRater; third-party availability and pricing may lag the dealer.',vehicles:[...rows.values()]}));
await rename('public/inventory/greenway.json.tmp','public/inventory/greenway.json');
console.log(`Saved ${rows.size} public DealerRater listings.`);
