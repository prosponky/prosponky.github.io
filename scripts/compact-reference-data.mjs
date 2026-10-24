import {readFile,writeFile} from 'node:fs/promises';
const read=async name=>JSON.parse(await readFile('src/data/'+name+'.json','utf8'));
const source=await read('vehicle-makes'),code=await readFile('src/vehicle.js','utf8');
const brands=JSON.parse(code.match(/const commonBrands=(\[[^;]+\]);/)[1].replaceAll("'",'"'));
await writeFile('src/data/vehicle-makes-compact.json',JSON.stringify({...source,records:source.records.filter(r=>brands.includes(r.name))}));
const zip=await read('zip-candidates'),counties=[],ids=new Map(),records={};
for(const [key,rows]of Object.entries(zip.records))records[key]=rows.map(row=>{const value=JSON.stringify(row);if(!ids.has(value)){ids.set(value,counties.length);counties.push(row);}return ids.get(value);});
await writeFile('src/data/zip-candidates-compact.json',JSON.stringify({...zip,counties,records}));
console.log('Compacted reference data: '+brands.length+' make choices, '+counties.length+' unique county records.');
