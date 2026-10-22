// Keep grants in the existing server-protected storeLabel field. Derived fields
// are display conveniences only and never become an authorization source on load.
const prefix='@stores-v1:';
export function normalizeStoreGrants(values,stores){
 if(!Array.isArray(values))return [];
 const valid=[...new Set(values.filter(v=>typeof v==='string'&&Object.hasOwn(stores,v)))];
 return valid.filter(name=>!valid.some(parent=>parent!==name&&stores[parent].members?.includes(name)));
}
export function decodeStoreAssignment(raw,stores){
 if(typeof raw!=='string')return [];
 if(!raw.startsWith(prefix))return Object.hasOwn(stores,raw)?[raw]:[];
 try{return normalizeStoreGrants(JSON.parse(raw.slice(prefix.length)),stores);}catch{return [];}
}
export function encodeStoreAssignment(grants,stores){const names=normalizeStoreGrants(grants,stores);return names.length===1?names[0]:names.length?prefix+JSON.stringify(names):'';}
export function settingsWithStoreAccess(settings,stores){const raw=settings.storeLabel||'',grants=decodeStoreAssignment(raw,stores);return {...settings,storeAssignment:raw,storeAccess:grants,storeLabel:grants[0]||''};}
export function settingsStoreGrants(settings,stores){return decodeStoreAssignment(settings.storeAssignment??settings.storeLabel,stores);}
export function expandedStoreGrants(grants,stores){return [...new Set(normalizeStoreGrants(grants,stores).flatMap(name=>stores[name].members||[name]))];}
export function storeScopes(grants,stores){return [...new Set(normalizeStoreGrants(grants,stores).flatMap(name=>[name,...(stores[name].members||[])]))];}
export function defaultStoreScope(grants){return grants.length>1?'__assigned__':grants[0]||'';}
