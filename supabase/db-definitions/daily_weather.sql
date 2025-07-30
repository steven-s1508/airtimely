create table public.daily_weather (
  id uuid not null default gen_random_uuid (),
  date date not null,
  park_id uuid null,
  condition text null,
  temperature_high_celsius numeric(3, 1) null,
  temperature_low_celsius numeric(3, 1) null,
  precipitation_mm numeric(5, 1) null,
  wind_speed_kmh numeric(4, 1) null,
  constraint daily_weather_pkey primary key (id),
  constraint daily_weather_date_park_id_key unique (date, park_id),
  constraint daily_weather_park_id_fkey foreign KEY (park_id) references parks (id)
) TABLESPACE pg_default;