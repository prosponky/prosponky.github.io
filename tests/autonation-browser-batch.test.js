import {test} from 'node:test';
import assert from 'node:assert/strict';
import {autoNationBrowserBatch} from '../scripts/autonation-browser-batch.mjs';
const config={name:'AutoNation USA Jacksonville',origin:'https://www.autonationusa.com',inventoryPath:'/used-cars',salePriceLabel:'AutoNation 1Price'};
function fixture(size,total=28,missing=0){
 let count=Math.min(size,total),clicks=0;const labels=['What you see is what you pay','Get pre-qualified with zero impact','Wondering What Your Car'];
 const vehicle=i=>({id:'vehicle_1FMCU0JD1'+String(i).padStart(8,'0'),querySelector:s=>s.includes('vdp-link')?{href:config.origin+'/cars/'+i}:s.includes('price-label')?{textContent:config.salePriceLabel}:s.includes('lockedprice')?{textContent:'12,000'}:{textContent:config.name}});
 const doc={querySelector:s=>({textContent:s==='#store-name'?config.name:total+' Results'}),querySelectorAll:s=>s==='button'?count<total-missing?[{textContent:'Load next '+Math.min(size,total-count),disabled:false}]:[]:s==='an-srp-tile-v4[id]'?Array(count+3).fill({}):s==='an-srp-tile-v4[id="vehicle_"]'?labels.map(text=>({textContent:text,querySelectorAll:()=>[]})):Array.from({length:count},(_,i)=>vehicle(i))};
 const locator={filter(){return this;},first(){return this;},nth(){return this;},async waitFor(){}};
 const tab={async goto(){},playwright:{locator:()=>locator,getByRole:(role,{name})=>({async waitFor(){assert.ok(name.test('Load next '+Math.min(size,total-count)));},async click(){assert.ok(name.test('Load next '+Math.min(size,total-count)));count=Math.min(total-missing,count+size);clicks++;}}),async evaluate(fn){const old=globalThis.document;globalThis.document=doc;try{return fn();}finally{globalThis.document=old;}}}};
 return {tab,clicks:()=>clicks};
}
for(const size of [12,24])test('collects '+size+'-tile pages and the final partial page without counting promotions as VINs',async()=>{
 const f=fixture(size),state={phase:'list',cards:[],evidence:[],detailCount:0};
 const r=await autoNationBrowserBatch(f.tab,state,config);assert.equal(r.phase,'details');assert.equal(r.total,28);assert.equal(state.resultsTotal,31);assert.equal(state.promotionalTileCount,3);assert.equal(f.clicks(),Math.ceil(28/size)-1);
});
test('rejects an incomplete final VIN list',async()=>{const f=fixture(12,28,1);await assert.rejects(autoNationBrowserBatch(f.tab,{phase:'list',cards:[],evidence:[],detailCount:0},config),/Full VIN count/);});
test('enforces bounded batches',async()=>{await assert.rejects(autoNationBrowserBatch({}, {},config,{maxPages:4}),/bounded/);});
