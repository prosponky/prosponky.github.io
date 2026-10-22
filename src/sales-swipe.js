// Web counterpart of trailing swipe actions: reveal, full swipe, and one open row.
export function bindSaleSwipes(root,onDelete,onEdit){
 const rows=[...root.querySelectorAll('.sales-swipe')];
 const closeOthers=except=>rows.forEach(row=>{if(row!==except){row.classList.remove('is-open','is-dragging');row.style.setProperty('--sale-offset','0px');row.querySelector('[data-sale-delete]').tabIndex=-1;row.querySelector('[data-sale]').setAttribute('aria-expanded','false');}});
 rows.forEach(row=>{
  const button=row.querySelector('[data-sale]'),action=row.querySelector('[data-sale-delete]');let gesture=null,suppressUntil=0;
  const settle=open=>{row.classList.remove('is-dragging');row.classList.toggle('is-open',open);row.style.setProperty('--sale-offset',open?'-88px':'0px');action.tabIndex=open?0:-1;button.setAttribute('aria-expanded',String(open));};
  const remove=async()=>{if(row.dataset.busy)return;row.dataset.busy='true';button.disabled=action.disabled=true;try{await onDelete(Number(button.dataset.sale));}catch(error){delete row.dataset.busy;button.disabled=action.disabled=false;settle(false);throw error;}};
  action.onclick=()=>remove().catch(()=>{});
  button.onclick=e=>{if(Date.now()<suppressUntil){e.preventDefault();return;}if(row.classList.contains('is-open')){settle(false);return;}onEdit(Number(button.dataset.sale));};
  button.onkeydown=e=>{if(e.key==='ArrowLeft'){e.preventDefault();closeOthers(row);settle(true);action.focus();}else if(e.key==='Escape'){settle(false);}};
  action.onkeydown=e=>{if(e.key==='Escape'){settle(false);button.focus();}};
  button.onpointerdown=e=>{if(!e.isPrimary||e.button!==0||row.dataset.busy)return;gesture={id:e.pointerId,x:e.clientX,y:e.clientY,base:row.classList.contains('is-open')?-88:0,offset:0,axis:null};};
  button.onpointermove=e=>{
   if(!gesture||gesture.id!==e.pointerId)return;const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
   if(!gesture.axis&&Math.max(Math.abs(dx),Math.abs(dy))>8){gesture.axis=Math.abs(dx)>Math.abs(dy)*1.2?'x':'y';if(gesture.axis==='x'){closeOthers(row);button.setPointerCapture(e.pointerId);row.classList.add('is-dragging');}}
   if(gesture.axis!=='x')return;e.preventDefault();gesture.offset=Math.min(0,Math.max(-row.clientWidth,gesture.base+dx));row.style.setProperty('--sale-offset',gesture.offset+'px');row.classList.toggle('full-swipe',-gesture.offset>=Math.max(160,row.clientWidth*.65));
  };
  const finish=(e,cancel=false)=>{if(!gesture||gesture.id!==e.pointerId)return;const g=gesture;gesture=null;row.classList.remove('full-swipe','is-dragging');if(button.hasPointerCapture(e.pointerId))button.releasePointerCapture(e.pointerId);if(g.axis!=='x')return;suppressUntil=Date.now()+400;if(!cancel&&-g.offset>=Math.max(160,row.clientWidth*.65)){remove().catch(()=>{});}else settle(cancel?g.base<0:-g.offset>44);};
  button.onpointerup=e=>finish(e);button.onpointercancel=e=>finish(e,true);
 });
 root.addEventListener('scroll',()=>closeOthers(),{passive:true});
}
