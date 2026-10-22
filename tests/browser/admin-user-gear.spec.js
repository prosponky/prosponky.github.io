import {test,expect} from './fixtures.js';
test('user gear and store controls are independent of clickable workspace card',async({page})=>{
 const target='00000000-0000-4000-8000-000000000002';let opens=0;const actions=[];
 await page.route('**/rest/v1/rpc/is_app_admin',r=>r.fulfill({json:true}));
 await page.route('**/rest/v1/rpc/admin_search_users',r=>r.fulfill({json:[{user_id:target,email:'user@example.test',display_name:'Gabe'}]}));
 await page.route('**/rest/v1/rpc/admin_open_user',r=>{opens++;return r.fulfill({status:204,body:''});});
 await page.route('**/functions/v1/admin-user-actions',r=>{const body=r.request().postDataJSON();actions.push(body);return r.fulfill({json:body.action==='capabilities'?{ready:true}:{ok:true,email:'new@example.test'}});});
 await page.goto('/');await page.getByRole('button',{name:'Admin',exact:true}).click();await page.getByRole('button',{name:'Search users',exact:true}).click();
 await expect(page.locator('.admin-user-card select')).toHaveCount(0);expect(opens).toBe(0);
 await page.getByRole('button',{name:'Settings for Gabe',exact:true}).click();const d=page.getByRole('dialog',{name:'User settings'});await expect(d.getByRole('button',{name:'Edit email',exact:true})).toBeEnabled();expect(opens).toBe(0);await d.getByRole('button',{name:'Assign store',exact:true}).click();await page.getByRole('dialog',{name:'Assign store access'}).getByRole('button',{name:'Cancel',exact:true}).click();
 await d.getByRole('button',{name:'Delete user',exact:true}).click();await d.getByRole('button',{name:'Delete user permanently',exact:true}).click();expect(actions.some(a=>a.action==='delete-user')).toBe(false);
 await d.getByRole('button',{name:'Close',exact:true}).click();await page.getByRole('link',{name:'Open workspace for Gabe',exact:true}).press('Enter');await expect.poll(()=>opens).toBe(1);
});
