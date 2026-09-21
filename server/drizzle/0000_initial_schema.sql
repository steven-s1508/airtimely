CREATE TYPE "public"."entity_type" AS ENUM('DESTINATION', 'PARK', 'ATTRACTION', 'SHOW', 'RESTAURANT', 'HOTEL');--> statement-breakpoint
CREATE TYPE "public"."schedule_type" AS ENUM('OPERATING', 'INFO', 'TICKETED_EVENT', 'EXTRA_HOURS');--> statement-breakpoint
CREATE TABLE "chains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"website" text,
	"logo_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "destinations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_override" text,
	"slug" text NOT NULL,
	"timezone" text,
	"external_id" text,
	"chain_id" uuid,
	"website" text,
	"country_code" text,
	"geocode_data" jsonb,
	"latitude" double precision,
	"longitude" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"destination_id" uuid,
	"name" text NOT NULL,
	"name_override" text,
	"slug" text,
	"entity_type" "entity_type" DEFAULT 'PARK' NOT NULL,
	"timezone" text,
	"country_code" text,
	"latitude" double precision,
	"longitude" double precision,
	"external_id" text,
	"rcdb_url" text,
	"is_destination" boolean,
	"geocode_data" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restaurants" (
	"id" uuid PRIMARY KEY NOT NULL,
	"park_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"entity_type" "entity_type" DEFAULT 'RESTAURANT' NOT NULL,
	"external_id" text,
	"latitude" double precision,
	"longitude" double precision,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"park_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"entity_type" "entity_type" DEFAULT 'ATTRACTION' NOT NULL,
	"external_id" text,
	"latitude" double precision,
	"longitude" double precision,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "show_times" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"show_id" uuid NOT NULL,
	"local_date" date NOT NULL,
	"type" text DEFAULT 'Performance Time' NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shows" (
	"id" uuid PRIMARY KEY NOT NULL,
	"park_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"entity_type" "entity_type" DEFAULT 'SHOW' NOT NULL,
	"external_id" text,
	"latitude" double precision,
	"longitude" double precision,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parks_schedule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"park_id" uuid NOT NULL,
	"local_date" date NOT NULL,
	"type" "schedule_type" NOT NULL,
	"opening_time" timestamp with time zone,
	"closing_time" timestamp with time zone,
	"description" text,
	"purchases" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
--> HAND-EDITED: Drizzle cannot express declarative partitioning. The generated
--> CREATE TABLE is replaced with a RANGE-partitioned parent. Regenerating this
--> migration will emit the unpartitioned form again -- reapply this edit.
CREATE TABLE "ride_changes" (
	"ride_id" uuid NOT NULL,
	"ts" timestamp with time zone NOT NULL,
	"status" smallint,
	"wait" smallint,
	"single" smallint,
	"source" smallint NOT NULL,
	CONSTRAINT "ride_changes_ride_id_ts_pk" PRIMARY KEY("ride_id","ts")
) PARTITION BY RANGE ("ts");
--> statement-breakpoint
CREATE TABLE "ride_live" (
	"ride_id" uuid PRIMARY KEY NOT NULL,
	"status" smallint,
	"wait_minutes" smallint,
	"single_rider_minutes" smallint,
	"api_updated_at" timestamp with time zone,
	"polled_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ride_stats_daily" (
	"ride_id" uuid NOT NULL,
	"local_date" date NOT NULL,
	"operating_min" integer,
	"down_min" integer,
	"scheduled_min" integer,
	"wait_minutes" integer,
	"wait_sum" integer,
	"wait_min" smallint,
	"wait_max" smallint,
	"wait_dist" jsonb,
	"p25" numeric(5, 2),
	"p50" numeric(5, 2),
	"p90" numeric(5, 2),
	"peak_hour" smallint,
	"quietest_hour" smallint,
	CONSTRAINT "ride_stats_daily_ride_id_local_date_pk" PRIMARY KEY("ride_id","local_date")
);
--> statement-breakpoint
CREATE TABLE "ride_stats_hourly" (
	"ride_id" uuid NOT NULL,
	"bucket_start" timestamp with time zone NOT NULL,
	"local_date" date NOT NULL,
	"local_hour" smallint NOT NULL,
	"operating_min" smallint,
	"down_min" smallint,
	"closed_min" smallint,
	"scheduled_min" smallint,
	"wait_minutes" smallint,
	"wait_sum" integer,
	"wait_min" smallint,
	"wait_max" smallint,
	"single_mean" numeric(5, 2),
	CONSTRAINT "ride_stats_hourly_ride_id_bucket_start_pk" PRIMARY KEY("ride_id","bucket_start")
);
--> statement-breakpoint
CREATE TABLE "job_runs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"job" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"ok" boolean,
	"summary" jsonb,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "park_day_ingest" (
	"park_id" uuid NOT NULL,
	"local_date" date NOT NULL,
	"source" smallint,
	"status" smallint DEFAULT 0 NOT NULL,
	"attempts" smallint DEFAULT 0 NOT NULL,
	"last_error" text,
	"finalised_at" timestamp with time zone,
	CONSTRAINT "park_day_ingest_park_id_local_date_pk" PRIMARY KEY("park_id","local_date")
);
--> statement-breakpoint
ALTER TABLE "destinations" ADD CONSTRAINT "destinations_chain_id_chains_id_fk" FOREIGN KEY ("chain_id") REFERENCES "public"."chains"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parks" ADD CONSTRAINT "parks_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_park_id_parks_id_fk" FOREIGN KEY ("park_id") REFERENCES "public"."parks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rides" ADD CONSTRAINT "rides_park_id_parks_id_fk" FOREIGN KEY ("park_id") REFERENCES "public"."parks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "show_times" ADD CONSTRAINT "show_times_show_id_shows_id_fk" FOREIGN KEY ("show_id") REFERENCES "public"."shows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shows" ADD CONSTRAINT "shows_park_id_parks_id_fk" FOREIGN KEY ("park_id") REFERENCES "public"."parks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parks_schedule" ADD CONSTRAINT "parks_schedule_park_id_parks_id_fk" FOREIGN KEY ("park_id") REFERENCES "public"."parks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ride_live" ADD CONSTRAINT "ride_live_ride_id_rides_id_fk" FOREIGN KEY ("ride_id") REFERENCES "public"."rides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ride_stats_daily" ADD CONSTRAINT "ride_stats_daily_ride_id_rides_id_fk" FOREIGN KEY ("ride_id") REFERENCES "public"."rides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ride_stats_hourly" ADD CONSTRAINT "ride_stats_hourly_ride_id_rides_id_fk" FOREIGN KEY ("ride_id") REFERENCES "public"."rides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "park_day_ingest" ADD CONSTRAINT "park_day_ingest_park_id_parks_id_fk" FOREIGN KEY ("park_id") REFERENCES "public"."parks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "chains_name_key" ON "chains" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "chains_slug_key" ON "chains" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "destinations_slug_key" ON "destinations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_destinations_chain_id" ON "destinations" USING btree ("chain_id");--> statement-breakpoint
CREATE INDEX "idx_destinations_external_id" ON "destinations" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "idx_parks_destination_id" ON "parks" USING btree ("destination_id");--> statement-breakpoint
CREATE INDEX "idx_parks_external_id" ON "parks" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "idx_parks_is_active" ON "parks" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_parks_slug" ON "parks" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_restaurants_park_id" ON "restaurants" USING btree ("park_id");--> statement-breakpoint
CREATE INDEX "idx_restaurants_external_id" ON "restaurants" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "idx_restaurants_is_active" ON "restaurants" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_rides_park_id" ON "rides" USING btree ("park_id");--> statement-breakpoint
CREATE INDEX "idx_rides_external_id" ON "rides" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "idx_rides_is_active" ON "rides" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "show_times_show_date_start_key" ON "show_times" USING btree ("show_id","local_date","start_time");--> statement-breakpoint
CREATE INDEX "idx_show_times_local_date" ON "show_times" USING btree ("local_date");--> statement-breakpoint
CREATE INDEX "idx_shows_park_id" ON "shows" USING btree ("park_id");--> statement-breakpoint
CREATE INDEX "idx_shows_external_id" ON "shows" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "idx_shows_is_active" ON "shows" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "parks_schedule_unique" ON "parks_schedule" USING btree ("park_id","local_date","type","opening_time","closing_time");--> statement-breakpoint
CREATE INDEX "idx_parks_schedule_park_date" ON "parks_schedule" USING btree ("park_id","local_date");--> statement-breakpoint
CREATE INDEX "idx_parks_schedule_date_type" ON "parks_schedule" USING btree ("local_date","type");--> statement-breakpoint
CREATE INDEX "idx_ride_changes_ts" ON "ride_changes" USING btree ("ts");--> statement-breakpoint
CREATE INDEX "idx_ride_stats_daily_date" ON "ride_stats_daily" USING btree ("local_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_ride_stats_hourly_ride_date" ON "ride_stats_hourly" USING btree ("ride_id","local_date");--> statement-breakpoint
CREATE INDEX "idx_ride_stats_hourly_date" ON "ride_stats_hourly" USING btree ("local_date");--> statement-breakpoint
CREATE INDEX "idx_job_runs_job_started" ON "job_runs" USING btree ("job","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_park_day_ingest_status" ON "park_day_ingest" USING btree ("status","local_date");