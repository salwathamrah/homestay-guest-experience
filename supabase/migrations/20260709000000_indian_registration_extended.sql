-- 2026-07-09 — extend guests and additional_guests for the 8-screen
-- Indian registration flow: per-guest contact/stay details, room plan,
-- payment mode, additional services, and Aadhaar back scan.

alter table guests add column if not exists id_doc_back_url text;
alter table guests add column if not exists address text;
alter table guests add column if not exists country text default 'India';
alter table guests add column if not exists city text;
alter table guests add column if not exists purpose_of_visit text;
alter table guests add column if not exists checkin_date date;
alter table guests add column if not exists checkin_time time;
alter table guests add column if not exists checkout_date date;
alter table guests add column if not exists room_type text;
alter table guests add column if not exists payment_mode text;
alter table guests add column if not exists additional_services jsonb not null default '[]'::jsonb;

-- Optional contact so the stay-token link can be forwarded to each
-- additional guest who opts in.
alter table additional_guests add column if not exists phone text;
alter table additional_guests add column if not exists email text;
