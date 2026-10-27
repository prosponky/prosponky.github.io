import {createClient} from 'npm:@supabase/supabase-js@2';
import {createAdminHandler} from './handler.mjs';
Deno.serve(createAdminHandler({createClient,url:Deno.env.get('SUPABASE_URL')!,publicKey:Deno.env.get('SUPABASE_ANON_KEY')!,serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!}));
