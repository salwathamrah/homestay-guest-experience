-- Public landing page content: property settings (singleton), stay plans,
-- and house rules. All three are public catalog data (no auth) read by the
-- homepage at "/" — same RLS pattern as local_contacts.

create table settings (
  id uuid primary key default gen_random_uuid(),
  property_name text not null,
  whatsapp_number text not null,
  support_email text not null,
  updated_at timestamptz not null default now()
);

-- Stay plans (CP/EP/MAP/AP). No price column: tariffs change often and are
-- quoted at booking time, not shown on the public site.
create table plans (
  id uuid primary key default gen_random_uuid(),
  code stay_plan not null unique,
  name text not null,
  description text not null,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table house_rules (
  id uuid primary key default gen_random_uuid(),
  rule text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table settings enable row level security;
alter table plans enable row level security;
alter table house_rules enable row level security;

create policy "Anyone can read settings" on settings for select using (true);
create policy "Admins manage settings" on settings for all using (is_admin()) with check (is_admin());

create policy "Anyone can read active plans" on plans for select using (is_active or is_admin());
create policy "Admins manage plans" on plans for all using (is_admin()) with check (is_admin());

create policy "Anyone can read house rules" on house_rules for select using (true);
create policy "Admins manage house_rules" on house_rules for all using (is_admin()) with check (is_admin());

insert into settings (property_name, whatsapp_number, support_email) values
  ('Highway Heaven', '8082091213', 'jkhighwayheaven@gmail.com');

insert into plans (code, name, description, sort_order) values
  ('CP', 'Continental Plan', 'Room stay with breakfast included.', 1),
  ('EP', 'European Plan', 'Room stay only, meals not included.', 2),
  ('MAP', 'Modified American Plan', 'Room stay with breakfast and one main meal.', 3),
  ('AP', 'American Plan', 'Room stay with breakfast, lunch and dinner included.', 4);
