// Public page evidence only. No assumed fee subtraction or syndicated fallback.
const escapeRegex=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function parseOfficialCard({text,url},config,condition){
 const stockNumber=text.match(/Stock\s*:\s*([A-Z0-9-]+)/i)?.[1]?.toUpperCase();
 const vin=text.match(/VIN\s*:\s*([A-HJ-NPR-Z0-9]{17})\b/i)?.[1]?.toUpperCase();
 let link;try{link=new URL(url);}catch{throw Error('Missing official listing link');}
 if(!stockNumber||!vin||link.origin!==config.origin||!link.pathname.startsWith('/inventory/')||!link.pathname.toUpperCase().endsWith('-'+vin+'/'))throw Error('Official card identity or store mismatch');
 const labeledPrice=label=>{
  const matches=[...text.matchAll(new RegExp('(?:^|\\n)'+escapeRegex(label)+'[\\s\\uF05A]*\\$([\\d,]+(?:\\.\\d{1,2})?)','gi'))];
  const amounts=[...new Set(matches.map(m=>Number(m[1].replaceAll(',',''))))];
  if(amounts.length>1)throw Error('Conflicting official price labels for '+stockNumber);
  return amounts.length===1&&Number.isFinite(amounts[0])&&amounts[0]>0?amounts[0]:null;
 };
 return {stockNumber,vin,condition,url:link.href,price:labeledPrice(config.salePriceLabel),msrp:condition==='new'?labeledPrice('MSRP'):null};
}
export class OfficialCollection{
 constructor(config){this.config=config;this.records=new Map();this.expected=0;this.completed=[];}
 start(condition,total){if(!['new','used'].includes(condition)||!Number.isInteger(total)||total<1||this.section)throw Error('Invalid official section count');this.section={condition,total,vins:new Set(),pages:new Set()};}
 add(cards){if(!this.section||!Array.isArray(cards)||!cards.length)throw Error('Empty official page');const signature=cards.map(c=>c.url).join('|');if(this.section.pages.has(signature))throw Error('Repeated official page');this.section.pages.add(signature);
  for(const card of cards){const row=parseOfficialCard(card,this.config,this.section.condition),previous=this.records.get(row.vin);if(previous&&JSON.stringify(previous)!==JSON.stringify(row))throw Error('Conflicting repeated official VIN');this.records.set(row.vin,row);this.section.vins.add(row.vin);}
  if(this.section.vins.size>this.section.total)throw Error('Official count changed during collection');return this.section.vins.size;
 }
 finish(){if(!this.section||this.section.vins.size!==this.section.total)throw Error('Incomplete official section');this.expected+=this.section.total;this.completed.push(this.section.condition);this.section=null;}
 snapshot(checkedAt=new Date().toISOString()){
  if(this.section||!this.completed.length||this.records.size!==this.expected||!Number.isFinite(Date.parse(checkedAt)))throw Error('Incomplete official collection');
  return {checkedAt,source:this.config.origin,adapter:this.config.adapter,sections:this.completed,total:this.expected,prices:Object.fromEntries([...this.records].map(([vin,row])=>[vin,{stockNumber:row.stockNumber,condition:row.condition,price:row.price,msrp:row.msrp,url:row.url}]))};
 }
}
