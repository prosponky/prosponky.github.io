// Absence is meaningful only in a complete official inventory newer than the feed.
export function reconcileOfficialAvailability(feed,evidence,{origin,account,now=Date.now()}){
 const checked=Date.parse(evidence?.checkedAt),feedChecked=Date.parse(feed.checkedAt);
 if(!Number.isFinite(checked)||!Number.isFinite(feedChecked)||checked<feedChecked||checked>now||now-checked>86400000)return feed;
 let vins;
 if(account){
  if(evidence.source!==origin||evidence.complete!==true||!Array.isArray(evidence.inventoryVins))return feed;
  vins=evidence.inventoryVins;
 }else{
  if(evidence.source!==origin||evidence.adapter!=='dealer-inspire-browser'||!['new','used'].every(c=>evidence.sections?.includes(c)))return feed;
  vins=Object.keys(evidence.prices||{});
 }
 if(evidence.total!==vins.length||!vins.length||new Set(vins).size!==vins.length||vins.some(v=>!/^[A-HJ-NPR-Z0-9]{17}$/.test(v)))return feed;
 const present=new Set(vins);
 return {...feed,vehicles:feed.vehicles.filter(v=>present.has(String(v.vin).toUpperCase()))};
}
