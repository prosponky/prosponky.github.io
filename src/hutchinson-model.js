import taxonomy from '../data/hutchinson-models.json' with {type:'json'};

// Match the longest model name actually advertised in the dealers' model filters.
export function hutchinsonModelFields(make,combined){
 let name=String(combined||'').trim();
 if(/^mazda3$/i.test(make)){name='Mazda3 '+name;make='Mazda';}
 const model=taxonomy.models.find(model=>name.toLowerCase()===model.toLowerCase()||name.toLowerCase().startsWith(model.toLowerCase()+' '));
 if(model)return {make,model:name.slice(0,model.length),trim:name.slice(model.length).trim()};
 // The dealer calls this model E-Class in the filter and E 350 in its title.
 if(/^mercedes-benz$/i.test(make)&&/^E\s+\d{3}\b/i.test(name))return {make,model:'E-Class',trim:name};
 return {make,model:name,trim:''};
}
