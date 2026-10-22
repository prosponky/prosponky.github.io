import {relativeActivity} from './last-active.js';
import {openStoreHub} from './admin-store-hub.js';
import {authClient} from './auth.js';

import {adminState} from './admin.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function action(body){if(!adminState.allowed||adminState.target)throw Error('Administrator access required.');const {data,error}=await authClient.functions.invoke('admin-user-actions',{body});if(error||data?.error)throw Error(data?.error||'Account tools are not connected yet.');return data;}

export function openUserSettings(user,onChanged){

 const dialog=document.createElement('dialog');dialog.className='payoff-reminder admin-user-actions';dialog.setAttribute('aria-label','User settings');

 dialog.innerHTML=`<h2>User settings</h2><p><strong>${esc(user.display_name||'User')}</strong><br><span data-email>${esc(user.email)}</span></p><p class="admin-last-login">Last active<br><span data-last-login>Loading…</span></p><div data-actions><button type="button" class="quiet full" data-action="reset-password" disabled>Send password reset</button><button type="button" class="quiet full" data-action="edit-email" disabled>Edit email</button><button type="button" class="quiet full danger" data-action="delete-user" disabled>Delete user</button></div><form data-edit hidden><label>Email<input type="email" required maxlength="254" data-new-email></label><button class="primary">Save email</button></form><form data-delete hidden><p>Deleting this user permanently removes their account and linked settings and sales. This cannot be undone.</p><label>Type their email to confirm<input type="email" required data-confirm-email autocomplete="off"></label><button class="primary danger">Delete user permanently</button></form><p role="status"></p><button type="button" class="quiet full" data-close>Close</button>`;

 document.body.append(dialog);dialog.showModal();dialog.onclose=()=>dialog.remove();dialog.querySelector('[data-close]').onclick=()=>dialog.close();
 const assign=document.createElement('button');assign.type='button';assign.className='primary';assign.textContent='Assign store';dialog.querySelector('[data-actions]').before(assign);assign.onclick=()=>openStoreHub(user,()=>{dialog.close();onChanged?.();});

 const status=dialog.querySelector('[role="status"]');let busy=false;

 const login=dialog.querySelector('[data-last-login]');

 const loadActivity=async()=>{
  if(!adminState.allowed||adminState.target){login.textContent='Unavailable';return;}
  try{
   const {data,error}=await authClient.rpc('admin_user_last_active',{target_user:user.user_id});
   if(dialog.isConnected)login.textContent=error?'Unavailable':relativeActivity(data);
  }catch{if(dialog.isConnected)login.textContent='Unavailable';}
 };
 loadActivity();
 const activityRefresh=setInterval(()=>{if(!dialog.isConnected){clearInterval(activityRefresh);return;}loadActivity();},30000);
 dialog.addEventListener('close',()=>clearInterval(activityRefresh),{once:true});

 const run=async body=>{if(busy)return;busy=true;dialog.querySelectorAll('button').forEach(b=>b.disabled=true);status.textContent='Saving…';try{const result=await action({userId:user.user_id,...body});if(body.action==='delete-user'){dialog.close();onChanged?.();return;}if(result.email){user.email=result.email;dialog.querySelector('[data-email]').textContent=user.email;onChanged?.();}status.textContent=body.action==='reset-password'?'Password reset email sent.':'Email updated.';dialog.querySelector('[data-edit]').hidden=true;dialog.querySelector('[data-delete]').hidden=true;}catch(e){status.textContent=e.message;}finally{busy=false;dialog.querySelectorAll('button').forEach(b=>b.disabled=false);}};

 dialog.querySelector('[data-action="reset-password"]').onclick=()=>run({action:'reset-password'});

 dialog.querySelector('[data-action="edit-email"]').onclick=()=>{dialog.querySelector('[data-delete]').hidden=true;dialog.querySelector('[data-edit]').hidden=false;const input=dialog.querySelector('[data-new-email]');input.value=user.email;input.focus();};

 dialog.querySelector('[data-action="delete-user"]').onclick=()=>{dialog.querySelector('[data-edit]').hidden=true;dialog.querySelector('[data-delete]').hidden=false;dialog.querySelector('[data-confirm-email]').focus();};

 dialog.querySelector('[data-edit]').onsubmit=e=>{e.preventDefault();run({action:'edit-email',email:dialog.querySelector('[data-new-email]').value.trim()});};

 dialog.querySelector('[data-delete]').onsubmit=e=>{e.preventDefault();const input=dialog.querySelector('[data-confirm-email]');if(input.value!==user.email){status.textContent='Type the exact email shown above.';return;}run({action:'delete-user',confirmEmail:input.value});};

 action({action:'capabilities'}).then(()=>{if(!dialog.isConnected)return;status.textContent='';dialog.querySelectorAll('[data-action]').forEach(b=>b.disabled=false);}).catch(()=>{if(dialog.isConnected)status.textContent='Account tools are awaiting secure backend setup.';});

}

