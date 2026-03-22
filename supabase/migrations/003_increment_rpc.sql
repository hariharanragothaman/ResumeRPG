-- Helper RPC for atomic access_count increment
create or replace function public.increment_access_count(uname text)
returns void
language sql
as $$
  update public.github_cards
  set access_count = access_count + 1
  where username = uname;
$$;
