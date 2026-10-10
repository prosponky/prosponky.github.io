import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dealerraterPage} from '../src/dealerrater-inventory.js';
const car={ '@type':'Car',vehicleIdentificationNumber:'3KPFT4DE3TE321976',sku:'TE321976',itemCondition:'schema.org/NewCondition',modelDate:'2026',manufacturer:'Kia',model:'K4',offers:{url:'https://www.dealerrater.com/classifieds/2026-Kia-K4-ad-3KPFT4DE3TE321976-26040/',price:'24350',priceCurrency:'USD',seller:'Greenway Kia at the Avenues',availability:'http://schema.org/InStock'}};
function html(c=car){return 'Greenway Kia at the Avenues 10564 Philips Inventory (1)<div class="vehicle-card"><a href="'+c.offers.url+'">Vehicle</a><p>MSRP: $24,950</p></div><script type="application/ld+json">'+JSON.stringify(c)+'</script>';}
test('public DealerRater source maps stock, VIN and labeled MSRP without inferring discount',()=>{const p=dealerraterPage(html(),'now');assert.equal(p.total,1);assert.equal(p.next,null);assert.equal(p.vehicles[0].stockNumber,'TE321976');assert.equal(p.vehicles[0].msrp,24950);assert.equal(p.vehicles[0].advertisedPrice,24350);assert.equal(p.vehicles[0].dealerDiscount,null);});
test('DealerRater price labels stay with the matching visible vehicle card',()=>{const c={...car,sku:'TE384438',vehicleIdentificationNumber:'3KPFT4DE4TE384438',offers:{...car.offers,url:'https://www.dealerrater.com/classifieds/2026-Kia-K4-ad-3KPFT4DE4TE384438-26040/'}};assert.throws(()=>dealerraterPage(html().replace(JSON.stringify(car),JSON.stringify(c)),'now'));assert.equal(dealerraterPage(html().replace('MSRP: $24,950','Retail Price: $24,950'),'now').vehicles[0].msrp,null);});
test('DealerRater rejects missing stock, foreign dealer, empty count and external pagination',()=>{assert.throws(()=>dealerraterPage(html({...car,sku:''}),'now'));assert.throws(()=>dealerraterPage(html().replace('Inventory (1)','Inventory (0)'),'now'));assert.throws(()=>dealerraterPage(html()+ '<a href="https://elsewhere.com/page2/" rel="next">next</a>','now'));assert.throws(()=>dealerraterPage(html({...car,offers:{...car.offers,seller:'Another dealer'}}),'now'));});

test('DealerRater retains color and odometer including zero miles',()=>{const row=dealerraterPage(html({...car,color:'Steel Gray',mileageFromOdometer:'32456'}),'now').vehicles[0];assert.equal(row.color,'Steel Gray');assert.equal(row.mileage,32456);assert.equal(dealerraterPage(html({...car,mileageFromOdometer:'0'}),'now').vehicles[0].mileage,0);assert.equal(dealerraterPage(html({...car,mileageFromOdometer:'unknown'}),'now').vehicles[0].mileage,null);});
test('unpriced listings remain present without a free price',()=>{for(const price of ['0',0,'',null,undefined]){const row=dealerraterPage(html({...car,offers:{...car.offers,price}}),'now').vehicles[0];assert.equal(row.advertisedPrice,null);}for(const price of ['bad',-1])assert.throws(()=>dealerraterPage(html({...car,offers:{...car.offers,price}}),'now'));});

test('interior colors come from the matching listing, never the exterior',()=>{
 const input=html().replace('<p>MSRP:',"<span class='capitalize'>pearl white</span> exterior, <span class='capitalize'>charcoal</span> interior<p>MSRP:");
 assert.equal(dealerraterPage(input,'now').vehicles[0].interiorColor,'charcoal');
 assert.equal(dealerraterPage(html(),'now').vehicles[0].interiorColor,'');
 assert.equal(dealerraterPage(html({...car,vehicleInteriorColor:'Black'}),'now').vehicles[0].interiorColor,'Black');
});
