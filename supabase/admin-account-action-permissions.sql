begin;
grant select on public.app_admins to service_role;
grant insert on public.admin_access_log to service_role;
grant usage on sequence public.admin_access_log_id_seq to service_role;
commit;
