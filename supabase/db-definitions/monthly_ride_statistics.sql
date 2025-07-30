create table public.monthly_ride_statistics (
  id uuid not null default gen_random_uuid (),
  ride_id uuid not null,
  year integer not null,
  month integer not null,
  avg_wait_time_minutes numeric(5, 2) null,
  min_wait_time_minutes integer null,
  max_wait_time_minutes integer null,
  median_wait_time_minutes numeric(5, 2) null,
  avg_single_rider_wait_minutes numeric(5, 2) null,
  min_single_rider_wait_minutes integer null,
  max_single_rider_wait_minutes integer null,
  weekday_averages jsonb null,
  busiest_day_of_month date null,
  busiest_day_avg_wait numeric(5, 2) null,
  quietest_day_of_month date null,
  quietest_day_avg_wait numeric(5, 2) null,
  peak_hour integer null,
  peak_hour_avg_wait numeric(5, 2) null,
  quietest_hour integer null,
  quietest_hour_avg_wait numeric(5, 2) null,
  total_operating_days integer null,
  total_data_points integer null,
  avg_operational_percentage numeric(5, 2) null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint monthly_ride_statistics_pkey primary key (id),
  constraint monthly_ride_statistics_ride_id_year_month_key unique (ride_id, year, month),
  constraint monthly_ride_statistics_ride_id_fkey foreign KEY (ride_id) references rides (id) on delete CASCADE,
  constraint monthly_ride_statistics_month_check check (
    (
      (month >= 1)
      and (month <= 12)
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_monthly_ride_stats_ride_year_month on public.monthly_ride_statistics using btree (ride_id, year desc, month desc) TABLESPACE pg_default;

create index IF not exists idx_monthly_ride_stats_year_month on public.monthly_ride_statistics using btree (year desc, month desc) TABLESPACE pg_default;