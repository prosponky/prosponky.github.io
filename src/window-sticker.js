// Accept evidence only after a successful document check; a constructed URL is not evidence.
const providers=new Set(['www.windowsticker.forddirect.com','windowsticker.forddirect.com','www.chrysler.com','www.jeep.com','www.ramtrucks.com','www.dodge.com','www.kia.com','www.hyundaiusa.com','www.nissanusa.com','www.subaru.com','www.toyota.com','www.carfax.com','carfax.com','www.cogginnissanatlantic.com','www.nissanattheavenues.com','www.greenwaykiaattheavenues.com']);
export function stickerUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&providers.has(u.hostname)?u.href:null;}catch{return null;}}
export function stickerCandidates(html,base){
 const out=new Set();
 for(const m of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
  if(!/(?:original\s+)?window\s*sticker|monroney/i.test(m[0])||/build\s*sheet/i.test(m[0]))continue;
  try{const url=stickerUrl(new URL(m[1].replaceAll('&amp;','&'),base).href);if(url)out.add(url);}catch{}
 }
 return [...out];
}
export function stickerDocumentMatches(text,vin){return /^[A-HJ-NPR-Z0-9]{17}$/.test(vin)&&text.replace(/\s/g,'').toUpperCase().includes(vin)&&/MSRP|manufacturer.?s suggested retail price/i.test(text)&&/fuel economy|fueleconomy\.gov|environment and energy/i.test(text)&&!(/sticker (?:not found|unavailable)|no window sticker|reproduction|sample sticker|unofficial copy|not actual monroney/i.test(text));}
export function verifiedWindowSticker(record,vin,now=Date.now()){
 const checked=Date.parse(record?.checkedAt);return record?.status==='verified'&&record.vin===vin&&record.documentVin===vin&&record.original===true&&Number.isFinite(checked)&&checked<=now&&stickerUrl(record.sourceUrl)&&stickerUrl(record.url)?stickerUrl(record.url):null;
}
export function windowStickerButton(record,vin,now=Date.now()){return verifiedWindowSticker(record,vin,now)?'<button type="button" class="quiet full" data-view-window-sticker>Window sticker</button>':'';}

