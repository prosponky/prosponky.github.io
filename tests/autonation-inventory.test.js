import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {autoNationVehicle,validateAutoNationFeed,validateAutoNationPromotions,autoNationPromotions} from '../src/autonation-inventory.js';
import {loadInventory,setInventoryAccess,inventoryDeal} from '../src/inventory.js';
import {finalizeAutoNationRun} from '../scripts/autonation-browser-run.mjs';
const f=JSON.parse(readFileSync(new URL('./fixtures/autonation-evidence.json',import.meta.url)));
function promotionEvidence(){const promotionalTiles=Object.entries(autoNationPromotions).slice(1).map(([kind,text])=>({kind,text,vehicleLinks:0}));return {advertisedTotal:315,resultsTotal:317,promotionalTileCount:2,promotionalTiles,recheckedResultsTotal:317,recheckedPromotionalTiles:structuredClone(promotionalTiles)};}
test('promotion validation requires both complete listing passes and recognized distinct nonvehicle tiles',()=>{
 const data=promotionEvidence();assert.equal(validateAutoNationPromotions(data),data);
 for(const mutate of [d=>delete d.recheckedPromotionalTiles,d=>d.resultsTotal++,d=>d.promotionalTileCount++,d=>d.promotionalTiles[0].kind='unknown',d=>d.promotionalTiles[0].text='Unknown ad',d=>d.promotionalTiles[0].vehicleLinks=1,d=>d.recheckedPromotionalTiles[0]=d.recheckedPromotionalTiles[1],d=>d.advertisedTotal--]){const bad=structuredClone(data);mutate(bad);assert.throws(()=>validateAutoNationPromotions(bad),/AutoNation/);}
});
test('legacy three-promo maps stay readable but cannot be freshly finalized or published',()=>{
 const data={advertisedTotal:261,resultsTotal:264,promotionalTileCount:3};assert.equal(validateAutoNationPromotions(data,{allowLegacy:true}),data);assert.throws(()=>validateAutoNationPromotions(data),/incomplete/);
 assert.throws(()=>validateAutoNationPromotions({...data,promotionalTileCount:2,resultsTotal:263},{allowLegacy:true}),/Legacy/);
});
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

test('fee-only computed 1Price stays unavailable instead of publishing a filing fee as the vehicle price',()=>{
 const e=structuredClone(f.own);e.cardPrice=19902;e.vehicle.InventoryVehicleDetail.PricingStack.Items=['lock','unlock'].flatMap(ItemDisplayMode=>[{Name:'VehiclePrice',Value:0,ItemDisplayMode},{Name:'Dealer Fee',Value:0,ItemDisplayMode},{Name:'Electronic Filing Fee',Value:499,ItemDisplayMode},{Name:'Autonation1Price',Value:499,ItemDisplayMode}]);
 const row=autoNationVehicle(e,f.config,f.checkedAt);assert.equal(row.advertisedPrice,null);assert.match(row.priceUnavailableReason,/without a vehicle price/);
 const zero=structuredClone(e);zero.vehicle.InventoryVehicleDetail.PricingStack.Items.forEach(item=>item.Value=0);assert.equal(autoNationVehicle(zero,f.config,f.checkedAt).advertisedPrice,null);
 for(const change of [x=>x.vehicle.InventoryVehicleDetail.PricingStack.Items[0].Value=100,x=>x.vehicle.InventoryVehicleDetail.PricingStack.Items[2].Value=498,x=>x.vehicle.InventoryVehicleDetail.PricingStack.Items.pop()]){const invalid=structuredClone(e);change(invalid);assert.throws(()=>autoNationVehicle(invalid,f.config,f.checkedAt));}
});
test('AutoNation group loads only its verified official map and quote uses its advertised price',async()=>{
 const vehicle=autoNationVehicle(f.own,f.config,f.checkedAt),urls=[],previous=globalThis.fetch;
 const data={source:f.config.origin,storeId:'2993',scope:'physical',checkedAt:f.checkedAt,complete:true,advertisedTotal:2,detailCount:2,vehicles:[vehicle]};
 globalThis.fetch=async url=>{urls.push(url);return {ok:true,json:async()=>structuredClone(data)};};
 try{setInventoryAccess('test-admin-assignment','AutoNation group');const feed=await loadInventory();assert.equal(feed.vehicles.length,1);assert.deepEqual(urls,['/inventory/autonation-jacksonville.json']);assert.equal(feed.vehicles[0].storeLabel,'AutoNation USA Jax');assert.equal(inventoryDeal(feed.vehicles[0],{}).price,String(f.own.cardPrice));setInventoryAccess('unassigned','');await assert.rejects(loadInventory());assert.equal(urls.length,1);}finally{globalThis.fetch=previous;setInventoryAccess('','');}
});
test('finalizer independently rejects invalid dates and missing or changed final VIN evidence before writing',async()=>{
 const stamp=new Date().toISOString(),card={vin:f.own.expectedVin,url:f.own.url,price:f.own.cardPrice,priceLabel:f.config.salePriceLabel,store:f.config.name},promotionalTiles=Object.entries(autoNationPromotions).slice(1).map(([kind,text])=>({kind,text,vehicleLinks:0}));
 const state={phase:'done',startedAt:stamp,listRecheckedAt:stamp,total:1,cards:[card],evidence:[f.own],detailCount:1,resultsTotal:3,promotionalTileCount:2,promotionalTiles,confirmation:{phase:'details',total:1,cards:[structuredClone(card)],resultsTotal:3,promotionalTiles:structuredClone(promotionalTiles)}};
 for(const change of [s=>s.startedAt='invalid',s=>s.listRecheckedAt='invalid',s=>s.listRecheckedAt='2000-01-01',s=>s.listRecheckedAt=new Date(Date.now()+10000).toISOString(),s=>s.confirmation.cards=[],s=>s.confirmation.cards[0].price++,s=>s.confirmation.phase='list']){
  const invalid=structuredClone(state);change(invalid);await assert.rejects(finalizeAutoNationRun(invalid,{config:f.config,scope:'physical',snapshot:null}),/Incomplete/);
 }
});
