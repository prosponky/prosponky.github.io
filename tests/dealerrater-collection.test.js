import test from 'node:test';import assert from 'node:assert/strict';
import {mergeInventoryPage,verifyListingCount,sameVehicleSnapshot,verifyCategoryCoverage} from '../scripts/dealerrater-collection.mjs';
const row={vin:'VIN1',stockNumber:'STOCK1',advertisedPrice:20000,checkedAt:'first'};
test('identical listing repeats reconcile without losing a vehicle',()=>{const rows=new Map();assert.equal(mergeInventoryPage(rows,[row]),0);assert.equal(mergeInventoryPage(rows,[{...row}]),1);verifyListingCount(rows,2,2,1);assert.equal(rows.size,1);});
test('duplicate with changed price or identity fails',()=>{for(const changed of [{advertisedPrice:1},{stockNumber:'OTHER'}])assert.throws(()=>mergeInventoryPage(new Map([[row.vin,row]]),[{...row,...changed}]),/Conflicting/);});
test('missing listing count still fails',()=>assert.throws(()=>verifyListingCount(new Map([[row.vin,row]]),2,3,1),/Incomplete/));
test('confirmation ignores collection time but checks prices and exact VIN set',()=>{const a=new Map([[row.vin,row]]);assert.equal(sameVehicleSnapshot(a,new Map([[row.vin,{...row,checkedAt:'second'}]])),true);assert.equal(sameVehicleSnapshot(a,new Map([[row.vin,{...row,advertisedPrice:1}]])),false);assert.equal(sameVehicleSnapshot(a,new Map([['VIN2',{...row,vin:'VIN2'}]])),false);});
test('complete pagination of a five-used-only feed still rejects absent new inventory with useful diagnostics',()=>{
 const rows=new Map(Array.from({length:5},(_,i)=>['VIN'+i,{condition:'used'}]));
 assert.throws(()=>verifyCategoryCoverage(rows,5,5),error=>error.code==='PUBLIC_SOURCE_CATEGORY_MISSING'&&error.coverage.counts.new===0&&error.coverage.counts.used===5&&/5 listings of 5 advertised/.test(error.message));
 rows.set('NEW',{condition:'new'});assert.deepEqual(verifyCategoryCoverage(rows,6,6).missingCategories,[]);
});
