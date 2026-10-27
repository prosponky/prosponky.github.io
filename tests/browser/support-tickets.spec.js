import {test,expect} from './fixtures.js';
test('ticket form limits stores and submits issue and notes without claiming email sent',async({page})=>{
 let submitted;
 await page.route('**/rest/v1/rpc/submit_support_ticket',r=>{submitted=r.request().postDataJSON();return r.fulfill({json:submitted.request_id});});
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});await page.locator('[data-go="menu"]').first().click();await page.getByRole('button',{name:'Submit a ticket',exact:true}).click();
 const d=page.getByRole('dialog',{name:'Submit a ticket'});
 await expect(d.locator('[data-store] option')).toHaveText(['Choose a store','GW Kia Ave']);
 await d.getByLabel('Store',{exact:true}).selectOption('GW Kia Ave');await d.getByLabel('Issue',{exact:true}).selectOption('Carfax not working');await d.getByLabel('Comments / notes').fill('Report link opens the wrong page.');await d.getByRole('button',{name:'Submit ticket',exact:true}).click();
 await expect(d.getByRole('status')).toContainText('Email delivery is pending setup');expect(submitted.ticket_category).toBe('Carfax not working');expect(submitted.ticket_store).toBe('GW Kia Ave');expect(submitted).not.toHaveProperty('requester');
});


