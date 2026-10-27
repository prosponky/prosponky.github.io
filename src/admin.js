import {emptyDefaults} from './calc.js';
import {authClient,authState} from './auth.js';
import {inventoryStores} from './inventory.js';
import {decodeStoreAssignment,encodeStoreAssignment} from './store-access.js';
export const adminState={allowed:false,target:null};
export const effectiveOwner=()=>adminState.allowed&&adminState.target?adminState.target.user_id:authState.user?.id||'local';
export async function refreshAdmin(){adminState.allowed=false;adminState.target=null;if(!authClient||!authState.user)return;const id=authState.user.id;const {data,error}=await authClient.rpc('is_app_admin');if(authState.user?.id===id)adminState.allowed=!error&&data===true;}
export async function searchAdminUsers(search){const {data,error}=await authClient.rpc('admin_search_users',{search_text:/^\d{6}$/.test(search.trim())?'':search});if(error)throw Error('User search could not be completed.');let users=data||[];if(!users.length)return users;const {data:references,error:referenceError}=await authClient.rpc('admin_user_references',{target_users:users.map(u=>u.user_id)});if(referenceError)throw Error('User reference IDs could not be loaded.');users=users.map(u=>({...u,reference_id:references?.find(r=>r.user_id===u.user_id)?.reference_id}));if(/^\d{6}$/.test(search.trim()))users=users.filter(u=>String(u.reference_id)===search.trim());if(!users.length)return users;const {data:profiles,error:profileError}=await authClient.from('dealer_settings').select('user_id,settings').in('user_id',users.map(u=>u.user_id));if(profileError)throw Error('User stores could not be loaded.');return users.map(u=>{const assignment=profiles?.find(p=>p.user_id===u.user_id)?.settings?.storeLabel||'',grants=decodeStoreAssignment(assignment,inventoryStores);return {...u,store_label:grants[0]||'',store_grants:grants};});}
export async function saveAdminStore(userId,label){if(!adminState.allowed)throw Error('Administrator access required.');const store=String(label||'').trim();if(store.length>40)throw Error('Use a store abbreviation of 40 characters or fewer.');const {data,error}=await authClient.from('dealer_settings').select('settings').eq('user_id',userId).maybeSingle();if(error)throw Error('Store could not be loaded.');const {error:saveError}=await authClient.from('dealer_settings').upsert({user_id:userId,settings:{...(data?.settings||emptyDefaults()),storeLabel:store},updated_at:new Date().toISOString()},{onConflict:'user_id'});if(saveError)throw Error('Store could not be saved. Try again.');return store;}
export async function openAdminUser(user){const {error}=await authClient.rpc('admin_open_user',{target_user:user.user_id});if(error)throw Error('This account could not be opened.');adminState.target=user;}
export async function saveAdminStoreAccess(userId,grants){
 if(!adminState.allowed||adminState.target)throw Error('Administrator access required.');
 const assignment=encodeStoreAssignment(grants,inventoryStores);
 const {data,error}=await authClient.from('dealer_settings').select('settings').eq('user_id',userId).maybeSingle();if(error)throw Error('Store access could not be loaded.');
 const settings={...(data?.settings||emptyDefaults()),storeLabel:assignment};delete settings.storeAccess;delete settings.storeAssignment;
 const {error:saveError}=await authClient.from('dealer_settings').upsert({user_id:userId,settings,updated_at:new Date().toISOString()},{onConflict:'user_id'});
 if(saveError)throw Error('Store access could not be saved. Try again.');
 return decodeStoreAssignment(assignment,inventoryStores);
}
