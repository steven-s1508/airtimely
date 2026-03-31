export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  pgbouncer: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_auth: {
        Args: { p_usename: string }
        Returns: {
          password: string
          username: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      chains: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      daily_ride_statistics: {
        Row: {
          avg_single_rider_wait_minutes: number | null
          avg_wait_time_minutes: number | null
          created_at: string | null
          date: string
          downtime_minutes: number | null
          hourly_data: Json | null
          id: string
          lowest_wait_time_hour: number | null
          max_single_rider_wait_minutes: number | null
          max_wait_time_minutes: number | null
          median_wait_time_minutes: number | null
          min_single_rider_wait_minutes: number | null
          min_wait_time_minutes: number | null
          operational_percentage: number | null
          peak_wait_time_hour: number | null
          peak_wait_time_value: number | null
          ride_id: string
          total_data_points: number | null
          updated_at: string | null
        }
        Insert: {
          avg_single_rider_wait_minutes?: number | null
          avg_wait_time_minutes?: number | null
          created_at?: string | null
          date: string
          downtime_minutes?: number | null
          hourly_data?: Json | null
          id?: string
          lowest_wait_time_hour?: number | null
          max_single_rider_wait_minutes?: number | null
          max_wait_time_minutes?: number | null
          median_wait_time_minutes?: number | null
          min_single_rider_wait_minutes?: number | null
          min_wait_time_minutes?: number | null
          operational_percentage?: number | null
          peak_wait_time_hour?: number | null
          peak_wait_time_value?: number | null
          ride_id: string
          total_data_points?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_single_rider_wait_minutes?: number | null
          avg_wait_time_minutes?: number | null
          created_at?: string | null
          date?: string
          downtime_minutes?: number | null
          hourly_data?: Json | null
          id?: string
          lowest_wait_time_hour?: number | null
          max_single_rider_wait_minutes?: number | null
          max_wait_time_minutes?: number | null
          median_wait_time_minutes?: number | null
          min_single_rider_wait_minutes?: number | null
          min_wait_time_minutes?: number | null
          operational_percentage?: number | null
          peak_wait_time_hour?: number | null
          peak_wait_time_value?: number | null
          ride_id?: string
          total_data_points?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_ride_statistics_ride_id_fkey"
            columns: ["ride_id"]
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_weather: {
        Row: {
          condition: string | null
          date: string
          id: string
          park_id: string | null
          precipitation_mm: number | null
          temperature_high_celsius: number | null
          temperature_low_celsius: number | null
          wind_speed_kmh: number | null
        }
        Insert: {
          condition?: string | null
          date: string
          id?: string
          park_id?: string | null
          precipitation_mm?: number | null
          temperature_high_celsius?: number | null
          temperature_low_celsius?: number | null
          wind_speed_kmh?: number | null
        }
        Update: {
          condition?: string | null
          date?: string
          id?: string
          park_id?: string | null
          precipitation_mm?: number | null
          temperature_high_celsius?: number | null
          temperature_low_celsius?: number | null
          wind_speed_kmh?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_weather_park_id_fkey"
            columns: ["park_id"]
            referencedRelation: "parks"
            referencedColumns: ["id"]
          },
        ]
      }
      destinations: {
        Row: {
          chain_id: string | null
          country_code: string | null
          created_at: string
          external_id: string | null
          geocode_data: Json | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          name_override: string | null
          slug: string
          timezone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          chain_id?: string | null
          country_code?: string | null
          created_at?: string
          external_id?: string | null
          geocode_data?: Json | null
          id: string
          latitude?: number | null
          longitude?: number | null
          name: string
          name_override?: string | null
          slug: string
          timezone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          chain_id?: string | null
          country_code?: string | null
          created_at?: string
          external_id?: string | null
          geocode_data?: Json | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          name_override?: string | null
          slug?: string
          timezone?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "destinations_chain_id_fkey"
            columns: ["chain_id"]
            referencedRelation: "chains"
            referencedColumns: ["id"]
          },
        ]
      }
      holidays: {
        Row: {
          country_code: string | null
          date: string
          id: string
          is_major: boolean | null
          name: string
          type: string | null
        }
        Insert: {
          country_code?: string | null
          date: string
          id?: string
          is_major?: boolean | null
          name: string
          type?: string | null
        }
        Update: {
          country_code?: string | null
          date?: string
          id?: string
          is_major?: boolean | null
          name?: string
          type?: string | null
        }
        Relationships: []
      }
      hourly_ride_statistics: {
        Row: {
          avg_single_rider_wait_minutes: number | null
          avg_wait_time_minutes: number | null
          created_at: string | null
          data_points_count: number | null
          date: string
          hour: number
          id: string
          max_wait_time_minutes: number | null
          min_wait_time_minutes: number | null
          operational_minutes: number | null
          ride_id: string
          updated_at: string | null
        }
        Insert: {
          avg_single_rider_wait_minutes?: number | null
          avg_wait_time_minutes?: number | null
          created_at?: string | null
          data_points_count?: number | null
          date: string
          hour: number
          id?: string
          max_wait_time_minutes?: number | null
          min_wait_time_minutes?: number | null
          operational_minutes?: number | null
          ride_id: string
          updated_at?: string | null
        }
        Update: {
          avg_single_rider_wait_minutes?: number | null
          avg_wait_time_minutes?: number | null
          created_at?: string | null
          data_points_count?: number | null
          date?: string
          hour?: number
          id?: string
          max_wait_time_minutes?: number | null
          min_wait_time_minutes?: number | null
          operational_minutes?: number | null
          ride_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hourly_ride_statistics_ride_id_fkey"
            columns: ["ride_id"]
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_ride_statistics: {
        Row: {
          avg_operational_percentage: number | null
          avg_single_rider_wait_minutes: number | null
          avg_wait_time_minutes: number | null
          busiest_day_avg_wait: number | null
          busiest_day_of_month: string | null
          created_at: string | null
          id: string
          max_single_rider_wait_minutes: number | null
          max_wait_time_minutes: number | null
          median_wait_time_minutes: number | null
          min_single_rider_wait_minutes: number | null
          min_wait_time_minutes: number | null
          month: number
          peak_hour: number | null
          peak_hour_avg_wait: number | null
          quietest_day_avg_wait: number | null
          quietest_day_of_month: string | null
          quietest_hour: number | null
          quietest_hour_avg_wait: number | null
          ride_id: string
          total_data_points: number | null
          total_operating_days: number | null
          updated_at: string | null
          weekday_averages: Json | null
          year: number
        }
        Insert: {
          avg_operational_percentage?: number | null
          avg_single_rider_wait_minutes?: number | null
          avg_wait_time_minutes?: number | null
          busiest_day_avg_wait?: number | null
          busiest_day_of_month?: string | null
          created_at?: string | null
          id?: string
          max_single_rider_wait_minutes?: number | null
          max_wait_time_minutes?: number | null
          median_wait_time_minutes?: number | null
          min_single_rider_wait_minutes?: number | null
          min_wait_time_minutes?: number | null
          month: number
          peak_hour?: number | null
          peak_hour_avg_wait?: number | null
          quietest_day_avg_wait?: number | null
          quietest_day_of_month?: string | null
          quietest_hour?: number | null
          quietest_hour_avg_wait?: number | null
          ride_id: string
          total_data_points?: number | null
          total_operating_days?: number | null
          updated_at?: string | null
          weekday_averages?: Json | null
          year: number
        }
        Update: {
          avg_operational_percentage?: number | null
          avg_single_rider_wait_minutes?: number | null
          avg_wait_time_minutes?: number | null
          busiest_day_avg_wait?: number | null
          busiest_day_of_month?: string | null
          created_at?: string | null
          id?: string
          max_single_rider_wait_minutes?: number | null
          max_wait_time_minutes?: number | null
          median_wait_time_minutes?: number | null
          min_single_rider_wait_minutes?: number | null
          min_wait_time_minutes?: number | null
          month?: number
          peak_hour?: number | null
          peak_hour_avg_wait?: number | null
          quietest_day_avg_wait?: number | null
          quietest_day_of_month?: string | null
          quietest_hour?: number | null
          quietest_hour_avg_wait?: number | null
          ride_id?: string
          total_data_points?: number | null
          total_operating_days?: number | null
          updated_at?: string | null
          weekday_averages?: Json | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_ride_statistics_ride_id_fkey"
            columns: ["ride_id"]
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      parks: {
        Row: {
          country_code: string | null
          created_at: string
          destination_id: string | null
          entity_type: string
          external_id: string | null
          geocode_data: Json | null
          id: string
          is_active: boolean
          is_destination: boolean | null
          latitude: number | null
          longitude: number | null
          name: string
          name_override: string | null
          rcdb_url: string | null
          slug: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          destination_id?: string | null
          entity_type?: string
          external_id?: string | null
          geocode_data?: Json | null
          id: string
          is_active?: boolean
          is_destination?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name: string
          name_override?: string | null
          rcdb_url?: string | null
          slug?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          country_code?: string | null
          created_at?: string
          destination_id?: string | null
          entity_type?: string
          external_id?: string | null
          geocode_data?: Json | null
          id?: string
          is_active?: boolean
          is_destination?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          name_override?: string | null
          rcdb_url?: string | null
          slug?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parks_destination_id_fkey"
            columns: ["destination_id"]
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      parks_schedule: {
        Row: {
          closing_time: string | null
          created_at: string | null
          date: string
          description: string | null
          id: string
          opening_time: string | null
          park_id: string | null
          purchases: Json | null
          type: string
          updated_at: string | null
        }
        Insert: {
          closing_time?: string | null
          created_at?: string | null
          date: string
          description?: string | null
          id?: string
          opening_time?: string | null
          park_id?: string | null
          purchases?: Json | null
          type: string
          updated_at?: string | null
        }
        Update: {
          closing_time?: string | null
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          opening_time?: string | null
          park_id?: string | null
          purchases?: Json | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parks_schedule_park_id_fkey"
            columns: ["park_id"]
            referencedRelation: "parks"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          created_at: string
          entity_type: string
          external_id: string | null
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          name: string
          park_id: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_type: string
          external_id?: string | null
          id: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          park_id: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_type?: string
          external_id?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          park_id?: string
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ride_wait_times: {
        Row: {
          api_last_updated: string | null
          created_at: string
          id: string
          raw_live_data: Json | null
          recorded_at_local: string | null
          recorded_at_timestamp: string
          ride_id: string
          showtimes_json: Json | null
          single_rider_wait_time_minutes: number | null
          status: string | null
          wait_time_minutes: number | null
        }
        Insert: {
          api_last_updated?: string | null
          created_at?: string
          id?: string
          raw_live_data?: Json | null
          recorded_at_local?: string | null
          recorded_at_timestamp: string
          ride_id: string
          showtimes_json?: Json | null
          single_rider_wait_time_minutes?: number | null
          status?: string | null
          wait_time_minutes?: number | null
        }
        Update: {
          api_last_updated?: string | null
          created_at?: string
          id?: string
          raw_live_data?: Json | null
          recorded_at_local?: string | null
          recorded_at_timestamp?: string
          ride_id?: string
          showtimes_json?: Json | null
          single_rider_wait_time_minutes?: number | null
          status?: string | null
          wait_time_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ride_wait_times_ride_id_fkey"
            columns: ["ride_id"]
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      rides: {
        Row: {
          created_at: string
          entity_type: string
          external_id: string | null
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          name: string
          park_id: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_type: string
          external_id?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          park_id: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_type?: string
          external_id?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          park_id?: string
          slug?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rides_park_id_fkey"
            columns: ["park_id"]
            referencedRelation: "parks"
            referencedColumns: ["id"]
          },
        ]
      }
      show_times: {
        Row: {
          created_at: string | null
          date: string
          end_time: string | null
          id: string
          show_id: string | null
          start_time: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          end_time?: string | null
          id?: string
          show_id?: string | null
          start_time: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          end_time?: string | null
          id?: string
          show_id?: string | null
          start_time?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "show_times_show_id_fkey"
            columns: ["show_id"]
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      shows: {
        Row: {
          created_at: string
          entity_type: string
          external_id: string | null
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          name: string
          park_id: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_type: string
          external_id?: string | null
          id: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          park_id: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_type?: string
          external_id?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          park_id?: string
          slug?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shows_park_id_fkey"
            columns: ["park_id"]
            referencedRelation: "parks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      displayable_destinations: {
        Row: {
          chain_id: string | null
          country_code: string | null
          entity_id: string | null
          entity_type: string | null
          latitude: number | null
          longitude: number | null
          name: string | null
          original_destination_id: string | null
          park_id: string | null
          slug: string | null
          timezone: string | null
          website: string | null
        }
        Relationships: []
      }
      park_operating_hours: {
        Row: {
          closing_time: string | null
          created_at: string | null
          date: string | null
          opening_time: string | null
          park_id: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          closing_time?: never
          created_at?: string | null
          date?: string | null
          opening_time?: never
          park_id?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          closing_time?: never
          created_at?: string | null
          date?: string | null
          opening_time?: never
          park_id?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parks_schedule_park_id_fkey"
            columns: ["park_id"]
            referencedRelation: "parks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      aggregate_all_hourly_stats_for_date: {
        Args: { p_date: string; p_ride_id: string }
        Returns: undefined
      }
      aggregate_daily_from_hourly: {
        Args: { p_cleanup?: boolean; p_date: string; p_ride_id: string }
        Returns: undefined
      }
      aggregate_daily_ride_stats: {
        Args: { p_date: string; p_ride_id: string }
        Returns: undefined
      }
      aggregate_hourly_ride_stats: {
        Args: { p_date: string; p_hour: number; p_ride_id: string }
        Returns: undefined
      }
      aggregate_monthly_ride_stats: {
        Args: { p_month: number; p_ride_id: string; p_year: number }
        Returns: undefined
      }
      cleanup_empty_daily_stats: {
        Args: never
        Returns: {
          affected_rides: string[]
          deleted_count: number
        }[]
      }
      cleanup_old_raw_data: {
        Args: { p_keep_days?: number; p_target_date: string }
        Returns: number
      }
      execute_sql: {
        Args: { query: string; read_only?: boolean }
        Returns: Json
      }
      find_daily_stats_zero_avg_with_hourly_gt_zero: {
        Args: never
        Returns: Database["public"]["CompositeTypes"]["daily_ride_statistics_limited"][]
        SetofOptions: {
          from: "*"
          to: "daily_ride_statistics_limited"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_park_schedule_with_timezone: {
        Args: { p_date?: string; p_park_id: string }
        Returns: {
          closing_time: string
          description: string
          entity_type: string
          id: string
          name: string
          opening_time: string
          purchases: Json
          schedule_date: string
          schedule_type: string
          timezone: string
        }[]
      }
      is_park_open: {
        Args: { p_check_time?: string; p_park_id: string }
        Returns: boolean
      }
      retroactively_fix_daily_stats_from_hourly_data: {
        Args: { p_date?: string; p_ride_id?: string }
        Returns: {
          error_count: number
          processed_count: number
          updated_count: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      daily_ride_statistics_limited: {
        id: string | null
        date: string | null
        avg_wait_time_minutes: number | null
      }
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      iceberg_namespaces: {
        Row: {
          bucket_name: string
          catalog_id: string
          created_at: string
          id: string
          metadata: Json
          name: string
          updated_at: string
        }
        Insert: {
          bucket_name: string
          catalog_id: string
          created_at?: string
          id?: string
          metadata?: Json
          name: string
          updated_at?: string
        }
        Update: {
          bucket_name?: string
          catalog_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_namespaces_catalog_id_fkey"
            columns: ["catalog_id"]
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
        ]
      }
      iceberg_tables: {
        Row: {
          bucket_name: string
          catalog_id: string
          created_at: string
          id: string
          location: string
          name: string
          namespace_id: string
          remote_table_id: string | null
          shard_id: string | null
          shard_key: string | null
          updated_at: string
        }
        Insert: {
          bucket_name: string
          catalog_id: string
          created_at?: string
          id?: string
          location: string
          name: string
          namespace_id: string
          remote_table_id?: string | null
          shard_id?: string | null
          shard_key?: string | null
          updated_at?: string
        }
        Update: {
          bucket_name?: string
          catalog_id?: string
          created_at?: string
          id?: string
          location?: string
          name?: string
          namespace_id?: string
          remote_table_id?: string | null
          shard_id?: string | null
          shard_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_tables_catalog_id_fkey"
            columns: ["catalog_id"]
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iceberg_tables_namespace_id_fkey"
            columns: ["namespace_id"]
            referencedRelation: "iceberg_namespaces"
            referencedColumns: ["id"]
          },
        ]
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      delete_leaf_prefixes: {
        Args: { bucket_ids: string[]; names: string[] }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_level: { Args: { name: string }; Returns: number }
      get_prefix: { Args: { name: string }; Returns: string }
      get_prefixes: { Args: { name: string }; Returns: string[] }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_legacy_v1: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  pgbouncer: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const