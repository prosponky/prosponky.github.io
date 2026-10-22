import {readFile,writeFile} from 'node:fs/promises';
import {hutchinsonModelFields} from '../src/hutchinson-model.js';
for(const key of ['kia','gmc','cadillac']){
 const path=`public/inventory/hutchinson-${key}.json`,feed=JSON.parse(await readFile(path,'utf8'));
 feed.vehicles=feed.vehicles.map(row=>row.trim?row:{...row,...hutchinsonModelFields(row.make,row.model)});
 await writeFile(path,JSON.stringify(feed));
 console.log(key,{total:feed.total,withTrim:feed.vehicles.filter(v=>v.trim).length,withoutTrim:feed.vehicles.filter(v=>!v.trim).map(v=>v.make+' '+v.model)});
}
