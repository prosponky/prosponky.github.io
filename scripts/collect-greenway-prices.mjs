import {chromium} from '@playwright/test';
import {writeFile,rename,mkdir} from 'node:fs/promises';
const browser=await chromium.launch();const prices={},checkedAt=new Date().toISOString();
try{const page=await browser.newPage();const response=await page.goto('https://www.greenwaykiaattheavenues.com/pre-owned-vehicles/',{waitUntil:'domcontentloaded'});if(!response?.ok())throw Error('Official Greenway access denied; no unverified prices published.');
await page.getByRole('heading',{name:/Vehicles for Sale/}).first().waitFor();const expected=Number((await page.getByRole('heading',{name:/Vehicles for Sale/}).first().innerText()).match(/^[\d,]+/)[0].replaceAll(',',''));const seen=new Set();
for(let n=0;n<100;n++){await page.locator('.hit').first().waitFor();const cards=await page.locator('.hit').evaluateAll(es=>es.map(e=>({text:e.innerText,url:e.querySelector('a[href*="/inventory/"]')?.href})));
for(const {text,url} of cards){const vin=text.match(/VIN:\s*([A-HJ-NPR-Z0-9]{17})/i)?.[1];const amount=text.match(/(?:^|\n)Greenway Price\s*\$([\d,]+)/i)?.[1];if(!vin||seen.has(vin)||!url?.toUpperCase().endsWith('-'+vin+'/'))throw Error('Invalid or repeated official VIN');seen.add(vin);prices[vin]={price:amount?Number(amount.replaceAll(',','')):null,url};}
console.log('Verified Greenway',seen.size,'of',expected);if(seen.size===expected)break;
const previous=cards[0].url;await page.getByRole('button',{name:'next page',exact:true}).click();await page.waitForFunction(old=>document.querySelector('.hit a[href*="/inventory/"]')?.href!==old,previous);
}
if(seen.size!==expected)throw Error('Incomplete official pricing; snapshot retained.');await mkdir('public/inventory',{recursive:true});const path='public/inventory/greenway-prices.json';await writeFile(path+'.tmp',JSON.stringify({checkedAt,source:'https://www.greenwaykiaattheavenues.com/pre-owned-vehicles/',prices}));await rename(path+'.tmp',path);
}finally{await browser.close();}
