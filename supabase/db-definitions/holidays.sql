create table public.holidays (
  id uuid not null default gen_random_uuid (),
  date date not null,
  name text not null,
  country_code text null,
  type text null,
  is_major boolean null default false,
  constraint holidays_pkey primary key (id),
  constraint holidays_date_country_code_type_key unique (date, country_code, type)
) TABLESPACE pg_default;