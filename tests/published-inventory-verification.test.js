import {test} from 'node:test';import assert from 'node:assert/strict';
import {verifyPublishedSnapshots} from '../scripts/verify-published-inventory.mjs';
const expected={checkedAt:'2026-10-10T16:00:00Z',vehicles:[{vin:'1N4BL4DV0SN300001',advertisedPrice:15000}]};
test('a successful HTTP response with old or modified evidence cannot pass',async()=>{const r=await verifyPublishedSnapshots(['greenway.json'],{attempts:2,wait:async()=>{},readExpected:async()=>expected,fetchLive:async()=>({...expected,vehicles:[]})});assert.equal(r.allVerified,false);assert.equal(r.files['greenway.json'].status,'failed');});
test('deployment propagation and a transient live-map error can recover within bounded attempts',async()=>{let reads=0;const r=await verifyPublishedSnapshots(['greenway.json'],{attempts:3,wait:async()=>{},readExpected:async()=>expected,fetchLive:async()=>{reads++;if(reads===1)throw Error('Network error');return reads===2?{...expected,checkedAt:'2026-10-09T16:00:00Z'}:expected;}});assert.equal(reads,3);assert.equal(r.allVerified,true);});
test('one verified file cannot hide a failed second map',async()=>{const r=await verifyPublishedSnapshots(['greenway-prices.json','greenway-carfax.json'],{attempts:1,readExpected:async()=>expected,fetchLive:async f=>f==='greenway-prices.json'?expected:{...expected,vehicles:[]}});assert.equal(r.files['greenway-prices.json'].status,'exact-live-verified');assert.equal(r.allVerified,false);});
test('unexpected filenames fail before filesystem or network access',async()=>{let touched=false;await assert.rejects(verifyPublishedSnapshots(['../private.json'],{readExpected:async()=>{touched=true;}}),/Invalid/);assert.equal(touched,false);});
test('an access denial is terminal rather than repeatedly retried',async()=>{let reads=0;const r=await verifyPublishedSnapshots(['greenway.json'],{attempts:45,wait:async()=>{},readExpected:async()=>expected,fetchLive:async()=>{reads++;throw Error('Live map HTTP 403');}});assert.equal(reads,1);assert.equal(r.allVerified,false);});

test('default publication window accepts a deploy finishing after the former 90 second limit',async()=>{
 let elapsed=0,reads=0;const report=await verifyPublishedSnapshots(['greenway.json'],{now:()=>elapsed,wait:async ms=>{elapsed+=ms;},readExpected:async()=>expected,fetchLive:async()=>{reads++;return elapsed>=150000?expected:{...expected,checkedAt:'2026-10-09T16:00:00Z'};}});
 assert.equal(report.allVerified,true);assert.equal(elapsed,150000);assert.equal(reads,16);
});
test('stale HTTP 200 evidence still fails at the hard deployment deadline',async()=>{
 let elapsed=0,reads=0;const report=await verifyPublishedSnapshots(['greenway.json'],{timeoutMs:25000,now:()=>elapsed,wait:async ms=>{elapsed+=ms;},readExpected:async()=>expected,fetchLive:async()=>{reads++;return {...expected,checkedAt:'2026-10-09T16:00:00Z'};}});
 assert.equal(report.allVerified,false);assert.equal(elapsed,25000);assert.equal(reads,3);assert.equal(report.files['greenway.json'].actualCheckedAt,'2026-10-09T16:00:00Z');
});
test('an unchanged verification timestamp cannot hide a changed price',async()=>{
 const report=await verifyPublishedSnapshots(['greenway.json'],{attempts:1,readExpected:async()=>expected,fetchLive:async()=>({...expected,vehicles:[{...expected.vehicles[0],advertisedPrice:1}]})});assert.equal(report.allVerified,false);
});
