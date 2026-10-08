import {test} from 'node:test';
import assert from 'node:assert/strict';
import {OfficialCollection,parseOfficialCard} from '../src/official-inventory.js';
import {collectBrowserBatch,collectBrowserInventory,nextPageUrl} from '../scripts/browser-inventory.mjs';
const config={origin:'https://dealer.example',adapter:'dealer-inspire-browser',salePriceLabel:'Greenway Price',sections:[{path:'/new-vehicles/',condition:'new'},{path:'/pre-owned-vehicles/',condition:'used'}],countHeading:'Vehicles for Sale',cardSelector:'.hit',nextButton:'next page'};
const card=(n,amount=14597)=>({text:`Stock: S${n}\nVIN: 1HGCR2F53HA${String(n).padStart(6,'0')}\nRetail Price\n$15,475\nGreenway Price\n\uF05A\n$${amount}\nMSRP\n$20,000`,url:`https://dealer.example/inventory/vehicle-1hgcr2f53ha${String(n).padStart(6,'0')}/`});
test('reads only explicitly labeled official prices and matches VIN to its store',()=>{
 assert.deepEqual([parseOfficialCard(card(1),config,'new').price,parseOfficialCard(card(1),config,'new').msrp],[14597,20000]);
 assert.equal(parseOfficialCard({...card(1),text:card(1).text.replace('Greenway Price','Other Price')},config,'used').price,null);
 assert.equal(parseOfficialCard(card(1,0),config,'used').price,null);
 assert.throws(()=>parseOfficialCard({...card(1),url:card(2).url},config,'used'),/identity/);
 assert.throws(()=>parseOfficialCard({...card(1),url:card(1).url.replace('dealer.example','another.example')},config,'used'),/store/);
 assert.throws(()=>parseOfficialCard({...card(1),text:card(1).text+'\nGreenway Price\n$16,000'},config,'used'),/Conflicting/);
});
test('overlapping pages retain one consistent VIN but cannot hide missing or conflicting cars',()=>{
 const run=new OfficialCollection(config);run.start('used',3);run.add([card(1),card(2)]);assert.equal(run.add([card(2),card(3)]),3);run.finish();assert.equal(run.snapshot().total,3);
 const incomplete=new OfficialCollection(config);incomplete.start('used',3);incomplete.add([card(1)]);assert.throws(()=>incomplete.finish(),/Incomplete/);assert.throws(()=>incomplete.snapshot(),/Incomplete/);assert.throws(()=>incomplete.add([card(1)]),/Repeated official page/);
 const conflict=new OfficialCollection(config);conflict.start('used',3);conflict.add([card(1)]);assert.throws(()=>conflict.add([card(1,16000),card(2)]),/Conflicting repeated/);
});
test('next links retain selected inventory filters without duplicate parameters',()=>{
 const current=config.origin+'/new-vehicles/?_p=2&_dFR%5Btype%5D%5B0%5D=New';
 const merged=new URL(nextPageUrl('/new-vehicles/?_p=3',current,config,config.sections[0]));assert.equal(merged.searchParams.get('_dFR[type][0]'),'New');
 assert.equal(new URL(nextPageUrl(merged.href,current,config,config.sections[0])).searchParams.getAll('_dFR[type][0]').length,1);
 assert.throws(()=>nextPageUrl('https://another.example/new-vehicles/',current,config,config.sections[0]),/Unexpected/);
});
function fakeTab(){let current='',index=0;const pages=[[card(1),card(2)],[card(2),card(3)]];return {url:async()=>current,goto:async url=>{current=url;index=Number(new URL(url).searchParams.get('_p')||1)-1;},playwright:{domSnapshot:async()=>'',waitForTimeout:async()=>{},getByText:()=>({waitFor:async()=>{},allTextContents:async()=>[`Page ${index+1} of 2`]}),getByRole:role=>role==='heading'?{allTextContents:async()=>['3 Vehicles for Sale']}:{isEnabled:async()=>true,getAttribute:async()=>'/new-vehicles/?_p=2',press:async()=>{index=1;current=config.origin+'/new-vehicles/?_p=2&type=New';}},locator:()=>({evaluateAll:async()=>pages[index],filter:()=>({waitFor:async()=>{}})})}};}
test('interrupted browser runs resume durable evidence and publish only after all pages',async()=>{
 const tab=fakeTab(),single={...config,sections:[config.sections[0]]};let durable;
 const first=await collectBrowserBatch(tab,single,{maxPages:1,onCheckpoint:async state=>{durable=state;}});assert.equal(first.done,false);assert.equal(first.snapshot,null);
 const resumed=await collectBrowserBatch(tab,single,{checkpoint:JSON.parse(JSON.stringify(durable)),maxPages:1});assert.equal(resumed.done,true);assert.equal(resumed.snapshot.total,3);
 await assert.rejects(collectBrowserBatch(tab,single,{checkpoint:{...durable,startedAt:'2000-01-01T00:00:00Z'}}),/expired/);
});
test('missing official vehicles cannot be published after the bounded recovery pass',async()=>{
 const tab=fakeTab(),original=tab.playwright.getByRole;tab.playwright.getByRole=role=>role==='heading'?{allTextContents:async()=>['4 Vehicles for Sale']}:original(role);
 await assert.rejects(collectBrowserInventory(tab,{...config,sections:[config.sections[0]]}),/still incomplete after two passes/);
});
