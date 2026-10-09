import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {autoNationVehicle,validateAutoNationFeed} from '../src/autonation-inventory.js';
import {loadInventory,setInventoryAccess,inventoryDeal} from '../src/inventory.js';
const f=JSON.parse(readFileSync(new URL('./fixtures/autonation-evidence.json',import.meta.url)));
test('AutoNation uses explicit 1Price, exact identity, trim, color and dealer report',()=>{
 const v=autoNationVehicle(f.own,f.config,f.checkedAt);
 assert.equal(v.advertisedPrice,f.own.cardPrice);assert.equal(v.physicalStoreId,'2993');assert.ok(v.stockNumber);assert.ok(v.trim);assert.ok(v.color);assert.ok(v.carfaxUrl.startsWith('https://www.carfax.com/vehiclehistory/'));
 assert.throws(()=>autoNationVehicle({...f.own,expectedVin:f.neighbor.expectedVin},f.config,f.checkedAt));
 assert.throws(()=>autoNationVehicle({...f.own,cardPrice:1},f.config,f.checkedAt));
 const changed=structuredClone(f.own);changed.vehicle.InventoryVehicleDetail.PricingStack.Items.find(p=>p.Name==='Autonation1Price').Value++;
 assert.throws(()=>autoNationVehicle(changed,f.config,f.checkedAt));
});
test('AutoNation physical scope excludes nearby advertised vehicles and rejects partial snapshots',()=>{
 const own=autoNationVehicle(f.own,f.config,f.checkedAt),neighbor=autoNationVehicle(f.neighbor,f.config,f.checkedAt);
 const data={source:f.config.origin,storeId:'2993',scope:'physical',checkedAt:f.checkedAt,complete:true,advertisedTotal:2,detailCount:2,vehicles:[own]};
 assert.equal(validateAutoNationFeed(data,f.config),data);
 assert.throws(()=>validateAutoNationFeed({...data,vehicles:[own,neighbor]},f.config));
 assert.throws(()=>validateAutoNationFeed({...data,detailCount:1},f.config));
 assert.throws(()=>validateAutoNationFeed({...data,vehicles:[own,own]},f.config));
});
test('AutoNation does not substitute an internal vehicle or monthly payment for missing 1Price',()=>{
 const e=structuredClone(f.own);e.vehicle.InventoryVehicleDetail.PricingStack.Items=e.vehicle.InventoryVehicleDetail.PricingStack.Items.filter(p=>!/^autonation1price$/i.test(p.Name));e.cardPrice=null;
 assert.equal(autoNationVehicle(e,f.config,f.checkedAt).advertisedPrice,null);
 e.vehicle.InventoryVehicleDetail.VehicleHistory.CarfaxUrl='https://evil.example/report';
 assert.equal(autoNationVehicle(e,f.config,f.checkedAt).carfaxUrl,null);
});
test('AutoNation group loads only its verified official map and quote uses its advertised price',async()=>{
 const vehicle=autoNationVehicle(f.own,f.config,f.checkedAt),urls=[],previous=globalThis.fetch;
 const data={source:f.config.origin,storeId:'2993',scope:'physical',checkedAt:f.checkedAt,complete:true,advertisedTotal:2,detailCount:2,vehicles:[vehicle]};
 globalThis.fetch=async url=>{urls.push(url);return {ok:true,json:async()=>structuredClone(data)};};
 try{setInventoryAccess('test-admin-assignment','AutoNation group');const feed=await loadInventory();assert.equal(feed.vehicles.length,1);assert.deepEqual(urls,['/inventory/autonation-jacksonville.json']);assert.equal(feed.vehicles[0].storeLabel,'AutoNation USA Jax');assert.equal(inventoryDeal(feed.vehicles[0],{}).price,String(f.own.cardPrice));setInventoryAccess('unassigned','');await assert.rejects(loadInventory());assert.equal(urls.length,1);}finally{globalThis.fetch=previous;setInventoryAccess('','');}
});
