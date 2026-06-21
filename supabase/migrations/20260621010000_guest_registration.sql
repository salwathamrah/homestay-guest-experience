-- Guest registration: consent flag, and private storage for ID docs/photos.

-- Guest must explicitly agree to the property's house rules before their
-- registration is accepted (shown on the registration form).
alter table guests add column agreed_to_house_rules boolean not null default false;

-- Private bucket for Aadhaar/passport scans and guest photos. Only the
-- service role (server-side registration flow, admin dashboard) ever reads
-- or writes objects here, so no storage.objects RLS policies are needed.
insert into storage.buckets (id, name, public)
values ('guest-docs', 'guest-docs', false)
on conflict (id) do nothing;
