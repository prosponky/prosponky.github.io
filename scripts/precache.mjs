import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const manifest=JSON.parse(await readFile('dist/.vite/manifest.json','utf8')),selected=new Set();
function visit(key){const item=manifest[key];if(!item||selected.has('/'+item.file))return;selected.add('/'+item.file);for(const asset of [...item.css||[],...item.assets||[]])selected.add('/'+asset);for(const imported of item.imports||[])visit(imported);}
for(const [key,item]of Object.entries(manifest))if(item.isEntry)visit(key);
// Keep basic PDF export available even on the first offline quote.
visit('src/pdf.js');
const assets=[...selected].sort();
const hash=createHash('sha256').update(assets.join('|')).digest('hex').slice(0,12);
let worker=await readFile('dist/sw.js','utf8');
worker=worker.replace("'pocket-desking-v1'",`'pocket-desking-${hash}'`).replace("cache.addAll(['/','/icon.svg'",`cache.addAll(${JSON.stringify(assets).slice(0,-1)},'/','/icon.svg'`);
await writeFile('dist/sw.js',worker);
console.log(`Offline precache: ${assets.length} build assets, cache ${hash}`);
