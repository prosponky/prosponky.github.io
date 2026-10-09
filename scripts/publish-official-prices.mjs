import {verifiedCarfaxUrl} from '../src/carfax.js';
import {readFile,writeFile,rename,mkdir,unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
const [store,input,...flags]=process.argv.slice(2);
const configs=JSON.parse(await readFile('data/dealership-sources.json','utf8')),config=configs[store];
if(config?.adapter!=='dealer-inspire-browser'||!input)throw Error('Use a registered browser store and an evidence snapshot.');
const data=JSON.parse(await readFile(input,'utf8'));
const age=Date.now()-Date.parse(data.checkedAt);
if(data.source!==config.origin||data.adapter!==config.adapter||!Number.isFinite(age)||age<0||age>3600000||!Array.isArray(data.sections)||config.sections.some(s=>!data.sections.includes(s.condition))||data.total!==Object.keys(data.prices||{}).length||data.total<1)throw Error('Incomplete or stale official price evidence');
for(const [vin,row] of Object.entries(data.prices)){
 const url=new URL(row.url);if(!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)||url.origin!==config.origin||!url.pathname.startsWith('/inventory/')||!url.pathname.toUpperCase().endsWith('-'+vin+'/')||!row.stockNumber||!['new','used'].includes(row.condition))throw Error('Official identity mismatch');
 for(const key of ['price','msrp'])if(row[key]!==null&&!(typeof row[key]==='number'&&Number.isFinite(row[key])&&row[key]>0))throw Error('Unverified price amount');
}
if(data.carfax){if(data.carfax.source!==config.origin||data.carfax.total!==Object.keys(data.carfax.reports||{}).length||data.carfax.total!==Object.values(data.prices).filter(r=>r.condition==='used').length)throw Error('Incomplete Carfax collection');for(const [vin,report]of Object.entries(data.carfax.reports)){if(data.prices[vin]?.condition!=='used'||report.listingUrl!==data.prices[vin].url||report.stockNumber!==data.prices[vin].stockNumber||report.url!==null&&!verifiedCarfaxUrl(report.url))throw Error('Carfax identity mismatch');}}
const repo=resolve('tmp/hosted-preview'),lock=resolve('tmp/official-price-publish.lock');await mkdir('tmp',{recursive:true});
await writeFile(lock,JSON.stringify({pid:process.pid,startedAt:new Date().toISOString()}),{flag:'wx'});
try{
 const git=args=>execFileSync('git',['-C',repo,'-c','user.name=Pocket Desking inventory','-c','user.email=github-actions[bot]@users.noreply.github.com',...args],{encoding:'utf8'});
 if(flags.includes('--publish')){if(git(['status','--porcelain']).trim())throw Error('Publishing checkout has unfinished changes; no overwrite attempted');git(['pull','--rebase','origin','main']);}
 for(const dir of ['public/inventory',repo+'/inventory']){await mkdir(dir,{recursive:true});const path=dir+'/'+config.priceFile;await writeFile(path+'.tmp',JSON.stringify(data));await rename(path+'.tmp',path);if(data.carfax){const reportPath=dir+'/greenway-carfax.json';await writeFile(reportPath+'.tmp',JSON.stringify(data.carfax));await rename(reportPath+'.tmp',reportPath);}}
 if(flags.includes('--publish')){const path='inventory/'+config.priceFile;git(['add','--',path,...(data.carfax?['inventory/greenway-carfax.json']:[])]);if(git(['diff','--cached','--name-only']).trim()){git(['commit','-m','Verify official '+config.name+' prices']);let pushed=false;for(let attempt=1;attempt<=5;attempt++){try{git(['pull','--rebase','origin','main']);git(['push','origin','main']);pushed=true;break;}catch{if(attempt===5)throw Error('Verified snapshot committed but could not publish');}}if(!pushed)throw Error('Price publication failed');}}
 let liveVerified=false;
 if(flags.includes('--publish')){
  const remote=git(['remote','get-url','origin']).trim(),identity=remote.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/)?.[1];
  if(!identity)throw Error('Unsupported publication remote');
  execFileSync('gh',['api','--method','POST','repos/'+identity+'/pages/builds'],{stdio:'ignore',timeout:20000});
  const live='https://'+identity.split('/')[0]+'.github.io/inventory/'+config.priceFile;
  for(let attempt=0;attempt<30;attempt++){
   try{const response=await fetch(live+'?verify='+encodeURIComponent(data.checkedAt),{cache:'no-store',signal:AbortSignal.timeout(10000)});if(response.ok&&JSON.stringify(await response.json())===JSON.stringify(data)){let reportsVerified=!data.carfax;if(data.carfax){const reports=await fetch('https://'+identity.split('/')[0]+'.github.io/inventory/greenway-carfax.json?verify='+encodeURIComponent(data.carfax.checkedAt),{cache:'no-store',signal:AbortSignal.timeout(10000)});reportsVerified=reports.ok&&JSON.stringify(await reports.json())===JSON.stringify(data.carfax);}if(reportsVerified){liveVerified=true;break;}}}catch{}
   await new Promise(r=>setTimeout(r,2000));
  }
  if(!liveVerified)throw Error('Valid prices pushed, but live publication was not verified yet');
  await writeFile(resolve('tmp','inventory-health-'+store+'.json'),JSON.stringify({status:'published',store,total:data.total,checkedAt:data.checkedAt,updatedAt:new Date().toISOString(),liveVerified}));
 }
 console.log(JSON.stringify({store,total:data.total,checkedAt:data.checkedAt,published:flags.includes('--publish'),liveVerified}));
}catch(error){
 await writeFile(resolve('tmp','inventory-health-'+store+'.json'),JSON.stringify({status:'publication-failed',store,checkedAt:data.checkedAt,updatedAt:new Date().toISOString(),reason:error.message}));
 throw error;
}finally{await unlink(lock);}
