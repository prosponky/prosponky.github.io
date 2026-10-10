import {execFileSync,spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
const files=process.argv.slice(2);
const allowed=new Set(['greenway.json','coggin-atlantic.json','coggin-avenues.json','coggin-atlantic-links.json','coggin-avenues-links.json']);
if(!files.length||files.some(f=>!allowed.has(f)))throw Error('Invalid snapshot selection');
const snapshots=files.map(file=>({file,text:readFileSync(resolve('public/inventory',file),'utf8')}));
const git=(args,cwd=process.cwd())=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','inherit']});
for(let attempt=0;attempt<5;attempt++){
 git(['fetch','origin','main']);
 const dir=join(mkdtempSync(join(tmpdir(),'inventory-publish-')),'release');
 git(['worktree','add','--detach',dir,'origin/main']);
 const changed=[];
 for(const {file,text} of snapshots){
  const path=join(dir,'inventory',file);
  const current=readFileSync(path,'utf8');
  const incomingTime=Date.parse(JSON.parse(text).checkedAt);
  const currentTime=Date.parse(JSON.parse(current).checkedAt);
  if(!Number.isFinite(incomingTime))throw Error('Snapshot missing check date: '+file);
  if(currentTime>incomingTime){console.log('Retaining newer published snapshot: '+file);continue;}
  if(current!==text){writeFileSync(path,text);changed.push('inventory/'+file);}
 }
 if(!changed.length){console.log('Latest complete snapshots already published');process.exit(0);}
 git(['add','--',...changed],dir);
 git(['-c','user.name=Pocket Desking inventory','-c','user.email=github-actions[bot]@users.noreply.github.com','commit','-m','Refresh complete store inventories independently'],dir);
 const result=spawnSync('git',['push','origin','HEAD:main'],{cwd:dir,stdio:'inherit'});
 if(result.status===0)process.exit(0);
 console.log('Remote advanced; reapplying snapshots to latest release');
}
throw Error('Publication could not complete after five attempts');
