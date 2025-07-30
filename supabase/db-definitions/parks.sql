create table public.parks (
  id uuid not null,
  destination_id uuid null,
  name text not null,
  slug text null,
  entity_type text not null default 'PARK'::text,
  timezone text null,
  country_code text null,
  latitude double precision null,
  longitude double precision null,
  external_id text null,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  rcdb_url text null,
  is_destination boolean null,
  geocode_data jsonb null,
  name_override text null,
  constraint parks_pkey primary key (id),
  constraint parks_destination_id_fkey foreign KEY (destination_id) references destinations (id) on delete set null
) TABLESPACE pg_default;

create index IF not exists idx_parks_destination_id on public.parks using btree (destination_id) TABLESPACE pg_default;

create index IF not exists idx_parks_external_id on public.parks using btree (external_id) TABLESPACE pg_default;

create index IF not exists idx_parks_is_active on public.parks using btree (is_active) TABLESPACE pg_default;

create index IF not exists idx_parks_slug on public.parks using btree (slug) TABLESPACE pg_default;

create trigger set_timestamp_parks BEFORE
update on parks for EACH row
execute FUNCTION trigger_set_timestamp ();