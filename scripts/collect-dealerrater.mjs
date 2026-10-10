import {mergeInventoryPage,verifyListingCount,sameVehicleSnapshot} from './dealerrater-collection.mjs';
import {InventoryChangedError,collectWithFreshRetry} from './inventory-retry.mjs';
import {inventoryChanges} from '../src/inventory-changes.js';
import {mkdir,writeFile,rename,readFile} from 'node:fs/promises';
import {dealerraterPage} from '../src/dealerrater-inventory.js';
const configs={greenway:{name:'Greenway Kia at the Avenues',address:'10564 Philips',id:'26040',path:'/classifieds/dealer/Greenway-Kia-at-the-Avenues-cars-26040/'},'coggin-atlantic':{name:'Coggin Nissan On Atlantic',address:'10600 Atlantic Blvd',id:'3377',path:'/classifieds/dealer/Coggin-Nissan-On-Atlantic-cars-3377/'},'coggin-avenues':{name:'Coggin Nissan at the Avenues',address:'10859 Phillips Highway',id:'22911',path:'/classifieds/dealer/Coggin-Nissan-at-the-Avenues-cars-22911/'}};
const key=process.argv[2]||'greenway',dealer=configs[key];if(!dealer)throw Error('Unknown store');
let passes=0;
async function collectPass(){
passes++;
const checkedAt=new Date().toISOString(),rows=new Map(),seenPages=new Set();let expected,listed=0,duplicates=0;
let url='https://www.dealerrater.com'+dealer.path;
for(let pageNumber=1;url&&pageNumber<=100;pageNumber++){
 if(seenPages.has(url))throw Error('Inventory pagination repeated; previous snapshot retained.');seenPages.add(url);
 const response=await fetch(url,{signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error(`DealerRater returned HTTP ${response.status}; previous snapshot retained.`);
 const page=dealerraterPage(await response.text(),checkedAt,dealer);
 if(expected===undefined)expected=page.total;
 if(page.total!==expected)throw new InventoryChangedError('Inventory count changed during collection; previous snapshot retained.');
 duplicates+=mergeInventoryPage(rows,page.vehicles);listed+=page.vehicles.length;
 console.log(`Page ${pageNumber}: ${rows.size} of ${expected} dealership vehicles`);
 url=page.next;
 if(url)await new Promise(resolve=>setTimeout(resolve,1000));
}
if(url)throw new InventoryChangedError('Incomplete inventory pagination; previous snapshot retained.');verifyListingCount(rows,listed,expected,duplicates);
if(![...rows.values()].some(r=>r.condition==='new')||![...rows.values()].some(r=>r.condition==='used'))throw Error('Missing inventory category; previous snapshot retained.');
return {checkedAt,rows,duplicates,listed,expected};
}
const collected=await collectWithFreshRetry(collectPass,async error=>{
 console.warn(error.message+' Restarting once from the first page.');
 await new Promise(resolve=>setTimeout(resolve,2000));
});
if(collected.duplicates){if(passes>=2)throw Error('Duplicate listings require a stable confirmation pass; previous snapshot retained.');const confirmation=await collectPass();if(confirmation.duplicates&&(confirmation.expected!==collected.expected||confirmation.duplicates!==collected.duplicates||!sameVehicleSnapshot(collected.rows,confirmation.rows)))throw Error('Inventory changed during duplicate confirmation; previous snapshot retained.');Object.assign(collected,confirmation);console.log(collected.duplicates?'Confirmed '+collected.duplicates+' identical repeated listing(s) across two complete passes.':'Fresh complete pass contains no duplicate listings.');}
const {checkedAt,rows}=collected;
let previous;for(const path of [`inventory/${key}.json`,`public/inventory/${key}.json`]){try{previous=JSON.parse(await readFile(path,'utf8'));break;}catch{}}
const dailyChanges=inventoryChanges(previous,[...rows.values()],checkedAt);
await mkdir('public/inventory',{recursive:true});
await writeFile(`public/inventory/${key}.json.tmp`,JSON.stringify({dealer:dealer.name,source:'DealerRater public listings',checkedAt,dailyChanges,coverage:dealer.name+' inventory published on DealerRater; third-party availability and pricing may lag the dealer.',vehicles:[...rows.values()]}));
await rename(`public/inventory/${key}.json.tmp`,`public/inventory/${key}.json`);
console.log(`Saved ${rows.size} public DealerRater listings.`);
