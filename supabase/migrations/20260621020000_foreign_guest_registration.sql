-- Foreign guest registration: C-Form details, ID document storage, and
-- additional guests sharing the room (nationality-agnostic table, though
-- only the foreign flow writes to it today).

create type visa_type as enum ('tourist', 'business', 'medical', 'other');
create type guest_document_type as enum ('passport', 'visa');

-- One row per foreign guest who registers. Holds everything the police
-- C-Form needs beyond what's already on `guests` (name, phone, email,
-- id_doc_number holds the passport number, id_doc_type = 'passport').
create table foreign_guest_details (
  guest_id uuid primary key references guests(id) on delete cascade,
  room_id uuid not null references rooms(id),
  first_name text not null,
  last_name text not null,
  nationality text not null,
  country_of_origin text not null,
  home_address text not null,
  purpose_of_visit text not null,
  arrival_date date not null,
  arrival_time time not null,
  departure_date date not null,
  departure_time time not null,
  vehicle_number text,
  passport_expiry_date date not null,
  visa_type visa_type not null,
  visa_number text not null,
  visa_expiry_date date not null,
  port_of_entry text not null,
  date_of_arrival_in_india date not null,
  fro_registration_number text,
  created_at timestamptz not null default now(),
  constraint foreign_guest_details_dates_valid check (departure_date >= arrival_date)
);

-- Passport/visa scans for foreign guests, stored in the existing
-- guest-docs bucket. One current file per (guest, doc type).
create table guest_documents (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references guests(id) on delete cascade,
  doc_type guest_document_type not null,
  storage_path text not null,
  created_at timestamptz not null default now(),
  unique (guest_id, doc_type)
);

create index guest_documents_guest_id_idx on guest_documents(guest_id);

-- Other guests sharing the room, captured at registration. Generic by
-- design (not foreign-specific) so the Indian flow can adopt it later.
create table additional_guests (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references guests(id) on delete cascade,
  full_name text not null,
  age int not null,
  sex text not null,
  address text,
  passport_number text,
  created_at timestamptz not null default now()
);

create index additional_guests_guest_id_idx on additional_guests(guest_id);

alter table foreign_guest_details enable row level security;
alter table guest_documents enable row level security;
alter table additional_guests enable row level security;

-- Same pattern as the rest of the guest flow: service role (server-side
-- registration + admin dashboard) bypasses RLS; only admins get a direct
-- client-side policy.
create policy "Admins manage foreign_guest_details" on foreign_guest_details for all using (is_admin()) with check (is_admin());
create policy "Admins manage guest_documents" on guest_documents for all using (is_admin()) with check (is_admin());
create policy "Admins manage additional_guests" on additional_guests for all using (is_admin()) with check (is_admin());
