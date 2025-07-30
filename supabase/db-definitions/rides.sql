create table public.rides (
  id uuid not null default gen_random_uuid (),
  park_id uuid not null,
  name text not null,
  slug text null,
  entity_type text not null,
  external_id text null,
  latitude double precision null,
  longitude double precision null,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint rides_pkey primary key (id),
  constraint rides_park_id_fkey foreign KEY (park_id) references parks (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_rides_entity_type on public.rides using btree (entity_type) TABLESPACE pg_default;

create index IF not exists idx_rides_external_id on public.rides using btree (external_id) TABLESPACE pg_default;

create index IF not exists idx_rides_is_active on public.rides using btree (is_active) TABLESPACE pg_default;

create index IF not exists idx_rides_park_id on public.rides using btree (park_id) TABLESPACE pg_default;

create trigger set_timestamp_rides BEFORE
update on rides for EACH row
execute FUNCTION trigger_set_timestamp ();