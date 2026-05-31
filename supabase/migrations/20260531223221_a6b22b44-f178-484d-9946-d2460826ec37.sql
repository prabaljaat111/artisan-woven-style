
-- Add search_path to set_updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

-- Revoke EXECUTE on SECURITY DEFINER fns; RLS still evaluates them via the policy owner.
revoke execute on function public.has_role(uuid, public.app_role) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Tighten orders / order_items insert policies
drop policy if exists "anon can place order" on public.orders;
create policy "place order self or guest" on public.orders for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

drop policy if exists "anon insert items" on public.order_items;
create policy "items insert for own or guest order" on public.order_items for insert to anon, authenticated
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.user_id is null or o.user_id = auth.uid())
        and o.created_at > now() - interval '10 minutes'
    )
  );

-- Drop dead "guests can lookup by number+email via fn" placeholder
drop policy if exists "guests can lookup by number+email via fn" on public.orders;
