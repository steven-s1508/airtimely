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
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
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
          username: string
          password: string
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
        Args: { p_ride_id: string; p_date: string }
        Returns: undefined
      }
      aggregate_daily_from_hourly: {
        Args: { p_ride_id: string; p_date: string; p_cleanup?: boolean }
        Returns: undefined
      }
      aggregate_daily_ride_stats: {
        Args: { p_ride_id: string; p_date: string }
        Returns: undefined
      }
      aggregate_hourly_ride_stats: {
        Args: { p_ride_id: string; p_date: string; p_hour: number }
        Returns: undefined
      }
      aggregate_monthly_ride_stats: {
        Args: { p_ride_id: string; p_year: number; p_month: number }
        Returns: undefined
      }
      cleanup_empty_daily_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          deleted_count: number
          affected_rides: string[]
        }[]
      }
      cleanup_old_raw_data: {
        Args: { p_target_date: string; p_keep_days?: number }
        Returns: number
      }
      execute_sql: {
        Args: { query: string; read_only?: boolean }
        Returns: Json
      }
      find_daily_stats_zero_avg_with_hourly_gt_zero: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["CompositeTypes"]["daily_ride_statistics_limited"][]
      }
      get_park_schedule_with_timezone: {
        Args: { p_park_id: string; p_date?: string }
        Returns: {
          id: string
          name: string
          entity_type: string
          timezone: string
          schedule_date: string
          schedule_type: string
          opening_time: string
          closing_time: string
          description: string
          purchases: Json
        }[]
      }
      is_park_open: {
        Args: { p_park_id: string; p_check_time?: string }
        Returns: boolean
      }
      retroactively_fix_daily_stats_from_hourly_data: {
        Args: { p_date?: string; p_ride_id?: string }
        Returns: {
          processed_count: number
          updated_count: number
          error_count: number
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
          updated_at?: string | null
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_insert_object: {
        Args: { bucketid: string; name: string; owner: string; metadata: Json }
        Returns: undefined
      }
      extension: {
        Args: { name: string }
        Returns: string
      }
      filename: {
        Args: { name: string }
        Returns: string
      }
      foldername: {
        Args: { name: string }
        Returns: string[]
      }
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>
        Returns: {
          size: number
          bucket_id: string
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          prefix_param: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
        }
        Returns: {
          key: string
          id: string
          created_at: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          bucket_id: string
          prefix_param: string
          delimiter_param: string
          max_keys?: number
          start_after?: string
          next_token?: string
        }
        Returns: {
          name: string
          id: string
          metadata: Json
          updated_at: string
        }[]
      }
      operation: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      search: {
        Args: {
          prefix: string
          bucketname: string
          limits?: number
          levels?: number
          offsets?: number
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          name: string
          id: string
          updated_at: string
          created_at: string
          last_accessed_at: string
          metadata: Json
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
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
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
    Enums: {},
  },
} as const
