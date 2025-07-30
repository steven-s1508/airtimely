create table public.destinations (
  id uuid not null,
  name text not null,
  slug text not null,
  timezone text null,
  external_id text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  chain_id uuid null,
  website text null,
  country_code text null,
  geocode_data jsonb null,
  latitude double precision null,
  longitude double precision null,
  name_override text null,
  constraint destinations_pkey primary key (id),
  constraint destinations_slug_key unique (slug),
  constraint destinations_chain_id_fkey foreign KEY (chain_id) references chains (id) on delete set null
) TABLESPACE pg_default;

create index IF not exists idx_destinations_chain_id on public.destinations using btree (chain_id) TABLESPACE pg_default;

create index IF not exists idx_destinations_external_id on public.destinations using btree (external_id) TABLESPACE pg_default;

create index IF not exists idx_destinations_slug on public.destinations using btree (slug) TABLESPACE pg_default;

create trigger set_timestamp_destinations BEFORE
update on destinations for EACH row
execute FUNCTION trigger_set_timestamp ();