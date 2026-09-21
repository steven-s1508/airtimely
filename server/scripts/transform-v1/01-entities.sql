-- v1 -> v2, part 1: entities and schedules.
--
-- Reads the v1 tables through the `v1` schema (postgres_fdw, set up by the runner) and
-- writes the v2 tables in `public`. IDs are preserved throughout: the app persists
-- pinned park and ride IDs on the device.
--
-- Changes against v1:
--   * entity_type and parks_schedule.type become enums (every v1 value fits; checked).
--   * parks_schedule.date / show_times.date become local_date.
--   * parks_schedule opening/closing and show_times start/end become timestamptz.
--     v1 stored the API's ISO strings with offsets as text and cast at every read.

insert into chains (id, name, slug, website, logo_url, created_at, updated_at)
select id, name, slug, website, logo_url, created_at, updated_at
from v1.chains;

insert into destinations (
	id, name, name_override, slug, timezone, external_id, chain_id, website,
	country_code, geocode_data, latitude, longitude, created_at, updated_at
)
select
	id, name, name_override, slug, timezone, external_id, chain_id, website,
	country_code, geocode_data, latitude, longitude, created_at, updated_at
from v1.destinations;

insert into parks (
	id, destination_id, name, name_override, slug, entity_type, timezone, country_code,
	latitude, longitude, external_id, rcdb_url, is_destination, geocode_data, is_active,
	created_at, updated_at
)
select
	id, destination_id, name, name_override, slug, entity_type::entity_type, timezone, country_code,
	latitude, longitude, external_id, rcdb_url, is_destination, geocode_data,
	coalesce(is_active, true), created_at, updated_at
from v1.parks;

insert into rides (
	id, park_id, name, slug, entity_type, external_id, latitude, longitude, is_active,
	created_at, updated_at
)
select
	id, park_id, name, slug, entity_type::entity_type, external_id, latitude, longitude,
	coalesce(is_active, true), created_at, updated_at
from v1.rides;

insert into shows (
	id, park_id, name, slug, entity_type, external_id, latitude, longitude, is_active,
	created_at, updated_at
)
select
	id, park_id, name, slug, entity_type::entity_type, external_id, latitude, longitude,
	coalesce(is_active, true), created_at, updated_at
from v1.shows;

-- v1 had no FK from restaurants to parks; v2 adds it. No orphans exist (checked).
insert into restaurants (
	id, park_id, name, slug, entity_type, external_id, latitude, longitude, is_active,
	created_at, updated_at
)
select
	id, park_id, name, slug, entity_type::entity_type, external_id, latitude, longitude,
	coalesce(is_active, true), created_at, updated_at
from v1.restaurants;

insert into show_times (id, show_id, local_date, type, start_time, end_time, created_at, updated_at)
select id, show_id, date, type, start_time::timestamptz, end_time::timestamptz, created_at, updated_at
from v1.show_times;

insert into parks_schedule (
	id, park_id, local_date, type, opening_time, closing_time, description, purchases,
	created_at, updated_at
)
select
	id, park_id, date, type::schedule_type, opening_time::timestamptz, closing_time::timestamptz,
	description, purchases, created_at, updated_at
from v1.parks_schedule;
