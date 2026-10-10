import {InventoryChangedError} from './inventory-retry.mjs';
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
