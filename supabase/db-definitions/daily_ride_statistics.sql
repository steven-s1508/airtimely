create table public.daily_ride_statistics (
  id uuid not null default gen_random_uuid (),
  ride_id uuid not null,
  date date not null,
  avg_wait_time_minutes numeric(5, 2) null,
  min_wait_time_minutes integer null,
  max_wait_time_minutes integer null,
  median_wait_time_minutes numeric(5, 2) null,
  avg_single_rider_wait_minutes numeric(5, 2) null,
  min_single_rider_wait_minutes integer null,
  max_single_rider_wait_minutes integer null,
  total_data_points integer null default 0,
  operational_percentage numeric(5, 2) null,
  downtime_minutes integer null default 0,
  peak_wait_time_hour integer null,
  peak_wait_time_value integer null,
  lowest_wait_time_hour integer null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  hourly_data jsonb null,
  constraint daily_ride_statistics_pkey primary key (id),
  constraint daily_ride_statistics_ride_id_date_key unique (ride_id, date),
  constraint daily_ride_statistics_ride_id_fkey foreign KEY (ride_id) references rides (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_daily_ride_stats_date on public.daily_ride_statistics using btree (date desc) TABLESPACE pg_default;

create index IF not exists idx_daily_ride_stats_ride_date on public.daily_ride_statistics using btree (ride_id, date desc) TABLESPACE pg_default;

create index IF not exists idx_daily_ride_statistics_hourly_data_gin on public.daily_ride_statistics using gin (hourly_data) TABLESPACE pg_default;