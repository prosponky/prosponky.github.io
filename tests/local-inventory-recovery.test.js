import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {validateCogginSnapshot,recoverStores,acquireRunLock,easternSlot} from '../scripts/local-inventory-recovery.mjs';
const vin='1N4BL4DV0SN300001',config={origin:'https://dealer.example'},now=Date.parse('2026-10-10T16:01:00Z');
const snapshot=()=>({source:config.origin,checkedAt:new Date(now).toISOString(),complete:true,total:1,inventoryVins:[vin],stocks:{ABC:config.origin+'/new/nissan/altima.htm'},offers:{[vin]:[]},retailPrices:{[vin]:null},trims:{[vin]:'SV'},interiorColors:{[vin]:'Sport'},carfax:{[vin]:null},certified:{[vin]:false}});
test('recovery rejects stale, incomplete and malformed per-VIN evidence',()=>{
 assert.doesNotThrow(()=>validateCogginSnapshot(snapshot(),config,'2026-10-10T16:00:00Z',now));
 for(const data of [{...snapshot(),complete:false},{...snapshot(),total:2},{...snapshot(),interiorColors:{}},{...snapshot(),checkedAt:'2026-10-09T16:01:00Z'},{...snapshot(),retailPrices:{[vin]:-1}}])assert.throws(()=>validateCogginSnapshot(data,config,'2026-10-10T16:00:00Z',now));
});
test('a denied store is not retried or published and another store completes exactly',async()=>{
 let collected=[],published=[],archives=[],liveData;
 const report=await recoverStores([['blocked',config],['allowed',config]],{now:()=>now,force:true,slotStartedAt:'2026-10-10T16:00:00Z',collect:async key=>{collected.push(key);if(key==='blocked')throw Error('HTTP 403');return snapshot();},publish:async(key,cfg,data)=>{published.push(key);liveData=data;},save:async key=>archives.push(key),live:async()=>liveData});
 assert.deepEqual(collected,['blocked','allowed']);assert.deepEqual(published,['allowed']);assert.deepEqual(archives,['allowed']);assert.equal(report.stores.blocked.status,'failed');assert.equal(report.stores.allowed.status,'published-live-verified');
});
test('live mismatch cannot be reported as verified',async()=>{
 let published=false;const report=await recoverStores([['store',config]],{now:()=>now,force:true,slotStartedAt:'2026-10-10T16:00:00Z',collect:async()=>snapshot(),save:async()=>{},publish:async()=>{published=true;},live:async()=>({...snapshot(),total:2})});assert.equal(published,true);assert.equal(report.stores.store.status,'failed');
});
test('a redundant build request failure still requires exact live evidence',async()=>{
 let published;const report=await recoverStores([['store',config]],{now:()=>now,force:true,slotStartedAt:'2026-10-10T16:00:00Z',collect:async()=>snapshot(),save:async()=>{},publish:async(key,cfg,data)=>{published=data;return {buildRequestWarning:'build already queued'};},live:async()=>published||snapshot()});
 assert.equal(report.stores.store.status,'published-live-verified');assert.equal(report.stores.store.buildRequestWarning,'build already queued');
});
test('fresh complete live map skips duplicate collection; corrupt map does not',async()=>{
 let reads=0;const options={now:()=>now,slotStartedAt:'2026-10-10T16:00:00Z',collect:async()=>{reads++;throw Error('stop');},save:async()=>{},publish:async()=>{},live:async()=>snapshot()};
 assert.equal((await recoverStores([['store',config]],options)).stores.store.status,'already-fresh');assert.equal(reads,0);
 await recoverStores([['store',config]],{...options,live:async()=>({...snapshot(),carfax:{}})});assert.equal(reads,1);
});
test('only a demonstrably dead owner lock is recovered',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'pd-lock-')),path=join(dir,'run.lock');try{
  await writeFile(path,JSON.stringify({pid:123}));await assert.rejects(acquireRunLock(path,{isAlive:()=>true}));assert.equal(JSON.parse(await readFile(path,'utf8')).pid,123);
  const release=await acquireRunLock(path,{pid:456,isAlive:()=>false});assert.equal(JSON.parse(await readFile(path,'utf8')).pid,456);await release();
  await writeFile(path,'bad');await assert.rejects(acquireRunLock(path,{isAlive:()=>false}));
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('Eastern morning/noon slots respect winter and summer offsets',()=>{
 assert.equal(easternSlot(new Date('2026-10-10T16:01:00Z')),'2026-10-10T12:00:00-04:00');
 assert.equal(easternSlot(new Date('2026-12-10T12:01:00Z')),'2026-12-10T07:00:00-05:00');
 assert.equal(easternSlot(new Date('2026-10-10T10:00:00Z')),'2026-10-09T12:00:00-04:00');
 assert.equal(easternSlot(new Date('2026-11-01T11:00:00Z')),'2026-10-31T12:00:00-04:00');
});
