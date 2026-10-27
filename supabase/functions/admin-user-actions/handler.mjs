export function createAdminHandler({createClient,url,publicKey,serviceKey}){
 const allowed=new Set(['https://pocket-desking.pages.dev','https://prosponky.github.io']);
 return async req=>{
  const origin=req.headers.get('origin');
  const headers={'Content-Type':'application/json','Vary':'Origin','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS',...(allowed.has(origin)?{'Access-Control-Allow-Origin':origin}:{})};
  const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers});
  if(origin&&!allowed.has(origin))return reply(403,{error:'Origin not allowed.'});
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return reply(405,{error:'Method not allowed.'});
  try{
   const authorization=req.headers.get('authorization');
   if(!authorization?.startsWith('Bearer '))return reply(401,{error:'Sign in again.'});
   const caller=createClient(url,publicKey,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
   const {data:identity,error:identityError}=await caller.auth.getUser();
   if(identityError||!identity?.user)return reply(401,{error:'Sign in again.'});
   const {data:admin,error:adminError}=await caller.rpc('is_app_admin');
   if(adminError||admin!==true)return reply(403,{error:'Administrator access required.'});
   const body=await req.json();
   if(body.action==='capabilities')return reply(200,{ready:true});
   if(!['reset-password','edit-email','delete-user','confirm-email'].includes(body.action)||!/^[0-9a-f-]{36}$/i.test(body.userId||''))return reply(400,{error:'Invalid account action.'});
   if(body.userId===identity.user.id)return reply(403,{error:'Manage your own account through account settings.'});
   const privileged=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
   const {data:protectedAdmin,error:protectedError}=await privileged.from('app_admins').select('user_id').eq('user_id',body.userId).maybeSingle();
   if(protectedError)return reply(503,{error:'Account protection check failed.'});
   if(protectedAdmin)return reply(403,{error:'Administrator accounts cannot be changed here.'});
   const {data:target,error:targetError}=await privileged.auth.admin.getUserById(body.userId);
   if(targetError||!target?.user?.email)return reply(404,{error:'User not found.'});
   const email=target.user.email;
   if(body.action==='confirm-email'&&body.confirmEmail!==email)return reply(400,{error:'The account email changed. Reopen user settings before confirming.'});
   if(body.action==='confirm-email'&&target.user.email_confirmed_at)return reply(200,{ok:true,emailConfirmed:true});
   if(body.action==='delete-user'&&body.confirmEmail!==email)return reply(400,{error:'Enter the current email to confirm deletion.'});
   if(body.action==='edit-email'&&(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email||'')||body.email.length>254))return reply(400,{error:'Enter a valid email address.'});
   const {error:logError}=await privileged.from('admin_access_log').insert({actor:identity.user.id,target:body.userId,event:body.action+' requested'});
   if(logError)return reply(503,{error:'Account audit could not be recorded. No action taken.'});
   const result=body.action==='confirm-email'?await privileged.auth.admin.updateUserById(body.userId,{email_confirm:true}):body.action==='reset-password'?await caller.auth.resetPasswordForEmail(email,{redirectTo:'https://pocket-desking.pages.dev/?recovery=1'}):body.action==='edit-email'?await privileged.auth.admin.updateUserById(body.userId,{email:body.email.trim().toLowerCase()}):await privileged.auth.admin.deleteUser(body.userId);
   if(result.error)return reply(400,{error:body.action==='confirm-email'?'Email confirmation could not be completed.':body.action==='delete-user'?'User could not be deleted. Accounts owning stored files must have those files removed first.':body.action==='edit-email'?'Email could not be changed. It may already belong to another account.':'Password reset email could not be sent. Try again later.'});
   await privileged.from('admin_access_log').insert({actor:identity.user.id,target:body.userId,event:body.action+' completed'});
   return reply(200,{ok:true,...(body.action==='confirm-email'?{emailConfirmed:true}:{}),...(body.action==='edit-email'?{email:result.data?.user?.email||body.email.trim().toLowerCase()}:{})});
  }catch{return reply(500,{error:'Account action could not be completed.'});}
 };
}
