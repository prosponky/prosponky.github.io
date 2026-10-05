const dealerHost='www.greenwaykiaattheavenues.com';
export function marketcheckPage(data,checkedAt){
 if(!Number.isInteger(data?.num_found)||data.num_found<1||!Array.isArray(data.listings))throw Error('Inventory response is incomplete.');
 const vehicles=data.listings.map(row=>{
  let url;try{url=new URL(row.vdp_url);}catch{throw Error('Inventory source URL is missing.');}
  const location=row.car_location||row.dealer||row.mc_dealership;
  if(url.protocol!=='https:'||url.hostname!==dealerHost||String(location?.zip)!=='32256')throw Error('Inventory dealership does not match Greenway.');
  if(!row.id||!row.stock_no||!/^[A-HJ-NPR-Z0-9]{17}$/i.test(row.vin||'')||!['new','used'].includes(row.inventory_type)||!row.build?.year||!row.build?.make||!row.build?.model)throw Error('Inventory identity is incomplete.');
  const money=value=>value==null?null:(typeof value==='number'&&Number.isFinite(value)&&value>=0?value:(()=>{throw Error('Invalid inventory price.');})());
  return {listingId:row.id,stockNumber:row.stock_no.trim().toUpperCase(),vin:row.vin.toUpperCase(),condition:row.inventory_type,
   year:row.build.year,make:row.build.make,model:row.build.model,msrp:money(row.msrp),advertisedPrice:money(row.price),
   dealerDiscount:null,discountKind:'',sourceName:'MarketCheck',sourceUrl:url.href,checkedAt,
   sourceSeenAt:Number.isFinite(row.last_seen_at)?new Date(row.last_seen_at*1000).toISOString():null};
 });
 return {total:data.num_found,vehicles};
}
