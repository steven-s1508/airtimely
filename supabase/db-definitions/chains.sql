create table public.chains (
  id uuid not null default gen_random_uuid (),
  name text not null,
  slug text not null,
  website text null,
  logo_url text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint chains_pkey primary key (id),
  constraint chains_name_key unique (name),
  constraint chains_slug_key unique (slug)
) TABLESPACE pg_default;

create index IF not exists idx_chains_slug on public.chains using btree (slug) TABLESPACE pg_default;

create trigger set_timestamp_chains BEFORE
update on chains for EACH row
execute FUNCTION trigger_set_timestamp ();