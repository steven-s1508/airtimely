create table public.parks_schedule (
  id uuid not null default gen_random_uuid (),
  park_id uuid null,
  date date not null,
  type text not null,
  opening_time text null,
  closing_time text null,
  description text null,
  purchases jsonb null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint parks_schedule_pkey primary key (id),
  constraint parks_schedule_park_id_date_type_opening_time_closing_time_key unique (park_id, date, type, opening_time, closing_time),
  constraint parks_schedule_park_id_fkey foreign KEY (park_id) references parks (id) on delete CASCADE,
  constraint parks_schedule_type_check check (
    (
      type = any (
        array[
          'OPERATING'::text,
          'INFO'::text,
          'TICKETED_EVENT'::text,
          'EXTRA_HOURS'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_parks_schedule_park_date on public.parks_schedule using btree (park_id, date) TABLESPACE pg_default;

create index IF not exists idx_parks_schedule_date_type on public.parks_schedule using btree (date, type) TABLESPACE pg_default;

create trigger update_parks_schedule_updated_at BEFORE
update on parks_schedule for EACH row
execute FUNCTION update_updated_at_column ();