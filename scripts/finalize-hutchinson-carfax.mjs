import {readFile,writeFile} from 'node:fs/promises';
import {applyHutchinsonCarfax} from '../src/hutchinson-carfax.js';
const checkpoint=JSON.parse(await readFile('tmp/hutchinson/carfax-checkpoint.json','utf8'));
const outputs=[];
for(const key of ['kia','gmc','cadillac']){
 const path=`public/inventory/hutchinson-${key}.json`;
 const feed=JSON.parse(await readFile(path,'utf8'));
 const result=applyHutchinsonCarfax(feed,key,checkpoint);
 outputs.push({key,path,result});
}
for(const {key,path,result} of outputs){await writeFile(path,JSON.stringify(result));console.log(key,{used:result.vehicles.filter(v=>v.condition==='used').length,reports:result.vehicles.filter(v=>v.carfaxUrl).length});}
