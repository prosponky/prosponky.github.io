import {mkdir,writeFile,rename} from 'node:fs/promises';
import {truecarPage} from '../src/truecar-inventory.js';

const checkedAt=new Date().toISOString(),vehicles=new Map();
for(const [condition,path] of [['new','/new-cars-for-sale/listings/kia/location-jacksonville-fl/'],['used','/used-cars-for-sale/listings/location-jacksonville-fl/']]){
 const signatures=new Set();let categoryCount=0;
 for(let number=1;number<=100;number++){
  const url=new URL(path,'https://www.truecar.com');url.searchParams.set('page',number);
  const response=await fetch(url,{signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error(`TrueCar returned ${response.status}; previous snapshot retained.`);
  const page=truecarPage(await response.text(),checkedAt);
  if(signatures.has(page.signature))throw Error('TrueCar repeated a page; previous snapshot retained.');
  signatures.add(page.signature);
  for(const row of page.vehicles){if(row.condition!==condition)throw Error('TrueCar returned the wrong vehicle category.');vehicles.set(row.vin,row);categoryCount++;}
  console.log(`${condition}: page ${number}, ${vehicles.size} Greenway vehicles`);
  if(!page.hasNextPage)break;
  if(number===100)throw Error('TrueCar pagination exceeded its limit; previous snapshot retained.');
  await new Promise(resolve=>setTimeout(resolve,1000));
 }
 if(!categoryCount)throw Error(`No Greenway ${condition} listings; previous snapshot retained.`);
}
await mkdir('public/inventory',{recursive:true});
const data={dealer:'Greenway Kia at the Avenues',source:'TrueCar public listings',checkedAt,coverage:'Greenway listings available on TrueCar; may differ from dealership inventory.',vehicles:[...vehicles.values()]};
await writeFile('public/inventory/greenway.json.tmp',JSON.stringify(data));
await rename('public/inventory/greenway.json.tmp','public/inventory/greenway.json');
console.log(`Saved ${vehicles.size} TrueCar Greenway listings.`);
