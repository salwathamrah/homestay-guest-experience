-- Lets a session be manually disabled/enabled by the owner without
-- deleting it (e.g. to revoke access early, or temporarily reinstate it).
alter table guest_sessions add column is_active boolean not null default true;

create index guest_sessions_active_idx on guest_sessions(is_active);
