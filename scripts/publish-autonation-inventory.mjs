import {readFile,writeFile,rename,mkdir,unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {validateAutoNationFeed} from '../src/autonation-inventory.js';
const [input,...flags]=process.argv.slice(2);
if(!input)throw Error('Supply a complete AutoNation browser snapshot.');
const config=JSON.parse(await readFile('data/dealership-sources.json','utf8'))['autonation-jacksonville'];
const data=validateAutoNationFeed(JSON.parse(await readFile(input,'utf8')),config),age=Date.now()-Date.parse(data.checkedAt);
if(age<0||age>3600000||!data.vehicles.length||!Number.isFinite(Date.parse(data.listRecheckedAt))||Date.parse(data.listRecheckedAt)>Date.now()||Date.now()-Date.parse(data.listRecheckedAt)>3600000)throw Error('Empty, stale or unrechecked AutoNation evidence will not be published.');
const repo=resolve('tmp/hosted-preview'),lock=resolve('tmp/autonation-publish.lock'),file='inventory/autonation-jacksonville.json';
await mkdir('tmp',{recursive:true});await writeFile(lock,JSON.stringify({pid:process.pid}),{flag:'wx'});
try{
 const git=args=>execFileSync('git',['-c','safe.directory='+repo.replaceAll('\\','/'),'-C',repo,'-c','user.name=Pocket Desking inventory','-c','user.email=github-actions[bot]@users.noreply.github.com',...args],{encoding:'utf8'});
 if(flags.includes('--publish')){if(git(['status','--porcelain']).trim())throw Error('Release checkout has unfinished changes.');git(['pull','--rebase','origin','main']);}
 await mkdir('public/inventory',{recursive:true});await writeFile('public/'+file+'.tmp',JSON.stringify(data));await rename('public/'+file+'.tmp','public/'+file);
 if(!flags.includes('--publish')){console.log(JSON.stringify({total:data.vehicles.length,validated:true,published:false}));}
 else{
  await writeFile(resolve(repo,file)+'.tmp',JSON.stringify(data));await rename(resolve(repo,file)+'.tmp',resolve(repo,file));git(['add','--',file]);
  if(git(['diff','--cached','--name-only']).trim()){git(['commit','-m','Add verified AutoNation USA Jacksonville inventory']);let pushed=false;for(let attempt=0;attempt<5;attempt++){git(['pull','--rebase','origin','main']);try{git(['push','origin','main']);pushed=true;break;}catch{}}if(!pushed)throw Error('Verified snapshot committed but push did not complete.');}
  const identity=git(['remote','get-url','origin']).trim().match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/)?.[1];if(!identity)throw Error('Unsupported remote.');
  execFileSync('gh',['api','--method','POST','repos/'+identity+'/pages/builds'],{stdio:'ignore',timeout:20000});
  let verified=false;
  for(let i=0;i<45;i++){try{const r=await fetch('https://'+identity.split('/')[0]+'.github.io/'+file+'?verify='+Date.now(),{signal:AbortSignal.timeout(10000)});if(r.ok&&JSON.stringify(await r.json())===JSON.stringify(data)){verified=true;break;}}catch{}await new Promise(r=>setTimeout(r,2000));}
  await writeFile('tmp/autonation-publication.json',JSON.stringify({count:data.vehicles.length,checkedAt:data.checkedAt,liveVerified:verified},null,2));if(!verified)throw Error('Pushed snapshot is not yet verified live.');
  console.log(JSON.stringify({count:data.vehicles.length,liveVerified:true}));
 }
}finally{await unlink(lock);}
