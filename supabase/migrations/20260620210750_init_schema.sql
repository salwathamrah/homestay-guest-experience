-- Highway Heaven: initial schema
-- Guests register via QR scan (no passwords; access is via opaque session tokens).
-- Owner/staff manage the property via Supabase Auth (admin_users).

create extension if not exists "pgcrypto";

create type nationality_type as enum ('indian', 'foreign');
create type id_doc_type as enum ('aadhaar', 'passport');
create type stay_plan as enum ('CP', 'EP', 'MAP', 'AP');
create type payment_status as enum ('pending', 'paid', 'failed', 'refunded');
create type order_status as enum ('pending', 'preparing', 'delivered', 'cancelled');
create type request_status as enum ('pending', 'in_progress', 'resolved');

-- Rooms / units, each with its own QR token that starts the guest registration flow.
create table rooms (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  qr_token text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Guests, registered after scanning a room's QR code.
create table guests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  nationality nationality_type not null,
  id_doc_type id_doc_type not null,
  id_doc_number text not null,
  id_doc_url text,
  photo_url text,
  created_at timestamptz not null default now()
);

-- A stay booking: plan, dates, and payment status.
create table bookings (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references guests(id) on delete cascade,
  room_id uuid not null references rooms(id),
  plan stay_plan not null,
  check_in date not null,
  check_out date not null,
  num_guests int not null default 1,
  total_amount numeric(10, 2) not null,
  payment_status payment_status not null default 'pending',
  created_at timestamptz not null default now(),
  constraint bookings_dates_valid check (check_out > check_in)
);

create index bookings_guest_id_idx on bookings(guest_id);
create index bookings_room_id_idx on bookings(room_id);

-- Razorpay payment attempts/records tied to a booking.
create table payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  razorpay_order_id text,
  razorpay_payment_id text,
  razorpay_signature text,
  amount numeric(10, 2) not null,
  currency text not null default 'INR',
  status payment_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index payments_booking_id_idx on payments(booking_id);

-- Token-based guest sessions. Only the hash is stored; the raw token is
-- issued once to the guest's browser and never persisted server-side.
create table guest_sessions (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references guests(id) on delete cascade,
  booking_id uuid not null references bookings(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index guest_sessions_token_hash_idx on guest_sessions(token_hash);

-- Food menu, manageable by the owner.
create table food_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10, 2) not null,
  category text,
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

create table food_orders (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  guest_id uuid not null references guests(id) on delete cascade,
  status order_status not null default 'pending',
  total_amount numeric(10, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create index food_orders_booking_id_idx on food_orders(booking_id);

create table food_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references food_orders(id) on delete cascade,
  food_item_id uuid not null references food_items(id),
  quantity int not null default 1,
  unit_price numeric(10, 2) not null
);

create index food_order_items_order_id_idx on food_order_items(order_id);

-- Local contacts shown to guests (taxi, doctor, grocery, emergency, etc).
create table local_contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  phone text,
  description text,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Ad-hoc guest service requests (housekeeping, extra bedding, maintenance...).
create table service_requests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  guest_id uuid not null references guests(id) on delete cascade,
  type text not null,
  description text,
  status request_status not null default 'pending',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index service_requests_booking_id_idx on service_requests(booking_id);

-- Owner/staff accounts, backed by Supabase Auth.
create table admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'owner',
  created_at timestamptz not null default now()
);

-- Security-definer helper so RLS policies can check admin membership
-- without recursively hitting RLS on admin_users itself.
create function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (select 1 from admin_users where id = auth.uid());
$$;

alter table rooms enable row level security;
alter table guests enable row level security;
alter table bookings enable row level security;
alter table payments enable row level security;
alter table guest_sessions enable row level security;
alter table food_items enable row level security;
alter table food_orders enable row level security;
alter table food_order_items enable row level security;
alter table local_contacts enable row level security;
alter table service_requests enable row level security;
alter table admin_users enable row level security;

-- Guest-facing flows (registration, payment, ordering, requests) run through
-- server actions using the service role key, which bypasses RLS. The
-- policies below only grant access to the admin dashboard (via Supabase
-- Auth) and to public read-only catalog data (menu, local contacts).

create policy "Admins manage rooms" on rooms for all using (is_admin()) with check (is_admin());
create policy "Admins manage guests" on guests for all using (is_admin()) with check (is_admin());
create policy "Admins manage bookings" on bookings for all using (is_admin()) with check (is_admin());
create policy "Admins manage payments" on payments for all using (is_admin()) with check (is_admin());
create policy "Admins manage guest_sessions" on guest_sessions for all using (is_admin()) with check (is_admin());
create policy "Admins manage food_orders" on food_orders for all using (is_admin()) with check (is_admin());
create policy "Admins manage food_order_items" on food_order_items for all using (is_admin()) with check (is_admin());
create policy "Admins manage service_requests" on service_requests for all using (is_admin()) with check (is_admin());

create policy "Admins view own admin_users row" on admin_users for select using (id = auth.uid());
create policy "Admins manage admin_users" on admin_users for all using (is_admin()) with check (is_admin());

create policy "Anyone can read available food items" on food_items for select using (is_available or is_admin());
create policy "Admins manage food_items" on food_items for all using (is_admin()) with check (is_admin());

create policy "Anyone can read local contacts" on local_contacts for select using (true);
create policy "Admins manage local_contacts" on local_contacts for all using (is_admin()) with check (is_admin());
