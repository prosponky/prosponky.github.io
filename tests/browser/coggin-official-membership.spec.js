import {test,expect} from './fixtures.js';
test.use({dealerStore:'Coggin Nissan Atl'});
test('complete official membership supplies missing arrivals and quote price',async({page})=>{
 const checkedAt=new Date().toISOString(),vin='1N4BL4DV0SN300001',stockNumber='OFFICIAL1',source='https://www.cogginnissanatlantic.com',url=source+'/used/Nissan/2025-Nissan-Altima-abc.htm';
 const vehicle={vin,stockNumber,condition:'used',year:2025,make:'Nissan',model:'Altima',trim:'SV',color:'Blue',interiorColor:'Sport',mileage:100,sourceUrl:url,checkedAt};
 const official={source,account:'cogginnissanonatlantic',checkedAt,complete:true,total:1,inventoryVins:[vin],vehicles:[vehicle],stockNumbers:{[vin]:stockNumber},conditions:{[vin]:'used'},stocks:{[stockNumber]:url},retailPrices:{[vin]:18000},trims:{[vin]:'SV'},interiorColors:{[vin]:'Sport'},certified:{[vin]:false},carfax:{[vin]:null},offers:{[vin]:[]},dailyChanges:{addedVins:[vin]}};
 await page.route('**/inventory/coggin-atlantic.json',r=>r.fulfill({json:{checkedAt:new Date(Date.now()-86400000).toISOString(),vehicles:[]}}));
 await page.route('**/inventory/coggin-atlantic-links.json',r=>r.fulfill({json:official}));
 await page.goto('/');await page.getByRole('button',{name:'Inventory',exact:true}).click();
 const tile=page.locator('[data-browse-vehicle]').filter({hasText:stockNumber});await expect(tile).toContainText('$18,000');await tile.click();
 await expect(page.locator('.vehicle-msrp')).toHaveText('Sales price$18,000');await expect(page.locator('body')).toContainText('Sport');
 await page.screenshot({path:'tmp/coggin-official-membership.png'});
 await page.getByRole('button',{name:'Quick quote',exact:true}).click();await expect(page.getByRole('textbox',{name:'Sales price',exact:true})).toHaveValue('$18,000.00');
});
