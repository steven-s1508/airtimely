create table public.shows (
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
  constraint shows_pkey primary key (id),
  constraint shows_park_id_fkey foreign KEY (park_id) references parks (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists shows_entity_type_idx on public.shows using btree (entity_type) TABLESPACE pg_default;

create index IF not exists shows_external_id_idx on public.shows using btree (external_id) TABLESPACE pg_default;

create index IF not exists shows_is_active_idx on public.shows using btree (is_active) TABLESPACE pg_default;

create index IF not exists shows_park_id_idx on public.shows using btree (park_id) TABLESPACE pg_default;