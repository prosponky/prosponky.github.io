export class InventoryChangedError extends Error {}
export async function collectWithFreshRetry(collect,onRetry=()=>{}){
 try{return await collect();}catch(error){
  if(!(error instanceof InventoryChangedError))throw error;
  await onRetry(error);
  return collect();
 }
}
