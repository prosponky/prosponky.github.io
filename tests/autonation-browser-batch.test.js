import {test} from 'node:test';
import assert from 'node:assert/strict';
import {autoNationBrowserBatch} from '../scripts/autonation-browser-batch.mjs';
const config={name:'AutoNation USA Jacksonville',origin:'https://www.autonationusa.com',inventoryPath:'/used-cars',salePriceLabel:'AutoNation 1Price'};
function fixture(size,total=28,missing=0,options={}){
 let count=Math.min(size,total),clicks=0,currentUrl='',navigations=0;const labels=options.labels||['What you see is what you pay','Get pre-qualified with zero impact','Wondering What Your Car'];
 const vehicle=i=>({id:'vehicle_1FMCU0JD1'+String(i).padStart(8,'0'),querySelector:s=>s.includes('vdp-link')?{href:config.origin+'/cars/'+i}:s.includes('price-label')?{textContent:config.salePriceLabel}:s.includes('lockedprice')?{textContent:options.price||'12,000'}:{textContent:config.name}});
 const doc={querySelector:s=>({textContent:s==='#store-name'?config.name:total+' Results'}),querySelectorAll:s=>s==='button'?count<total-missing?[{textContent:'Load next '+Math.min(size,total-count),disabled:false}]:[]:s==='an-srp-tile-v4[id]'?Array(count+labels.length+(options.extraTiles||0)).fill({}):s==='an-srp-tile-v4[id="vehicle_"]'?labels.map(text=>({textContent:text,querySelectorAll:()=>options.vehicleLinks?[{}]:[]})):Array.from({length:count},(_,i)=>vehicle(i))};
 const locator={filter(){return this;},first(){return this;},nth(){return this;},async waitFor(){}};
 const tab={async url(){return currentUrl;},async goto(url){currentUrl=url;count=Math.min(size,total);navigations++;},playwright:{domSnapshot:async()=>'',locator:()=>locator,getByRole:(role,{name})=>({async waitFor(){assert.ok(name.test('Load next '+Math.min(size,total-count)));},async click(){assert.ok(name.test('Load next '+Math.min(size,total-count)));count=Math.min(total-missing,count+size);clicks++;}}),async evaluate(fn){const old=globalThis.document;globalThis.document=doc;try{return fn();}finally{globalThis.document=old;}}}};
 return {tab,clicks:()=>clicks,navigations:()=>navigations};
}
for(const size of [12,24])test('collects '+size+'-tile pages and the final partial page without counting promotions as VINs',async()=>{
 const f=fixture(size),state={phase:'list',cards:[],evidence:[],detailCount:0};
 const r=await autoNationBrowserBatch(f.tab,state,config);assert.equal(r.phase,'details');assert.equal(r.total,28);assert.equal(state.resultsTotal,31);assert.equal(state.promotionalTileCount,3);assert.equal(f.clicks(),Math.ceil(28/size)-1);
});
test('rejects an incomplete final VIN list',async()=>{const f=fixture(12,28,1);await assert.rejects(autoNationBrowserBatch(f.tab,{phase:'list',cards:[],evidence:[],detailCount:0},config),/Full VIN count/);});
test('accepts two observed known promotions and saves their identities without changing VIN coverage',async()=>{
 const f=fixture(24,28,0,{labels:['Get pre-qualified with zero impact on your credit','Wondering What Your Car’s Worth?']}),state={phase:'list',cards:[],evidence:[],detailCount:0};
 await autoNationBrowserBatch(f.tab,state,config);assert.equal(state.total,28);assert.equal(state.resultsTotal,30);assert.equal(state.promotionalTileCount,2);assert.deepEqual(state.promotionalTiles.map(p=>p.kind),['pre-qualification','appraisal']);assert.ok(state.promotionalTiles.every(p=>p.vehicleLinks===0));
});
for(const [name,options] of [
 ['unknown promotion',{labels:['Unknown ad']}],['duplicate promotion',{labels:['Wondering What Your Car','Wondering What Your Car']}],['promotion with vehicle links',{vehicleLinks:true}],['unaccounted tile',{extraTiles:1}],['ambiguous promotion',{labels:['Wondering What Your Car Get pre-qualified with zero impact']}]
])test('rejects '+name+' even with all advertised VINs',async()=>{const f=fixture(24,28,0,options);await assert.rejects(autoNationBrowserBatch(f.tab,{phase:'list',cards:[],evidence:[],detailCount:0},config),/Full VIN count/);});
test('a one-page inventory needs no Load next control',async()=>{const f=fixture(24,8),state={phase:'list',cards:[],evidence:[],detailCount:0};f.tab.playwright.getByRole=()=>{throw Error('No load-next control exists');};await autoNationBrowserBatch(f.tab,state,config);assert.equal(state.total,8);assert.equal(state.phase,'details');});
test('enforces bounded batches',async()=>{await assert.rejects(autoNationBrowserBatch({}, {},config,{maxPages:4}),/bounded/);});
function detailFixture(responses){
 let reads=0,reloads=0;const vin='1FMCU0JD1HUA12345';
 const tab={async goto(){},async reload(){reloads++;},playwright:{domSnapshot:async()=>'',locator:()=>({async waitFor(){}}),async evaluate(){const result=responses[Math.min(reads++,responses.length-1)];if(result instanceof Error)throw result;return {url:config.origin+'/cars/'+vin,storeId:result,vehicle:{Vin:vin,HyperionId:result}};}}};
 return {tab,state:{phase:'details',cards:[{vin,price:12000}],evidence:[],detailCount:0},reloads:()=>reloads,config:{...config,storeId:'2993'}};
}
test('reloads once when the public detail page initially advertises a different store',async()=>{const f=detailFixture(['2860','2993']);await autoNationBrowserBatch(f.tab,f.state,f.config);assert.equal(f.reloads(),1);assert.equal(f.state.detailCount,1);});
test('reloads once for an incomplete public JSON response',async()=>{const f=detailFixture([new SyntaxError('incomplete'),'2993']);await autoNationBrowserBatch(f.tab,f.state,f.config);assert.equal(f.reloads(),1);assert.equal(f.state.detailCount,1);});
test('rejects a persistent identity mismatch without accepting evidence',async()=>{const f=detailFixture(['2860','2860']);await assert.rejects(autoNationBrowserBatch(f.tab,f.state,f.config),/advertised store/);assert.equal(f.reloads(),1);assert.equal(f.state.detailCount,0);});
test('does not reload an access denial',async()=>{const f=detailFixture([new Error('Access denied')]);await assert.rejects(autoNationBrowserBatch(f.tab,f.state,f.config),/Access denied/);assert.equal(f.reloads(),0);assert.equal(f.state.detailCount,0);});
test('a rendered access challenge stops before extraction or retry',async()=>{
 const detail=detailFixture(['2860','2993']);detail.tab.playwright.domSnapshot=async()=>'Verify you are human';
 await assert.rejects(autoNationBrowserBatch(detail.tab,detail.state,detail.config),/access challenge/);assert.equal(detail.reloads(),0);assert.equal(detail.state.detailCount,0);
 const list=fixture(12),state={phase:'list',cards:[],evidence:[],detailCount:0};list.tab.playwright.domSnapshot=async()=>'Too many requests';
 await assert.rejects(autoNationBrowserBatch(list.tab,state,config),/access challenge/);assert.equal(list.clicks(),0);assert.equal(state.cards.length,0);
});

test('an already open AutoNation listing does not reload before collecting',async()=>{const f=fixture(12);f.tab.url=async()=>config.origin+config.inventoryPath;f.tab.goto=async()=>{throw Error('Unexpected reload');};const result=await autoNationBrowserBatch(f.tab,{phase:'list',cards:[],evidence:[],detailCount:0},config);assert.equal(result.phase,'details');});

test('a fresh browser replays the accepted list across bounded calls without resetting the durable prefix',async()=>{
 const first=fixture(12,100),state={phase:'list',cards:[],evidence:[],detailCount:0};
 await autoNationBrowserBatch(first.tab,state,config,{maxPages:3});await autoNationBrowserBatch(first.tab,state,config,{maxPages:3});
 assert.equal(state.cards.length,72);const accepted=structuredClone(state.cards),restarted=fixture(12,100);
 for(let i=0;i<2;i++){
  const before=restarted.clicks();await autoNationBrowserBatch(restarted.tab,state,config,{maxPages:3});
  assert.ok(restarted.clicks()-before<=3);assert.deepEqual(state.cards,accepted);
 }
 assert.equal(restarted.navigations(),1);
 const result=await autoNationBrowserBatch(restarted.tab,state,config,{maxPages:3});
 assert.equal(result.phase,'details');assert.equal(state.cards.length,100);assert.deepEqual(state.cards.slice(0,72),accepted);assert.equal(state.promotionalTiles.length,3);
});

test('replay rejects changed accepted prices before replacing saved evidence',async()=>{
 const original=fixture(12,50),state={phase:'list',cards:[],evidence:[],detailCount:0};await autoNationBrowserBatch(original.tab,state,config,{maxPages:2});
 const accepted=structuredClone(state),changed=fixture(12,50,0,{price:'11,000'});
 await assert.rejects(autoNationBrowserBatch(changed.tab,state,config,{maxPages:3}),/Accepted AutoNation listing changed/);
 assert.deepEqual(state,accepted);assert.equal(changed.clicks(),0);
});
