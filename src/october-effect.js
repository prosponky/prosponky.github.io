export let previewOctoberEffect=()=>false;
const KEY='pd-october-spider-v4';
export function seasonalDecision(saved,now,random=Math.random){
 const date=new Date(now),season=String(date.getFullYear());
 if(date.getMonth()!==9)return {active:false,state:null,show:false};
 const valid=saved?.season===season&&Number.isFinite(saved.nextAt)&&saved.nextAt>0;
 const delay=()=>now+(120+Math.min(1,Math.max(0,random()))*60)*60000;
 if(!valid)return {active:true,state:{season,nextAt:delay()},show:false};
 if(now<saved.nextAt)return {active:true,state:saved,show:false};
 const day=date.toDateString(),show=true;
 return {active:true,state:{season,nextAt:delay(),lastShownDay:show?day:saved.lastShownDay},show};
}
export function startOctoberEffect(getScreen){
 let spider=null,expiry=null;
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 const spiderSafe=()=>!document.querySelector('dialog[open], [aria-modal="true"]')&&!document.hidden&&!motion.matches&&['home','inventory','sales','history','admin','defaults','menu','guide','deal','cost','tax'].includes(getScreen());
 const safe=()=>spiderSafe()&&!document.querySelector('dialog[open], [aria-modal="true"]');
 let spiderModal=null;
 const syncSpiderLayer=()=>{
  if(!spider||!spider.showPopover)return;
  const modal=document.querySelector('dialog[open]');
  if(modal!==spiderModal){spiderModal=modal;spider.hidePopover();spider.showPopover();}
 };
 const remove=()=>{spider?.remove();spider=null;clearTimeout(expiry);};
 const syncBanner=()=>{const active=new Date().getMonth()===9;document.body.toggleAttribute('data-october',active);document.querySelectorAll('.brand-crop img').forEach(img=>{const desired='/brand-reference.png';if(img.getAttribute('src')!==desired)img.setAttribute('src',desired);img.parentElement.classList.remove('brand-october');});};
 const check=(force=false)=>{
  syncBanner();syncGhost();
  let saved;try{saved=JSON.parse(localStorage.getItem(KEY));}catch{}
  if(new Date().getMonth()===9&&!spiderSafe())return;
  const next=seasonalDecision(saved,Date.now());
  document.body.toggleAttribute('data-october',next.active);
  if(!next.active){remove();try{localStorage.removeItem(KEY);}catch{}return;}
  if(spider&&!spiderSafe())remove();
  if(JSON.stringify(next.state)!==JSON.stringify(saved)){try{localStorage.setItem(KEY,JSON.stringify(next.state));}catch{return;}}
  if((!next.show&&force!==true)||!spiderSafe())return;
  remove();
  spider=document.createElement('div');spider.className='october-spider';spider.setAttribute('aria-hidden','true');
  const lane=()=>15+Math.random()*70, x=lane(),y=lane();
  const paths=[[-20,y,120,lane()],[120,y,-20,lane()],[x,-20,lane(),120],[x,120,lane(),-20],[-20,-20,120,120],[120,-20,-20,120],[-20,120,120,-20],[120,120,-20,-20]];
  const [sx,sy,ex,ey]=paths[Math.floor(Math.random()*paths.length)];
  const mx=(sx+ex)/2+(Math.random()*16-8),my=(sy+ey)/2+(Math.random()*16-8);
  const angle=(ax,ay,bx,by)=>Math.atan2((by-ay)*innerHeight,(bx-ax)*innerWidth)*180/Math.PI+90;
  const pose=(x,y,a)=>`translate(calc(${x}vw - 55px),calc(${y}vh - 55px)) rotate(${a}deg)`;
  const firstAngle=angle(sx,sy,mx,my),lastAngle=angle(mx,my,ex,ey);
  spider.style.setProperty('--spider-route','randomized');

  spider.innerHTML="<span class=\"wolf-leg\" style=\"clip-path:polygon(0% 0%,48% 0%,47% 40%,40% 45%,0% 28%);--leg-direction:1;--leg-phase:0s\"><img src=\"/october-wolf-spider.png\" alt=\"\" draggable=\"false\"></span><span class=\"wolf-leg\" style=\"clip-path:polygon(0% 20%,40% 40%,44% 49%,0% 48%);--leg-direction:1;--leg-phase:-0.24s\"><img src=\"/october-wolf-spider.png\" alt=\"\" draggable=\"false\"></span><span class=\"wolf-leg\" style=\"clip-path:polygon(0% 48%,43% 46%,44% 53%,0% 78%);--leg-direction:1;--leg-phase:0s\"><img src=\"/october-wolf-spider.png\" alt=\"\" draggable=\"false\"></span><span class=\"wolf-leg\" style=\"clip-path:polygon(0% 78%,43% 51%,48% 54%,48% 100%,0% 100%);--leg-direction:1;--leg-phase:-0.24s\"><img src=\"/october-wolf-spider.png\" alt=\"\" draggable=\"false\"></span><span class=\"wolf-leg\" style=\"clip-path:polygon(52% 0%,100% 0%,100% 28%,60% 45%,53% 40%);--leg-direction:-1;--leg-phase:0s\"><img src=\"/october-wolf-spider.png\" alt=\"\" draggable=\"false\"></span><span class=\"wolf-leg\" style=\"clip-path:polygon(100% 20%,100% 48%,56% 49%,60% 40%);--leg-direction:-1;--leg-phase:-0.24s\"><img src=\"/october-wolf-spider.png\" alt=\"\" draggable=\"false\"></span><span class=\"wolf-leg\" style=\"clip-path:polygon(100% 48%,100% 78%,56% 53%,57% 46%);--leg-direction:-1;--leg-phase:0s\"><img src=\"/october-wolf-spider.png\" alt=\"\" draggable=\"false\"></span><span class=\"wolf-leg\" style=\"clip-path:polygon(100% 78%,100% 100%,52% 100%,52% 54%,57% 51%);--leg-direction:-1;--leg-phase:-0.24s\"><img src=\"/october-wolf-spider.png\" alt=\"\" draggable=\"false\"></span><span class=\"wolf-body\"><img src=\"/october-wolf-spider.png\" alt=\"\" draggable=\"false\"></span>";
  if(spider.showPopover)spider.setAttribute('popover','manual');
  document.body.append(spider);
  if(spider.showPopover){spider.showPopover();spiderModal=document.querySelector('dialog[open]');}
  spider.animate([{transform:pose(sx,sy,firstAngle)},{offset:.5,transform:pose(mx,my,lastAngle)},{transform:pose(ex,ey,lastAngle)}],{duration:11000,easing:'linear',fill:'both'});
  expiry=setTimeout(remove,11000);return true;
 };
 let ghost=null,ghostAnimation=null,ghostStarted=0,ghostExpiry=null,ghostFrames=null;
 const removeGhost=()=>{clearTimeout(ghostExpiry);ghostAnimation?.cancel();ghost?.remove();ghost=null;ghostAnimation=null;};
 const syncGhost=()=>{
  if(!ghost)return;
  const elapsed=performance.now()-ghostStarted;
  if(elapsed>=7000||new Date().getMonth()!==9){removeGhost();return;}
  ghost.hidden=!safe();
  const banner=document.querySelector('.brand-crop');
  if(!banner)return;
  if(ghost.parentElement!==banner){
   ghostAnimation?.cancel();banner.append(ghost);
   ghostAnimation=ghost.animate(ghostFrames,{duration:7000,easing:'ease-in-out',fill:'both'});
   ghostAnimation.currentTime=elapsed;
  }
 };
 const showGhost=()=>{
  if(new Date().getMonth()!==9||!safe()||ghost)return;
  const banner=document.querySelector('.brand-crop');if(!banner)return;
  ghost=document.createElement('span');ghost.className='october-ghost';ghost.setAttribute('aria-hidden','true');
  const lane=()=>15+Math.random()*70;
  const x=lane(),y=lane(),direction=Math.floor(Math.random()*8);
  const paths=[[-15,y,115,y],[115,y,-15,y],[x,-65,x,115],[x,115,x,-65],[-15,-65,115,115],[115,-65,-15,115],[-15,115,115,-65],[115,115,-15,-65]];
  const [sx,sy,ex,ey]=paths[direction],angle=Math.random()*24-12;
  ghostFrames=[{left:sx+'%',top:sy+'%',opacity:0,transform:`rotate(${angle}deg)`},{offset:.12,opacity:.8},{offset:.5,left:(sx+ex)/2+'%',top:(sy+ey)/2+'%',opacity:.85,transform:`rotate(${-angle}deg)`},{offset:.85,opacity:.8},{left:ex+'%',top:ey+'%',opacity:0,transform:`rotate(${angle}deg)`}];
  ghost.innerHTML='<svg viewBox="0 0 50 60" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="ghost-light"><stop stop-color="#fff"/><stop offset="1" stop-color="#c9dce2"/></radialGradient></defs><path d="M8 55V25C8 2 42 2 42 25v30l-8-7-9 8-9-8z" fill="url(#ghost-light)" fill-opacity=".9"/><ellipse cx="19" cy="27" rx="3" ry="5" fill="#17282d"/><ellipse cx="32" cy="27" rx="3" ry="5" fill="#17282d"/><ellipse cx="25" cy="40" rx="3" ry="4" fill="#17282d"/></svg>';
  ghostStarted=performance.now();syncGhost();ghostExpiry=setTimeout(removeGhost,7000);
 };
 const ghostInterval=setInterval(showGhost,120000),ghostFirst=setTimeout(showGhost,6000);
 const observer=new MutationObserver(()=>{syncBanner();syncGhost();syncSpiderLayer();if(spider&&!spiderSafe())remove();});observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open','aria-modal']});
 motion.addEventListener('change',check);document.addEventListener('visibilitychange',check);window.addEventListener('beforeprint',remove);window.addEventListener('storage',check);
 previewOctoberEffect=()=>{const key='pd-october-preview-session';try{if(sessionStorage.getItem(key))return false;const shown=check(true);if(shown)sessionStorage.setItem(key,'1');return shown===true;}catch{return false;}};const timer=setInterval(()=>check(),15000);check();return ()=>{clearInterval(timer);clearInterval(ghostInterval);clearTimeout(ghostFirst);removeGhost();observer.disconnect();remove();motion.removeEventListener('change',check);document.removeEventListener('visibilitychange',check);window.removeEventListener('beforeprint',remove);window.removeEventListener('storage',check);};
}












