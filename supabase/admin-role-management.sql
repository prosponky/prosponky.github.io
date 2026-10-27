begin;
create or replace function public.owner_user_admin_role(target_user uuid) returns boolean language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is distinct from 'b39d1141-e6c7-4ad9-a27f-c6b841452be1'::uuid or not public.is_app_admin() then raise exception 'Owner access required' using errcode='42501'; end if;
 return exists(select 1 from public.app_admins where user_id=target_user);
end $$;
create or replace function public.owner_set_admin_role(target_user uuid,make_admin boolean,confirm_email text) returns boolean language plpgsql security definer set search_path='' as $$
declare actual_email text;
begin
 if auth.uid() is distinct from 'b39d1141-e6c7-4ad9-a27f-c6b841452be1'::uuid or not public.is_app_admin() then raise exception 'Owner access required' using errcode='42501'; end if;
 if target_user=auth.uid() then raise exception 'The owner role cannot be changed here'; end if;
 if make_admin is null then raise exception 'Choose an explicit role'; end if;
 select email into actual_email from auth.users where id=target_user;
 if actual_email is null or confirm_email is distinct from actual_email then raise exception 'Enter the current user email to confirm'; end if;
 if make_admin then insert into public.app_admins(user_id) values(target_user) on conflict do nothing;
 else delete from public.app_admins where user_id=target_user; end if;
 insert into public.admin_access_log(actor,target,event) values(auth.uid(),target_user,case when make_admin then 'administrator role granted' else 'administrator role removed' end);
 return make_admin;
end $$;
revoke all on function public.owner_user_admin_role(uuid) from public,anon;
revoke all on function public.owner_set_admin_role(uuid,boolean,text) from public,anon;
grant execute on function public.owner_user_admin_role(uuid) to authenticated;
grant execute on function public.owner_set_admin_role(uuid,boolean,text) to authenticated;
commit;
