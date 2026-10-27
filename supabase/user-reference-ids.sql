begin;
create table if not exists public.user_reference_ids (
 user_id uuid primary key references auth.users(id) on delete cascade,
 reference_id integer not null unique check(reference_id between 100000 and 999999)
);
alter table public.user_reference_ids enable row level security;
revoke all on public.user_reference_ids from public,anon,authenticated;
create or replace function public.assign_user_reference_id() returns trigger language plpgsql security definer set search_path='' as $$
declare candidate integer; tries integer:=0;
begin
 if exists(select 1 from public.user_reference_ids where user_id=new.id) then return new; end if;
 loop
  tries:=tries+1;
  if tries>100 then raise exception 'Cannot allocate unique user reference'; end if;
  candidate:=100000+floor(random()*900000)::integer;
  begin
   insert into public.user_reference_ids(user_id,reference_id) values(new.id,candidate);
   return new;
  exception when unique_violation then
   if exists(select 1 from public.user_reference_ids where user_id=new.id) then return new; end if;
  end;
 end loop;
end $$;
revoke all on function public.assign_user_reference_id() from public,anon,authenticated;
drop trigger if exists assign_user_reference_id on auth.users;
create trigger assign_user_reference_id after insert on auth.users for each row execute function public.assign_user_reference_id();
do $$declare account record; candidate integer; begin
 for account in select id from auth.users where id not in(select user_id from public.user_reference_ids) loop
  loop
   candidate:=100000+floor(random()*900000)::integer;
   begin insert into public.user_reference_ids values(account.id,candidate);exit;exception when unique_violation then null;end;
  end loop;
 end loop;
end $$;
create or replace function public.admin_user_references(target_users uuid[]) returns table(user_id uuid,reference_id integer) language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_app_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 return query select r.user_id,r.reference_id from public.user_reference_ids r where r.user_id=any(target_users);
end $$;
revoke all on function public.admin_user_references(uuid[]) from public,anon;
grant execute on function public.admin_user_references(uuid[]) to authenticated;
commit;
