import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {cogginOfferPage,usableCustomerCash} from '../src/coggin-offers.js';
test('official offers match VIN and group conditional cash and exclude financing and expired cash',async()=>{const html=await readFile('tests/fixtures/coggin-rebate.html','utf8'),now=Date.parse('2026-10-07T12:00:00Z');const page=cogginOfferPage(html,'cogginnissanattheavenues',now);assert.equal(page.records[0].vin,'3N1AB9BV6VY230783');assert.equal(page.records[0].offers.length,3);assert.equal(page.records[0].offers[0].amount,500);assert.match(page.records[0].offers.find(o=>o.category==='general').terms,/not compatible with NMAC special APR/i);assert.equal(cogginOfferPage(html,'cogginnissanattheavenues',Date.parse('2026-11-04')).records[0].offers.length,0);assert.throws(()=>cogginOfferPage(html,'cogginnissanonatlantic',now));assert.equal(usableCustomerCash(page.records[0].offers,'2026-10-05T12:00:00Z',now).length,0);});
test('official collector retains the explicit trim field',async()=>{
 const html=await readFile('tests/fixtures/coggin-rebate.html','utf8');
 const page=cogginOfferPage(html,'cogginnissanattheavenues',Date.parse('2026-10-07T12:00:00Z'));
 assert.equal(page.records[0].trim,'S');
});

test('offer categories distinguish eligibility',async()=>{const p=cogginOfferPage(await readFile('tests/fixtures/coggin-rebate.html','utf8'),'cogginnissanattheavenues',Date.parse('2026-10-07'));assert.deepEqual(p.records[0].offers.map(o=>o.category).sort(),['general','graduate','military']);assert.equal(p.records[0].offers.filter(o=>o.conditional).length,2);});

test('rebate parsing is brand-neutral and used vehicles never receive offers',async()=>{const html=await readFile('tests/fixtures/coggin-rebate.html','utf8');const now=Date.parse('2026-10-07');const kia=cogginOfferPage(html.replaceAll('Nissan','Kia'),'cogginnissanattheavenues',now);assert.equal(kia.records[0].offers.length,3);const used=cogginOfferPage(html.replaceAll('\"type\":\"new\"','\"type\":\"used\"'),'cogginnissanattheavenues',now);assert.equal(used.records[0].offers.length,0);});

test('interior colors use labeled public attributes and normalized color without extra visits',async()=>{
 const {cogginInteriorColor}=await import('../src/coggin-offers.js');
 assert.equal(cogginInteriorColor({attributes:[{name:'interiorColor',label:'Interior Color',value:'Charcoal',normalizedValue:'Gray'}]}),'Gray');
 assert.equal(cogginInteriorColor({attributes:[{name:'interiorColor',label:'Interior Color',value:'Jet Black'}]}),'Jet Black');
 assert.equal(cogginInteriorColor({attributes:[{name:'exteriorColor',label:'Exterior Color',value:'White'}]}),'');
 const html=await readFile('tests/fixtures/coggin-rebate.html','utf8');
 assert.ok(cogginOfferPage(html,'cogginnissanattheavenues',Date.parse('2026-10-07')).records[0].interiorColor);
});
