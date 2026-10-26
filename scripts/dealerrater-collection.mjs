import {InventoryChangedError} from './inventory-retry.mjs';
export class InventoryCategoryCoverageError extends Error {
 constructor(coverage){
  const missing=coverage.missingCategories.join(' and ');
  super(`DealerRater coverage is incomplete: ${coverage.counts.new} new and ${coverage.counts.used} used vehicles (${coverage.listed} listings of ${coverage.expected} advertised); ${missing} inventory is missing. Previous snapshot retained.`);
  this.code='PUBLIC_SOURCE_CATEGORY_MISSING';this.coverage=coverage;
 }
}
export function verifyCategoryCoverage(rows,listed,expected){
 const counts={new:0,used:0};
 for(const row of rows.values()){
  if(!Object.hasOwn(counts,row.condition))throw Error('Invalid public inventory category; previous snapshot retained.');
  counts[row.condition]++;
 }
 const coverage={expected,listed,uniqueVehicles:rows.size,counts,missingCategories:Object.keys(counts).filter(key=>counts[key]===0)};
 if(coverage.missingCategories.length)throw new InventoryCategoryCoverageError(coverage);
 return coverage;
}
export function mergeInventoryPage(rows,vehicles){
 let duplicates=0;
 for(const row of vehicles){const prior=rows.get(row.vin);if(prior){if(JSON.stringify(prior)!==JSON.stringify(row))throw new InventoryChangedError('Conflicting details for repeated VIN; previous snapshot retained.');duplicates++;}else rows.set(row.vin,row);}
 return duplicates;
}
export function verifyListingCount(rows,listed,expected,duplicates){
 if(listed!==expected||rows.size+duplicates!==expected)throw new InventoryChangedError('Incomplete inventory pagination; previous snapshot retained.');
}
export function sameVehicleSnapshot(a,b){
 const comparable=row=>{const {checkedAt,...rest}=row;return JSON.stringify(rest);};
 return a.size===b.size&&[...a].every(([vin,row])=>b.has(vin)&&comparable(row)===comparable(b.get(vin)));
}
