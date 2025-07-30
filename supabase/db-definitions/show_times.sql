create table public.show_times (
  id uuid not null default gen_random_uuid (),
  show_id uuid null,
  date date not null,
  type text not null default 'Performance Time'::text,
  start_time text not null,
  end_time text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint show_times_pkey primary key (id),
  constraint show_times_show_id_date_start_time_key unique (show_id, date, start_time),
  constraint show_times_show_id_fkey foreign KEY (show_id) references shows (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_show_times_show_date on public.show_times using btree (show_id, date) TABLESPACE pg_default;

create index IF not exists idx_show_times_date on public.show_times using btree (date) TABLESPACE pg_default;

create index IF not exists idx_show_times_start_time on public.show_times using btree (start_time) TABLESPACE pg_default;

create trigger update_show_times_updated_at BEFORE
update on show_times for EACH row
execute FUNCTION update_updated_at_column ();