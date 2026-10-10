import test from 'node:test';import assert from 'node:assert/strict';
import {mergeInventoryPage,verifyListingCount,sameVehicleSnapshot} from '../scripts/dealerrater-collection.mjs';
const row={vin:'VIN1',stockNumber:'STOCK1',advertisedPrice:20000,checkedAt:'first'};
test('identical listing repeats reconcile without losing a vehicle',()=>{const rows=new Map();assert.equal(mergeInventoryPage(rows,[row]),0);assert.equal(mergeInventoryPage(rows,[{...row}]),1);verifyListingCount(rows,2,2,1);assert.equal(rows.size,1);});
test('duplicate with changed price or identity fails',()=>{for(const changed of [{advertisedPrice:1},{stockNumber:'OTHER'}])assert.throws(()=>mergeInventoryPage(new Map([[row.vin,row]]),[{...row,...changed}]),/Conflicting/);});
test('missing listing count still fails',()=>assert.throws(()=>verifyListingCount(new Map([[row.vin,row]]),2,3,1),/Incomplete/));
test('confirmation ignores collection time but checks prices and exact VIN set',()=>{const a=new Map([[row.vin,row]]);assert.equal(sameVehicleSnapshot(a,new Map([[row.vin,{...row,checkedAt:'second'}]])),true);assert.equal(sameVehicleSnapshot(a,new Map([[row.vin,{...row,advertisedPrice:1}]])),false);assert.equal(sameVehicleSnapshot(a,new Map([['VIN2',{...row,vin:'VIN2'}]])),false);});
