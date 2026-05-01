-- DANGER: Irreversible wipe requested by operator.
-- Purpose: delete all application users and their user-owned records.

begin;

do $$
declare
  t text;
  user_tables text[] := array[
    'public.wallet_history',
    'public.redeem_claims',
    'public.recharge_request_payments',
    'public.recharge_requests',
    'public.withdraw_requests',
    'public.orders',
    'public.admin_audit_log',
    'public.profiles'
  ];
begin
  -- First clear user-linked tables in dependency-friendly order when present.
  foreach t in array user_tables loop
    if to_regclass(t) is not null then
      execute format('truncate table %s restart identity cascade', t);
    end if;
  end loop;

  -- Finally remove auth users (keeps system roles untouched).
  delete from auth.users;
end $$;

commit;

-- Optional verification:
-- select count(*) as auth_users_left from auth.users;
-- select count(*) as profiles_left from public.profiles;
