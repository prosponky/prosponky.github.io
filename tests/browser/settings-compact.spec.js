import {test,expect} from './fixtures.js';
test('compact settings keeps fee edits and saving functional',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name:'Settings',exact:true}).click();
 await expect(page.locator('#settings-fees')).not.toHaveAttribute('open');
 await page.screenshot({path:'tmp/settings-compact.png',fullPage:true});
 await page.locator('#settings-fees summary').click();await page.locator('#fee-amount-0').fill('399');await page.getByRole('button',{name:'+ Add fee',exact:true}).click();await expect(page.locator('#fee-name-1')).toBeVisible();await page.locator('#fee-name-1').fill('Title');await page.locator('#fee-amount-1').fill('100');await expect(page.locator('#fee-amount-0')).toHaveValue(/399/);
 await page.getByRole('button',{name:'Save settings',exact:true}).click();await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name:'Settings',exact:true}).click();await page.locator('#settings-fees summary').click();await expect(page.locator('#fee-amount-0')).toHaveValue(/399/);await expect(page.locator('#fee-name-1')).toHaveValue('Title');
});
