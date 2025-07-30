create table public.ride_wait_times (
  id uuid not null default gen_random_uuid (),
  ride_id uuid not null,
  recorded_at_timestamp timestamp with time zone not null,
  api_last_updated timestamp with time zone null,
  status text null,
  wait_time_minutes integer null,
  single_rider_wait_time_minutes integer null,
  showtimes_json jsonb null,
  raw_live_data jsonb null,
  created_at timestamp with time zone not null default now(),
  recorded_at_local timestamp with time zone null,
  constraint ride_wait_times_pkey primary key (id),
  constraint ride_wait_times_ride_id_fkey foreign KEY (ride_id) references rides (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_ride_wait_times_api_last_updated on public.ride_wait_times using btree (api_last_updated) TABLESPACE pg_default;

create index IF not exists idx_ride_wait_times_local_date on public.ride_wait_times using btree (ride_id, recorded_at_local) TABLESPACE pg_default;

create index IF not exists idx_ride_wait_times_recorded_at_timestamp on public.ride_wait_times using btree (recorded_at_timestamp) TABLESPACE pg_default;

create index IF not exists idx_ride_wait_times_ride_id_timestamp_desc on public.ride_wait_times using btree (ride_id, recorded_at_timestamp desc) TABLESPACE pg_default;

create index IF not exists idx_ride_wait_times_status on public.ride_wait_times using btree (status) TABLESPACE pg_default;