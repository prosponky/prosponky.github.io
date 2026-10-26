import test from 'node:test';
import assert from 'node:assert/strict';
import {officialFallback,sourceHealth} from '../scripts/cloud-source-health.mjs';
const now=Date.parse('2026-10-25T18:00:00Z'),checkedAt='2026-10-25T16:10:00Z',slot='2026-10-25T16:00:00Z',vin='1N4BL4DV0SN300001',stock='ABC',origin='https://www.cogginnissanatlantic.com',account='cogginnissanonatlantic',url=origin+'/used/Nissan/2025-Nissan-Altima-abc.htm',config={origin,account};
function map(){return {source:origin,account,checkedAt,complete:true,total:1,inventoryVins:[vin],vehicles:[{vin,stockNumber:stock,condition:'used',year:2025,make:'Nissan',model:'Altima',trim:'SV',color:'Blue',interiorColor:'Sport',mileage:1,sourceUrl:url,checkedAt}],stockNumbers:{[vin]:stock},conditions:{[vin]:'used'},stocks:{[stock]:url},retailPrices:{[vin]:18000},trims:{[vin]:'SV'},interiorColors:{[vin]:'Sport'},certified:{[vin]:false},carfax:{[vin]:null},offers:{[vin]:[]}};}
test('complete current-slot official evidence succeeds only when exact live map agrees',()=>{
 const expected=map();assert.equal(officialFallback(expected,structuredClone(expected),config,{now,slot}).status,'official-fallback-live-verified');
 for(const mutate of [m=>m.vehicles=[],m=>m.checkedAt='2026-10-25T15:59:00Z',m=>m.complete=false,m=>m.account='other',m=>m.checkedAt='2026-10-25T19:00:00Z']){const invalid=map();mutate(invalid);assert.throws(()=>officialFallback(invalid,invalid,config,{now,slot}));}
 const live=map();live.retailPrices[vin]=1;assert.throws(()=>officialFallback(map(),live,config,{now,slot}),/does not match/);
});
test('source failure remains visible and only a verified official fallback can recover Coggin',async()=>{
 const registry={'coggin-atlantic':config,'coggin-avenues':config};const readOfficial=async()=>({expected:map(),live:map()});
 const outcomes={greenway:'success','coggin-atlantic':'failure','coggin-avenues':'success'};
 const result=await sourceHealth(outcomes,registry,{readOfficial,now});assert.equal(result.allAvailable,true);assert.equal(result.stores['coggin-atlantic'].status,'official-fallback-live-verified');
 assert.equal((await sourceHealth({...outcomes,greenway:'failure'},registry,{readOfficial,now})).allAvailable,false);
 const denied=await sourceHealth(outcomes,registry,{readOfficial:async()=>{throw Error('HTTP 403');},now});assert.equal(denied.allAvailable,false);assert.match(denied.stores['coggin-atlantic'].reason,/403/);
});
