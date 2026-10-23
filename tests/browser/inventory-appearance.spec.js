import {test,expect} from './fixtures.js';
import {inventoryStores} from '../../src/inventory.js';
const stores=Object.entries(inventoryStores).filter(([,c])=>c.file&&!c.pending).map(([name])=>name);
const vin='1N4BL4DV0SN300001',oldVin='1N4BL4DV0SN300002';
function feed(store,arrived=true){const c=inventoryStores[store],checkedAt=new Date().toISOString();const vehicles=[vin,oldVin].map((v,i)=>{const url=c.origin+(c.storeId?'/cars/'+v+'/vehicle':'/inventory/used-2026-fixture-car-'+v.toLowerCase()+'/');return {vin:v,stockNumber:i?'EXISTING':'ARRIVED',condition:'used',year:2026,make:'Kia',model:'K4',trim:'EX',msrp:null,advertisedPrice:20000,interiorColor:'Black',exteriorColor:'White',color:'White',carfaxUrl:null,dealerListingUrl:url,sourceUrl:url,advertisingStoreId:'2993',physicalStoreId:'2993',checkedAt};});return {source:c.origin,checkedAt,complete:true,total:2,scope:'physical',storeId:'2993',advertisedTotal:2,detailCount:2,promotionalTileCount:3,resultsTotal:5,vehicles,dailyChanges:{date:checkedAt.slice(0,10),addedVins:arrived?[vin]:[]}};}
async function fixture(page,{group=false}={}){
 const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-transparency',value:'no-preference'},{name:'prefers-contrast',value:'no-preference'}]});
 await page.route('**/rest/v1/rpc/**',route=>route.fulfill({json:route.request().url().includes('is_app_admin')?true:[]}));
 await page.route('**/inventory/*.json',route=>{const file=new URL(route.request().url()).pathname.split('/').at(-1),entry=Object.entries(inventoryStores).find(([,c])=>c.file+'.json'===file);if(entry)return route.fulfill({json:feed(entry[0],!group||entry[0]==='Hutchinson Kia')});if(file==='greenway-prices.json'){const f=feed('GW Kia Ave');return route.fulfill({json:{checkedAt:f.checkedAt,prices:Object.fromEntries(f.vehicles.map(v=>[v.vin,{condition:v.condition,stockNumber:v.stockNumber,url:v.dealerListingUrl,price:20000,msrp:null}]))}});}return route.fulfill({json:{}});});
 await page.goto('/');await page.getByRole('button',{name:'Inventory',exact:true}).click();
}
test.use({dealerStore:''});
for(const store of stores)test('arrival crown and holographic pin in '+store,async({page})=>{
 await fixture(page);await page.getByLabel('View store inventory').selectOption(store);await expect(page.locator('[data-browse-vehicle]')).toHaveCount(2);await expect(page.locator('.arrival-badge')).toHaveCount(1);await expect(page.locator('.arrival-badge')).toContainText('New');await expect(page.locator('.arrival-badge svg')).toHaveCSS('animation-name','arrival-wiggle');
 await page.getByRole('button',{name:'Pin ARRIVED',exact:true}).click();const pinned=page.locator('#inventory-pinned .inventory-tile');await expect(pinned).toHaveCount(1);await expect(pinned).toHaveCSS('animation-name','pinned-foil-flow');expect(await pinned.evaluate(e=>getComputedStyle(e).backgroundImage.match(/linear-gradient/g)?.length)).toBe(3);await expect(pinned).toHaveCSS('border-top-color','rgba(0, 0, 0, 0)');await expect(pinned).toHaveCSS('animation-iteration-count','infinite');await expect(pinned).toHaveCSS('animation-timing-function','linear');await expect(pinned.locator('.arrival-badge')).toHaveCount(1);await expect(page.locator('#inventory-list .inventory-tile')).not.toHaveCSS('animation-name','pinned-foil-flow');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 if(store==='Hutchinson Kia'){await page.waitForTimeout(1200);await page.screenshot({path:'tmp/arrival-foil-mobile.png'});}
});
test('the same VIN at another group store is not falsely marked as a new arrival',async({page})=>{
 await fixture(page,{group:true});await page.getByLabel('View store inventory').selectOption('Hutchinson');await expect(page.locator('[data-browse-vehicle]')).toHaveCount(6);await expect(page.locator('.arrival-badge')).toHaveCount(1);await page.getByRole('button',{name:'Sort inventory',exact:true}).click();await page.getByRole('button',{name:'New to inventory',exact:true}).click();await page.getByRole('button',{name:'Close',exact:true}).click();await expect(page.locator('.inventory-item:visible')).toHaveCount(1);
});
test('reduced motion preserves the foil outline and crown without motion',async({page})=>{await page.emulateMedia({reducedMotion:'reduce'});await fixture(page);await page.getByLabel('View store inventory').selectOption('Hutchinson Kia');await page.getByRole('button',{name:'Pin ARRIVED',exact:true}).click();await expect(page.locator('#inventory-pinned .inventory-tile')).toHaveCSS('animation-name','none');await expect(page.locator('.arrival-badge svg')).toHaveCSS('animation-name','none');});



