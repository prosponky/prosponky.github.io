import test from 'node:test';import assert from 'node:assert/strict';
import {checkpointDelta,applyCheckpointDelta} from '../scripts/checkpoint-delta.mjs';
test('bounded updates reproduce appended evidence without resending accepted text',()=>{
 const old={startedAt:'original',sections:[{pages:[{body:'original '.repeat(100000)}]}],details:[],reports:{}};
 const next=structuredClone(old);next.sections[0].pages.push({body:'next'});next.details.push({vin:'ABC'});next.reports.ABC={url:null};next.phase='reports';
 const delta=checkpointDelta(old,next);assert.ok(JSON.stringify(delta).length<500);assert.deepEqual(applyCheckpointDelta(old,delta),next);assert.equal(old.sections[0].pages.length,1);
});
test('delta parser rejects prototype paths, array gaps and missing parents',()=>{
 for(const path of [['__proto__','x'],['constructor'],['rows',2],['missing','x']])assert.throws(()=>applyCheckpointDelta({rows:[]},[{path,value:1}]));
});
