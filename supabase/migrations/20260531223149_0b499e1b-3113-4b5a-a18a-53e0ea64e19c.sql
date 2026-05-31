
-- =============== ROLES ===============
create type public.app_role as enum ('admin','staff','customer');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "user can see own roles" on public.user_roles for select to authenticated
  using (auth.uid() = user_id);
create policy "admin can see all roles" on public.user_roles for select to authenticated
  using (public.has_role(auth.uid(),'admin'));
create policy "admin can manage roles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- =============== PROFILES ===============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;

alter table public.profiles enable row level security;

create policy "users read own profile" on public.profiles for select to authenticated
  using (auth.uid() = id);
create policy "admin reads all profiles" on public.profiles for select to authenticated
  using (public.has_role(auth.uid(),'admin'));
create policy "users update own profile" on public.profiles for update to authenticated
  using (auth.uid() = id);
create policy "users insert own profile" on public.profiles for insert to authenticated
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_first boolean;
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));

  -- First ever user becomes admin
  select count(*) = 0 into is_first from public.user_roles where role = 'admin';
  if is_first then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'customer');
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============== CATEGORIES ===============
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

grant select on public.categories to anon, authenticated;
grant all on public.categories to service_role, authenticated;

alter table public.categories enable row level security;
create policy "categories public read" on public.categories for select to anon, authenticated using (true);
create policy "admin manages categories" on public.categories for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- =============== PRODUCTS ===============
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text not null default '',
  category_id uuid references public.categories(id) on delete set null,
  price numeric(10,2) not null,
  original_price numeric(10,2) not null,
  color text,
  is_new boolean not null default false,
  is_bestseller boolean not null default false,
  is_published boolean not null default true,
  stock int not null default 0,
  sizes text[] not null default array['XS','S','M','L','XL','XXL']::text[],
  images text[] not null default array[]::text[],
  rating numeric(2,1) not null default 4.7,
  reviews int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.products (category_id);
create index on public.products (slug);

grant select on public.products to anon, authenticated;
grant all on public.products to authenticated, service_role;

alter table public.products enable row level security;
create policy "products public read" on public.products for select to anon, authenticated using (is_published);
create policy "admin reads all products" on public.products for select to authenticated
  using (public.has_role(auth.uid(),'admin'));
create policy "admin manages products" on public.products for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- =============== COUPONS ===============
create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  description text,
  discount_type text not null check (discount_type in ('percent','flat')),
  discount_value numeric(10,2) not null,
  min_order numeric(10,2) not null default 0,
  is_active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

grant select on public.coupons to anon, authenticated;
grant all on public.coupons to authenticated, service_role;

alter table public.coupons enable row level security;
create policy "coupons public read active" on public.coupons for select to anon, authenticated using (is_active);
create policy "admin manages coupons" on public.coupons for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- =============== ORDERS ===============
create type public.order_status as enum ('pending','paid','shipped','delivered','cancelled','refunded');
create type public.payment_status as enum ('unpaid','paid','failed','refunded');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null default ('IHS-' || to_char(now(),'YYMMDD') || '-' || lpad((floor(random()*999999))::text,6,'0')),
  user_id uuid references auth.users(id) on delete set null,
  customer_email text not null,
  customer_name text not null,
  customer_phone text,
  shipping_address jsonb not null,
  subtotal numeric(10,2) not null,
  gst numeric(10,2) not null default 0,
  shipping numeric(10,2) not null default 0,
  discount numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  coupon_code text,
  status public.order_status not null default 'pending',
  payment_status public.payment_status not null default 'unpaid',
  payment_method text,
  payment_reference text,
  tracking_number text,
  tracking_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.orders (user_id);
create index on public.orders (status);
create index on public.orders (created_at desc);

grant select, insert on public.orders to anon, authenticated;
grant all on public.orders to authenticated, service_role;

alter table public.orders enable row level security;
create policy "anon can place order" on public.orders for insert to anon, authenticated with check (true);
create policy "users see own orders" on public.orders for select to authenticated using (auth.uid() = user_id);
create policy "guests can lookup by number+email via fn" on public.orders for select to anon using (false);
create policy "admin sees all orders" on public.orders for select to authenticated
  using (public.has_role(auth.uid(),'admin'));
create policy "admin updates orders" on public.orders for update to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  product_slug text,
  image text,
  size text,
  color text,
  qty int not null,
  price numeric(10,2) not null,
  created_at timestamptz not null default now()
);

create index on public.order_items (order_id);

grant select, insert on public.order_items to anon, authenticated;
grant all on public.order_items to authenticated, service_role;

alter table public.order_items enable row level security;
create policy "anon insert items" on public.order_items for insert to anon, authenticated with check (true);
create policy "users see own order items" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "admin sees order items" on public.order_items for select to authenticated
  using (public.has_role(auth.uid(),'admin'));

-- =============== REVIEWS ===============
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  author_name text not null,
  rating int not null check (rating between 1 and 5),
  title text,
  body text,
  is_approved boolean not null default false,
  created_at timestamptz not null default now()
);

create index on public.reviews (product_id);

grant select on public.reviews to anon, authenticated;
grant insert on public.reviews to authenticated;
grant all on public.reviews to authenticated, service_role;

alter table public.reviews enable row level security;
create policy "reviews public read approved" on public.reviews for select to anon, authenticated using (is_approved);
create policy "users insert own review" on public.reviews for insert to authenticated with check (auth.uid() = user_id);
create policy "admin manages reviews" on public.reviews for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- =============== updated_at trigger ===============
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_products_updated before update on public.products for each row execute function public.set_updated_at();
create trigger trg_orders_updated before update on public.orders for each row execute function public.set_updated_at();
create trigger trg_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

-- =============== STORAGE BUCKET ===============
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "Public read product images" on storage.objects for select to anon, authenticated
  using (bucket_id = 'product-images');
create policy "Admins upload product images" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.has_role(auth.uid(),'admin'));
create policy "Admins update product images" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.has_role(auth.uid(),'admin'));
create policy "Admins delete product images" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.has_role(auth.uid(),'admin'));
