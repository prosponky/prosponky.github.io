import test from 'node:test';
import assert from 'node:assert/strict';
import {verifiedCogginVehicles} from '../src/coggin-inventory.js';
import {reconcileOfficialAvailability} from '../src/inventory-availability.js';
import {loadInventory,setInventoryAccess} from '../src/inventory.js';
const now=Date.now(),checkedAt=new Date(now-60000).toISOString();
const config={origin:'https://www.cogginnissanatlantic.com',account:'cogginnissanonatlantic'};
const vin='1N4BL4DV0SN300001',other='1N4BL4DV0SN300002',stock='OFFICIAL1',url=config.origin+'/used/Nissan/2025-Nissan-Altima-abc.htm';
function snapshot(){return {source:config.origin,account:config.account,checkedAt,complete:true,total:1,inventoryVins:[vin],stockNumbers:{[vin]:stock},conditions:{[vin]:'used'},stocks:{[stock]:url},vehicles:[{vin,stockNumber:stock,condition:'used',year:2025,make:'Nissan',model:'Altima',trim:'SV',color:'Blue',interiorColor:'Sport',mileage:100,sourceUrl:url,checkedAt}],dailyChanges:{addedVins:[vin]},retailPrices:{[vin]:18000},priceCheckedAt:{[vin]:'2026-10-01T12:00:00Z'},priceRetained:{[vin]:true},trims:{[vin]:'SV'},interiorColors:{[vin]:'Sport'},certified:{[vin]:false},carfax:{[vin]:null},offers:{[vin]:[]}};}
test('complete official rows add an arrival missing from syndicated inventory and remove absent VINs',()=>{
 const feed={checkedAt:new Date(now-120000).toISOString(),vehicles:[{vin:other}]},data=snapshot();
 const result=reconcileOfficialAvailability(feed,data,{...config,now});
 assert.deepEqual(result.vehicles,data.vehicles);assert.equal(result.checkedAt,checkedAt);assert.notEqual(result.vehicles[0],data.vehicles[0]);assert.deepEqual(result.dailyChanges.addedVins,[vin]);
});
test('mismatched or partial official vehicle rows cannot replace membership',()=>{
 for(const mutate of [d=>d.vehicles=[],d=>d.vehicles.push(d.vehicles[0]),d=>d.account='other',d=>d.vehicles[0].model='',d=>d.vehicles[0].sourceUrl='https://evil.test/used/Nissan/Altima.htm',d=>d.vehicles[0].condition='new',d=>d.vehicles[0].stockNumber='OTHER',d=>d.vehicles[0].checkedAt='2020-01-01']){
  const data=snapshot();mutate(data);assert.equal(verifiedCogginVehicles(data,config,now),null);
 }
});
test('older retained official membership keeps original evidence date and never becomes fresh',()=>{
 const data=snapshot();data.checkedAt=new Date(now-7*86400000).toISOString();data.vehicles[0].checkedAt=data.checkedAt;
 const feed={checkedAt:new Date(now-8*86400000).toISOString(),vehicles:[{vin:other}]};
 const result=reconcileOfficialAvailability(feed,data,{...config,now});assert.equal(result.checkedAt,data.checkedAt);assert.equal(result.vehicles[0].vin,vin);
 const newerFeed={...feed,checkedAt};assert.equal(reconcileOfficialAvailability(newerFeed,data,{...config,now}),newerFeed);
});
test('inventory loader uses official membership and keeps retained price provenance',async()=>{
 const original=globalThis.fetch;const data=snapshot();
 try{
  globalThis.fetch=async url=>({ok:true,json:async()=>String(url).includes('-links.json')?data:{checkedAt:new Date(now-120000).toISOString(),vehicles:[{vin:other,stockNumber:'OLD'}]}});
  setInventoryAccess('coggin-official-test','Coggin Nissan Atl');const result=await loadInventory();assert.equal(result.vehicles.length,1);
  const row=result.vehicles[0];assert.equal(row.vin,vin);assert.equal(row.retailPrice,18000);assert.equal(row.priceCheckedAt,'2026-10-01T12:00:00Z');assert.equal(row.priceRetained,true);assert.equal(row.interiorColor,'Sport');assert.equal(row.newArrival,true);assert.equal(row.dealerListingUrl,url);
 }finally{globalThis.fetch=original;setInventoryAccess('','');}
});
