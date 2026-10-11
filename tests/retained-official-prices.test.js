import {test} from 'node:test';import assert from 'node:assert/strict';
import {retainGreenwayPrices,retainCogginPrices} from '../src/retained-official-prices.js';
const vin='1N4BL4DV0SN300001';
const green=(price,checkedAt)=>({source:'https://dealer.example',adapter:'dealer-inspire-browser',checkedAt,prices:{[vin]:{stockNumber:'ABC',condition:'used',url:'https://dealer.example/inventory/'+vin,price,msrp:null}}});
test('verified price retention has no age cutoff and preserves the original verification date',()=>{
 const old=green(15000,'2020-01-01T00:00:00Z'),next=green(null,'2026-10-10T16:00:00Z'),result=retainGreenwayPrices(next,old);
 assert.equal(result.prices[vin].price,15000);assert.equal(result.prices[vin].observedPrice,null);assert.equal(result.prices[vin].priceCheckedAt,old.checkedAt);assert.equal(result.prices[vin].priceRetained,true);assert.equal(next.prices[vin].price,null);
 const again=retainGreenwayPrices(green(null,'2026-10-11T16:00:00Z'),result);assert.equal(again.prices[vin].priceCheckedAt,old.checkedAt);
});
test('a fresh verified amount replaces retention and never inherits its old date',()=>{const result=retainGreenwayPrices(green(14000,'2026-10-10T16:00:00Z'),green(15000,'2020-01-01T00:00:00Z'));assert.equal(result.prices[vin].price,14000);assert.equal(result.prices[vin].priceRetained,false);assert.equal(result.prices[vin].priceCheckedAt,result.checkedAt);});
test('foreign sources, changed identity and future dates cannot donate a retained price',()=>{for(const mutate of [p=>p.source='https://other.example',p=>p.prices[vin].stockNumber='OTHER',p=>p.checkedAt='2099-01-01T00:00:00Z']){const old=green(15000,'2020-01-01T00:00:00Z');mutate(old);assert.equal(retainGreenwayPrices(green(null,'2026-10-10T16:00:00Z'),old).prices[vin].price,null);}});
test('malformed incoming amounts are not repaired into publishable evidence',()=>{assert.equal(retainGreenwayPrices(green(-10,'2026-10-10T16:00:00Z'),green(15000,'2020-01-01T00:00:00Z')).prices[vin].price,-10);});
test('Coggin retention requires exact VIN, official source and used condition, keeping rebates separate',()=>{
 const old={source:'https://dealer.example',complete:true,checkedAt:'2020-01-01T00:00:00Z',inventoryVins:[vin],retailPrices:{[vin]:15000},offers:{[vin]:[{amount:500}]}};
 const next={source:old.source,complete:true,checkedAt:'2026-10-10T16:00:00Z',inventoryVins:[vin],conditions:{[vin]:'used'},retailPrices:{[vin]:null},offers:{[vin]:[]}};
 const result=retainCogginPrices(next,old);assert.equal(result.retailPrices[vin],15000);assert.equal(result.priceCheckedAt[vin],old.checkedAt);assert.equal(result.priceRetained[vin],true);assert.deepEqual(result.offers[vin],[]);
 for(const condition of ['new',undefined])assert.equal(retainCogginPrices({...next,conditions:{[vin]:condition}},old).retailPrices[vin],null);
});
test('official MSRP retention keeps original evidence and requires new condition',()=>{
 const old={source:'https://dealer.example',complete:true,checkedAt:'2020-01-01T00:00:00Z',inventoryVins:[vin],conditions:{[vin]:'new'},msrps:{[vin]:24725}};
 const next={source:old.source,complete:true,checkedAt:'2026-10-10T16:00:00Z',inventoryVins:[vin],conditions:{[vin]:'new'},msrps:{[vin]:null}};
 const result=retainCogginPrices(next,old);assert.equal(result.msrps[vin],24725);assert.equal(result.msrpCheckedAt[vin],old.checkedAt);assert.equal(result.msrpRetained[vin],true);
 assert.equal(retainCogginPrices({...next,conditions:{[vin]:'used'}},old).msrps[vin],null);
 const fresh=retainCogginPrices({...next,msrps:{[vin]:25000}},old);assert.equal(fresh.msrps[vin],25000);assert.equal(fresh.msrpRetained[vin],false);
});
