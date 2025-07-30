create table public.restaurants (
  id uuid not null,
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
  constraint restaurants_pkey primary key (id)
) TABLESPACE pg_default;

create index IF not exists restaurants_entity_type_idx on public.restaurants using btree (entity_type) TABLESPACE pg_default;

create index IF not exists restaurants_external_id_idx on public.restaurants using btree (external_id) TABLESPACE pg_default;

create index IF not exists restaurants_is_active_idx on public.restaurants using btree (is_active) TABLESPACE pg_default;

create index IF not exists restaurants_park_id_idx on public.restaurants using btree (park_id) TABLESPACE pg_default;