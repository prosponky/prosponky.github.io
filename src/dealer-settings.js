import {authClient} from './auth.js';
import {validateDefaults,emptyDefaults} from './calc.js';
import {inventoryStores} from './inventory.js';
import {settingsWithStoreAccess} from './store-access.js';
export async function loadDealerSettings(userId){
 const {data,error}=await authClient.from('dealer_settings').select('settings').eq('user_id',userId).maybeSingle();
 if(error)throw Error('Your dealer setup could not be loaded. Check your connection and try again.');
 if(!data)return null;
 const settings=validateDefaults(data.settings);
 if(!/^\d{5}$/.test(settings.zip)||!settings.displayName?.trim())return null;
 return settingsWithStoreAccess(settings,inventoryStores);
}
export async function saveDealerSettings(userId,settings){
 const {data:profile,error:profileError}=await authClient.from('dealer_settings').select('settings').eq('user_id',userId).maybeSingle();if(profileError)throw Error('Your dealer setup could not be loaded. Try again.');const existing=profile?.settings;if(existing?.monthlyGoals)settings={...settings,monthlyGoals:existing.monthlyGoals};if(existing&&'storeLabel' in existing)settings={...settings,storeLabel:existing.storeLabel};
 settings={...settings};delete settings.storeAccess;delete settings.storeAssignment;
 validateDefaults(settings);
 if(!/^\d{5}$/.test(settings.zip)||!settings.displayName?.trim())throw Error('Your name and a five-digit dealer ZIP are required.');
 const {error}=await authClient.from('dealer_settings').upsert({user_id:userId,settings,updated_at:new Date().toISOString()},{onConflict:'user_id'});
 if(error)throw Error('Your dealer setup could not be saved. Check your connection and try again.');
}

export async function resetDealerSettings(userId){
 const {error}=await authClient.from('dealer_settings').upsert({user_id:userId,settings:{...emptyDefaults(),zip:'00000',displayName:'',storeLabel:profile?.settings?.storeLabel||''},updated_at:new Date().toISOString()},{onConflict:'user_id'});
 if(error)throw Error('Reset could not be completed. Check your connection and try again.');
}

export async function loadMonthlyGoal(userId,period){const settings=await loadDealerSettings(userId);const value=settings?.monthlyGoals?.[period];return typeof value==='number'&&Number.isFinite(value)&&value>=0?value:null;}
export async function saveMonthlyGoal(userId,period,units){const settings=await loadDealerSettings(userId);if(!settings)throw Error('Complete dealer setup before saving your goal.');const {error}=await authClient.from('dealer_settings').upsert({user_id:userId,settings:{...settings,storeLabel:settings.storeAssignment??settings.storeLabel,storeAssignment:undefined,storeAccess:undefined,monthlyGoals:{...settings.monthlyGoals,[period]:units}},updated_at:new Date().toISOString()},{onConflict:'user_id'});if(error)throw Error('Your goal could not sync. Check your connection and try again.');}
