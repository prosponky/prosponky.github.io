import {chromium} from '@playwright/test';
import {mkdir,writeFile,rename} from 'node:fs/promises';
import {parseInventoryCard} from '../src/inventory.js';

// Reads ordinary public browser pages. No proxy, CAPTCHA bypass, or stealth.
// Publish only after both inventory sections finish; retain the previous file
// on access denial, incomplete pagination, or invalid records.
const origin='https://www.greenwaykiaattheavenues.com';
const browser=await chromium.launch({headless:!process.argv.includes('--visible')});
const rows=new Map(),checkedAt=new Date().toISOString();
try{
 const page=await browser.newPage();
 for(const [path,condition] of [['/new-vehicles/','new'],['/pre-owned-vehicles/','used']]){
  const response=await page.goto(origin+path,{waitUntil:'domcontentloaded',timeout:30000});
  if(!response?.ok())throw Error(`Public inventory returned ${response?.status()}; previous snapshot retained.`);
  await page.getByRole('heading',{name:/Vehicles for Sale/}).first().waitFor({timeout:20000});
  const countText=await page.getByRole('heading',{name:/Vehicles for Sale/}).first().innerText();
  const expected=Number(countText.match(/^([\d,]+)/)?.[1]?.replaceAll(',',''));
  if(!Number.isInteger(expected)||expected<1)throw Error('Inventory total is unavailable; previous snapshot retained.');
  const categoryVins=new Set(),signatures=new Set();
  for(let pageNumber=1;pageNumber<=100;pageNumber++){
   await page.locator('.hit').first().waitFor({timeout:20000});
   const cards=await page.locator('.hit').evaluateAll(cards=>cards.map(e=>({text:e.innerText,url:e.querySelector('a[href*="/inventory/"]')?.href})));
   const signature=cards.map(c=>c.url).join('|');
   if(signatures.has(signature))throw Error('Inventory pagination repeated; previous snapshot retained.');
   signatures.add(signature);
   for(const card of cards){const row=parseInventoryCard(card.text,card.url,condition,checkedAt);rows.set(row.vin,row);categoryVins.add(row.vin);}
   console.log(`${condition}: page ${pageNumber}, ${rows.size} unique vehicles`);
   const next=page.getByRole('button',{name:'next page',exact:true});
   if(!await next.count()||await next.isDisabled())break;
   if(pageNumber===100)throw Error('Inventory exceeds pagination limit.');
   await next.click();
   await page.waitForFunction(old=>document.querySelector('.hit a[href*="/inventory/"]')?.href!==old,cards[0].url,{timeout:20000});
  }
  if(categoryVins.size!==expected)throw Error('Inventory count changed or pagination was incomplete; previous snapshot retained.');
 }
 if(![...rows.values()].some(r=>r.condition==='new')||![...rows.values()].some(r=>r.condition==='used'))throw Error('Inventory missing a vehicle category.');
 const data={dealer:'Greenway Kia at the Avenues',source:origin,checkedAt,vehicles:[...rows.values()]};
 await mkdir('public/inventory',{recursive:true});
 await writeFile('public/inventory/greenway.json.tmp',JSON.stringify(data));
 await rename('public/inventory/greenway.json.tmp','public/inventory/greenway.json');
 console.log(`Saved ${rows.size} vehicles. Build and publish to update the hosted snapshot.`);
}finally{await browser.close();}
