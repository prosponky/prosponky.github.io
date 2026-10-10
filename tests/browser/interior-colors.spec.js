import {test,expect} from './fixtures.js';
import {readFile} from 'node:fs/promises';
import {inventoryColorLabel} from '../../src/inventory.js';
for(const [store,file] of [['GW Kia Ave','greenway'],['Coggin Nissan Atl','coggin-atlantic'],['Coggin Nissan Ave','coggin-avenues']]){
 test.describe(store,()=>{
  test.use({dealerStore:store});
  test('collected interior appears in vehicle card',async({page})=>{
   const feed=JSON.parse(await readFile('public/inventory/'+file+'.json','utf8'));
   const row=feed.vehicles.find(v=>v.condition==='new'&&v.interiorColor==='Sport')||feed.vehicles.find(v=>v.condition==='new'&&inventoryColorLabel(v.interiorColor)!=='Color unavailable');
   expect(row).toBeTruthy();
   await page.route('**/inventory/*.json',r=>r.fulfill({json:{}}));
   await page.route('**/inventory/'+file+'.json',r=>r.fulfill({json:{...feed,vehicles:[row]}}));
   await page.goto('/');await page.getByRole('button',{name:'Inventory',exact:true}).click();
   await page.locator('[data-browse-vehicle]').filter({hasText:row.stockNumber}).click();
   await expect(page.locator('.vehicle-action-interior')).toHaveText('Interior: '+inventoryColorLabel(row.interiorColor));
  });
 });
}
