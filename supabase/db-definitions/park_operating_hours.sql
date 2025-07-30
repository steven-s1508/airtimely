create table public.park_operating_hours (
  id uuid not null default gen_random_uuid (),
  park_id uuid not null,
  date date not null,
  opening_time timestamp with time zone null,
  closing_time timestamp with time zone null,
  type text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint park_operating_hours_pkey primary key (id),
  constraint park_operating_hours_park_id_date_type_opening_time_closing_key unique (park_id, date, type, opening_time, closing_time),
  constraint park_operating_hours_park_id_fkey foreign KEY (park_id) references parks (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_park_operating_hours_park_id_date on public.park_operating_hours using btree (park_id, date) TABLESPACE pg_default;

create trigger set_timestamp_park_operating_hours BEFORE
update on park_operating_hours for EACH row
execute FUNCTION trigger_set_timestamp ();