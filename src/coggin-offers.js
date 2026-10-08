export function cogginOfferPage(html,account,now=Date.now()){
 const match=[...html.matchAll(/DDC\.WS\.state\['ws-inv-data'\]\['[^']+'\] = (\{[^\n]+\});/g)].find(m=>{try{return JSON.parse(m[1]).moreRequestData?.siteId===account;}catch{return false;}});
 if(!match)throw Error('Official inventory data missing; retain previous offers.');
 const wis=JSON.parse(match[1]).WIS;if(!Array.isArray(wis?.inventory)||!Number.isInteger(wis.pageInfo?.totalCount)||!wis.pageInfo?.pageSize)throw Error('Invalid official inventory page.');
 const records=wis.inventory.map(row=>{if(row.accountId!==account||!row.stockNumber||!/^[A-HJ-NPR-Z0-9]{17}$/.test(row.vin))throw Error('Official inventory belongs to another store.');
 const offers=row.type==='new'&&row.make==='Nissan'?(row.incentiveIds||[]).map(id=>wis.incentives?.['['+id+']']).filter(o=>o?.manufacturerOffer===true&&o.conditional===false&&o.make==='Nissan'&&o.condition==='NEW'&&o.specific?._type==='CASH'&&/customer cash/i.test(o.title)&&Number.isFinite(o.specific.cashOption)&&o.specific.cashOption>0&&Date.parse(o.effectiveDate)<=now&&Date.parse(o.expirationDate)+86400000>now).map(o=>({id:o.uniqueId,title:o.title,amount:o.specific.cashOption,effectiveDate:o.effectiveDate,expirationDate:o.expirationDate,terms:o.disclaimer||''})):[];
 return {stock:row.stockNumber,vin:row.vin,link:row.link,offers};});return {records,total:wis.pageInfo.totalCount,size:wis.pageInfo.pageSize,start:wis.pageInfo.pageStart};
}
export function usableCustomerCash(offers,checkedAt,now=Date.now()){if(!Number.isFinite(Date.parse(checkedAt))||now-Date.parse(checkedAt)>86400000||now<Date.parse(checkedAt))return [];return (offers||[]).filter(o=>Number.isFinite(o.amount)&&o.amount>0&&Date.parse(o.effectiveDate)<=now&&Date.parse(o.expirationDate)+86400000>now);}
