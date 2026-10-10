import {OfficialCollection} from '../src/official-inventory.js';
import {verifiedCarfaxUrl} from '../src/carfax.js';
export function verifyGreenwayCheckpoint(state,config){
 if(state.source!==config.origin||!Number.isFinite(Date.parse(state.startedAt))||Date.parse(state.startedAt)>Date.now()||Date.now()-Date.parse(state.startedAt)>3600000)throw Error('Invalid or expired official run');
 const c=new OfficialCollection(config);let index=0,nextPage=1;
 for(const p of state.pages){const s=config.sections[index],u=new URL(p.url);if(!s||p.condition!==s.condition||u.origin!==config.origin||u.pathname!==s.path||p.page!==nextPage||Number(u.searchParams.get('_p')||1)!==p.page||!Number.isInteger(p.lastPage)||p.lastPage<p.page)throw Error('Official page progression mismatch');
  if(!c.section)c.start(s.condition,p.total);if(c.section.total!==p.total)throw Error('Official total changed');c.add(p.cards);
  if(p.page===p.lastPage){c.finish();index++;nextPage=1;}else nextPage++;
 }
 if(state.sectionIndex!==index)throw Error('Official section progression mismatch');
 if(index!==config.sections.length)return {complete:false};
 const snapshot=c.snapshot();const vehicles=Object.entries(snapshot.prices).filter(([,r])=>r.condition==='used').map(([vin,r])=>({vin,...r}));
 if(state.detailIndex!==state.details.length||state.detailIndex>vehicles.length)throw Error('Invalid detail progression');
 const reports={};for(let i=0;i<state.details.length;i++){const d=state.details[i],r=vehicles[i];if(d.vin!==r.vin||d.url!==r.url||!d.body.toUpperCase().includes(r.vin)||/access denied|verify you are human|security challenge/i.test(d.body))throw Error('Detail identity mismatch');const links=[...new Set(d.hrefs.map(verifiedCarfaxUrl).filter(Boolean))];if(links.length>1)throw Error('Conflicting Carfax reports');reports[r.vin]={stockNumber:r.stockNumber,listingUrl:r.url,interiorColor:d.body.match(/(?:^|\n)Interior(?: Color)?\s*:?\s*\n?([^\n]+)/i)?.[1]?.trim()||'',url:links[0]||null};}
 if(state.detailIndex===vehicles.length){snapshot.carfax={source:config.origin,checkedAt:snapshot.checkedAt,total:vehicles.length,reports};return {complete:true,snapshot,vehicles};}
 return {complete:false,vehicles};
}
