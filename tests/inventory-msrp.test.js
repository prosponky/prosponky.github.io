import {test} from 'node:test';import assert from 'node:assert/strict';
import {applyOfficialMsrp,inventoryDeal,inventoryDisplayPrice,loadInventory,setInventoryAccess} from '../src/inventory.js';
test('official MSRP controls quote prefill and preserves retained evidence dates',()=>{
 const row={stockNumber:'TEST1',vin:'1N4BL4DV9SN330793',condition:'new',storeLabel:'Coggin Nissan Atl',msrp:99999};applyOfficialMsrp(row,24725,'2020-01-01T00:00:00Z',true);
 assert.equal(inventoryDisplayPrice(row),24725);assert.equal(inventoryDeal(row,{}).price,'24725');assert.equal(row.msrpCheckedAt,'2020-01-01T00:00:00Z');assert.equal(row.msrpRetained,true);
 for(const value of [null,-1,'24725',NaN]){applyOfficialMsrp(row,value,'2020-01-01T00:00:00Z');assert.equal(row.msrp,null);}
 applyOfficialMsrp(row,24725,'2999-01-01T00:00:00Z');assert.equal(row.msrp,null);
});
test('Coggin exact listing and official source are required before overriding new MSRP',async()=>{
 const old=globalThis.fetch,vin='1N4BL4DV9SN330793',origin='https://www.cogginnissanatlantic.com';
 let source=origin;const row={stockNumber:'TEST1',vin,condition:'new',msrp:99999};
 globalThis.fetch=async url=>({ok:true,json:async()=>String(url).endsWith('-links.json')?{source,checkedAt:'2020-01-01T00:00:00Z',stocks:{TEST1:origin+'/new/Nissan/test.htm'},msrps:{[vin]:24725},msrpCheckedAt:{[vin]:'2020-01-01T00:00:00Z'},msrpRetained:{[vin]:true}}:{checkedAt:'2020-01-01T00:00:00Z',vehicles:[{...row}]}});
 try{setInventoryAccess('msrp-test','Coggin Nissan Atl');let feed=await loadInventory();assert.equal(feed.vehicles[0].msrp,24725);source='https://other.example';feed=await loadInventory();assert.equal(feed.vehicles[0].msrp,99999);}finally{globalThis.fetch=old;setInventoryAccess('','');}
});
