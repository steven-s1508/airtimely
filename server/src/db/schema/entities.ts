import {
	boolean,
	date,
	doublePrecision,
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { entityTypeEnum } from "./enums.js";

const createdAt = timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

/**
 * Entity metadata carried over from v1 with IDs preserved: the app persists pinned
 * park and destination IDs in AsyncStorage and in the React Query cache, so a fresh
 * set of UUIDs would silently empty every user's pins.
 */

export const chains = pgTable(
	"chains",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		name: text("name").notNull(),
		slug: text("slug").notNull(),
		website: text("website"),
		logoUrl: text("logo_url"),
		createdAt,
		updatedAt,
	},
	(t) => [uniqueIndex("chains_name_key").on(t.name), uniqueIndex("chains_slug_key").on(t.slug)],
);

export const destinations = pgTable(
	"destinations",
	{
		// No default: the ID comes from the ThemeParks API.
		id: uuid("id").primaryKey(),
		name: text("name").notNull(),
		nameOverride: text("name_override"),
		slug: text("slug").notNull(),
		timezone: text("timezone"),
		externalId: text("external_id"),
		chainId: uuid("chain_id").references(() => chains.id, { onDelete: "set null" }),
		website: text("website"),
		countryCode: text("country_code"),
		geocodeData: jsonb("geocode_data"),
		latitude: doublePrecision("latitude"),
		longitude: doublePrecision("longitude"),
		createdAt,
		updatedAt,
	},
	(t) => [
		uniqueIndex("destinations_slug_key").on(t.slug),
		index("idx_destinations_chain_id").on(t.chainId),
		index("idx_destinations_external_id").on(t.externalId),
	],
);

export const parks = pgTable(
	"parks",
	{
		id: uuid("id").primaryKey(),
		destinationId: uuid("destination_id").references(() => destinations.id, {
			onDelete: "set null",
		}),
		name: text("name").notNull(),
		nameOverride: text("name_override"),
		slug: text("slug"),
		entityType: entityTypeEnum("entity_type").notNull().default("PARK"),
		timezone: text("timezone"),
		countryCode: text("country_code"),
		latitude: doublePrecision("latitude"),
		longitude: doublePrecision("longitude"),
		externalId: text("external_id"),
		rcdbUrl: text("rcdb_url"),
		isDestination: boolean("is_destination"),
		geocodeData: jsonb("geocode_data"),
		isActive: boolean("is_active").notNull().default(true),
		createdAt,
		updatedAt,
	},
	(t) => [
		index("idx_parks_destination_id").on(t.destinationId),
		index("idx_parks_external_id").on(t.externalId),
		index("idx_parks_is_active").on(t.isActive),
		index("idx_parks_slug").on(t.slug),
	],
);

export const rides = pgTable(
	"rides",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		parkId: uuid("park_id")
			.notNull()
			.references(() => parks.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		slug: text("slug"),
		entityType: entityTypeEnum("entity_type").notNull().default("ATTRACTION"),
		externalId: text("external_id"),
		latitude: doublePrecision("latitude"),
		longitude: doublePrecision("longitude"),
		isActive: boolean("is_active").notNull().default(true),
		createdAt,
		updatedAt,
	},
	(t) => [
		index("idx_rides_park_id").on(t.parkId),
		index("idx_rides_external_id").on(t.externalId),
		index("idx_rides_is_active").on(t.isActive),
	],
);

export const shows = pgTable(
	"shows",
	{
		id: uuid("id").primaryKey(),
		parkId: uuid("park_id")
			.notNull()
			.references(() => parks.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		slug: text("slug"),
		entityType: entityTypeEnum("entity_type").notNull().default("SHOW"),
		externalId: text("external_id"),
		latitude: doublePrecision("latitude"),
		longitude: doublePrecision("longitude"),
		isActive: boolean("is_active").notNull().default(true),
		createdAt,
		updatedAt,
	},
	(t) => [
		index("idx_shows_park_id").on(t.parkId),
		index("idx_shows_external_id").on(t.externalId),
		index("idx_shows_is_active").on(t.isActive),
	],
);

export const restaurants = pgTable(
	"restaurants",
	{
		id: uuid("id").primaryKey(),
		// v1 was missing this FK while `shows` had it; corrected during translation.
		parkId: uuid("park_id")
			.notNull()
			.references(() => parks.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		slug: text("slug"),
		entityType: entityTypeEnum("entity_type").notNull().default("RESTAURANT"),
		externalId: text("external_id"),
		latitude: doublePrecision("latitude"),
		longitude: doublePrecision("longitude"),
		isActive: boolean("is_active").notNull().default(true),
		createdAt,
		updatedAt,
	},
	(t) => [
		index("idx_restaurants_park_id").on(t.parkId),
		index("idx_restaurants_external_id").on(t.externalId),
		index("idx_restaurants_is_active").on(t.isActive),
	],
);

export const showTimes = pgTable(
	"show_times",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		showId: uuid("show_id")
			.notNull()
			.references(() => shows.id, { onDelete: "cascade" }),
		// Park-local calendar date the performance belongs to.
		localDate: date("local_date", { mode: "string" }).notNull(),
		type: text("type").notNull().default("Performance Time"),
		// timestamptz, not text as in v1 — same correction as parks_schedule.
		startTime: timestamp("start_time", { withTimezone: true }).notNull(),
		endTime: timestamp("end_time", { withTimezone: true }),
		createdAt,
		updatedAt,
	},
	(t) => [
		uniqueIndex("show_times_show_date_start_key").on(t.showId, t.localDate, t.startTime),
		index("idx_show_times_local_date").on(t.localDate),
	],
);
