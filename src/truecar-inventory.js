export function truecarPage(html,checkedAt){
 const match=html.match(/<script\b[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
 if(!match)throw Error('TrueCar inventory page format changed.');
 const state=JSON.parse(match[1]).props?.pageProps?.__APOLLO_STATE__;
 if(!state?.ROOT_QUERY)throw Error('TrueCar inventory data is missing.');
 const search=Object.entries(state.ROOT_QUERY).find(([key])=>key.startsWith('marketplaceListingSearch('))?.[1];
 if(!search||!Array.isArray(search.edges)||typeof search.pageInfo?.hasNextPage!=='boolean')throw Error('TrueCar pagination is missing.');
 const vehicles=[];
 for(const edge of search.edges){
  const row=edge.node?.__ref?state[edge.node.__ref]:edge.node;
  if(!row)throw Error('TrueCar listing reference is missing.');
  const dealer=row.dealership?.__ref?state[row.dealership.__ref]:row.dealership;
  if(dealer?.databaseId!=='415794')continue;
  if(dealer.name!=='Greenway KIA at the Avenues'||dealer.location?.geolocation?.postalCode!=='32256')throw Error('TrueCar dealership identity changed.');
  const v=row.vehicle,stockNumber=v?.details?.stockNumber,vin=v?.vin;
  if(!stockNumber||!vin||!['NEW','USED'].includes(v.condition))throw Error('TrueCar listing identity is incomplete.');
  const condition=v.condition==='NEW'?'new':'used',pricing=row.pricing;
  vehicles.push({stockNumber:stockNumber.toUpperCase(),vin,condition,year:v.year,make:v.make?.name,model:v.model?.name,
   msrp:pricing?.totalMsrp??null,advertisedPrice:pricing?.listPrice??null,dealerDiscount:null,discountKind:'',
   sourceName:'TrueCar',sourceUrl:`https://www.truecar.com/${condition==='new'?'new':'used'}-cars-for-sale/listing/${vin}/`,checkedAt});
 }
 return {vehicles,hasNextPage:search.pageInfo.hasNextPage,signature:search.edges.map(e=>e.node?.__ref||e.node?.id).join('|')};
}
