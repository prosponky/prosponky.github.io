begin;
create or replace function public.ticket_user_stores(subject uuid) returns text[] language plpgsql stable security definer set search_path='' as $$
declare raw text; grants text[]; result text[];
begin
 if subject='b39d1141-e6c7-4ad9-a27f-c6b841452be1'::uuid and exists(select 1 from public.app_admins where user_id=subject) then return array['GW Kia Ave','Coggin Nissan Atl','Coggin Nissan Ave','AutoNation USA Jax','Hutchinson Kia','Hutchinson GMC','Hutchinson Cadillac']; end if;
 select settings->>'storeLabel' into raw from public.dealer_settings where user_id=subject;
 if raw like '@stores-v1:%' then begin select array_agg(value) into grants from jsonb_array_elements_text(substring(raw from 12)::jsonb); exception when others then return '{}'; end;
 else grants:=array[raw]; end if;
 select coalesce(array_agg(distinct store),'{}') into result from (select unnest(case g
 when 'Greenway group' then array['GW Kia Ave'] when 'Coggin group' then array['Coggin Nissan Atl','Coggin Nissan Ave']
 when 'AutoNation group' then array['AutoNation USA Jax'] when 'Hutchinson' then array['Hutchinson Kia','Hutchinson GMC','Hutchinson Cadillac'] else array[g] end) store from unnest(grants) g) expanded
 where store=any(array['GW Kia Ave','Coggin Nissan Atl','Coggin Nissan Ave','AutoNation USA Jax','Hutchinson Kia','Hutchinson GMC','Hutchinson Cadillac']);
 return result;
end $$;
revoke all on function public.ticket_user_stores(uuid) from public,anon,authenticated;
create table if not exists public.support_tickets(id uuid primary key default gen_random_uuid(),requester uuid not null references auth.users(id),requester_name text not null,requester_reference integer,store text not null,category text not null check(category in ('Pricing update','Carfax not working','Inventory issue','Other')),notes text not null check(length(notes) between 1 and 4000),created_at timestamptz not null default now());
create table if not exists public.support_ticket_recipients(ticket_id uuid references public.support_tickets(id),admin_id uuid references auth.users(id),primary key(ticket_id,admin_id));
create table if not exists public.support_ticket_email_outbox(ticket_id uuid references public.support_tickets(id),admin_id uuid references auth.users(id),status text not null default 'pending' check(status in ('pending','sent','failed')),attempts integer not null default 0,sent_at timestamptz,primary key(ticket_id,admin_id));
alter table public.support_tickets enable row level security;
alter table public.support_ticket_recipients enable row level security;
alter table public.support_ticket_email_outbox enable row level security;
revoke all on public.support_tickets,public.support_ticket_recipients,public.support_ticket_email_outbox from anon,authenticated;
create or replace function public.submit_support_ticket(ticket_store text,ticket_category text,ticket_notes text,request_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); recipients uuid[]; existing uuid;
begin
 if uid is null then raise exception 'Sign in first' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtext('support-ticket:'||uid::text));
 select id into existing from public.support_tickets where id=request_id and requester=uid;
 if existing is not null then return existing; end if;
 if not(ticket_store=any(public.ticket_user_stores(uid))) then raise exception 'Choose an assigned store' using errcode='42501'; end if;
 if ticket_category is null or ticket_category<>all(array['Pricing update','Carfax not working','Inventory issue','Other']) or length(trim(coalesce(ticket_notes,''))) not between 1 and 4000 then raise exception 'Choose an issue and enter notes'; end if;
 if exists(select 1 from public.support_tickets where requester=uid and created_at>now()-interval '30 seconds') then raise exception 'Please wait before submitting another ticket'; end if;
 select array_agg(a.user_id) into recipients from public.app_admins a where ticket_store=any(public.ticket_user_stores(a.user_id));
 if coalesce(cardinality(recipients),0)=0 then raise exception 'No administrator is assigned to this store yet'; end if;
 insert into public.support_tickets(id,requester,requester_name,requester_reference,store,category,notes)
 select request_id,uid,coalesce(nullif(d.settings->>'displayName',''),'User'),r.reference_id,ticket_store,ticket_category,trim(ticket_notes) from auth.users u left join public.dealer_settings d on d.user_id=u.id left join public.user_reference_ids r on r.user_id=u.id where u.id=uid;
 insert into public.support_ticket_recipients select request_id,unnest(recipients);
 insert into public.support_ticket_email_outbox select request_id,unnest(recipients);
 return request_id;
end $$;
create or replace function public.my_support_tickets() returns setof public.support_tickets language sql stable security definer set search_path='' as $$
 select t.* from public.support_tickets t where t.requester=auth.uid() or (public.is_app_admin() and t.store=any(public.ticket_user_stores(auth.uid())) and exists(select 1 from public.support_ticket_recipients r where r.ticket_id=t.id and r.admin_id=auth.uid())) order by t.created_at desc limit 100
$$;
revoke all on function public.submit_support_ticket(text,text,text,uuid),public.my_support_tickets() from public,anon;
grant execute on function public.submit_support_ticket(text,text,text,uuid),public.my_support_tickets() to authenticated;
commit;
