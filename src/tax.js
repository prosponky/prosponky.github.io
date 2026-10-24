import florida from './data/florida.json' with {type:'json'};
import newYork from './data/new-york.json' with {type:'json'};
import zipIndex from './data/zip-candidates-compact.json' with {type:'json'};
const zipCache=new Map();
export const zipCandidates=zip=>{if(!zipCache.has(zip))zipCache.set(zip,(zipIndex.records[zip]||[]).map(i=>zipIndex.counties[i]));return zipCache.get(zip);};
export {florida,newYork};
const verifiedOn='2026-10-04';
// Reviewed purchase-tax rules only. Not annual property tax, registration, lease,
// exemption, cross-state credit or private-sale engines. All unknowns fail closed.
export const eastCoast=[
 {state:'ME',name:'Maine',status:'research',rate:5.5,tradeCredit:true,rebateDeduct:false,source:'https://www.maine.gov/revenue/taxes/sales-use-service-provider-tax/bulletins',gaps:'Current bulletin fee classification and municipal excise schedules need ingestion.'},
 {state:'NH',name:'New Hampshire',status:'estimate',rate:0,tradeCredit:false,rebateDeduct:false,source:'https://www.revenue.nh.gov/faq/does-new-hampshire-have-sales-tax',gaps:'No general sales tax. Municipal registration charges are not calculated.'},
 {state:'MA',name:'Massachusetts',status:'estimate',rate:6.25,tradeCredit:true,rebateDeduct:true,source:'https://www.mass.gov/guides/motor-vehicle-and-trailer-sales-and-use-tax',gaps:'Only qualifying dealer trade and manufacturer rebate applied at sale. Fees must be classified; annual excise excluded.'},
 {state:'RI',name:'Rhode Island',status:'research',rate:7,tradeCredit:null,rebateDeduct:null,source:'https://tax.ri.gov/tax-sections/sales-excise-taxes/sales-use-tax',gaps:'Trade categories, current rebate rules and fee treatment require complete review.'},
 {state:'CT',name:'Connecticut',status:'estimate',rate:6.35,tradeCredit:true,rebateDeduct:false,source:'https://portal.ct.gov/dmv/vehicle-services/sales-tax-registrations/sales-tax-calculator',gaps:'Passenger/combination vehicles only. 7.75% over $50,000 before trade credit. Warranties with separate 6.35% rate excluded.'},
 {state:'NY',name:'New York',status:'estimate',rate:null,tradeCredit:true,rebateDeduct:false,source:'https://www.tax.ny.gov/pdf/publications/sales/pub838.pdf',gaps:'76 county/city rate jurisdictions ingested. Confirm reporting jurisdiction; ZIP cannot establish it. Reasonable separately stated doc fee rules apply.'},
 {state:'NJ',name:'New Jersey',status:'research',rate:6.625,tradeCredit:true,rebateDeduct:false,source:'https://nj.gov/treasury/taxation/documents/pdf/guides/New-Jersey-Consumer-Automotive-Tax-Guide.pdf',gaps:'Luxury/fuel-inefficient vehicle surcharge, EV charges and fee classification remain unimplemented.'},
 {state:'DE',name:'Delaware',status:'research',rate:5.25,tradeCredit:null,rebateDeduct:null,source:'https://dealers.dmv.de.gov/Dealer/News/OpenFile?NewsID=171',gaps:'Document fee effective 2025-10-01. Valuation, trade eligibility and statutory whole-dollar rounding need review.'},
 {state:'MD',name:'Maryland',status:'estimate',rate:6.5,tradeCredit:true,rebateDeduct:false,source:'https://mva.maryland.gov/your-mva-guide/businesses/bulletins-businesses/taxable-price',effectiveFrom:'2025-07-01',gaps:'Dealer purchase estimate only; trade must be non-leased. Valuation/minimum tax and age-specific cases excluded.'},
 {state:'VA',name:'Virginia',status:'estimate',rate:4.15,tradeCredit:false,rebateDeduct:true,minimum:75,source:'https://www.dmv.virginia.gov/vehicles/taxes-fees/sut',gaps:'$75 minimum. Dealer processing fee taxable. Annual county/city personal property tax excluded.'},
 {state:'NC',name:'North Carolina',status:'research',rate:3,tradeCredit:true,rebateDeduct:null,source:'https://connect.ncdot.gov/business/DMV/DMV%20Documents/nc%20title%20manual.pdf',gaps:'Highway use tax. Rebate classification, property tax and local registration add-ons require ingestion.'},
 {state:'SC',name:'South Carolina',status:'research',rate:5,maximum:500,tradeCredit:null,rebateDeduct:null,source:'https://dor.sc.gov/sites/dor/files/Documents/Policy%20Manuals/sales-and-use-tax-auto-and-truck-dealers-guide.pdf',gaps:'Infrastructure maintenance fee capped at $500. Trade/rebate base and local property taxes require review.'},
 {state:'GA',name:'Georgia',status:'research',rate:7,tradeCredit:true,rebateDeduct:null,source:'https://dor.georgia.gov/title-ad-valorem-tax-tavt-faq',gaps:'TAVT valuation guidance conflicts across FAQ and current manual. Assessment valuation/new-used/direct-finance cases need adjudication.'},
 {state:'FL',name:'Florida',status:'estimate',rate:6,tradeCredit:true,rebateDeduct:false,source:'https://floridarevenue.com/Forms_library/current/brochure/gt800030.pdf',gaps:'All 67 county surtax rates for 2026 ingested; surtax first $5,000. Residence county must be confirmed. Fees classified separately.'},
 {state:'DC',name:'District of Columbia',status:'research',rate:null,tradeCredit:null,rebateDeduct:null,source:'https://dmv-migrate.dc.gov/book/dmv-fees/vehicle-registration-fees',gaps:'Excise matrix needs vehicle weight, fuel efficiency, valuation and current exemption rules.'}
].map(r=>({...r,...({
 ME:{status:'estimate',source:'https://www.maine.gov/revenue/sites/maine.gov.revenue/files/inline-files/IB24%20FINAL%20Vehicle%20Dealers_2025_12_22.pdf',gaps:'5.5%; qualifying motor-vehicle trade credit; manufacturer rebate taxable. Dealer processing fees taxable. Municipal excise excluded.'},
 RI:{status:'estimate',tradeCredit:true,rebateDeduct:true,source:'https://rules.sos.ri.gov/Regulations/part/280-20-70-28',gaps:'7%; manufacturer rebate deducted. Passenger-auto trade category must be confirmed. Dealer title preparation fees taxable; government title/registration excluded.'},
 MD:{minimum:100,source:'https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gtr&section=13-809&enactments=false',gaps:'6.5% dealer-certified purchase price, qualifying trade credit, rebate taxable. Current statute $100 minimum applied; some agency pages still show $41.60. Private-sale valuations and cross-state credits excluded.'},
 NJ:{status:'estimate',gaps:'6.625%; rebate taxable; qualifying trade credit. New vehicles require powertrain and EPA average MPG for 0.4% luxury/fuel surcharge. Adaptive equipment and registration/EV fees require separate review.'},
 DE:{status:'estimate',tradeCredit:true,rebateDeduct:true,source:'https://delcode.delaware.gov/title30/c030/index.html',gaps:'Document fee follows section 3002(c): $8 under $400; $13.75 through $500; additional $5.25 per started $100, nearest dollar. One trade/rebate credit. Government valuation overrides excluded.'},
 NC:{status:'estimate',rebateDeduct:false,source:'https://www.ncleg.gov/EnactedLegislation/Statutes/HTML/ByArticle/Chapter_105/Article_5A.html',gaps:'3% highway use tax; doc fee and manufacturer rebate taxable; qualifying trade credit. Annual local property tax excluded.'},
 SC:{status:'estimate',tradeCredit:true,rebateDeduct:false,source:'https://www.scstatehouse.gov/code/t56c003.php',gaps:'First SC registration, dealer passenger purchase: infrastructure maintenance fee 5% capped $500; trade deducted, reimbursed rebate taxable. Annual property tax and road fees excluded.'},
 GA:{status:'estimate',rebateDeduct:true,source:'https://dor.georgia.gov/document/document/motor-vehicle-online-manual/download',gaps:'7% dealer TAVT, new rebate deducted; used direct-finance 4.5% with manual fair market value. Model year and seller category required. Pre-1990 vehicles excluded.'},
 DC:{status:'estimate',rate:0,tradeCredit:false,rebateDeduct:false,source:'https://dmv.dc.gov/book/dmv-fees/dmv-fees-0',gaps:'2025 weight/city-MPG excise matrix including EV 1–3%. Requires NADA Eastern Region FMV and unladen weight. EITC election pending DMV confirmation.'}
 }[r.state]||{}),verifiedOn,validThrough:'2026-12-31',coverage:'scoped-purchase'}));
export const jurisdictions=state=>state==='FL'?florida.records:state==='NY'?newYork.records:[];
export function resolveRule(zip,defaults,location){
 if(location?.zip===zip&&location.state){try{return {rule:{...presetRule(location.state,location.jurisdiction),taxableFees:location.taxableFees||[]},locationStatus:'confirmed'}}catch(e){return {rule:null,reason:e.message}}}
 const saved=defaults.rules.find(r=>r.zip===zip);if(saved)return {rule:saved,locationStatus:'saved'};
 const candidates=zipCandidates(zip),states=[...new Set(candidates.map(c=>c.state))];
 if(!candidates.length)return {rule:null,reason:'ZIP is not covered by the public location index. Choose the registration location in Tax details.'};
 if(states.length!==1||states[0]==='outside-scope')return {rule:null,reason:'ZIP crosses state boundaries or is outside East Coast coverage. Confirm the registration location in Tax details.'};
 const state=states[0];
 if(state==='NY'||state==='FL'&&candidates.length!==1)return {rule:null,reason:'Confirm the registration county / tax jurisdiction in Tax details. ZIP alone is ambiguous.'};
 if(defaults.fees.slice(defaults.feeSchemaVersion===2?1:3).some(f=>Number(f.amount)>0&&typeof f.taxable!=='boolean'))return {rule:null,reason:'Review additional named fee taxability in Saved defaults before using an automatic ZIP estimate.'};
 const jurisdiction=state==='FL'?candidates[0].name.replace(/ County$/,''):'';
 try{return {rule:{...presetRule(state,jurisdiction),taxableFees:[]},locationStatus:'inferred'}}catch(e){return {rule:null,reason:e.message}}
}
export function presetRule(state,jurisdiction){const spec=eastCoast.find(r=>r.state===state&&r.status==='estimate');if(!spec)throw Error('This state is not ready for automatic estimates.');const local=jurisdictions(state).find(r=>r.name===jurisdiction);if(['FL','NY'].includes(state)&&!local)throw Error('Confirm a county or reporting jurisdiction.');return {preset:state,jurisdiction:local?.name||'',rate:state==='NY'?local.rate:spec.rate,tradeCredit:spec.tradeCredit,rebateDeduct:spec.rebateDeduct,minimum:spec.minimum||0,countyRate:state==='FL'?local.rate:0,verifiedOn,validThrough:spec.validThrough,source:spec.source};}
export class TaxPending extends Error {}
export function taxContext(rule,deal){
 const c=deal.taxContext||{},state=rule.preset;
 const required=(key,label)=>{if(c[key]===''||c[key]==null)throw new TaxPending(`${label} is required in Tax details.`);return c[key]};
 const positive=(key,label)=>{const n=Number(required(key,label));if(!Number.isFinite(n)||n<=0)throw new TaxPending(`${label} must be greater than zero.`);return n};
 const result={tradeCredit:rule.tradeCredit,rebateDeduct:rule.rebateDeduct};
 if(state==='RI'&&Number(deal.trade)>0){const vehicle=required('vehicleClass','Purchased vehicle category'),trade=required('tradeClass','Trade category');result.tradeCredit=vehicle==='passenger'&&trade==='passenger'}
 if(state==='GA'){
  const year=positive('modelYear','Model year');if(!Number.isInteger(year)||year<1990||year>new Date().getFullYear()+2)throw new TaxPending('Georgia historic/non-title vehicles require a separate assessment. Supported model years start at 1990.');
  const seller=required('sellerType','Dealer financing category');if(!['ordinary','direct'].includes(seller))throw new TaxPending('Confirm the dealer financing category.');
  result.rebateDeduct=deal.condition==='new';result.directFinance=seller==='direct'&&deal.condition==='used';
  if(result.directFinance)result.assessedValue=positive('assessedValue','Georgia manual fair market value');
 }
 if(state==='NJ'&&deal.condition==='new'){
  const fuel=required('fuel','Powertrain');if(!['combustion','electric','unrated'].includes(fuel))throw new TaxPending('Confirm powertrain.');
  result.averageMpg=fuel==='combustion'?positive('averageMpg','EPA city/highway average MPG'):null;result.fuel=fuel;
 }
 if(state==='DC'){
  result.assessedValue=positive('assessedValue','DC NADA Eastern Region fair market value');result.weight=positive('weight','Unladen weight');
  result.fuel=required('fuel','Powertrain');if(!['combustion','electric'].includes(result.fuel))throw new TaxPending('DC requires a supported powertrain.');
  result.cityMpg=result.fuel==='electric'?null:positive('cityMpg','EPA city MPG');
  const eitc=required('eitc','DC EITC eligibility');if(eitc!=='no')throw new TaxPending('DC EITC election requires DMV confirmation of the applicable benchmark schedule.');
 }
 return result;
}
export function taxAmount(rule,base,beforeTrade,today=new Date().toISOString().slice(0,10),context={}){
  if(rule.preset){
    if(today>rule.validThrough)throw Error('Saved tax dataset has expired. Review an updated release in Saved defaults.');
    const resolved=presetRule(rule.preset,rule.jurisdiction);
    let rate=rule.preset==='CT'&&beforeTrade>50000?7.75:resolved.rate;
    let label='Estimated tax',tax;
    const components=[];
    if(rule.preset==='DC'){
      if(!context.assessedValue||!context.weight||!context.fuel)throw new TaxPending('Complete DC Tax details.');
      const weight=context.weight<3500?0:context.weight<5000?1:2;
      const mpg=Math.floor(context.cityMpg),band=context.fuel==='electric'?5:mpg<=20?0:mpg<=25?1:mpg<=30?2:mpg<=39?3:4;
      rate=[[9,5,3.1,2.2,1.5,1],[10,6,4.1,3.2,2.5,2],[11,7,5.1,4.2,3.5,3]][weight][band];
      tax=context.assessedValue*rate/100;label='Estimated DC excise tax';
    }else if(rule.preset==='DE'){
      tax=base<400?8:base<=500?13.75:Math.round(13.75+Math.ceil((base-500)/100)*5.25);label='Estimated DE document fee';
    }else if(rule.preset==='SC'){tax=Math.min(500,base*.05);label='Estimated SC infrastructure fee'}
    else if(rule.preset==='GA'){rate=context.directFinance?4.5:7;tax=base*rate/100;label='Estimated GA title ad valorem tax'}
    else if(rule.preset==='NC'){tax=base*.03;label='Estimated NC highway use tax'}
    else tax=Math.max(resolved.minimum,base*rate/100)+(rule.preset==='FL'?Math.min(5000,base)*resolved.countyRate/100:0);
    components.push({label,amount:tax});
    if(rule.preset==='NJ'&&context.fuel){const exempt=context.fuel==='electric'||context.fuel==='unrated'||context.averageMpg>40;const liable=!exempt&&(beforeTrade>=45000||context.averageMpg<19);if(liable)components.push({label:'NJ luxury / fuel surcharge',amount:beforeTrade*.004})}
    return {rate,tax:components.reduce((sum,c)=>sum+c.amount,0),countyRate:resolved.countyRate,components};
  }
  return {rate:Number(rule.rate),tax:base*Number(rule.rate)/100,countyRate:0};
}
// Licensed provider boundary: address resolution and automobile rules belong on a
// server, never an API key in the PWA. Explicit unsupported responses are required.
export async function providerEstimate(request,{endpoint,fetcher=fetch}={}){
  if(!endpoint) return {status:'unavailable',reason:'No automotive tax provider connected.'};
  const response=await fetcher(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request)});
  if(!response.ok)throw Error('Tax provider could not verify this estimate.');
  const result=await response.json();
  if(result.status!=='verified'||!result.provenance||!Array.isArray(result.components)||!result.jurisdictionId||!result.effectiveFrom)throw Error('Tax provider returned incomplete coverage.');
  return result;
}
