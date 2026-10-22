import {authClient} from './auth.js';
import {adminState} from './admin.js';
import {relativeActivity} from './last-active.js';
let stop=()=>{};
export function bindAdminBannerActivity(){
 stop();const label=document.querySelector('[data-viewing-activity]'),user=adminState.target;
 if(!label||!user||!adminState.allowed)return;
 let cancelled=false;
 const refresh=async()=>{if(cancelled||!label.isConnected||adminState.target?.user_id!==user.user_id)return;try{const {data,error}=await authClient.rpc('admin_user_last_active',{target_user:user.user_id});if(!cancelled&&label.isConnected)label.textContent='Last active: '+(error?'Unavailable':relativeActivity(data));}catch{if(!cancelled&&label.isConnected)label.textContent='Last active: Unavailable';}};
 refresh();const timer=setInterval(()=>{if(!label.isConnected){stop();return;}refresh();},30000);stop=()=>{cancelled=true;clearInterval(timer);};
}
