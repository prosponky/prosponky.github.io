import {inventoryArrivalKey} from './inventory-changes.js';
import {settingsStoreGrants,storeScopes,defaultStoreScope} from './store-access.js';
import {bindAdminBannerActivity} from './admin-banner-activity.js';
import {uiIcon} from './ui-icons.js';
import {mountWorksheet} from './quote-worksheet.js';
import {creditEstimateRate} from './credit-estimate.js';
import './modal-scroll.js';
import {startLastActive} from './last-active.js';
import {startOctoberEffect,previewOctoberEffect} from './october-effect.js';
import {openUserSettings} from './admin-user-actions.js';
import {isBudgetAccount,budgetVehicle,checkBudgetArrivals,confettiMarkup,showBudgetPreview} from './budget-arrivals.js';
import {verifiedCarfaxUrl} from './carfax.js';
import {usableCustomerCash} from './coggin-offers.js';

import {adminState,effectiveOwner,refreshAdmin,searchAdminUsers,openAdminUser,saveAdminStore} from './admin.js';

import {notificationButton,bindNotifications,clearInventoryNotifications,addNotification} from './notifications.js';

import './style.css';
import './liquid-glass.css';

import {salesView,bindSales,resetSales,bindHomeRecap} from './sales.js';



import {loadDealerSettings,saveDealerSettings,resetDealerSettings} from './dealer-settings.js';



import {setup,setupView,bindSetup} from './onboarding.js';



import {authClient,authConfigured,authState,loginView,bindLogin,loadProviders} from './auth.js';







import {calculate,pencilFees,customerRows,emptyDefaults,money,number,gross,validateDefaults,taxNote} from './calc.js';







async function exportPdf(value){const viewer=window.open('about:blank','_blank');if(viewer)viewer.opener=null;try{const pdf=await import('./pdf.js');const url=URL.createObjectURL(new Blob([pdf.pdfBytes(value)],{type:'application/pdf'}));if(viewer)viewer.location.replace(url);else window.location.assign(url);setTimeout(()=>URL.revokeObjectURL(url),300000);return true;}catch(e){viewer?.close();fail(e);return false;}}



async function exportPayoffPdf(value){try{const pdf=await import('./pdf.js');pdf.exportPayoffPdf(value);}catch(e){fail(e);}}



import {inventoryFreshnessLabels,inventoryStockLabel,inventoryColorLabel,inventorySearchMatches,stockMatches,inventoryDeal,inventoryDisplayPrice,loadInventory,inventoryFresh,setInventoryAccess,inventoryAccessMessage,inventoryStores} from './inventory.js';



import {guideView} from './guide.js';



import {makes,models} from './vehicle.js';



import {lenders} from './lenders.js';



import {scanVin,decodeVin,openVinScanner} from './vin.js';



import {readHistory,historyEntry,historyStorageKey,setHistoryOwner} from './history.js';







import {eastCoast,jurisdictions,presetRule,zipCandidates,resolveRule} from './tax.js';







const app=document.querySelector('#app');







const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));







let storageWarning='',defaults=emptyDefaults();







try{const saved=JSON.parse(localStorage.getItem('pd-defaults')||'null');if(saved)defaults=validateDefaults(saved)}catch{storageWarning='Saved defaults could not be read. Review and save defaults before quoting.'}







let deal={mode:'cash',condition:'used',vehicle:'',price:'',discount:'',rebate:'',trade:'',payoff:'',zip:'',apr:'6.9',term:'60',downs:['0','1000','2000']};







let menuReturn='home',settingsReturn='home';



let cost='',recon='',screen='home',draft=null,quote=null,error='',notice='';







let dealerReady=!authConfigured,dealerLoading=authConfigured,dealerLoadError='';



const defaultsStorageKey=()=>authState.user?'pd-defaults-'+effectiveOwner():'pd-defaults';



let inventoryQuoteReturn=null;let budgetPinsPending=null;
const budgetAccountEmail=()=>adminState.allowed&&adminState.target?adminState.target.email:authState.user?.email;
let flow={step:0,conditionAnswered:true,models:[],search:'',loading:false,catalogNote:''},quoteRecord=null,historyWarning='',history=[];



try{history=readHistory()}catch(e){historyWarning=e.message}



const rawValue=el=>el?.hasAttribute('data-money')?(el.value===el.dataset.moneyDisplay?el.dataset.moneyRaw:el.value.replace(/[$,]/g,'').trim()):el?.value;



const input=(id,label,value,hint='',type='number',placeholder='')=>{



 const currency=type==='number'&&/^(?:g-)?(?:price|discount|rebate|trade|payoff|perDiem|cost|recon|down\d+|fee-amount-\d+|tax-assessedValue|setup-(?:new|transfer)-tag|settings-(?:new|transfer)-tag)$/.test(id);



 const n=Number(String(value??'').replace(/[$,]/g,''));



 const shown=currency&&value!==''&&value!=null&&Number.isFinite(n)?money(n):value;



 return `<label for="${id}">${label}<input id="${id}" name="${id}" type="${currency?'text':type}" ${currency?`data-money data-money-raw="${esc(value??'')}" data-money-display="${esc(shown)}" inputmode="decimal" placeholder="$0.00"`:type==='number'?'inputmode="decimal" min="0" step="0.01"':id.includes('zip')?'inputmode="numeric" maxlength="5" pattern="[0-9]{5}"':''} ${!currency&&placeholder?`placeholder="${esc(placeholder)}"`:''} value="${esc(shown)}">${hint?`<small>${esc(hint)}</small>`:''}</label>`;



};







const row=(label,value,strong=false)=>`<div class="line ${strong?'total':''}"><span>${esc(label)}</span><b>${value===null?'Pending tax':money(value)}</b></div>`;







function header(title,sub){return `<header><div><h1>${['deal','guide'].includes(screen)?'<button type="button" class="brand-home" id="brand-home" aria-label="Pocket Desking — back to beginning"><span class="brand-crop" aria-hidden="true"><img src="/brand-reference.png" alt=""></span></button>':title}</h1><p>${sub}</p></div>${['deal','guide','history'].includes(screen)?'<button class="icon" data-go="menu" aria-label="Menu">⋯</button>':`<button class="quiet" data-go="${['defaults','history'].includes(screen)?'home':'deal'}">Back</button>`}</header>`}







function presetControls(r,i){const candidates=zipCandidates(r.zip);return `${candidates.length?`<small>Census 2020 location candidates: ${esc(candidates.map(c=>c.state+' · '+c.name).join('; '))}. ${candidates.length>1?'This area crosses county boundaries. ':''}ZCTA geography is not a USPS ZIP certificate; confirm the state and jurisdiction below.</small>`:'<small>No Census location suggestion. Confirm the ZIP and registration jurisdiction.</small>'}<label for="preset-${i}">Tax source<select id="preset-${i}" data-preset="${i}"><option value="">Custom verified rule</option>${eastCoast.filter(s=>s.status==='estimate').map(s=>`<option value="${s.state}" ${r.preset===s.state?'selected':''}>${s.name} · scoped estimate</option>`).join('')}</select></label>${jurisdictions(r.preset).length?`<label for="jurisdiction-${i}">Confirmed registration jurisdiction<select id="jurisdiction-${i}" data-jurisdiction="${i}"><option value="">Select jurisdiction</option>${jurisdictions(r.preset).map(j=>`<option ${r.jurisdiction===j.name?'selected':''} value="${esc(j.name)}">${esc(j.name)} (${j.rate}%)</option>`).join('')}</select><small>A ZIP can cross boundaries. Confirm this jurisdiction before saving; this is your explicit ZIP binding.</small></label>`:''}${r.preset?`<small>${esc(eastCoast.find(s=>s.state===r.preset)?.gaps)} <a href="${eastCoast.find(s=>s.state===r.preset)?.source}" target="_blank" rel="noopener">Official source</a></small>`:''}`}







function coverage(){return `<details><summary>East Coast database coverage</summary><p class="muted">Research snapshot: October 4, 2026. Purchase-tax estimates only; All 15 East Coast jurisdictions have scoped dealer-purchase rules. ZIP bindings require confirmation; annual property taxes and special transactions are excluded.</p>${eastCoast.map(s=>`<div class="coverage"><b>${esc(s.name)}</b><small>${s.status==='estimate'?'Scoped estimate available':'Research only — calculation not enabled'} · ${esc(s.gaps)} <a href="${s.source}" target="_blank" rel="noopener">Source</a></small></div>`).join('')}</details>`}







const select=(key,label,options)=>`<label for="tax-${key}">${label}<select id="tax-${key}" name="${key}"><option value="">Choose</option>${options.map(([value,name])=>`<option value="${value}" ${deal.taxContext?.[key]===value?'selected':''}>${name}</option>`).join('')}</select></label>`;







function taxView(){const zip=deal.zip||defaults.zip,rule=resolveRule(zip,defaults,deal.taxLocation).rule,s=deal.taxLocation?.zip===zip?deal.taxLocation.state:rule?.preset||'',c=deal.taxContext||{};return `${header('Tax details','Vehicle facts for this estimate only')}<div id="message"></div><form id="tax-form"><label>Registration state<select id="location-state"><option value="">Choose state</option>${eastCoast.map(r=>`<option value="${r.state}" ${s===r.state?'selected':''}>${r.name}</option>`).join('')}</select></label>${jurisdictions(s).length?`<label>Registration county / tax jurisdiction<select id="location-jurisdiction"><option value="">Choose jurisdiction</option>${jurisdictions(s).map(j=>`<option value="${esc(j.name)}" ${(deal.taxLocation?.jurisdiction||rule?.jurisdiction)===j.name?'selected':''}>${esc(j.name)}</option>`).join('')}</select></label>`:''}<p>${esc(eastCoast.find(r=>r.state===s)?.gaps||'Choose a state rule for this ZIP in Saved defaults.')}</p>${s==='RI'?select('vehicleClass','Purchased vehicle category',[['passenger','Private passenger automobile / motorhome'],['other','Truck / other']])+select('tradeClass','Trade category',[['passenger','Private passenger automobile / motorhome'],['other','Truck / other']]):''}${s==='GA'?input('tax-modelYear','Model year',c.modelYear)+select('sellerType','Dealer financing category',[['ordinary','Ordinary dealer sale'],['direct','Buy here pay here / direct dealer financed']])+input('tax-assessedValue','Georgia manual fair market value',c.assessedValue,'Only needed for a used direct-finance purchase'):''}${s==='NJ'&&deal.condition==='new'?select('fuel','Powertrain',[['combustion','Gas / diesel / hybrid'],['electric','Certified zero-emission vehicle'],['unrated','No EPA MPG rating']])+input('tax-averageMpg','EPA average MPG',c.averageMpg,'(EPA city MPG + highway MPG) ÷ 2; not combined MPG'):''}${s==='DC'?select('fuel','Powertrain',[['combustion','Gas / diesel / hybrid'],['electric','Electric vehicle']])+input('tax-assessedValue','NADA Eastern Region fair market value',c.assessedValue)+input('tax-weight','Unladen weight (lb)',c.weight)+input('tax-cityMpg','EPA city MPG',c.cityMpg,'Required for non-electric vehicles; decimals round down')+select('eitc','DC EITC eligibility',[['no','No EITC election'],['yes','Eligible — DMV review required']]):''}<small>Ordinary dealer passenger purchases only. Leases, exempt transactions, cross-state credits, adaptive equipment, valuation overrides and annual property taxes require separate review. Government title and registration amounts stay in Saved defaults.</small>${(defaults.feesByCondition?.[deal.condition]||defaults.fees).slice(1).map((f,i)=>`<label class="check"><input type="checkbox" id="location-fee-${i+1}" ${deal.taxLocation?.taxableFees?.includes(i+1)?'checked':''}>Taxable: ${esc(f.name)}</label>`).join('')}<button class="primary">Apply tax details</button></form>`}











let restoredPage=false;



function saveCurrentPage(){if(adminState.target){sessionStorage.removeItem('pd-refresh-page');return;}



 if(!['home','guide','deal','inventory','menu','sales','history','defaults','cost','tax','review'].includes(screen))return;



 try{readGuide();readDeal();if(screen==='defaults')readDraft();if(screen==='cost'){cost=rawValue(document.querySelector('#cost'));recon=rawValue(document.querySelector('#recon'));}sessionStorage.setItem('pd-refresh-page',JSON.stringify({owner:authState.user?.id||null,screen,deal,flow,draft,quote,quoteRecord,cost,recon,menuReturn}));}catch{}



}



function restoreCurrentPage(){



 if(restoredPage)return;restoredPage=true;



 try{const saved=JSON.parse(sessionStorage.getItem('pd-refresh-page')||'null');sessionStorage.removeItem('pd-refresh-page');if(!saved||saved.owner!==(authState.user?.id||null)||!['home','guide','deal','inventory','menu','sales','history','defaults','cost','tax','review'].includes(saved.screen))return;



 if(saved.screen==='review'&&!saved.quote)return;screen=saved.screen;deal=saved.deal;flow={...saved.flow,loading:false};draft=saved.draft?validateDefaults(saved.draft):null;quote=saved.quote;quoteRecord=saved.quoteRecord;cost=saved.cost;recon=saved.recon;menuReturn=saved.menuReturn||'guide';



 }catch{}



}



window.addEventListener('pagehide',saveCurrentPage);



window.addEventListener('beforeunload',saveCurrentPage);



async function refreshDealer(userId){



 if(!userId)return;dealerLoading=true;dealerLoadError='';render();



 try{let saved;try{saved=await loadDealerSettings(userId);}catch(e){const cached=localStorage.getItem('pd-defaults-'+userId);if(!cached)throw e;saved=validateDefaults(JSON.parse(cached));if(!saved.displayName||!/^\d{5}$/.test(saved.zip))throw e;}



  if(effectiveOwner()!==userId)return;



  if(saved){if(saved.feesByCondition&&!saved.tagFees)saved.tagFees={new:425,transfer:200};defaults=saved;localStorage.setItem(defaultsStorageKey(),JSON.stringify(saved));dealerReady=true;screen='home';if(!adminState.target)restoreCurrentPage();}



  else{defaults=emptyDefaults();setup.values={...emptyDefaults(),displayName:''};setup.step=0;setup.returnTo='home';dealerReady=false;screen='setup';}



  dealerLoading=false;



 }catch(e){dealerLoadError=e.message;dealerLoading=true;}



 render();



}







let octoberStarted=false,disposeQuotePreview=null;
function render(){disposeQuotePreview?.();disposeQuotePreview=null;
 if(!octoberStarted){octoberStarted=true;startOctoberEffect(()=>screen);}



  if(authConfigured&&(!authState.user||authState.recovery||authState.linkError))screen='login';



  else if(authConfigured&&dealerLoading)screen='account-loading';



  else if(authConfigured&&!dealerReady)screen='setup';



  app.classList.toggle('inventory-page',screen==='inventory');



  const openSettings=new Set(screen==='defaults'?[...app.querySelectorAll('details.settings-card[open]')].map(el=>el.querySelector('summary')?.textContent):[]);

  const existingHeader=app.querySelector('header');



  app.innerHTML=(screen==='account-loading'?`<header><h1>Pocket Desking</h1></header><div id="message"></div><p role="status">${dealerLoadError||'Loading your desk…'}</p>${dealerLoadError?'<button class="primary" id="retry-dealer">Try again</button>':''}<button class="quiet full" id="sign-out">Sign out</button>`:screen==='setup'?setupView({header:()=>'<header class="setup-header"><h1><span class="brand-crop"><img src="/brand-reference.png" alt="Pocket Desking"></span></h1></header>',input,esc}):screen==='login'?loginView(esc):screen==='home'?homeView():screen==='guide'?guideView(deal,flow,{header,input,esc,makes,lenders}):screen==='menu'?menuView():screen==='admin'?adminView():screen==='sales'?salesView(defaults.displayName||''):screen==='inventory'?inventoryView():screen==='history'?historyView():screen==='deal'?dealView():screen==='defaults'?defaultsView():screen==='cost'?costView():screen==='tax'?taxView():reviewView());



  const previewRoot=app.querySelector('.worksheet-preview');
  if(previewRoot)disposeQuotePreview=mountWorksheet(previewRoot,structuredClone(quote));
  if(screen==='defaults')app.querySelectorAll('details.settings-card').forEach(el=>{el.open=openSettings.has(el.querySelector('summary')?.textContent);});

  if(!['login','setup','account-loading'].includes(screen)){const sharedHeader=app.querySelector('header');if(sharedHeader){const actions=document.createElement('div');actions.className='header-actions';actions.innerHTML=(['inventory','sales','history','admin','defaults'].includes(screen)?'<button type="button" class="inventory-header-brand" data-go="home" aria-label="Pocket Desking home"><span class="brand-crop"><img src="/brand-reference.png" alt=""></span></button>':'')+notificationButton();const quoteLogo=sharedHeader.querySelector('.brand-home');if(quoteLogo){const logoHeading=quoteLogo.closest('h1');quoteLogo.classList.add('inventory-header-brand');actions.prepend(quoteLogo);logoHeading?.remove();sharedHeader.classList.add('quote-header');}sharedHeader.querySelectorAll(':scope > button').forEach(button=>actions.append(button));sharedHeader.prepend(actions);sharedHeader.classList.add('consistent-header');if(screen==='history')sharedHeader.classList.add('history-header');}}

  if(screen==='home'&&adminState.allowed&&!adminState.target&&/^mark\b/i.test(String(defaults.displayName||''))&&new Date().getMonth()===9){const previewKey='pd-mark-spider-preview-v4-'+authState.user.id;if(!sessionStorage.getItem(previewKey))setTimeout(()=>{if(screen==='home'&&previewOctoberEffect())sessionStorage.setItem(previewKey,'1');},800);}
  if(screen==='home'&&adminState.allowed&&!adminState.target&&new URLSearchParams(location.search).get('october-preview')==='1'&&!sessionStorage.getItem('pd-october-preview-session')&&new Date().getMonth()===9){const preview=document.createElement('button');preview.type='button';preview.className='quiet';preview.textContent='Preview spider';preview.onclick=()=>{if(previewOctoberEffect())preview.remove();else preview.textContent='Preview respects reduced motion';};app.querySelector('.home-hero')?.append(preview);}
  const nextHeader=app.querySelector('header');



  if(existingHeader&&nextHeader&&existingHeader.outerHTML===nextHeader.outerHTML)nextHeader.replaceWith(existingHeader);



  if(error){const box=document.querySelector('#message');box.innerHTML=`<p class="error" role="alert">${esc(error)}</p>`}







  if(adminState.target)app.insertAdjacentHTML('afterbegin',`<aside class="admin-banner"><strong>Viewing as ${esc(adminState.target.display_name||adminState.target.email)}</strong><small>${esc(adminState.target.email)}</small><small data-viewing-activity>Last active: Loading…</small><button type="button" id="return-admin">Return to admin</button></aside>`);

  const store=authState.user&&dealerReady&&!dealerLoading?inventoryScope():'';setInventoryAccess(effectiveOwner(),store,inventoryGrants());

  if(!['__all__','__assigned__'].includes(store)&&!inventoryStores[store]){inventoryArrivalVins=null;if(!(adminState.allowed&&!adminState.target))clearInventoryNotifications(effectiveOwner());}

  bind();

  bindNotifications(effectiveOwner(),(vins,arrivalStore='GW Kia Ave',budget=false,preview=false)=>{if(preview){showBudgetPreview();return;}if(adminState.allowed&&!adminState.target){adminInventoryStore=arrivalStore;localStorage.setItem('pd-admin-inventory-store-v2',adminInventoryStore);}else {const grants=inventoryGrants();if(!storeScopes(grants,inventoryStores).includes(arrivalStore)&&!(arrivalStore==='__assigned__'&&grants.length>1))return;defaults.inventoryStorePreference=arrivalStore;localStorage.setItem('pd-group-inventory-store-'+effectiveOwner(),arrivalStore);}inventoryArrivalVins=new Set(vins);if(budget)budgetPinsPending={owner:effectiveOwner(),vins};screen='inventory';render();},email=>{if(!adminState.allowed||adminState.target)return;adminSearchDraft=email;screen='admin';render();});clearInventoryNotifications(effectiveOwner());configureBudgetAlerts();if(adminState.allowed&&!adminState.target)checkNewUsers();







}







function dealView(){if(deal.mode==='finance'){if(!Array.isArray(deal.terms)){deal.terms=['36','48','72'];deal.downs=['1000','2000','3000'];}deal.creditTier=['bad','good','great'].includes(deal.creditTier)?deal.creditTier:'good';deal.apr=String(creditEstimateRate(deal.condition,deal.creditTier));}let q;try{q=calculate(deal,defaults)}catch{}







return `${header('Pocket Desking','Faster than your Desk Manager')}<div id="message">${storageWarning?`<p class="error">${esc(storageWarning)}</p>`:''}${notice?`<p role="status">${esc(notice)}</p>`:''}</div><form id="deal-form" novalidate>







<div class="segments" aria-label="Deal type">${['cash','finance'].map(m=>`<button type="button" data-mode="${m}" aria-pressed="${deal.mode===m}" class="${deal.mode===m?'selected':''}">${m==='cash'?'Cash':'Finance'}</button>`).join('')}</div>











${flow.fromInventory?`<div class="pencil-selected-vehicle"><strong>${esc([deal.year,makes.find(m=>String(m.id)===String(deal.makeId))?.name,deal.model].filter(Boolean).join(' ')||deal.vehicle)}</strong><span>Stock # ${esc(deal.stockNumber)}</span><input type="hidden" id="vehicle" value="${esc(deal.vehicle||'')}"></div>`:input('vehicle','Vehicle',deal.vehicle,'','text')}







${input('price',deal.condition==='new'?'MSRP':'Sales price',deal.price)}${input('discount','Dealer discount',deal.discount)}







${deal.condition==='new'?`<input type="hidden" id="rebate" value="${esc(deal.rebate||'')}">`+rebateOfferView():''}







${defaults.tagFees?`<div class="tag-options"><input type="hidden" id="tagType" value="${deal.tagType==='transfer'?'transfer':'new'}"><div class="rebate-offer"><span class="rebate-label"><label for="transfer-tag">Transfer tag?</label><button type="button" class="rebate-info" id="tag-info" aria-label="Tag fee information">i</button></span><input type="checkbox" id="transfer-tag" ${deal.tagType==='transfer'?'checked':''}></div></div>`:''}



<div class="tag-options"><div class="rebate-offer"><label class="rebate-label" for="add-trade">Add a trade?</label><input type="checkbox" id="add-trade" ${deal.hasTrade===true?'checked':''}></div></div>${deal.hasTrade===true?input('trade','Giving for trade',deal.trade)+input('payoff','Trade payoff',deal.payoff):''}<div class="zip-field"><div class="zip-heading"><label for="zip">Customer ZIP</label><button type="button" class="zip-info rebate-info" id="zip-tax-info" aria-label="Tax details for Customer ZIP">i</button></div><input id="zip" name="zip" type="text" inputmode="numeric" maxlength="5" pattern="[0-9]{5}" value="${esc(deal.zip||'')}" placeholder="${esc(defaults.zip||'')}"></div>















${deal.mode==='finance'?`<section><h2>Payment options</h2><input type="hidden" id="apr" value="${esc(deal.apr)}"><fieldset class="credit-choice"><legend>How’s your credit?</legend><div class="credit-bar">${[['bad','Bad'],['good','Good'],['great','Great']].map(([value,label])=>`<label class="credit-band credit-${value}"><input type="radio" name="creditTier" value="${value}" ${deal.creditTier===value?'checked':''}><span>${label}</span></label>`).join('')}</div></fieldset><table class="payment-grid"><thead><tr><th scope="col">Down payment</th>${deal.downs.map((v,i)=>`<th scope="col"><span class="grid-down-input"><span aria-hidden="true">$</span><input id="down${i}" name="down${i}" aria-label="Down payment ${i+1}" placeholder="0" inputmode="numeric" value="${esc(v)}"></span></th>`).join('')}</tr></thead><tbody>${deal.terms.map((v,i)=>`<tr><th scope="row"><label><input id="payment-term${i}" name="payment-term${i}" aria-label="Loan term ${i+1} in months" inputmode="numeric" value="${esc(v)}"><span>months</span></label></th>${deal.downs.map((_,j)=>`<td data-payment-cell="${i}-${j}"><span class="grid-payment">${q?.paymentGrid?.[i]?.scenarios[j]?.payment!=null?'$'+Math.ceil(q.paymentGrid[i].scenarios[j].payment):'—'}</span>${j===deal.downs.length-1&&deal.terms.length>1?`<button type="button" class="grid-remove-term" data-remove-term="${i}" aria-label="Remove term row ${i+1}">${uiIcon("trash",22)}</button>`:''}</td>`).join('')}</tr>`).join('')}</tbody></table>${deal.terms.length<3?'<button type="button" class="grid-add-term" id="add-payment-term" aria-label="Add term row">+ add term</button>':''}<small>Credit-based payment estimate. Approval and lender terms may differ.</small></section>`:''}







<button class="primary" type="submit">Quick Quote</button><button class="quiet full" type="button" data-go="${flow.fromInventory?'inventory':'guide'}">Back</button></form>`}







async function bindAdminHomeRecap(){const root=document.querySelector('#home-admin-recap');if(!root||!adminState.allowed||adminState.target)return;try{const users=await searchAdminUsers('');if(root.isConnected&&adminState.allowed&&!adminState.target)root.querySelector('#home-user-count').textContent=String(new Set([...users.map(u=>u.user_id),authState.user.id]).size);}catch{if(root.isConnected)root.querySelector('#home-admin-status').textContent='User count unavailable.';}}
function homeView(){const firstName=String(defaults.displayName||'').trim().split(/\s+/)[0];return `<header class="home-header"><button class="icon" data-go="menu" aria-label="Menu">⋯</button></header><div class="home-hero"><span class="brand-crop"><img src="/brand-reference.png" alt="Pocket Desking"></span><p>Faster than your Desk Manager</p></div><h1 class="home-greeting">Hello${firstName?' '+esc(firstName):''}</h1><nav class="home-shortcuts" aria-label="Main menu"><button type="button" class="home-inventory" data-go="inventory">Inventory</button><button type="button" data-go="sales">Sales tracking</button><button type="button" data-go="${adminState.allowed&&!adminState.target?'admin':'defaults'}">${adminState.allowed&&!adminState.target?'Admin':'Settings'}</button></nav>${adminState.allowed&&!adminState.target?'<section id="home-admin-recap" aria-label="Account overview"><div class="home-recap-grid"><span>Users<button type="button" class="recap-number" data-go="admin" id="home-user-count" aria-label="View users">—</button></span><span>Stores<button type="button" class="recap-number" data-go="inventory" aria-label="View stores">'+Object.values(inventoryStores).filter(store=>store.file).length+'</button></span></div><p id="home-admin-status" role="status"></p></section>':'<section id="home-recap" aria-label="Monthly recap"></section>'}<div id="message"></div>`}



function menuView(){return `<header><h1>Menu</h1><button class="quiet" data-go="${menuReturn}">Back</button></header><button class="quiet full" data-go="home">Home</button><button class="quiet full" id="start-new-quote">Start a new quote</button><button class="quiet full" data-go="sales">Sales tracking</button><button class="quiet full" data-go="inventory">Inventory</button><button class="quiet full" data-go="history">History</button><button class="quiet full" data-go="defaults">Settings</button>${adminState.allowed?'<button class="quiet full admin-highlight" data-go="admin">Admin settings</button>':''}${authState.user?'<button class="quiet full" id="sign-out">Sign out</button>':'<button class="quiet full" data-go="login">Sign in</button>'}<div id="message"></div>`}







function rebateOfferView(){
 const offers=deal.condition==='new'&&deal.offerVin===deal.vin&&deal.offerStock===deal.stockNumber?usableCustomerCash(deal.rebateOffers,deal.offerCheckedAt).filter(o=>!o.conditional):[];

 const rows=conditional=>offers.map((o,i)=>({o,i})).filter(({o})=>!!o.conditional===conditional).map(({o,i})=>{
  const label=o.category==='military'?'military':o.category==='graduate'?'college graduate':'customer cash';
  const selected=deal.appliedRebateOffer===o.id&&number(deal.rebate)===o.amount;
  return '<div class="rebate-offer"><span class="rebate-label"><button type="button" class="rebate-amount" data-use-cash="'+i+'" aria-label="Select '+esc(money(o.amount))+' '+esc(label)+'" aria-pressed="'+selected+'">'+esc(money(o.amount).replace(/\.00$/,''))+'</button><span class="rebate-name">'+esc(label)+'</span><button type="button" class="rebate-info" data-rebate-info="'+i+'" aria-label="Information about '+esc(label)+'">i</button></span><button type="button" class="rebate-select" data-use-cash="'+i+'" aria-pressed="'+selected+'" aria-label="Use '+esc(money(o.amount))+' '+esc(label)+'">'+(selected?'&#10003;':'')+'</button></div>';
 }).join('');
 const general=rows(false),conditional=rows(true);
 const pulled=offers.length&&Number.isFinite(Date.parse(deal.offerCheckedAt))?new Date(deal.offerCheckedAt).toLocaleDateString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',year:'numeric'}):'';
 const heading='Available rebates'+(pulled?' as of '+pulled:'');
 return '<section class="rebate-offers"><div class="rebate-heading"><strong>'+esc(heading)+'</strong><button type="button" class="rebate-add" id="add-quote-rebate" aria-label="Add rebate for this quote">+ add</button></div>'+general+(deal.appliedRebateOffer==='custom'?'<div class="rebate-offer"><span>'+esc(money(number(deal.rebate)))+' '+esc(deal.customRebateName||'Custom rebate')+'</span><button type="button" class="rebate-select" id="remove-custom-rebate" aria-label="Remove custom rebate" aria-pressed="true">✓</button></div>':'')+(conditional?'<div class="rebate-conditional">'+conditional+'</div>':'')+'</section>';
}
function openZipTaxDetails(){
 readDeal();const originalLocation=structuredClone(deal.taxLocation),originalContext=structuredClone(deal.taxContext);let applied=false;
 const dialog=document.createElement('dialog');dialog.className='payoff-reminder zip-tax-dialog';dialog.setAttribute('aria-label','Tax details');
 const capture=()=>{const c={};for(const el of dialog.querySelector('#tax-form').elements)if(el.id.startsWith('tax-'))c[el.id.slice(4)]=rawValue(el);deal.taxContext=c;};
 const draw=()=>{const view=taxView(),start=view.indexOf('<form id="tax-form">');dialog.innerHTML='<h2>Tax details</h2>'+view.slice(start)+'<button type="button" class="quiet full" data-close-tax>Close</button>';
 dialog.querySelector('[data-close-tax]').onclick=()=>dialog.close();
 dialog.querySelector('#location-state').onchange=e=>{capture();deal.taxLocation={zip:deal.zip||defaults.zip,state:e.target.value,jurisdiction:''};draw();};
 dialog.querySelector('#tax-form').onsubmit=e=>{e.preventDefault();capture();const state=dialog.querySelector('#location-state').value;if(state)deal.taxLocation={zip:deal.zip||defaults.zip,state,jurisdiction:dialog.querySelector('#location-jurisdiction')?.value||'',taxableFees:(defaults.feesByCondition?.[deal.condition]||defaults.fees).flatMap((f,i)=>dialog.querySelector('#location-fee-'+i)?.checked?[i]:[])};applied=true;dialog.close();render();};};
 dialog.addEventListener('close',()=>{if(!applied){deal.taxLocation=originalLocation;deal.taxContext=originalContext;}dialog.remove();},{once:true});document.body.append(dialog);draw();dialog.showModal();
}
function rebateInformation(index){
 const offer=deal.condition==='new'&&deal.offerVin===deal.vin&&deal.offerStock===deal.stockNumber?usableCustomerCash(deal.rebateOffers,deal.offerCheckedAt).filter(o=>!o.conditional)[index]:null;if(!offer)return;
 const dialog=document.createElement('dialog');dialog.className='payoff-reminder cash-offer-dialog';dialog.innerHTML='<h2>'+esc(offer.title||'Rebate information')+'</h2><p>'+esc(money(offer.amount))+' · Ends '+esc(new Date(offer.expirationDate).toLocaleDateString('en-US',{timeZone:'UTC'}))+'</p><p class="rebate-terms">'+esc(offer.terms||'Confirm eligibility and compatibility with the dealership.')+'</p><p>Confirm eligibility and compatibility with the dealership. Selecting an offer replaces the manufacturer rebate amount; offers are not combined.</p><button type="button" class="quiet full">Close</button>';document.body.append(dialog);dialog.showModal();dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.querySelector('button').onclick=()=>dialog.close();
}
function confirmCustomerCash(index){
 const eligible=()=>deal.condition==='new'&&deal.offerVin===deal.vin&&deal.offerStock===deal.stockNumber?usableCustomerCash(deal.rebateOffers,deal.offerCheckedAt).filter(o=>!o.conditional)[index]:null;
 const offer=eligible();if(!offer)return;readDeal();if(deal.appliedRebateOffer===offer.id&&number(deal.rebate)===offer.amount){deal.rebate='';deal.appliedRebateOffer='';render();return;}
 deal.rebate=String(offer.amount);deal.appliedRebateOffer=offer.id;render();
}

function inventoryModelLabel(model,expanded=false){const text=String(model||''),hybrid=/\b(?:hybrid|HEV|PHEV)\b/i.test(text);const name=text.replace(/\bGrand Cherokee\b/gi,'G Cherokee').replace(/\bWrangler Unlimited\b/gi,'Wrangler').replace(/\b(?:plug[ -]?in\s+hybrid|hybrid|PHEV|HEV)\b/gi,'').replace(/\s{2,}/g,' ').trim();return esc(name)+(hybrid?' <span class="hybrid-badge" title="Hybrid" aria-label="Hybrid">'+(expanded?'Hybrid':'H')+'</span>':'');}

function inventoryView(){const adminBrowsing=adminState.allowed&&!adminState.target,store=inventoryScope(),grants=settingsStoreGrants(defaults,inventoryStores),base=defaultStoreScope(grants),group=grants.length>1||inventoryStores[base]?.members?storeScopes(grants,inventoryStores).filter(n=>n!==base):null;const top=`<header><h1>Inventory</h1>${adminBrowsing||group?`<select class="admin-inventory-chip" id="admin-inventory-store" aria-label="View store inventory">${adminBrowsing?`<option value="">Choose a store</option><option value="__all__" ${store==='__all__'?'selected':''}>All stores</option>`:'<option value="">'+(grants.length>1?'All assigned stores':'All group stores')+'</option>'}${(adminBrowsing?adminInventoryStores:group).map(name=>`<option value="${esc(name)}" ${store===name?'selected':''}>${esc(name)}</option>`).join('')}</select>`:''}<button class="icon" data-go="menu" aria-label="Menu">&#8943;</button></header>`;if(!['__all__','__assigned__'].includes(store)&&!inventoryStores[store])return `${top}<section class="admin-empty"><h2>${adminBrowsing&&!store?'Choose a store':store?'Inventory unavailable':'No store assigned'}</h2><p>${adminBrowsing&&!store?'Select a store above to view its inventory.':store?'Inventory is not available for this store yet.':'Ask your administrator to assign your store to see inventory.'}</p></section>`;return `${top}<div class="inventory-browser"><div class="inventory-fixed"><div class="inventory-condition-row"><div class="segments inventory-filters">${store==='AutoNation USA Jax'||store==='AutoNation group'?'':'<button type="button" data-inventory-filter="new" aria-pressed="false">New</button>'}<button type="button" data-inventory-filter="used" aria-pressed="false">Used</button></div><button type="button" id="inventory-camera" aria-label="Scan inventory vehicle">${uiIcon("camera",22)}</button></div><div class="inventory-search-row"><input id="browse-search" type="search" placeholder="Search" aria-label="Search inventory" autocomplete="off"><button type="button" id="inventory-sort" aria-label="Sort inventory">${uiIcon("filter-2",22)}</button></div><div id="inventory-pinned"></div></div><div id="inventory-list" role="status">Loading inventory…</div></div><div id="message"></div>`}



function inventoryPinsKey(){return historyStorageKey()+'-inventory-pins'}



let inventoryOutsideTap=null,inventoryArrivalVins=null,adminSearchDraft='',adminInventoryStore=localStorage.getItem('pd-admin-inventory-store-v2')||'',adminInventoryStores=Object.keys(inventoryStores);

function inventoryGrants(){return adminState.allowed&&!adminState.target?undefined:settingsStoreGrants(defaults,inventoryStores);}
function inventoryScope(){if(adminState.allowed&&!adminState.target)return adminInventoryStore;const grants=inventoryGrants(),scopes=storeScopes(grants,inventoryStores),base=defaultStoreScope(grants),selected=localStorage.getItem('pd-group-inventory-store-'+effectiveOwner());const valid=name=>scopes.includes(name)||(name==='__assigned__'&&grants.length>1);return valid(defaults.inventoryStorePreference)?defaults.inventoryStorePreference:valid(selected)?selected:base;}

function rememberAdminStores(users){adminInventoryStores=[...new Set([...Object.keys(inventoryStores),...adminInventoryStores,...users.map(u=>u.store_label).filter(Boolean)])].sort();const select=document.querySelector('#admin-inventory-store');if(select){const current=select.value;select.innerHTML='<option value="">Choose a store</option><option value="__all__">All stores</option>'+adminInventoryStores.map(name=>`<option value="${esc(name)}">${esc(name)}</option>`).join('');select.value=current;}}

let adminUsersCheck=0,adminUsersChecking=false;

async function configureBudgetAlerts(){const owner=effectiveOwner(),email=budgetAccountEmail();if(!await isBudgetAccount(email)||owner!==effectiveOwner())return;addNotification(owner,'budget-preview-v1','🦄 Test alert · $5,000 arrivals',[],null,{budget:true,preview:true});checkBudgetArrivals(owner,email,loadInventory,()=>owner===effectiveOwner()&&email===budgetAccountEmail());}
async function checkNewUsers(){if(!adminState.allowed||adminState.target||adminUsersChecking||Date.now()-adminUsersCheck<60000)return;adminUsersChecking=true;const owner=authState.user?.id;try{const users=await searchAdminUsers('');rememberAdminStores(users);if(authState.user?.id!==owner||!adminState.allowed||adminState.target)return;const key='pd-admin-seen-users-'+owner;let known;try{known=JSON.parse(localStorage.getItem(key)||'null');}catch{}const seen=new Set(Array.isArray(known)?known:[]);for(const user of users){if(!seen.has(user.user_id)&&(known||!user.store_label))addNotification(owner,'new-user-'+user.user_id,'New user: '+(user.display_name||user.email)+' — assign a store',null,user.email);seen.add(user.user_id);}localStorage.setItem(key,JSON.stringify([...seen]));adminUsersCheck=Date.now();}catch{}finally{adminUsersChecking=false;}}

setInterval(()=>{if(document.visibilityState==='visible'&&adminState.allowed&&!adminState.target)checkNewUsers();},60000);




async function bindInventory(){

 const storePicker=document.querySelector('#admin-inventory-store');if(storePicker)storePicker.onchange=()=>{if(adminState.allowed&&!adminState.target){adminInventoryStore=storePicker.value;localStorage.setItem('pd-admin-inventory-store-v2',adminInventoryStore);}else {const selected=storePicker.value,owner=effectiveOwner(),previous=defaults.inventoryStorePreference;defaults.inventoryStorePreference=selected||defaultStoreScope(settingsStoreGrants(defaults,inventoryStores));localStorage.setItem('pd-group-inventory-store-'+owner,selected);saveDealerSettings(owner,structuredClone(defaults)).then(()=>localStorage.setItem(defaultsStorageKey(),JSON.stringify(defaults))).catch(e=>{if(effectiveOwner()===owner){defaults.inventoryStorePreference=previous;fail(e);}});}inventoryArrivalVins=null;render();};



 if(inventoryOutsideTap){document.removeEventListener('click',inventoryOutsideTap);inventoryOutsideTap=null;}



 const list=document.querySelector('#inventory-list'),root=document.querySelector('.inventory-browser'),pinnedList=document.querySelector('#inventory-pinned');if(!list)return;



 try{const data=await loadInventory();if(!list.isConnected)return;const budgetAccount=await isBudgetAccount(budgetAccountEmail());if(!list.isConnected)return;data.vehicles.sort((a,b)=>String(a.model).localeCompare(String(b.model),undefined,{sensitivity:'base',numeric:true})||String(a.stockNumber).localeCompare(String(b.stockNumber)));



 let pins=new Set();try{const saved=JSON.parse(localStorage.getItem(inventoryPinsKey())||'[]');if(Array.isArray(saved))pins=new Set(saved);}catch{};
 if(budgetPinsPending?.owner===effectiveOwner()){for(const vin of budgetPinsPending.vins)if(data.vehicles.some(v=>v.vin===vin&&budgetVehicle(v)))pins.add(vin);try{localStorage.setItem(inventoryPinsKey(),JSON.stringify([...pins]));}catch{}budgetPinsPending=null;}
 let scannedPins=new Set();try{const saved=JSON.parse(localStorage.getItem(inventoryPinsKey()+'-scanned')||'[]');if(Array.isArray(saved))scannedPins=new Set(saved.filter(vin=>pins.has(vin)));}catch{};



 list.innerHTML='<details class="inventory-freshness"><summary>Inventory last checked'+(inventoryFresh(data)?'':' · update overdue')+'</summary>'+ inventoryFreshnessLabels(data).map(label=>'<p>'+esc(label)+'</p>').join('')+'</details>'+data.vehicles.map((v,i)=>`<div class="inventory-item" data-inventory-item="${i}"><button type="button" class="inventory-tile${budgetAccount&&budgetVehicle(v)?' budget-unicorn':''}" data-browse-vehicle="${i}" aria-label="${esc([v.stockNumber,v.year,v.make,v.model].join(' '))}"><span class="inventory-stock">${v.newArrival?'<span class="arrival-badge" aria-label="New arrival"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6l5 4 4-7 4 7 5-4-2 13H5z" fill="currentColor"/></svg><small>New</small></span>':''}${esc(inventoryStockLabel(v))}</span><span class="inventory-model"><span class="inventory-model-name">${inventoryModelLabel(String(v.model||'').replace(/\bPathfinder\b/gi,'Path'))}</span>${v.condition==='used'&&v.certified===true?` <span class="hybrid-badge inventory-cpo-badge" aria-label="${v.storeLabel==='AutoNation USA Jax'?'AutoNation Certified':'Certified pre-owned'}">${v.storeLabel==='AutoNation USA Jax'?'CERT':'CPO'}</span>`:''}</span><span>${typeof (inventoryDisplayPrice(v))==='number'?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0,minimumFractionDigits:0}).format(inventoryDisplayPrice(v)):'N/A'}</span></button><button type="button" class="inventory-pin" data-pin="${i}" aria-label="Pin ${esc(v.stockNumber)}" aria-pressed="false">${uiIcon("pin",20)}</button></div>`).join('');



  let condition='',pinsOnly=false,sortBy='',arrivalVins=null;inventoryArrivalVins=null;const search=document.querySelector('#browse-search');



 const filterRows=[...root.querySelectorAll('[data-browse-vehicle]')].map(b=>({item:b.closest('.inventory-item'),vehicle:data.vehicles[Number(b.dataset.browseVehicle)]}));
 const filter=()=>{const q=search.value.trim().toLowerCase();filterRows.forEach(({item,vehicle:v})=>{item.hidden=(arrivalVins&&!arrivalVins.has(inventoryArrivalKey(v)))||!inventorySearchMatches(v,q)||(!pins.has(v.vin)&&(pinsOnly||(!!condition&&v.condition!==condition)));});};



 const compareVehicles=(a,b)=>{const tie=()=>String(a.model).localeCompare(String(b.model),undefined,{sensitivity:'base',numeric:true})||String(a.stockNumber).localeCompare(String(b.stockNumber));if(sortBy.startsWith('price')){const ap=inventoryDisplayPrice(a),bp=inventoryDisplayPrice(b);const av=typeof ap==='number'&&Number.isFinite(ap),bv=typeof bp==='number'&&Number.isFinite(bp);if(av!==bv)return av?-1:1;if(av)return (sortBy==='price-low'?ap-bp:bp-ap)||tie();}if(sortBy.startsWith('year'))return (sortBy==='year-old'?Number(a.year)-Number(b.year):Number(b.year)-Number(a.year))||tie();if(sortBy==='model-desc')return String(b.model).localeCompare(String(a.model),undefined,{sensitivity:'base',numeric:true})||String(a.stockNumber).localeCompare(String(b.stockNumber));return tie();};

 document.querySelector('#inventory-sort').onclick=()=>{const dialog=document.createElement('dialog');dialog.className='payoff-reminder';dialog.setAttribute('aria-label','Sort inventory');
 const crown='<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" style="color:#ffd35b;vertical-align:middle"><path d="M3 6l5 4 4-7 4 7 5-4-2 13H5z" fill="currentColor"/></svg>';
 const options=[['model','Model A to Z'],['price','Price: low to high'],['year','Year: oldest to newest'],['arrivals',crown+' New to inventory']];
 dialog.innerHTML='<h2>Sort inventory</h2>'+options.map(([value,label])=>`<button type="button" class="quiet full" data-sort="${value}" aria-pressed="false">${label}</button>`).join('')+'<button type="button" class="quiet full" data-close>Close</button>';document.body.append(dialog);dialog.showModal();dialog.onclose=()=>dialog.remove();dialog.querySelector('[data-close]').onclick=()=>dialog.close();
 const update=()=>{dialog.querySelectorAll('[data-sort]').forEach(option=>{const type=option.dataset.sort,selected=type==='arrivals'?!!arrivalVins:sortBy.startsWith(type);option.classList.toggle('selected',selected);option.setAttribute('aria-pressed',String(selected));if(type==='model')option.textContent=sortBy==='model-desc'?'Model Z to A':'Model A to Z';if(type==='price')option.textContent=sortBy==='price-high'?'Price: high to low':'Price: low to high';if(type==='year')option.textContent=sortBy==='year-new'?'Year: newest to oldest':'Year: oldest to newest';});document.querySelector('#inventory-sort').classList.toggle('selected',!!sortBy||!!arrivalVins);};
 update();dialog.querySelectorAll('[data-sort]').forEach(button=>button.onclick=()=>{const type=button.dataset.sort;if(type==='arrivals'){arrivalVins=arrivalVins?null:new Set(data.vehicles.filter(v=>v.newArrival).map(inventoryArrivalKey));}else{const cycle=type==='model'?['model','model-desc']:type==='price'?['price-low','price-high']:['year-old','year-new'];sortBy=sortBy===cycle[0]?cycle[1]:sortBy===cycle[1]?'':cycle[0];}update();orderPins();filter();});};

  const orderPins=()=>{const items=[...root.querySelectorAll('[data-inventory-item]')];items.sort((a,b)=>Number(pins.has(data.vehicles[Number(b.dataset.inventoryItem)].vin))-Number(pins.has(data.vehicles[Number(a.dataset.inventoryItem)].vin))||compareVehicles(data.vehicles[Number(a.dataset.inventoryItem)],data.vehicles[Number(b.dataset.inventoryItem)]));items.forEach(item=>{const v=data.vehicles[Number(item.dataset.inventoryItem)],button=item.querySelector('[data-pin]'),pinned=pins.has(v.vin);(pinned?pinnedList:list).append(item);item.classList.toggle('pinned',pinned);const stock=item.querySelector('.inventory-stock');stock.querySelector('.inventory-scanned')?.remove();if(pinned&&scannedPins.has(v.vin))stock.insertAdjacentHTML('afterbegin','<small class="inventory-scanned">Scanned</small>');button.classList.toggle('selected',pinned);button.setAttribute('aria-pressed',String(pinned));button.setAttribute('aria-label',(pinned?'Unpin ':'Pin ')+v.stockNumber);});};



 root.querySelectorAll('[data-pin]').forEach(b=>b.onclick=()=>{const v=data.vehicles[Number(b.dataset.pin)];if(pins.has(v.vin)){pins.delete(v.vin);scannedPins.delete(v.vin);}else pins.add(v.vin);try{localStorage.setItem(inventoryPinsKey(),JSON.stringify([...pins]));localStorage.setItem(inventoryPinsKey()+'-scanned',JSON.stringify([...scannedPins]));}catch{list.querySelector('[role="alert"]')?.remove();list.insertAdjacentHTML('afterbegin','<p role="alert">Pins could not be saved on this browser.</p>');}orderPins();filter();});orderPins();filter();



 search.oninput=()=>{pinsOnly=false;filter();};
 document.querySelector('#inventory-camera').onclick=async()=>{const vin=await openVinScanner({inventoryVins:data.vehicles.map(vehicle=>vehicle.vin)});if(!vin||screen!=='inventory'||!root.isConnected)return;const matches=data.vehicles.filter(v=>String(v.vin).toUpperCase()===vin);const message=document.querySelector('#message');if(matches.length!==1){message.textContent=matches.length?'More than one vehicle matches this VIN. Select a store and scan again.':'This VIN was not found in the selected inventory.';return;}const v=matches[0];pins.add(v.vin);scannedPins.add(v.vin);try{localStorage.setItem(inventoryPinsKey(),JSON.stringify([...pins]));localStorage.setItem(inventoryPinsKey()+'-scanned',JSON.stringify([...scannedPins]));}catch{message.textContent='Vehicle pinned for this visit. Pins could not be saved.';}condition='';arrivalVins=null;pinsOnly=false;search.value=v.stockNumber;document.querySelectorAll('[data-inventory-filter]').forEach(b=>{b.classList.remove('selected');b.setAttribute('aria-pressed','false');});orderPins();filter();pinnedList.scrollIntoView({block:'nearest',behavior:'smooth'});};



 inventoryOutsideTap=e=>{if(screen!=='inventory'||e.target.closest('button,input,a,select,textarea,dialog'))return;pinsOnly=true;condition='';search.value='';document.querySelectorAll('[data-inventory-filter]').forEach(b=>{b.classList.remove('selected');b.setAttribute('aria-pressed','false');});filter();};document.addEventListener('click',inventoryOutsideTap);document.querySelectorAll('[data-inventory-filter]').forEach(b=>b.onclick=()=>{pinsOnly=false;condition=b.dataset.inventoryFilter;document.querySelectorAll('[data-inventory-filter]').forEach(x=>{x.classList.toggle('selected',x.dataset.inventoryFilter===condition);x.setAttribute('aria-pressed',String(x.dataset.inventoryFilter===condition));});filter();});



 const returning=inventoryQuoteReturn;if(returning&&returning.owner===effectiveOwner()&&returning.store===inventoryScope()){inventoryQuoteReturn=null;search.value=returning.search;condition=returning.condition;pinsOnly=returning.pinsOnly;sortBy=returning.sortBy;arrivalVins=returning.arrivals?new Set(returning.arrivals):null;document.querySelectorAll('[data-inventory-filter]').forEach(x=>{x.classList.toggle('selected',x.dataset.inventoryFilter===condition);x.setAttribute('aria-pressed',String(x.dataset.inventoryFilter===condition));});document.querySelector('#inventory-sort').classList.toggle('selected',!!sortBy||!!arrivalVins);orderPins();filter();list.scrollTop=returning.scrollTop;pinnedList.scrollTop=returning.pinnedScrollTop;}else if(returning)inventoryQuoteReturn=null;
 root.querySelectorAll('[data-browse-vehicle]').forEach(b=>b.onclick=()=>{const v=data.vehicles[Number(b.dataset.browseVehicle)];const dialog=document.createElement('dialog');dialog.className='payoff-reminder vehicle-actions';dialog.setAttribute('aria-label','Vehicle actions');dialog.innerHTML=`${budgetAccount&&budgetVehicle(v)?confettiMarkup():''}${v.condition==='used'&&v.certified===true?`<span class="vehicle-cpo-stamp${v.storeLabel==='AutoNation USA Jax'?' vehicle-certified-stamp':''}" aria-label="${v.storeLabel==='AutoNation USA Jax'?'AutoNation Certified':'Certified pre-owned'}">${v.storeLabel==='AutoNation USA Jax'?'Certified':'CPO'}</span>`:''}<p><span class="vehicle-stock-line">Stock # ${esc(v.stockNumber)}</span><span class="vehicle-action-details${v.trim?' has-trim':''}"><span class="vehicle-action-name">${esc([v.year,v.make].filter(Boolean).join(' '))} ${inventoryModelLabel(v.model,true)}</span><span class="vehicle-action-trim">Trim: ${esc(v.trim||'N/A')}</span><span class="vehicle-action-vin">VIN: ${esc(v.vin||'Unavailable')}</span><span class="vehicle-action-color">Exterior: ${esc(inventoryColorLabel(v.exteriorColor||v.color,v.make))}</span><span class="vehicle-action-interior">Interior: ${esc(v.interiorColor||v.interior?inventoryColorLabel(v.interiorColor||v.interior):'Unavailable')}</span><span class="vehicle-action-bottom"><span>${v.mileage!==null&&v.mileage!==undefined&&Number.isFinite(Number(v.mileage))?Number(v.mileage).toLocaleString('en-US')+' miles':'Mileage unavailable'}</span><span class="vehicle-msrp"><small><span>${'<span class="msrp-wave" aria-label="'+(v.condition==='new'?'MSRP':'Sales price')+'">'+[...(v.condition==='new'?'MSRP':'Sales price')].map((letter,i)=>`<span aria-hidden="true" style="--letter:${i}">${letter===' '?'&nbsp;':letter}</span>`).join('')+'</span>'}</span></small><strong>${typeof (inventoryDisplayPrice(v))==='number'&&Number.isFinite(inventoryDisplayPrice(v))&&(inventoryDisplayPrice(v))>0?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0,minimumFractionDigits:0}).format(inventoryDisplayPrice(v)):'Unavailable'}</strong></span></span></span></p><button type="button" class="primary" data-view-listing>View vehicle listing</button>${v.condition==='used'?`<button type="button" class="quiet full vehicle-carfax" data-view-carfax><span class="vehicle-carfax-content"><img src="/carfax-fox.svg" alt="" aria-hidden="true"><span>Carfax</span></span></button>`:''}<button type="button" class="quiet full" data-start-quote>Quick quote</button><button type="button" class="quiet full" data-cancel>Cancel</button>`;document.body.append(dialog);const savedScrollY=window.scrollY,savedBodyStyle=document.body.getAttribute('style');Object.assign(document.body.style,{position:'fixed',top:-savedScrollY+'px',left:'0',right:'0',width:'100%',overflow:'hidden'});dialog.showModal();let unlocked=false;const unlock=()=>{if(unlocked)return;unlocked=true;if(savedBodyStyle===null)document.body.removeAttribute('style');else document.body.setAttribute('style',savedBodyStyle);window.scrollTo(0,savedScrollY);};dialog.addEventListener('close',()=>{unlock();dialog.remove();},{once:true});const close=()=>{dialog.close();unlock();dialog.remove();};dialog.querySelector('[data-cancel]').onclick=close;let listingUrl;try{const url=new URL(v.dealerListingUrl||v.sourceUrl);if(url.protocol==='https:')listingUrl=url.href;}catch{}const listingButton=dialog.querySelector('[data-view-listing]');listingButton.textContent=v.dealerSearch?'Find on dealer website':v.dealerListingUrl?'View vehicle listing':'View source listing';listingButton.disabled=!listingUrl;listingButton.onclick=()=>{window.open(listingUrl,'_blank','noopener,noreferrer');};const carfaxButton=dialog.querySelector('[data-view-carfax]');if(carfaxButton){const report=verifiedCarfaxUrl(v.carfaxUrl);carfaxButton.disabled=!report;if(!report){carfaxButton.title='Carfax report not provided by dealer';carfaxButton.setAttribute('aria-label','Carfax unavailable');}carfaxButton.onclick=()=>{if(report){const reportTop=new URL(report);reportTop.hash='top';window.open(reportTop.href,'_blank','noopener,noreferrer');}};}dialog.querySelector('[data-start-quote]').onclick=()=>{inventoryQuoteReturn={vin:v.vin,owner:effectiveOwner(),store:inventoryScope(),search:search.value,condition,pinsOnly,sortBy,arrivals:arrivalVins?[...arrivalVins]:null,scrollTop:list.scrollTop,pinnedScrollTop:pinnedList.scrollTop};close();deal=inventoryDeal(v,{mode:'cash',price:'',discount:'',rebate:'',trade:'',payoff:'',zip:'',apr:'6.9',term:'60',downs:['0','1000','2000']});deal.makeId=String(makes.find(m=>m.name.toUpperCase()===String(v.make).toUpperCase())?.id||'');cost='';recon='';quote=null;quoteRecord=null;flow={step:3,models:deal.model?[deal.model]:[],conditionAnswered:true,inventoryQuery:v.stockNumber,loading:false,fromInventory:true};error='';notice='';screen='deal';render();window.scrollTo(0,0);};});
 if(returning&&returning.owner===effectiveOwner()&&returning.store===inventoryScope()){const index=data.vehicles.findIndex(v=>v.vin===returning.vin);if(index>=0)root.querySelector('[data-browse-vehicle="'+index+'"]')?.click();}




 }catch(e){if(list.isConnected)list.textContent=e.message;}



}







function defaultsView(){return `${header('Settings','')}<div id="message"></div><div class="settings-workspace"><form id="defaults-form" class="settings-form" novalidate><section class="settings-card dealer-profile-card"><h2>Dealer profile</h2>${(authState.user?input('settings-name','Your name',draft.displayName||'','','text'):'')+input('default-zip','Dealer ZIP',draft.zip,'Used when customer ZIP is blank','text')}</section><section class="settings-card"><h2>Quote fees</h2>${draft.feesByCondition?`<label>Vehicle fees<select id="settings-fee-condition"><option value="new" ${(draft.feeCondition||deal.condition)==='new'?'selected':''}>New</option><option value="used" ${(draft.feeCondition||deal.condition)!=='new'?'selected':''}>Pre-Owned</option></select></label>`:''}${draft.fees.map((f,i)=>`<div class="fee">${input('fee-name-'+i,'Fee name',f.name,'','text')}${input('fee-amount-'+i,'Amount',f.amount)}${i>0?`<button type="button" class="quiet" data-remove-fee="${i}">Remove fee</button>`:''}</div>`).join('')}<button type="button" class="quiet teal" id="add-fee">+ Add fee</button>${draft.tagFees?`<div class="settings-tags">${input('settings-new-tag','New tag estimate',draft.tagFees.new)+input('settings-transfer-tag','Transfer tag estimate',draft.tagFees.transfer)}</div>`:''}</section>







<details class="settings-card"><summary>Tax rules</summary><p class="muted">Select a researched state estimate or a custom verified rule. Confirm the registration jurisdiction and taxable fees for each ZIP. Only ordinary dealer passenger-vehicle purchases are supported; leases, exemptions, private sales and cross-state tax credits need separate review.</p>${draft.rules.map((r,i)=>`<fieldset><legend>ZIP rule ${i+1}</legend>${input('rule-zip-'+i,'ZIP',r.zip,'','text')}${presetControls(r,i)}${input('rule-rate-'+i,'Estimated tax rate (%)',r.rate)}<label class="check"><input type="checkbox" id="rule-trade-${i}" ${r.tradeCredit?'checked':''}> Deduct trade allowance from taxable amount</label><label class="check"><input type="checkbox" id="rule-rebate-${i}" ${r.rebateDeduct?'checked':''}> Deduct manufacturer rebate from taxable amount</label><p>Taxable fees</p><small>The first fee is dealer/doc. Review tax treatment for any additional fees. Review additional fees individually; warranty/service products with separate tax rates are outside this estimate.</small>${draft.fees.map((f,j)=>`<label class="check"><input type="checkbox" id="rule-fee-${i}-${j}" ${r.taxableFees?.includes(j)?'checked':''}>${esc(f.name||'Unnamed fee')}</label>`).join('')}<button type="button" class="quiet" data-remove-rule="${i}">Remove ZIP rule</button></fieldset>`).join('')}<button type="button" class="quiet teal" id="add-rule">+ Add ZIP rule</button><small>Verify local vehicle tax rules, rebate treatment and fee taxation before use. Custom rules have no default rate.</small>${coverage()}</details><button class="primary">Save settings</button></form></div><details class="settings-card settings-reset"><summary>Reset app</summary><p>Erase your deal, this device’s quote history, and your dealer setup.</p><button type="button" class="quiet full" id="full-app-reset">Full app reset</button></details>`}







function costView(){let value=null;try{value=gross(deal,cost,recon)}catch{}return `${header('Cost & profit','Internal only')}<div id="message"></div><form id="cost-form" novalidate>${input('cost','Vehicle cost',cost,'Blank means unknown')}${input('recon','Recon / other costs',recon,'Enter 0 if there are no additional costs')}<section>${row('Estimated vehicle gross',value)}<small>${value===null?'Unavailable until selling price, vehicle cost and recon / other costs are known.':'Selling price minus dealer discount, vehicle cost and recon / other costs. Manufacturer rebates do not reduce vehicle gross. Fees, finance income, trade valuation and manufacturer settlement adjustments are excluded.'}</small></section><p class="muted">Costs stay in this session and never appear in customer review or PDF. This screen is private; return to the deal before handing over the device.</p><button class="primary">Update internal estimate</button></form>`}







function reviewView(){return `${header('Quote review','Pencil preview')}<div id="message"></div>${quote.condition==='new'?`<button type="button" class="quiet full" id="toggle-government-fees" aria-expanded="${!quote.governmentFeesCollapsed}">${quote.governmentFeesCollapsed?'Expand':'Collapse'} government fees</button>`:''}<div class="worksheet-scroll"><article class="paper worksheet-preview" aria-label="Pencil worksheet preview"><p role="status">Preparing worksheet…</p></article></div><button class="primary" id="save-pdf">View PDF</button><button class="quiet full" data-go="deal">Edit deal</button>`}







function adminView(){return `<header><h1>Admin settings</h1><button class="icon" data-go="menu" aria-label="Menu">&#8943;</button></header><div id="message"></div>${adminState.allowed?`<section class="admin-intro"><span class="admin-kicker">WORKSPACE CONTROL</span><h2>People & stores</h2><p>Find a teammate, manage their access, or open their workspace.</p></section><form id="admin-search-form" class="admin-search-card"><label for="admin-search">Find user</label><div class="admin-search-row"><input id="admin-search" type="search" placeholder="Name" maxlength="200"><button type="submit" class="icon" aria-label="Search users">${uiIcon("search",22)}</button></div></form><div id="admin-results" aria-live="polite"></div>`:'<p>Administrator access required.</p>'}`}

async function leaveAdmin(){adminState.target=null;sessionStorage.removeItem('pd-refresh-page');setHistoryOwner(authState.user?.id);history=readHistory();await refreshDealer(authState.user.id);screen='admin';render();}

function bindAdmin(){

 document.querySelector('#return-admin')?.addEventListener('click',()=>leaveAdmin().catch(fail));

 const form=document.querySelector('#admin-search-form');if(!form||!adminState.allowed)return;form.querySelector('input').value=adminSearchDraft;

 form.onsubmit=async e=>{

  e.preventDefault();const results=document.querySelector('#admin-results'),button=form.querySelector('button');button.disabled=true;results.textContent='Loading users…';

  try{

   const users=await searchAdminUsers(form.querySelector('input').value.trim());if(!results.isConnected)return;rememberAdminStores(users);

   results.innerHTML=users.length?`<p class="admin-result-count">${users.length} ${users.length===1?'user':'users'}</p>`+users.map((u,i)=>`<section class="admin-user-card" data-admin-user="${i}" tabindex="0" role="link" aria-label="Open workspace for ${esc(u.display_name||'Unnamed user')}"><div class="admin-user-heading"><span class="admin-avatar" aria-hidden="true">${esc((u.display_name||'?').slice(0,1).toUpperCase())}</span><div><strong>${esc(u.display_name||'Unnamed user')}</strong></div><button type="button" class="icon admin-user-gear" data-user-settings="${i}" aria-label="Settings for ${esc(u.display_name||'Unnamed user')}" title="User settings">${uiIcon('settings',20)}</button></div></section>`).join(''):'<section class="admin-empty"><h2>No users found</h2><p>Try another name, or show all users.</p></section>';

   results.querySelectorAll('[data-user-settings]').forEach(b=>b.onclick=()=>openUserSettings(users[Number(b.dataset.userSettings)],()=>form.requestSubmit()));
   results.querySelectorAll('[data-admin-user]').forEach(b=>{b.onkeydown=e=>{if(e.target===b&&(e.key==='Enter'||e.key===' ')){e.preventDefault();b.click();}};b.onclick=async e=>{if(e.target.closest('button,input,select,label,a'))return;if(b.dataset.busy)return;b.dataset.busy='true';try{await openAdminUser(users[Number(b.dataset.adminUser)]);sessionStorage.removeItem('pd-refresh-page');setHistoryOwner(effectiveOwner());history=readHistory();quote=null;quoteRecord=null;deal={mode:'cash',price:'',trade:'',payoff:'',zip:''};await refreshDealer(effectiveOwner());}catch(e){fail(e);}finally{delete b.dataset.busy;}};});

  }catch(e){results.textContent=e.message;}finally{button.disabled=false;}

 };

 adminSearchDraft='';form.requestSubmit();

}

function historyView(){return `${header('Quote history','')}<div id="message">${historyWarning?`<p class="error">${esc(historyWarning)}</p>`:''}</div>${history.length?history.map(r=>`<section><h2>${esc(r.quote.vehicle)}</h2><p>${r.quote.condition==='new'?'New':'Pre-owned'} · ${r.quote.mode==='cash'?'Cash':'Finance'} · ${r.quote.balance===null?'Incomplete':money(r.quote.balance)}</p><button data-history-open="${r.id}">Open estimate</button><button class="quiet full delete-quote" data-history-delete="${r.id}">Delete quote</button></section>`).join(''):'<p class="history-empty"><strong>No quotes yet, get to selling</strong></p>'}<button class="primary" data-go="home">Home</button>`}



function readGuide(){const form=document.querySelector('#guide-form');if(!form)return;for(const el of form.elements){if(!el.id.startsWith('g-'))continue;const key=el.id.slice(2);if(['stockNumber','vin','tradeVin'].includes(key))el.value=el.value.toUpperCase();if(key==='make-search'){flow.search=el.value;continue}if(key==='hasLien'){deal.hasLien=el.value==='yes';continue}deal[key]=el.type==='checkbox'?el.checked:rawValue(el)}if(deal.year&&deal.makeId&&deal.model&&(!deal.vehicle||deal.vehicleAuto)){deal.vehicle=[deal.year,makes.find(m=>String(m.id)===String(deal.makeId))?.name,deal.model,deal.stockNumber?'Stock '+deal.stockNumber:''].filter(Boolean).join(' ');deal.vehicleAuto=true}else if(!deal.vehicle||deal.vehicleAuto){deal.vehicle=deal.stockNumber||'';deal.vehicleAuto=true} }



function readDeal(){const form=document.querySelector('#deal-form');if(!form)return;for(const key of ['vehicle','price','discount','rebate','trade','payoff','zip','apr','term','tagType','creditTier']){const el=form.elements[key];if(el)deal[key]=key==='creditTier'?el.value:rawValue(el)}deal.downs=deal.downs.map((v,i)=>rawValue(form.elements['down'+i])??v);if(Array.isArray(deal.terms))deal.terms=deal.terms.map((v,i)=>rawValue(form.elements['payment-term'+i])??v)}







function readDraft(){if(draft.tagFees)for(const key of ['new','transfer']){const el=document.querySelector('#settings-'+key+'-tag');if(el)draft.tagFees[key]=rawValue(el);}if(document.querySelector('#settings-name'))draft.displayName=document.querySelector('#settings-name').value.trim();draft.zip=document.querySelector('#default-zip').value.trim();draft.fees=draft.fees.map((f,i)=>({...f,name:document.querySelector('#fee-name-'+i).value.trim(),amount:rawValue(document.querySelector('#fee-amount-'+i))}));draft.rules=draft.rules.map((r,i)=>({...r,zip:document.querySelector('#rule-zip-'+i).value.trim(),rate:document.querySelector('#rule-rate-'+i).value,tradeCredit:document.querySelector('#rule-trade-'+i).checked,rebateDeduct:document.querySelector('#rule-rebate-'+i).checked,taxableFees:draft.fees.flatMap((f,j)=>document.querySelector(`#rule-fee-${i}-${j}`).checked?[j]:[])}))}







let accountRefreshPromise=null;
function refreshAccountInBackground(){
 if(accountRefreshPromise)return accountRefreshPromise;
 if(!authState.user||!dealerReady)return Promise.resolve();
 const owner=effectiveOwner();
 accountRefreshPromise=(async()=>{
  try{const saved=await loadDealerSettings(owner);if(!saved||owner!==effectiveOwner())return;
   if(JSON.stringify(saved)!==JSON.stringify(defaults)){
    defaults=saved;localStorage.setItem(defaultsStorageKey(),JSON.stringify(saved));setInventoryAccess(owner,inventoryScope(),inventoryGrants());
    if(screen==='home'){
     const greeting=document.querySelector('.home-greeting');
     const name=String(defaults.displayName||'').trim().split(/\s+/)[0];
     if(greeting)greeting.textContent='Hello'+(name?' '+name:'');
     configureBudgetAlerts();
    }
   }
   if(screen==='inventory'&&!document.querySelector('dialog[open]'))render();
  }catch{}finally{accountRefreshPromise=null;}
 })();
 return accountRefreshPromise;
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refreshAccountInBackground();});
window.addEventListener('focus',refreshAccountInBackground);
setInterval(()=>{if(document.visibilityState==='visible')refreshAccountInBackground();},60*60*1000);
async function checkHomeUpdate(owner){
 try{
  const response=await fetch('/',{cache:'no-store',signal:AbortSignal.timeout(8000)});if(!response.ok)return;
  const latest=new DOMParser().parseFromString(await response.text(),'text/html').querySelector('script[type="module"][src]')?.getAttribute('src');
  const current=document.querySelector('script[type="module"][src]')?.getAttribute('src');
  if(latest&&current&&latest!==current&&screen==='home'&&owner===effectiveOwner()){
   saveCurrentPage();
   if(adminState.target)sessionStorage.setItem('pd-home-view-as',JSON.stringify({owner:authState.user.id,target:adminState.target}));
   location.reload();
  }
 }catch{}
}
async function refreshHome(){
 if(refreshing)return;
 const alreadyHome=screen==='home'&&!!document.querySelector('.home-hero');
 readGuide();readDeal();screen='home';error='';notice='';saveCurrentPage();
 if(!alreadyHome){render();window.scrollTo(0,0);}else document.querySelector('#message')?.replaceChildren();
 refreshing=true;const owner=effectiveOwner();
 try{await Promise.all([
  checkHomeUpdate(owner),
  refreshAccountInBackground().then(()=>{if(alreadyHome&&screen==='home'&&owner===effectiveOwner())return bindHomeRecap(owner,navigate);})
 ]);}finally{refreshing=false;}
}

function navigate(to){if(to==='home'){refreshHome();return;}if(to==='admin'&&adminState.target){leaveAdmin().catch(fail);return;}if(to==='defaults')settingsReturn=screen==='home'?'home':'deal';if(to==='menu'&&screen!=='sales')menuReturn=screen;readGuide();readDeal();if(screen==='cost'){cost=rawValue(document.querySelector('#cost'));recon=rawValue(document.querySelector('#recon'))}error='';notice='';screen=to;if(to==='defaults'){draft=structuredClone(defaults);if(draft.feesByCondition){draft.feeCondition=deal.condition||'used';draft.fees=structuredClone(draft.feesByCondition[draft.feeCondition]);}}render();window.scrollTo(0,0)}







function showAppReset(){if(adminState.target){fail(Error("Return to admin before resetting the app."));return;}



 const dialog=document.createElement('dialog');dialog.className='payoff-reminder';dialog.innerHTML='<h2>Reset Pocket Desking?</h2><p>This erases your current deal, saved quotes and sales records on this device, commission files, and your account’s dealer name, ZIP, fees and tax settings. You will start setup again.</p><p>Your sign-in account stays. Downloaded PDFs and quotes stored on other devices cannot be erased here.</p><p class="error" role="alert" hidden></p><button type="button" class="quiet full" id="cancel-app-reset">Cancel</button><button type="button" class="primary" id="confirm-app-reset">Reset everything</button>';document.body.append(dialog);dialog.showModal();



 const close=()=>{dialog.close();dialog.remove();};dialog.querySelector('#cancel-app-reset').onclick=close;dialog.addEventListener('cancel',e=>{if(dialog.dataset.busy)e.preventDefault();else dialog.remove();});



 dialog.querySelector('#confirm-app-reset').onclick=async()=>{if(dialog.dataset.busy)return;dialog.dataset.busy='yes';for(const b of dialog.querySelectorAll('button'))b.disabled=true;try{if(authState.user)await resetDealerSettings(authState.user.id);await resetSales(authState.user?.id||'local');localStorage.removeItem(defaultsStorageKey());localStorage.removeItem(historyStorageKey());localStorage.removeItem(inventoryPinsKey());defaults=emptyDefaults();history=[];historyWarning='';storageWarning='';cost='';recon='';quote=null;quoteRecord=null;deal={mode:'cash',vehicle:'',price:'',discount:'',rebate:'',trade:'',payoff:'',zip:'',apr:'6.9',term:'60',downs:['0','1000','2000']};flow={step:0,models:[],search:'',loading:false,conditionAnswered:false};setup.values={...emptyDefaults(),displayName:''};setup.step=0;setup.returnTo='home';dealerReady=!authConfigured;dealerLoading=false;error='';notice='';screen=authState.user?'setup':'guide';close();render();window.scrollTo(0,0);}catch(e){const alert=dialog.querySelector('[role="alert"]');alert.textContent=e.message;alert.hidden=false;delete dialog.dataset.busy;for(const b of dialog.querySelectorAll('button'))b.disabled=false;}};



}



function showPayoffReminder(){



 const dialog=document.createElement('dialog');dialog.className='payoff-reminder';dialog.innerHTML='<h2>Payoff not entered</h2><p>This quote does not include a trade payoff. Add it before the final quote, or continue with this estimate.</p><button class="primary" id="add-payoff-now">Add payoff now</button><button class="quiet full" id="continue-without-payoff">Continue without payoff</button><button class="quiet full" id="cancel-payoff">Back</button>';document.body.append(dialog);dialog.showModal();



 const close=()=>{dialog.close();dialog.remove()};dialog.querySelector('#add-payoff-now').onclick=()=>{close();screen='guide';flow.step=3;deal.hasTrade=true;deal.hasLien=true;render();document.querySelector('#g-payoff')?.focus()};dialog.querySelector('#continue-without-payoff').onclick=()=>{close();const event=new Event('submit',{bubbles:true,cancelable:true});event.payoffConfirmed=true;document.querySelector('#deal-form').dispatchEvent(event)};dialog.querySelector('#cancel-payoff').onclick=close;dialog.addEventListener('cancel',()=>dialog.remove());



}



function fail(e){error=e.message;render();document.querySelector('#message').scrollIntoView({block:'center'})}



function bindGuide(){



 const readyButton=document.querySelector('#guide-form > .primary');



 const updateReady=()=>{if(!readyButton||flow.step!==0)return;const payoffInput=document.querySelector('#g-payoff'),payoff=payoffInput?rawValue(payoffInput):deal.payoff;const payoffReady=deal.hasLien===false||(deal.hasLien===true&&String(payoff??'').trim()!==''&&Number.isFinite(Number(payoff))&&Number(payoff)>0);const ready=!!flow.conditionAnswered&&(deal.hasTrade===false||(deal.hasTrade===true&&payoffReady));readyButton.hidden=!ready;readyButton.classList.toggle('ready-next',ready);};



 updateReady();document.querySelector('#guide-form')?.addEventListener('input',updateReady);



 document.querySelector('#find-inventory')?.addEventListener('click',async()=>{



  readGuide();const query=document.querySelector('#inventory-query').value.trim().toUpperCase();flow.inventoryQuery=query;



  const result=document.querySelector('#inventory-results'),button=document.querySelector('#find-inventory'),activeDeal=deal;



  button.disabled=true;result.textContent='Finding vehicle…';



  try{



   if(!query)throw Error('Enter a stock number.');



   const data=await loadInventory();if(screen!=='guide'||deal!==activeDeal||!result.isConnected)return;



   const matches=stockMatches(data.vehicles,query),fresh=inventoryFresh(data);



   if(!matches.length)throw Error('No matching stock number or VIN in inventory. Enter vehicle details manually.');



   result.innerHTML='<p>'+esc(fresh?'Choose your vehicle.':'Using the last verified prices. Choose your vehicle.')+'</p>'+matches.map((row,i)=>'<button type="button" class="quiet full" data-inventory-choice="'+i+'">'+esc([row.year,row.make,row.model,'Stock '+row.stockNumber].filter(Boolean).join(' · '))+'</button>').join('');



   result.querySelectorAll('[data-inventory-choice]').forEach(b=>b.onclick=()=>{



    if(deal!==activeDeal)return;



    const row=matches[Number(b.dataset.inventoryChoice)];deal=inventoryDeal(row,deal);



    deal.makeId=String(makes.find(m=>m.name.toUpperCase()===String(row.make).toUpperCase())?.id||'');



    



    flow.models=deal.model?[deal.model]:[];flow.conditionAnswered=true;



    flow.scanStatus=fresh?(deal.price?'Inventory details and pricing filled. Review before quoting.':'Vehicle details filled. MSRP was not listed; enter pricing in the pencil.'):'Vehicle details filled. Confirm current pricing in the pencil.';



    if(fresh&&row.sourceName==='DealerRater')flow.scanStatus=deal.condition==='new'?'Confirm dealer discount in the pencil.':'';



    error='';render();



   });



  }catch(e){if(result.isConnected)result.textContent=e.message;}finally{if(button.isConnected)button.disabled=false;}



 });



 document.querySelector('#inventory-query')?.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();document.querySelector('#find-inventory')?.click();}});



 const fillScannedVin=async(key,vin)=>{



  deal[key]=vin;flow.scanStatus='Looking up vehicle details…';render();



  try{const info=await decodeVin(vin);if(deal[key]!==vin)return;



   if(key==='vin'){deal.year=String(info.year);deal.makeId=String(makes.find(m=>m.name.toUpperCase()===info.make.toUpperCase())?.id||'');deal.model=info.model;flow.models=[info.model];deal.vehicle=[info.year,info.make,info.model].join(' ');deal.vehicleAuto=true;}



   else deal.tradeVehicle=[info.year,info.make,info.model].join(' ');



   flow.scanStatus='Vehicle details filled. Review them before continuing.';



  }catch(e){flow.scanStatus=e.message;}



  if(screen==='guide')render();



 };



 document.querySelectorAll('[data-camera]').forEach(b=>b.onclick=async()=>{readGuide();const key=b.dataset.camera;const vin=await openVinScanner();if(vin&&screen==='guide')await fillScannedVin(key,vin);});



 document.querySelectorAll('[id^="photo-"]').forEach(input=>input.onchange=async()=>{const file=input.files?.[0];if(!file)return;readGuide();const key=input.id.slice(6);flow.scanStatus='Reading VIN photo…';render();try{deal[key]=await scanVin(file);flow.scanStatus='VIN read. Review it before looking up vehicle details.'}catch(e){flow.scanStatus=e.message}if(screen==='guide')render()});



 document.querySelectorAll('[data-decode]').forEach(b=>b.onclick=async()=>{readGuide();const key=b.dataset.decode,vin=deal[key];flow.scanStatus='Looking up vehicle details…';render();try{const info=await decodeVin(vin);if(deal[key]!==vin)return;if(key==='vin'){deal.year=String(info.year);deal.makeId=String(makes.find(m=>m.name.toUpperCase()===info.make.toUpperCase())?.id||'');deal.model=info.model;flow.models=[info.model];deal.vehicle=[info.year,info.make,info.model].join(' ');deal.vehicleAuto=true}else{deal.tradeVehicle=[info.year,info.make,info.model].join(' ')}flow.scanStatus='Vehicle details filled. Review them before continuing.'}catch(e){flow.scanStatus=e.message}if(screen==='guide')render()});



 document.querySelectorAll('[data-keyboard]').forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();const d=b.closest('.dropdown-control').querySelector('details'),input=d.querySelector('.dropdown-search');d.open=true;input.hidden=false;input.focus()});



 document.querySelectorAll('.dropdown-search').forEach(input=>input.addEventListener('input',()=>{const d=input.closest('details'),query=input.value.trim().toLowerCase();let count=0;d.querySelectorAll('[data-pick]').forEach(b=>{b.hidden=!!query&&!b.textContent.trim().toLowerCase().startsWith(query);if(!b.hidden&&b.dataset.value)count++});d.querySelector('.no-matches').hidden=count>0}));



 document.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{const select=document.getElementById(b.dataset.pick);select.value=b.dataset.value;b.closest('details').open=false;readGuide();select.dispatchEvent(new Event('change',{bubbles:true}));if(!flow.loading)render()});



 document.querySelectorAll('.down-select').forEach(d=>d.addEventListener('toggle',()=>{if(d.open)document.querySelectorAll('.down-select').forEach(other=>{if(other!==d)other.open=false})}));



 document.querySelectorAll('.down-select').forEach(d=>{let prefix='',lastKey=0;d.addEventListener('keydown',e=>{



 if(e.target.matches('input')){if(e.key==='Escape'){d.open=false;d.querySelector('summary').focus()}return}



 const buttons=[...d.querySelectorAll('[data-pick]')].filter(b=>b.dataset.value);const active=buttons.indexOf(document.activeElement);



 const focus=b=>{if(b){d.open=true;b.focus({preventScroll:true});b.scrollIntoView({block:'nearest'})}};



 if(e.key==='Escape'){e.preventDefault();d.open=false;d.querySelector('summary').focus();return}



 if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();const index=e.key==='Home'?0:e.key==='End'?buttons.length-1:e.key==='ArrowDown'?Math.min(active+1,buttons.length-1):Math.max(active-1,0);focus(buttons[index]);return}



 if(e.key.length===1&&/[a-z0-9]/i.test(e.key)&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();const now=Date.now(),letter=e.key.toLowerCase();prefix=now-lastKey>900?'':prefix;const cycle=prefix===letter;prefix=cycle?letter:prefix+letter;lastKey=now;let matches=buttons.filter(b=>b.textContent.trim().toLowerCase().startsWith(prefix));if(!matches.length){prefix=letter;matches=buttons.filter(b=>b.textContent.trim().toLowerCase().startsWith(prefix))}focus(cycle?(matches.find(b=>buttons.indexOf(b)>active)||matches[0]):matches[0])}



 })});



 document.querySelectorAll('#g-stockNumber,#g-vin,#g-tradeVin').forEach(el=>el.addEventListener('input',e=>{const start=e.target.selectionStart,end=e.target.selectionEnd;e.target.value=e.target.value.toUpperCase();e.target.setSelectionRange(start,end);deal[e.target.id.slice(2)]=e.target.value}));



 document.querySelectorAll('[data-guide-payoff]').forEach(b=>b.onclick=()=>{readGuide();error='';deal.payoffSkipped=b.dataset.guidePayoff==='skip';deal.hasLien=b.dataset.guidePayoff==='no'?false:true;if(deal.payoffSkipped)deal.payoff='';render()});



 const advance=step=>{readGuide();error='';flow.step=step;render();window.scrollTo(0,0)};



 document.querySelectorAll('[data-guide-condition]').forEach(b=>b.onclick=()=>{readGuide();deal.condition=b.dataset.guideCondition;flow.conditionAnswered=true;error='';render()});



 document.querySelectorAll('[data-guide-trade]').forEach(b=>b.onclick=()=>{deal.hasTrade=b.dataset.guideTrade==='yes'?true:b.dataset.guideTrade==='no'?false:undefined;deal.trade='';deal.payoff='';deal.perDiem='';deal.payoffDays='';deal.hasLien=undefined;flow.tradeAnswered=true;error='';readGuide();render()});



 document.querySelector('#guide-back')?.addEventListener('click',()=>{if(flow.fromInventory&&flow.step===3){readGuide();error='';screen='inventory';render();return;}advance(flow.step===2?3:0);});



 document.querySelector('#skip-vehicle')?.addEventListener('click',()=>{readGuide();deal.vehicle='';deal.stockNumber='';deal.year='';deal.makeId='';deal.model='';deal.vehicleAuto=false;error='';flow.skipVehicle=true;flow.step=2;render();window.scrollTo(0,0)});



 document.querySelector('#g-make-search')?.addEventListener('input',e=>{flow.search=e.target.value;const select=document.querySelector('#g-makeId');select.innerHTML='<option value="">Choose</option>'+makes.filter(m=>m.name.toLowerCase().includes(flow.search.toLowerCase())).map(m=>`<option value="${m.id}" ${String(deal.makeId)===String(m.id)?'selected':''}>${esc(m.name)}</option>`).join('')});



 const refreshModels=async()=>{readGuide();deal.model='';const id=deal.makeId,year=deal.year;if(!id||!year)return;flow.loading=true;flow.catalogNote='';flow.models=[];render();try{const rows=await models(id,year);if(deal.makeId===id&&deal.year===year){flow.models=rows;flow.catalogNote=rows.length?'Select a model or skip.':'No models returned for this year/make. Enter a description or skip.'}}catch(e){flow.catalogNote=e.message}finally{flow.loading=false;if(screen==='guide'&&flow.step===3)render()}};



 document.querySelector('#g-year')?.addEventListener('change',refreshModels);document.querySelector('#g-makeId')?.addEventListener('change',refreshModels);



 document.querySelector('#g-hasLien')?.addEventListener('change',()=>{readGuide();render()});



 document.querySelector('#g-lenderId')?.addEventListener('change',()=>{readGuide();const l=lenders.find(l=>l.id===deal.lenderId);deal.lenderName=l?.name||'';deal.lenderAddress=l?.address||'';deal.lenderSource=l?.source||'';deal.addressConfirmed=false;render()});



 document.querySelector('#guide-form')?.addEventListener('submit',e=>{e.preventDefault();readGuide();error='';try{if(flow.step===0&&!flow.conditionAnswered)throw Error('Choose New or Pre-Owned.');if(flow.step===0&&typeof deal.hasTrade!=='boolean')throw Error('Choose a trade option.');if(flow.step===0&&deal.hasTrade===true&&deal.hasLien===undefined)throw Error('Choose whether you have a payoff.');if([2,3].includes(flow.step)&&!/^\d{5}$/.test(deal.zip||defaults.zip))throw Error('Enter a five-digit registration ZIP or save your dealer ZIP in Settings.');if([2,3].includes(flow.step)){navigate('deal')}else advance(flow.step===0?3:2)}catch(e){fail(e)}});



}







function bind(){

 document.querySelector('#zip-tax-info')?.addEventListener('click',openZipTaxDetails);
 document.querySelectorAll('[data-rebate-info]').forEach(b=>b.onclick=()=>rebateInformation(Number(b.dataset.rebateInfo)));
 document.querySelector('#add-quote-rebate')?.addEventListener('click',()=>{readDeal();const d=document.createElement('dialog');d.className='payoff-reminder';d.setAttribute('aria-label','Add rebate');d.innerHTML='<h2>Add rebate</h2><form><label>Name<input name="name" maxlength="80" placeholder="Custom rebate"></label><label>Amount<input name="amount" type="number" min="0.01" step="0.01" required inputmode="decimal"></label><small>For this quote only. Replaces the selected rebate amount.</small><button class="primary">Add rebate</button></form><button type="button" class="quiet full">Cancel</button>';document.body.append(d);d.showModal();d.addEventListener('close',()=>d.remove(),{once:true});d.querySelector('form').onsubmit=e=>{e.preventDefault();const v=Number(d.querySelector('[name=amount]').value);if(!Number.isFinite(v)||v<=0)return;deal.rebate=String(v);deal.customRebateName=d.querySelector('[name=name]').value.trim()||'Custom rebate';deal.appliedRebateOffer='custom';d.close();render();};d.querySelector('button[type=button]').onclick=()=>d.close();});
 document.querySelector('#remove-custom-rebate')?.addEventListener('click',()=>{readDeal();deal.rebate='';deal.appliedRebateOffer='';deal.customRebateName='';render();});
 document.querySelectorAll('[data-use-cash]').forEach(b=>b.onclick=()=>confirmCustomerCash(Number(b.dataset.useCash)));

 bindAdmin();
 bindAdminBannerActivity();



 bindInventory();

 bindSales(effectiveOwner(),target=>{screen=target;if(target==='defaults')draft=structuredClone(defaults);render();});

 bindAdminHomeRecap();
 bindHomeRecap(effectiveOwner(),target=>{screen=target;if(target==='defaults')draft=structuredClone(defaults);render();});





 bindSetup({rawValue,render,fail,clearError:()=>{error='';},complete:async values=>{await saveDealerSettings(effectiveOwner(),values);defaults=values;localStorage.setItem(defaultsStorageKey(),JSON.stringify(values));dealerReady=true;dealerLoading=false;error='';screen=setup.returnTo;if(screen==='defaults'){draft=structuredClone(defaults);if(draft.feesByCondition){draft.feeCondition=deal.condition||'used';draft.fees=structuredClone(draft.feesByCondition[draft.feeCondition]);}}render();}});



 document.querySelector('#full-app-reset')?.addEventListener('click',showAppReset);



 document.querySelector('#retry-dealer')?.addEventListener('click',()=>refreshDealer(effectiveOwner()));



 document.querySelector('#moved-locations')?.addEventListener('click',()=>{readDraft();setup.values=structuredClone(draft);setup.step=2;setup.returnTo='defaults';dealerReady=false;error='';render();});



 bindLogin(render);



 document.querySelector('#sign-out')?.addEventListener('click',async()=>{const {error:authError}=await authClient.auth.signOut();if(authError){fail(Error('Sign-out failed. Try again.'));return;}cost='';recon='';quote=null;quoteRecord=null;screen='login';render();});



 document.querySelectorAll('[data-money]').forEach(el=>{



  let focusSelect=false,focusZero=false;



  el.onfocus=()=>{const raw=rawValue(el);focusZero=raw!==''&&Number(raw)===0;if(focusZero){el.value='';el.dataset.moneyRaw='';el.dataset.moneyDisplay='';}else{el.select();focusSelect=true;}};



  el.onpointerup=e=>{if(focusSelect){e.preventDefault();el.select();focusSelect=false;}};



  el.onbeforeinput=e=>{



   if(e.isComposing||!['insertText','deleteContentBackward','deleteContentForward'].includes(e.inputType))return;



   const raw=String(rawValue(el)||'');let start=Math.min(raw.length,el.value.slice(0,el.selectionStart||0).replace(/[$,]/g,'').length),end=Math.min(raw.length,el.value.slice(0,el.selectionEnd||0).replace(/[$,]/g,'').length);



   let text=e.inputType==='insertText'?(e.data||''):'';



   if(e.inputType==='deleteContentBackward'&&start===end)start=Math.max(0,start-1);



   if(e.inputType==='deleteContentForward'&&start===end)end=Math.min(raw.length,end+1);



   const next=raw.slice(0,start)+text+raw.slice(end);if(next&&!/^\d*(?:\.\d*)?$/.test(next))return;



   e.preventDefault();el.value=next;el.dataset.moneyRaw=next;el.dataset.moneyDisplay=next;el.setSelectionRange(start+text.length,start+text.length);el.dispatchEvent(new Event('input',{bubbles:true}));



  };







  el.oninput=()=>{



   const caret=el.selectionStart??el.value.length;



   let prefix=el.value.slice(0,caret).replace(/[$,]/g,'');



   let raw=el.value.replace(/[$,]/g,'').replace(/\.\./g,'.').trim();raw=raw.replace(/^0+(?=\d)/,'');prefix=prefix.replace(/^0+(?=\d)/,'');if(raw.startsWith('.'))raw='0'+raw;if(prefix.startsWith('.'))prefix='0'+prefix;



   if(raw===''){el.dataset.moneyRaw='';el.dataset.moneyDisplay='';return;}if(!/^\d*(?:\.\d*)?$/.test(raw))return;



   const n=Number(raw);if(!Number.isFinite(n))return;



   const decimal=raw.includes('.')?raw.split('.')[1]:'';



   const display='$'+Math.trunc(n).toLocaleString('en-US')+(raw.includes('.')?'.'+decimal:'');



   el.dataset.moneyRaw=raw;el.dataset.moneyDisplay=display;el.value=display;



   let position;



   if(prefix.includes('.'))position=display.indexOf('.')+1+prefix.split('.')[1].length;



   else{let remaining=(prefix.match(/\d/g)||[]).length;position=1;while(position<(display.includes('.')?display.indexOf('.'):display.length)&&remaining){if(/\d/.test(display[position]))remaining--;position++;}}



   el.setSelectionRange(position,position);



  };



  el.onblur=()=>{const raw=rawValue(el)|| (focusZero?'0':'');if(raw!==''&&Number.isFinite(Number(raw))&&Number(raw)>=0){el.dataset.moneyRaw=raw;el.dataset.moneyDisplay=money(Number(raw));el.value=el.dataset.moneyDisplay;}};



 });



 const brandHome=document.querySelector('#brand-home, #start-new-quote');



 if(brandHome)brandHome.onclick=()=>{deal={mode:'cash',vehicle:'',price:'',discount:'',rebate:'',trade:'',payoff:'',zip:'',apr:'6.9',term:'60',downs:['0','1000','2000']};cost='';recon='';quote=null;quoteRecord=null;flow={step:0,models:[],search:'',loading:false,catalogNote:''};flow.step=0;flow.skipVehicle=false;flow.conditionAnswered=false;flow.conditionRevealed=false;flow.tradeAnswered=false;flow.tradeRevealed=false;error='';notice='';screen=brandHome.id==='brand-home'?'home':'guide';if(screen==='home'){refreshHome();return;}render();window.scrollTo(0,0)};



bindGuide();



document.querySelector('#new-guided')?.addEventListener('click',()=>{deal={mode:'cash',condition:'used',vehicle:'',price:'',discount:'',rebate:'',trade:'',payoff:'',zip:'',apr:'6.9',term:'60',downs:['0','1000','2000']};cost='';recon='';flow.step=0;flow.skipVehicle=false;flow.conditionAnswered=false;flow.conditionRevealed=false;flow.tradeAnswered=false;flow.tradeRevealed=false;error='';notice='';screen='guide';render();window.scrollTo(0,0)});



document.querySelectorAll('[data-history-open]').forEach(b=>b.onclick=()=>{quoteRecord=history.find(r=>r.id===b.dataset.historyOpen);quote=structuredClone(quoteRecord.quote);if(quoteRecord.draft){deal=structuredClone(quoteRecord.draft);cost='';recon=''}screen='review';error='';render()});



document.querySelectorAll('[data-history-delete]').forEach(b=>b.onclick=()=>{if(!confirm('Delete this saved quote? This cannot be undone.'))return;try{const next=history.filter(r=>r.id!==b.dataset.historyDelete);localStorage.setItem(historyStorageKey(),JSON.stringify(next));history=next;render();}catch(e){fail(e)}});

document.querySelectorAll('[data-history-payoff]').forEach(b=>b.onclick=()=>exportPayoffPdf(history.find(r=>r.id===b.dataset.historyPayoff).payoff));



document.querySelector('#print-payoff')?.addEventListener('click',()=>exportPayoffPdf(quoteRecord?.payoff||historyEntry(quote,deal).payoff));







document.querySelectorAll('[id^=rule-zip-]').forEach(el=>el.onchange=()=>{readDraft();render()});







document.querySelectorAll('[data-preset]').forEach(b=>b.onchange=()=>{readDraft();const i=+b.dataset.preset;const state=b.value;draft.rules[i]={...draft.rules[i],preset:state,jurisdiction:''};if(!['FL','NY'].includes(state)&&state)Object.assign(draft.rules[i],presetRule(state,''));if(state&& !['NH','NY','DC'].includes(state))draft.rules[i].taxableFees=[...new Set([0,...draft.rules[i].taxableFees])];else if(!state)draft.rules[i].rate='';render()});







document.querySelectorAll('[data-jurisdiction]').forEach(b=>b.onchange=()=>{readDraft();const i=+b.dataset.jurisdiction;draft.rules[i].jurisdiction=b.value;if(b.value)Object.assign(draft.rules[i],presetRule(draft.rules[i].preset,b.value));render()});







draft?.rules.forEach((r,i)=>{if(screen==='defaults'&&r.preset)['rule-rate-','rule-trade-','rule-rebate-'].forEach(prefix=>document.getElementById(prefix+i).disabled=true)});







if(screen==='defaults')draft.rules.forEach((r,i)=>{if(r.preset)for(let j=0;j<1;j++){const el=document.getElementById(`rule-fee-${i}-${j}`);if(!el)continue;if(r.preset==='NY'&&j===0)continue;el.checked=j===0&&!['NH','DC'].includes(r.preset);el.disabled=true}});



document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>navigate(b.dataset.go));







document.querySelectorAll('[data-remove-term]').forEach(b=>b.onclick=()=>{readDeal();if(deal.terms.length>1){deal.terms.splice(Number(b.dataset.removeTerm),1);render();}});
document.querySelector('#add-payment-term')?.addEventListener('click',()=>{readDeal();if(deal.terms.length<3){deal.terms.push(String([36,48,72,60,84,24].find(t=>!deal.terms.map(Number).includes(t))||60));render();}});
document.querySelectorAll('.grid-down-input input').forEach(el=>{const end=()=>{if(document.activeElement===el&&el.selectionStart===el.selectionEnd)el.setSelectionRange(el.value.length,el.value.length);};el.addEventListener('focus',()=>requestAnimationFrame(end));el.addEventListener('click',end);el.addEventListener('blur',()=>{if(!el.value.trim()){el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}));}});});
document.querySelectorAll('[name=creditTier]').forEach(el=>el.addEventListener('change',e=>{readDeal();deal.creditTier=e.target.value;deal.apr=String(creditEstimateRate(deal.condition,deal.creditTier));render();}));
document.querySelectorAll('[data-mode],[data-condition]').forEach(b=>b.onclick=()=>{readDeal();if(b.dataset.mode)deal.mode=b.dataset.mode;else deal.condition=b.dataset.condition;error='';render()});







document.querySelector('#deal-form')?.addEventListener('submit',e=>{e.preventDefault();readDeal();if(deal.payoffSkipped&&!String(deal.payoff||'').trim()&&!e.payoffConfirmed){showPayoffReminder();return}try{quote=calculate(deal,defaults);quote.governmentFeesCollapsed=quote.condition==='new';if(quote.tax===null){error=quote.pendingReason||'Confirm registration location before generating a quote.';screen='tax';render();return}quoteRecord=historyEntry(quote,deal);if(!historyWarning){const next=[quoteRecord,...history].slice(0,100);localStorage.setItem(historyStorageKey(),JSON.stringify(next));history=next}screen='review';error='';render();window.scrollTo(0,0)}catch(e){fail(e)}});







// Refresh totals without replacing inputs or moving the mobile keyboard focus.







document.querySelector('#add-trade')?.addEventListener('change',e=>{readDeal();deal.hasTrade=e.target.checked;if(!deal.hasTrade){deal.trade='';deal.payoff='';deal.hasLien=false;}else deal.hasLien=undefined;render();});
document.querySelector('#transfer-tag')?.addEventListener('change',e=>{document.querySelector('#tagType').value=e.target.checked?'transfer':'new';readDeal();render();});
document.querySelector('#tag-info')?.addEventListener('click',()=>{const d=document.createElement('dialog');d.className='payoff-reminder';d.innerHTML='<h2>Tag fee estimates</h2><p>New tag: '+esc(money(Number(defaults.tagFees.new)))+'</p><p>Transfer tag: '+esc(money(Number(defaults.tagFees.transfer)))+'</p><p>Unchecked uses the new-tag estimate. Checked uses the transfer-tag estimate. Final registration fees may vary.</p><button type="button" class="quiet full">Close</button>';document.body.append(d);d.showModal();d.addEventListener('close',()=>d.remove(),{once:true});d.querySelector('button').onclick=()=>d.close();});



document.querySelector('#deal-form')?.addEventListener('input',e=>{if(['trade','payoff'].includes(e.target.id))deal.hasTrade=true;if(e.target.id==='payoff')deal.hasLien=true;readDeal();const temp=document.createElement('template');temp.innerHTML=dealView();const oldLines=document.querySelectorAll('#deal-form section:not(.summary) .line');const newLines=temp.content.querySelectorAll('#deal-form section:not(.summary) .line');oldLines.forEach((line,i)=>{if(newLines[i])line.innerHTML=newLines[i].innerHTML});document.querySelectorAll('[data-payment-cell]').forEach(cell=>{const next=temp.content.querySelector('[data-payment-cell="'+cell.dataset.paymentCell+'"]');if(next&&cell.querySelector('.grid-payment'))cell.querySelector('.grid-payment').textContent=next.querySelector('.grid-payment').textContent;})});







const captureTax=()=>{const c={};for(const el of document.querySelector('#tax-form').elements){if(el.id.startsWith('tax-'))c[el.id.slice(4)]=rawValue(el)}deal.taxContext=c;return c};



document.querySelector('#location-state')?.addEventListener('change',e=>{captureTax();deal.taxLocation={zip:deal.zip||defaults.zip,state:e.target.value,jurisdiction:''};render()});



document.querySelector('#tax-form')?.addEventListener('submit',e=>{e.preventDefault();captureTax();const state=document.querySelector('#location-state').value;if(state)deal.taxLocation={zip:deal.zip||defaults.zip,state,jurisdiction:document.querySelector('#location-jurisdiction')?.value||'',taxableFees:(defaults.feesByCondition?.[deal.condition]||defaults.fees).flatMap((f,i)=>document.querySelector('#location-fee-'+i)?.checked?[i]:[])};navigate('deal')});







document.querySelector('#cost-form')?.addEventListener('submit',e=>{e.preventDefault();cost=rawValue(document.querySelector('#cost'));recon=rawValue(document.querySelector('#recon'));try{gross(deal,cost,recon);error='';render()}catch(e){fail(e)}});







document.querySelector('#add-fee')?.addEventListener('click',()=>{readDraft();if(draft.fees.length>=15)return fail(Error('Up to 15 fees can be saved.'));draft.fees.push({name:'',amount:0});render()});







document.querySelectorAll('[data-remove-fee]').forEach(b=>b.onclick=()=>{readDraft();const index=+b.dataset.removeFee;draft.fees.splice(index,1);draft.rules.forEach(r=>r.taxableFees=r.taxableFees.filter(i=>i!==index).map(i=>i>index?i-1:i));render()});







document.querySelector('#add-rule')?.addEventListener('click',()=>{readDraft();draft.rules.push({zip:'',rate:'',tradeCredit:false,rebateDeduct:false,taxableFees:[]});render()});







document.querySelectorAll('[data-remove-rule]').forEach(b=>b.onclick=()=>{readDraft();draft.rules.splice(+b.dataset.removeRule,1);render()});







document.querySelector('#settings-fee-condition')?.addEventListener('change',e=>{const key=e.target.value;readDraft();draft.feesByCondition[draft.feeCondition||deal.condition||'used']=structuredClone(draft.fees);draft.feeCondition=key;draft.fees=structuredClone(draft.feesByCondition[key]);render();});



document.querySelector('#defaults-form')?.addEventListener('submit',async e=>{e.preventDefault();readDraft();try{if(!/^\d{5}$/.test(draft.zip))throw Error('Dealer ZIP must have five digits.');draft.fees.forEach(f=>{if(!f.name||f.name.length>60)throw Error('Each fee needs a name of 1–60 characters.');f.amount=number(f.amount,f.name)});const zips=new Set;draft.rules.forEach(r=>{if(!/^\d{5}$/.test(r.zip)||zips.has(r.zip))throw Error('Each tax rule needs a unique five-digit ZIP.');zips.add(r.zip);if(r.preset)Object.assign(r,presetRule(r.preset,r.jurisdiction));r.rate=number(r.rate,'Tax rate',{blank:false,max:25,precision:null})});if(draft.feesByCondition)draft.feesByCondition[draft.feeCondition||deal.condition||'used']=structuredClone(draft.fees);if(authState.user)await saveDealerSettings(effectiveOwner(),draft);localStorage.setItem(defaultsStorageKey(),JSON.stringify(draft));defaults=structuredClone(draft);storageWarning='';screen='home';error='';notice='Defaults saved.';render();window.scrollTo(0,0)}catch(e){fail(e)}});







document.querySelector('#toggle-government-fees')?.addEventListener('click',()=>{quote.governmentFeesCollapsed=!quote.governmentFeesCollapsed;if(quoteRecord){quoteRecord.quote=structuredClone(quote);try{localStorage.setItem(historyStorageKey(),JSON.stringify(history));}catch(e){fail(e);}}render();});



document.querySelector('#save-pdf')?.addEventListener('click',async()=>{try{if(!await exportPdf(quote))return;notice='PDF opened.';document.querySelector('#message').innerHTML='<p role="status">PDF opened for viewing.</p>'}catch(e){fail(e)}});







}







if(!authConfigured)restoreCurrentPage();



render();



if(authClient)loadProviders().then(()=>{if(screen==='login')render();});



const recordLastActive=startLastActive(authClient,()=>authState.user?.id,()=>!!adminState.target);
if(authClient)authClient.auth.onAuthStateChange((event,session)=>{



 const priorUser=authState.user?.id;authState.user=session?.user||null;
 // Token refresh and tab refocus can emit SIGNED_IN for the same account.
 // Preserve the current DOM, scroll and animation instead of rebuilding it.
 if(priorUser&&priorUser===authState.user?.id&&!authState.recovery&&!authState.linkError&&['SIGNED_IN','TOKEN_REFRESHED','INITIAL_SESSION'].includes(event))return;
 if(priorUser!==authState.user?.id&&authState.user)queueMicrotask(recordLastActive);



 if(priorUser!==authState.user?.id){adminState.target=null;adminState.allowed=false;queueMicrotask(()=>refreshAdmin().then(async()=>{let saved;try{saved=JSON.parse(sessionStorage.getItem('pd-home-view-as')||'null');sessionStorage.removeItem('pd-home-view-as');}catch{}if(adminState.allowed&&saved?.owner===authState.user?.id&&saved.target){try{await openAdminUser(saved.target);await refreshDealer(effectiveOwner());}catch{adminState.target=null;}}render();}));dealerReady=!authConfigured;dealerLoading=!!authState.user;defaults=emptyDefaults();if(authState.user){const dealerUserId=authState.user.id;queueMicrotask(()=>refreshDealer(dealerUserId));}setHistoryOwner(authState.user?.id);historyWarning='';try{history=readHistory();}catch(e){history=[];historyWarning=e.message;}cost='';recon='';quote=null;quoteRecord=null;deal={mode:'cash',condition:'used',vehicle:'',price:'',discount:'',rebate:'',trade:'',payoff:'',zip:'',apr:'6.9',term:'60',downs:['0','1000','2000']};flow={step:0,conditionAnswered:true,models:[],search:'',loading:false,catalogNote:''};}



 if(event==='PASSWORD_RECOVERY')authState.recovery=true;



 if(event==='SIGNED_IN'&&!authState.recovery&&screen==='login')screen='home';



 // Recovery remains on the password form until the save handler signs out.



 if(event==='INITIAL_SESSION'&&session&&screen==='login'&&!authState.recovery)screen='home';

 if(event==='INITIAL_SESSION'&&!session&&authState.recovery){authState.recovery=false;authState.mode='reset';authState.message='This reset link is invalid or expired. Request a new one below.';}



 render();



});







if('serviceWorker'in navigator&&import.meta.env.PROD){const hadController=!!navigator.serviceWorker.controller;let updateReloaded=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(hadController&&!updateReloaded){updateReloaded=true;location.reload();}});navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).then(registration=>registration.update()).catch(()=>{});}







let pullStart=null,pullDistance=0,refreshing=false;

function clearPullRefresh(){document.querySelector('#pull-refresh-status')?.remove();pullStart=null;pullDistance=0;}

document.addEventListener('touchstart',event=>{if(screen!=='home'||refreshing||window.scrollY>0||document.querySelector('dialog[open]')||event.touches.length!==1||event.target.closest('button,input,select,textarea,a'))return;pullStart={x:event.touches[0].clientX,y:event.touches[0].clientY};pullDistance=0;},{passive:true});

document.addEventListener('touchmove',event=>{if(!pullStart||screen!=='home')return;const touch=event.touches[0];if(!touch)return;const dy=touch.clientY-pullStart.y;if(dy<=0||Math.abs(touch.clientX-pullStart.x)>dy){clearPullRefresh();return;}pullDistance=dy;if(dy>20){event.preventDefault();let status=document.querySelector('#pull-refresh-status');if(!status){status=document.createElement('div');status.id='pull-refresh-status';status.setAttribute('role','status');document.body.append(status);}const label=dy>=90?'Release to refresh':'Pull down to refresh';if(status.textContent!==label)status.textContent=label;}},{passive:false});

document.addEventListener('touchcancel',clearPullRefresh,{passive:true});

document.addEventListener('touchend',async()=>{if(!pullStart)return;if(pullDistance<90||screen!=='home'){clearPullRefresh();return;}pullStart=null;pullDistance=0;const status=document.querySelector('#pull-refresh-status');if(status)status.textContent='Refreshing…';try{await refreshHome();}finally{clearPullRefresh();}},{passive:true});

// Keep horizontal drags inside the app from initiating browser navigation.

let horizontalSwipeStart=null;

document.addEventListener('touchstart',e=>{horizontalSwipeStart=e.touches.length===1?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null;},{passive:true});

document.addEventListener('touchmove',e=>{if(!horizontalSwipeStart||e.touches.length!==1)return;const t=e.touches[0],dx=t.clientX-horizontalSwipeStart.x,dy=t.clientY-horizontalSwipeStart.y;if(Math.abs(dx)>10&&Math.abs(dx)>Math.abs(dy)*1.3&&e.cancelable)e.preventDefault();},{passive:false});

document.addEventListener('touchend',()=>horizontalSwipeStart=null,{passive:true});

document.addEventListener('touchcancel',()=>horizontalSwipeStart=null,{passive:true});











