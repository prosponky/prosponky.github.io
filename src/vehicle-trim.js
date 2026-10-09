// Use an explicit trim or the suffix of a VIN-matched official vehicle title.
// Never infer a trim from a stock number, equipment, or seller prose.
export function trimFromTitle(vehicle,title){
 const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
 const explicit=clean(vehicle.trim);
 if(explicit)return explicit;
 let full=clean(title);const year=String(vehicle.year??'');
 if(!year||!full.startsWith(year+' '))return '';
 // These are model-name spellings, not trim guesses; the remaining suffix
 // still comes verbatim from the VIN-matched official title.
 if(vehicle.make==='Kia'&&String(vehicle.model).startsWith('Carnival'))full=full.replace('Kia Carnival MPV ','Kia Carnival ');
 if(vehicle.make==='Mazda'&&vehicle.model==='Mazda3')full=full.replace(year+' Mazda3 ',year+' Mazda Mazda3 ');
 if(vehicle.make==='Mercedes-Benz'&&vehicle.model==='AMG GLA 35'&&full===year+' Mercedes-Benz GLA AMG® 35')return 'AMG® 35';
 const base=clean([vehicle.year,vehicle.make,vehicle.model].join(' '));
 if(!base||full.toLowerCase()===base.toLowerCase())return '';
 if(!full.toLowerCase().startsWith(base.toLowerCase()+' '))return '';
 return full.slice(base.length).trim().replace(/^(?:Plug-In Hybrid|Hybrid|Hatchback)\s+/i,'');
}
