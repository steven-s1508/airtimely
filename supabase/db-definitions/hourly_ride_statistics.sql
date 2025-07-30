create table public.hourly_ride_statistics (
  id uuid not null default gen_random_uuid (),
  ride_id uuid not null,
  date date not null,
  hour smallint not null,
  avg_wait_time_minutes numeric(5, 2) null,
  min_wait_time_minutes integer null,
  max_wait_time_minutes integer null,
  avg_single_rider_wait_minutes numeric(5, 2) null,
  data_points_count smallint null default 0,
  operational_minutes smallint null default 0,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint hourly_ride_statistics_pkey primary key (id),
  constraint hourly_ride_statistics_ride_id_date_hour_key unique (ride_id, date, hour),
  constraint hourly_ride_statistics_ride_id_fkey foreign KEY (ride_id) references rides (id) on delete CASCADE,
  constraint hourly_ride_statistics_hour_check check (
    (
      (hour >= 0)
      and (hour <= 23)
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_hourly_ride_stats_ride_date_hour on public.hourly_ride_statistics using btree (ride_id, date desc, hour) TABLESPACE pg_default;