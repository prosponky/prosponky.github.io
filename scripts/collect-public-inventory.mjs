import {spawn} from 'node:child_process';
import {appendFile,writeFile,mkdir} from 'node:fs/promises';
const queue=['greenway','coggin-atlantic','coggin-avenues'],outcomes={};
await mkdir('tmp',{recursive:true});
async function worker(){
 while(queue.length){
  const store=queue.shift();
  const outcome=await new Promise(resolve=>{
   const child=spawn(process.execPath,['scripts/collect-dealerrater.mjs',store],{stdio:['ignore','pipe','pipe']});
   child.stdout.on('data',chunk=>process.stdout.write('['+store+'] '+chunk));
   child.stderr.on('data',chunk=>process.stderr.write('['+store+'] '+chunk));
   child.on('error',()=>resolve('failure'));
   child.on('close',code=>resolve(code===0?'success':'failure'));
  });
  outcomes[store]=outcome;
  if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,store.replace('coggin-','')+'='+outcome+'\n');
 }
}
// Two independent stores at a time, retaining each collector's page pacing and validation.
await Promise.all([worker(),worker()]);
await writeFile('tmp/public-inventory-outcomes.json',JSON.stringify({checkedAt:new Date().toISOString(),outcomes},null,2));
console.log(JSON.stringify(outcomes));
// The workflow reports failures after publishing only successful complete snapshots.
